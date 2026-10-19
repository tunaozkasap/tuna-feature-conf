package com.tuna.feature.conf.service.util;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EvidenceMaskingTest {

    @Test
    @DisplayName("E-mail addresses keep only their first character and domain")
    void masksEmail() {
        assertThat(EvidenceMasking.maskEmail("john.doe@example.com")).isEqualTo("j***@example.com");
        assertThat(EvidenceMasking.maskEmail("not-an-address")).isEqualTo(EvidenceMasking.MASK);
        assertThat(EvidenceMasking.maskEmail(null)).isNull();
    }

    @Test
    @DisplayName("Values are masked by the name they are sent under")
    void masksByName() {
        assertThat(EvidenceMasking.maskValue("password", "s3cret")).isEqualTo(EvidenceMasking.MASK);
        assertThat(EvidenceMasking.maskValue("X-Api-Key", "abc")).isEqualTo(EvidenceMasking.MASK);
        assertThat(EvidenceMasking.maskValue("EMAIL", "jane@example.com")).isEqualTo("j***@example.com");
        assertThat(EvidenceMasking.maskValue("COUNTRY", "TR")).isEqualTo("TR");
    }

    @Test
    @DisplayName("JSON fields are masked by name at any depth without changing the original")
    void masksJson() {
        ObjectNode original = JsonNodeFactory.instance.objectNode().put("featureCode", "DARK_MODE").put("token", "t0k");
        original.putObject("user").put("email", "jane.doe@example.com").put("id", 7);

        ObjectNode masked = EvidenceMasking.maskJson(original);

        assertThat(masked.toString()).isEqualTo(
                "{\"featureCode\":\"DARK_MODE\",\"token\":\"***\",\"user\":{\"email\":\"j***@example.com\",\"id\":7}}");
        assertThat(original.path("token").asText()).isEqualTo("t0k");
        assertThat(EvidenceMasking.maskJson(null)).isNull();
    }

    @Test
    @DisplayName("Passwords are removed from connection URLs")
    void masksUrl() {
        assertThat(EvidenceMasking.maskUrl("jdbc:h2:mem:db;USER=sa;PASSWORD=topsecret;MODE=PostgreSQL"))
                .isEqualTo("jdbc:h2:mem:db;USER=sa;PASSWORD=***;MODE=PostgreSQL");
        assertThat(EvidenceMasking.maskUrl("jdbc:postgresql://admin:topsecret@db:5432/app?password=x&ssl=true"))
                .isEqualTo("jdbc:postgresql://admin:***@db:5432/app?password=***&ssl=true");
        assertThat(EvidenceMasking.maskUrl("jdbc:h2:mem:featuredb;DB_CLOSE_DELAY=-1"))
                .isEqualTo("jdbc:h2:mem:featuredb;DB_CLOSE_DELAY=-1");
    }
}
