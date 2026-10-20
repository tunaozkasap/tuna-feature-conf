# tuna-feature-conf

Feature configuration service: projects, environments, features, qualifiers and rules, plus an evaluation endpoint
that resolves a feature's value for a request context.

## Layout

- Spring Boot 3.2, Java 21, Maven multi-module: `model`, `persistence`, `service`
- `service` holds the controllers, services, error handling and evidence logging
  (`com.tuna.feature.conf.service.*`)
- Default database is in-memory H2 (`service/src/main/resources/application.yml`); the app listens on port 8080
- Request bodies are wrapped in `{"data": ...}`

## Ground rules

- No Java streams; use plain loops.
- `execution-evidence-logger` is the only logging library. Don't add SLF4J/`@Slf4j` loggers; record facts on the
  request's evidence with `s()` (`ScopedEvidence.s`).
- Mask anything sensitive before it reaches the evidence, using `util/EvidenceMasking` (secrets, e-mails,
  connection-URL passwords, qualifier values).
- Errors go through `ServiceException` and `GlobalExceptionHandler`, which produce the unified JSON error response.

## Debugging with execution evidence

When a request doesn't do what it should (wrong status, wrong evaluation result, missing data), diagnose it from that
request's evidence before guessing from the code.

### What gets written

- Every HTTP request writes **exactly one JSON line** when it finishes (`evidence/RequestEvidenceFilter`). Startup
  writes one configuration line (`evidence/StartupEvidence`).
- Each request has a request id, returned in the `X-Request-Id` response header and in the `requestId` field of error
  responses. A caller can send its own `X-Request-Id` (`[A-Za-z0-9._-]{1,64}`); anything else is replaced by a UUID.

### Where it goes

Evidence is written to the **console only** (`service/src/main/resources/logback-spring.xml`, `EVIDENCE` appender).
Nothing is kept on disk, so:

- When you start the app yourself, run it in the background and send its output to a file in your scratchpad, then
  search that file.
- When the user started it in their own terminal, read that terminal, or ask them for the output or the request id.
- After a restart, earlier evidence is gone.

### How to read it

1. Get the request id from the `X-Request-Id` header or the error body's `requestId`.
2. Find the line containing that id. Search for `"requestId":"<id>"`, or search for `"severity":"ERROR"` /
   `"severity":"WARN"` to find failures.
3. Check fields in this order:
   - `status`, `severity` (INFO < 400, WARN 4xx, ERROR 5xx), `durationMs`, `unhandledException`
   - `handler` (e.g. `EvaluationController.evaluateFeature`), `method`, `path`, `query` (masked), `headers`
   - `error`: `exceptionType`, `thrownAt`, `httpStatus`, `module`, `technicalMessageKey`, `technicalMessage` and the
     masked `context` (field errors with their violated constraint, `constraint` and `sqlState` for integrity
     violations). For 500s there is also `message`, `causeChain`, `rootCauseMessage` and `stackTrace`.
   - Service steps, one object per operation (e.g. `createUser`, `deleteProject`, `searchFeatures`), holding
     `input`, lookups (`found`), duplicate checks and results. Searches record `filters`, `pageRequest` and
     `pageResult` (`util/JpaQueryHelper`).
   - `evaluation` for evaluate requests: `validation.passed` (+ `reason`), `featureLookup`, `environmentLookup`,
     `rules.effectiveCount`, `evaluationOrder`, `ruleChecks[]` (`qualifierCode`, `expected`, `actual`, `result`, e.g.
     `match` / `missingContextValue`) and `decision` (`source` such as `RULE_MATCH` / `DEFAULT_FALLBACK`,
     `resolvedValue`, `reason` such as `noRuleMatched`).
   - `response.success`
4. Explain the cause using those facts (which step failed or which rule check didn't match, and why), then fix it.
   If the evidence doesn't hold the fact you needed, the gap is worth fixing too: record it in the step that owns it.

`EvidenceLoggingIntegrationTest` shows the expected shape of the evidence for the main cases (match, fallback,
not found, validation, integrity violation, search, masking). Keep it in step when you change what gets recorded.

## Build and test

Maven isn't on PATH in this environment and there is no wrapper. Ask the user how they build and run the project
before assuming a command.
