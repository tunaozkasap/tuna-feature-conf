package com.tuna.feature.conf.service.exception;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.Collection;
import java.util.Map;

/**
 * The single exception model of the service. It carries no message text, only bundle keys (resolved from
 * {@code messages.properties} when the error response is written) and a JSON {@link #getContext() context} holding
 * every detail of the failure. Top-level context fields fill the {@code {name}} placeholders of the messages.
 * <p>
 * Keys follow the convention {@code module.<module>} for the module name and {@code <module>.<error>.technical} /
 * {@code <module>.<error>.customer} for the messages, see {@link #of(String, String)}:
 *
 * <pre>{@code
 * throw ServiceException.of("feature", "duplicateCode")
 *         .status(HttpStatus.BAD_REQUEST)
 *         .with("featureCode", code)
 *         .with("projectId", projectId);
 * }</pre>
 */
@Getter
public class ServiceException extends RuntimeException {

    private final String moduleNameBundleKey;
    private final String technicalMessageBundleKey;
    private final String customerMessageBundleKey;
    private final ObjectNode context = JsonNodeFactory.instance.objectNode();
    private HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;

    public ServiceException(String moduleNameBundleKey, String technicalMessageBundleKey,
            String customerMessageBundleKey) {
        super(technicalMessageBundleKey);
        this.moduleNameBundleKey = moduleNameBundleKey;
        this.technicalMessageBundleKey = technicalMessageBundleKey;
        this.customerMessageBundleKey = customerMessageBundleKey;
    }

    /**
     * An exception whose keys follow the bundle convention: {@code module.<module>}, {@code <module>.<error>.technical}
     * and {@code <module>.<error>.customer}.
     */
    public static ServiceException of(String module, String error) {
        return new ServiceException(moduleKey(module), technicalKey(module, error), customerKey(module, error));
    }

    protected static String moduleKey(String module) {
        return "module." + module;
    }

    protected static String technicalKey(String module, String error) {
        return module + "." + error + ".technical";
    }

    protected static String customerKey(String module, String error) {
        return module + "." + error + ".customer";
    }

    /**
     * Writes a detail of the failure into the context. Strings, numbers, booleans, enums, JSON nodes, collections
     * and maps keep their JSON type; anything else is written as its {@code toString()}.
     */
    public ServiceException with(String key, Object value) {
        context.set(key, toNode(value));
        return this;
    }

    public ServiceException status(HttpStatus status) {
        this.status = status;
        return this;
    }

    public ServiceException cause(Throwable cause) {
        initCause(cause);
        return this;
    }

    /**
     * The technical bundle key followed by the context, so a stack trace tells what failed without a message
     * source at hand.
     */
    @Override
    public String getMessage() {
        return technicalMessageBundleKey + " " + context;
    }

    private static JsonNode toNode(Object value) {
        JsonNodeFactory factory = JsonNodeFactory.instance;
        if (value == null) {
            return factory.nullNode();
        }
        if (value instanceof JsonNode node) {
            return node;
        }
        if (value instanceof String text) {
            return factory.textNode(text);
        }
        if (value instanceof Boolean flag) {
            return factory.booleanNode(flag);
        }
        if (value instanceof Integer || value instanceof Long || value instanceof Short || value instanceof Byte) {
            return factory.numberNode(((Number) value).longValue());
        }
        if (value instanceof BigInteger number) {
            return factory.numberNode(number);
        }
        if (value instanceof BigDecimal number) {
            return factory.numberNode(number);
        }
        if (value instanceof Number number) {
            return factory.numberNode(number.doubleValue());
        }
        if (value instanceof Enum<?> constant) {
            return factory.textNode(constant.name());
        }
        if (value instanceof Collection<?> values) {
            return toArrayNode(values);
        }
        if (value instanceof Map<?, ?> entries) {
            return toObjectNode(entries);
        }
        return factory.textNode(String.valueOf(value));
    }

    private static ArrayNode toArrayNode(Collection<?> values) {
        ArrayNode array = JsonNodeFactory.instance.arrayNode(values.size());
        for (Object value : values) {
            array.add(toNode(value));
        }
        return array;
    }

    private static ObjectNode toObjectNode(Map<?, ?> entries) {
        ObjectNode object = JsonNodeFactory.instance.objectNode();
        for (Map.Entry<?, ?> entry : entries.entrySet()) {
            object.set(String.valueOf(entry.getKey()), toNode(entry.getValue()));
        }
        return object;
    }
}
