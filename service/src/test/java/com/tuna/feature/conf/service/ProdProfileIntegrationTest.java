package com.tuna.feature.conf.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.ActiveProfiles;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The {@code prod} profile the Scaleway server runs with (application-prod.yml): the service serves HTTPS itself, the
 * H2 console is off and error responses leave out the technical details.
 * <p>
 * On the server the certificate is Let's Encrypt's; here it is a self-signed one for {@code localhost}, made for this
 * test only ({@code src/test/resources/tls}), and the client trusts exactly that certificate.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.tls.certificate=classpath:tls/test-certificate.pem",
        "app.tls.private-key=classpath:tls/test-private-key.pem",
        // Nothing renews the test certificate; watching it would only start a file watcher thread
        "spring.ssl.bundle.pem.web.reload-on-update=false"
})
@ActiveProfiles("prod")
class ProdProfileIntegrationTest {

    @LocalServerPort
    private int port;

    @Test
    @DisplayName("Serves the API over HTTPS")
    void servesTheApiOverHttps() throws Exception {
        HttpResponse<String> response = get("/api/projects");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"success\":true");
    }

    @Test
    @DisplayName("/h2-console is not served")
    void hasNoH2Console() throws Exception {
        HttpResponse<String> response = get("/h2-console/");

        assertThat(response.statusCode()).isEqualTo(404);
    }

    @Test
    @DisplayName("An error response has its message and requestId, but no technicalMessage or context")
    void leavesOutTechnicalDetails() throws Exception {
        HttpResponse<String> response = get("/api/features/987654321");

        assertThat(response.statusCode()).isEqualTo(404);
        assertThat(response.body()).contains("\"message\"", "\"requestId\"").doesNotContain("technicalMessage", "\"context\"");
    }

    private HttpResponse<String> get(String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("https://localhost:" + port + path)).GET().build();
        return httpsClient().send(request, HttpResponse.BodyHandlers.ofString());
    }

    /** An HTTPS client that trusts the test certificate, and nothing else. */
    private static HttpClient httpsClient() throws Exception {
        KeyStore trusted = KeyStore.getInstance(KeyStore.getDefaultType());
        trusted.load(null, null);
        try (InputStream in = new ClassPathResource("tls/test-certificate.pem").getInputStream()) {
            Certificate certificate = CertificateFactory.getInstance("X.509").generateCertificate(in);
            trusted.setCertificateEntry("test", certificate);
        }
        TrustManagerFactory trustManagers = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        trustManagers.init(trusted);
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, trustManagers.getTrustManagers(), null);
        return HttpClient.newBuilder().sslContext(sslContext).build();
    }
}
