package com.tuna.feature.conf.service.evidence;

import com.tuna.feature.conf.service.util.EvidenceMasking;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

/**
 * Entry point of the application startup: logs the configuration the application started with, once it is ready.
 * Passwords are never written, only whether one is configured.
 */
@Component
@RequiredArgsConstructor
public class StartupEvidence {

    private final Environment environment;

    @EventListener(ApplicationReadyEvent.class)
    public void recordStartup(ApplicationReadyEvent event) {
        s().kv("execution", "startup");
        try {
            s().kv("application", environment.getProperty("spring.application.name"))
               .kv("activeProfiles", environment.getActiveProfiles())
               .kv("defaultProfiles", environment.getDefaultProfiles())
               .kv("port", serverPort())
               .kv("springBootVersion", SpringBootVersion.getVersion())
               .kv("javaVersion", Runtime.version().toString())
               .kv("startupMs", event.getTimeTaken() != null ? event.getTimeTaken().toMillis() : null);
            recordDatasource();
        } finally {
            s().logNow();
        }
    }

    private String serverPort() {
        // local.server.port is the port actually bound, e.g. with server.port=0 in tests
        String boundPort = environment.getProperty("local.server.port");
        return boundPort != null ? boundPort : environment.getProperty("server.port", "8080");
    }

    private void recordDatasource() {
        String password = environment.getProperty("spring.datasource.password");
        s().f("datasource")
           .kv("url", EvidenceMasking.maskUrl(environment.getProperty("spring.datasource.url")))
           .kv("driver", environment.getProperty("spring.datasource.driver-class-name"))
           .kv("username", environment.getProperty("spring.datasource.username"))
           .kv("passwordSet", password != null && !password.isEmpty())
           .kv("ddlAuto", environment.getProperty("spring.jpa.hibernate.ddl-auto"))
           .kv("h2ConsoleEnabled", environment.getProperty("spring.h2.console.enabled", Boolean.class, false));
    }
}
