package com.tuna.feature.conf.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldNameConstants;

/**
 * Represents a deployment environment (e.g., DEV, STAGING, PROD) within a {@link ProjectEntity}.
 * <p>
 * Feature definitions are shared across all environments of a project, while
 * {@link FeatureRuleEntity} configurations are scoped to a single environment so that
 * the same feature can resolve differently in each one.
 */
@Getter
@Setter
@FieldNameConstants
@Entity
@Table(name = "environments",
        uniqueConstraints = @UniqueConstraint(name = "uk_environments_project_code", columnNames = {"project_id", "code"}))
public class EnvironmentEntity {

    /**
     * Unique identifier for the environment.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique code of the environment within its project (e.g., "DEV", "STAGING", "PROD").
     */
    @Column(nullable = false, length = 64)
    private String code;

    /**
     * Human-readable name of the environment.
     */
    @Column(nullable = false)
    private String name;

    /**
     * Description of the environment and its purpose.
     */
    private String description;

    /**
     * The project that this environment belongs to.
     */
    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;
}
