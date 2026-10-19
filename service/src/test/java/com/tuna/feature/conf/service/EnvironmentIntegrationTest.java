package com.tuna.feature.conf.service;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class EnvironmentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private long projectId;
    private long devId;
    private long prodId;
    private long featureId;
    private long qualifierId;

    @BeforeEach
    void setUp() throws Exception {
        projectId = create("/api/projects", "{\"name\":\"env-test-" + UUID.randomUUID() + "\"}");
        devId = create("/api/environments", "{\"code\":\"dev\",\"name\":\"Development\",\"projectId\":" + projectId + "}");
        prodId = create("/api/environments", "{\"code\":\"PROD\",\"name\":\"Production\",\"projectId\":" + projectId + "}");
        qualifierId = create("/api/qualifiers",
                "{\"code\":\"COUNTRY\",\"name\":\"Country\",\"valueType\":\"TEXT\",\"projectId\":" + projectId + "}");
        featureId = create("/api/features",
                "{\"code\":\"NEW_CHECKOUT\",\"name\":\"New checkout\",\"projectId\":" + projectId + "}");
        create("/api/rules", ruleJson(featureId, devId, qualifierId, "TR", "true"));
    }

    @Test
    @DisplayName("Rules only apply in the environment they were created for")
    void evaluatesPerEnvironment() throws Exception {
        evaluate("dev")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.resolvedValue").value("true"))
                .andExpect(jsonPath("$.data.source").value("RULE_MATCH"))
                .andExpect(jsonPath("$.data.environmentCode").value("DEV"));

        evaluate("PROD")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.resolvedValue").value("false"))
                .andExpect(jsonPath("$.data.source").value("DEFAULT_FALLBACK"))
                .andExpect(jsonPath("$.data.environmentCode").value("PROD"));
    }

    @Test
    @DisplayName("Evaluation requires a known environment code")
    void rejectsMissingOrUnknownEnvironment() throws Exception {
        post("/api/evaluations/evaluate",
                "{\"featureCode\":\"NEW_CHECKOUT\",\"projectId\":" + projectId + "}")
                .andExpect(status().isBadRequest());

        evaluate("QA").andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Environment codes are unique within a project")
    void rejectsDuplicateEnvironmentCode() throws Exception {
        post("/api/environments", "{\"code\":\"Dev\",\"name\":\"Dev again\",\"projectId\":" + projectId + "}")
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("A rule cannot use an environment from a different project")
    void rejectsRuleWithForeignEnvironment() throws Exception {
        long otherProjectId = create("/api/projects", "{\"name\":\"env-test-other-" + UUID.randomUUID() + "\"}");
        long otherEnvId = create("/api/environments",
                "{\"code\":\"DEV\",\"name\":\"Other dev\",\"projectId\":" + otherProjectId + "}");

        post("/api/rules", ruleJson(featureId, otherEnvId, qualifierId, "DE", "true"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("An environment that still has rules cannot be deleted")
    void protectsEnvironmentsInUse() throws Exception {
        mockMvc.perform(delete("/api/environments/" + devId))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/environments/" + prodId))
                .andExpect(status().isOk());
    }

    private ResultActions evaluate(String environmentCode) throws Exception {
        return post("/api/evaluations/evaluate",
                "{\"featureCode\":\"NEW_CHECKOUT\",\"projectId\":" + projectId
                        + ",\"environmentCode\":\"" + environmentCode + "\""
                        + ",\"requestContext\":{\"COUNTRY\":\"TR\"}}");
    }

    private static String ruleJson(long featureId, long environmentId, long qualifierId,
                                   String qualifierValue, String featureValue) {
        return "{\"featureId\":" + featureId + ",\"environmentId\":" + environmentId
                + ",\"qualifierId\":" + qualifierId + ",\"qualifierValue\":\"" + qualifierValue
                + "\",\"featureValue\":\"" + featureValue + "\"}";
    }

    private long create(String url, String data) throws Exception {
        String body = post(url, data)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.data.id")).longValue();
    }

    private ResultActions post(String url, String data) throws Exception {
        return mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(url)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"data\":" + data + "}"));
    }
}
