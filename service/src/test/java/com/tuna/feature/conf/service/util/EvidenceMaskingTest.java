package com.tuna.feature.conf.service.util;

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
