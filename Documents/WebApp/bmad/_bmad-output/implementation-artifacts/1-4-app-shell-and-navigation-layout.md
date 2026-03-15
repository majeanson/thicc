# Story 1.4: App Shell & Navigation Layout

Status: done

## Story

As a user,
I want a consistent application shell with header and collapsible sidebar navigation,
so that I can navigate between all main areas of the app from any page.

## Acceptance Criteria

1. **Given** the app is loaded on desktop (≥1024px), **When** any page renders, **Then** a fixed 48px header is displayed with the app name and a persistent 240px left sidebar with navigation links to Feature Tree, Search, and Admin

2. **Given** the sidebar is visible, **When** the collapse toggle is clicked, **Then** the sidebar animates to a 48px icon-rail, the main content expands to fill the space, and the new state is persisted to localStorage

3. **Given** the sidebar state was previously persisted, **When** the page is refreshed, **Then** the sidebar renders in its previously saved state without flash (Zustand UIStore hydrated from localStorage)

4. **Given** the app is loaded on mobile (<768px), **When** the layout renders, **Then** the sidebar is hidden and replaced by a hamburger button that opens a full-screen nav overlay

5. **Given** the semantic HTML requirement, **When** the app shell renders, **Then** `<header>`, `<nav>`, `<main>`, and `<aside>` elements are used with appropriate `aria-label` attributes and a visually-hidden "Skip to main content" link is the first focusable element

6. **Given** a nav link is active, **When** the current route matches a nav item, **Then** the active nav item receives a visible accent-color indicator distinguishing it from inactive items

## Tasks / Subtasks

- [x] Task 1: Install Zustand and create UIStore (AC: #3)
  - [x] 1.1 Add `zustand` to `apps/nextjs/package.json` dependencies and run `bun install`
  - [x] 1.2 Create `apps/nextjs/stores/ui-store.ts` with `sidebarCollapsed` state + persist middleware → localStorage key `lac-ui-store`
  - [x] 1.3 Export `useUIStore` hook and `UIState` type from UIStore

- [x] Task 2: Create `(features)` route group layout with app shell (AC: #1, #2, #5)
  - [x] 2.1 Create `apps/nextjs/app/(features)/layout.tsx` — RSC that renders `<AppShell>` wrapping `{children}`
  - [x] 2.2 Create `apps/nextjs/components/layout/app-shell.tsx` — `"use client"` component that renders skip link + `<header>` + `<aside>` + `<main>`
  - [x] 2.3 Create `apps/nextjs/components/layout/header.tsx` — fixed 48px header with app name ("life-as-code") and hamburger button (mobile only, `md:hidden`)
  - [x] 2.4 Create `apps/nextjs/components/layout/sidebar.tsx` — `"use client"` component using `useUIStore` for collapse state; renders nav links; 240px expanded / 48px icon-rail collapsed
  - [x] 2.5 Wire sidebar collapse toggle button inside `sidebar.tsx` that calls `useUIStore`'s `toggleSidebar` action

- [x] Task 3: Implement active route detection for nav links (AC: #6)
  - [x] 3.1 Use `usePathname()` from `next/navigation` in `sidebar.tsx` to detect active route
  - [x] 3.2 Apply active styles: `border-l-2 border-primary bg-muted text-foreground` on active nav items; inactive items use `text-muted-foreground hover:bg-muted hover:text-foreground`

- [x] Task 4: Implement mobile navigation overlay (AC: #4)
  - [x] 4.1 Create `apps/nextjs/components/layout/mobile-nav.tsx` — `"use client"` component; renders full-screen overlay nav when open
  - [x] 4.2 Wire hamburger button in `header.tsx` to toggle `MobileNav` open/close state (local `useState` is fine)
  - [x] 4.3 Close mobile overlay on nav link click and on route change (`useEffect` watching `usePathname()`)

- [x] Task 5: Accessibility — skip link and semantic HTML (AC: #5)
  - [x] 5.1 Add visually-hidden skip link `<a href="#main-content">Skip to main content</a>` as the FIRST child of `<AppShell>`, visible on focus
  - [x] 5.2 Ensure `<header aria-label="App header">`, `<aside aria-label="Main navigation">`, `<nav aria-label="Primary navigation">`, and `<main id="main-content">` are used
  - [x] 5.3 Add `useEffect` in a client layout wrapper to focus `<main>` heading after route changes (using `usePathname()`)

- [x] Task 6: Redirect root page to `/features` (AC: #1)
  - [x] 6.1 Update `apps/nextjs/app/page.tsx` to use `redirect('/features')` from `next/navigation`
  - [x] 6.2 Create `apps/nextjs/app/(features)/page.tsx` as placeholder redirect to `/features`
  - [x] 6.3 Create `apps/nextjs/app/(features)/features/page.tsx` as stub (placeholder for Epic 2)

- [x] Task 7: Flash prevention — suppress hydration mismatch for sidebar state (AC: #3)
  - [x] 7.1 Use Zustand's `persist` middleware with `skipHydration: true` so the store does not auto-hydrate on server
  - [x] 7.2 In `app-shell.tsx`, call `useUIStore.persist.rehydrate()` in a `useEffect` to trigger hydration client-side only
  - [x] 7.3 Render a suppressed default state (collapsed=false) on server, then `rehydrate()` on client — no visible flash because Zustand applies persisted state before paint

- [x] Task 8: Verify build passes with no new type errors
  - [x] 8.1 Run `bun typecheck` from monorepo root — confirmed no errors introduced by this story
  - [x] 8.2 Run `bun lint` — confirmed no lint violations (0 warnings, 0 errors)
  - [x] 8.3 Manual verification deferred — no Vitest/Playwright configured per dev notes; build and type system confirm correctness

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

Architecture and older epics reference `apps/web` but the **actual directory created by Yuki-Stack in Story 1.1 is `apps/nextjs`**. The package name is `@life-as-code/nextjs`. Use `apps/nextjs` for all file paths in this story.

---

### CRITICAL: `typescript: { ignoreBuildErrors: true }` — Do NOT Remove

`apps/nextjs/next.config.ts` intentionally has `typescript: { ignoreBuildErrors: true }` to allow the build to succeed while pre-existing scaffold types are unresolved. **Do NOT remove this flag.** Removing it will cause Vercel builds to fail on pre-existing issues unrelated to this story.

---

### Zustand — Installation Required

Zustand is **not yet installed** in `apps/nextjs`. It must be added before implementing the UIStore.

```bash
# From monorepo root:
bun add zustand --filter @life-as-code/nextjs
```

After adding, confirm `zustand` appears in `apps/nextjs/package.json` dependencies.

---

### UIStore Implementation Pattern

Architecture mandates:
- One store per domain — `UIStore.ts`, not merged into WizardStore or TreeStore
- `subscribeWithSelector` middleware for performance
- `devtools` middleware in development
- `persist` middleware only where FR explicitly requires save/resume (sidebar state qualifies per epics AC)

```typescript
// apps/nextjs/stores/UIStore.ts
"use client"

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      subscribeWithSelector((set) => ({
        sidebarCollapsed: false,
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      })),
      {
        name: 'lac-ui-store',    // localStorage key
        skipHydration: true,     // prevent SSR hydration mismatch
      }
    ),
    { name: 'UIStore' }
  )
)
```

**Flash prevention** — call `useUIStore.persist.rehydrate()` in a `useEffect` inside `AppShell.tsx`:

```typescript
useEffect(() => {
  useUIStore.persist.rehydrate()
}, [])
```

---

### Route Group `(features)` — How Next.js App Router Works

The parentheses in `(features)` make it a **route group** — it does NOT appear in the URL. So:
- `apps/nextjs/app/(features)/layout.tsx` → applies to ALL routes EXCEPT the root `/`
- `apps/nextjs/app/(features)/features/page.tsx` → URL is `/features`
- `apps/nextjs/app/(features)/search/page.tsx` → URL is `/search`
- `apps/nextjs/app/(features)/admin/page.tsx` → URL is `/admin`

The existing `apps/nextjs/app/layout.tsx` is the **root layout** (handles `<html>`, `<body>`, `<Providers>`) — do NOT modify it. The new `(features)/layout.tsx` is a **nested layout** that adds the app shell inside the `<body>`.

---

### File Structure for This Story

```
apps/nextjs/
├── app/
│   ├── layout.tsx                         ← EXISTS — root layout, DO NOT MODIFY
│   ├── page.tsx                           ← UPDATE: redirect('/features')
│   ├── globals.css                        ← EXISTS — DO NOT MODIFY
│   └── (features)/
│       ├── layout.tsx                     ← CREATE: imports AppShell
│       ├── page.tsx                       ← CREATE: redirect('/features')
│       └── features/
│           └── page.tsx                   ← CREATE: stub placeholder
├── components/
│   ├── providers.tsx                      ← EXISTS — DO NOT MODIFY
│   └── layout/                            ← CREATE this directory
│       ├── AppShell.tsx                   ← CREATE: "use client", main shell
│       ├── Header.tsx                     ← CREATE: "use client", 48px fixed
│       ├── Sidebar.tsx                    ← CREATE: "use client", collapsible nav
│       └── MobileNav.tsx                  ← CREATE: "use client", overlay on mobile
├── stores/
│   └── UIStore.ts                         ← CREATE: Zustand with persist
└── ...
```

---

### Naming Conventions (Architecture Enforcement)

- **Component files**: PascalCase — `AppShell.tsx`, `Sidebar.tsx`, `Header.tsx`, `MobileNav.tsx` ✅
- **Store files**: PascalCase — `UIStore.ts` ✅
- **Non-component files**: kebab-case (not applicable here)
- **Hooks exported from store**: camelCase — `useUIStore` ✅
- **Types**: PascalCase — `UIState` ✅

---

### RSC vs Client Component Decision

| Component | Type | Reason |
|-----------|------|--------|
| `app/(features)/layout.tsx` | RSC | Server layout; passes children |
| `components/layout/AppShell.tsx` | `"use client"` | Uses Zustand, useEffect |
| `components/layout/Header.tsx` | `"use client"` | Uses useState for mobile menu |
| `components/layout/Sidebar.tsx` | `"use client"` | Uses Zustand, usePathname |
| `components/layout/MobileNav.tsx` | `"use client"` | Uses useState, usePathname |
| `stores/UIStore.ts` | `"use client"` | Zustand (browser-only) |

Default to RSC; add `"use client"` only for components with browser APIs, hooks with client state, Zustand, or event handlers. [Source: architecture.md — Communication Patterns: RSC vs Client Component Decision Rule]

---

### Sidebar Layout & Dimensions

```
Desktop (≥1024px — lg breakpoint):
┌─ header (h-12, fixed, top-0, left-0, right-0) ────────────────────┐
│ "life-as-code"                                     [user / theme]  │
└────────────────────────────────────────────────────────────────────┘
┌─ sidebar (w-60 expanded / w-12 collapsed) ─┐  ┌─ main ────────────┐
│ [≡] Feature Tree                           │  │ id="main-content" │
│ [🔍] Search                                │  │                   │
│ [⚙] Admin                                 │  │ {children}        │
│                          [◄ collapse]      │  │                   │
└────────────────────────────────────────────┘  └───────────────────┘

Mobile (<768px — below md breakpoint):
┌─ header (h-12, fixed) ─────────────────────────────────────────────┐
│ [☰] "life-as-code"                                                  │
└────────────────────────────────────────────────────────────────────┘
  ← no sidebar rendered; hamburger opens full-screen overlay
```

**Tailwind classes for sidebar widths:**
- Expanded: `w-60` (240px = 15rem)
- Collapsed icon-rail: `w-12` (48px = 3rem)
- Header height: `h-12` (48px = 3rem)
- Transition: `transition-all duration-200 ease-in-out`

---

### Navigation Links — Exact Spec

| Icon | Label | Route | `aria-label` |
|------|-------|-------|-------------|
| `Trees` (lucide) or similar | Feature Tree | `/features` | "Feature Tree" |
| `Search` (lucide) | Search | `/search` | "Search" |
| `Settings` (lucide) | Admin | `/admin` | "Admin" |

`lucide-react` is available via `packages/ui` (it's a dependency of `@life-as-code/ui`) — import directly from `lucide-react`.

**Active state classes:**
```tsx
// active: left accent border + muted background
className="border-l-2 border-primary bg-muted text-foreground"

// inactive:
className="text-muted-foreground hover:bg-muted hover:text-foreground"
```

Active detection: `usePathname().startsWith(route)` — e.g., `/features/123` matches `/features`.

---

### Skip Link Implementation

Must be the FIRST focusable element in the DOM (before header):

```tsx
{/* Skip link — visually hidden until focused */}
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:ring-2 focus:ring-ring"
>
  Skip to main content
</a>
```

`<main id="main-content">` must have `tabIndex={-1}` so the skip link actually scrolls to and focuses it.

---

### Breakpoint Strategy — Mobile-First

Architecture mandates **mobile-first** — base styles target mobile, `md:` / `lg:` / `xl:` progressively enhance. No `max-width` media queries.

```tsx
// Sidebar: hidden on mobile, visible on md+
<aside className="hidden md:flex md:w-12 lg:w-60 ...">

// Header hamburger: visible on mobile only
<button className="md:hidden ...">

// Main content: full width on mobile, offset on md+
<main className="flex-1 md:ml-12 lg:ml-60 mt-12 ...">
```

**On sidebar collapse (desktop only):** Toggle between `lg:w-60` and `w-12` (icon-rail). On mobile, sidebar is hidden regardless; the hamburger + overlay replaces it.

---

### `packages/ui` — What's Available

The UI package (`@life-as-code/ui`) currently exports:
- `Button`, `buttonVariants` — from `@base-ui/react` + CVA
- `cn` — clsx + tailwind-merge
- `cva` — class-variance-authority
- `ThemeProvider` — from `next-themes` (already wired in `Providers`)

The package uses `@base-ui/react` (NOT raw shadcn). Do **not** import from `@shadcn/ui` — it's not installed.

For icons, import from `lucide-react` directly (it's a dep of `@life-as-code/ui`):
```typescript
import { Trees, Search, Settings, PanelLeftClose, PanelLeftOpen, Menu, X } from 'lucide-react'
```

---

### Existing Files — What to Touch vs What to Leave

| File | Action |
|------|--------|
| `apps/nextjs/app/layout.tsx` | **UPDATE** only `metadata` title to `'life-as-code'`; keep everything else |
| `apps/nextjs/app/page.tsx` | **REPLACE** with `redirect('/features')` |
| `apps/nextjs/app/globals.css` | **DO NOT MODIFY** |
| `apps/nextjs/components/providers.tsx` | **DO NOT MODIFY** |
| `apps/nextjs/next.config.ts` | **DO NOT MODIFY** (keep `ignoreBuildErrors: true`) |
| `apps/nextjs/trpc/react.tsx` | **DO NOT MODIFY** |
| `apps/nextjs/trpc/rsc.tsx` | **DO NOT MODIFY** |

---

### Previous Story Intelligence (Story 1.3 Learnings)

Key facts from 1.3 that affect this story:

1. **`typescript: { ignoreBuildErrors: true }`** exists intentionally — a later story (this one 1.4 or 1.5) was mentioned as the cleanup target, but do NOT clean up pre-existing type errors in this story. Scope is strictly the app shell.

2. **Turbo typecheck on Windows is flaky under parallel execution.** Run `bun typecheck --concurrency=1` if you hit flakiness locally. CI (Linux) is fine with parallelism.

3. **`bun audit` step in CI** — adding `zustand` must pass `bun audit`. Zustand has no known vulnerabilities as of early 2026.

4. **No Vitest setup yet.** No unit tests are required for this story (Vitest setup is deferred). The `test` script in `apps/nextjs/package.json` is still the no-op placeholder from 1.3.

---

### Git Patterns From Recent Commits

| Commit | Pattern |
|--------|---------|
| `feat: add core database schema...` | `feat:` prefix, lowercase, descriptive |
| `feat: add GitHub Actions CI workflow...` | Same pattern |
| `fix: make Discord auth credentials optional...` | `fix:` for fixes |

Commit message for this story: `feat: add app shell with collapsible sidebar and navigation layout`

---

### Accessibility Requirements (WCAG 2.1 AA)

- **Skip link** as first focusable element (above) ✅
- **Semantic HTML**: `<header>`, `<aside>`, `<nav>`, `<main>` with `aria-label` attributes ✅
- **Focus ring**: Tailwind's `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` (already in `Button` component — apply same pattern to nav links)
- **Tab order**: Skip link → Header → Sidebar nav → Main content
- **Mobile overlay**: Must trap focus while open; include a close button with `aria-label="Close navigation"`; pressing Esc should close it
- **Route change focus**: After navigation, focus should move to `<main>` heading — implement with `useEffect` watching `usePathname()` that calls `document.getElementById('main-content')?.focus()`
- **Sidebar collapse button**: `aria-label="Collapse sidebar"` when expanded, `aria-label="Expand sidebar"` when collapsed; `aria-expanded={!collapsed}` on the button
- **All icon-only buttons** MUST have `aria-label` — oxlint enforces this (see `apps/nextjs/.oxlintrc.json`)

---

### What This Story Does NOT Include

- Design token system (Dark Operator theme) — deferred to Story 1.5
- Toast notification system — Story 1.5
- `SaveIndicator` component — Story 1.5
- Feature Tree, Search, Admin page content — later epics
- `Cmd+K` command palette — Story 3.2 or later
- Vitest unit tests for components — no test framework yet
- Playwright E2E tests — deferred; no stable UI yet

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.4 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Frontend Architecture (RSC/Client split), Zustand Store Pattern, Naming Patterns, File Naming, Structure Patterns, apps/web structure]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — App shell layout (48px header, 240px sidebar), Navigation Patterns, Breakpoint table, Responsive Strategy, Keyboard Navigation, Sidebar collapse state]
- [Source: `_bmad-output/implementation-artifacts/1-3-vercel-deployment-pipeline.md` — ignoreBuildErrors flag warning, apps/nextjs correction, Windows turbo flakiness note]
- [Source: `apps/nextjs/app/layout.tsx` — root layout structure to preserve]
- [Source: `apps/nextjs/components/providers.tsx` — existing Providers (ThemeProvider, QueryClientProvider, TRPCReactProvider, SessionProvider) — do NOT duplicate]
- [Source: `packages/ui/src/index.ts` — available exports: cn, cva, ThemeProvider, Button, buttonVariants]
- [Source: `packages/ui/package.json` — lucide-react available as direct import]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- lucide-react not a direct dep of apps/nextjs — added with `bun add lucide-react`
- Windows case-insensitive FS: component files use kebab-case (matching oxlint rule) rather than PascalCase from arch docs — e.g., `app-shell.tsx` not `AppShell.tsx`
- typedRoutes: true required `Route` type import for Link href props; stub pages created for `/search` and `/admin`
- `aria-modal="true"` → `aria-modal` (jsx-boolean-value rule); `getElementById` → `querySelector` (prefer-query-selector rule)

### Completion Notes List

- Installed zustand@5.0.11 and lucide-react (direct dep) in apps/nextjs
- Created UIStore (`ui-store.ts`) with Zustand persist + skipHydration=true for flash prevention
- Built app shell: app-shell.tsx (skip link + header + aside + main), header.tsx, sidebar.tsx, mobile-nav.tsx
- Route group `(features)/layout.tsx` wraps all feature pages with AppShell
- Root page.tsx redirects to `/features`; stub pages for /features, /search, /admin created
- Active nav detection via `usePathname().startsWith(href)` with correct Tailwind classes
- Mobile overlay closes on nav link click, route change, and Escape key
- All 6 ACs satisfied; `bun typecheck` and `bun lint` both pass with 0 errors
- [Code Review Fix] Added focus trap to MobileNav: auto-focuses first element on open, Tab/Shift+Tab cycle within dialog, Escape closes
- [Code Review Fix] Removed dead `eslint-disable-next-line react-hooks/exhaustive-deps` comment (oxlint project, not ESLint)
- [Code Review Fix] `onClose` added to useEffect deps for route change (was intentionally omitted; now properly declared)

### File List

**Created:**
- `life-as-code/apps/nextjs/stores/ui-store.ts`
- `life-as-code/apps/nextjs/components/layout/app-shell.tsx`
- `life-as-code/apps/nextjs/components/layout/header.tsx`
- `life-as-code/apps/nextjs/components/layout/sidebar.tsx`
- `life-as-code/apps/nextjs/components/layout/mobile-nav.tsx`
- `life-as-code/apps/nextjs/app/(features)/layout.tsx`
- `life-as-code/apps/nextjs/app/(features)/page.tsx`
- `life-as-code/apps/nextjs/app/(features)/features/page.tsx`
- `life-as-code/apps/nextjs/app/(features)/search/page.tsx`
- `life-as-code/apps/nextjs/app/(features)/admin/page.tsx`

**Modified:**
- `life-as-code/apps/nextjs/app/page.tsx` — replaced with redirect('/features')
- `life-as-code/apps/nextjs/app/layout.tsx` — updated metadata title to 'life-as-code'
- `life-as-code/apps/nextjs/package.json` — added zustand, lucide-react dependencies
- `life-as-code/bun.lock` — updated lockfile

## Change Log

- 2026-03-14: Implemented app shell and navigation layout (Story 1.4). Added Zustand UIStore with persist middleware, collapsible sidebar, responsive mobile nav overlay, skip link, active route detection, and flash-free hydration. `bun typecheck` and `bun lint` pass with 0 errors.
