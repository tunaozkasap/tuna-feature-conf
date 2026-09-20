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

import java.time.Instant;

/**
 * Represents a feature evaluation rule or configuration value that binds a
 * {@link FeatureEntity}
 * to a {@link FeatureQualifierEntity}.
 * <p>
 * This entity defines what value the feature should resolve to when a request
 * matches a specific
 * real-time qualifier value (e.g., user segment, user ID, agreement number,
 * request channel).
 */
@Getter
@Setter
@FieldNameConstants
@Entity
@Table(name = "feature_rules")
public class FeatureRuleEntity {

    /**
     * Unique identifier for the feature rule.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The feature being configured or evaluated.
     */
    @ManyToOne
    @JoinColumn(name = "feature_id")
    private FeatureEntity feature;

    /**
     * The qualifier/dimension used to evaluate this rule (e.g., USER_ID,
     * USER_SEGMENT, CHANNEL).
     */
    @ManyToOne
    @JoinColumn(name = "qualifier_id")
    private FeatureQualifierEntity qualifier;

    /**
     * The expected value of the qualifier to match against real-time request
     * context
     * (e.g., "VIP", "PREMIUM", "MOBILE", "1001").
     * <p>
     * This value is used as part of an if statement during feature evaluation.
     * Example: "if (request.getQualifierValue(qualifier) == qualifierValue)"
     */
    private String qualifierValue;

    /**
     * The resolved value that the feature will return when this qualifier condition
     * is met
     * (e.g., "true", "variant-B", "50", "{\"discount\": 0.15}").
     */
    private String featureValue;

    /**
     * Optional rule-specific priority or execution order when resolving conflicting
     * matches.
     * Higher priority rules are evaluated first.
     */
    private Integer priority;

    /**
     * Flag indicating whether this rule is currently enabled/active.
     */
    private Boolean enabled;

    /**
     * Optional start timestamp from which this rule is effective and visible
     * (inclusive).
     * If null, there is no restriction from the beginning date.
     */
    private Instant effectiveFrom;

    /**
     * Optional end timestamp until which this rule is effective and visible
     * (inclusive).
     * If null, there is no restriction for the ending date.
     */
    private Instant effectiveTo;

    /**
     * Optional description or notes explaining the purpose of this rule.
     */
    private String description;

    /**
     * Checks whether this rule is currently effective and visible at the specified
     * timestamp.
     * <p>
     * A rule is only visible if:
     * <ul>
     * <li>It is enabled ({@link #getEnabled()} is {@code true})</li>
     * <li>The timestamp is on or after {@link #getEffectiveFrom()} (or
     * {@code effectiveFrom} is null)</li>
     * <li>The timestamp is on or before {@link #getEffectiveTo()} (or
     * {@code effectiveTo} is null)</li>
     * </ul>
     *
     * @param timestamp the instant to check against (defaults to
     *                  {@link Instant#now()} if null)
     * @return {@code true} if visible and effective, {@code false} otherwise
     */
    public boolean isEffective(Instant timestamp) {
        if (!Boolean.TRUE.equals(this.enabled)) {
            return false;
        }
        Instant target = (timestamp != null) ? timestamp : Instant.now();
        if (this.effectiveFrom != null && target.isBefore(this.effectiveFrom)) {
            return false;
        }
        if (this.effectiveTo != null && target.isAfter(this.effectiveTo)) {
            return false;
        }
        return true;
    }

    /**
     * Checks whether this rule is effective and visible at the current system
     * instant.
     *
     * @return {@code true} if visible and effective right now, {@code false}
     *         otherwise
     */
    public boolean isEffective() {
        return isEffective(Instant.now());
    }
}
