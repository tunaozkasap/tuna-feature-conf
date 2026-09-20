package com.tuna.feature.conf.model.enums;

/**
 * Supported data types for feature qualifier values.
 */
public enum FeatureQualifierValueType {
    /**
     * Numeric value (integer or decimal).
     */
    NUMERIC,

    /**
     * Boolean flag (true/false).
     */
    BOOLEAN,

    /**
     * Text / string value.
     */
    TEXT,

    /**
     * Structured JSON payload for complex evaluation criteria.
     */
    JSON
}
