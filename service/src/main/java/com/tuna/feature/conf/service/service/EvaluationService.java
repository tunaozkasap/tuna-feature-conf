package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.EvaluationDto.Request;
import com.tuna.feature.conf.model.dto.EvaluationDto.Response;
import com.tuna.feature.conf.persistence.entity.FeatureEntity;
import com.tuna.feature.conf.persistence.entity.FeatureQualifierEntity;
import com.tuna.feature.conf.persistence.entity.FeatureRuleEntity;
import com.tuna.feature.conf.persistence.repository.FeatureQualifierRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRuleRepository;
import com.tuna.feature.conf.service.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EvaluationService {

        private final FeatureRepository featureRepository;
        private final FeatureRuleRepository ruleRepository;
        private final FeatureQualifierRepository qualifierRepository;

        public CrudResponse<Response> evaluateFeature(CrudRequest<Request> crudRequest) {
                Request request = crudRequest.getData();
                if (request == null || request.getFeatureCode() == null || request.getFeatureCode().isBlank()) {
                        throw new IllegalArgumentException("Feature code is required for evaluation");
                }

                List<String> logs = new ArrayList<>();
                logs.add(String.format("Evaluating feature code '%s' for project ID %s", request.getFeatureCode(),
                                request.getProjectId()));

                Optional<FeatureEntity> featureOpt = (request.getProjectId() != null)
                                ? featureRepository.findByProjectIdAndCode(request.getProjectId(),
                                                request.getFeatureCode().toUpperCase())
                                : featureRepository.findByCode(request.getFeatureCode().toUpperCase());

                FeatureEntity feature = featureOpt.orElseThrow(
                                () -> new ResourceNotFoundException("Feature", "code", request.getFeatureCode()));

                List<FeatureRuleEntity> activeRules = ruleRepository.findByFeatureIdAndEnabledTrue(feature.getId());
                Instant now = Instant.now();
                List<FeatureRuleEntity> effectiveRules = activeRules.stream()
                                .filter(rule -> rule.isEffective(now))
                                .toList();
                logs.add(String.format(
                                "Found %d active and effective rule(s) for feature '%s' (out of %d enabled rules)",
                                effectiveRules.size(), feature.getCode(), activeRules.size()));

                // Sort rules by Qualifier Priority (descending), then Rule Priority
                // (descending)
                List<FeatureRuleEntity> sortedRules = effectiveRules.stream()
                                .sorted((a, b) -> {
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
                                })
                                .toList();

                Map<String, String> context = request.getRequestContext() != null ? request.getRequestContext()
                                : Map.of();

                for (FeatureRuleEntity rule : sortedRules) {
                        FeatureQualifierEntity qualifier = rule.getQualifier();
                        if (qualifier == null)
                                continue;

                        String qualifierCode = qualifier.getCode();
                        String expectedValue = rule.getQualifierValue();
                        String incomingValue = context.get(qualifierCode);

                        logs.add(String.format(
                                        "Checking Rule #%d [Qualifier: %s (Priority %d), Expected: '%s', Request Value: '%s']",
                                        rule.getId(), qualifierCode, qualifier.getPriority(), expectedValue,
                                        incomingValue != null ? incomingValue : "<missing>"));

                        if (incomingValue != null && incomingValue.trim().equalsIgnoreCase(expectedValue.trim())) {
                                logs.add(String.format(">> MATCH FOUND on Rule #%d! Resolved value: '%s'", rule.getId(),
                                                rule.getFeatureValue()));
                                Response response = Response.builder()
                                                .featureCode(feature.getCode())
                                                .featureName(feature.getName())
                                                .resolvedValue(rule.getFeatureValue())
                                                .source("RULE_MATCH")
                                                .matchingRuleId(rule.getId())
                                                .matchingQualifierCode(qualifierCode)
                                                .logs(logs)
                                                .build();
                                return CrudResponse.of(response, "Feature evaluated successfully via rule match");
                        }
                }

                logs.add("No rules matched request context. Returning default fallback 'false'");
                Response fallback = Response.builder()
                                .featureCode(feature.getCode())
                                .featureName(feature.getName())
                                .resolvedValue("false")
                                .source("DEFAULT_FALLBACK")
                                .logs(logs)
                                .build();
                return CrudResponse.of(fallback, "Feature evaluated with default fallback");
        }
}
