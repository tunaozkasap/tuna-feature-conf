package com.tuna.feature.conf.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.tuna.feature.conf.service.evidence.RequestEvidenceFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Every error answers with the same JSON shape; with the default configuration it includes the technical message
 * and the context.
 */
@SpringBootTest
@AutoConfigureMockMvc
public class ErrorResponseIntegrationTest {

    private static final List<String> FIELDS = List.of("status", "module", "message", "technicalMessage", "context",
            "requestId", "timestamp");

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private long projectId;

    @BeforeEach
    void setUp() throws Exception {
        projectId = create("/api/projects", "{\"name\":\"errors-" + UUID.randomUUID() + "\"}");
        create("/api/features", "{\"code\":\"DARK_MODE\",\"name\":\"Dark mode\",\"projectId\":" + projectId + "}");
    }

    @Test
    @DisplayName("A missing resource returns 404 with module, both messages, context and the request id")
    void notFound() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/features/987654")
                        .header(RequestEvidenceFilter.REQUEST_ID_HEADER, "req-404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.module").value("Feature"))
                .andExpect(jsonPath("$.message").value("The requested feature does not exist."))
                .andExpect(jsonPath("$.technicalMessage").value("Feature not found with id '987654'"))
                .andExpect(jsonPath("$.context.field").value("id"))
                .andExpect(jsonPath("$.context.value").value(987654))
                .andExpect(jsonPath("$.requestId").value("req-404"))
                .andReturn();

        JsonNode body = body(result);
        assertThat(fieldNames(body)).containsExactlyElementsOf(FIELDS);
        assertThat(Instant.parse(body.path("timestamp").asText())).isBeforeOrEqualTo(Instant.now());
    }

    @Test
    @DisplayName("A validation error returns 400 with the details of every invalid field in the context")
    void validation() throws Exception {
        MvcResult result = send(post("/api/features"), "{\"data\":{\"projectId\":" + projectId + "}}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.module").value("Request"))
                .andExpect(jsonPath("$.context.violationCount").value(2))
                .andExpect(jsonPath("$.context.fieldErrors['data.code'].constraint").value("NotBlank"))
                .andExpect(jsonPath("$.context.fieldErrors['data.code'].message").value("Feature code is required"))
                .andExpect(jsonPath("$.context.fieldErrors['data.name'].constraint").value("NotBlank"))
                .andReturn();

        JsonNode body = body(result);
        assertThat(fieldNames(body)).containsExactlyElementsOf(FIELDS);
        assertThat(body.path("message").asText()).startsWith("Some fields are missing or invalid: ")
                .contains("data.code").contains("data.name");
        assertThat(body.path("technicalMessage").asText()).startsWith("Request validation failed for 2 field(s): ");
        assertThat(body.path("requestId").asText())
                .isEqualTo(result.getResponse().getHeader(RequestEvidenceFilter.REQUEST_ID_HEADER));
    }

    @Test
    @DisplayName("A service rule violation fills the message placeholders from the context")
    void duplicateCode() throws Exception {
        send(post("/api/features"), "{\"data\":{\"code\":\"dark_mode\",\"name\":\"Again\",\"projectId\":" + projectId + "}}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.module").value("Feature"))
                .andExpect(jsonPath("$.message").value("A feature with code 'DARK_MODE' already exists in this project."))
                .andExpect(jsonPath("$.technicalMessage").value(
                        "Feature with code 'DARK_MODE' already exists in project " + projectId))
                .andExpect(jsonPath("$.context.featureCode").value("DARK_MODE"))
                .andExpect(jsonPath("$.context.projectId").value(projectId));
    }

    @Test
    @DisplayName("A data conflict returns 409 with the constraint in the context and no driver message")
    void conflict() throws Exception {
        MvcResult result = mockMvc.perform(delete("/api/projects/" + projectId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.module").value("Data"))
                .andExpect(jsonPath("$.message").value(
                        "The request conflicts with existing data (duplicate value or record still in use)"))
                .andExpect(jsonPath("$.context.sqlState").value("23503"))
                .andReturn();

        JsonNode body = body(result);
        assertThat(fieldNames(body)).containsExactlyElementsOf(FIELDS);
        assertThat(body.path("context").path("constraint").asText()).matches("[A-Z0-9_]+");
        assertThat(body.toString()).doesNotContainIgnoringCase("delete from");
    }

    @Test
    @DisplayName("Web layer errors use the same shape: method not allowed and unknown endpoint")
    void webLayerErrors() throws Exception {
        mockMvc.perform(delete("/api/evaluations/evaluate"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405))
                .andExpect(jsonPath("$.module").value("Request"))
                .andExpect(jsonPath("$.context.requestedMethod").value("DELETE"))
                .andExpect(jsonPath("$.context.supportedMethods[0]").value("POST"));

        mockMvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.technicalMessage").value("No endpoint GET /api/does-not-exist"));
    }

    private JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private static List<String> fieldNames(JsonNode body) {
        List<String> names = new ArrayList<>();
        Iterator<String> iterator = body.fieldNames();
        while (iterator.hasNext()) {
            names.add(iterator.next());
        }
        return names;
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String body) throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private long create(String url, String json) throws Exception {
        String body = send(post(url), "{\"data\":" + json + "}")
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.data.id")).longValue();
    }
}
