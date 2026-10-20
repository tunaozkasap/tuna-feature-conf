# tuna-feature-conf

Feature configuration service: projects, environments, features, qualifiers and rules, plus an evaluation endpoint
that resolves a feature's value for a request context.

## Layout

- Spring Boot 3.2, Java 21, Maven multi-module: `model`, `persistence`, `service`
- `service` holds the controllers, services, error handling and evidence logging
  (`com.tuna.feature.conf.service.*`)
- Default database is in-memory H2 (`service/src/main/resources/application.yml`); the app listens on port 8080
- Request bodies are wrapped in `{"data": ...}`

## Frontend (decided, not built yet)

There is no UI yet. When it's built, it uses this stack and build setup; don't introduce another framework.

- **Stack:** React + TypeScript, built with Vite.
- **API types:** generated from the springdoc OpenAPI spec (`/api-docs`) with `openapi-typescript`, never written by
  hand, so they stay in step with the DTOs, the `{"data": ...}` wrapper and the unified error body.
- **Data fetching:** TanStack Query (caching, refetch after saves, loading and error states).
- **Components:** Mantine (tables, forms, selects, notifications).
- **Errors:** show the error body's `message` to the user, plus its `requestId`, so a failure reported from the UI
  can be traced to its evidence line.
- **Screens:** CRUD for projects, environments, features, qualifiers and rules, and an evaluation tester (feature +
  environment + request context → resolved value).

Build integration:

- A `ui` Maven module (Vite project and `pom.xml`), listed before `service` in the root pom.
- `frontend-maven-plugin` installs a pinned Node/npm inside the module and runs `npm ci` and `npm run build`, so
  `mvn clean install` builds the UI with no Node installed globally.
- The build output is packaged under `META-INF/resources/` in the `ui` jar. `service` depends on `ui`, and Spring
  Boot serves it as static content, so the single service jar serves both `/api/**` and the UI on port 8080.
- A forward controller in `service` sends client-side routes (anything that isn't `/api`, Swagger, `/api-docs` or
  `/h2-console`, and isn't a static file) to `index.html`.
- Local development: run the service, then `npm run dev` in `ui/`. Vite's dev server proxies `/api` to
  `localhost:8080`.
- A `skip.ui` Maven property (`-Dskip.ui=true`) skips the npm steps (including the frontend tests) for backend-only
  builds.

### Frontend testing

**No end-to-end tests for now: don't write, add or set up any.** That means no Playwright, Cypress, Selenium or other
browser automation against a running app, and no e2e config, dependencies, browser downloads or Maven profile.

**No mocked API, ever.** No MSW, no mocked `fetch`, no `vi.mock` of the API client or query hooks, no fake response
fixtures. Frontend tests talk to the real backend.

**The real backend is always started before the frontend tests run:**

- Vitest's `globalSetup` copies the built service jar (`service/target/service-*.jar`) to `ui/target/test-backend/`
  and starts the copy with `java -jar`, on a free port it picks at startup (never a fixed port, so parallel runs
  don't clash), with a fresh in-memory H2. Running a copy matters on Windows: a running jar is locked, and a backend
  build running at the same time must still be able to replace `service/target`.
- It writes the backend's output to `ui/target/test-backend.log` and waits until `/api-docs` answers.
- If the backend doesn't come up, the test run fails. Never skip the tests or fall back to mocks.
- The teardown stops the backend after the run.
- The API client gets its base URL from configuration; `globalSetup` hands the tests `http://localhost:<port>`.

Within that setup, every kind of test except e2e is welcome and expected with UI changes:

- **Unit tests:** Vitest for hooks, utilities, API helpers, mapping and validation logic. Whatever touches the API
  calls the running backend.
- **Component tests:** React Testing Library with Vitest (jsdom), rendering screens that load and save through the
  real API: forms, server-side validation messages, tables, loading and empty states, and error notifications that
  show the real `requestId`. Find elements by role, label and visible text; use `data-testid` only where nothing else
  identifies an element.
- **Test data:** each test creates what it needs through the API, with unique names (as
  `EvidenceLoggingIntegrationTest` does with UUIDs), so tests don't depend on each other on the shared database.
- **Evidence on failure:** each test sends its own `X-Request-Id` (e.g. `ui-<test name>`, matching
  `[A-Za-z0-9._-]{1,64}`). When a test fails, print that test's evidence lines from `ui/target/test-backend.log`
  (with `jq`), so the failure shows what the backend decided.
- **Type check:** `tsc` runs in the build, so a contract change in the generated types fails the build.
- **Serving the UI from the jar:** a `@SpringBootTest(webEnvironment = RANDOM_PORT)` test in `service` sends real HTTP
  requests. It checks that `GET /` returns `index.html`, that client-side routes forward to it, and that `/api/**`,
  `/api-docs`, `/swagger-ui.html` and `/h2-console` don't.

Build order: the frontend tests need the packaged service jar, and `service` depends on `ui`. So the frontend tests
are not bound to the default lifecycle: `mvn clean install` builds the UI and runs the backend tests only. The
frontend tests have their own entry point, a `ui-tests` Maven profile on the `ui` module that runs `npm test`
(non-interactive, through `frontend-maven-plugin`) against an already built service jar. Keeping them separate is what
lets them run at the same time as the backend tests (see "Parallel test execution").

To check a UI change in a real browser, run the jar, go through the flow in the built-in browser, and look up the
requests' evidence by their `X-Request-Id`. That's a manual check, not a test to commit.

**Later:** e2e tests will use **Playwright** when they're added: a small smoke suite against the real service jar, in
its own Maven profile outside the default build, sending a per-test `X-Request-Id` and attaching that test's evidence
lines to the report on failure. Only add it when the user explicitly asks for it.

## Ground rules

- No Java streams; use plain loops.
- `execution-evidence-logger` is the only logging library. Don't add SLF4J/`@Slf4j` loggers; record facts on the
  request's evidence with `s()` (`ScopedEvidence.s`).
- Mask anything sensitive before it reaches the evidence, using `util/EvidenceMasking` (secrets, e-mails,
  connection-URL passwords, qualifier values).
- Errors go through `ServiceException` and `GlobalExceptionHandler`, which produce the unified JSON error response.

## Parallel test execution

Running tests in parallel is a hard requirement. Every test must be safe to run concurrently with any other, and
nothing in the build may force the backend and frontend suites to run one after the other.

### Backend: threads in one JVM

- Parallel execution is on: JUnit 5 parallel execution, in threads (not forked JVMs), with classes and methods
  concurrent: `junit.jupiter.execution.parallel.enabled=true`, `...mode.default=concurrent` and
  `...mode.classes.default=concurrent` in `service/src/test/resources/junit-platform.properties`.
- **No shared mutable global state in tests.** Don't set and reset a static per test. Example:
  `EvidenceWriters.setWriter(...)` is a single JVM-wide slot, so tests never call it. `CapturedEvidence` is the one
  evidence writer for the test JVM (registered in the test `META-INF/services`, so it is discovered once and never
  reset); it keeps each evidence by `requestId` and still writes it to the console. A test sends
  `CapturedEvidence.newRequestId()` as its `X-Request-Id` and reads its own evidence with
  `CapturedEvidence.forRequest(id)`.
- **Unique data per test** (UUID-based names and codes). Never assume an empty table or a global count; query only
  the data the test created, e.g. by its own `projectId`.
- **No fixed ports:** use `MockMvc` or `webEnvironment = RANDOM_PORT`.
- Don't use `@DirtiesContext`; it rebuilds the shared Spring context under other running tests.
- `@ResourceLock` / `@Isolated` only as a last resort, with a comment saying what the shared resource is.

### Frontend: threads in one Node process

- Vitest with `pool: 'threads'`; test files run in parallel worker threads. `describe.concurrent` / `test.concurrent`
  are welcome where the tests are independent.
- All workers share the one backend that `globalSetup` started. Each test creates its own data with unique names and
  sends its own `X-Request-Id`, so tests and their evidence lines never mix.

### Backend and frontend suites at the same time

- Build once: `mvn clean install -DskipTests`.
- Then run both suites concurrently, as separate processes: the backend tests (`mvn -pl service test`) and the
  frontend tests (`ui-tests` profile). They share nothing: the backend tests run in their own JVM with their own
  in-memory H2, and the frontend tests start a copy of the jar on a free port with its own H2.
- When the UI is built, add one script that does this build, starts both suites concurrently, waits for both and
  fails if either fails. On CI, the same split: one build job, then two parallel test jobs.

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
2. Find the request's line with `jq` (1.8.2, on the user PATH; in a shell started before it was installed, use
   `/c/Users/tunao/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe/jq.exe`).
   The output mixes plain Spring log lines with evidence lines, so keep only the JSON lines first:

   ```bash
   grep '^{' app.log | jq 'select(.evidence.requestId=="<id>") | .evidence'
   grep '^{' app.log | jq -c 'select(.evidence.severity=="WARN" or .evidence.severity=="ERROR") | .evidence | {requestId, status, path, error: .error.technicalMessage}'
   ```

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

- Build everything and run the backend tests: `mvn clean install` (see "Parallel test execution" for running the
  backend and frontend suites together)
- Test only the service module: `mvn -pl service test`
- Run one test class: `mvn -pl service test -Dtest=EvidenceLoggingIntegrationTest`
- Run the app (after an `install`, so `model` and `persistence` are in the local repository):
  `mvn -pl service spring-boot:run`, or `java -jar service/target/service-0.0.1-SNAPSHOT.jar`
- Once started: API on `http://localhost:8080/api/...`, Swagger UI at `/swagger-ui.html`, OpenAPI spec at
  `/api-docs`, H2 console at `/h2-console`

`ERROR ... SqlExceptionHelper : Referential integrity constraint violation` lines during the tests are expected: some
tests trigger integrity violations on purpose. Judge the build by the test summary and `BUILD SUCCESS`.

To check a change end to end, start the app in the background with its output in a scratchpad file, send a request
with your own `X-Request-Id`, then look up that id with `jq` (see the evidence section above). Stop the app when you
are done, so port 8080 is free.
