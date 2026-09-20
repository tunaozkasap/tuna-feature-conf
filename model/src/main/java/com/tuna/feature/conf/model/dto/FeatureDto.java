package com.tuna.feature.conf.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class FeatureDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Feature code is required")
        private String code;

        @NotBlank(message = "Feature name is required")
        private String name;

        private String description;

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
        private Long projectId;
        private String projectName;
    }
}
