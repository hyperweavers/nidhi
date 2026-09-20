---
title: AI Coding Agent Instructions
description: Repository architecture, conventions, workflows, and validation rules for AI coding agents.
---

# AI Coding Agent Instructions

Read this file before changing code. For frontend work, also read [DESIGN.md](DESIGN.md). For repository-specific workflow rules, read [AGENTS.md](AGENTS.md). These documents describe the current repository; do not import conventions from a different project without checking local patterns first.

## 1. System Architecture Overview

### Architecture

- **Architecture:** Nx-managed monorepo containing three independently buildable Angular single-page progressive web applications and shared libraries.
- **Applications:** `apps/pangu` (market and portfolio management), `apps/palan` (ESPP), and `apps/vatti` (financial tools).
- **Shared libraries:** `libs/shared/http`, `libs/shared/logger`, `libs/shared/sentry`, and `libs/shared/toast`.
- **E2E projects:** `apps/pangu-e2e`, `apps/palan-e2e`, and `apps/vatti-e2e`.
- **Runtime:** Browser-first Angular applications with Angular Service Worker support. This is not a server-rendered, microfrontend, or backend monolith system.

### Application structure

Each app generally follows this layout under `apps/<app>/src`:

```text
src/
  main.ts                 # Angular bootstrap entry point
  index.html              # Browser document shell
  styles.css              # Tailwind v4, Flowbite, theme tokens, global styles
  app/
    app.config.ts         # Providers and app-wide configuration
    app.routes.ts         # Lazy-loaded routes
    app.component.*       # Shell, navigation, global UI, PWA behavior
    adapters/             # App-specific adapters where present
    components/           # Reusable UI components
    constants.ts          # Routes, API paths, and app constants
    db/                   # Dexie/local database integration where present
    decorators/           # Integration decorators where present
    directives/           # Reusable directives
    helpers/              # App-specific helpers where present
    mocks/                # MSW handlers and mock data
    models/               # Domain interfaces and types
    pages/                # Route-level page components and templates
    pipes/                # Reusable presentation pipes where present
    services/             # Domain, data-access, settings, and UI services
    utils/                # Small app-local utilities
```

The exact subdirectories differ by application. Inspect the target app before creating a new folder.

### Data flow

1. `main.ts` bootstraps Angular.
2. `app.config.ts` registers the router, HTTP client/interceptors, service worker, charts, logging, Sentry, and shared providers.
3. `app.routes.ts` lazy-loads page components with `loadComponent`.
4. Pages compose reusable components and inject domain services.
5. Services call remote APIs through Angular `HttpClient`, use Dexie where applicable, and expose RxJS `Observable`s and/or Angular signals.
6. Templates consume streams with the `async` pipe and signals directly.
7. Shared libraries provide HTTP timeout behavior, logging, error reporting, and toast notifications.

There is no Redux/NgRx store, Prisma ORM, PostgreSQL integration, or server API implementation in this repository. Do not introduce one unless the task explicitly requires it.

## 2. Core Tech Stack And Ecosystem

### Versions and frameworks

- **Package manager:** pnpm `11.5.1` or compatible `>=11.0.0`.
- **Node.js:** `>=24.0.0`.
- **Angular:** `21.2.x`.
- **Nx:** `22.7.5`.
- **TypeScript:** `5.9.3`.
- **Build:** Angular application builder with esbuild.
- **Module resolution:** `bundler` in app projects.
- **Browser compilation:** ES2022 application target with DOM libraries; workspace base target is ES2015.

### Angular ecosystem

- Angular Router, Forms, CDK, and Service Worker.
- `@ngneat/until-destroy` for lifecycle-safe subscription cleanup where used.
- `chart.js`, `ng2-charts`, and `lightweight-charts` for charting.
- `date-fns` for date utilities.
- `dexie` and `dexie-export-import` for browser-local persistence and export where used.

### Styling

- Tailwind CSS `4.3.0`, configured in each app's `src/styles.css` with CSS-first `@theme` declarations.
- Flowbite `4.0.2` and Flowbite Datepicker `2.0.0`.
- PostCSS and Autoprefixer.
- Most visual styling is Tailwind classes in templates; component CSS files are intentionally small.
- Pangu maps `primary-*` to indigo, Palan to amber, and Vatti to pink.
- Follow [DESIGN.md](DESIGN.md) for palette, typography, spacing, dark mode, responsive behavior, and component rules.

### State and data access

- Use injectable Angular services for domain/data access.
- Use RxJS `Observable`s/operators for asynchronous API data and derived streams.
- Use Angular signals for local interactive state where the surrounding component uses them.
- Use existing Dexie/local database abstractions rather than accessing IndexedDB directly from components.
- API endpoints are centralized in each app's `constants.ts`; do not scatter URL strings.

## 3. Coding Standards And Conventions

### Formatting

Prettier is configured with single quotes, trailing commas, `prettier-plugin-organize-imports`, and `prettier-plugin-tailwindcss`. Run formatting through Nx and let the Tailwind plugin sort utility classes.

### TypeScript and Angular strictness

App projects enable:

- `strict: true`
- `noImplicitOverride: true`
- `noPropertyAccessFromIndexSignature: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `strictInjectionParameters: true`
- `strictInputAccessModifiers: true`
- `strictTemplates: true`
- `forceConsistentCasingInFileNames: true`

Rules for new code:

- Prefer explicit domain interfaces/types at service and API boundaries.
- Use narrow response interfaces and safe optional access for incomplete external responses.
- Avoid `any`; use `unknown` and narrow it for genuinely unknown values.
- Mark injected dependencies and immutable constants `private readonly` or `public readonly` as appropriate.
- Use explicit return types on public service methods and exported helpers when their contract matters.
- Use `interface` for extensible object contracts and `type` for unions/aliases, following nearby code rather than converting existing models unnecessarily.

### Angular conventions

- Components use `ChangeDetectionStrategy.OnPush`; Nx generator defaults configure this.
- Prefer Angular's `inject()` API.
- Use standalone components and route-level `loadComponent` lazy loading.
- Use kebab-case Angular filenames with conventional suffixes: `.component.ts`, `.page.ts`, `.service.ts`, `.directive.ts`, `.pipe.ts`, `.guard.ts`, and `.spec.ts`.
- Use PascalCase for exported classes and camelCase for methods/properties.
- Keep templates and component CSS in adjacent files unless the feature already uses another local convention.
- Clean up subscriptions with `untilDestroyed`, the `async` pipe, signals, or another lifecycle-safe pattern.

### ESLint and module boundaries

The root ESLint configuration enforces Nx module boundaries, buildable-library dependency rules, `no-console: error`, and no extra semicolons. Use these path aliases for shared functionality:

```text
@nidhi/shared-http
@nidhi/shared-logger
@nidhi/shared-sentry
@nidhi/shared-toast
```

Do not create cross-app relative imports. Keep app-specific domain code inside its app unless it is genuinely reusable and belongs in a shared library. Use the injected shared logger instead of `console` calls.

### Templates and accessibility

- Use Angular control flow and bindings consistent with the surrounding file.
- Prefer semantic elements and native controls.
- Give icon-only controls accessible names and preserve `sr-only` labels.
- Preserve `role="status"` and equivalent loading/empty-state semantics.
- Preserve responsive and dark-mode classes; consult [DESIGN.md](DESIGN.md).

### Error handling

- Services commonly use RxJS `catchError`, log through `LOGGER`, and return a safe fallback such as an empty collection when that is the established contract.
- Send unexpected or important exceptions through shared logger/Sentry integration.
- Expose loading, empty, and error states where users need to distinguish them.
- There is no repository-wide `{ data, error }` wrapper shape; preserve each service's existing contract.
- Do not swallow errors silently.

## 4. Project Guidelines And Best Practices

### Before editing

1. Read this file, [AGENTS.md](AGENTS.md), and [DESIGN.md](DESIGN.md) for UI work.
2. Identify the owning app or shared library and inspect its nearest analogous implementation and test.
3. Check the relevant `project.json`, route, model, and service before adding an abstraction.
4. Preserve unrelated user changes in a dirty worktree.
5. Use `pnpm nx`, not raw `nx` or `npx nx`, for repository tasks.

### Components and tests

- Keep route composition in `pages/` and reusable UI in `components/`.
- Keep business/data logic in services rather than templates or large page methods.
- Co-locate unit tests with implementations using `.spec.ts` and follow neighboring MSW/test utilities.
- Avoid arbitrary line-count limits; extract components when a page owns repeated markup, independent state, or a separate interaction.
- Reuse existing shared components and libraries before creating parallel implementations.
- Add tests for new behavior, especially service mapping, persistence, error fallbacks, routes, and user-visible state transitions.

### Performance

- Preserve lazy loading through `loadComponent`.
- Keep OnPush change detection and avoid unnecessary global subscriptions.
- Use the `async` pipe, signals, or lifecycle-safe subscriptions.
- Use `shareReplay(1)` only for intentional cached/replayed service data and understand invalidation behavior.
- Keep chart/heavy UI dependencies behind existing page boundaries where possible.
- Respect production budgets: initial bundle warning at 1 MB/error at 2 MB; component-style warning at 2 KB/error at 4 KB.
- Do not disable Nx caching or production optimizations without a specific reason.

### Security and configuration

- Treat remote API data and imported files as untrusted; validate/narrow before rendering or persisting.
- Never commit secrets, tokens, credentials, or private endpoints.
- Do not expose new secrets in browser-bundled code.
- Use normal Angular template binding/sanitization. Do not introduce `innerHTML`, security bypass APIs, or dynamic scripts without documented security review.
- Keep API paths in `Constants.api` and use `HttpClient` plus the configured timeout interceptor.
- Preserve MSW handlers and mock data for tests instead of calling live services.
- Validate import/export and IndexedDB input, handle failures, and retain existing confirmation flows for destructive operations.

### UI and design

- Read [DESIGN.md](DESIGN.md) before frontend changes.
- Reuse `primary-*` aliases, Tailwind/Flowbite primitives, Inter/Poppins typography, spacing rhythm, and documented dark-mode pairings.
- Do not add a new color, font, breakpoint, radius, or component variant until existing tokens and patterns have been checked.
- Update [DESIGN.md](DESIGN.md) when introducing a reusable visual pattern not already documented.

## 5. Tooling, Scripts, And Automation

Run commands from the workspace root with pnpm. Replace `<app>` with `pangu`, `palan`, or `vatti`.

### Install and dependency management

```bash
pnpm install
pnpm update-deps:dry-run
pnpm update-deps
```

The migration script is for planned Nx/dependency migrations and rewrites dependency metadata:

```bash
pnpm migrate
```

### Development and builds

```bash
pnpm nx serve <app>
pnpm nx serve <app> --configuration=with-mocks
pnpm nx build <app>
pnpm nx build <app> --configuration=development
pnpm nx run <app>:serve-static
```

Build/serve targets generate version and Sentry files first. The `with-mocks` configuration replaces the environment with its mock-enabled environment.

### Formatting, linting, and type checking

```bash
pnpm nx format:check --projects=<app>
pnpm nx format <app>
pnpm nx lint <app>
pnpm nx typecheck <app>
```

Check `project.json` before assuming a target exists for a shared library.

### Unit tests and coverage

Unit tests use Jest with `jest-preset-angular`; MSW is configured for app tests and shared test setup files.

```bash
pnpm nx test <app>
pnpm nx run <app>:test --coverage --coverageReporters=text
pnpm nx run <app>:test:patch
```

Pangu's Jest config requires 95% statements, 90% branches, 95% functions, and 95% lines. Codecov's patch target is 95%; app mock directories are excluded from coverage.

For focused tests, use supported Nx/Jest arguments and verify the option when needed:

```bash
pnpm nx test pangu --testFile=src/app/services/screener.service.spec.ts
```

### End-to-end tests

```bash
pnpm nx e2e pangu-e2e
pnpm nx e2e palan-e2e
pnpm nx e2e vatti-e2e
```

Cypress configs define local and CI web-server commands. Inspect the target config before changing server behavior.

### Generators and assets

Nx generator defaults are in `nx.json`: Angular applications use Cypress, ESLint, CSS, Jest, esbuild, and Tailwind; components use CSS, OnPush, and page type. Use repository Nx generators for standard Angular artifacts.

```bash
pnpm generate-icons:pangu
pnpm generate-icons:palan
pnpm generate-icons:vatti
```

### Quality gates

For a production-facing change, run applicable targets:

```bash
pnpm nx format:check --projects=<project>
pnpm nx lint <project>
pnpm nx typecheck <app>
pnpm nx build <project>
pnpm nx run <project>:test --coverage
pnpm nx run <project>:test:patch
```

Do not commit generated coverage, build output, temporary files, or local environment secrets.

## 6. Repository-Specific Do-Not-Assume Rules

- Do not assume a backend folder, database server, ORM, authentication system, or global state store exists.
- Do not assume all three apps have identical folders or behavior; compare the target app first.
- Do not move shared code into `libs/` merely to reduce file size. Move it only when multiple projects genuinely consume the same stable abstraction.
- Do not replace RxJS/services with a new state library for a local feature.
- Do not add a root Tailwind config when the app-level CSS-first theme is sufficient.
- Do not use `console.log`; use `@nidhi/shared-logger`.
- Do not edit generated files under `src/generated/` manually; update the source/configuration that produces them.
- Do not disable strict compiler, lint, coverage, or Nx boundary rules to make a change pass.
