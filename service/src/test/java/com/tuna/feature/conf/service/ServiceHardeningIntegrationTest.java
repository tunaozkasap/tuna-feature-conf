package com.tuna.feature.conf.service;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class ServiceHardeningIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private long projectId;
    private long otherProjectId;
    private long featureId;
    private long environmentId;
    private long otherQualifierId;

    @BeforeEach
    void setUp() throws Exception {
        projectId = create("/api/projects", "{\"name\":\"hardening-" + UUID.randomUUID() + "\"}");
        otherProjectId = create("/api/projects", "{\"name\":\"hardening-other-" + UUID.randomUUID() + "\"}");
        environmentId = create("/api/environments", "{\"code\":\"DEV\",\"name\":\"Dev\",\"projectId\":" + projectId + "}");
        featureId = create("/api/features", "{\"code\":\"DARK_MODE\",\"name\":\"Dark mode\",\"projectId\":" + projectId + "}");
        create("/api/qualifiers", "{\"code\":\"COUNTRY\",\"name\":\"Country\",\"valueType\":\"TEXT\",\"projectId\":" + projectId + "}");
        otherQualifierId = create("/api/qualifiers",
                "{\"code\":\"COUNTRY\",\"name\":\"Country\",\"valueType\":\"TEXT\",\"projectId\":" + otherProjectId + "}");
    }

    @Nested
    @DisplayName("Request validation")
    class Validation {

        @Test
        @DisplayName("Missing required payload fields return 400 with field errors, not a 500")
        void rejectsMissingFields() throws Exception {
            send(post("/api/features"), "{\"data\":{\"name\":\"No code\",\"projectId\":" + projectId + "}}")
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.validationErrors['data.code']").value("Feature code is required"));
        }

        @Test
        @DisplayName("A request without a data payload returns 400")
        void rejectsMissingData() throws Exception {
            send(post("/api/features"), "{}")
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.validationErrors.data").value("Request data is required"));
        }
    }

    @Nested
    @DisplayName("Error handling")
    class ErrorHandling {

        @Test
        @DisplayName("Malformed JSON returns 400")
        void malformedJson() throws Exception {
            send(post("/api/features"), "{not json")
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Wrong HTTP method returns 405")
        void wrongMethod() throws Exception {
            mockMvc.perform(delete("/api/evaluations/evaluate"))
                    .andExpect(status().isMethodNotAllowed());
        }

        @Test
        @DisplayName("Non-numeric path ID returns 400")
        void badPathVariable() throws Exception {
            mockMvc.perform(get("/api/features/abc"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Unknown endpoint returns 404")
        void unknownEndpoint() throws Exception {
            mockMvc.perform(get("/api/does-not-exist"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Unknown sort field returns 400")
        void unknownSortField() throws Exception {
            send(post("/api/features/search"), "{\"sorts\":[{\"field\":\"nope\",\"direction\":\"ASC\"}]}")
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Deleting a project that is still in use returns 409 without leaking SQL")
        void integrityViolation() throws Exception {
            mockMvc.perform(delete("/api/projects/" + projectId))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.message").value(
                            "The request conflicts with existing data (duplicate value or record still in use)"));
        }
    }

    @Nested
    @DisplayName("Unique codes")
    class UniqueCodes {

        @Test
        @DisplayName("Feature codes are unique per project, ignoring case")
        void duplicateFeatureCode() throws Exception {
            send(post("/api/features"), data("{\"code\":\"dark_mode\",\"name\":\"Again\",\"projectId\":" + projectId + "}"))
                    .andExpect(status().isBadRequest());
            send(post("/api/features"), data("{\"code\":\"DARK_MODE\",\"name\":\"Other\",\"projectId\":" + otherProjectId + "}"))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("Qualifier codes are unique per project")
        void duplicateQualifierCode() throws Exception {
            send(post("/api/qualifiers"),
                    data("{\"code\":\"country\",\"name\":\"Again\",\"valueType\":\"TEXT\",\"projectId\":" + projectId + "}"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Evaluation requires a project ID")
        void evaluationNeedsProject() throws Exception {
            send(post("/api/evaluations/evaluate"), data("{\"featureCode\":\"DARK_MODE\",\"environmentCode\":\"DEV\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Project boundaries")
    class ProjectBoundaries {

        @Test
        @DisplayName("A feature cannot be moved to another project")
        void featureCannotMove() throws Exception {
            send(put("/api/features/" + featureId), data("{\"projectId\":" + otherProjectId + "}"))
                    .andExpect(status().isBadRequest());
            send(put("/api/features/" + featureId), data("{\"projectId\":" + projectId + ",\"name\":\"Renamed\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.name").value("Renamed"));
        }

        @Test
        @DisplayName("A rule cannot use a qualifier from another project")
        void ruleQualifierMustMatchProject() throws Exception {
            send(post("/api/rules"), data("{\"featureId\":" + featureId + ",\"environmentId\":" + environmentId
                    + ",\"qualifierId\":" + otherQualifierId + ",\"qualifierValue\":\"TR\",\"featureValue\":\"true\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Search filters")
    class SearchFilters {

        @Test
        @DisplayName("Unknown filter field returns 400 instead of being ignored")
        void unknownField() throws Exception {
            search("{\"field\":\"nope\",\"operator\":\"EQUALS\",\"value\":\"x\"}")
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Unknown filter field 'nope'"));
        }

        @Test
        @DisplayName("A value operator without a value returns 400")
        void missingValue() throws Exception {
            search("{\"field\":\"code\",\"operator\":\"EQUALS\"}")
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("IN accepts a single value instead of silently returning everything")
        void inWithSingleValue() throws Exception {
            search("{\"field\":\"project.id\",\"operator\":\"IN\",\"value\":" + projectId + "}")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.items.length()").value(1))
                    .andExpect(jsonPath("$.items[0].code").value("DARK_MODE"));
        }

        @Test
        @DisplayName("IN with an empty list matches nothing")
        void inWithEmptyList() throws Exception {
            search("{\"field\":\"project.id\",\"operator\":\"IN\",\"value\":[]}")
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.items.length()").value(0));
        }

        private ResultActions search(String filter) throws Exception {
            return send(post("/api/features/search"), "{\"filters\":[" + filter + "]}");
        }
    }

    private static String data(String json) {
        return "{\"data\":" + json + "}";
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String body) throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private long create(String url, String json) throws Exception {
        String body = send(post(url), data(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.data.id")).longValue();
    }
}
