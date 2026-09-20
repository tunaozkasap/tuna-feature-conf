package com.tuna.feature.conf.service.controller;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto.CreateRequest;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto.Response;
import com.tuna.feature.conf.model.dto.FeatureQualifierDto.UpdateRequest;
import com.tuna.feature.conf.model.vo.FilterOperator;
import com.tuna.feature.conf.model.vo.FilterVo;
import com.tuna.feature.conf.model.vo.SortDirection;
import com.tuna.feature.conf.model.vo.SortVo;
import com.tuna.feature.conf.service.service.FeatureQualifierService;
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

@Tag(name = "Feature Qualifier Management", description = "Endpoints for searching, creating, updating, and deleting feature qualifiers")
@RestController
@RequestMapping("/api/qualifiers")
@RequiredArgsConstructor
public class FeatureQualifierController {

    private final FeatureQualifierService qualifierService;

    @Operation(summary = "Search qualifiers", description = "Searches feature qualifiers with filtering, sorting, and pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved qualifier search results")
    })
    @PostMapping("/search")
    public ResponseEntity<CrudResponse<Response>> searchQualifiers(@RequestBody(required = false) CrudRequest<?> request) {
        CrudRequest<?> req = (request != null) ? request : new CrudRequest<>();
        return ResponseEntity.ok(qualifierService.search(req));
    }

    @Operation(summary = "Get all qualifiers", description = "Retrieves qualifiers ordered by priority descending, optionally filtered by project ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of qualifiers")
    })
    @GetMapping
    public ResponseEntity<CrudResponse<Response>> getAllQualifiers(
            @Parameter(description = "Optional project ID to filter qualifiers", example = "1")
            @RequestParam(required = false) Long projectId
    ) {
        CrudRequest<?> req = new CrudRequest<>();
        req.setSorts(new ArrayList<>(List.of(
                SortVo.builder().field("priority").direction(SortDirection.DESC).build()
        )));
        if (projectId != null) {
            req.setFilters(new ArrayList<>(List.of(
                    FilterVo.builder()
                            .field("project.id")
                            .operator(FilterOperator.EQUALS)
                            .value(projectId)
                            .build()
            )));
        }
        return ResponseEntity.ok(qualifierService.search(req));
    }

    @Operation(summary = "Get qualifier by ID", description = "Retrieves feature qualifier details by its unique ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Qualifier found and returned successfully"),
            @ApiResponse(responseCode = "404", description = "Qualifier not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> getQualifierById(
            @Parameter(description = "ID of the qualifier to retrieve", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(qualifierService.getQualifierById(id));
    }

    @Operation(summary = "Create qualifier", description = "Creates a new feature qualifier")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Qualifier created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed")
    })
    @PostMapping
    public ResponseEntity<CrudResponse<Response>> createQualifier(@Valid @RequestBody CrudRequest<CreateRequest> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(qualifierService.createQualifier(request));
    }

    @Operation(summary = "Update qualifier", description = "Updates an existing feature qualifier by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Qualifier updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed"),
            @ApiResponse(responseCode = "404", description = "Qualifier not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> updateQualifier(
            @Parameter(description = "ID of the qualifier to update", required = true, example = "1")
            @PathVariable Long id,
            @Valid @RequestBody CrudRequest<UpdateRequest> request
    ) {
        return ResponseEntity.ok(qualifierService.updateQualifier(id, request));
    }

    @Operation(summary = "Delete qualifier", description = "Deletes a feature qualifier by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Qualifier deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Qualifier not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<CrudResponse<Void>> deleteQualifier(
            @Parameter(description = "ID of the qualifier to delete", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(qualifierService.deleteQualifier(id));
    }
}
