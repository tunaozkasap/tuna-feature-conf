package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto.CreateRequest;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto.Response;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto.UpdateRequest;
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

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class FeatureQualifierService {

    private final FeatureQualifierRepository qualifierRepository;
    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        Specification<FeatureQualifierEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
        Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

        Page<FeatureQualifierEntity> page = (spec != null)
                ? qualifierRepository.findAll(spec, pageable)
                : qualifierRepository.findAll(pageable);

        List<Response> items = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getQualifierById(Long id) {
        FeatureQualifierEntity entity = qualifierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FeatureQualifier", "id", id));
        return CrudResponse.of(toResponse(entity));
    }

    public CrudResponse<Response> createQualifier(CrudRequest<CreateRequest> request) {
        CreateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("FeatureQualifier payload data is required");
        }

        ProjectEntity project = projectRepository.findById(data.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", data.getProjectId()));

        String code = data.getCode().trim().toUpperCase();
        ensureCodeIsAvailable(project.getId(), code);

        FeatureQualifierEntity entity = new FeatureQualifierEntity();
        entity.setCode(code);
        entity.setName(data.getName());
        entity.setDescription(data.getDescription());
        entity.setPriority(data.getPriority() != null ? data.getPriority() : 0);
        entity.setValueType(data.getValueType());
        entity.setProject(project);

        FeatureQualifierEntity saved = qualifierRepository.save(entity);
        return CrudResponse.of(toResponse(saved), "FeatureQualifier created successfully");
    }

    public CrudResponse<Response> updateQualifier(Long id, CrudRequest<UpdateRequest> request) {
        UpdateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("FeatureQualifier payload data is required");
        }

        FeatureQualifierEntity entity = qualifierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FeatureQualifier", "id", id));

        Long projectId = entity.getProject() != null ? entity.getProject().getId() : null;
        if (data.getProjectId() != null && !Objects.equals(data.getProjectId(), projectId)) {
            throw new InvalidRequestException(
                    "A qualifier cannot be moved to another project; rules in its project depend on it");
        }
        if (data.getCode() != null && !data.getCode().isBlank()) {
            String code = data.getCode().trim().toUpperCase();
            if (!code.equals(entity.getCode())) {
                ensureCodeIsAvailable(projectId, code);
                entity.setCode(code);
            }
        }
        if (data.getName() != null && !data.getName().isBlank()) {
            entity.setName(data.getName());
        }
        if (data.getDescription() != null) {
            entity.setDescription(data.getDescription());
        }
        if (data.getPriority() != null) {
            entity.setPriority(data.getPriority());
        }
        if (data.getValueType() != null) {
            entity.setValueType(data.getValueType());
        }

        FeatureQualifierEntity saved = qualifierRepository.save(entity);
        return CrudResponse.of(toResponse(saved), "FeatureQualifier updated successfully");
    }

    public CrudResponse<Void> deleteQualifier(Long id) {
        if (!qualifierRepository.existsById(id)) {
            throw new ResourceNotFoundException("FeatureQualifier", "id", id);
        }
        qualifierRepository.deleteById(id);
        return CrudResponse.<Void>builder()
                .success(true)
                .message("FeatureQualifier deleted successfully")
                .build();
    }

    private void ensureCodeIsAvailable(Long projectId, String code) {
        if (qualifierRepository.existsByProjectIdAndCode(projectId, code)) {
            throw new InvalidRequestException(
                    "Qualifier with code '" + code + "' already exists in project " + projectId);
        }
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
