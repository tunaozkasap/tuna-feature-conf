package com.tuna.feature.conf.service.exception;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

/**
 * Resolves the bundle keys of a {@link ServiceException} from {@code messages.properties} and fills the named
 * {@code {placeholder}}s from the top-level fields of the exception's context. Never throws: a missing key resolves
 * to the key itself and an unknown placeholder stays as it is.
 */
@Component
@RequiredArgsConstructor
public class ErrorMessageResolver {

    private final MessageSource messageSource;

    public String resolve(String key, ObjectNode context) {
        if (key == null) {
            return null;
        }
        // No arguments: Spring returns the text as is, without MessageFormat processing of quotes and braces
        String template = messageSource.getMessage(key, null, key, LocaleContextHolder.getLocale());
        return fillPlaceholders(template, context);
    }

    /**
     * Replaces each {@code {name}} with the context's top-level field {@code name}. Arrays are written as their
     * elements separated by {@code ", "}, objects as JSON. Placeholders without a matching field, and braces that do
     * not form a placeholder, are copied unchanged.
     */
    static String fillPlaceholders(String template, ObjectNode context) {
        if (template == null || context == null || template.indexOf('{') < 0) {
            return template;
        }
        StringBuilder result = new StringBuilder(template.length() + 32);
        int index = 0;
        while (index < template.length()) {
            char current = template.charAt(index);
            int end = current == '{' ? placeholderEnd(template, index) : -1;
            if (end < 0) {
                result.append(current);
                index++;
                continue;
            }
            String name = template.substring(index + 1, end);
            JsonNode value = context.get(name);
            result.append(value != null ? text(value) : template.substring(index, end + 1));
            index = end + 1;
        }
        return result.toString();
    }

    /**
     * The index of the closing brace when a placeholder name ({@code [A-Za-z0-9_.-]+}) starts at {@code open},
     * otherwise -1.
     */
    private static int placeholderEnd(String template, int open) {
        int index = open + 1;
        while (index < template.length() && isNameChar(template.charAt(index))) {
            index++;
        }
        boolean closed = index < template.length() && template.charAt(index) == '}';
        return closed && index > open + 1 ? index : -1;
    }

    private static boolean isNameChar(char c) {
        return Character.isLetterOrDigit(c) || c == '_' || c == '.' || c == '-';
    }

    private static String text(JsonNode value) {
        if (value.isValueNode()) {
            return value.asText();
        }
        if (!value.isArray()) {
            return value.toString();
        }
        StringBuilder joined = new StringBuilder();
        for (JsonNode element : value) {
            if (!joined.isEmpty()) {
                joined.append(", ");
            }
            joined.append(element.isValueNode() ? element.asText() : element.toString());
        }
        return joined.toString();
    }
}
