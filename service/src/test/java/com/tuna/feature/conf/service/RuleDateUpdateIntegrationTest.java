package com.tuna.feature.conf.service;

import com.fasterxml.jackson.databind.JsonNode;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Empty fields of a rule update are left unchanged, so dates are removed with {@code clearEffectiveFrom} and
 * {@code clearEffectiveTo}.
 */
@SpringBootTest
@AutoConfigureMockMvc
class RuleDateUpdateIntegrationTest {

    private static final String FROM = "2026-01-01T00:00:00Z";
    private static final String TO = "2099-01-01T00:00:00Z";

    @Autowired
    private MockMvc mockMvc;

    private long ruleId;

    @BeforeEach
    void setUp() throws Exception {
        long projectId = create("/api/projects", "{\"name\":\"rule-dates-" + UUID.randomUUID() + "\"}");
        long environmentId = create("/api/environments", "{\"code\":\"PROD\",\"name\":\"Prod\",\"projectId\":" + projectId + "}");
        long qualifierId = create("/api/qualifiers",
                "{\"code\":\"COUNTRY\",\"name\":\"Country\",\"valueType\":\"TEXT\",\"priority\":5,\"projectId\":" + projectId + "}");
        long featureId = create("/api/features", "{\"code\":\"BANNER\",\"name\":\"Banner\",\"projectId\":" + projectId + "}");
        ruleId = create("/api/rules", "{\"featureId\":" + featureId + ",\"environmentId\":" + environmentId
                + ",\"qualifierId\":" + qualifierId + ",\"qualifierValue\":\"TR\",\"featureValue\":\"true\""
                + ",\"effectiveFrom\":\"" + FROM + "\",\"effectiveTo\":\"" + TO + "\"}");
    }

    @Test
    @DisplayName("clearEffectiveFrom removes the start date and keeps the end date; the evidence names the cleared field")
    void clearsTheStartDate() throws Exception {
        String requestId = CapturedEvidence.newRequestId();
        update("{\"clearEffectiveFrom\":true}", requestId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.effectiveFrom").doesNotExist())
                .andExpect(jsonPath("$.data.effectiveTo").value(TO));

        JsonNode updateRule = CapturedEvidence.forRequest(requestId).get(0).path("updateRule");
        assertThat(updateRule.path("clearedFields").toString()).isEqualTo("[\"effectiveFrom\"]");
        assertThat(updateRule.path("ruleValues").path("effectiveFrom").isNull()).isTrue();
    }

    @Test
    @DisplayName("clearEffectiveTo removes the end date, and other fields change in the same update")
    void clearsTheEndDateWithOtherChanges() throws Exception {
        update("{\"clearEffectiveTo\":true,\"featureValue\":\"false\"}", CapturedEvidence.newRequestId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.effectiveFrom").value(FROM))
                .andExpect(jsonPath("$.data.effectiveTo").doesNotExist())
                .andExpect(jsonPath("$.data.featureValue").value("false"));
    }

    @Test
    @DisplayName("Leaving the dates out still keeps them")
    void keepsDatesThatAreLeftOut() throws Exception {
        update("{\"description\":\"no date change\"}", CapturedEvidence.newRequestId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.effectiveFrom").value(FROM))
                .andExpect(jsonPath("$.data.effectiveTo").value(TO));
    }

    @Test
    @DisplayName("Setting and clearing the same date is rejected before anything changes")
    void rejectsSetAndClear() throws Exception {
        String requestId = CapturedEvidence.newRequestId();
        update("{\"effectiveTo\":\"2030-01-01T00:00:00Z\",\"clearEffectiveTo\":true}", requestId)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A rule update can either set or clear 'effectiveTo', not both."));

        JsonNode evidence = CapturedEvidence.forRequest(requestId).get(0);
        assertThat(evidence.path("updateRule").path("rejected").asText()).isEqualTo("setAndClear");
        assertThat(evidence.path("error").path("technicalMessageKey").asText()).isEqualTo("rule.setAndClear.technical");

        update("{}", CapturedEvidence.newRequestId())
                .andExpect(jsonPath("$.data.effectiveTo").value(TO));
    }

    private ResultActions update(String data, String requestId) throws Exception {
        return send(put("/api/rules/" + ruleId).header(RequestEvidenceFilter.REQUEST_ID_HEADER, requestId), data);
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String data) throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content("{\"data\":" + data + "}"));
    }

    private long create(String url, String data) throws Exception {
        String body = send(post(url), data)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.data.id")).longValue();
    }
}
