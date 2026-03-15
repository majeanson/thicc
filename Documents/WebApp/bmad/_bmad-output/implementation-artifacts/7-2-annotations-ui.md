# Story 7.2: Annotations UI

Status: done

## Story

As a support engineer or developer,
I want to read, add, and flag annotations on any feature from the feature detail page,
So that I can leave contextual notes for teammates and surface issues that need attention without creating a separate ticket.

## Acceptance Criteria

1. **Given** a user views the Annotations tab on a feature detail page, **When** the tab is selected, **Then** all annotations render as `AnnotationItem` components in chronological order, each showing: author initial avatar, author name, timestamp in a `<time>` element, annotation text, and a flag toggle button

2. **Given** the Annotations tab has no annotations, **When** it renders, **Then** an empty state shows "No annotations yet — be the first to add one" with a clear "Add annotation" CTA

3. **Given** the user clicks "Add annotation", **When** the inline form appears, **Then** a textarea is focused; pressing Cmd+Enter or clicking "Post" submits it

4. **Given** an annotation is submitted, **When** `features.addAnnotation` succeeds, **Then** the new `AnnotationItem` appears at the bottom of the list without a page reload and a success toast fires

5. **Given** an `AnnotationItem`'s flag toggle is clicked to flag, **When** it activates, **Then** the annotation renders with an amber accent, the `FeatureStateBadge` on the feature updates to amber ⚑ "Needs attention", and the toggle has `aria-pressed="true"` and `aria-label="Unflag this annotation"`

6. **Given** all annotations on a feature are unflagged, **When** the last flag is removed, **Then** the feature's `FeatureStateBadge` reverts to its pre-flagged state (`active` or `frozen`)

## Tasks / Subtasks

- [x] Task 1: Add `listAnnotations` prefetch to RSC feature detail page (AC: #1)
  - [x] 1.1 In `apps/nextjs/app/(features)/features/[id]/page.tsx`, add `await queryClient.prefetchQuery(trpc.features.listAnnotations.queryOptions({ id }))` after the existing `getFeature` prefetch line

- [x] Task 2: Create `apps/nextjs/components/features/annotation-list.tsx` client component (AC: #1–#6)
  - [x] 2.1 Add `"use client"` directive; import `useEffect, useRef, useState` from `react`; import `useMutation, useQuery, useQueryClient` from `@tanstack/react-query`; import `useTRPC` from `@/trpc/react`; import `useToastStore` from `@/stores/toast-store`; import `Button` from `@life-as-code/ui`; import type `AnnotationEntry` from `@life-as-code/validators`
  - [x] 2.2 Query annotations: `const { data: annotations = [], isPending } = useQuery(trpc.features.listAnnotations.queryOptions({ id: featureId }))`
  - [x] 2.3 Declare `addAnnotationMutation = useMutation(trpc.features.addAnnotation.mutationOptions())`; in `handleSubmit`, call `addAnnotationMutation.mutate({ featureId, text: newText.trim() }, { onSuccess: () => { invalidate both queries; showToast success "Annotation added"; setNewText(''); setShowForm(false) }, onError: () => { showToast error "Failed to add annotation" } })`
  - [x] 2.4 Declare `flagAnnotationMutation = useMutation(trpc.features.flagAnnotation.mutationOptions())`; in `handleFlag`, call with `{ featureId, annotationId: annotation.id, flagged: !annotation.flagged }`, options object `{ onSuccess: () => { invalidate both queries }, onError: () => { showToast error "Failed to update flag" } }`
  - [x] 2.5 Invalidation pattern (both places): `void queryClient.invalidateQueries({ queryKey: trpc.features.listAnnotations.queryOptions({ id: featureId }).queryKey })` AND `void queryClient.invalidateQueries({ queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey })`
  - [x] 2.6 Textarea `onKeyDown` handler: if `e.key === 'Enter' && (e.metaKey || e.ctrlKey)` → call `handleSubmit()`; use `useRef<HTMLTextAreaElement>` and `useEffect(() => { if (showForm) textareaRef.current?.focus() }, [showForm])`
  - [x] 2.7 **Loading skeleton**: while `isPending`, render 2 `animate-pulse bg-muted rounded` divs
  - [x] 2.8 **Empty state** (when `annotations.length === 0` and `!isPending`): render `<p>No annotations yet — be the first to add one</p>` and an "Add annotation" `<Button type="button">` that sets `showForm(true)`
  - [x] 2.9 **Annotation list** (when `annotations.length > 0`): render `<ul role="list">` with each annotation as `<li role="listitem" key={annotation.id}>`
  - [x] 2.10 **"Add annotation" CTA** (when `annotations.length > 0` and `!showForm`): render an "Add annotation" `<Button type="button" variant="outline">` below the `<ul>`
  - [x] 2.11 **Inline add form** (when `showForm`): textarea + "Post" Button + "Cancel" Button (ghost)
  - [x] 2.12 Export named `AnnotationList` function accepting `{ featureId: string }`

- [x] Task 3: Wire `AnnotationList` into `feature-detail-view.tsx` (AC: #1–#6)
  - [x] 3.1 Import `AnnotationList` from `@/components/features/annotation-list` in `feature-detail-view.tsx`
  - [x] 3.2 Replace the placeholder `<p className="text-sm text-muted-foreground">Annotations — Coming soon</p>` with `<AnnotationList featureId={featureId} />`

- [x] Task 4: Typecheck and lint (AC: all)
  - [x] 4.1 `bun x tsc --noEmit` from `apps/nextjs` — confirmed 0 errors (required rebuilding `packages/validators` and `packages/api` dists first)
  - [x] 4.2 `bunx oxlint --threads 1` from repo root — confirmed 0 warnings/errors

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

All file paths use `apps/nextjs`. TypeScript check: `bun x tsc --noEmit` from `apps/nextjs`. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: `FeatureStateBadge` Already Handles `flagged` — No Modifications Needed

`apps/nextjs/components/features/feature-state-badge.tsx` already defines:

```typescript
flagged: {
  className: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300',
  label: 'Needs attention',
  icon: '⚑',
},
```

When `feature.status === 'flagged'` (and `frozen === false`), the badge automatically shows amber ⚑ "Needs attention". After `flagAnnotation` succeeds, invalidating `getFeature` causes `feature-detail-view.tsx` to re-render with the updated status, updating the badge automatically. **Do NOT modify `feature-state-badge.tsx`.**

---

### CRITICAL: Existing Annotations Tab Placeholder Location

In `feature-detail-view.tsx` (around line 230+), the current placeholder:

```typescript
{activeTab === 'annotations' && (
  <p className="text-sm text-muted-foreground">Annotations — Coming soon</p>
)}
```

Replace the `<p>` with `<AnnotationList featureId={featureId} />`. The `featureId` variable is already available from the component's props (`FeatureDetailViewProps`).

---

### CRITICAL: `FlagAnnotationSchema` Includes `featureId` (Story 7-1 Addition)

The `FlagAnnotationSchema` implemented in Story 7-1 is:

```typescript
export const FlagAnnotationSchema = z.object({
  featureId: z.string().min(1),
  annotationId: z.string().min(1),
  flagged: z.boolean(),
})
```

Pass `featureId` from the `AnnotationList` component prop alongside `annotationId` and `flagged`.

---

### CRITICAL: oxlint Rules (From Previous Stories)

1. **`type="button"`** on ALL `<button>` and `<Button>` elements (no default submit behavior)
2. **No `!` non-null assertion** — use optional chaining: `annotation.actor[0]?.toUpperCase() ?? '?'`
3. **`void` prefix** on floating Promises — `void queryClient.invalidateQueries(...)`
4. **No async outer mutation callbacks** — use options object pattern in `mutate()` call
5. **`no-array-index-key`** — use `annotation.id` as React key (ULIDs, not index)
6. **`no-map-spread`** — avoid `{ ...obj, field }` in `.map()` callbacks; use `Object.assign({}, obj, { field })` if needed
7. **`no-array-sort`** — use `.toSorted()` not `.sort()` if sorting client-side
8. **`require-await`** — don't mark a function `async` if it has no `await` inside
9. **Kebab-case filenames** — `annotation-list.tsx` (not `AnnotationList.tsx`)

---

### Mutation Pattern (From `spawn-dialog.tsx`)

```typescript
const trpc = useTRPC()
const queryClient = useQueryClient()
const showToast = useToastStore((s) => s.showToast)

const addAnnotationMutation = useMutation(trpc.features.addAnnotation.mutationOptions())

function handleSubmit() {
  if (!newText.trim()) return
  addAnnotationMutation.mutate(
    { featureId, text: newText.trim() },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.features.listAnnotations.queryOptions({ id: featureId }).queryKey,
        })
        void queryClient.invalidateQueries({
          queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey,
        })
        showToast({ type: 'success', message: 'Annotation added' })
        setNewText('')
        setShowForm(false)
      },
      onError: () => {
        showToast({ type: 'error', message: 'Failed to add annotation' })
      },
    },
  )
}
```

---

### Textarea Focus Pattern

Use a ref + `useEffect` keyed on `showForm`:

```typescript
const textareaRef = useRef<HTMLTextAreaElement>(null)

useEffect(() => {
  if (showForm) textareaRef.current?.focus()
}, [showForm])
```

---

### Cmd+Enter Keyboard Shortcut

On the textarea's `onKeyDown`:

```typescript
function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    handleSubmit()
  }
}
```

---

### Flag Button ARIA Pattern

```tsx
<button
  type="button"
  aria-pressed={annotation.flagged}
  aria-label={annotation.flagged ? 'Unflag this annotation' : 'Flag this annotation'}
  onClick={() => { handleFlag(annotation) }}
  className={annotation.flagged
    ? 'text-amber-600 hover:text-amber-700'
    : 'text-muted-foreground hover:text-foreground'}
>
  ⚑
</button>
```

`aria-pressed` accepts a boolean in React — it renders as `"true"` or `"false"` in HTML.

---

### RSC Prefetch Pattern (Feature Detail Page)

Current `apps/nextjs/app/(features)/features/[id]/page.tsx`:

```typescript
const { id } = await params
const trpc = createTRPC({ headers: await headers() })
const queryClient = getQueryClient()

await queryClient.prefetchQuery(trpc.features.getFeature.queryOptions({ id }))
// ... parent prefetch

return (
  <HydrateClient>
    <FeatureDetailView featureId={id} />
  </HydrateClient>
)
```

Add after the existing prefetches:

```typescript
await queryClient.prefetchQuery(trpc.features.listAnnotations.queryOptions({ id }))
```

No import changes needed — `trpc.features.listAnnotations` is already available on the tRPC client after Story 7-1 added the procedure.

---

### `AnnotationList` Component Structure

```
AnnotationList (client component — annotation-list.tsx)
├── Loading skeleton (isPending)
├── Empty state (0 annotations, !showForm)
│   ├── "No annotations yet — be the first to add one"
│   └── "Add annotation" Button
├── Annotation list (ul role="list")
│   └── li role="listitem" (key=annotation.id) × N
│       ├── Avatar circle (actor initial)
│       ├── Actor name + <time> timestamp
│       ├── Annotation text <p>
│       └── Flag toggle button (⚑)
├── "Add annotation" Button (when !showForm, below list)
└── Inline add form (when showForm)
    ├── <textarea ref={textareaRef}>
    ├── "Post" Button (primary)
    └── "Cancel" Button (ghost)
```

No sub-component files needed — keep everything in `annotation-list.tsx`.

---

### `AnnotationEntry` Type Import

From Story 7-1, `AnnotationEntry` is exported from `@life-as-code/validators`:

```typescript
import type { AnnotationEntry } from '@life-as-code/validators'
```

Shape: `{ id: string; text: string; actor: string; timestamp: string; flagged: boolean }`

---

### `useToastStore` Import

```typescript
import { useToastStore } from '@/stores/toast-store'
const showToast = useToastStore((s) => s.showToast)
// Usage:
showToast({ type: 'success', message: 'Annotation added' })
showToast({ type: 'error', message: 'Failed to add annotation' })
```

---

### No `AnnotationItem` File — Inline in `AnnotationList`

The architecture spec references `AnnotationList.tsx` as the file for FR38–FR40. Keep annotation rendering logic inline in `annotation-list.tsx`. Do not create a separate `annotation-item.tsx` file — it would be a single-use component with no reuse value in this story.

---

### What This Story Does NOT Include

- **No `FeatureStateBadge` modifications** — it already handles `flagged` status (amber + ⚑ "Needs attention")
- **No History tab** — that's Story 7.3
- **No edit/delete annotation** — out of scope for MVP; annotations are append-only
- **No pagination** — all annotations rendered at once (reasonable for MVP; audit trail pagination is 7.3)
- **No actor identity system** — actor is `ctx.session?.user?.name ?? 'anonymous'` (MVP)

---

### File Structure for This Story

```
apps/nextjs/
├── app/(features)/features/[id]/
│   └── page.tsx              ← MODIFY: add listAnnotations prefetch
└── components/features/
    ├── annotation-list.tsx   ← CREATE: AnnotationList client component
    └── feature-detail-view.tsx ← MODIFY: wire AnnotationList, import it
```

---

### Previous Story Intelligence (Story 7-1)

- `addAnnotation` input: `{ featureId: string, text: string }` — max 5000 chars
- `listAnnotations` input: `{ id: string }` — returns `AnnotationEntry[]` sorted by timestamp ascending
- `flagAnnotation` input: `{ featureId: string, annotationId: string, flagged: boolean }` — note `featureId` was added during implementation (not in original schema spec)
- After `flagAnnotation`, `feature.status` changes to `'flagged'` (any flagged) or reverts to `'active'`/`'frozen'` — invalidating `getFeature` triggers `FeatureStateBadge` update automatically
- Two oxlint issues hit in Story 7-1: `no-map-spread` and `no-array-sort` — watch for these

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 7, Story 7.2 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Frontend architecture, component structure, tRPC client patterns]
- [Source: `life-as-code/apps/nextjs/app/(features)/features/[id]/page.tsx` — RSC prefetch pattern]
- [Source: `life-as-code/apps/nextjs/components/features/feature-detail-view.tsx` — Tab system, featureId, existing annotations placeholder]
- [Source: `life-as-code/apps/nextjs/components/features/feature-state-badge.tsx` — Already handles flagged status with amber styling]
- [Source: `life-as-code/apps/nextjs/components/features/spawn-dialog.tsx` — useMutation, mutate() options object, invalidateQueries, useToastStore patterns]
- [Source: `_bmad-output/implementation-artifacts/7-1-annotations-trpc-procedures.md` — FlagAnnotationSchema shape (featureId added), AnnotationEntry type, oxlint lessons]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_Required rebuilding stale dists before `tsc --noEmit` passed:_
- `packages/validators` → `bun run build` (expose `AnnotationEntry` type from new `annotation.mjs`)
- `packages/api` → `bun run build` (expose `addAnnotation`, `listAnnotations`, `flagAnnotation` procedures)

_No oxlint issues — all 9 rules satisfied on first write._

### Completion Notes List

- Task 1: Added `listAnnotations` prefetch to RSC page — one line after the existing parent prefetch block.
- Task 2: Created `annotation-list.tsx` — `AnnotationList` client component. `invalidateBoth()` helper deduplicates the two `invalidateQueries` calls (for `listAnnotations` and `getFeature`). Flagged annotations get amber border + background on their `<li>` in addition to the amber flag button, giving clear visual grouping. Empty state includes paragraph + CTA button. Annotation list uses `role="list"` + `role="listitem"` per AC.
- Task 3: Wired `AnnotationList` into `feature-detail-view.tsx` — import added alphabetically alongside other feature components, placeholder replaced.
- Task 4: 0 TS errors, 0 lint warnings after rebuilding both package dists.

### File List

- `life-as-code/apps/nextjs/app/(features)/features/[id]/page.tsx` (modified: added listAnnotations prefetch)
- `life-as-code/apps/nextjs/components/features/annotation-list.tsx` (created)
- `life-as-code/apps/nextjs/components/features/feature-detail-view.tsx` (modified: import + wire AnnotationList)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — AnnotationList component created, wired into detail view, packages rebuilt, 0 TS errors, 0 lint warnings
