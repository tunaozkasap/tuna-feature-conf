package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.FeatureRuleDto;
import com.tuna.feature.conf.model.dto.FeatureRuleDto.CreateRequest;
import com.tuna.feature.conf.model.dto.FeatureRuleDto.Response;
import com.tuna.feature.conf.model.dto.FeatureRuleDto.UpdateRequest;
import com.tuna.feature.conf.persistence.entity.EnvironmentEntity;
import com.tuna.feature.conf.persistence.entity.FeatureEntity;
import com.tuna.feature.conf.persistence.entity.FeatureQualifierEntity;
import com.tuna.feature.conf.persistence.entity.FeatureRuleEntity;
import com.tuna.feature.conf.persistence.repository.EnvironmentRepository;
import com.tuna.feature.conf.persistence.repository.FeatureQualifierRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRuleRepository;
import com.tuna.feature.conf.service.exception.InvalidRequestException;
import com.tuna.feature.conf.service.exception.ResourceNotFoundException;
import com.tuna.feature.conf.service.util.EvidenceMasking;
import com.tuna.feature.conf.service.util.JpaQueryHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

@Service
@RequiredArgsConstructor
@Transactional
public class FeatureRuleService {

    private final FeatureRuleRepository ruleRepository;
    private final FeatureRepository featureRepository;
    private final FeatureQualifierRepository qualifierRepository;
    private final EnvironmentRepository environmentRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        try (var search = s().parent("searchRules")) {
            Specification<FeatureRuleEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
            Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

            Page<FeatureRuleEntity> page = (spec != null)
                    ? ruleRepository.findAll(spec, pageable)
                    : ruleRepository.findAll(pageable);

            List<Response> items = new ArrayList<>(page.getNumberOfElements());
            List<Long> ids = new ArrayList<>(page.getNumberOfElements());
            for (FeatureRuleEntity entity : page.getContent()) {
                items.add(toResponse(entity));
                ids.add(entity.getId());
            }
            s().kv("returnedIds", ids);

            return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
        }
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getRuleById(Long id) {
        try (var get = s().parent("getRule")) {
            s().kv("ruleId", id);
            FeatureRuleEntity entity = ruleRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("rule", "id", id));
            s().kv("found", true);
            return CrudResponse.of(toResponse(entity));
        }
    }

    public CrudResponse<Response> createRule(CrudRequest<CreateRequest> request) {
        try (var create = s().parent("createRule")) {
            CreateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new InvalidRequestException("rule", "missingData");
            }
            s().f("input")
               .kv("featureId", data.getFeatureId())
               .kv("environmentId", data.getEnvironmentId())
               .kv("qualifierId", data.getQualifierId())
               .kv("priority", data.getPriority())
               .kv("enabled", data.getEnabled())
               .kv("effectiveFrom", instantText(data.getEffectiveFrom()))
               .kv("effectiveTo", instantText(data.getEffectiveTo()));

            FeatureEntity feature = featureRepository.findById(data.getFeatureId())
                    .orElseThrow(() -> new ResourceNotFoundException("feature", "id", data.getFeatureId()));
            s().kv("featureCode", feature.getCode());

            EnvironmentEntity environment = environmentRepository.findById(data.getEnvironmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("environment", "id", data.getEnvironmentId()));
            s().kv("environmentCode", environment.getCode());

            FeatureQualifierEntity qualifier = qualifierRepository.findById(data.getQualifierId())
                    .orElseThrow(() -> new ResourceNotFoundException("qualifier", "id", data.getQualifierId()));
            s().kv("qualifierCode", qualifier.getCode());

            FeatureRuleEntity entity = new FeatureRuleEntity();
            entity.setFeature(feature);
            entity.setEnvironment(environment);
            entity.setQualifier(qualifier);
            ensureSameProject(entity);
            entity.setQualifierValue(data.getQualifierValue());
            entity.setFeatureValue(data.getFeatureValue());
            entity.setPriority(data.getPriority() != null ? data.getPriority() : 0);
            entity.setEnabled(data.getEnabled() != null ? data.getEnabled() : true);
            entity.setEffectiveFrom(data.getEffectiveFrom());
            entity.setEffectiveTo(data.getEffectiveTo());
            entity.setDescription(data.getDescription());
            recordRuleValues(entity);

            FeatureRuleEntity saved = ruleRepository.save(entity);
            s().kv("savedId", saved.getId()).kv("result", "created");
            return CrudResponse.of(toResponse(saved), "FeatureRule created successfully");
        }
    }

    public CrudResponse<Response> updateRule(Long id, CrudRequest<UpdateRequest> request) {
        try (var update = s().parent("updateRule")) {
            s().kv("ruleId", id);
            UpdateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new InvalidRequestException("rule", "missingData");
            }

            FeatureRuleEntity entity = ruleRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("rule", "id", id));
            s().kv("found", true);

            List<String> changedFields = new ArrayList<>();
            if (data.getFeatureId() != null) {
                FeatureEntity feature = featureRepository.findById(data.getFeatureId())
                        .orElseThrow(() -> new ResourceNotFoundException("feature", "id", data.getFeatureId()));
                entity.setFeature(feature);
                changedFields.add("featureId");
            }
            if (data.getEnvironmentId() != null) {
                EnvironmentEntity environment = environmentRepository.findById(data.getEnvironmentId())
                        .orElseThrow(() -> new ResourceNotFoundException("environment", "id", data.getEnvironmentId()));
                entity.setEnvironment(environment);
                changedFields.add("environmentId");
            }
            if (data.getQualifierId() != null) {
                FeatureQualifierEntity qualifier = qualifierRepository.findById(data.getQualifierId())
                        .orElseThrow(() -> new ResourceNotFoundException("qualifier", "id", data.getQualifierId()));
                entity.setQualifier(qualifier);
                changedFields.add("qualifierId");
            }
            if (data.getQualifierValue() != null && !data.getQualifierValue().isBlank()) {
                entity.setQualifierValue(data.getQualifierValue());
                changedFields.add("qualifierValue");
            }
            if (data.getFeatureValue() != null && !data.getFeatureValue().isBlank()) {
                entity.setFeatureValue(data.getFeatureValue());
                changedFields.add("featureValue");
            }
            if (data.getPriority() != null) {
                entity.setPriority(data.getPriority());
                changedFields.add("priority");
            }
            if (data.getEnabled() != null) {
                entity.setEnabled(data.getEnabled());
                changedFields.add("enabled");
            }
            if (data.getEffectiveFrom() != null) {
                entity.setEffectiveFrom(data.getEffectiveFrom());
                changedFields.add("effectiveFrom");
            }
            if (data.getEffectiveTo() != null) {
                entity.setEffectiveTo(data.getEffectiveTo());
                changedFields.add("effectiveTo");
            }
            if (data.getDescription() != null) {
                entity.setDescription(data.getDescription());
                changedFields.add("description");
            }
            s().kv("changedFields", changedFields);

            ensureSameProject(entity);
            recordRuleValues(entity);

            FeatureRuleEntity saved = ruleRepository.save(entity);
            s().kv("savedId", saved.getId()).kv("result", "updated");
            return CrudResponse.of(toResponse(saved), "FeatureRule updated successfully");
        }
    }

    public CrudResponse<Void> deleteRule(Long id) {
        try (var delete = s().parent("deleteRule")) {
            s().kv("ruleId", id);
            if (!ruleRepository.existsById(id)) {
                s().kv("found", false);
                throw new ResourceNotFoundException("rule", "id", id);
            }
            s().kv("found", true);
            ruleRepository.deleteById(id);
            s().kv("result", "deleted");
            return CrudResponse.<Void>builder()
                    .success(true)
                    .message("FeatureRule deleted successfully")
                    .build();
        }
    }

    private void ensureSameProject(FeatureRuleEntity entity) {
        Long featureProjectId = entity.getFeature().getProject() != null ? entity.getFeature().getProject().getId() : null;
        Long environmentProjectId = entity.getEnvironment().getProject().getId();
        Long qualifierProjectId = entity.getQualifier().getProject() != null ? entity.getQualifier().getProject().getId() : null;
        var projectCheck = s().f("projectCheck")
                .kv("featureProjectId", featureProjectId)
                .kv("environmentProjectId", environmentProjectId)
                .kv("qualifierProjectId", qualifierProjectId);
        if (!Objects.equals(featureProjectId, environmentProjectId)) {
            projectCheck.kv("passed", false).kv("reason", "environmentInOtherProject");
            throw new InvalidRequestException("rule", "environmentInOtherProject")
                    .with("environmentCode", entity.getEnvironment().getCode())
                    .with("environmentProjectId", environmentProjectId)
                    .with("featureCode", entity.getFeature().getCode())
                    .with("featureProjectId", featureProjectId);
        }
        if (!Objects.equals(featureProjectId, qualifierProjectId)) {
            projectCheck.kv("passed", false).kv("reason", "qualifierInOtherProject");
            throw new InvalidRequestException("rule", "qualifierInOtherProject")
                    .with("qualifierCode", entity.getQualifier().getCode())
                    .with("qualifierProjectId", qualifierProjectId)
                    .with("featureCode", entity.getFeature().getCode())
                    .with("featureProjectId", featureProjectId);
        }
        projectCheck.kv("passed", true);
    }

    private static void recordRuleValues(FeatureRuleEntity entity) {
        String qualifierCode = entity.getQualifier().getCode();
        s().f("ruleValues")
           .kv("qualifierCode", qualifierCode)
           .kv("qualifierValue", EvidenceMasking.maskValue(qualifierCode, entity.getQualifierValue()))
           .kv("featureValue", entity.getFeatureValue())
           .kv("priority", entity.getPriority())
           .kv("enabled", entity.getEnabled())
           .kv("effectiveFrom", instantText(entity.getEffectiveFrom()))
           .kv("effectiveTo", instantText(entity.getEffectiveTo()));
    }

    private static String instantText(Instant instant) {
        return instant != null ? instant.toString() : null;
    }

    private Response toResponse(FeatureRuleEntity entity) {
        return Response.builder()
                .id(entity.getId())
                .featureId(entity.getFeature() != null ? entity.getFeature().getId() : null)
                .featureCode(entity.getFeature() != null ? entity.getFeature().getCode() : null)
                .featureName(entity.getFeature() != null ? entity.getFeature().getName() : null)
                .environmentId(entity.getEnvironment() != null ? entity.getEnvironment().getId() : null)
                .environmentCode(entity.getEnvironment() != null ? entity.getEnvironment().getCode() : null)
                .qualifierId(entity.getQualifier() != null ? entity.getQualifier().getId() : null)
                .qualifierCode(entity.getQualifier() != null ? entity.getQualifier().getCode() : null)
                .qualifierName(entity.getQualifier() != null ? entity.getQualifier().getName() : null)
                .qualifierPriority(entity.getQualifier() != null ? entity.getQualifier().getPriority() : null)
                .qualifierValue(entity.getQualifierValue())
                .featureValue(entity.getFeatureValue())
                .priority(entity.getPriority())
                .enabled(entity.getEnabled() != null ? entity.getEnabled() : true)
                .effectiveFrom(entity.getEffectiveFrom())
                .effectiveTo(entity.getEffectiveTo())
                .description(entity.getDescription())
                .build();
    }
}
