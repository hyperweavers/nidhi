# Agent Instructions

## Before any task execution

Before making edits or running commands, check:

- [ ] Is there a skill that matches this task? Load it first via `/skill <name>`.
- [ ] Is there a built-in agent (`explore`, `code-reviewer`, `unit-test`, `migration`, `security-analyst`, `ci-monitor`) that should handle this? Delegate via the `task` tool with `subagent_type`.
- [ ] Is this non-trivial (3+ files, new behavior, shared conventions)? If so, write the plan first (see Plans) and get approval before coding.
- [ ] Which verification tier applies (T1 default, T2 correctness, T3 pre-PR)? Run that tier, not everything.
- [ ] Am I using `pnpm nx` instead of raw `nx`/`npx`? Prefer `pnpm nx`.
- [ ] Have I read the relevant files before editing? The `edit` tool requires a prior `read`.
- [ ] Am I assuming anything the user did not state? If a requirement is ambiguous
      and guessing wrong would waste work, **ask first** via the `question` tool
      instead of assuming — especially for scope ("which pages?"), visual design
      choices, data sources, and whether to keep or remove existing behavior.

## Design System

- Before creating or modifying frontend UI, read the workspace root `DESIGN.md`.
- Treat `DESIGN.md` as the source of truth for colors, typography, spacing, responsive behavior, dark mode, and component styling.
- Reuse the app-specific `primary-*` theme tokens and existing Tailwind/Flowbite patterns instead of introducing custom colors, fonts, breakpoints, or component variants.
- Preserve accessible interaction states, stable control dimensions, and the documented light/dark mode pairings.
- When a frontend change establishes a reusable visual pattern that is not covered by `DESIGN.md`, update the design document in the same change.

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

## Verification tiers (run the tier that fits — not everything, every time)

CI runs the full gates regardless, so tiers shift timing, not rigor.
A passing gate reports one line (see Credit efficiency); only failures get detail.

| Tier               | Commands                                                                                                                                                                                                     | When                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| T1 — does it work  | `pnpm nx build <project>`; visual smoke for UI tasks (one viewport + console check, reuse dev server — see below)                                                                                            | Every logic/UI task          |
| T2 — correct/clean | `pnpm nx format:check --projects=<project>`, `pnpm nx lint <project>`, `pnpm nx typecheck <project>` (apps only), targeted `pnpm nx run <project>:test --coverage --testPathPattern=<touched-area>`          | Same tasks, after T1 passes  |
| T3 — pre-PR proof  | Full `pnpm nx run <project>:test --coverage` (global thresholds in `<project>/jest.config.ts`), `pnpm nx run <project>:test:patch` (changed-lines coverage ≥ `codecov.yml` patch target), full visual matrix | Pre-PR / on explicit request |

T0 (docs/text-only changes): `format:check` alone suffices.

## Visual verification (Playwright MCP)

Default is a T1 smoke for any UI task (new/changed components, pages, styles):
reuse the already-running `pnpm nx serve <app>` (default
`http://localhost:4200`); check `lsof -i :4200` first — never start a duplicate server.
One viewport (mobile `390x844`), one screenshot of each touched state saved to
`tmp/` and inspected via `read`, console 0 errors. Delete every `tmp/pw-*` screenshot once done.

Full matrix (T3 only): desktop `1440x900` + mobile `390x844`, each in light and dark.

- Dark mode: `localStorage.setItem('theme', 'dark')` + reload is the reliable
  switch (apps read it at startup; `light` switches back); confirm `<html>`
  carries the `dark` class. (`emulateMedia` also works but is flaky.)
- Capture: empty/initial state, filled state, and every interactive state the change
  touches (dropdowns, tooltips, chips, validation errors, dialogs). Save to `tmp/`
  (e.g. `tmp/pw-<page>-<desktop|mobile>-<light|dark>.png`) and inspect each via `read`.
- Mobile checks: no horizontal overflow
  (`document.documentElement.scrollWidth <= window.innerWidth`), stacked layouts stay
  readable, and open dropdowns/overlays never trap taps on underlying controls.
- Tips: viewport screenshots if full-page capture hangs; close the PWA install banner
  for clean shots; if the renderer wedges, close the tab and open a fresh one.

## Plans (OpenSpec lite)

Non-trivial work (3+ files, new behavior, shared conventions) needs an approved
plan before code. Trivial work (typo fixes, single-file tweaks, doc edits)
proceeds without one. Scaffold the plan by hand under
`openspec/changes/<slug>/` (no CLI dependency; this replaces any ad-hoc
`docs/plans/` convention):

- Default artifacts: `proposal.md` (goal, constraints, approach, verification
  tier, batched open questions) + `tasks.md` (implementation checklist plus a
  session handoff: Done / Next / Blockers, updated whenever context may be lost).
- Add `design.md` and `specs/` deltas only for complex changes or new capabilities.
- Wait for approval before implementing; archive the folder to
  `openspec/changes/archive/` on merge.

## Clarification protocol

- Batch unknowns into one question round at plan stage; never guess on scope or
  behavior. Ask through the available question mechanism, falling back to
  numbered plain-text questions when it is unavailable, and wait for answers
  before implementing.

## Credit efficiency (binding)

Tool calls and context are the scarce resource; local CPU is not.

- End every shell command with a tail/grep filter plus `echo EXIT:$?`; never
  paste full lint/test/build logs into context — redirect to `tmp/` and grep.
- Batch independent tool calls in parallel; read files with offset/limit instead
  of whole-file reads; prefer `pnpm nx affected` so untouched projects cost nothing.
- One-line pass reports; pull detail from files only on failure.

## Failure policy (no exceptions)

- Every gate above must pass. A red gate blocks CI, so there is no such thing as
  someone else's failure: **fix every failure regardless of its cause or origin,
  pre-existing failures included.**
- Never close out a task by dismissing a failure as "pre-existing", "unrelated",
  "flaky", or "already failing on main". Either fix it in this change, or leave
  the task explicitly unfinished with the failure quoted and attributed.
- Console noise is a failure too: zero warnings/errors in test output and the
  browser console for touched flows (e.g. MSW `redundant usage of query
parameters` warnings mean the handler must match on path, not full URL).

## Assets (no binary images)

- Never create or commit image files (`.png`, `.jpg`, screenshots, dumps) into
  the workspace. Debug screenshots, repros and dumps go to `tmp/` and must be
  deleted before finishing — they are never committable.
- All UI icons must be **inline SVG** (e.g. heroicons/flowbite paths directly in
  templates), never `<img>` tags pointing at committed image files. The only
  exceptions are PWA-required generated assets (`manifest` icons, `favicon`)
  produced by the repo's own generator scripts.

## Temporary files

- Create scratch/debug/temp files (scripts, repros, dumps, logs) only inside `tmp` (create it if missing) directory under workspace root.
- Delete every temp file once the job is done — the workspace must contain only intentional, committable changes when a task completes.

## File handling

- Do not delete any files added by the user (e.g., `DESIGN.md`, `INSTRUCTIONS.md`, or other docs/assets) without asking for confirmation. If a user-added file appears unrelated or obsolete, ask and confirm before removing or overwriting it.
