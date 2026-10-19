package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto.CreateRequest;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto.Response;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto.UpdateRequest;
import com.tuna.feature.conf.model.enums.FeatureQualifierValueType;
import com.tuna.feature.conf.persistence.entity.FeatureQualifierEntity;
import com.tuna.feature.conf.persistence.entity.ProjectEntity;
import com.tuna.feature.conf.persistence.repository.FeatureQualifierRepository;
import com.tuna.feature.conf.persistence.repository.ProjectRepository;
import com.tuna.feature.conf.service.exception.InvalidRequestException;
import com.tuna.feature.conf.service.exception.ResourceNotFoundException;
import com.tuna.feature.conf.service.util.JpaQueryHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

@Service
@RequiredArgsConstructor
@Transactional
public class FeatureQualifierService {

    private final FeatureQualifierRepository qualifierRepository;
    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        try (var search = s().parent("searchQualifiers")) {
            Specification<FeatureQualifierEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
            Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

            Page<FeatureQualifierEntity> page = (spec != null)
                    ? qualifierRepository.findAll(spec, pageable)
                    : qualifierRepository.findAll(pageable);

            List<Response> items = new ArrayList<>(page.getNumberOfElements());
            List<Long> ids = new ArrayList<>(page.getNumberOfElements());
            for (FeatureQualifierEntity entity : page.getContent()) {
                items.add(toResponse(entity));
                ids.add(entity.getId());
            }
            s().kv("returnedIds", ids);

            return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
        }
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getQualifierById(Long id) {
        try (var get = s().parent("getQualifier")) {
            s().kv("qualifierId", id);
            FeatureQualifierEntity entity = qualifierRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("qualifier", "id", id));
            s().kv("found", true).kv("code", entity.getCode());
            return CrudResponse.of(toResponse(entity));
        }
    }

    public CrudResponse<Response> createQualifier(CrudRequest<CreateRequest> request) {
        try (var create = s().parent("createQualifier")) {
            CreateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new InvalidRequestException("qualifier", "missingData");
            }
            recordInput(data.getProjectId(), data.getCode(), data.getName(), data.getPriority(), data.getValueType());

            ProjectEntity project = projectRepository.findById(data.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("project", "id", data.getProjectId()));
            s().kv("projectFound", true);

            String code = data.getCode().trim().toUpperCase();
            s().kv("normalizedCode", code);
            ensureCodeIsAvailable(project.getId(), code);

            FeatureQualifierEntity entity = new FeatureQualifierEntity();
            entity.setCode(code);
            entity.setName(data.getName());
            entity.setDescription(data.getDescription());
            entity.setPriority(data.getPriority() != null ? data.getPriority() : 0);
            entity.setValueType(data.getValueType());
            entity.setProject(project);
            s().kv("priority", entity.getPriority()).kv("priorityDefaulted", data.getPriority() == null);

            FeatureQualifierEntity saved = qualifierRepository.save(entity);
            s().kv("savedId", saved.getId()).kv("result", "created");
            return CrudResponse.of(toResponse(saved), "FeatureQualifier created successfully");
        }
    }

    public CrudResponse<Response> updateQualifier(Long id, CrudRequest<UpdateRequest> request) {
        try (var update = s().parent("updateQualifier")) {
            s().kv("qualifierId", id);
            UpdateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new InvalidRequestException("qualifier", "missingData");
            }
            recordInput(data.getProjectId(), data.getCode(), data.getName(), data.getPriority(), data.getValueType());

            FeatureQualifierEntity entity = qualifierRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("qualifier", "id", id));
            s().kv("found", true).kv("currentCode", entity.getCode());

            Long projectId = entity.getProject() != null ? entity.getProject().getId() : null;
            if (data.getProjectId() != null && !Objects.equals(data.getProjectId(), projectId)) {
                s().kv("rejected", "projectChange").kv("currentProjectId", projectId);
                throw new InvalidRequestException("qualifier", "projectChange")
                        .with("qualifierId", id)
                        .with("currentProjectId", projectId)
                        .with("requestedProjectId", data.getProjectId());
            }
            List<String> changedFields = new ArrayList<>();
            if (data.getCode() != null && !data.getCode().isBlank()) {
                String code = data.getCode().trim().toUpperCase();
                if (!code.equals(entity.getCode())) {
                    ensureCodeIsAvailable(projectId, code);
                    entity.setCode(code);
                    changedFields.add("code");
                }
            }
            if (data.getName() != null && !data.getName().isBlank()) {
                entity.setName(data.getName());
                changedFields.add("name");
            }
            if (data.getDescription() != null) {
                entity.setDescription(data.getDescription());
                changedFields.add("description");
            }
            if (data.getPriority() != null) {
                entity.setPriority(data.getPriority());
                changedFields.add("priority");
            }
            if (data.getValueType() != null) {
                entity.setValueType(data.getValueType());
                changedFields.add("valueType");
            }
            s().kv("changedFields", changedFields);

            FeatureQualifierEntity saved = qualifierRepository.save(entity);
            s().kv("savedId", saved.getId()).kv("result", "updated");
            return CrudResponse.of(toResponse(saved), "FeatureQualifier updated successfully");
        }
    }

    public CrudResponse<Void> deleteQualifier(Long id) {
        try (var delete = s().parent("deleteQualifier")) {
            s().kv("qualifierId", id);
            if (!qualifierRepository.existsById(id)) {
                s().kv("found", false);
                throw new ResourceNotFoundException("qualifier", "id", id);
            }
            s().kv("found", true);
            qualifierRepository.deleteById(id);
            s().kv("result", "deleted");
            return CrudResponse.<Void>builder()
                    .success(true)
                    .message("FeatureQualifier deleted successfully")
                    .build();
        }
    }

    private void ensureCodeIsAvailable(Long projectId, String code) {
        boolean taken = qualifierRepository.existsByProjectIdAndCode(projectId, code);
        s().f("codeCheck").kv("projectId", projectId).kv("code", code).kv("available", !taken);
        if (taken) {
            s().kv("rejected", "duplicateCode");
            throw new InvalidRequestException("qualifier", "duplicateCode")
                    .with("qualifierCode", code)
                    .with("projectId", projectId);
        }
    }

    private static void recordInput(Long projectId, String code, String name, Integer priority,
            FeatureQualifierValueType valueType) {
        s().f("input")
           .kv("projectId", projectId)
           .kv("code", code)
           .kv("name", name)
           .kv("priority", priority)
           .kv("valueType", valueType);
    }

    private Response toResponse(FeatureQualifierEntity entity) {
        return Response.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .priority(entity.getPriority())
                .valueType(entity.getValueType())
                .projectId(entity.getProject() != null ? entity.getProject().getId() : null)
                .projectName(entity.getProject() != null ? entity.getProject().getName() : null)
                .build();
    }
}
