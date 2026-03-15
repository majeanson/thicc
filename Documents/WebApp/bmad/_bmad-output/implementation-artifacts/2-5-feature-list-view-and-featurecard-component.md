# Story 2.5: Feature List View & FeatureCard Component

Status: done

## Story

As a user,
I want to see a list of all features with their status and lifecycle progress at a glance,
So that I can navigate to any feature and continue working on it.

## Acceptance Criteria

1. **Given** a user navigates to the features list page, **When** the page loads, **Then** all features are displayed as `FeatureCard` components sorted by `updated_at` descending, with data server-prefetched via RSC `prefetchQuery(trpc.features.listFeatures.queryOptions())`

2. **Given** a `FeatureCard` renders, **When** a feature is displayed, **Then** the card shows: feature key in monospace font, problem statement as title (or "Untitled" if empty), `FeatureStateBadge`, `StageCompletionIndicator`, and a metadata row with last-updated timestamp and up to 3 tag badges

3. **Given** `FeatureStateBadge` renders in compact context, **When** space is constrained to icon-only, **Then** the badge includes `aria-label="Feature status: [state]"` so screen readers convey the state

4. **Given** `StageCompletionIndicator` renders, **When** 3 of 9 stages have content, **Then** 5 pips display with the appropriate number filled in accent color, and carries `aria-label="3 of 9 lifecycle stages complete"`

5. **Given** the feature list is empty, **When** the page renders with no features, **Then** an empty state shows "Create your first feature" with a primary CTA button — not a void or error state

6. **Given** a `FeatureCard` is clicked, **When** the user selects a feature, **Then** they navigate to `/features/{id}/wizard` (the wizard reads last-edited stage from Zustand persist store)

7. **Given** the feature list is fetching, **When** data is loading, **Then** 3 `FeatureCard` skeleton shimmer blocks render matching the card layout — no spinner

## Tasks / Subtasks

- [x] Task 1: Create `feature-state-badge.tsx` — status chip component (AC: #2, #3)
  - [x] 1.1 Create `apps/nextjs/components/features/feature-state-badge.tsx` (no `"use client"` — purely presentational, used in client tree)
  - [x] 1.2 Props: `status: 'active' | 'draft' | 'frozen'`, `frozen: boolean`, `variant?: 'full' | 'compact'` (default `'full'`)
  - [x] 1.3 Derive display state: if `frozen === true` → `'frozen'`; else use `status` value
  - [x] 1.4 Style map (use Tailwind semantic tokens, no hardcoded hex):
    - `frozen`: `text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-300` + label `"Frozen"` + icon `"✦"`
    - `active`: `text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-300` + label `"Active"` + icon `"●"`
    - `draft`: `text-muted-foreground bg-muted` + label `"Draft"` + icon `"○"`
  - [x] 1.5 `full` variant: `<span>` with `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium` — renders icon + label
  - [x] 1.6 `compact` variant: icon-only `<span>` with `aria-label="Feature status: {state}"` and `role="img"`

- [x] Task 2: Create `stage-completion-indicator.tsx` — lifecycle progress pips (AC: #4)
  - [x] 2.1 Create `apps/nextjs/components/features/stage-completion-indicator.tsx` (no `"use client"`)
  - [x] 2.2 Props: `completedStages: number`, `totalStages: number`
  - [x] 2.3 Compute `filledPips = Math.round(completedStages / totalStages * 5)` — clamp to `[0, 5]`
  - [x] 2.4 Render: `<div role="img" aria-label="{completedStages} of {totalStages} lifecycle stages complete" className="flex gap-1">`
  - [x] 2.5 Render 5 `<span>` pips: filled = `w-2 h-2 rounded-full bg-primary` / empty = `w-2 h-2 rounded-full bg-muted border border-border`

- [x] Task 3: Create `feature-card.tsx` — single card (AC: #2, #6)
  - [x] 3.1 Create `apps/nextjs/components/features/feature-card.tsx` (no `"use client"` — uses `<Link>`, no hooks)
  - [x] 3.2 Props interface (inline, do NOT import from `@life-as-code/db`):
    ```typescript
    interface FeatureCardProps {
      feature: {
        id: string
        featureKey: string
        status: 'active' | 'draft' | 'frozen'
        frozen: boolean
        content: unknown
        updatedAt: Date
      }
    }
    ```
  - [x] 3.3 Import `Link` from `next/link`, `LIFECYCLE_STAGES` from `@life-as-code/validators`
  - [x] 3.4 Compute from `content` cast as `Record<string, Record<string, unknown>>`:
    - `title = (content?.problem?.problemStatement as string | undefined) ?? 'Untitled'`
    - `tags = (content?.tags as string[] | undefined) ?? []`
    - `completedStages` using same logic as `wizard-shell.tsx`:
      ```typescript
      const completedStages = LIFECYCLE_STAGES.filter((stage) => {
        const s = contentMap?.[stage]
        return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
      }).length
      ```
  - [x] 3.5 Wrapper: `<Link href={/features/${feature.id}/wizard} className="block">` inside `<article role="article" aria-label="{title} — {state}" className="rounded-lg border border-border bg-card p-4 hover:border-primary transition-colors">`
  - [x] 3.6 Header row: `<span className="font-mono text-xs text-muted-foreground">{feature.featureKey}</span>` + `<FeatureStateBadge status={feature.status} frozen={feature.frozen} />`
  - [x] 3.7 Title: `<p className="mt-1 text-sm font-medium line-clamp-2">{title}</p>`
  - [x] 3.8 Pips row: `<StageCompletionIndicator completedStages={completedStages} totalStages={LIFECYCLE_STAGES.length} />`
  - [x] 3.9 Metadata footer: `updatedAt.toLocaleDateString()` in `text-xs text-muted-foreground` + up to 3 tag chips (`tags.slice(0, 3)` each as `<span className="rounded-full bg-muted px-2 py-0.5 text-xs">`) + `"+N more"` label if `tags.length > 3`

- [x] Task 4: Create `feature-card-skeleton.tsx` — loading shimmer (AC: #7)
  - [x] 4.1 Create `apps/nextjs/components/features/feature-card-skeleton.tsx` (no `"use client"`)
  - [x] 4.2 Render an `animate-pulse` block matching FeatureCard layout: key bar + title bar (2 lines) + pip row + metadata bar
  - [x] 4.3 Use `bg-muted rounded` blocks with appropriate heights: key `h-3 w-24`, title `h-4 w-3/4` + `h-4 w-1/2`, pips `flex gap-1` of 5x`h-2 w-2 rounded-full bg-muted`, meta `h-3 w-32`
  - [x] 4.4 Same outer wrapper dimensions as FeatureCard: `rounded-lg border border-border bg-card p-4`

- [x] Task 5: Create `feature-list.tsx` — client list with query (AC: #1, #5, #7)
  - [x] 5.1 Create `apps/nextjs/components/features/feature-list.tsx` (`"use client"`)
  - [x] 5.2 Import: `useQuery` from `@tanstack/react-query`, `useTRPC` from `@/trpc/react`, `Link` from `next/link`, `buttonVariants` from `@life-as-code/ui` (Button.asChild not supported; buttonVariants used instead)
  - [x] 5.3 `const trpc = useTRPC()` + `const { data, isLoading } = useQuery(trpc.features.listFeatures.queryOptions())`
  - [x] 5.4 Loading: `if (isLoading) return <ul ...>{[0,1,2].map(i => <li key={i}><FeatureCardSkeleton /></li>)}</ul>`
  - [x] 5.5 Empty state: centered div with: `<p>No features yet.</p>` + styled `<Link>` using `buttonVariants()`
  - [x] 5.6 List: `<ul role="list" className="flex flex-col gap-3">{data.map(f => <li key={f.id}><FeatureCard feature={f} /></li>)}</ul>`
  - [x] 5.7 Wrap list in a section with a header row: `<h1 className="text-lg font-semibold">Features</h1>` + styled `<Link>` using `buttonVariants({ size: 'sm' })`

- [x] Task 6: Update features page — RSC prefetch (AC: #1)
  - [x] 6.1 Replace placeholder in `apps/nextjs/app/(features)/features/page.tsx` with async RSC
  - [x] 6.2 Exact RSC pattern (match wizard page in `app/(features)/features/[id]/wizard/page.tsx`):
    ```typescript
    import { headers } from 'next/headers'
    import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
    import { FeatureList } from '@/components/features/feature-list'

    export default async function FeaturesPage() {
      const trpc = createTRPC({ headers: await headers() })
      await getQueryClient().prefetchQuery(trpc.features.listFeatures.queryOptions())
      return (
        <HydrateClient>
          <div className="p-6">
            <FeatureList />
          </div>
        </HydrateClient>
      )
    }
    ```
  - [x] 6.3 Create `apps/nextjs/app/(features)/features/loading.tsx` — returns 3x `<FeatureCardSkeleton />` skeletons in a `p-6 flex flex-col gap-3` wrapper for Next.js route-level loading

- [x] Task 7: Verification (AC: all)
  - [x] 7.1 `bun run build` in `packages/validators` — ensures types are up to date
  - [x] 7.2 `bun x tsc --noEmit` in `apps/nextjs` — 0 errors
  - [x] 7.3 `bunx oxlint --threads 1` from root — 0 errors

## Dev Notes

### CRITICAL: File Naming is kebab-case (NOT PascalCase)

`unicorn/filename-case` enforces kebab-case for ALL files. Architecture doc says `FeatureCard.tsx` — IGNORE that. Actual names:
- `feature-card.tsx` ✓
- `feature-state-badge.tsx` ✓
- `stage-completion-indicator.tsx` ✓
- `feature-card-skeleton.tsx` ✓
- `feature-list.tsx` ✓

---

### CRITICAL: Do NOT import from `packages/db` in `apps/nextjs`

Package import boundary established in Stories 2.1–2.4. The `Feature` type from `@life-as-code/db` is NOT available in the Next.js app. Define the props interface inline in `feature-card.tsx` using only what you need — the tRPC response will satisfy it.

---

### CRITICAL: `"use client"` Only Where Needed

- `feature-list.tsx` — `"use client"` required (uses `useQuery`, `useTRPC`)
- `feature-card.tsx` — NO directive (uses `Link`, no hooks) — renders inside client tree
- `feature-state-badge.tsx` — NO directive (purely presentational)
- `stage-completion-indicator.tsx` — NO directive (purely presentational)
- `feature-card-skeleton.tsx` — NO directive (purely presentational)

---

### Feature Schema — What Fields the Card Uses

From `packages/db/src/schema/features.ts`:
```typescript
{
  id: string          // ULID primary key
  featureKey: string  // e.g. "feat-2026-001"
  status: 'active' | 'draft' | 'frozen'
  frozen: boolean     // separate from status; if true → show 'frozen' badge regardless of status
  content: unknown    // JSONB — cast as needed (see below)
  updatedAt: Date     // SuperJSON serializes this as real Date on client
}
```

`content` JSONB structure (established in Stories 2.1–2.4):
```
{
  problem: { problemStatement: "...", decisions: [...] },
  analysis: { analysisNotes: "...", decisions: [...] },
  ...(other stages)
  tags: ["backend", "mvp"]    ← top-level, NOT inside a stage
}
```

**Title derivation:** `(content as any)?.problem?.problemStatement ?? 'Untitled'`
**Tags derivation:** `(content as any)?.tags as string[] | undefined ?? []`
**Stage completion:** count stages where at least one string field is non-empty (same logic as `wizard-shell.tsx`):
```typescript
const completedStages = LIFECYCLE_STAGES.filter((stage) => {
  const s = (content as Record<string, Record<string, unknown>>)?.[stage]
  return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
}).length
```

---

### RSC Prefetch Pattern (exact match from wizard page)

`apps/nextjs/app/(features)/features/[id]/wizard/page.tsx` is the reference for RSC prefetch:

```typescript
import { headers } from 'next/headers'
import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
// ...
const trpc = createTRPC({ headers: await headers() })
await getQueryClient().prefetchQuery(trpc.features.getFeature.queryOptions({ id }))
return <HydrateClient><WizardShell featureId={id} /></HydrateClient>
```

For `listFeatures` (no input): `trpc.features.listFeatures.queryOptions()` (no args needed).

---

### `listFeatures` Already Implemented (Story 2.1)

`packages/api/src/routers/features.ts` already has:
```typescript
listFeatures: publicProcedure.query(({ ctx }) => {
  return ctx.db.select().from(features).where(eq(features.orgId, DEFAULT_ORG_ID)).orderBy(desc(features.updatedAt))
}),
```
No changes needed to the API.

---

### FeatureStateBadge — State Derivation Logic

```typescript
const state = frozen ? 'frozen' : status
```

`'flagged'` state is OUT OF SCOPE — do not implement. Only `frozen`, `active`, `draft`.

Color tokens — use Tailwind v4 semantic colors (NOT hardcoded hex). These survive theme switching:
- frozen: purple tones via `text-purple-600 bg-purple-50`
- active: blue tones via `text-blue-600 bg-blue-50`
- draft: muted via `text-muted-foreground bg-muted`

---

### StageCompletionIndicator — Pip Formula

9 stages → 5 pips. Formula: `Math.round(completedStages / totalStages * 5)` clamped 0–5.

| completedStages | filledPips |
|---|---|
| 0 | 0 |
| 1–2 | 1 |
| 3–4 | 2 |
| 5 | 3 |
| 6–7 | 4 |
| 8–9 | 5 |

`totalStages` is always `LIFECYCLE_STAGES.length` = 9.

---

### FeatureCard Navigation

Card navigates to `/features/${feature.id}/wizard`. The wizard (`WizardShell`) already reads last-edited stage from `useWizardStore` (Zustand persist in `apps/nextjs/stores/wizard-store.ts`). No additional routing params needed.

Use `<Link href={...}>` from `next/link` — do NOT use `useRouter` (would require `"use client"`).

---

### Existing Features Page (Replace Placeholder)

Current `apps/nextjs/app/(features)/features/page.tsx`:
```typescript
export default function FeaturesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Feature Tree</h1>
      <p className="mt-2 text-muted-foreground">Feature tree coming in Epic 2.</p>
    </div>
  )
}
```

Replace entirely with async RSC + prefetch pattern (Task 6.2).

---

### `Button` with `asChild` Pattern

The `@life-as-code/ui` Button component supports `asChild` prop (shadcn/ui pattern). Use it to wrap `<Link>` inside `<Button>`:
```tsx
<Button asChild size="sm">
  <Link href="/features/new">+ New Feature</Link>
</Button>
```

---

### Lint Rules (from Stories 2.1–2.4)

- `unicorn/filename-case`: kebab-case filenames only
- `require-await`: only mark functions `async` if they use `await`
- `no-non-null-assertion`: use `?.` and `??` instead of `!`
- No unused `async` on event handlers

---

### Windows Build Notes (from Stories 2.1–2.4)

- **Typecheck**: `bun x tsc --noEmit` in `apps/nextjs` — do NOT use turbo typecheck (OOM)
- **Lint**: `bunx oxlint --threads 1` from root — do NOT use `bun run lint` (OOM)
- **Validators build**: Run `bun run build` in `packages/validators` first if typecheck fails with missing types
- **App build**: `bun run build` in `apps/nextjs` segfaults on Windows post-processing — known Bun/Windows bug; Vercel CI succeeds
- **API rebuild**: If new tRPC procedures were added in a prior story session, run `bun run build` in `packages/api` before typecheck

---

### Scope for This Story

**In scope:**
- `feature-state-badge.tsx` — status badge component
- `stage-completion-indicator.tsx` — pip progress indicator
- `feature-card.tsx` — single card layout
- `feature-card-skeleton.tsx` — loading shimmer
- `feature-list.tsx` — client query + list rendering
- Update `features/page.tsx` — RSC prefetch + HydrateClient
- `features/loading.tsx` — route-level skeleton

**Out of scope (future stories):**
- Tag filtering / search → Story 3.2
- Feature tree view sidebar → Story 3.3
- `FeatureCard` in ProvenanceChain → Story 3.4
- Frozen/spawn UI interactions → Stories 4.2–4.3
- `compact` variant of FeatureCard for tree nodes → Story 3.3

---

### File Structure for This Story

```
apps/nextjs/
  app/(features)/features/
    page.tsx                       ← MODIFY: replace placeholder with RSC prefetch
    loading.tsx                    ← CREATE: route-level skeleton
  components/features/
    feature-card.tsx               ← CREATE: card layout + navigation
    feature-card-skeleton.tsx      ← CREATE: animate-pulse shimmer
    feature-list.tsx               ← CREATE: "use client" — useQuery + list
    feature-state-badge.tsx        ← CREATE: status chip
    stage-completion-indicator.tsx ← CREATE: 5-pip progress indicator
```

No changes to `packages/api`, `packages/validators`, or `packages/db`.

---

### Project Structure Notes

- Architecture doc references `apps/web/` and `components/features/FeatureCard.tsx` (PascalCase) — **override confirmed by Stories 2.1–2.4**: actual app path is `apps/nextjs/`, all files must be kebab-case
- New feature-level components go in `apps/nextjs/components/features/` (not `components/wizard/`)
- Route group `(features)` confirmed: `apps/nextjs/app/(features)/features/page.tsx` is the existing placeholder to replace
- No changes to `packages/api`, `packages/validators`, or `packages/db` — `listFeatures` procedure was implemented in Story 2.1

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.5 — BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — FeatureCard anatomy, FeatureStateBadge, StageCompletionIndicator, empty state, loading state]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — tRPC naming conventions, RSC prefetch pattern, component boundaries]
- [Source: `_bmad-output/implementation-artifacts/2-4-decision-log-entries-and-tags.md` — kebab-case enforcement, import boundaries, Windows build notes, lint rules]
- [Source: `life-as-code/apps/nextjs/app/(features)/features/[id]/wizard/page.tsx` — exact RSC prefetch pattern]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` — stage completedCount logic, content JSONB casting]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — listFeatures procedure (already implemented)]
- [Source: `life-as-code/packages/db/src/schema/features.ts` — Feature table schema, status enum values]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `Button` component uses `@base-ui/react/button` (not shadcn/ui), so `asChild` prop is not supported. Used `buttonVariants` to style `<Link>` components directly instead.
- `oxlint` flagged `no-negated-condition` on `!data?.length` ternary — flipped condition to `data?.length` with branches swapped.

### Completion Notes List

- Implemented all 5 new components in `apps/nextjs/components/features/` following kebab-case naming and correct `"use client"` boundaries
- `feature-state-badge.tsx`: presentational badge with full/compact variants and accessibility aria-label on compact
- `stage-completion-indicator.tsx`: 5-pip progress indicator with Math.round formula, clamped 0–5
- `feature-card.tsx`: card layout linking to `/features/{id}/wizard`, inline props interface (no db import)
- `feature-card-skeleton.tsx`: animate-pulse shimmer matching FeatureCard layout
- `feature-list.tsx`: client component with useQuery, skeleton loading, empty state CTA, list rendering
- Replaced `features/page.tsx` placeholder with RSC prefetch + HydrateClient pattern
- Created `features/loading.tsx` for Next.js route-level loading with 3 skeletons
- 0 TypeScript errors, 0 oxlint errors

### File List

- apps/nextjs/components/features/feature-state-badge.tsx (created)
- apps/nextjs/components/features/stage-completion-indicator.tsx (created)
- apps/nextjs/components/features/feature-card.tsx (created)
- apps/nextjs/components/features/feature-card-skeleton.tsx (created)
- apps/nextjs/components/features/feature-list.tsx (created)
- apps/nextjs/app/(features)/features/page.tsx (modified)
- apps/nextjs/app/(features)/features/loading.tsx (created)

## Change Log

- 2026-03-14: Implemented Story 2.5 — created FeatureStateBadge, StageCompletionIndicator, FeatureCard, FeatureCardSkeleton, FeatureList components; updated features page with RSC prefetch; added route-level loading skeleton. Used buttonVariants instead of Button asChild (not supported by @base-ui/react/button).
- 2026-03-14: Code review by claude-sonnet-4-6 — no issues found specific to story 2.5; status → done
