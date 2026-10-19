package com.tuna.feature.conf.service.controller;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.EnvironmentDto.CreateRequest;
import com.tuna.feature.conf.model.dto.EnvironmentDto.Response;
import com.tuna.feature.conf.model.dto.EnvironmentDto.UpdateRequest;
import com.tuna.feature.conf.model.vo.FilterOperator;
import com.tuna.feature.conf.model.vo.FilterVo;
import com.tuna.feature.conf.service.service.EnvironmentService;
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

import java.util.ArrayList;
import java.util.List;

@Tag(name = "Environment Management", description = "Endpoints for searching, creating, updating, and deleting project environments")
@RestController
@RequestMapping("/api/environments")
@RequiredArgsConstructor
public class EnvironmentController {

    private final EnvironmentService environmentService;

    @Operation(summary = "Search environments", description = "Searches environments with filtering, sorting, and pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved environment search results")
    })
    @PostMapping("/search")
    public ResponseEntity<CrudResponse<Response>> searchEnvironments(@RequestBody(required = false) CrudRequest<?> request) {
        CrudRequest<?> req = (request != null) ? request : new CrudRequest<>();
        return ResponseEntity.ok(environmentService.search(req));
    }

    @Operation(summary = "Get all environments", description = "Retrieves environments, optionally filtered by project ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of environments")
    })
    @GetMapping
    public ResponseEntity<CrudResponse<Response>> getAllEnvironments(
            @Parameter(description = "Optional project ID to filter environments", example = "1")
            @RequestParam(required = false) Long projectId
    ) {
        CrudRequest<?> req = new CrudRequest<>();
        if (projectId != null) {
            req.setFilters(new ArrayList<>(List.of(
                    FilterVo.builder()
                            .field("project.id")
                            .operator(FilterOperator.EQUALS)
                            .value(projectId)
                            .build()
            )));
        }
        return ResponseEntity.ok(environmentService.search(req));
    }

    @Operation(summary = "Get environment by ID", description = "Retrieves environment details by its unique ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Environment found and returned successfully"),
            @ApiResponse(responseCode = "404", description = "Environment not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> getEnvironmentById(
            @Parameter(description = "ID of the environment to retrieve", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(environmentService.getEnvironmentById(id));
    }

    @Operation(summary = "Create environment", description = "Creates a new environment within a project")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Environment created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload, validation failed, or code already in use")
    })
    @PostMapping
    public ResponseEntity<CrudResponse<Response>> createEnvironment(@Valid @RequestBody CrudRequest<CreateRequest> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(environmentService.createEnvironment(request));
    }

    @Operation(summary = "Update environment", description = "Updates an existing environment by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Environment updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload, validation failed, or code already in use"),
            @ApiResponse(responseCode = "404", description = "Environment not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> updateEnvironment(
            @Parameter(description = "ID of the environment to update", required = true, example = "1")
            @PathVariable Long id,
            @Valid @RequestBody CrudRequest<UpdateRequest> request
    ) {
        return ResponseEntity.ok(environmentService.updateEnvironment(id, request));
    }

    @Operation(summary = "Delete environment", description = "Deletes an environment by its ID; fails if it still has feature rules")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Environment deleted successfully"),
            @ApiResponse(responseCode = "400", description = "Environment still has feature rules"),
            @ApiResponse(responseCode = "404", description = "Environment not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<CrudResponse<Void>> deleteEnvironment(
            @Parameter(description = "ID of the environment to delete", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(environmentService.deleteEnvironment(id));
    }
}
