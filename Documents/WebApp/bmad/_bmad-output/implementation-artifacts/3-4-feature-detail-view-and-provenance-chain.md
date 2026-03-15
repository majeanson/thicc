# Story 3.4: Feature Detail View & Provenance Chain

Status: done

## Story

As a developer or support engineer,
I want to view the full provenance chain of any feature as a readable timeline,
So that I can understand why a feature was built, what decisions shaped it, and what each lifecycle stage contains — without needing to ask the original author.

## Acceptance Criteria

1. **Given** a user navigates to `/features/[id]`, **When** it loads, **Then** the feature key (monospace), title, `FeatureStateBadge`, and `StageCompletionIndicator` are displayed prominently in the header above the provenance chain — server-prefetched via RSC

2. **Given** the `ProvenanceChain` component, **When** it renders, **Then** all 9 lifecycle stages appear as a vertical timeline: each stage has a dot (filled = has content, empty = not started), stage name, and content area; stages with content are expanded by default; stages without content show "Not yet documented" in `text-muted-foreground`

3. **Given** a lifecycle stage has content, **When** displayed in the provenance chain, **Then** all non-empty field values are visible with their field labels; `DecisionLogEntry` items appear below the fields with left accent border and `<time>` timestamps

4. **Given** a lifecycle stage is expanded, **When** the user clicks the stage header, **Then** the content area collapses with a "Collapse" toggle; clicking again re-expands it

5. **Given** the feature detail tabs, **When** the page renders, **Then** tabs for "Overview", "Decisions", "Annotations", and "History" are visible; Overview shows the `ProvenanceChain`; Decisions shows all decision log entries across all stages; Annotations and History tabs render "Coming soon" placeholders

6. **Given** the tabs are URL-hash synced, **When** the user navigates to `#decisions`, **Then** the Decisions tab is active on load; when the user switches tabs, the URL hash updates via `history.replaceState`; ← → arrow keys switch tabs when the tab strip has focus

7. **Given** the breadcrumb navigation, **When** a feature with a parent is viewed, **Then** the breadcrumb shows `Life as Code › [Parent Feature Key] › feat-YYYY-NNN`; the parent key links to `/features/[parentId]`; the current key is not a link

8. **Given** a "Edit in Wizard" CTA in the header, **When** clicked, **Then** the user navigates to `/features/[id]/wizard`

## Tasks / Subtasks

- [x] Task 1: Create RSC page at `app/(features)/features/[id]/page.tsx` (AC: #1, #7)
  - [x] 1.1 Create `apps/nextjs/app/(features)/features/[id]/page.tsx` — RSC with `params: Promise<{ id: string }>`
  - [x] 1.2 Prefetch `getFeature` for the feature
  - [x] 1.3 Conditionally prefetch parent feature from queryClient if parentId present
  - [x] 1.4 Wrap `<FeatureDetailView featureId={id} />` in `<HydrateClient>`
  - [x] 1.5 Added `/features/${SafeSlug<T>}` to `DynamicRoutes` in both `.next/types/link.d.ts` and `.next/dev/types/link.d.ts`

- [x] Task 2: Create `components/features/provenance-chain.tsx` — timeline component (AC: #2, #3, #4)
  - [x] 2.1 Create `apps/nextjs/components/features/provenance-chain.tsx` — `"use client"`
  - [x] 2.2 Props: `feature: Feature` (Drizzle type from `@life-as-code/db`)
  - [x] 2.3 Import `LIFECYCLE_STAGES`, `STAGE_FIELD_CONFIGS`, `DecisionLogEntry`
  - [x] 2.4 Derive `contentMap` from `feature.content`
  - [x] 2.5 Expand/collapse state: `useState<Set<string>>` initialised with content-having stages
  - [x] 2.6 `hasStageContent` helper at module scope
  - [x] 2.7 Render vertical timeline with `role="list"`; each stage `role="listitem"` with `aria-label`
  - [x] 2.8 Stage dot: filled/outlined based on content presence
  - [x] 2.9 Stage header row: dot + name + toggle button
  - [x] 2.10 Iterate `STAGE_FIELD_CONFIGS[stage] ?? []` — show non-empty field values
  - [x] 2.11 Show `DecisionLogEntry` items for each stage's decisions array
  - [x] 2.12 Empty stage: "Not yet documented" italic
  - [x] 2.13 Connector line: `w-0.5 flex-1 bg-border` vertical bar between stages

- [x] Task 3: Create `components/features/feature-detail-view.tsx` — client component (AC: #1, #5, #6, #7, #8)
  - [x] 3.1 Create `apps/nextjs/components/features/feature-detail-view.tsx` — `"use client"`
  - [x] 3.2 Props: `featureId: string`
  - [x] 3.3 Fetch feature with `useQuery(trpc.features.getFeature.queryOptions({ id: featureId }))`
  - [x] 3.4 Conditional parent fetch with `enabled: !!feature?.parentId`
  - [x] 3.5 Tab state: `useState<Tab>('overview')`
  - [x] 3.6 Hash sync on mount via `useEffect` + `window.location.hash`
  - [x] 3.7 `switchTab` calls `history.replaceState` for URL hash sync
  - [x] 3.8 Tab keyboard nav: ArrowLeft/ArrowRight with `tabRefs` focus management
  - [x] 3.9 Compute `contentMap`, `title`, `tags`, `completedStages`
  - [x] 3.10 Header: breadcrumb, featureKey, h1 title, FeatureStateBadge, StageCompletionIndicator, "Edit in Wizard →" link, tags strip
  - [x] 3.11 Tab strip with `role="tablist"`, roving tabIndex, active border styling
  - [x] 3.12 Tab panels: Overview (ProvenanceChain), Decisions (grouped by stage), Annotations/History ("Coming soon")
  - [x] 3.13 Loading skeleton with `animate-pulse` divs

- [x] Task 4: Update route types and verify typecheck + lint (AC: all)
  - [x] 4.1 Added `/features/${SafeSlug<T>}` to `DynamicRoutes` in `.next/types/link.d.ts`
  - [x] 4.2 Added `/features/${SafeSlug<T>}` to `DynamicRoutes` in `.next/dev/types/link.d.ts`
  - [x] 4.3 `bun x tsc --noEmit` in `apps/nextjs` — 0 errors
  - [x] 4.4 `bunx oxlint --threads 1` from repo root — 0 errors/warnings

## Dev Notes

### Route Structure — New Page vs Existing Wizard

The existing wizard route is `/features/[id]/wizard` (file: `app/(features)/features/[id]/wizard/page.tsx`).

The new detail/read view is `/features/[id]` (file: `app/(features)/features/[id]/page.tsx`).

These co-exist as sibling/parent routes. Next.js App Router handles nested dynamic segments correctly — the `[id]/page.tsx` does NOT conflict with `[id]/wizard/page.tsx`.

```
app/(features)/features/
  [id]/
    page.tsx          ← CREATE: read-only detail view (this story)
    wizard/
      page.tsx        ← EXISTING: wizard editor
```

### RSC Prefetch Pattern (same as wizard page)

```typescript
// app/(features)/features/[id]/page.tsx
import { headers } from 'next/headers'
import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { FeatureDetailView } from '@/components/features/feature-detail-view'

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trpc = createTRPC({ headers: await headers() })
  const queryClient = getQueryClient()

  await queryClient.prefetchQuery(trpc.features.getFeature.queryOptions({ id }))

  // Prefetch parent if feature has one (for breadcrumb)
  const featureData = queryClient.getQueryData(
    trpc.features.getFeature.queryOptions({ id }).queryKey,
  )
  if (featureData?.parentId) {
    await queryClient.prefetchQuery(
      trpc.features.getFeature.queryOptions({ id: featureData.parentId }),
    )
  }

  return (
    <HydrateClient>
      <FeatureDetailView featureId={id} />
    </HydrateClient>
  )
}
```

### tRPC Query Pattern in Client Component

```typescript
// No new tRPC procedures — getFeature already returns full Feature
const trpc = useTRPC()
const { data: feature } = useQuery(trpc.features.getFeature.queryOptions({ id: featureId }))

// Conditional parent fetch — enabled only if parentId present
const { data: parentFeature } = useQuery({
  ...trpc.features.getFeature.queryOptions({ id: feature?.parentId ?? '' }),
  enabled: !!feature?.parentId,
})
```

`getFeature` input: `GetFeatureSchema` = `{ id: string }`. Returns full `Feature` including `parentId: string | null`, `content: unknown`, all fields.

### Content Map Pattern (consistent with WizardShell and FeatureCard)

```typescript
const contentMap = feature.content as Record<string, Record<string, unknown>> | undefined
const title = (contentMap?.problem?.problemStatement as string | undefined) ?? 'Untitled'
const tags = Array.isArray(contentMap?.tags)
  ? (contentMap.tags as string[]).filter((t): t is string => typeof t === 'string')
  : []
const completedStages = LIFECYCLE_STAGES.filter((stage) => {
  const s = contentMap?.[stage]
  return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
}).length
```

### ProvenanceChain — Stage Field Rendering

Iterate `STAGE_FIELD_CONFIGS[stage]` to show field labels and values. Skip the `decisions` array (handled separately). Skip empty/undefined values — only render populated fields.

```typescript
import { STAGE_FIELD_CONFIGS } from '@/components/wizard/stage-fields'
import { LIFECYCLE_STAGES } from '@life-as-code/validators'
import type { DecisionEntry } from '@life-as-code/validators'

// For each stage:
const stageData = contentMap?.[stage] as Record<string, unknown> | undefined
const decisions = (stageData?.decisions as DecisionEntry[]) ?? []

// Render non-decision fields:
{STAGE_FIELD_CONFIGS[stage].map((field) => {
  const value = stageData?.[field.key]
  if (typeof value !== 'string' || !value.trim()) return null
  return (
    <div key={field.key}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.label}</p>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  )
})}

// Render decisions:
{decisions.length > 0 && (
  <div className="mt-3 flex flex-col gap-3">
    {decisions.map((d) => <DecisionLogEntry key={d.id} entry={d} />)}
  </div>
)}
```

> **Important**: `STAGE_FIELD_CONFIGS` is in `@/components/wizard/stage-fields`, NOT in `@life-as-code/validators`. Import path is `@/components/wizard/stage-fields`.

### ProvenanceChain — Collapse/Expand State

Use `Set<string>` (stage names as strings, not LifecycleStage type) to avoid TypeScript Set generic issues:

```typescript
const [expanded, setExpanded] = useState<Set<string>>(() => {
  const initial = new Set<string>()
  for (const stage of LIFECYCLE_STAGES) {
    if (hasStageContent(contentMap, stage)) {
      initial.add(stage)
    }
  }
  return initial
})

// Toggle:
const toggleStage = (stage: string) => {
  setExpanded((prev) => {
    const next = new Set(prev)
    if (next.has(stage)) {
      next.delete(stage)
    } else {
      next.add(stage)
    }
    return next
  })
}
```

> **`noUncheckedIndexedAccess` guard**: `STAGE_FIELD_CONFIGS[stage]` returns `FieldConfig[] | undefined`. Guard with `STAGE_FIELD_CONFIGS[stage] ?? []` before `.map()`.

### Tab Implementation — URL Hash Sync

Hash-based tab routing avoids `useSearchParams()` (which needs Suspense). Use native `window.location.hash` instead:

```typescript
const TABS = ['overview', 'decisions', 'annotations', 'history'] as const
type Tab = typeof TABS[number]

const [activeTab, setActiveTab] = useState<Tab>('overview')

useEffect(() => {
  const hash = window.location.hash.slice(1)
  if ((TABS as readonly string[]).includes(hash)) {
    setActiveTab(hash as Tab)
  }
}, [])

const switchTab = (tab: Tab) => {
  setActiveTab(tab)
  const newHash = tab === 'overview' ? '' : `#${tab}`
  history.replaceState(null, '', newHash || window.location.pathname)
}
```

Tab keyboard nav:
```typescript
const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
  let next: number | null = null
  if (e.key === 'ArrowRight') next = (currentIndex + 1) % TABS.length
  else if (e.key === 'ArrowLeft') next = (currentIndex - 1 + TABS.length) % TABS.length
  if (next !== null) {
    e.preventDefault()
    const nextTab = TABS[next]
    if (nextTab) {
      switchTab(nextTab)
      tabRefs.current[next]?.focus()
    }
  }
}
```

Use `tabRefs = useRef<(HTMLButtonElement | null)[]>([])` for focus management. Avoid `no-non-null-assertion`: use `TABS[next]` with `if (nextTab)` guard.

### Decisions Tab — Flat List Across All Stages

```typescript
const allDecisions = LIFECYCLE_STAGES.flatMap((stage) => {
  const stageData = contentMap?.[stage] as Record<string, unknown> | undefined
  const decisions = (stageData?.decisions as DecisionEntry[]) ?? []
  return decisions.map((d) => ({ ...d, stage }))
})
```

Render grouped by stage:
```tsx
{LIFECYCLE_STAGES.map((stage) => {
  const stageDecisions = allDecisions.filter(d => d.stage === stage)
  if (stageDecisions.length === 0) return null
  return (
    <section key={stage}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {STAGE_LABEL[stage]}
      </h3>
      <div className="flex flex-col gap-3">
        {stageDecisions.map((d) => <DecisionLogEntry key={d.id} entry={d} />)}
      </div>
    </section>
  )
})}
```

Define `STAGE_LABEL` at module scope (same map as in `wizard-shell.tsx`).

### Breadcrumb Navigation

```tsx
<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
  <Link href="/" className="hover:text-foreground">Life as Code</Link>
  {parentFeature && (
    <>
      <span aria-hidden="true">›</span>
      <Link href={`/features/${parentFeature.id}`} className="hover:text-foreground font-mono">
        {parentFeature.featureKey}
      </Link>
    </>
  )}
  <span aria-hidden="true">›</span>
  <span className="font-mono text-foreground">{feature.featureKey}</span>
</nav>
```

### Route Type Update — DynamicRoutes

Story 3-3 demonstrated adding `/tree` to `StaticRoutes`. For this story, `/features/[id]` is already partially covered by the existing DynamicRoutes pattern but needs explicit addition:

In `.next/types/link.d.ts` (and dev types), add to `DynamicRoutes`:
```typescript
type DynamicRoutes<T extends string = string> =
  | `/api/auth/${CatchAllSlug<T>}`
  | `/api/trpc/${CatchAllSlug<T>}`
  | `/features/${SafeSlug<T>}`        ← ADD THIS
  | `/features/${SafeSlug<T>}/wizard`
```

### Loading Skeleton Pattern

```tsx
if (!feature) {
  return (
    <div className="animate-pulse p-6 flex flex-col gap-4">
      <div className="h-4 w-48 rounded bg-muted" />
      <div className="h-8 w-96 rounded bg-muted" />
      <div className="h-4 w-32 rounded bg-muted" />
    </div>
  )
}
```

### oxlint Rules to Watch

- **`consistent-function-scoping`**: `hasStageContent`, `STAGE_LABEL`, `TABS` — define at module scope
- **`explicit-length-check`**: `decisions.length > 0`, `tags.length > 0`, `allDecisions.length > 0`
- **`no-negated-condition`**: flip any `!condition ? a : b` → `condition ? b : a`
- **`no-non-null-assertion`**: `TABS[next]` returns `string | undefined` — guard with `if (nextTab)`; `STAGE_FIELD_CONFIGS[stage]` returns `FieldConfig[] | undefined` — guard with `?? []`
- **`no-array-index-key`**: use `field.key` and `d.id` as React keys — already stable
- **`no-array-sort`**: not needed here (no sorting)

### Existing Components to Reuse

| Component | Import path |
|-----------|-------------|
| `FeatureStateBadge` | `@/components/features/feature-state-badge` |
| `StageCompletionIndicator` | `@/components/features/stage-completion-indicator` |
| `DecisionLogEntry` | `@/components/wizard/decision-log-entry` |
| `STAGE_FIELD_CONFIGS` | `@/components/wizard/stage-fields` |
| `useTRPC` | `@/trpc/react` |
| `HydrateClient`, `createTRPC`, `getQueryClient` | `@/trpc/rsc` |
| `LIFECYCLE_STAGES` | `@life-as-code/validators` |
| `Feature` type | `@life-as-code/db` |
| `DecisionEntry` type | `@life-as-code/validators` |

### Windows Build Constraints (Same as Every Story)

- **Typecheck**: `bun x tsc --noEmit` in `apps/nextjs` — do NOT use turbo typecheck (OOM)
- **Lint**: `bunx oxlint --threads 1` from repo root — do NOT use `bun run lint` (OOM)
- No test framework available — vitest/jest not set up

### File Structure for This Story

```
apps/nextjs/
  app/(features)/features/[id]/
    page.tsx                                    ← CREATE: RSC page with prefetch
  components/features/
    feature-detail-view.tsx                     ← CREATE: "use client" — tabs, header, breadcrumb
    provenance-chain.tsx                        ← CREATE: "use client" — stage timeline
```

No new tRPC procedures needed — `getFeature` is already implemented and returns the full `Feature` record.

### Project Structure Notes

- Architecture doc references `apps/web/` — confirmed override: actual path is `apps/nextjs/`
- Route group `(features)` does NOT appear in URLs — `/features/[id]` is the correct browser URL
- `[id]` segment matches the existing wizard pattern `features/[id]/wizard/page.tsx`
- `feature-detail-view.tsx` and `provenance-chain.tsx` co-located with other feature components in `components/features/`

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.4 — BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — RSC vs Client rules, tRPC prefetch pattern, file structure]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — ProvenanceChain, DecisionLogEntry, tab navigation, breadcrumb]
- [Source: `life-as-code/apps/nextjs/app/(features)/features/[id]/wizard/page.tsx` — RSC prefetch pattern to mirror]
- [Source: `life-as-code/apps/nextjs/components/wizard/decision-log-entry.tsx` — reusable component]
- [Source: `life-as-code/apps/nextjs/components/wizard/stage-fields.ts` — STAGE_FIELD_CONFIGS field labels]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` — STAGE_LABEL map, contentMap pattern]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — getFeature procedure, no new tRPC needed]
- [Source: `life-as-code/apps/nextjs/components/features/feature-card.tsx` — title/tags/completedStages pattern]
- [Source: `_bmad-output/implementation-artifacts/3-3-feature-tree-view.md` — route type update pattern, lint fixes]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `no-map-spread` lint error in `feature-detail-view.tsx`: `decisions.map((d) => ({ ...d, stage }))` — spreading in map is flagged. Fixed by restructuring to `decisions.map((d) => ({ decision: d, stage }))` and updating render to destructure `{ decision }`.

### Completion Notes List

- Created RSC page at `/features/[id]` — mirrors wizard page pattern; conditionally prefetches parent feature for breadcrumb using `queryClient.getQueryData` after initial prefetch.
- `ProvenanceChain`: `Set<string>` for expand state initialized with content-having stages; `hasStageContent` at module scope; `STAGE_FIELD_CONFIGS[stage] ?? []` guards `noUncheckedIndexedAccess`.
- `FeatureDetailView`: hash-based tabs avoid `useSearchParams` (no Suspense needed); `TABS as readonly string[]` cast for `.includes(hash)` type safety; roving tabIndex with `tabRefs`.
- `allDecisions` uses `{ decision, stage }` tuple shape (not spread) to satisfy `no-map-spread`.
- Added `/features/${SafeSlug<T>}` to DynamicRoutes in both `.next/types/link.d.ts` files.
- Final: 0 TS errors, 0 oxlint errors.

### File List

- apps/nextjs/app/(features)/features/[id]/page.tsx (CREATE)
- apps/nextjs/components/features/feature-detail-view.tsx (CREATE)
- apps/nextjs/components/features/provenance-chain.tsx (CREATE)
- apps/nextjs/.next/types/link.d.ts (MODIFY — added /features/${SafeSlug<T>} to DynamicRoutes)
- apps/nextjs/.next/dev/types/link.d.ts (MODIFY — added /features/${SafeSlug<T>} to DynamicRoutes)
