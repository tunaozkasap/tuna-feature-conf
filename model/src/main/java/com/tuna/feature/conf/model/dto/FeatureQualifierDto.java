package com.tuna.feature.conf.model.dto;

import com.tuna.feature.conf.model.enums.FeatureQualifierValueType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class FeatureQualifierDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Qualifier code is required")
        private String code;

        @NotBlank(message = "Qualifier name is required")
        private String name;

        private String description;

        private Integer priority;

        @NotNull(message = "Value type is required")
        private FeatureQualifierValueType valueType;

        @NotNull(message = "Project ID is required")
        private Long projectId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String code;
        private String name;
        private String description;
        private Integer priority;
        private FeatureQualifierValueType valueType;
        private Long projectId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String code;
        private String name;
        private String description;
        private Integer priority;
        private FeatureQualifierValueType valueType;
        private Long projectId;
        private String projectName;
    }
}
