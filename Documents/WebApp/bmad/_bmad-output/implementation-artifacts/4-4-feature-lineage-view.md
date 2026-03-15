# Story 4.4: Feature Lineage View

Status: done

## Story

As a developer or new team member,
I want to see the full lineage of any feature — its parent, siblings, and children — in context,
so that I can trace how a feature evolved and navigate the complete family tree from a single feature.

## Acceptance Criteria

1. **Given** a feature detail page for a feature with a parent, **When** the Overview tab renders, **Then** a "Lineage" section shows the direct parent feature as a compact card link above the ProvenanceChain

2. **Given** the lineage section, **When** sibling features exist (other children of the same parent), **Then** siblings are listed as compact card links with their status badges

3. **Given** the lineage section, **When** child features exist (features spawned from this one), **Then** children are listed as compact card links with the spawn reason shown beneath each card

4. **Given** a lineage card is clicked, **When** the user navigates to a parent, sibling, or child, **Then** they land on that feature's **detail page** (`/features/[id]`) with its own lineage section correctly populated

5. **Given** a root feature (no parent), **When** the lineage section renders, **Then** the parent and siblings sections are absent; only children (if any) are shown; if no children either, the entire lineage section renders nothing

6. **Given** the Feature Tree page, **When** a child feature spawned via Story 4.2/4.3 exists, **Then** its position in the tree correctly reflects the parent-child relationship — this is already handled by `build-tree.ts` using `parentId`, no code change required; verify with manual confirmation in Task 3

## Tasks / Subtasks

- [x] Task 1: Create `LineageSection` component (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 Create `apps/nextjs/components/features/lineage-section.tsx` (see Dev Notes for full implementation)
  - [x] 1.2 Component queries `features.getLineage` with `{ id: featureId }` via `useQuery`
  - [x] 1.3 If parent, siblings, and children are all empty → return null (renders nothing)
  - [x] 1.4 Render "Parent" subsection when `data.parent` is non-null
  - [x] 1.5 Render "Siblings" subsection when `data.siblings.length > 0`
  - [x] 1.6 Render "Children" subsection when `data.children.length > 0`; each child card shows spawn reason beneath it
  - [x] 1.7 All lineage cards link to `/features/[id]` (detail page), NOT the wizard

- [x] Task 2: Integrate `LineageSection` into `feature-detail-view.tsx` (AC: #1–#5)
  - [x] 2.1 Import `LineageSection` from `'./lineage-section'`
  - [x] 2.2 In the Overview tab render block, add `<LineageSection featureId={featureId} />` **before** `<ProvenanceChain feature={feature} />`

- [x] Task 3: Verify Feature Tree reflects spawned lineage (AC: #6)
  - [x] 3.1 Confirm `build-tree.ts` uses `parentId` to build parent-child tree (it does — no code change needed)
  - [x] 3.2 Add a comment in story completion notes confirming AC #6 verified by code inspection

- [x] Task 4: Typecheck and lint
  - [x] 4.1 Run `bun x tsc --noEmit` in `apps/nextjs` — confirm 0 errors
  - [x] 4.2 Run `bunx oxlint --threads 1` from repo root — confirm 0 errors

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

TypeScript check: `bun x tsc --noEmit` from `apps/nextjs` directory. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: `features.getLineage` Already Exists — Do NOT Recreate

`features.getLineage` was implemented in Story 4.2. It returns:
```typescript
{ parent: Feature | null, children: Feature[], siblings: Feature[] }
```
The `Feature` type is imported from `@life-as-code/db`.

Query pattern (already used throughout the app):
```typescript
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/react'

const trpc = useTRPC()
const { data } = useQuery(trpc.features.getLineage.queryOptions({ id: featureId }))
```

---

### CRITICAL: Link Target Is Detail Page, NOT Wizard

`FeatureCard` links to `/features/${feature.id}/wizard`. Lineage cards must link to `/features/${feature.id}` (the detail page). Do NOT reuse `FeatureCard` — create compact inline cards in `LineageSection`.

---

### CRITICAL: `no-non-null-assertion` Lint Rule

Never use `!` for non-null assertion. Use optional chaining or early guard instead.

---

### CRITICAL: `boolean` Prop Shorthand

`frozen` not `frozen={true}` (oxlint enforces jsx-boolean-value shorthand).

---

### CRITICAL: Overlay Dialog Lint Pattern

If any dialog is added, `role="dialog"` must be on the outer div that also has `onClick` and `onKeyDown` (matching `search-overlay.tsx` pattern).

---

### `LineageSection` — Full Implementation

```typescript
// apps/nextjs/components/features/lineage-section.tsx
"use client"

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import type { Feature } from '@life-as-code/db'
import { LIFECYCLE_STAGES } from '@life-as-code/validators'

import { useTRPC } from '@/trpc/react'

import { FeatureStateBadge } from './feature-state-badge'

interface LineageSectionProps {
  featureId: string
}

function getTitle(feature: Feature): string {
  const contentMap = feature.content as Record<string, Record<string, unknown>> | undefined
  return (contentMap?.problem?.problemStatement as string | undefined) ?? 'Untitled'
}

function getSpawnReason(feature: Feature): string | undefined {
  const contentMap = feature.content as Record<string, Record<string, unknown>> | undefined
  return contentMap?.spawn?.spawnReason as string | undefined
}

function LineageCard({ feature, spawnReason }: { feature: Feature; spawnReason?: string }) {
  const title = getTitle(feature)
  return (
    <div className="flex flex-col gap-1">
      <Link
        href={`/features/${feature.id}`}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary"
      >
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{feature.featureKey}</span>
        <span className="flex-1 truncate text-foreground">{title}</span>
        <FeatureStateBadge status={feature.status} frozen={feature.frozen} variant="compact" />
      </Link>
      {spawnReason && (
        <p className="px-3 text-xs text-muted-foreground">
          <span className="font-medium">Spawn reason:</span> {spawnReason}
        </p>
      )}
    </div>
  )
}

export function LineageSection({ featureId }: LineageSectionProps) {
  const trpc = useTRPC()
  const { data } = useQuery(trpc.features.getLineage.queryOptions({ id: featureId }))

  if (!data) return null

  const { parent, siblings, children } = data
  const hasLineage = parent !== null || siblings.length > 0 || children.length > 0

  if (!hasLineage) return null

  return (
    <section aria-label="Feature lineage" className="mb-6 flex flex-col gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lineage</h3>

      {parent && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Parent</p>
          <LineageCard feature={parent} />
        </div>
      )}

      {siblings.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Siblings ({siblings.length})</p>
          <div className="flex flex-col gap-1.5">
            {siblings.map((sibling) => (
              <LineageCard key={sibling.id} feature={sibling} />
            ))}
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Children ({children.length})</p>
          <div className="flex flex-col gap-3">
            {children.map((child) => (
              <LineageCard key={child.id} feature={child} spawnReason={getSpawnReason(child)} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
```

---

### Integration Into `feature-detail-view.tsx` Overview Tab

Current Overview tab render:
```tsx
{activeTab === 'overview' && (
  <ProvenanceChain feature={feature} />
)}
```

After modification:
```tsx
import { LineageSection } from './lineage-section'

// ...

{activeTab === 'overview' && (
  <div className="flex flex-col gap-6">
    <LineageSection featureId={featureId} />
    <ProvenanceChain feature={feature} />
  </div>
)}
```

Note: The wrapping `div` is needed to give proper spacing. `LineageSection` returns `null` for root features with no children — the `div` wrapper has no visual impact in that case (zero-gap flex with a null child).

---

### `FeatureStateBadge` `variant="compact"` Prop

`FeatureStateBadge` accepts a `variant` prop with value `"compact"`. This is used in `feature-tree-node.tsx`. Use it for lineage cards to keep them slim.

Check `apps/nextjs/components/features/feature-state-badge.tsx` to confirm the `variant` prop signature before using.

---

### Feature Tree (AC #6) — No Code Change Required

`build-tree.ts` at `apps/nextjs/lib/build-tree.ts`:
```typescript
if (f.parentId && map.has(f.parentId)) {
  map.get(f.parentId)?.children.push(node)
} else {
  roots.push(node)
}
```
This already correctly places child features (with `parentId` set) under their parent in the tree. When a feature is spawned via Story 4.2/4.3, it gets `parentId` set in the DB, and `listFeatures` returns all features. The tree is built client-side from the full list using this `parentId` relationship. AC #6 is satisfied by existing code — just verify by inspection and note in completion notes.

---

### `Feature` Type Import

```typescript
import type { Feature } from '@life-as-code/db'
```

`@life-as-code/db` re-exports the Drizzle inferred row type as `Feature`. Do NOT import from `drizzle-orm` directly.

---

### `FeatureStateBadge` Import

```typescript
import { FeatureStateBadge } from './feature-state-badge'
```

(Same directory — `apps/nextjs/components/features/`)

---

### Previous Story Intelligence (Stories 4.1–4.3 Learnings)

1. **Rebuild `packages/api` before TSC** — if new tRPC procedures are involved: `cd packages/api && bun run build`. Story 4.4 uses `features.getLineage` which already exists and dist is already built — no rebuild needed unless other package changes occur.

2. **`bun x tsc --noEmit` from `apps/nextjs`** — not from root (Windows OOM with turbo).

3. **`bunx oxlint --threads 1`** — from repo root.

4. **`type="button"` on all buttons** — oxlint enforces. All `<button>` elements need explicit `type`.

5. **`frozen` not `frozen={true}`** — oxlint jsx-boolean-value.

6. **No `async` on outer mutation/query callbacks** — use `.mutate()` not `await mutateAsync()`.

7. **`useQuery` pattern** — `useQuery(trpc.features.X.queryOptions({ id }))`.

8. **`role="dialog"` on outer overlay div** — must have both `onClick` and `onKeyDown` on same element.

9. **No non-null assertion** — use optional chaining or early guard.

---

### File Structure for This Story

```
apps/nextjs/components/features/
├── lineage-section.tsx          ← CREATE: lineage parent/sibling/child cards
├── feature-detail-view.tsx      ← MODIFY: add LineageSection to Overview tab
└── (feature-state-badge.tsx)    ← no changes (already handles compact variant)

apps/nextjs/lib/
└── (build-tree.ts)              ← no changes (already handles parentId)
```

---

### What This Story Does NOT Include

- Recursive ancestor chain (grandparent, great-grandparent) — only direct parent
- Pagination of siblings/children — render all (counts expected to be small)
- Inline spawn action from the lineage section — SpawnDialog is in Story 4.3
- Feature tree visual enhancements — Story 4.4 only verifies existing tree works

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.4 — Full BDD acceptance criteria]
- [Source: `life-as-code/apps/nextjs/components/features/feature-detail-view.tsx` — Overview tab, existing imports, feature query pattern]
- [Source: `life-as-code/apps/nextjs/components/features/feature-card.tsx` — compact card visual style reference]
- [Source: `life-as-code/apps/nextjs/components/features/feature-state-badge.tsx` — frozen variant, compact variant]
- [Source: `life-as-code/apps/nextjs/components/features/feature-tree-node.tsx` — `variant="compact"` usage]
- [Source: `life-as-code/apps/nextjs/lib/build-tree.ts` — parentId-based tree construction]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — `features.getLineage` procedure, return type]
- [Source: `_bmad-output/implementation-artifacts/4-2-spawn-child-feature-trpc-procedure.md` — getLineage implementation]
- [Source: `_bmad-output/implementation-artifacts/4-3-freeze-and-spawn-ui.md` — previous story learnings]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Created `lineage-section.tsx`: self-contained `"use client"` component with `useQuery(trpc.features.getLineage)`. Returns `null` for features with no lineage. Renders parent, siblings (with count), and children (with count + spawn reason) as compact `LineageCard` links to `/features/[id]` (detail page, not wizard).
- Modified `feature-detail-view.tsx`: imported `LineageSection`, wrapped Overview tab content in a flex-col gap-6 div, placed `<LineageSection featureId={featureId} />` before `<ProvenanceChain>`.
- AC #6 verified: `build-tree.ts` uses `parentId` to nest spawned children under their parent node — no code change required. Feature tree correctly reflects spawn relationships automatically.
- `tsc --noEmit` → 0 errors | `oxlint --threads 1` → 0 errors/warnings

### File List

- `apps/nextjs/components/features/lineage-section.tsx` (created)
- `apps/nextjs/components/features/feature-detail-view.tsx` (modified)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — all 4 tasks complete, status → review
