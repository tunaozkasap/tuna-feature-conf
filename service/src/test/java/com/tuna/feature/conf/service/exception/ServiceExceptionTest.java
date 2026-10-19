package com.tuna.feature.conf.service.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ServiceExceptionTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("A new exception is a server error without cause and with an empty context")
    void defaults() {
        ServiceException ex = new ServiceException("module.feature", "feature.x.technical", "feature.x.customer");

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(ex.getCause()).isNull();
        assertThat(ex.getContext().isEmpty()).isTrue();
        assertThat(ex.getModuleNameBundleKey()).isEqualTo("module.feature");
        assertThat(ex.getTechnicalMessageBundleKey()).isEqualTo("feature.x.technical");
        assertThat(ex.getCustomerMessageBundleKey()).isEqualTo("feature.x.customer");
    }

    @Test
    @DisplayName("of() derives the bundle keys from module and error")
    void keysByConvention() {
        ServiceException ex = ServiceException.of("feature", "duplicateCode");

        assertThat(ex.getModuleNameBundleKey()).isEqualTo("module.feature");
        assertThat(ex.getTechnicalMessageBundleKey()).isEqualTo("feature.duplicateCode.technical");
        assertThat(ex.getCustomerMessageBundleKey()).isEqualTo("feature.duplicateCode.customer");
    }

    @Test
    @DisplayName("with() keeps the JSON type of each value and the context serializes as plain JSON")
    void contextSerialization() throws Exception {
        Map<String, Object> nested = new LinkedHashMap<>();
        nested.put("constraint", "NotBlank");
        IllegalStateException cause = new IllegalStateException("boom");

        ServiceException ex = ServiceException.of("feature", "duplicateCode")
                .status(HttpStatus.BAD_REQUEST)
                .cause(cause)
                .with("featureCode", "DARK_MODE")
                .with("projectId", 42L)
                .with("priority", 5)
                .with("ratio", new BigDecimal("0.25"))
                .with("enabled", true)
                .with("status", HttpStatus.CONFLICT)
                .with("fields", List.of("code", "name"))
                .with("details", nested)
                .with("node", JsonNodeFactory.instance.textNode("raw"))
                .with("missing", null);

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getCause()).isSameAs(cause);
        assertThat(objectMapper.writeValueAsString(ex.getContext())).isEqualTo("{\"featureCode\":\"DARK_MODE\","
                + "\"projectId\":42,\"priority\":5,\"ratio\":0.25,\"enabled\":true,\"status\":\"CONFLICT\","
                + "\"fields\":[\"code\",\"name\"],\"details\":{\"constraint\":\"NotBlank\"},\"node\":\"raw\","
                + "\"missing\":null}");
        assertThat(ex.getMessage()).isEqualTo("feature.duplicateCode.technical "
                + "{\"featureCode\":\"DARK_MODE\",\"projectId\":42,\"priority\":5,\"ratio\":0.25,\"enabled\":true,"
                + "\"status\":\"CONFLICT\",\"fields\":[\"code\",\"name\"],\"details\":{\"constraint\":\"NotBlank\"},"
                + "\"node\":\"raw\",\"missing\":null}");
    }

    @Test
    @DisplayName("The exception survives Java serialization with its keys, status and context")
    void javaSerialization() throws Exception {
        ServiceException original = new ResourceNotFoundException("feature", "id", 7L);

        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            out.writeObject(original);
        }
        ServiceException copy;
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            copy = (ServiceException) in.readObject();
        }

        assertThat(copy).isInstanceOf(ResourceNotFoundException.class);
        assertThat(copy.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(copy.getTechnicalMessageBundleKey()).isEqualTo("feature.notFound.technical");
        assertThat(copy.getContext().toString()).isEqualTo("{\"field\":\"id\",\"value\":7}");
    }

    @Test
    @DisplayName("Not found and invalid request exceptions carry their status, keys and context")
    void subclasses() {
        ResourceNotFoundException notFound = new ResourceNotFoundException("environment", "code", "QA");
        assertThat(notFound.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(notFound.getModuleNameBundleKey()).isEqualTo("module.environment");
        assertThat(notFound.getCustomerMessageBundleKey()).isEqualTo("environment.notFound.customer");
        assertThat(notFound.getContext().toString()).isEqualTo("{\"field\":\"code\",\"value\":\"QA\"}");

        InvalidRequestException invalid = new InvalidRequestException("search", "unknownFilterField");
        assertThat(invalid.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(invalid.getTechnicalMessageBundleKey()).isEqualTo("search.unknownFilterField.technical");
    }
}
