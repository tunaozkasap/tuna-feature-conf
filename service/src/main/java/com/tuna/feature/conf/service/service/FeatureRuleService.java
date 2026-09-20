package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.FeatureRuleDto;
import com.tuna.feature.conf.model.dto.FeatureRuleDto.CreateRequest;
import com.tuna.feature.conf.model.dto.FeatureRuleDto.Response;
import com.tuna.feature.conf.model.dto.FeatureRuleDto.UpdateRequest;
import com.tuna.feature.conf.persistence.entity.FeatureEntity;
import com.tuna.feature.conf.persistence.entity.FeatureQualifierEntity;
import com.tuna.feature.conf.persistence.entity.FeatureRuleEntity;
import com.tuna.feature.conf.persistence.repository.FeatureQualifierRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRuleRepository;
import com.tuna.feature.conf.service.exception.ResourceNotFoundException;
import com.tuna.feature.conf.service.util.JpaQueryHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class FeatureRuleService {

    private final FeatureRuleRepository ruleRepository;
    private final FeatureRepository featureRepository;
    private final FeatureQualifierRepository qualifierRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        Specification<FeatureRuleEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
        Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

        Page<FeatureRuleEntity> page = (spec != null)
                ? ruleRepository.findAll(spec, pageable)
                : ruleRepository.findAll(pageable);

        List<Response> items = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getRuleById(Long id) {
        FeatureRuleEntity entity = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FeatureRule", "id", id));
        return CrudResponse.of(toResponse(entity));
    }

    public CrudResponse<Response> createRule(CrudRequest<CreateRequest> request) {
        CreateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("FeatureRule payload data is required");
        }

        FeatureEntity feature = featureRepository.findById(data.getFeatureId())
                .orElseThrow(() -> new ResourceNotFoundException("Feature", "id", data.getFeatureId()));

        FeatureQualifierEntity qualifier = qualifierRepository.findById(data.getQualifierId())
                .orElseThrow(() -> new ResourceNotFoundException("FeatureQualifier", "id", data.getQualifierId()));

        FeatureRuleEntity entity = new FeatureRuleEntity();
        entity.setFeature(feature);
        entity.setQualifier(qualifier);
        entity.setQualifierValue(data.getQualifierValue());
        entity.setFeatureValue(data.getFeatureValue());
        entity.setPriority(data.getPriority() != null ? data.getPriority() : 0);
        entity.setEnabled(data.getEnabled() != null ? data.getEnabled() : true);
        entity.setEffectiveFrom(data.getEffectiveFrom());
        entity.setEffectiveTo(data.getEffectiveTo());
        entity.setDescription(data.getDescription());

        FeatureRuleEntity saved = ruleRepository.save(entity);
        return CrudResponse.of(toResponse(saved), "FeatureRule created successfully");
    }

    public CrudResponse<Response> updateRule(Long id, CrudRequest<UpdateRequest> request) {
        UpdateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("FeatureRule payload data is required");
        }

        FeatureRuleEntity entity = ruleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FeatureRule", "id", id));

        if (data.getFeatureId() != null) {
            FeatureEntity feature = featureRepository.findById(data.getFeatureId())
                    .orElseThrow(() -> new ResourceNotFoundException("Feature", "id", data.getFeatureId()));
            entity.setFeature(feature);
        }
        if (data.getQualifierId() != null) {
            FeatureQualifierEntity qualifier = qualifierRepository.findById(data.getQualifierId())
                    .orElseThrow(() -> new ResourceNotFoundException("FeatureQualifier", "id", data.getQualifierId()));
            entity.setQualifier(qualifier);
        }
        if (data.getQualifierValue() != null && !data.getQualifierValue().isBlank()) {
            entity.setQualifierValue(data.getQualifierValue());
        }
        if (data.getFeatureValue() != null && !data.getFeatureValue().isBlank()) {
            entity.setFeatureValue(data.getFeatureValue());
        }
        if (data.getPriority() != null) {
            entity.setPriority(data.getPriority());
        }
        if (data.getEnabled() != null) {
            entity.setEnabled(data.getEnabled());
        }
        if (data.getEffectiveFrom() != null) {
            entity.setEffectiveFrom(data.getEffectiveFrom());
        }
        if (data.getEffectiveTo() != null) {
            entity.setEffectiveTo(data.getEffectiveTo());
        }
        if (data.getDescription() != null) {
            entity.setDescription(data.getDescription());
        }

        FeatureRuleEntity saved = ruleRepository.save(entity);
        return CrudResponse.of(toResponse(saved), "FeatureRule updated successfully");
    }

    public CrudResponse<Void> deleteRule(Long id) {
        if (!ruleRepository.existsById(id)) {
            throw new ResourceNotFoundException("FeatureRule", "id", id);
        }
        ruleRepository.deleteById(id);
        return CrudResponse.<Void>builder()
                .success(true)
                .message("FeatureRule deleted successfully")
                .build();
    }

    private Response toResponse(FeatureRuleEntity entity) {
        return Response.builder()
                .id(entity.getId())
                .featureId(entity.getFeature() != null ? entity.getFeature().getId() : null)
                .featureCode(entity.getFeature() != null ? entity.getFeature().getCode() : null)
                .featureName(entity.getFeature() != null ? entity.getFeature().getName() : null)
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
