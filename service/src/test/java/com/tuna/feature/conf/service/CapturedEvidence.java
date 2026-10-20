package com.tuna.feature.conf.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.github.tunaozkasap.execlog.EvidenceWriter;
import com.github.tunaozkasap.execlog.logback.LogbackEvidenceWriter;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * The evidence writer for the whole test JVM: keeps every evidence by its {@code requestId} and then writes it to the
 * console as usual.
 * <p>
 * It is registered in {@code META-INF/services} of the test classpath with a priority above
 * {@link LogbackEvidenceWriter}, so the library discovers it once and nothing ever sets or resets
 * {@code EvidenceWriters}. Tests run in parallel threads: each sends its own {@link #newRequestId()} and reads its
 * evidence with {@link #forRequest(String)}.
 */
public class CapturedEvidence implements EvidenceWriter {

    private static final Map<String, List<ObjectNode>> BY_REQUEST_ID = new ConcurrentHashMap<>();

    private final EvidenceWriter console = new LogbackEvidenceWriter();

    @Override
    public void write(ObjectNode evidence) {
        JsonNode requestId = evidence.get("requestId");
        if (requestId != null) {
            BY_REQUEST_ID.computeIfAbsent(requestId.asText(), id -> new CopyOnWriteArrayList<>()).add(evidence);
        }
        console.write(evidence);
    }

    @Override
    public int priority() {
        return LogbackEvidenceWriter.PRIORITY + 1;
    }

    /** A request id no other test uses, valid for the {@code X-Request-Id} header. */
    public static String newRequestId() {
        return "test-" + UUID.randomUUID();
    }

    /** Every evidence written for the given request id so far, in the order written. */
    public static List<ObjectNode> forRequest(String requestId) {
        List<ObjectNode> evidences = BY_REQUEST_ID.get(requestId);
        return evidences == null ? List.of() : new ArrayList<>(evidences);
    }
}
