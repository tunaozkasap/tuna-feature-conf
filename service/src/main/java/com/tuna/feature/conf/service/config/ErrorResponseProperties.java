package com.tuna.feature.conf.service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Controls what error responses expose to the caller.
 *
 * @param includeTechnicalMessage whether error responses carry {@code technicalMessage} and {@code context}; the
 *                                execution evidence always records both
 */
@ConfigurationProperties(prefix = "app.errors")
public record ErrorResponseProperties(@DefaultValue("true") boolean includeTechnicalMessage) {
}
