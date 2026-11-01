package com.tuna.feature.conf.service.seed;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DemoDataSeederTest {

    private static final Instant NOW = Instant.parse("2026-10-20T12:00:00Z");

    @Test
    @DisplayName("Rule times are relative to the startup in days or hours, or ISO instants")
    void resolvesTimes() {
        assertThat(DemoDataSeeder.resolveTime(null, NOW)).isNull();
        assertThat(DemoDataSeeder.resolveTime(" ", NOW)).isNull();
        assertThat(DemoDataSeeder.resolveTime("now", NOW)).isEqualTo(NOW);
        assertThat(DemoDataSeeder.resolveTime("now+7d", NOW)).isEqualTo(NOW.plus(Duration.ofDays(7)));
        assertThat(DemoDataSeeder.resolveTime("now-3h", NOW)).isEqualTo(NOW.minus(Duration.ofHours(3)));
        assertThat(DemoDataSeeder.resolveTime("2027-01-01T00:00:00Z", NOW)).isEqualTo(Instant.parse("2027-01-01T00:00:00Z"));
    }

    @Test
    @DisplayName("An unreadable time stops the seeding with a message naming the value")
    void rejectsUnknownTimes() {
        assertThatThrownBy(() -> DemoDataSeeder.resolveTime("next week", NOW))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("next week");
    }
}
