package com.tuna.feature.conf.persistence.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldNameConstants;

/**
 * Represents a configurable feature or toggle definition.
 * <p>
 * Each feature belongs to a specific {@link ProjectEntity} and is identified
 * by a unique code within that project's scope.
 */
@Getter
@Setter
@FieldNameConstants
@Entity
@Table(name = "features")
public class FeatureEntity {

    /**
     * Unique identifier for the feature.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique code/key identifying the feature flag (e.g., "DARK_MODE",
     * "NEW_CHECKOUT_FLOW").
     */
    private String code;

    /**
     * Human-readable name of the feature.
     */
    private String name;

    /**
     * Detailed description of the feature toggle and its intended behavior.
     */
    private String description;

    /**
     * The project that this feature flag belongs to.
     */
    @ManyToOne
    @JoinColumn(name = "project_id")
    private ProjectEntity project;
}
