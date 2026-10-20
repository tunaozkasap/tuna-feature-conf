# UI: how to read this code

The web UI of the feature configuration service. It is written to be read by a backend developer: every file starts
with a comment saying what it is for, there are no clever abstractions, and each screen is one file you can read top
to bottom.

## The stack, in backend terms

| Piece | What it does | Backend analogy |
|---|---|---|
| **React** | A *component* is a function that returns the HTML to show. When its data changes, React calls it again and updates the page. | A Thymeleaf template that is also the controller |
| **TypeScript** | JavaScript with types. `tsc` runs in the build, like `javac`. | Java's type checker |
| **Mantine** | Ready-made components: `Table`, `Modal`, `TextInput`, `Select`, `Button`, notifications. | A UI component library |
| **TanStack Query** | Loads data from the API, caches it, reloads it after a save, and tracks loading and error states. | A cache like `@Cacheable`, with eviction after writes |
| **React Router** | Maps the address (`/projects/1/features`) to a screen. | `@RequestMapping` |
| **Vite** | Builds everything into static files; `npm run dev` serves them with live reload. | The Maven build plus devtools |
| **openapi-typescript** | Generates `src/api/schema.d.ts` from the service's `/api-docs`. | Generating client classes from an OpenAPI spec |

Two React words you will see everywhere:

- **Hook**: a function whose name starts with `use` (`useState`, `useFeatures`). It can only be called at the top of
  a component. `useState` keeps a value between calls of the component (e.g. "is the dialog open?"); calling its
  setter redraws the component.
- **Props**: the parameters of a component, written like HTML attributes: `<RuleStatusBadge rule={rule} />` calls
  `RuleStatusBadge({ rule })`.

## Where things are

```
ui/
├── index.html                 the page the browser loads; it only has <div id="root"> and loads src/main.tsx
├── vite.config.ts             build output (into the jar), dev server proxy, test settings
├── pom.xml                    Maven: installs Node, runs npm ci and npm run build (frontend-maven-plugin)
├── src/
│   ├── main.tsx               start: puts <App /> on the page inside the providers
│   ├── App.tsx                every address and the page it shows  ← start reading here
│   ├── AppProviders.tsx       theme, notifications, data cache (also used by the tests)
│   ├── queryClient.ts         data cache settings; every failed save shows an error notification
│   ├── api/                   everything that talks to the backend
│   │   ├── schema.d.ts        GENERATED from /api-docs, never edit by hand
│   │   ├── types.ts           friendly names for the generated types (Feature, Rule, ...)
│   │   ├── http.ts            the one place that does HTTP: request ids, errors, search
│   │   ├── queryKeys.ts       names of the cached lists
│   │   └── projects.ts, environments.ts, qualifiers.ts, features.ts, rules.ts, evaluation.ts
│   │                          per entity: plain API calls, then the hooks the screens use
│   ├── components/            pieces used by several screens (layout, badges, delete button, page states)
│   ├── hooks/useProjectId.ts  the project id from the address
│   ├── utils/                 logic without UI: rule status and evaluation order (mirrors the Java code), dates
│   └── pages/                 one folder per screen: the page and its form
└── test/                      test setup: starts the real service jar before the frontend tests
```

## The screens

| Address | Screen | What it answers |
|---|---|---|
| `/projects` | Projects | Which applications are configured here? |
| `/projects/:id` | Overview | How many features and rules, which feature has rules in which environment, what starts or ends soon? |
| `/projects/:id/features` | Features | What can the application ask for? Where is each feature configured? |
| `/projects/:id/features/:featureId` | Feature | What decides this feature's value, per environment, in the order the backend checks it? |
| `/projects/:id/rules` | Rules | Questions across features: what's scheduled, what targets `COUNTRY = DE`, what's off in PROD? |
| `/projects/:id/evaluate` | Evaluate | What does this feature resolve to for this request, and why? |
| `/projects/:id/environments` | Environments | Where does the application run? |
| `/projects/:id/qualifiers` | Qualifiers | What can rules match on, and in which order are they checked? |

The project picker in the header switches project and stays on the same screen.

## How one screen works: the Features page

Follow `src/pages/features/FeaturesPage.tsx`:

1. `useFeatures(projectId)` (in `api/features.ts`) asks TanStack Query for the list under the key
   `['project', 1, 'features']`. The first time, it calls `fetchFeatures`, which calls `searchAll` in `http.ts`,
   which sends `POST /api/features/search` with a fresh `X-Request-Id`.
2. While loading, `features.isPending` is true and the page shows `<Loading />`; on failure `features.isError` is
   true and `<ErrorAlert>` shows the backend's message and request id. Then `features.data` holds the list.
3. The page filters the list by the search box (plain `.filter`) and draws a Mantine `<Table>`.
4. "New feature" sets `creating` to true, which opens the `<Modal>` with `<FeatureForm>`.
5. `FeatureForm` calls `useSaveFeature(projectId)`. On save it sends `POST /api/features`; on success the hook
   *invalidates* `['project', 1]`, so every list of that project is loaded again and every screen shows the new
   feature. On failure a notification shows the backend's message, and validation messages appear next to the fields.

Every other screen works the same way.

## Errors and evidence

Every request sends its own `X-Request-Id` (`ui-...`). When something fails, the notification shows the backend's
message and the request id; the Evaluate screen shows it for every result. With that id, find what the backend did
in its evidence line (see "Debugging with execution evidence" in the root `CLAUDE.md`).

## Tests

Each screen has a test file next to it (`FeaturesPage.test.tsx` next to `FeaturesPage.tsx`), and the API and utility
files too. They never fake the backend: `test/globalSetup.ts` starts a copy of the real service jar on a free port
before the run, and every test creates its own data through the API (`test/testData.ts`). A test renders the real
app at an address (`renderPage('/projects/7/features')` from `test/render.tsx`), then clicks and types like a user.
When a test fails, the backend's evidence lines for that test's requests are printed under the failure.

## Common changes

**A DTO changed in Java.** Start the service, run `npm run generate-api`, then `npm run build`. `tsc` lists every
place in the UI that no longer fits. The frontend tests also fail when `schema.d.ts` is out of date.

**A new field on a screen.** Add it to the form's `initialValues` (and `validate` if needed), add an input with
`{...form.getInputProps('field')}`, and show it in the table.

**A new screen.** Add a file in `src/pages/...`, a `<Route>` in `App.tsx`, a menu entry in
`components/AppLayout.tsx`. Addresses under `/projects/...` already work on reload; another top-level address needs
a mapping in the service's `SpaForwardController`.

## Commands

Run them in `ui/` (Node is installed into `ui/node` by Maven; a global Node 20 works too).

| Command | What it does |
|---|---|
| `npm run dev` | UI on http://localhost:5173 with live reload, API calls passed to the service on port 8080 (`API_URL=http://localhost:18080 npm run dev` for another port) |
| `npm run build` | Type check and build into `target/classes/META-INF/resources` (what the jar serves) |
| `npm test` | Frontend tests, against a real service started from `service/target/service-*.jar` |
| `npm run generate-api` | Regenerate `src/api/schema.d.ts` from the service running on port 8080 |

From the repository root, `mvn clean install` builds the UI into the service jar; `-Dskip.ui=true` skips it.
