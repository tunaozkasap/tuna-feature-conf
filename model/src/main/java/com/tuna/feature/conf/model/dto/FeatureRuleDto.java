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

        @NotNull(message = "Environment ID is required")
        private Long environmentId;

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
        private Long environmentId;
        private Long qualifierId;
        private String qualifierValue;
        private String featureValue;
        private Integer priority;
        private Boolean enabled;
        private Instant effectiveFrom;
        private Instant effectiveTo;
        private String description;
        /**
         * Empty fields are left unchanged, so a date can't be removed by leaving it out: true removes the start date
         * (the rule applies right away). Can't be combined with a new {@code effectiveFrom}.
         */
        private Boolean clearEffectiveFrom;
        /** true removes the end date (the rule never ends). Can't be combined with a new {@code effectiveTo}. */
        private Boolean clearEffectiveTo;
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
        private Long environmentId;
        private String environmentCode;
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
