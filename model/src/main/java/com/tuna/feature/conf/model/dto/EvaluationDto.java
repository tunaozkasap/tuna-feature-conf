package com.tuna.feature.conf.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EvaluationDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        private String featureCode;
        private Long projectId;
        @Builder.Default
        private Map<String, String> requestContext = new HashMap<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private String featureCode;
        private String featureName;
        private String resolvedValue;
        private String source;
        private Long matchingRuleId;
        private String matchingQualifierCode;
        @Builder.Default
        private List<String> logs = new ArrayList<>();
    }
}
