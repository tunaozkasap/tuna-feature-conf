package com.tuna.feature.conf.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Every request writes exactly one evidence; these tests capture it and check the narrative it tells. Each request
 * sends its own {@code X-Request-Id}, so tests running in parallel only ever read their own evidence.
 */
@SpringBootTest
@AutoConfigureMockMvc
public class EvidenceLoggingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private long projectId;

    @BeforeEach
    void setUp() throws Exception {
        projectId = create("/api/projects", "{\"name\":\"evidence-" + UUID.randomUUID() + "\"}");
        long environmentId = create("/api/environments", "{\"code\":\"DEV\",\"name\":\"Dev\",\"projectId\":" + projectId + "}");
        long qualifierId = create("/api/qualifiers",
                "{\"code\":\"COUNTRY\",\"name\":\"Country\",\"valueType\":\"TEXT\",\"priority\":5,\"projectId\":" + projectId + "}");
        long featureId = create("/api/features", "{\"code\":\"NEW_CHECKOUT\",\"name\":\"New checkout\",\"projectId\":" + projectId + "}");
        create("/api/rules", "{\"featureId\":" + featureId + ",\"environmentId\":" + environmentId
                + ",\"qualifierId\":" + qualifierId + ",\"qualifierValue\":\"TR\",\"featureValue\":\"true\"}");
    }

    @Test
    @DisplayName("A matching evaluation records the request, every rule check and the decision in one evidence")
    void evaluationMatch() throws Exception {
        String requestId = CapturedEvidence.newRequestId();
        evaluate("{\"COUNTRY\":\" tr \"}", requestId)
                .andExpect(status().isOk())
                .andExpect(header().string(RequestEvidenceFilter.REQUEST_ID_HEADER, requestId));

        JsonNode evidence = onlyEvidence(requestId);
        assertThat(evidence.path("requestId").asText()).isEqualTo(requestId);
        assertThat(evidence.path("method").asText()).isEqualTo("POST");
        assertThat(evidence.path("path").asText()).isEqualTo("/api/evaluations/evaluate");
        assertThat(evidence.path("handler").asText()).isEqualTo("EvaluationController.evaluateFeature");
        assertThat(evidence.path("status").asInt()).isEqualTo(200);
        assertThat(evidence.path("severity").asText()).isEqualTo("INFO");
        assertThat(evidence.has("durationMs")).isTrue();

        JsonNode evaluation = evidence.path("evaluation");
        assertThat(evaluation.path("validation").path("passed").asBoolean()).isTrue();
        assertThat(evaluation.path("featureLookup").path("found").asBoolean()).isTrue();
        assertThat(evaluation.path("environmentLookup").path("code").asText()).isEqualTo("DEV");
        assertThat(evaluation.path("rules").path("effectiveCount").asInt()).isEqualTo(1);
        JsonNode check = evaluation.path("ruleChecks").get(0);
        assertThat(check.path("qualifierCode").asText()).isEqualTo("COUNTRY");
        assertThat(check.path("expected").asText()).isEqualTo("TR");
        assertThat(check.path("actual").asText()).isEqualTo(" tr ");
        assertThat(check.path("result").asText()).isEqualTo("match");
        assertThat(evaluation.path("decision").path("source").asText()).isEqualTo("RULE_MATCH");
        assertThat(evaluation.path("decision").path("resolvedValue").asText()).isEqualTo("true");
        assertThat(evidence.path("response").path("success").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("A missing context value is recorded and the decision falls back with its reason")
    void evaluationFallback() throws Exception {
        String requestId = CapturedEvidence.newRequestId();
        evaluate("{}", requestId).andExpect(status().isOk());

        JsonNode evaluation = onlyEvidence(requestId).path("evaluation");
        assertThat(evaluation.path("ruleChecks").get(0).path("result").asText()).isEqualTo("missingContextValue");
        assertThat(evaluation.path("decision").path("source").asText()).isEqualTo("DEFAULT_FALLBACK");
        assertThat(evaluation.path("decision").path("reason").asText()).isEqualTo("noRuleMatched");
    }

    @Test
    @DisplayName("An unknown feature is a client error with the missing resource recorded")
    void evaluationNotFound() throws Exception {
        String requestId = CapturedEvidence.newRequestId();
        send(withRequestId(post("/api/evaluations/evaluate"), requestId), "{\"data\":{\"featureCode\":\"NOPE\",\"projectId\":"
                + projectId + ",\"environmentCode\":\"DEV\"}}")
                .andExpect(status().isNotFound());

        JsonNode evidence = onlyEvidence(requestId);
        assertThat(evidence.path("severity").asText()).isEqualTo("WARN");
        assertThat(evidence.path("evaluation").path("featureLookup").path("found").asBoolean()).isFalse();
        JsonNode error = evidence.path("error");
        assertThat(error.path("module").asText()).isEqualTo("Feature");
        assertThat(error.path("technicalMessageKey").asText()).isEqualTo("feature.notFound.technical");
        assertThat(error.path("technicalMessage").asText()).isEqualTo("Feature not found with code 'NOPE'");
        assertThat(error.path("context").path("value").asText()).isEqualTo("NOPE");
        assertThat(error.path("httpStatus").asInt()).isEqualTo(404);
    }

    @Test
    @DisplayName("Validation errors record the violated constraint per field")
    void validationError() throws Exception {
        String requestId = CapturedEvidence.newRequestId();
        send(withRequestId(post("/api/features"), requestId), "{\"data\":{\"name\":\"No code\",\"projectId\":"
                + projectId + "}}")
                .andExpect(status().isBadRequest());

        JsonNode error = onlyEvidence(requestId).path("error");
        assertThat(error.path("context").path("fieldErrors").path("data.code").path("constraint").asText())
                .isEqualTo("NotBlank");
    }

    @Test
    @DisplayName("Integrity violations record the constraint identifier and SQL state, not the driver message")
    void integrityViolation() throws Exception {
        String requestId = CapturedEvidence.newRequestId();
        mockMvc.perform(withRequestId(delete("/api/projects/" + projectId), requestId))
                .andExpect(status().isConflict());

        JsonNode evidence = onlyEvidence(requestId);
        assertThat(evidence.path("deleteProject").path("found").asBoolean()).isTrue();
        JsonNode error = evidence.path("error");
        assertThat(error.path("context").path("constraint").asText()).matches("[A-Z0-9_]+");
        assertThat(error.path("context").path("sqlState").asText()).isEqualTo("23503");
        assertThat(error.path("severity").asText()).isEqualTo("WARN");
    }

    @Test
    @DisplayName("Search records filters, page request and page result")
    void searchRecordsQuery() throws Exception {
        String requestId = CapturedEvidence.newRequestId();
        mockMvc.perform(withRequestId(get("/api/features"), requestId).param("projectId", String.valueOf(projectId)))
                .andExpect(status().isOk());

        JsonNode evidence = onlyEvidence(requestId);
        assertThat(evidence.path("query").path("projectId").asText()).isEqualTo(String.valueOf(projectId));
        JsonNode search = evidence.path("searchFeatures");
        assertThat(search.path("filters").get(0).path("field").asText()).isEqualTo("project.id");
        assertThat(search.path("pageRequest").path("size").asInt()).isEqualTo(20);
        assertThat(search.path("pageResult").path("returned").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("User e-mail addresses are masked and unsafe request ids are replaced")
    void masksUserEmail() throws Exception {
        // The unsafe id is replaced, so this request's evidence is found by the id the response carries instead
        String requestId = send(withRequestId(post("/api/users"), "bad id with spaces"),
                "{\"data\":{\"username\":\"jane\",\"email\":\"jane.doe@example.com\"}}")
                .andExpect(status().isCreated())
                .andReturn().getResponse().getHeader(RequestEvidenceFilter.REQUEST_ID_HEADER);

        assertThat(CapturedEvidence.forRequest("bad id with spaces")).isEmpty();
        JsonNode evidence = onlyEvidence(requestId);
        assertThat(evidence.toString()).doesNotContain("jane.doe@example.com");
        assertThat(evidence.path("createUser").path("input").path("email").asText()).isEqualTo("j***@example.com");
        assertThat(evidence.path("requestId").asText()).isNotEqualTo("bad id with spaces");
        assertThat(UUID.fromString(evidence.path("requestId").asText())).isNotNull();
    }

    private static JsonNode onlyEvidence(String requestId) {
        List<ObjectNode> evidences = CapturedEvidence.forRequest(requestId);
        assertThat(evidences).hasSize(1);
        return evidences.get(0);
    }

    private static MockHttpServletRequestBuilder withRequestId(MockHttpServletRequestBuilder request, String requestId) {
        return request.header(RequestEvidenceFilter.REQUEST_ID_HEADER, requestId);
    }

    private ResultActions evaluate(String context, String requestId) throws Exception {
        return send(withRequestId(post("/api/evaluations/evaluate"), requestId), "{\"data\":{\"featureCode\":\"new_checkout\",\"projectId\":"
                + projectId + ",\"environmentCode\":\"dev\",\"requestContext\":" + context + "}}");
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
