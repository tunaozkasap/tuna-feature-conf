package com.tuna.feature.conf.persistence.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldNameConstants;

/**
 * Represents a project or tenant workspace within the feature configuration system.
 * <p>
 * Serves as the top-level boundary for scoping {@link FeatureEntity} definitions
 * and {@link FeatureQualifierEntity} targeting dimensions.
 */
@Getter
@Setter
@FieldNameConstants
@Entity
@Table(name = "projects")
public class ProjectEntity {

    /**
     * Unique identifier for the project.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Display name of the project.
     */
    private String name;

    /**
     * Detailed description of the project and its scope.
     */
    private String description;
}
