package com.tuna.feature.conf.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

public class FeatureRuleDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotNull(message = "Feature ID is required")
        private Long featureId;

        @NotNull(message = "Qualifier ID is required")
        private Long qualifierId;

        @NotBlank(message = "Qualifier value is required")
        private String qualifierValue;

        @NotBlank(message = "Feature value is required")
        private String featureValue;

        private Integer priority;
        @Builder.Default
        private Boolean enabled = true;
        private Instant effectiveFrom;
        private Instant effectiveTo;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private Long featureId;
        private Long qualifierId;
        private String qualifierValue;
        private String featureValue;
        private Integer priority;
        private Boolean enabled;
        private Instant effectiveFrom;
        private Instant effectiveTo;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long featureId;
        private String featureCode;
        private String featureName;
        private Long qualifierId;
        private String qualifierCode;
        private String qualifierName;
        private Integer qualifierPriority;
        private String qualifierValue;
        private String featureValue;
        private Integer priority;
        private Boolean enabled;
        private Instant effectiveFrom;
        private Instant effectiveTo;
        private String description;
    }
}
