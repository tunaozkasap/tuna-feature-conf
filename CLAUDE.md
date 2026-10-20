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
2. Find the line containing that id with `grep '"requestId":"<id>"'` (`jq` isn't installed). To find failures,
   search for `"severity":"ERROR"` or `"severity":"WARN"`.
3. Each line is `{"timestamp", "thread", "logger", "evidence": {...}}`; every field below is inside `evidence`.
   Check them in this order:
   - `status`, `severity` (INFO < 400, WARN 4xx, ERROR 5xx), `durationMs`, `unhandledException`
   - `handler` (e.g. `EvaluationController.evaluateFeature`), `route`, `pathVariables`, `method`, `path`, `query`
     (masked), `headers`
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

Maven 3.9.6 is installed at `C:\BIZ\TOOLS\maven\apache-maven-3.9.6` and is on the user PATH (`MAVEN_HOME` points
there too). A shell started before it was added won't find `mvn`; call
`/c/BIZ/TOOLS/maven/apache-maven-3.9.6/bin/mvn` directly in that case. JDK 21 (Eclipse Adoptium) is on PATH.

- Build everything and run all tests: `mvn clean install`
- Test only the service module: `mvn -pl service test`
- Run one test class: `mvn -pl service test -Dtest=EvidenceLoggingIntegrationTest`
- Run the app (after an `install`, so `model` and `persistence` are in the local repository):
  `mvn -pl service spring-boot:run`, or `java -jar service/target/service-0.0.1-SNAPSHOT.jar`
- Once started: API on `http://localhost:8080/api/...`, Swagger UI at `/swagger-ui.html`, OpenAPI spec at
  `/api-docs`, H2 console at `/h2-console`

`ERROR ... SqlExceptionHelper : Referential integrity constraint violation` lines during the tests are expected: some
tests trigger integrity violations on purpose. Judge the build by the test summary and `BUILD SUCCESS`.

To check a change end to end, start the app in the background with its output in a scratchpad file, send a request
with your own `X-Request-Id`, then search the file for that id (see the evidence section above). Stop the app when you
are done, so port 8080 is free.
