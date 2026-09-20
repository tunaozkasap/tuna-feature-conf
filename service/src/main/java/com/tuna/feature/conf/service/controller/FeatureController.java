package com.tuna.feature.conf.service.controller;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.FeatureDto.CreateRequest;
import com.tuna.feature.conf.model.dto.FeatureDto.Response;
import com.tuna.feature.conf.model.dto.FeatureDto.UpdateRequest;
import com.tuna.feature.conf.model.vo.FilterOperator;
import com.tuna.feature.conf.model.vo.FilterVo;
import com.tuna.feature.conf.service.service.FeatureService;
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

@Tag(name = "Feature Management", description = "Endpoints for searching, creating, updating, and deleting feature flags")
@RestController
@RequestMapping("/api/features")
@RequiredArgsConstructor
public class FeatureController {

    private final FeatureService featureService;

    @Operation(summary = "Search features", description = "Searches features with filtering, sorting, and pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved feature search results")
    })
    @PostMapping("/search")
    public ResponseEntity<CrudResponse<Response>> searchFeatures(@RequestBody(required = false) CrudRequest<?> request) {
        CrudRequest<?> req = (request != null) ? request : new CrudRequest<>();
        return ResponseEntity.ok(featureService.search(req));
    }

    @Operation(summary = "Get all features", description = "Retrieves features, optionally filtered by project ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of features")
    })
    @GetMapping
    public ResponseEntity<CrudResponse<Response>> getAllFeatures(
            @Parameter(description = "Optional project ID to filter features", example = "1")
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
        return ResponseEntity.ok(featureService.search(req));
    }

    @Operation(summary = "Get feature by ID", description = "Retrieves feature flag details by its unique ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Feature found and returned successfully"),
            @ApiResponse(responseCode = "404", description = "Feature not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> getFeatureById(
            @Parameter(description = "ID of the feature to retrieve", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(featureService.getFeatureById(id));
    }

    @Operation(summary = "Create feature", description = "Creates a new feature flag")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Feature created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed")
    })
    @PostMapping
    public ResponseEntity<CrudResponse<Response>> createFeature(@Valid @RequestBody CrudRequest<CreateRequest> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(featureService.createFeature(request));
    }

    @Operation(summary = "Update feature", description = "Updates an existing feature flag by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Feature updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed"),
            @ApiResponse(responseCode = "404", description = "Feature not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> updateFeature(
            @Parameter(description = "ID of the feature to update", required = true, example = "1")
            @PathVariable Long id,
            @Valid @RequestBody CrudRequest<UpdateRequest> request
    ) {
        return ResponseEntity.ok(featureService.updateFeature(id, request));
    }

    @Operation(summary = "Delete feature", description = "Deletes a feature flag by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Feature deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Feature not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<CrudResponse<Void>> deleteFeature(
            @Parameter(description = "ID of the feature to delete", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(featureService.deleteFeature(id));
    }
}
