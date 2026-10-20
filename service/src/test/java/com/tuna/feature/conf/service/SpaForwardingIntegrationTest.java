package com.tuna.feature.conf.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * The service jar serves the UI: real HTTP requests against the running app check that {@code index.html} answers
 * {@code /} and the UI's client-side routes (SpaForwardController), and that the API, the OpenAPI spec, Swagger and
 * the H2 console are not swallowed by it.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SpaForwardingIntegrationTest {

    /** Where Vite's build lands in the ui jar; Spring Boot serves META-INF/resources as static content. */
    private static final String INDEX_HTML = "META-INF/resources/index.html";

    /** The element the UI mounts into: present in index.html, in nothing else the service answers. */
    private static final String UI_ROOT = "<div id=\"root\">";

    private final TestRestTemplate rest;

    @Autowired
    SpaForwardingIntegrationTest(TestRestTemplate rest) {
        this.rest = rest;
    }

    @Test
    @DisplayName("GET / answers with index.html")
    void servesIndexAtRoot() throws IOException {
        String indexHtml = builtIndexHtml();

        ResponseEntity<String> response = rest.getForEntity("/", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType()).isNotNull();
        assertThat(response.getHeaders().getContentType().isCompatibleWith(MediaType.TEXT_HTML)).isTrue();
        assertThat(response.getBody()).isEqualTo(indexHtml);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/projects", "/projects/1", "/projects/1/features/2", "/projects/1/evaluate"})
    @DisplayName("Client-side routes are forwarded to index.html")
    void forwardsClientSideRoutes(String route) throws IOException {
        String indexHtml = builtIndexHtml();

        ResponseEntity<String> response = rest.getForEntity(route, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(indexHtml);
    }

    @Test
    @DisplayName("/api/** answers with the API's JSON, not the UI")
    void leavesTheApiAlone() {
        ResponseEntity<String> response = rest.getForEntity("/api/projects", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType()).isNotNull();
        assertThat(response.getHeaders().getContentType().isCompatibleWith(MediaType.APPLICATION_JSON)).isTrue();
        assertThat(response.getBody()).contains("\"success\":true").doesNotContain(UI_ROOT);
    }

    @Test
    @DisplayName("/api-docs answers with the OpenAPI spec, not the UI")
    void leavesTheOpenApiSpecAlone() {
        ResponseEntity<String> response = rest.getForEntity("/api-docs", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"openapi\"").doesNotContain(UI_ROOT);
    }

    @Test
    @DisplayName("/swagger-ui.html leads to Swagger UI, not the UI")
    void leavesSwaggerAlone() {
        // TestRestTemplate follows springdoc's redirect to /swagger-ui/index.html
        ResponseEntity<String> response = rest.getForEntity("/swagger-ui.html", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Swagger UI").doesNotContain(UI_ROOT);
    }

    @Test
    @DisplayName("/h2-console answers with the H2 console, not the UI")
    void leavesTheH2ConsoleAlone() {
        ResponseEntity<String> response = rest.getForEntity("/h2-console/", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsIgnoringCase("H2 Console").doesNotContain(UI_ROOT);
    }

    @Test
    @DisplayName("An address outside the UI's routes is a 404, not the UI")
    void doesNotForwardUnknownAddresses() {
        ResponseEntity<String> response = rest.getForEntity("/no-such-page", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).doesNotContain(UI_ROOT);
    }

    /**
     * The built index.html from the ui jar. A build with {@code -Dskip.ui=true} leaves the ui jar empty; then there is
     * no UI to serve and the test calling this is skipped (not failed), so backend-only builds still pass.
     */
    private static String builtIndexHtml() throws IOException {
        ClassPathResource index = new ClassPathResource(INDEX_HTML);
        assumeTrue(index.exists(), INDEX_HTML + " is not on the classpath (built with -Dskip.ui=true?)");
        try (InputStream in = index.getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
