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

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

@Service
@RequiredArgsConstructor
@Transactional
public class EnvironmentService {

    private final EnvironmentRepository environmentRepository;
    private final ProjectRepository projectRepository;
    private final FeatureRuleRepository ruleRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        try (var search = s().parent("searchEnvironments")) {
            Specification<EnvironmentEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
            Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

            Page<EnvironmentEntity> page = (spec != null)
                    ? environmentRepository.findAll(spec, pageable)
                    : environmentRepository.findAll(pageable);

            List<Response> items = new ArrayList<>(page.getNumberOfElements());
            List<Long> ids = new ArrayList<>(page.getNumberOfElements());
            for (EnvironmentEntity entity : page.getContent()) {
                items.add(toResponse(entity));
                ids.add(entity.getId());
            }
            s().kv("returnedIds", ids);

            return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
        }
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getEnvironmentById(Long id) {
        try (var get = s().parent("getEnvironment")) {
            s().kv("environmentId", id);
            EnvironmentEntity entity = environmentRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("environment", "id", id));
            s().kv("found", true).kv("code", entity.getCode());
            return CrudResponse.of(toResponse(entity));
        }
    }

    public CrudResponse<Response> createEnvironment(CrudRequest<CreateRequest> request) {
        try (var create = s().parent("createEnvironment")) {
            CreateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new InvalidRequestException("environment", "missingData");
            }
            recordInput(data.getProjectId(), data.getCode(), data.getName(), data.getDescription());
            if (data.getCode() == null || data.getCode().isBlank()) {
                s().kv("rejected", "missingCode");
                throw new InvalidRequestException("environment", "missingCode");
            }

            ProjectEntity project = projectRepository.findById(data.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("project", "id", data.getProjectId()));
            s().kv("projectFound", true);

            String code = data.getCode().trim().toUpperCase();
            s().kv("normalizedCode", code);
            ensureCodeIsAvailable(project.getId(), code);

            EnvironmentEntity entity = new EnvironmentEntity();
            entity.setCode(code);
            entity.setName(data.getName());
            entity.setDescription(data.getDescription());
            entity.setProject(project);

            EnvironmentEntity saved = environmentRepository.save(entity);
            s().kv("savedId", saved.getId()).kv("result", "created");
            return CrudResponse.of(toResponse(saved), "Environment created successfully");
        }
    }

    public CrudResponse<Response> updateEnvironment(Long id, CrudRequest<UpdateRequest> request) {
        try (var update = s().parent("updateEnvironment")) {
            s().kv("environmentId", id);
            UpdateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new InvalidRequestException("environment", "missingData");
            }
            recordInput(null, data.getCode(), data.getName(), data.getDescription());

            EnvironmentEntity entity = environmentRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("environment", "id", id));
            s().kv("found", true).kv("currentCode", entity.getCode());

            List<String> changedFields = new ArrayList<>();
            if (data.getCode() != null && !data.getCode().isBlank()) {
                String code = data.getCode().trim().toUpperCase();
                if (!code.equals(entity.getCode())) {
                    ensureCodeIsAvailable(entity.getProject().getId(), code);
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
            s().kv("changedFields", changedFields);

            EnvironmentEntity saved = environmentRepository.save(entity);
            s().kv("savedId", saved.getId()).kv("result", "updated");
            return CrudResponse.of(toResponse(saved), "Environment updated successfully");
        }
    }

    public CrudResponse<Void> deleteEnvironment(Long id) {
        try (var delete = s().parent("deleteEnvironment")) {
            s().kv("environmentId", id);
            if (!environmentRepository.existsById(id)) {
                s().kv("found", false);
                throw new ResourceNotFoundException("environment", "id", id);
            }
            s().kv("found", true);
            boolean hasRules = ruleRepository.existsByEnvironmentId(id);
            s().kv("hasRules", hasRules);
            if (hasRules) {
                s().kv("rejected", "environmentInUse");
                throw new InvalidRequestException("environment", "inUse")
                        .with("environmentId", id);
            }
            environmentRepository.deleteById(id);
            s().kv("result", "deleted");
            return CrudResponse.<Void>builder()
                    .success(true)
                    .message("Environment deleted successfully")
                    .build();
        }
    }

    private void ensureCodeIsAvailable(Long projectId, String code) {
        boolean taken = environmentRepository.existsByProjectIdAndCode(projectId, code);
        s().f("codeCheck").kv("projectId", projectId).kv("code", code).kv("available", !taken);
        if (taken) {
            s().kv("rejected", "duplicateCode");
            throw new InvalidRequestException("environment", "duplicateCode")
                    .with("environmentCode", code)
                    .with("projectId", projectId);
        }
    }

    private static void recordInput(Long projectId, String code, String name, String description) {
        s().f("input")
           .kv("projectId", projectId)
           .kv("code", code)
           .kv("name", name)
           .kv("descriptionLength", description != null ? description.length() : null);
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
