package com.tuna.feature.conf.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tuna.feature.conf.service.evidence.RequestEvidenceFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * With {@code app.errors.include-technical-message=false} error responses leave out the technical message and the
 * context entirely, while the evidence still records both.
 */
@SpringBootTest(properties = "app.errors.include-technical-message=false")
@AutoConfigureMockMvc
public class ErrorResponseWithoutTechnicalMessageIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("A 404 has no technicalMessage and no context field, but the evidence has both")
    void notFoundWithoutTechnicalDetails() throws Exception {
        String requestId = CapturedEvidence.newRequestId();
        String body = mockMvc.perform(get("/api/features/987654").header(RequestEvidenceFilter.REQUEST_ID_HEADER, requestId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.module").value("Feature"))
                .andExpect(jsonPath("$.message").value("The requested feature does not exist."))
                .andExpect(jsonPath("$.requestId").value(requestId))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.technicalMessage").doesNotExist())
                .andExpect(jsonPath("$.context").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("technicalMessage").doesNotContain("context").doesNotContain("null");

        JsonNode error = onlyEvidence(requestId).path("error");
        assertThat(error.path("technicalMessage").asText()).isEqualTo("Feature not found with id '987654'");
        assertThat(error.path("context").path("value").asLong()).isEqualTo(987654L);
    }

    @Test
    @DisplayName("A validation error keeps the customer message, which names the invalid fields")
    void validationWithoutTechnicalDetails() throws Exception {
        String requestId = CapturedEvidence.newRequestId();
        mockMvc.perform(post("/api/features").header(RequestEvidenceFilter.REQUEST_ID_HEADER, requestId)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Some fields are missing or invalid: data."))
                .andExpect(jsonPath("$.technicalMessage").doesNotExist())
                .andExpect(jsonPath("$.context").doesNotExist());

        JsonNode error = onlyEvidence(requestId).path("error");
        assertThat(error.path("context").path("fieldErrors").path("data").path("constraint").asText())
                .isEqualTo("NotNull");
    }

    private static JsonNode onlyEvidence(String requestId) {
        List<ObjectNode> evidences = CapturedEvidence.forRequest(requestId);
        assertThat(evidences).hasSize(1);
        return evidences.get(0);
    }
}
