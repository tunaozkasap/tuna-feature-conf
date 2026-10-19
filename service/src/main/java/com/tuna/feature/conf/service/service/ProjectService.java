package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.ProjectDto;
import com.tuna.feature.conf.model.dto.ProjectDto.CreateRequest;
import com.tuna.feature.conf.model.dto.ProjectDto.Response;
import com.tuna.feature.conf.model.dto.ProjectDto.UpdateRequest;
import com.tuna.feature.conf.persistence.entity.ProjectEntity;
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
public class ProjectService {

    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        try (var search = s().parent("searchProjects")) {
            Specification<ProjectEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
            Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

            Page<ProjectEntity> page = (spec != null)
                    ? projectRepository.findAll(spec, pageable)
                    : projectRepository.findAll(pageable);

            List<Response> items = new ArrayList<>(page.getNumberOfElements());
            List<Long> ids = new ArrayList<>(page.getNumberOfElements());
            for (ProjectEntity entity : page.getContent()) {
                items.add(toResponse(entity));
                ids.add(entity.getId());
            }
            s().kv("returnedIds", ids);

            return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
        }
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getProjectById(Long id) {
        try (var get = s().parent("getProject")) {
            s().kv("projectId", id);
            ProjectEntity project = projectRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("project", "id", id));
            s().kv("found", true);
            return CrudResponse.of(toResponse(project));
        }
    }

    public CrudResponse<Response> createProject(CrudRequest<CreateRequest> request) {
        try (var create = s().parent("createProject")) {
            CreateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new InvalidRequestException("project", "missingData");
            }
            recordInput(data.getName(), data.getDescription());

            ProjectEntity project = new ProjectEntity();
            project.setName(data.getName());
            project.setDescription(data.getDescription());

            ProjectEntity saved = projectRepository.save(project);
            s().kv("savedId", saved.getId()).kv("result", "created");
            return CrudResponse.of(toResponse(saved), "Project created successfully");
        }
    }

    public CrudResponse<Response> updateProject(Long id, CrudRequest<UpdateRequest> request) {
        try (var update = s().parent("updateProject")) {
            s().kv("projectId", id);
            UpdateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new InvalidRequestException("project", "missingData");
            }
            recordInput(data.getName(), data.getDescription());

            ProjectEntity project = projectRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("project", "id", id));
            s().kv("found", true);

            // Full replacement: both fields are overwritten, also with null
            project.setName(data.getName());
            project.setDescription(data.getDescription());

            ProjectEntity saved = projectRepository.save(project);
            s().kv("savedId", saved.getId()).kv("result", "updated");
            return CrudResponse.of(toResponse(saved), "Project updated successfully");
        }
    }

    public CrudResponse<Void> deleteProject(Long id) {
        try (var delete = s().parent("deleteProject")) {
            s().kv("projectId", id);
            if (!projectRepository.existsById(id)) {
                s().kv("found", false);
                throw new ResourceNotFoundException("project", "id", id);
            }
            s().kv("found", true);
            projectRepository.deleteById(id);
            s().kv("result", "deleted");
            return CrudResponse.<Void>builder()
                    .success(true)
                    .message("Project deleted successfully")
                    .build();
        }
    }

    private static void recordInput(String name, String description) {
        s().f("input")
           .kv("name", name)
           .kv("descriptionLength", description != null ? description.length() : null);
    }

    private Response toResponse(ProjectEntity entity) {
        return Response.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .build();
    }
}
