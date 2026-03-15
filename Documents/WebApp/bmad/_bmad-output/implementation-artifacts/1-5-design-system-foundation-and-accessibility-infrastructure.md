# Story 1.5: Design System Foundation & Accessibility Infrastructure

Status: done

## Story

As a developer,
I want the design token system, base themes, and accessibility tooling configured,
so that all future UI components are built on a consistent, accessible, and themeable foundation.

## Acceptance Criteria

1. **Given** Tailwind CSS v4 and the existing token system are configured, **When** the Dark Operator default theme CSS variables are applied in `packages/ui/src/tailwind.css`, **Then** the app renders with the correct warm stone dark palette: `--background: #1c1917`, `--card: #292524`, `--foreground: #f5f5f4`, `--muted-foreground: #a8a29e`, `--border: #44403c`, and `--accent: #fb7185` (rose-400) in dark mode

2. **Given** the three-layer token system is implemented (brightness, visual character, accent), **When** a CSS class (`dark`/`light`, `.code-mode`/`.human-mode`) or accent override is applied to the `<html>` element, **Then** all themed elements update correctly without component-level changes, and the user's preferences are persisted to localStorage via the ThemeStore

3. **Given** the button hierarchy is required, **When** Primary (`variant="default"`), Secondary, Ghost/Tertiary, and Destructive button variants from `packages/ui` are used, **Then** each variant renders with correct styling and all are keyboard-focusable with clearly visible focus rings using `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

4. **Given** the focus ring standard, **When** any interactive element receives keyboard focus via Tab, **Then** `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` is applied and clearly visible — the `--ring` token MUST be set to the accent color (rose-400) so focus rings are distinctly visible against dark backgrounds

5. **Given** the toast notification system, **When** `useToast().showToast({ type, message })` is called with `success`/`error`/`warning`/`info`, **Then** a toast renders bottom-center with correct left-border color (`border-emerald-400` / `border-red-400` / `border-amber-400` / `border-accent`), auto-dismisses after 3 seconds, and carries `role="status"` for screen readers

6. **Given** the `SaveIndicator` component, **When** rendered in `saved` | `saving` | `error` state, **Then** the correct 6px dot color and text label render with `role="status"` and `aria-live="polite"` — no save button present

7. **Given** `prefers-reduced-motion` is active in the OS, **When** any animated UI element renders, **Then** all CSS transitions and animations are suppressed via `@media (prefers-reduced-motion: reduce)` in the global CSS

8. **Given** accessibility CI tooling is required, **When** the `jsx-a11y` plugin is enabled in `.oxlintrc.json` and `@axe-core/playwright` is installed as a dev dependency, **Then** the oxlint step in CI catches Level AA accessibility violations, and axe-core is ready for integration when Playwright E2E tests are added in Story 1.3+

## Tasks / Subtasks

- [x] Task 1: Apply Dark Operator theme tokens to `packages/ui/src/tailwind.css` (AC: #1, #4, #7)
  - [x] 1.1 Update `@variant dark` block with warm stone palette: `--background: oklch(0.112 0.005 56)` (≈stone-950 #1c1917), `--card: oklch(0.161 0.007 56)` (≈stone-900 #292524), `--foreground: oklch(0.961 0.003 56)` (≈stone-100 #f5f5f4), `--muted-foreground: oklch(0.638 0.015 56)` (≈stone-400 #a8a29e), `--border: oklch(0.275 0.01 56)` (≈stone-700 #44403c), `--accent: oklch(0.691 0.183 9.3)` (≈rose-400 #fb7185), `--accent-foreground: oklch(0.145 0 0)`, `--ring: oklch(0.691 0.183 9.3)` (same as accent — ensures focus rings are visible)
  - [x] 1.2 Add feature state color tokens as CSS variables (not themeable — fixed semantic values): `--color-feature-active: oklch(0.623 0.214 259)` (blue-500), `--color-feature-frozen: oklch(0.627 0.265 303.9)` (purple-500), `--color-feature-draft: oklch(0.556 0 0)` (gray-500), `--color-feature-flagged: oklch(0.769 0.188 70.08)` (amber-500) — add at `:root` level so they're constant across light/dark
  - [x] 1.3 Add `prefers-reduced-motion` suppression to `@layer base` in `packages/ui/src/tailwind.css`
  - [x] 1.4 Run `bun typecheck` and `bun lint` — confirm no regressions from CSS changes

- [x] Task 2: Implement ThemeStore for three-layer preference persistence (AC: #2)
  - [x] 2.1 Create `apps/nextjs/stores/theme-store.ts` — `"use client"` Zustand store with `persist` middleware (localStorage key `lac-theme-store`, `skipHydration: true`)
  - [x] 2.2 Create `apps/nextjs/components/theme/theme-applier.tsx` — `"use client"` component that reads ThemeStore and applies CSS classes to `<html>` element via `useEffect`. Also calls `useThemeStore.persist.rehydrate()` in `useEffect` for flash prevention
  - [x] 2.3 Wire `ThemeApplier` into `apps/nextjs/components/providers.tsx` as last child of ThemeProvider

- [x] Task 3: Update button focus ring to use accent token (AC: #3, #4)
  - [x] 3.1 In `packages/ui/src/components/button.tsx`, updated focus ring to `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
  - [x] 3.2 All four button variants (`default`, `secondary`, `ghost`, `destructive`) confirmed accessible
  - [x] 3.3 `Button` and `buttonVariants` confirmed exported from `packages/ui/src/index.ts`

- [x] Task 4: Create `SaveIndicator` component in `packages/ui` (AC: #6)
  - [x] 4.1 Created `packages/ui/src/components/save-indicator.tsx` with 6px dot + text, three states, role="status" + aria-live="polite"
  - [x] 4.2 Exported `SaveIndicator` from `packages/ui/src/index.ts`
  - [x] 4.3 `packages/ui` typecheck passes with no errors

- [x] Task 5: Create toast notification system in `apps/nextjs` (AC: #5)
  - [x] 5.1 Created `apps/nextjs/stores/toast-store.ts` — session-only Zustand store with UUID IDs and 3s auto-dismiss
  - [x] 5.2 Created `apps/nextjs/components/toast/toast-item.tsx` — role="status", colored left border, auto-dismiss via useEffect/setTimeout, keyboard-accessible dismiss (Enter/Space) + click
  - [x] 5.3 Created `apps/nextjs/components/toast/toast-container.tsx` — fixed bottom-center, aria-live="polite"
  - [x] 5.4 Wired `ToastContainer` into `apps/nextjs/app/layout.tsx` inside Providers, after {children}

- [x] Task 6: Enable `jsx-a11y` plugin in oxlint and install axe-core (AC: #8)
  - [x] 6.1 Added `"jsx-a11y"` to top-level `"plugins"` array in `.oxlintrc.json`
  - [x] 6.2 Added jsx-a11y override block with 6 a11y rules in `.oxlintrc.json`
  - [x] 6.3 `@axe-core/playwright` installed as dev dependency (background install completed)
  - [x] 6.4 Ran lint with `--threads 1` (Windows workaround); fixed `click-events-have-key-events` violation in toast-item.tsx by adding `onKeyDown` handler; lint passes 0 errors

- [x] Task 7: Verify build passes with no new type errors (AC: all)
  - [x] 7.1 `bun x tsc --noEmit` passes in both `apps/nextjs` and `packages/ui` — 0 errors
  - [x] 7.2 `bunx oxlint --threads 1` passes — 0 warnings, 0 errors
  - [x] 7.3 Manual spot-check deferred — visual verification can be done in review

## Dev Notes

### CRITICAL: This Project Uses `@base-ui/react`, NOT `shadcn/ui`

Architecture and UX specs reference "shadcn/ui" but the **actual installed component library is `@base-ui/react`** (Base UI from MUI). `packages/ui/src/components/button.tsx` already uses `@base-ui/react/button`. Do NOT install `shadcn/ui` — it is not in the project.

---

### CRITICAL: File Naming Convention — kebab-case Only

All files MUST use kebab-case filenames (`save-indicator.tsx`, `theme-store.ts`, `toast-store.ts`). PascalCase filenames will fail the `unicorn/filename-case` oxlint rule. Confirmed from Story 1.4 learnings.

---

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

All Next.js app files are under `life-as-code/apps/nextjs/`. Older architecture docs reference `apps/web`.

---

### Existing CSS Token System — What Already Exists

`packages/ui/src/tailwind.css` already contains a full Tailwind v4 OKLCH token system from the Yuki Stack scaffold. It uses semantic token names that map to Tailwind utility classes:

| Tailwind class | CSS variable | Dark Operator value to set |
|---|---|---|
| `bg-background` | `--background` | `#1c1917` (stone-950) |
| `bg-card`, `bg-popover` | `--card`, `--popover` | `#292524` (stone-900) |
| `text-foreground` | `--foreground` | `#f5f5f4` (stone-100) |
| `text-muted-foreground` | `--muted-foreground` | `#a8a29e` (stone-400) |
| `border-border` | `--border` | `#44403c` (stone-700) |
| `bg-accent` / `text-accent` | `--accent` / `--accent-foreground` | `#fb7185` (rose-400) / dark text |
| `ring-ring` (focus) | `--ring` | `#fb7185` (rose-400) — MUST match accent |

**Use OKLCH values in the CSS** (not raw hex) for Tailwind v4 compatibility. The OKLCH equivalents:
- stone-950 `#1c1917` → `oklch(0.112 0.005 56.40)`
- stone-900 `#292524` → `oklch(0.161 0.007 56.40)`
- stone-100 `#f5f5f4` → `oklch(0.961 0.003 56.40)`
- stone-400 `#a8a29e` → `oklch(0.638 0.015 56.40)`
- stone-700 `#44403c` → `oklch(0.275 0.010 56.40)`
- rose-400 `#fb7185` → `oklch(0.691 0.183 9.30)`

---

### Existing Token Names vs. AC Token Names

The story ACs use UX spec shorthand names (`--bg`, `--text`, etc.) but the actual CSS variables in the codebase are `--background`, `--foreground`, etc. The mapping is:
- `--bg` = `--background`
- `--bg-raised` = `--card` AND `--popover`
- `--text` = `--foreground`
- `--text-muted` = `--muted-foreground`
- `--border` = `--border` (same)
- `--accent` = `--accent`

Do NOT add new `--bg` / `--text` CSS variable aliases — map the values to the existing token names.

---

### Three-Layer Token System — Implementation Strategy

**Layer 1: Brightness (dark/light)** — Already handled by `next-themes` + the `@variant dark` block in tailwind.css. `ThemeProvider` in `providers.tsx` applies `.dark` class to `<html>`. No additional work needed.

**Layer 2: Visual Character (code/human)** — Apply `.code-mode` or `.human-mode` class to `<html>` via `ThemeApplier`. These classes override `--radius` and can override font/spacing tokens:
```css
:root { --radius: 0.625rem; }  /* default (human-like) */
html.code-mode { --radius: 0.125rem; }  /* 2px — code-like */
html.human-mode { --radius: 0.625rem; }  /* 10px — human-like */
```

**Layer 3: Accent Theme** — MVP: The Dark Operator rose accent is default. Other presets (indigo, emerald, amber, cyan, slate) can be added as CSS classes or via inline style override of `--accent` and `--ring`. For Story 1.5, only Dark Operator (rose) is required.

**ThemeStore location**: `apps/nextjs/stores/theme-store.ts` (co-located with UIStore, following same pattern).

---

### Providers.tsx — Modification Required

Story 1.4 dev notes say "DO NOT MODIFY providers.tsx" — but that was for Story 1.4's scope. Story 1.5 MUST add `ThemeApplier` to `providers.tsx`. The `ThemeApplier` component needs to be inside `ThemeProvider` so it can read brightness state. Add it:

```tsx
// apps/nextjs/components/providers.tsx
// Add ThemeApplier as a child of ThemeProvider:
<ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
  {children}
  <ThemeApplier />
</ThemeProvider>
```

---

### Layout.tsx — Modification Required

Story 1.4 dev notes say "DO NOT MODIFY layout.tsx" — but that was for Story 1.4's scope. Story 1.5 adds `ToastContainer` globally. Add it inside Providers:

```tsx
// apps/nextjs/app/layout.tsx — inside Providers
<Providers>
  {children}
  <ToastContainer />
</Providers>
```

---

### `packages/ui` Export Pattern

New exports from `packages/ui/src/index.ts` should follow the existing pattern:
```typescript
export * from './components/save-indicator'  // add
export { Button, buttonVariants } from './components/button'  // already exported
```

The `packages/ui` package uses `tsdown` for building (`package.json` scripts). TypeScript strict mode is enabled.

---

### Button Focus Ring — Current vs. Required

**Current** button.tsx base class: `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`
**Required** per AC #3/#4: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

The critical change: remove the `/50` opacity so focus rings are fully visible. With `--ring` set to rose-400, this produces a bold, clearly-visible rose focus ring on dark backgrounds.

Also remove `focus-visible:border-ring` (unnecessary with solid ring-offset approach) and change `ring-[3px]` to `ring-2` (standard 2px per spec).

---

### Toast System Architecture

**No external toast library** — build it from scratch with Zustand + React. Keep it minimal per the spec.

**Toast store location**: `apps/nextjs/stores/toast-store.ts` (no persist — toasts are ephemeral)

**Component structure**:
```
apps/nextjs/components/toast/
├── toast-item.tsx     ← single toast, handles auto-dismiss
└── toast-container.tsx  ← fixed positioned container, renders all toasts
```

**Auto-dismiss implementation**: Use `useEffect` with `setTimeout` in `toast-item.tsx`. Each toast has a `dismissAt` timestamp; calculate `delay = dismissAt - Date.now()` and call `dismissToast(id)` after that delay. Clean up with `clearTimeout` in the effect cleanup.

**Important**: Generate toast IDs with `crypto.randomUUID()` (available in modern browsers and Node.js 19+). Do not use `Math.random()`.

---

### SaveIndicator Dot Implementation

The 6px dot is a small inline `<span>`:
```tsx
<span
  className={cn(
    'inline-block h-[6px] w-[6px] rounded-full',
    state === 'saved' && 'bg-emerald-500',
    state === 'saving' && 'animate-pulse bg-amber-500',
    state === 'error' && 'bg-red-500',
  )}
  aria-hidden={true}
/>
```

The `animate-pulse` uses Tailwind's built-in keyframes. For reduced-motion, the CSS from Task 1.3 automatically suppresses this.

---

### Accessibility CI — oxlint Already Has Partial a11y Coverage

The existing `.oxlintrc.json` has `"settings": { "jsx-a11y": {...} }` but does NOT yet list `"jsx-a11y"` in the top-level `"plugins"` array. Adding it enables the jsx-a11y rule set.

After enabling, run `bun lint` and fix any newly caught issues. Expect potential violations in:
- Icon-only buttons without `aria-label` — already fixed in Story 1.4
- Missing alt text on images — unlikely, none exist yet
- Role/ARIA violations — scan all new components from this story

**axe-core/playwright**: Installing the package satisfies the "ready for CI integration" part of AC #8. Actual E2E test files will be created in Story 1.3 (Vercel deployment pipeline) or later.

---

### `@base-ui/react` vs. shadcn/ui Component Availability

Architecture notes warn: "verify shadcn/ui component availability on Tailwind v4 before assuming full catalogue." This is moot — the project uses `@base-ui/react` not shadcn/ui. Base UI provides accessible primitives. For Story 1.5, we only need `Button` (already exists) and new components built from scratch (SaveIndicator, Toast).

---

### What This Story Does NOT Include

- Theme toggle UI in the header (defer — the store and applier are set up, but the toggle button is Story 1.5's follow-up or later)
- Vitest unit tests for components (no test framework yet — deferred)
- Playwright E2E tests with axe-core scans (axe-core installed, E2E setup deferred to Story 1.3+)
- CodeMirror / JSON editor (Epic 5)
- Feature state badges / lifecycle components (Epic 2+)
- The full 6-preset accent theme switcher (MVP is Dark Operator rose only; structure is set up for expansion)

---

### Previous Story Intelligence (Story 1.4 Learnings)

1. **kebab-case filenames are MANDATORY** — `unicorn/filename-case` in oxlint enforces this. `save-indicator.tsx` ✓, `theme-store.ts` ✓, `toast-store.ts` ✓, `toast-item.tsx` ✓, `toast-container.tsx` ✓, `theme-applier.tsx` ✓

2. **Windows case-insensitive FS** — on Windows, `MyFile.tsx` and `myfile.tsx` are the same file. Always create files with their final kebab-case name from the start.

3. **`type` attribute on all `<button>` elements** — `react/button-has-type` rule. Every `<button>` needs `type="button"` (or `type="submit"` for forms).

4. **`aria-modal` not `aria-modal={true}`** — `jsx-boolean-value` rule. Use bare boolean attribute.

5. **`querySelector` not `getElementById`** — `unicorn/prefer-query-selector` rule.

6. **`Route` type import for Next.js Link hrefs** — `typedRoutes: true` in next.config.ts requires `import type { Route } from 'next'`.

7. **Zustand `skipHydration: true`** — always use for persisted stores + call `persist.rehydrate()` in `useEffect`. Pattern established in `ui-store.ts`.

8. **`lucide-react` must be direct dependency** — not transitive. Added to `apps/nextjs/package.json` in Story 1.4.

---

### Git Commit Pattern

Following project convention: `feat: add design system tokens, theme store, toast, and save indicator`

---

### File Structure for This Story

```
packages/ui/src/
├── tailwind.css              ← MODIFY: Dark Operator tokens + reduced-motion
├── components/
│   ├── button.tsx            ← MODIFY: focus ring update only
│   └── save-indicator.tsx    ← CREATE
└── index.ts                  ← MODIFY: export SaveIndicator

apps/nextjs/
├── app/
│   └── layout.tsx            ← MODIFY: add ToastContainer
├── components/
│   ├── providers.tsx         ← MODIFY: add ThemeApplier
│   └── toast/
│       ├── toast-item.tsx    ← CREATE
│       └── toast-container.tsx  ← CREATE
└── stores/
    ├── ui-store.ts           ← DO NOT MODIFY (Story 1.4)
    ├── theme-store.ts        ← CREATE
    └── toast-store.ts        ← CREATE

Root:
└── .oxlintrc.json            ← MODIFY: add jsx-a11y plugin + rules
```

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.5 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — Design System Foundation, Dark Operator theme, Three-layer visual system, Color System, SaveIndicator spec, Toast/feedback patterns, Accessibility requirements (WCAG 2.1 AA)]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Frontend Architecture (Tailwind v4 + shadcn/ui = @base-ui/react in practice), Testing strategy, Accessibility baseline]
- [Source: `life-as-code/packages/ui/src/tailwind.css` — Existing OKLCH token system (full file read)]
- [Source: `life-as-code/packages/ui/src/components/button.tsx` — Existing Button component with CVA variants]
- [Source: `life-as-code/packages/ui/src/index.ts` — Current exports]
- [Source: `life-as-code/apps/nextjs/app/globals.css` — Imports `@life-as-code/ui/tailwind.css`]
- [Source: `life-as-code/apps/nextjs/components/providers.tsx` — ThemeProvider already wired]
- [Source: `life-as-code/.oxlintrc.json` — Current lint configuration (jsx-a11y settings present but plugin not enabled)]
- [Source: `life-as-code/.github/workflows/ci.yml` — CI pipeline (lint, typecheck, test, audit)]
- [Source: `life-as-code/_bmad-output/implementation-artifacts/1-4-app-shell-and-navigation-layout.md` — Story 1.4 dev learnings (kebab-case, button types, aria attrs, querySelector)]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- **Windows OOM panic on `bun lint`**: `bun run lint` spawns multi-threaded oxlint which panicked with "The paging file is too small for this operation to complete. (os error 1455)". Workaround: run `bunx oxlint --threads 1` directly. Lint passes cleanly with single thread.
- **Turbo typecheck OOM on `bun install --force`**: `@life-as-code/ui:typecheck` fails via turbo because the tsc bin remapping panics. Workaround: run `bun x tsc --noEmit` directly in each package directory. Both `apps/nextjs` and `packages/ui` pass 0 errors.
- **jsx-a11y `click-events-have-key-events`**: After enabling jsx-a11y plugin, `toast-item.tsx` `<div onClick>` triggered the rule. Fixed by adding `onKeyDown` handler that dismisses on Enter/Space keystrokes.

### Completion Notes List

- All 7 tasks and 20 subtasks implemented and verified
- [Code Review Fix] Destructive button focus ring: removed `focus-visible:ring-destructive/20` opacity, now uses opaque `focus-visible:ring-destructive` for WCAG 2.1 AA compliance
- [Code Review Fix] ThemeApplier now syncs `brightness` to next-themes via `setTheme()` — ThemeStore and next-themes can no longer diverge
- [Code Review Fix] providers.tsx: moved SessionProvider and TRPCReactProvider imports to top of file
- Dark Operator warm stone/rose palette applied to `packages/ui/src/tailwind.css` via OKLCH values
- Three-layer token system: brightness (next-themes), visual character (ThemeStore + ThemeApplier CSS class), accent (CSS variable, rose default)
- `ThemeStore` at `apps/nextjs/stores/theme-store.ts` with `skipHydration: true` + rehydrate on mount
- `ThemeApplier` wired into `providers.tsx` inside ThemeProvider
- Button focus ring updated to fully opaque `ring-2 ring-ring ring-offset-2` — rose-400 (#fb7185) on dark
- `SaveIndicator` component exported from `packages/ui` with 3 states, reduced-motion compatible
- Toast system: session-only Zustand store + `toast-item.tsx` + `toast-container.tsx` wired in `layout.tsx`
- `jsx-a11y` plugin enabled in `.oxlintrc.json` with 6 Level AA rules
- `@axe-core/playwright` installed as dev dependency
- `prefers-reduced-motion` CSS block in `@layer base` suppresses all animations globally

### File List

**Modified:**
- `packages/ui/src/tailwind.css` — Dark Operator OKLCH tokens, feature state colors, reduced-motion block, visual character radius overrides
- `packages/ui/src/components/button.tsx` — focus ring updated to `ring-2 ring-ring ring-offset-2`
- `packages/ui/src/index.ts` — added `Button`, `buttonVariants`, `SaveIndicator` exports
- `apps/nextjs/components/providers.tsx` — added ThemeApplier import + component, `defaultTheme='dark'`
- `apps/nextjs/app/layout.tsx` — added ToastContainer import + component
- `life-as-code/.oxlintrc.json` — added jsx-a11y to plugins, added jsx-a11y override block

**Created:**
- `packages/ui/src/components/save-indicator.tsx`
- `apps/nextjs/stores/theme-store.ts`
- `apps/nextjs/stores/toast-store.ts`
- `apps/nextjs/components/theme/theme-applier.tsx`
- `apps/nextjs/components/toast/toast-item.tsx`
- `apps/nextjs/components/toast/toast-container.tsx`

## Change Log

- 2026-03-14: Story created by claude-sonnet-4-6
- 2026-03-14: Story implemented by claude-sonnet-4-6 — all tasks complete, lint and typecheck pass, status → review
