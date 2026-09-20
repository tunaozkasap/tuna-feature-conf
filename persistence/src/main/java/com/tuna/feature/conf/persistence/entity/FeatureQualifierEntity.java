package com.tuna.feature.conf.persistence.entity;

import com.tuna.feature.conf.model.enums.FeatureQualifierValueType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * Represents a targeting qualifier or context dimension used to evaluate dynamic feature configurations.
 * <p>
 * Qualifiers define attributes (e.g., USER_ID, COUNTRY, APP_VERSION) with an evaluation priority
 * and a specific {@link FeatureQualifierValueType} scoped under a {@link ProjectEntity}.
 */
@Getter
@Setter
@FieldNameConstants
@Entity
@Table(name = "feature_qualifiers")
public class FeatureQualifierEntity {

    /**
     * Unique identifier for the feature qualifier.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique identifier/code for the qualifier parameter (e.g., "USER_ID", "COUNTRY", "VERSION").
     */
    private String code;

    /**
     * Human-readable name of the qualifier.
     */
    private String name;

    /**
     * Description of the qualifier rule or dimension.
     */
    private String description;

    /**
     * Precedence/evaluation order when resolving feature configuration overrides.
     */
    private Integer priority;

    /**
     * The data type of the qualifier value (e.g., NUMERIC, BOOLEAN, TEXT, JSON).
     */
    @Enumerated(EnumType.STRING)
    private FeatureQualifierValueType valueType;

    /**
     * The project that this qualifier definition belongs to.
     */
    @ManyToOne
    @JoinColumn(name = "project_id")
    private ProjectEntity project;
}
