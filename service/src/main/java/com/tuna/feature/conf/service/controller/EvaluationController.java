package com.tuna.feature.conf.service.controller;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.EvaluationDto.Request;
import com.tuna.feature.conf.model.dto.EvaluationDto.Response;
import com.tuna.feature.conf.service.service.EvaluationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Feature Evaluation", description = "Endpoints for real-time feature flag evaluation")
@RestController
@RequestMapping("/api/evaluations")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;

    @Operation(summary = "Evaluate feature", description = "Evaluates feature flag status and resolved values based on user and contextual attributes")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Feature evaluated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or evaluation failed"),
            @ApiResponse(responseCode = "404", description = "Feature flag not found")
    })
    @PostMapping("/evaluate")
    public ResponseEntity<CrudResponse<Response>> evaluateFeature(@RequestBody CrudRequest<Request> request) {
        return ResponseEntity.ok(evaluationService.evaluateFeature(request));
    }
}
