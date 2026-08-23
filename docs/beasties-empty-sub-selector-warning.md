# Build Warning: "rules skipped due to selector errors: () -> Empty sub-selector"

## Symptom

Production builds (`pnpm nx build <app>`) of all 3 apps (pangu, palan, vatti) printed:

```bash
▲ [WARNING] 2 rules skipped due to selector errors:
  () -> Empty sub-selector
  () -> Empty sub-selector
```

## Root cause chain

1. **Emitter**: the warning is NOT from esbuild CSS minification. It comes from
   [beasties](https://github.com/danielroe/beasties) — the critical-CSS extraction library behind
   Angular's `optimization.styles.inlineCritical` step (enabled by default in production builds).
   Beasties re-parses the final bundled stylesheet with `css-what`, which throws
   `Empty sub-selector` for selectors like `:is()` with no arguments.

2. **Offending rules**: two identical invalid rules in every app's bundle:

   ```css
   :is():hover {
     background: var(--color-neutral-quaternary);
   }
   ```

   Per the CSS spec an empty `:is()` makes the whole rule invalid, so browsers drop it anyway.
   The rule was functionally a no-op.

3. **Origin**: `flowbite@4.0.2`'s `plugin.js` nests a `'&:hover'` key inside component entries whose
   parent selectors are **pseudo-elements**:

   ```js
   [[`input[type=file]::file-selector-button`]]: {
     // ...
     '&:hover': { background: 'var(--color-neutral-quaternary)' },
   },
   ```

   Tailwind v4's JS-plugin compatibility layer composes nested keys by wrapping the parent in
   `:is(...)`. A pseudo-element cannot appear inside `:is()` per spec, so Tailwind emits an _empty_
   `:is()` followed by `:hover`. This happened once for the light-mode entry and once for the
   `.dark input[type=file]::file-selector-button` entry → exactly "2 rules".

4. **Not fixed upstream**: flowbite 4.0.2 was the latest release at investigation time (2026-08),
   and tailwindcss 4.3.x did not special-case pseudo-element parents.

## Fix applied

A pnpm patch removes the two dead nested `'&:hover'` blocks from `flowbite/plugin.js`
(their value equals the base `background`, so there is zero visual change):

- Patch file: `patches/flowbite@4.0.2.patch`
- Registered in `pnpm-workspace.yaml` under `patchedDependencies`

Applies to all apps since `flowbite` is a root dependency.

```bash
pnpm patch flowbite@4.0.2   # edit node_modules/.pnpm_patches/flowbite@4.0.2
pnpm patch-commit "node_modules/.pnpm_patches/flowbite@4.0.2"
pnpm patch-remove flowbite@4.0.2   # once upstream ships a fix
```

## How to diagnose similar warnings

The warning text alone gives no file/line. Working approach:

1. Identify the emitter: `rg -l "rules skipped due to selector errors" node_modules/.pnpm`
   (beasties = critical-CSS step; esbuild itself says "minified" context instead).
2. Scan the built stylesheet (`dist/apps/<app>/browser/styles-*.css`) for invalid selectors,
   e.g. `rg ":is\(\)|:where\(\)|:has\(\)" <styles.css>`.
3. Trace the selector text back to its source plugin/library.
4. Confirm by bisecting inputs (e.g., comment out font imports / plugin lines in `styles.css`,
   rebuild, compare).

## Related notes

- The two Google Fonts `@import url(...)` lines in each app's `styles.css` are unrelated:
  Angular's font inlining replaces them with `@font-face` rules; removing them does not affect
  this warning (verified by bisect).
- Only production builds are affected: `inlineCritical` runs during optimization, not `ng serve`.
