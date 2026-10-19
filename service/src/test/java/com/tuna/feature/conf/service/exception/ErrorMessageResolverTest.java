package com.tuna.feature.conf.service.exception;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.ResourceBundleMessageSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ErrorMessageResolverTest {

    private final ErrorMessageResolver resolver = new ErrorMessageResolver(messageSource());

    @Test
    @DisplayName("Named placeholders are filled from the top-level context fields")
    void fillsPlaceholders() {
        ObjectNode context = ServiceException.of("feature", "duplicateCode")
                .with("featureCode", "DARK_MODE")
                .with("projectId", 42L)
                .getContext();

        assertThat(resolver.resolve("feature.duplicateCode.technical", context))
                .isEqualTo("Feature with code 'DARK_MODE' already exists in project 42");
        assertThat(resolver.resolve("feature.duplicateCode.customer", context))
                .isEqualTo("A feature with code 'DARK_MODE' already exists in this project.");
        assertThat(resolver.resolve("module.feature", context)).isEqualTo("Feature");
    }

    @Test
    @DisplayName("An unknown placeholder stays as it is")
    void keepsUnknownPlaceholder() {
        ObjectNode context = ServiceException.of("feature", "duplicateCode").with("featureCode", "X").getContext();

        assertThat(resolver.resolve("feature.duplicateCode.technical", context))
                .isEqualTo("Feature with code 'X' already exists in project {projectId}");
    }

    @Test
    @DisplayName("A missing key resolves to the key itself, its placeholders filled where possible")
    void missingKeyFallsBackToKey() {
        ObjectNode context = JsonNodeFactory.instance.objectNode().put("id", 3);

        assertThat(resolver.resolve("no.such.key", context)).isEqualTo("no.such.key");
        assertThat(resolver.resolve("no.such.key", null)).isEqualTo("no.such.key");
        assertThat(resolver.resolve(null, context)).isNull();
    }

    @Test
    @DisplayName("Arrays are joined, objects written as JSON, nulls as null")
    void rendersValueTypes() {
        ObjectNode context = ServiceException.of("request", "validationFailed")
                .with("fields", List.of("data.code", "data.name"))
                .with("nested", JsonNodeFactory.instance.objectNode().put("a", 1))
                .with("nothing", null)
                .getContext();

        assertThat(ErrorMessageResolver.fillPlaceholders("{fields} | {nested} | {nothing}", context))
                .isEqualTo("data.code, data.name | {\"a\":1} | null");
    }

    @Test
    @DisplayName("Braces that do not form a placeholder are copied unchanged")
    void ignoresMalformedPlaceholders() {
        ObjectNode context = JsonNodeFactory.instance.objectNode().put("x", "1");

        assertThat(ErrorMessageResolver.fillPlaceholders("{} {x {x} x} {{x}} { x } {", context))
                .isEqualTo("{} {x 1 x} {1} { x } {");
        assertThat(ErrorMessageResolver.fillPlaceholders("no placeholders", context)).isEqualTo("no placeholders");
        assertThat(ErrorMessageResolver.fillPlaceholders(null, context)).isNull();
    }

    private static ResourceBundleMessageSource messageSource() {
        ResourceBundleMessageSource messageSource = new ResourceBundleMessageSource();
        messageSource.setBasename("messages");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setFallbackToSystemLocale(false);
        return messageSource;
    }
}
