package com.tuna.feature.conf.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class OpenApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Should generate OpenAPI JSON docs with configured title and endpoints")
    void shouldReturnOpenApiDocumentation() throws Exception {
        mockMvc.perform(get("/api-docs"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.openapi").exists())
                .andExpect(jsonPath("$.info.title").value("Tuna Feature Configuration API"))
                .andExpect(jsonPath("$.info.version").value("0.0.1"))
                .andExpect(jsonPath("$.paths['/api/users']").exists())
                .andExpect(jsonPath("$.paths['/api/projects']").exists())
                .andExpect(jsonPath("$.paths['/api/products']").exists())
                .andExpect(jsonPath("$.paths['/api/features']").exists())
                .andExpect(jsonPath("$.paths['/api/qualifiers']").exists())
                .andExpect(jsonPath("$.paths['/api/rules']").exists())
                .andExpect(jsonPath("$.paths['/api/evaluations/evaluate']").exists());
    }

    @Test
    @DisplayName("Should access Swagger UI endpoint")
    void shouldAccessSwaggerUi() throws Exception {
        mockMvc.perform(get("/swagger-ui.html"))
                .andExpect(status().is3xxRedirection());

        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Swagger UI")));
    }
}
