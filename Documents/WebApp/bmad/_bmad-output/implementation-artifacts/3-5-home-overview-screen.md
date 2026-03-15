# Story 3.5: Home / Overview Screen

Status: done

## Story

As a user,
I want a home screen that shows recent activity and provides clear entry points to core workflows,
So that I can orient myself quickly and reach the right area of the app from a single landing page.

## Acceptance Criteria

1. **Given** a user navigates to `/`, **When** the home page loads, **Then** it displays three clear entry point sections: "Browse Feature Tree", "Search Features", and "Recent Activity" — server-prefetched via RSC using `listFeatures`

2. **Given** the "Recent Activity" section, **When** features exist, **Then** the 5 most recently updated features are shown as compact `FeatureCard` components (reuse existing component) with last-updated timestamps visible in the card footer

3. **Given** the "Browse Feature Tree" entry point, **When** clicked, **Then** the user navigates to `/tree`

4. **Given** the "Search Features" entry point, **When** clicked, **Then** the global search overlay opens with focus on the search input (calls `useSearchStore().open()`)

5. **Given** no features exist yet, **When** the home page loads, **Then** the Recent Activity section shows: "No features yet — create your first one" with a primary CTA linking to `/features/new` or the wizard creation flow

6. **Given** the home page renders on mobile (<768px), **When** viewed, **Then** the three entry point sections stack vertically and the layout is fully readable without horizontal scrolling

## Tasks / Subtasks

- [x] Task 1: Remove root redirect stub `app/page.tsx` (AC: #1)
  - [x] 1.1 Delete `apps/nextjs/app/page.tsx` — it currently redirects to `/features` and conflicts with `app/(features)/page.tsx` (both map to `/` in the App Router)
  - [x] 1.2 After deletion, the `(features)` route group's `page.tsx` becomes the sole handler for `/` — this is correct since `(features)/layout.tsx` provides the AppShell (sidebar + header)

- [x] Task 2: Transform `app/(features)/page.tsx` into RSC home page (AC: #1, #2)
  - [x] 2.1 Replace the `redirect('/features')` stub with a real async RSC page function
  - [x] 2.2 Import `{ headers }` from `'next/headers'`, `{ HydrateClient, createTRPC, getQueryClient }` from `'@/trpc/rsc'`, and `{ HomeOverview }` from `'@/components/features/home-overview'`
  - [x] 2.3 In the page function: `const trpc = createTRPC({ headers: await headers() })` then `await getQueryClient().prefetchQuery(trpc.features.listFeatures.queryOptions())`
  - [x] 2.4 Return `<HydrateClient><HomeOverview /></HydrateClient>`
  - [x] 2.5 The `listFeatures` procedure returns features ordered by `updatedAt DESC` — slicing to first 5 is done in the client component, not here

- [x] Task 3: Create `HomeOverview` client component (AC: #1–#6)
  - [x] 3.1 Create `apps/nextjs/components/features/home-overview.tsx` — `"use client"` (required for `useSearchStore` access)
  - [x] 3.2 Fetch prefetched data: `const trpc = useTRPC()` and `const { data: features = [] } = useQuery(trpc.features.listFeatures.queryOptions())`
  - [x] 3.3 Get search opener: `const openSearch = useSearchStore((s) => s.open)` — selector form avoids full store re-render
  - [x] 3.4 Slice recent features: `const recentFeatures = features.slice(0, 5)`
  - [x] 3.5 Layout: outer `<div className="flex flex-col gap-8 p-6">` — top-level page container
  - [x] 3.6 Header section: `<h1>` with app name and subtitle (`text-2xl font-bold`)
  - [x] 3.7 Entry points grid: `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">` containing two quick-action cards (Browse Feature Tree, Search Features)
  - [x] 3.8 "Browse Feature Tree" card: `<Link href="/tree">` wrapped card with title + description (`text-sm text-muted-foreground`)
  - [x] 3.9 "Search Features" card: `<button type="button" onClick={() => { openSearch() }}>` wrapped card with title + description; keyboard hint "⌘K" visible in the card
  - [x] 3.10 Recent Activity section: separate `<section>` below the entry point grid with `<h2>` heading and `<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">` of `<FeatureCard>` components
  - [x] 3.11 Empty state: when `features.length === 0`, replace the FeatureCard grid with `<p>No features yet — create your first one</p>` and a `<Link href="/features/new">` primary CTA button
  - [x] 3.12 Card styling (Browse + Search entry points): `rounded-lg border border-border bg-card p-5 hover:border-primary transition-colors` — matches FeatureCard container style
  - [x] 3.13 Import `FeatureCard` from `'@/components/features/feature-card'`, `useSearchStore` from `'@/stores/search-store'`, `Link` from `'next/link'`, `useTRPC` from `'@/trpc/react'`, `useQuery` from `'@tanstack/react-query'`

- [x] Task 4: Verify build — typecheck + lint (AC: all)
  - [x] 4.1 `bun x tsc --noEmit` in `apps/nextjs` — 0 errors
  - [x] 4.2 `bunx oxlint --threads 1` from repo root — 0 errors/warnings

## Dev Notes

### Route Conflict Resolution

Both `app/page.tsx` and `app/(features)/page.tsx` currently map to the `/` route. Route groups (`(features)`) do not add to the URL — they only affect layout inheritance. Next.js would throw a routing conflict with both files present.

**Action**: Delete `app/page.tsx`. The home page lives in `app/(features)/page.tsx` so it inherits the AppShell layout from `app/(features)/layout.tsx` (sidebar + header). This is the correct structure.

### RSC Prefetch Pattern (Consistent with Story 3.3 and 3.4)

```typescript
// app/(features)/page.tsx
import { headers } from 'next/headers'
import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { HomeOverview } from '@/components/features/home-overview'

export default async function HomePage() {
  const trpc = createTRPC({ headers: await headers() })
  await getQueryClient().prefetchQuery(trpc.features.listFeatures.queryOptions())
  return (
    <HydrateClient>
      <HomeOverview />
    </HydrateClient>
  )
}
```

### HomeOverview Client Component Sketch

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { useTRPC } from '@/trpc/react'
import { useSearchStore } from '@/stores/search-store'
import { FeatureCard } from './feature-card'

export function HomeOverview() {
  const trpc = useTRPC()
  const { data: features = [] } = useQuery(trpc.features.listFeatures.queryOptions())
  const openSearch = useSearchStore((s) => s.open)
  const recentFeatures = features.slice(0, 5)

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Life as Code</h1>
        <p className="mt-1 text-sm text-muted-foreground">Feature provenance tracker</p>
      </div>

      {/* Entry point cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/tree"
          className="rounded-lg border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <h2 className="font-semibold text-foreground">Browse Feature Tree</h2>
          <p className="mt-1 text-sm text-muted-foreground">Explore features and their relationships</p>
        </Link>

        <button
          type="button"
          onClick={() => { openSearch() }}
          className="rounded-lg border border-border bg-card p-5 text-left hover:border-primary transition-colors"
        >
          <h2 className="font-semibold text-foreground">Search Features</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Find any feature by keyword <span className="font-mono text-xs">⌘K</span>
          </p>
        </button>
      </div>

      {/* Recent Activity */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Recent Activity
        </h2>
        {features.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No features yet — create your first one</p>
            <Link
              href="/features/new"
              className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create Feature
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentFeatures.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

### useSearchStore Selector Pattern

Use selector form to avoid re-rendering `HomeOverview` on every store change:

```typescript
// Preferred — only subscribes to `open` function reference (stable)
const openSearch = useSearchStore((s) => s.open)

// Avoid — subscribes to entire store object
const { open: openSearch } = useSearchStore()
```

### listFeatures Return Order

`listFeatures` orders by `updatedAt DESC` — the first 5 entries are the 5 most recently updated features. `.slice(0, 5)` in the client component gives the correct "Recent Activity" subset.

### Lint Rules to Watch

- `consistent-function-scoping`: Any pure helper functions (e.g., content extraction) must be at module scope, not defined inside the component
- `explicit-length-check`: Use `features.length === 0`, not `!features.length`
- `no-map-spread`: Avoid `features.map(f => ({ ...f, extra }))` — pass the object as-is to `FeatureCard` which accepts the full feature shape
- The `useSearchStore` selector callback `(s) => s.open` must be a stable reference — define inline is fine since Zustand memoizes selector results

### Mobile Responsive Layout

The three entry point cards use `grid-cols-1 sm:grid-cols-3` — on mobile they stack vertically. The Recent Activity cards use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. No horizontal scrolling at any breakpoint.

### `/features/new` Route

The empty state CTA links to `/features/new`. This route may not exist yet (Epic 2 wizard creates features via the wizard route, not `/new`). If TypeScript complains about the route not being in `StaticRoutes`, either:
- Add `/features/new` to `StaticRoutes` in both `.next/types/link.d.ts` and `.next/dev/types/link.d.ts`
- Or use a button that opens the feature creation wizard another way (check how existing feature creation is initiated)

> **Guidance**: Check `apps/nextjs/.next/dev/types/link.d.ts` for existing routes. If `/features/new` is not a valid route, link to `/tree` or adjust the CTA to point to the correct creation entry point. Do not use `as any` or type assertions — add the route to the `.d.ts` files if needed.

### Existing Components and Stores to Reuse

| Item | Import path |
|------|-------------|
| `FeatureCard` | `@/components/features/feature-card` |
| `useSearchStore` | `@/stores/search-store` |
| `useTRPC` | `@/trpc/react` |
| `HydrateClient`, `createTRPC`, `getQueryClient` | `@/trpc/rsc` |

### Windows Build Constraints (Same as Every Story)

- **Typecheck**: `bun x tsc --noEmit` in `apps/nextjs` — do NOT use turbo typecheck (OOM)
- **Lint**: `bunx oxlint --threads 1` from repo root — do NOT use `bun run lint` (OOM)
- No test framework available — vitest/jest not set up

### File Structure for This Story

```
apps/nextjs/
  app/
    page.tsx                                    ← DELETE: root redirect stub (conflicts with (features)/page.tsx)
  app/(features)/
    page.tsx                                    ← MODIFY: redirect → RSC home with listFeatures prefetch
  components/features/
    home-overview.tsx                           ← CREATE: "use client" component with 3 entry points
```

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.5 — BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — RSC vs Client rules, tRPC prefetch pattern]
- [Source: `life-as-code/apps/nextjs/components/features/feature-card.tsx` — FeatureCard props shape]
- [Source: `life-as-code/apps/nextjs/stores/search-store.ts` — useSearchStore.open() signature]
- [Source: `life-as-code/apps/nextjs/app/(features)/features/page.tsx` — RSC pattern to follow]
- [Source: `life-as-code/apps/nextjs/app/(features)/tree/page.tsx` — RSC prefetch pattern (story 3.3)]
- [Source: `life-as-code/apps/nextjs/trpc/rsc.tsx` — RSC prefetch helpers]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `.next/types/validator.ts` referenced `../../app/page.js` after `app/page.tsx` was deleted — removed the stale validation block from that file. This file is auto-generated by Next.js and regenerates on `next dev`/`next build`.
- Entry point grid: story spec said `sm:grid-cols-3` but only two quick-action cards exist (Browse + Search); Recent Activity is a separate section below — used `sm:grid-cols-2` for the top grid to avoid an empty third column.

### Completion Notes List

- Deleted `app/page.tsx` (root redirect stub) — `app/(features)/page.tsx` is now the sole `/` handler, inheriting AppShell layout.
- `app/(features)/page.tsx`: transformed from `redirect('/features')` to RSC page prefetching `listFeatures` via `createTRPC`/`getQueryClient`.
- `HomeOverview` client component: `useSearchStore((s) => s.open)` selector form for stable reference; `features.slice(0, 5)` for recent activity; `FeatureCard` reused as-is; empty state with `/features/new` CTA (already a valid DynamicRoute via `SafeSlug<'new'>`).
- Mobile responsive: `grid-cols-1 sm:grid-cols-2` for entry points, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for FeatureCards.
- Final: 0 TS errors, 0 oxlint errors.

### File List

- apps/nextjs/app/page.tsx (DELETE)
- apps/nextjs/app/(features)/page.tsx (MODIFY)
- apps/nextjs/components/features/home-overview.tsx (CREATE)
- apps/nextjs/.next/types/validator.ts (MODIFY — removed stale app/page.tsx validation block)
