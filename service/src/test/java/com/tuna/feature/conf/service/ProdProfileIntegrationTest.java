package com.tuna.feature.conf.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The {@code prod} profile the Scaleway server runs with (application-prod.yml): the service listens on the server's
 * own address only, and the H2 console is switched off.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("prod")
class ProdProfileIntegrationTest {

    private final TestRestTemplate rest;
    private final Environment environment;

    @Autowired
    ProdProfileIntegrationTest(TestRestTemplate rest, Environment environment) {
        this.rest = rest;
        this.environment = environment;
    }

    @Test
    @DisplayName("Listens on 127.0.0.1 only")
    void listensOnTheServerItselfOnly() {
        assertThat(environment.getProperty("server.address")).isEqualTo("127.0.0.1");
    }

    @Test
    @DisplayName("/h2-console is not served")
    void hasNoH2Console() {
        ResponseEntity<String> response = rest.getForEntity("/h2-console/", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("The API still answers")
    void servesTheApi() {
        ResponseEntity<String> response = rest.getForEntity("/api/projects", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"success\":true");
    }
}
