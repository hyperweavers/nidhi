# Nidhi — Nx Angular Monorepo

## Project Overview

Three privacy-focused open-source personal finance PWAs:

| App                       | Purpose                                        | Tech highlights                                                                   |
| ------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| **Pangu** (`apps/pangu/`) | Stock portfolio manager (Indian markets)       | Dexie IndexedDB, Chart.js, lightweight-charts, Economic Times / Moneycontrol APIs |
| **Vatti** (`apps/vatti/`) | Financial calculators                          | FD/RD/EMI/gold calculators, Chart.js                                              |
| **Palan** (`apps/palan/`) | ESPP manager (US markets)                      | Dexie IndexedDB, Moneycontrol US APIs, currency config                            |
| **Shared libs**           | `@nidhi/shared-logger`, `@nidhi/shared-sentry` | Console/Sentry loggers, Sentry init                                               |

## Key Conventions

- **Angular standalone** — no `NgModule`; import components directly in `imports` array. Check `@angular/core` version in `package.json` for current major.
- **ChangeDetectionStrategy.OnPush** on every component
- **`inject()`** over constructor injection (no `private`-prefix DI fields)
- **`@UntilDestroy()`** + `@UntilDestroy({ checkProperties: true })` for RxJS lifecycle management; use `pipe(untilDestroyed(this))` or subclass `subscribe` / `next` via the decorator
- **RxJS + signals** — use `BehaviorSubject`/`Observable` for services, convert to signals in components via `toSignal()` / `toObservable()`
- **Tailwind CSS + Flowbite** — utility classes, no separate CSS files for layout; component-scoped styles only for overrides. Check `tailwindcss` version in `package.json`.
- **Dexie** — IndexedDB wrapper; schema in `db/`; version migrations in `dexie.version.ts`
- **Sentry** — production only; `beforeSend` strips query strings; `ConsoleLogger` in dev, `SentryLogger` in prod (via `LOGGER` injection token)
- **Chart.js** — via `ng2-charts` for doughnut charts; `lightweight-charts` for area/performance charts
- **Services** — in `services/core/` for singleton app services, `services/` for feature-specific ones

## Nx Monorepo

- **Package manager**: pnpm
- **Run tasks**: `pnpm nx <target> <project>` (e.g., `pnpm nx test pangu`)
- **Affected commands**: `pnpm nx affected -t <target>`
- **Generators**: `pnpm nx g @nx/angular:<schematic>`
- **Path aliases**: `@nidhi/shared-logger`, `@nidhi/shared-sentry`
- **Module boundaries**: enforced by `@nx/enforce-module-boundaries`

## Testing

- **Unit**: Jest + `jest-preset-angular` + `jest-canvas-mock`. Check `jest` version in `package.json`.
- **E2E**: Cypress (per app, `*-e2e` projects). Check `cypress` version in `package.json`.
- **Test setup**: `test-setup.ts` configures zone, `matchMedia`, `ResizeObserver`, and `DatePicker` mocks
- **Run**: `pnpm nx test <app>` or `pnpm nx affected -t test`

## CI/CD

- **PR CI**: `.github/workflows/ci.yml` — format:check, lint, build, test
- **Deploy**: `.github/workflows/deploy.yml` — build, Sentry source maps, deploy to GitHub Pages
- **Prebuild**: `tools/scripts/generate-version.mjs` and `generate-sentry-env.mjs` write generated files

## Nx Workflow

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first — it has patterns for querying projects, targets, and dependencies
- When running tasks (build, lint, test, e2e, etc.), always prefer running through `nx` (`nx run`, `nx run-many`, `nx affected`) instead of underlying tooling directly
- Prefix nx commands with `pnpm`: `pnpm nx build`
- The workspace is connected to Nx Cloud (see `nx.json` for access token) — CI self-healing and the `/monitor-ci` command depend on it
- You have access to the Nx MCP server and its tools — use them to inspect workspace configuration and project graph
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`
- Never guess CLI flags — check `--help` or the `nx_docs` skill first
- For scaffolding tasks (apps, libs, components), always invoke the `nx-generate` skill first
- After creating new packages, use `link-workspace-packages` skill to wire up dependencies

## Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/) enforced via husky + lint-staged.
