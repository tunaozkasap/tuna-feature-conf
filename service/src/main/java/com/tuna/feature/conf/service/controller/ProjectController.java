package com.tuna.feature.conf.service.controller;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.ProjectDto.CreateRequest;
import com.tuna.feature.conf.model.dto.ProjectDto.Response;
import com.tuna.feature.conf.model.dto.ProjectDto.UpdateRequest;
import com.tuna.feature.conf.service.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Project Management", description = "Endpoints for searching, creating, updating, and deleting projects")
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @Operation(summary = "Search projects", description = "Searches projects with filtering, sorting, and pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved project search results")
    })
    @PostMapping("/search")
    public ResponseEntity<CrudResponse<Response>> searchProjects(@RequestBody(required = false) CrudRequest<?> request) {
        CrudRequest<?> req = (request != null) ? request : new CrudRequest<>();
        return ResponseEntity.ok(projectService.search(req));
    }

    @Operation(summary = "Get all projects", description = "Retrieves a paginated list of all projects")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of projects")
    })
    @GetMapping
    public ResponseEntity<CrudResponse<Response>> getAllProjects() {
        return ResponseEntity.ok(projectService.search(new CrudRequest<>()));
    }

    @Operation(summary = "Get project by ID", description = "Retrieves project details by its unique ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Project found and returned successfully"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> getProjectById(
            @Parameter(description = "ID of the project to retrieve", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    @Operation(summary = "Create project", description = "Creates a new project record")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Project created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed")
    })
    @PostMapping
    public ResponseEntity<CrudResponse<Response>> createProject(@Valid @RequestBody CrudRequest<CreateRequest> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.createProject(request));
    }

    @Operation(summary = "Update project", description = "Updates an existing project by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Project updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> updateProject(
            @Parameter(description = "ID of the project to update", required = true, example = "1")
            @PathVariable Long id,
            @Valid @RequestBody CrudRequest<UpdateRequest> request
    ) {
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }

    @Operation(summary = "Delete project", description = "Deletes a project by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Project deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Project not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<CrudResponse<Void>> deleteProject(
            @Parameter(description = "ID of the project to delete", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(projectService.deleteProject(id));
    }
}
