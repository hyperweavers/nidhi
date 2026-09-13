# Agent Instructions

## Before any task execution

Before making edits or running commands, check:

- [ ] Is there a skill that matches this task? Load it first via `/skill <name>`.
- [ ] Is there a built-in agent (`explore`, `code-reviewer`, `unit-test`, `migration`, `security-analyst`, `ci-monitor`) that should handle this? Delegate via the `task` tool with `subagent_type`.
- [ ] Am I using `pnpm nx` instead of raw `nx`/`npx`? Prefer `pnpm nx`.
- [ ] Have I read the relevant files before editing? The `edit` tool requires a prior `read`.

## Available skills

| Skill                     | When to use                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `nx-workspace`            | Understanding workspace structure, projects, targets, dependencies   |
| `angular-conventions`     | Writing/editing Angular code (standalone, OnPush, inject(), signals) |
| `testing-conventions`     | Writing/editing Jest tests for Angular                               |
| `security-guidelines`     | Security review or security-sensitive code                           |
| `link-workspace-packages` | Fixing workspace package resolution errors                           |
| `nx-generate`             | Scaffolding new apps/libs with Nx generators                         |
| `nx-plugins`              | Discovering/installing Nx plugins                                    |
| `nx-run-tasks`            | Running build/test/lint tasks                                        |
| `nx-import`               | Importing repos into the Nx workspace                                |
| `monitor-ci`              | Monitoring CI pipeline status                                        |
| `customize-opencode`      | Editing opencode configuration                                       |

## MSW (Mock Service Worker)

MSW is configured for dev + test in all 3 apps:

- **Pangu**: `mockServiceWorker.js` in `public/`, test server wired via `test-utils.ts` + `test-setup.ts`
- **Palan**: `mockServiceWorker.js` in `public/`, test server wired via `test-utils.ts` + `test-setup.ts`
- **Vatti**: `mockServiceWorker.js` in `public/`, test server wired via `test-utils.ts` + `test-setup.ts`

Handler files are at `src/app/mocks/handlers.ts` per app. Test utilities at `src/app/mocks/test-utils.ts`.

To re-generate `mockServiceWorker.js` when updating MSW:

```bash
pnpm msw init apps/<app>/public --save   # pangu, palan, vatti
```

## Environment

- `NX_CACHE_DIRECTORY` environment variable must be set to `<workspace_path>\.nx\cache` for Nx commands if the workspace is a worktree.
- Test: `pnpm nx test <app>` (with `$env:NX_CACHE_DIRECTORY` set)
- Coverage: `pnpm nx run <app>:test --coverage --coverageReporters=text`
- Patch coverage (mirrors Codecov `patch` gate in `codecov.yml`): `pnpm nx run <project>:test:patch`
  (runs tests with `lcov`, then `tools/scripts/check-patch-coverage.mjs` checks only
  changed lines vs `origin/main`; threshold read from `codecov.yml`, override via `PATCH_COVERAGE_THRESHOLD`)

## Quality gates (run all before finishing a task)

- [ ] `pnpm nx format:check --projects=<project>`
- [ ] `pnpm nx lint <project>`
- [ ] `pnpm nx typecheck <project>` (apps only)
- [ ] `pnpm nx build <project>`
- [ ] `pnpm nx run <project>:test --coverage` (global thresholds in `<project>/jest.config.ts`)
- [ ] `pnpm nx run <project>:test:patch` (changed-lines coverage ≥ `codecov.yml` patch target)

## Temporary files

- Create scratch/debug/temp files (scripts, repros, dumps, logs) only inside `tmp` (create it if missing) directory under workspace root.
- Delete every temp file once the job is done — the workspace must contain only intentional, committable changes when a task completes.
