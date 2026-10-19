package com.tuna.feature.conf.service.service;

import com.github.tunaozkasap.execlog.ScopedEvidence.ExecutionFact;
import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.EvaluationDto.Request;
import com.tuna.feature.conf.model.dto.EvaluationDto.Response;
import com.tuna.feature.conf.persistence.entity.EnvironmentEntity;
import com.tuna.feature.conf.persistence.entity.FeatureEntity;
import com.tuna.feature.conf.persistence.entity.FeatureQualifierEntity;
import com.tuna.feature.conf.persistence.entity.FeatureRuleEntity;
import com.tuna.feature.conf.persistence.repository.EnvironmentRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRuleRepository;
import com.tuna.feature.conf.service.exception.InvalidRequestException;
import com.tuna.feature.conf.service.exception.ResourceNotFoundException;
import com.tuna.feature.conf.service.util.EvidenceMasking;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EvaluationService {

        /**
         * Qualifier priority (descending), then rule priority (descending); a missing priority counts as 0.
         */
        private static final Comparator<FeatureRuleEntity> EVALUATION_ORDER = (a, b) -> {
                int pA = a.getQualifier() != null && a.getQualifier().getPriority() != null
                                ? a.getQualifier().getPriority()
                                : 0;
                int pB = b.getQualifier() != null && b.getQualifier().getPriority() != null
                                ? b.getQualifier().getPriority()
                                : 0;
                if (pA != pB) {
                        return Integer.compare(pB, pA);
                }
                int rA = a.getPriority() != null ? a.getPriority() : 0;
                int rB = b.getPriority() != null ? b.getPriority() : 0;
                return Integer.compare(rB, rA);
        };

        private static final String COMPARISON = "trimmedEqualsIgnoreCase";

        private final FeatureRepository featureRepository;
        private final FeatureRuleRepository ruleRepository;
        private final EnvironmentRepository environmentRepository;

        public CrudResponse<Response> evaluateFeature(CrudRequest<Request> crudRequest) {
                try (var evaluation = s().parent("evaluation")) {
                        Request request = crudRequest.getData();
                        recordInput(request);
                        validate(request);

                        List<String> logs = new ArrayList<>();
                        logs.add(String.format("Evaluating feature code '%s' for project ID %s in environment '%s'",
                                        request.getFeatureCode(), request.getProjectId(), request.getEnvironmentCode()));

                        FeatureEntity feature = findFeature(request.getProjectId(), request.getFeatureCode());
                        Long featureProjectId = feature.getProject() != null ? feature.getProject().getId() : null;
                        EnvironmentEntity environment = findEnvironment(featureProjectId,
                                        request.getEnvironmentCode().trim().toUpperCase());

                        List<FeatureRuleEntity> activeRules = ruleRepository
                                        .findByFeatureIdAndEnvironmentIdAndEnabledTrue(feature.getId(), environment.getId());
                        List<FeatureRuleEntity> effectiveRules = selectEffectiveRules(activeRules, Instant.now());
                        logs.add(String.format(
                                        "Found %d active and effective rule(s) for feature '%s' in environment '%s' (out of %d enabled rules)",
                                        effectiveRules.size(), feature.getCode(), environment.getCode(), activeRules.size()));

                        List<FeatureRuleEntity> sortedRules = new ArrayList<>(effectiveRules);
                        sortedRules.sort(EVALUATION_ORDER);
                        s().kv("evaluationOrder", ruleIds(sortedRules));

                        Map<String, String> context = request.getRequestContext() != null ? request.getRequestContext()
                                        : Map.of();
                        FeatureRuleEntity matchedRule = findMatchingRule(sortedRules, context, logs);
                        if (matchedRule != null) {
                                return ruleMatchResponse(feature, environment, matchedRule, logs);
                        }
                        return fallbackResponse(feature, environment, sortedRules.isEmpty(), logs);
                }
        }

        private static void recordInput(Request request) {
                if (request == null) {
                        s().kv("dataPresent", false);
                        return;
                }
                Map<String, Object> maskedContext = new LinkedHashMap<>();
                if (request.getRequestContext() != null) {
                        for (Map.Entry<String, String> entry : request.getRequestContext().entrySet()) {
                                maskedContext.put(entry.getKey(), EvidenceMasking.maskValue(entry.getKey(), entry.getValue()));
                        }
                }
                s().f("input")
                   .kv("featureCode", request.getFeatureCode())
                   .kv("projectId", request.getProjectId())
                   .kv("environmentCode", request.getEnvironmentCode())
                   .kv("contextPresent", request.getRequestContext() != null)
                   .kv("context", maskedContext);
        }

        private static void validate(Request request) {
                if (request == null || request.getFeatureCode() == null || request.getFeatureCode().isBlank()) {
                        reject("missingFeatureCode");
                        throw new InvalidRequestException("evaluation", "missingFeatureCode");
                }
                if (request.getProjectId() == null) {
                        reject("missingProjectId");
                        throw new InvalidRequestException("evaluation", "missingProjectId")
                                        .with("featureCode", request.getFeatureCode());
                }
                if (request.getEnvironmentCode() == null || request.getEnvironmentCode().isBlank()) {
                        reject("missingEnvironmentCode");
                        throw new InvalidRequestException("evaluation", "missingEnvironmentCode")
                                        .with("featureCode", request.getFeatureCode())
                                        .with("projectId", request.getProjectId());
                }
                s().f("validation").kv("passed", true);
        }

        private static void reject(String reason) {
                s().f("validation").kv("passed", false).kv("reason", reason);
        }

        private FeatureEntity findFeature(Long projectId, String requestedCode) {
                String featureCode = requestedCode.trim().toUpperCase();
                Optional<FeatureEntity> feature = featureRepository.findByProjectIdAndCode(projectId, featureCode);
                ExecutionFact lookup = s().f("featureLookup")
                                .kv("projectId", projectId)
                                .kv("code", featureCode)
                                .kv("found", feature.isPresent());
                if (feature.isEmpty()) {
                        throw new ResourceNotFoundException("feature", "code", requestedCode);
                }
                lookup.kv("featureId", feature.get().getId()).kv("featureName", feature.get().getName());
                return feature.get();
        }

        private EnvironmentEntity findEnvironment(Long projectId, String environmentCode) {
                Optional<EnvironmentEntity> environment = environmentRepository.findByProjectIdAndCode(projectId,
                                environmentCode);
                ExecutionFact lookup = s().f("environmentLookup")
                                .kv("projectId", projectId)
                                .kv("code", environmentCode)
                                .kv("found", environment.isPresent());
                if (environment.isEmpty()) {
                        throw new ResourceNotFoundException("environment", "code", environmentCode);
                }
                lookup.kv("environmentId", environment.get().getId());
                return environment.get();
        }

        /**
         * Keeps the rules that are effective at {@code now} and records why each other rule was skipped.
         */
        private static List<FeatureRuleEntity> selectEffectiveRules(List<FeatureRuleEntity> activeRules, Instant now) {
                List<FeatureRuleEntity> effectiveRules = new ArrayList<>(activeRules.size());
                List<Map<String, Object>> skipped = new ArrayList<>();
                for (FeatureRuleEntity rule : activeRules) {
                        if (rule.isEffective(now)) {
                                effectiveRules.add(rule);
                        } else {
                                Map<String, Object> skip = new LinkedHashMap<>();
                                skip.put("ruleId", rule.getId());
                                skip.put("reason", ineffectiveReason(rule, now));
                                skipped.add(skip);
                        }
                }
                s().f("rules")
                   .kv("evaluatedAt", now.toString())
                   .kv("enabledCount", activeRules.size())
                   .kv("effectiveCount", effectiveRules.size())
                   .kv("skippedNotEffective", skipped);
                return effectiveRules;
        }

        private static String ineffectiveReason(FeatureRuleEntity rule, Instant now) {
                if (!Boolean.TRUE.equals(rule.getEnabled())) {
                        return "disabled";
                }
                if (rule.getEffectiveFrom() != null && now.isBefore(rule.getEffectiveFrom())) {
                        return "notYetEffective";
                }
                return "expired";
        }

        /**
         * Checks the rules in order and returns the first one whose qualifier value matches the request context, or
         * {@code null} when none matches. Every check is recorded in {@code ruleChecks}.
         */
        private static FeatureRuleEntity findMatchingRule(List<FeatureRuleEntity> sortedRules,
                        Map<String, String> context, List<String> logs) {
                List<Map<String, Object>> checks = new ArrayList<>(sortedRules.size());
                for (FeatureRuleEntity rule : sortedRules) {
                        boolean matched = checkRule(rule, context, logs, checks);
                        // Rewritten after each check so the checks done so far survive an exception
                        s().kv("ruleChecks", checks);
                        if (matched) {
                                return rule;
                        }
                }
                return null;
        }

        private static boolean checkRule(FeatureRuleEntity rule, Map<String, String> context, List<String> logs,
                        List<Map<String, Object>> checks) {
                Map<String, Object> check = new LinkedHashMap<>();
                checks.add(check);
                check.put("ruleId", rule.getId());
                check.put("rulePriority", rule.getPriority());
                FeatureQualifierEntity qualifier = rule.getQualifier();
                if (qualifier == null) {
                        check.put("result", "skippedNoQualifier");
                        return false;
                }

                String qualifierCode = qualifier.getCode();
                String expectedValue = rule.getQualifierValue();
                String incomingValue = context.get(qualifierCode);
                check.put("qualifierCode", qualifierCode);
                check.put("qualifierPriority", qualifier.getPriority());
                check.put("comparison", COMPARISON);
                check.put("expected", EvidenceMasking.maskValue(qualifierCode, expectedValue));
                check.put("actual", EvidenceMasking.maskValue(qualifierCode, incomingValue));

                logs.add(String.format(
                                "Checking Rule #%d [Qualifier: %s (Priority %d), Expected: '%s', Request Value: '%s']",
                                rule.getId(), qualifierCode, qualifier.getPriority(), expectedValue,
                                incomingValue != null ? incomingValue : "<missing>"));

                if (incomingValue == null) {
                        check.put("result", "missingContextValue");
                        return false;
                }
                if (!incomingValue.trim().equalsIgnoreCase(expectedValue.trim())) {
                        check.put("result", "noMatch");
                        return false;
                }
                check.put("result", "match");
                logs.add(String.format(">> MATCH FOUND on Rule #%d! Resolved value: '%s'", rule.getId(),
                                rule.getFeatureValue()));
                return true;
        }

        private static CrudResponse<Response> ruleMatchResponse(FeatureEntity feature, EnvironmentEntity environment,
                        FeatureRuleEntity rule, List<String> logs) {
                String qualifierCode = rule.getQualifier().getCode();
                s().f("decision")
                   .kv("source", "RULE_MATCH")
                   .kv("reason", "ruleMatched")
                   .kv("resolvedValue", rule.getFeatureValue())
                   .kv("matchingRuleId", rule.getId())
                   .kv("matchingQualifierCode", qualifierCode);
                Response response = Response.builder()
                                .featureCode(feature.getCode())
                                .featureName(feature.getName())
                                .environmentCode(environment.getCode())
                                .resolvedValue(rule.getFeatureValue())
                                .source("RULE_MATCH")
                                .matchingRuleId(rule.getId())
                                .matchingQualifierCode(qualifierCode)
                                .logs(logs)
                                .build();
                return CrudResponse.of(response, "Feature evaluated successfully via rule match");
        }

        private static CrudResponse<Response> fallbackResponse(FeatureEntity feature, EnvironmentEntity environment,
                        boolean noEffectiveRules, List<String> logs) {
                s().f("decision")
                   .kv("source", "DEFAULT_FALLBACK")
                   .kv("reason", noEffectiveRules ? "noEffectiveRules" : "noRuleMatched")
                   .kv("resolvedValue", "false");
                logs.add("No rules matched request context. Returning default fallback 'false'");
                Response fallback = Response.builder()
                                .featureCode(feature.getCode())
                                .featureName(feature.getName())
                                .environmentCode(environment.getCode())
                                .resolvedValue("false")
                                .source("DEFAULT_FALLBACK")
                                .logs(logs)
                                .build();
                return CrudResponse.of(fallback, "Feature evaluated with default fallback");
        }

        private static List<Long> ruleIds(List<FeatureRuleEntity> rules) {
                List<Long> ids = new ArrayList<>(rules.size());
                for (FeatureRuleEntity rule : rules) {
                        ids.add(rule.getId());
                }
                return ids;
        }
}
