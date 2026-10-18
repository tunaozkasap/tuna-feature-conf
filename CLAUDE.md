# tuna-feature-conf

Feature-flag configuration service: projects contain features; features have
qualifiers and rules; the evaluation endpoint resolves a feature for a given
context. Spring Boot backend + React frontend.

## Layout

- `pom.xml`: parent POM (Spring Boot 3.2, Java 21), modules below.
- `model/`: DTOs (`dto/`), paging/filter/sort value objects (`vo/`), CRUD wrappers (`crud/`), enums. No Spring dependencies beyond validation/Lombok.
- `persistence/`: JPA entities (`entity/`) and Spring Data repositories (`repository/`). H2 in-memory DB.
- `service/`: Spring Boot app (`Application.java`), REST controllers (`controller/`, all under `/api/...`), business logic (`service/`), `JpaQueryHelper` for filter/sort/paging, `GlobalExceptionHandler`.
- `frontend/`: React 18 + TypeScript + Vite. API calls go through `src/services/apiClient.ts`; one service file per resource in `src/services/`; shared types in `src/types/`.

Dependency direction: `service` → `persistence` → `model`. Keep entities out of `model` and DTOs out of `persistence`.

## Commands

Backend (from repo root):
- Build + test: `mvn -B verify`
- Run one test: `mvn -B -pl service -am test -Dtest=OpenApiIntegrationTest -Dsurefire.failIfNoSpecifiedTests=false`
- Run the app: `mvn -B -pl service -am spring-boot:run` → http://localhost:8080
  - Swagger UI: `/swagger-ui.html`, OpenAPI JSON: `/api-docs`, H2 console: `/h2-console`

Frontend (from `frontend/`):
- Install: `npm ci`
- Dev server: `npm run dev` (proxies `/api` to `localhost:8080`; override with `VITE_API_BASE_URL`)
- Type-check + build: `npm run build`
- Lint: `npm run lint`. Currently has pre-existing `no-explicit-any` errors; don't add new ones.

## Conventions

- DTOs use Lombok `@Data` + `@Builder`; follow the same pattern for new DTOs.
- New endpoint: DTO in `model`, entity + repository in `persistence`, service + controller in `service`, then a matching `src/services/<resource>Service.ts` and types in the frontend.
- Throw `ResourceNotFoundException` for missing resources; `GlobalExceptionHandler` maps it to a response.
- When changing an API, update the frontend types/services in the same change and run both `mvn -B verify` and `npm run build`.
- Test coverage is thin (one OpenAPI integration test). Add tests in `service/src/test/java` for new service logic.

## Claude Code setup

- `.claude/settings.json` enables the `core` plugin from `tunaozkasap/my-claude-plugins` and a SessionStart hook.
- `.claude/hooks/session-start.sh` pre-installs Maven and npm dependencies in cloud sessions only.
