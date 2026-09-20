package com.tuna.feature.conf.service.controller;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.FeatureRuleDto.CreateRequest;
import com.tuna.feature.conf.model.dto.FeatureRuleDto.Response;
import com.tuna.feature.conf.model.dto.FeatureRuleDto.UpdateRequest;
import com.tuna.feature.conf.model.vo.FilterOperator;
import com.tuna.feature.conf.model.vo.FilterVo;
import com.tuna.feature.conf.service.service.FeatureRuleService;
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

@Tag(name = "Feature Rule Management", description = "Endpoints for searching, creating, updating, and deleting feature rules")
@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
public class FeatureRuleController {

    private final FeatureRuleService ruleService;

    @Operation(summary = "Search rules", description = "Searches feature rules with filtering, sorting, and pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved rule search results")
    })
    @PostMapping("/search")
    public ResponseEntity<CrudResponse<Response>> searchRules(@RequestBody(required = false) CrudRequest<?> request) {
        CrudRequest<?> req = (request != null) ? request : new CrudRequest<>();
        return ResponseEntity.ok(ruleService.search(req));
    }

    @Operation(summary = "Get all rules", description = "Retrieves rules, optionally filtered by feature ID and/or project ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of rules")
    })
    @GetMapping
    public ResponseEntity<CrudResponse<Response>> getAllRules(
            @Parameter(description = "Optional feature ID to filter rules", example = "1")
            @RequestParam(required = false) Long featureId,
            @Parameter(description = "Optional project ID to filter rules", example = "1")
            @RequestParam(required = false) Long projectId
    ) {
        CrudRequest<?> req = new CrudRequest<>();
        List<FilterVo> filters = new ArrayList<>();
        if (featureId != null) {
            filters.add(FilterVo.builder()
                    .field("feature.id")
                    .operator(FilterOperator.EQUALS)
                    .value(featureId)
                    .build());
        }
        if (projectId != null) {
            filters.add(FilterVo.builder()
                    .field("feature.project.id")
                    .operator(FilterOperator.EQUALS)
                    .value(projectId)
                    .build());
        }
        req.setFilters(filters);
        return ResponseEntity.ok(ruleService.search(req));
    }

    @Operation(summary = "Get rule by ID", description = "Retrieves feature rule details by its unique ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rule found and returned successfully"),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> getRuleById(
            @Parameter(description = "ID of the rule to retrieve", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ruleService.getRuleById(id));
    }

    @Operation(summary = "Create rule", description = "Creates a new feature rule")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Rule created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed")
    })
    @PostMapping
    public ResponseEntity<CrudResponse<Response>> createRule(@Valid @RequestBody CrudRequest<CreateRequest> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ruleService.createRule(request));
    }

    @Operation(summary = "Update rule", description = "Updates an existing feature rule by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rule updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed"),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> updateRule(
            @Parameter(description = "ID of the rule to update", required = true, example = "1")
            @PathVariable Long id,
            @Valid @RequestBody CrudRequest<UpdateRequest> request
    ) {
        return ResponseEntity.ok(ruleService.updateRule(id, request));
    }

    @Operation(summary = "Delete rule", description = "Deletes a feature rule by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rule deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Rule not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<CrudResponse<Void>> deleteRule(
            @Parameter(description = "ID of the rule to delete", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ruleService.deleteRule(id));
    }
}
