package com.tuna.feature.conf.service.seed;

import com.tuna.feature.conf.model.enums.FeatureQualifierValueType;

import java.util.List;

/**
 * The shape of {@code seed/demo-data.json}: projects with their environments, qualifiers and features, each feature
 * with its rules, plus users and products. Read with unknown fields rejected, so a typo in the file stops the startup
 * instead of being ignored.
 */
public record DemoData(String about, List<ProjectData> projects, List<UserData> users, List<ProductData> products) {

    public record ProjectData(String name, String description, List<EnvironmentData> environments,
                              List<QualifierData> qualifiers, List<FeatureData> features) {
    }

    public record EnvironmentData(String code, String name, String description) {
    }

    public record QualifierData(String code, String name, String description, FeatureQualifierValueType valueType,
                                Integer priority) {
    }

    public record FeatureData(String code, String name, String description, List<RuleData> rules) {
    }

    /**
     * {@code environment} and {@code qualifier} are codes from the same project. {@code effectiveFrom} and
     * {@code effectiveTo} are relative to the startup ({@code now}, {@code now+7d}, {@code now-3h}) or ISO instants.
     */
    public record RuleData(String environment, String qualifier, String qualifierValue, String featureValue,
                           Integer priority, Boolean enabled, String effectiveFrom, String effectiveTo,
                           String description) {
    }

    public record UserData(String username, String email) {
    }

    public record ProductData(String name, Double price) {
    }
}
