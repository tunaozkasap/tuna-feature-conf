package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.FeatureDto;
import com.tuna.feature.conf.model.dto.FeatureDto.CreateRequest;
import com.tuna.feature.conf.model.dto.FeatureDto.Response;
import com.tuna.feature.conf.model.dto.FeatureDto.UpdateRequest;
import com.tuna.feature.conf.persistence.entity.FeatureEntity;
import com.tuna.feature.conf.persistence.entity.ProjectEntity;
import com.tuna.feature.conf.persistence.repository.FeatureRepository;
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
public class FeatureService {

    private final FeatureRepository featureRepository;
    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        try (var search = s().parent("searchFeatures")) {
            Specification<FeatureEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
            Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

            Page<FeatureEntity> page = (spec != null)
                    ? featureRepository.findAll(spec, pageable)
                    : featureRepository.findAll(pageable);

            List<Response> items = new ArrayList<>(page.getNumberOfElements());
            List<Long> ids = new ArrayList<>(page.getNumberOfElements());
            for (FeatureEntity entity : page.getContent()) {
                items.add(toResponse(entity));
                ids.add(entity.getId());
            }
            s().kv("returnedIds", ids);

            return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
        }
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getFeatureById(Long id) {
        try (var get = s().parent("getFeature")) {
            s().kv("featureId", id);
            FeatureEntity feature = featureRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Feature", "id", id));
            s().kv("found", true).kv("code", feature.getCode());
            return CrudResponse.of(toResponse(feature));
        }
    }

    public CrudResponse<Response> createFeature(CrudRequest<CreateRequest> request) {
        try (var create = s().parent("createFeature")) {
            CreateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new IllegalArgumentException("Feature payload data is required");
            }
            recordInput(data.getProjectId(), data.getCode(), data.getName(), data.getDescription());

            ProjectEntity project = projectRepository.findById(data.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project", "id", data.getProjectId()));
            s().kv("projectFound", true);

            String code = data.getCode().trim().toUpperCase();
            s().kv("normalizedCode", code);
            ensureCodeIsAvailable(project.getId(), code);

            FeatureEntity feature = new FeatureEntity();
            feature.setCode(code);
            feature.setName(data.getName());
            feature.setDescription(data.getDescription());
            feature.setProject(project);

            FeatureEntity saved = featureRepository.save(feature);
            s().kv("savedId", saved.getId()).kv("result", "created");
            return CrudResponse.of(toResponse(saved), "Feature created successfully");
        }
    }

    public CrudResponse<Response> updateFeature(Long id, CrudRequest<UpdateRequest> request) {
        try (var update = s().parent("updateFeature")) {
            s().kv("featureId", id);
            UpdateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new IllegalArgumentException("Feature payload data is required");
            }
            recordInput(data.getProjectId(), data.getCode(), data.getName(), data.getDescription());

            FeatureEntity feature = featureRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Feature", "id", id));
            s().kv("found", true).kv("currentCode", feature.getCode());

            Long projectId = feature.getProject() != null ? feature.getProject().getId() : null;
            if (data.getProjectId() != null && !Objects.equals(data.getProjectId(), projectId)) {
                s().kv("rejected", "projectChange").kv("currentProjectId", projectId);
                throw new InvalidRequestException(
                        "A feature cannot be moved to another project; its rules depend on the project's environments and qualifiers");
            }
            List<String> changedFields = new ArrayList<>();
            if (data.getCode() != null && !data.getCode().isBlank()) {
                String code = data.getCode().trim().toUpperCase();
                if (!code.equals(feature.getCode())) {
                    ensureCodeIsAvailable(projectId, code);
                    feature.setCode(code);
                    changedFields.add("code");
                }
            }
            if (data.getName() != null && !data.getName().isBlank()) {
                feature.setName(data.getName());
                changedFields.add("name");
            }
            if (data.getDescription() != null) {
                feature.setDescription(data.getDescription());
                changedFields.add("description");
            }
            s().kv("changedFields", changedFields);

            FeatureEntity saved = featureRepository.save(feature);
            s().kv("savedId", saved.getId()).kv("result", "updated");
            return CrudResponse.of(toResponse(saved), "Feature updated successfully");
        }
    }

    public CrudResponse<Void> deleteFeature(Long id) {
        try (var delete = s().parent("deleteFeature")) {
            s().kv("featureId", id);
            if (!featureRepository.existsById(id)) {
                s().kv("found", false);
                throw new ResourceNotFoundException("Feature", "id", id);
            }
            s().kv("found", true);
            featureRepository.deleteById(id);
            s().kv("result", "deleted");
            return CrudResponse.<Void>builder()
                    .success(true)
                    .message("Feature deleted successfully")
                    .build();
        }
    }

    private void ensureCodeIsAvailable(Long projectId, String code) {
        boolean taken = featureRepository.existsByProjectIdAndCode(projectId, code);
        s().f("codeCheck").kv("projectId", projectId).kv("code", code).kv("available", !taken);
        if (taken) {
            s().kv("rejected", "duplicateCode");
            throw new InvalidRequestException(
                    "Feature with code '" + code + "' already exists in project " + projectId);
        }
    }

    private static void recordInput(Long projectId, String code, String name, String description) {
        s().f("input")
           .kv("projectId", projectId)
           .kv("code", code)
           .kv("name", name)
           .kv("descriptionLength", description != null ? description.length() : null);
    }

    private Response toResponse(FeatureEntity entity) {
        return Response.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .projectId(entity.getProject() != null ? entity.getProject().getId() : null)
                .projectName(entity.getProject() != null ? entity.getProject().getName() : null)
                .build();
    }
}
