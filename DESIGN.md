---
title: Design System
description: Styling guidance for the Pangu, Palan, and Vatti Angular applications.
---

# Design System

This document records the styling language currently used by the three Angular applications in this workspace: Pangu, Palan, and Vatti. The source of truth is the app-level `styles.css` file plus the Tailwind utility classes used in Angular templates.

## Styling Foundation

- Use Tailwind CSS v4 utilities and theme tokens. There is no separate `tailwind.config.*` file; the theme is declared in each app's `src/styles.css` using `@theme`.
- Use Flowbite and Flowbite Datepicker for the datepicker and related interaction primitives.
- Component styles are intentionally minimal. Most component CSS files are empty; the main exception is the shared slider thumb styling in the stocks and indices pages.
- Preserve the existing `dark:` variants whenever adding a visual rule. Dark mode is activated by `.dark` and configured with `@custom-variant dark (&:where(.dark, .dark *))`.

## Color Palette

### Neutral foundation

Use the Tailwind gray scale for surfaces, text, borders, and disabled states.

| Role                | Light mode | Dark mode                |
| ------------------- | ---------- | ------------------------ |
| App surface         | `white`    | `gray-900`               |
| Raised surface/card | `white`    | `gray-800`               |
| Secondary surface   | `gray-50`  | `gray-950` or `gray-900` |
| Primary text        | `gray-900` | `white`                  |
| Body text           | `gray-800` | `white`                  |
| Muted text          | `gray-500` | `gray-400`               |
| Disabled text       | `gray-500` | `gray-500`               |
| Borders             | `gray-200` | `gray-700` or `gray-800` |
| Hover surface       | `gray-100` | `gray-700`               |

The global base layer provides `gray-200` as the default border color. Add an explicit border utility when a component needs a different contrast level.

### Brand colors

Each app maps the shared `primary-*` token family to a different Tailwind hue. Use `primary-*` in reusable UI rather than hard-coding the app's hue.

| App   | Primary token source | Typical use                                           |
| ----- | -------------------- | ----------------------------------------------------- |
| Pangu | `indigo-*`           | Active controls, links, focus states, selected ranges |
| Palan | `amber-*`            | Active controls, links, focus states, selected ranges |
| Vatti | `pink-*`             | Active controls, links, focus states, selected ranges |

The `primary-50` through `primary-950` aliases are defined in each app's `@theme`. Flowbite semantic aliases such as `brand`, `brand-soft`, `brand-strong`, `body`, `body-subtle`, and `heading` resolve through this family and should be preferred when working inside Flowbite components.

### Status colors

- Positive movement and gains: `green-500` in light mode, `green-400` in dark mode.
- Negative movement and losses: `red-600` in light mode, `red-500` in dark mode.
- The workspace overrides the default red and green scales with OKLCH values. Use the existing utility scale instead of introducing custom hex values.
- Status color communicates direction alongside text or symbols. Do not rely on color alone for financial changes.

### Dark mode

Dark mode is a token remap, not a separate visual theme. Keep the same component hierarchy and elevation model, then switch surfaces, borders, text, and brand contrast with `dark:` utilities. The standard dark app shell is `bg-gray-900`; navigation and cards commonly use `dark:bg-gray-800`.

## Typography

### Families

- Body and interface text: `Inter`, loaded from Google Fonts and exposed as `--font-sans` and `--font-body`.
- Logo/brand wordmark: `Poppins` at weight 600, exposed as `--font-logo`.
- Keep the configured fallbacks when adding typography; do not introduce a new font family for an individual component.

### Hierarchy

- Page headings: usually `text-2xl font-semibold`, with responsive alignment where needed.
- Card titles and section labels: `text-base font-normal text-gray-500`, with `dark:text-gray-400`.
- Primary KPI values: `text-2xl leading-none font-bold text-gray-900`, with `dark:text-white`.
- Supporting values and status details: `text-base` or `text-sm` depending on density.
- Metadata, subtitles, and range labels: `text-xs`.
- Use `leading-none` for compact numeric values and `font-semibold` for short navigation or calculator labels.

Use sentence case for visible UI labels. Financial values should retain their existing number formatting and align visually with their surrounding labels.

## Spacing

Use the default Tailwind spacing scale, where one unit is `0.25rem` (4px). The most common layout rhythm in the current apps is a 4-unit rhythm:

| Pattern                  | Utility                | Size                                  |
| ------------------------ | ---------------------- | ------------------------------------- |
| Page/content inset       | `p-4`                  | 16px                                  |
| Grid and card separation | `gap-4`                | 16px                                  |
| Card internal padding    | `p-4`                  | 16px                                  |
| Small control padding    | `p-2`                  | 8px                                   |
| Compact label separation | `mb-2`, `mt-1`         | 8px, 4px                              |
| Section separation       | `mt-3`, `py-4`         | 12px, 16px                            |
| Navigation inset         | `px-3 py-3`, `lg:px-5` | 12px / 20px horizontal, 12px vertical |

Layout guidance:

- Start page bodies with `flex h-full flex-col p-4` or the equivalent full-height shell.
- Use `gap-4` for repeated cards and dashboard grids. Prefer responsive grids such as `grid-cols-1 md:grid-cols-3` or `grid-cols-2 md:grid-cols-4`.
- Use `flex`, `items-center`, and `justify-between` for toolbar and navigation alignment.
- Use fixed dimensions for controls that must not shift: the primary navigation is `h-16`, range buttons are `h-8 w-8`, and icon controls commonly use `h-7 w-7` or `h-6 w-6` icons.
- Keep dense data surfaces compact, but preserve the established 16px outer and card inset unless the component is explicitly a toolbar or icon-only control.

## Component Rules

### App shell and navigation

- Use a full-height column shell: `min-h-screen flex flex-col bg-white dark:bg-gray-900`.
- Keep the main header fixed with a high stacking order (`fixed z-30 w-full`).
- The primary navigation is full width, 64px high, with a bottom border and white/gray-800 surfaces in light/dark mode.
- Use `px-3 py-3` on small screens and increase horizontal padding to `lg:px-5` where the layout allows it.
- Sidebar toggles and other mobile-only navigation controls are visible below `lg`; use `rounded-sm` or `rounded-md`, `p-2`, hover surfaces, and visible focus rings.

### Cards and tiles

- Standard card: `rounded-md border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-700 dark:bg-gray-800`.
- Use cards for repeated KPIs, calculators, and other discrete destinations. Make a card interactive only when it has a route or action, and add `cursor-pointer` conditionally.
- Keep card content aligned to a clear hierarchy: muted label, prominent value/title, then supporting status or metadata.
- Calculator tiles center their icon and label vertically, use `size-12` artwork, `mb-4`, and a one-line `line-clamp-1` label.
- Use `rounded-md` as the default radius. Reserve `rounded-full` for progress tracks or circular status affordances.

### Buttons and controls

- Use native `button` elements with `type="button"` for actions.
- Icon-only controls should have a stable hit area, typically `h-7 w-7` or `p-2`, with an accessible `sr-only` label or equivalent accessible name.
- Use `inline-flex items-center justify-center` for compact controls.
- Provide hover and focus states together: light mode commonly uses `hover:bg-gray-100 hover:text-gray-900`, dark mode uses `dark:hover:bg-gray-700 dark:hover:text-white`, and focus uses a `focus:ring-2` with the relevant primary color.
- Segmented controls use adjacent bordered buttons, `h-8 w-8`, `text-xs`, and rounded caps only on the first and last buttons (`rounded-s-md` and `rounded-e-md`). The selected item uses the app's `primary-700` in light mode and `primary-600` in dark mode with white text.
- Disabled controls must remain visibly disabled and must not imply interactivity through the global pointer cursor rule.

### Forms and datepickers

- Use Flowbite/Flowbite Datepicker tokens and components where an existing primitive fits.
- The datepicker base radius is mapped to `--radius-lg` through `--radius-base`.
- Use the semantic body, heading, disabled, brand, neutral, and border aliases defined in `@theme` when overriding Flowbite styles.
- File input buttons use the shared gray token (`var(--color-gray)`) rather than a bespoke color.

### Data, metrics, and charts

- Present KPI cards in a responsive grid with one column by default and three columns at `md` when the content supports it.
- Use bold, large numeric values (`text-2xl font-bold`) and muted labels; keep gain/loss direction explicit with text and an up/down indicator.
- Progress tracks are compact (`h-1`) with a full red negative track and a green positive fill. Use `rounded-full` for the track and fill.
- Chart panels use white/gray-800 surfaces, a subtle border and shadow in normal mode, and responsive fixed chart height such as `h-80` when not fullscreen.
- Loading and empty states are centered with flex alignment, include semantic `role="status"`, and keep the visible message or accessible label.

### Responsive behavior

- Treat the existing Tailwind breakpoints as the baseline: mobile first, `sm` for small refinements, `md` for grid and layout changes, and `lg` for navigation/sidebar behavior.
- Avoid introducing a new breakpoint for a local component. Reuse the established `sm`, `md`, and `lg` transitions.
- Keep labels from overflowing compact controls; use responsive visibility utilities and `line-clamp-1` where the existing UI already does so.

## Source Files

- Global theme and tokens: `apps/pangu/src/styles.css`, `apps/palan/src/styles.css`, `apps/vatti/src/styles.css`
- Representative dashboard cards and charts: `apps/pangu/src/app/pages/dashboard/dashboard.page.html`, `apps/palan/src/app/pages/dashboard/dashboard.page.html`
- Representative calculator tiles: `apps/vatti/src/app/pages/home/home.page.html`
- Shared app shell and navigation: `apps/pangu/src/app/app.component.html`, `apps/palan/src/app/app.component.html`, `apps/vatti/src/app/app.component.html`
- Local slider styling: `apps/pangu/src/app/pages/stocks/stocks.page.css`, `apps/palan/src/app/pages/stocks/stocks.page.css`, and `apps/pangu/src/app/pages/indices/indices.page.css`
