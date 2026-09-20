package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.ProjectDto;
import com.tuna.feature.conf.model.dto.ProjectDto.CreateRequest;
import com.tuna.feature.conf.model.dto.ProjectDto.Response;
import com.tuna.feature.conf.model.dto.ProjectDto.UpdateRequest;
import com.tuna.feature.conf.persistence.entity.ProjectEntity;
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
public class ProjectService {

    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        Specification<ProjectEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
        Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

        Page<ProjectEntity> page = (spec != null)
                ? projectRepository.findAll(spec, pageable)
                : projectRepository.findAll(pageable);

        List<Response> items = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getProjectById(Long id) {
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", id));
        return CrudResponse.of(toResponse(project));
    }

    public CrudResponse<Response> createProject(CrudRequest<CreateRequest> request) {
        CreateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("Project payload data is required");
        }

        ProjectEntity project = new ProjectEntity();
        project.setName(data.getName());
        project.setDescription(data.getDescription());

        ProjectEntity saved = projectRepository.save(project);
        return CrudResponse.of(toResponse(saved), "Project created successfully");
    }

    public CrudResponse<Response> updateProject(Long id, CrudRequest<UpdateRequest> request) {
        UpdateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("Project payload data is required");
        }

        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", id));

        project.setName(data.getName());
        project.setDescription(data.getDescription());

        ProjectEntity saved = projectRepository.save(project);
        return CrudResponse.of(toResponse(saved), "Project updated successfully");
    }

    public CrudResponse<Void> deleteProject(Long id) {
        if (!projectRepository.existsById(id)) {
            throw new ResourceNotFoundException("Project", "id", id);
        }
        projectRepository.deleteById(id);
        return CrudResponse.<Void>builder()
                .success(true)
                .message("Project deleted successfully")
                .build();
    }

    private Response toResponse(ProjectEntity entity) {
        return Response.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .build();
    }
}
