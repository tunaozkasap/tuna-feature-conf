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

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class FeatureService {

    private final FeatureRepository featureRepository;
    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        Specification<FeatureEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
        Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

        Page<FeatureEntity> page = (spec != null)
                ? featureRepository.findAll(spec, pageable)
                : featureRepository.findAll(pageable);

        List<Response> items = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getFeatureById(Long id) {
        FeatureEntity feature = featureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feature", "id", id));
        return CrudResponse.of(toResponse(feature));
    }

    public CrudResponse<Response> createFeature(CrudRequest<CreateRequest> request) {
        CreateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("Feature payload data is required");
        }

        ProjectEntity project = projectRepository.findById(data.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", data.getProjectId()));

        String code = data.getCode().trim().toUpperCase();
        ensureCodeIsAvailable(project.getId(), code);

        FeatureEntity feature = new FeatureEntity();
        feature.setCode(code);
        feature.setName(data.getName());
        feature.setDescription(data.getDescription());
        feature.setProject(project);

        FeatureEntity saved = featureRepository.save(feature);
        return CrudResponse.of(toResponse(saved), "Feature created successfully");
    }

    public CrudResponse<Response> updateFeature(Long id, CrudRequest<UpdateRequest> request) {
        UpdateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("Feature payload data is required");
        }

        FeatureEntity feature = featureRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feature", "id", id));

        Long projectId = feature.getProject() != null ? feature.getProject().getId() : null;
        if (data.getProjectId() != null && !Objects.equals(data.getProjectId(), projectId)) {
            throw new InvalidRequestException(
                    "A feature cannot be moved to another project; its rules depend on the project's environments and qualifiers");
        }
        if (data.getCode() != null && !data.getCode().isBlank()) {
            String code = data.getCode().trim().toUpperCase();
            if (!code.equals(feature.getCode())) {
                ensureCodeIsAvailable(projectId, code);
                feature.setCode(code);
            }
        }
        if (data.getName() != null && !data.getName().isBlank()) {
            feature.setName(data.getName());
        }
        if (data.getDescription() != null) {
            feature.setDescription(data.getDescription());
        }

        FeatureEntity saved = featureRepository.save(feature);
        return CrudResponse.of(toResponse(saved), "Feature updated successfully");
    }

    public CrudResponse<Void> deleteFeature(Long id) {
        if (!featureRepository.existsById(id)) {
            throw new ResourceNotFoundException("Feature", "id", id);
        }
        featureRepository.deleteById(id);
        return CrudResponse.<Void>builder()
                .success(true)
                .message("Feature deleted successfully")
                .build();
    }

    private void ensureCodeIsAvailable(Long projectId, String code) {
        if (featureRepository.existsByProjectIdAndCode(projectId, code)) {
            throw new InvalidRequestException(
                    "Feature with code '" + code + "' already exists in project " + projectId);
        }
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
