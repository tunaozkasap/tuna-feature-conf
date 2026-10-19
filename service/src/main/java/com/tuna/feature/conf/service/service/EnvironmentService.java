package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.EnvironmentDto.CreateRequest;
import com.tuna.feature.conf.model.dto.EnvironmentDto.Response;
import com.tuna.feature.conf.model.dto.EnvironmentDto.UpdateRequest;
import com.tuna.feature.conf.persistence.entity.EnvironmentEntity;
import com.tuna.feature.conf.persistence.entity.ProjectEntity;
import com.tuna.feature.conf.persistence.repository.EnvironmentRepository;
import com.tuna.feature.conf.persistence.repository.FeatureRuleRepository;
import com.tuna.feature.conf.persistence.repository.ProjectRepository;
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
public class EnvironmentService {

    private final EnvironmentRepository environmentRepository;
    private final ProjectRepository projectRepository;
    private final FeatureRuleRepository ruleRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        Specification<EnvironmentEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
        Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

        Page<EnvironmentEntity> page = (spec != null)
                ? environmentRepository.findAll(spec, pageable)
                : environmentRepository.findAll(pageable);

        List<Response> items = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getEnvironmentById(Long id) {
        EnvironmentEntity entity = environmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Environment", "id", id));
        return CrudResponse.of(toResponse(entity));
    }

    public CrudResponse<Response> createEnvironment(CrudRequest<CreateRequest> request) {
        CreateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("Environment payload data is required");
        }
        if (data.getCode() == null || data.getCode().isBlank()) {
            throw new IllegalArgumentException("Environment code is required");
        }

        ProjectEntity project = projectRepository.findById(data.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", data.getProjectId()));

        String code = data.getCode().trim().toUpperCase();
        ensureCodeIsAvailable(project.getId(), code);

        EnvironmentEntity entity = new EnvironmentEntity();
        entity.setCode(code);
        entity.setName(data.getName());
        entity.setDescription(data.getDescription());
        entity.setProject(project);

        EnvironmentEntity saved = environmentRepository.save(entity);
        return CrudResponse.of(toResponse(saved), "Environment created successfully");
    }

    public CrudResponse<Response> updateEnvironment(Long id, CrudRequest<UpdateRequest> request) {
        UpdateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("Environment payload data is required");
        }

        EnvironmentEntity entity = environmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Environment", "id", id));

        if (data.getCode() != null && !data.getCode().isBlank()) {
            String code = data.getCode().trim().toUpperCase();
            if (!code.equals(entity.getCode())) {
                ensureCodeIsAvailable(entity.getProject().getId(), code);
                entity.setCode(code);
            }
        }
        if (data.getName() != null && !data.getName().isBlank()) {
            entity.setName(data.getName());
        }
        if (data.getDescription() != null) {
            entity.setDescription(data.getDescription());
        }

        EnvironmentEntity saved = environmentRepository.save(entity);
        return CrudResponse.of(toResponse(saved), "Environment updated successfully");
    }

    public CrudResponse<Void> deleteEnvironment(Long id) {
        if (!environmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Environment", "id", id);
        }
        if (ruleRepository.existsByEnvironmentId(id)) {
            throw new IllegalArgumentException(
                    "Environment " + id + " still has feature rules; delete or move them first");
        }
        environmentRepository.deleteById(id);
        return CrudResponse.<Void>builder()
                .success(true)
                .message("Environment deleted successfully")
                .build();
    }

    private void ensureCodeIsAvailable(Long projectId, String code) {
        if (environmentRepository.existsByProjectIdAndCode(projectId, code)) {
            throw new IllegalArgumentException(
                    "Environment with code '" + code + "' already exists in project " + projectId);
        }
    }

    private Response toResponse(EnvironmentEntity entity) {
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
