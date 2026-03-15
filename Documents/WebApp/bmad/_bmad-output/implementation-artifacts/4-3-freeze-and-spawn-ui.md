# Story 4.3: Freeze & Spawn UI

Status: done

## Story

As a developer or product manager,
I want clear UI affordances to freeze features and spawn children — including an intercept when I accidentally try to edit a frozen feature,
so that the immutability model is intuitive and I'm guided toward the correct workflow rather than blocked with a confusing error.

## Acceptance Criteria

1. **Given** an active (non-frozen) feature detail page, **When** the user views it, **Then** a "Freeze this feature" Secondary button is visible in the header area

2. **Given** the user clicks "Freeze this feature", **When** the 2-step confirmation renders, **Then** a confirmation popover appears with the text "This feature will become a permanent, read-only record. You can always evolve it by spawning a child." and a "Yes, freeze it" confirm button — no browser `confirm()`

3. **Given** a feature is frozen, **When** the feature detail page renders, **Then** the `FeatureStateBadge` shows `frozen` (purple ✦ Frozen), all edit controls are hidden (no "Edit in Wizard →" link), and an "Evolve this feature" CTA button is shown in their place

4. **Given** a user attempts to edit a frozen feature (navigates to `/features/[id]/wizard`), **When** the wizard renders, **Then** the `SpawnDialog` is shown immediately — normal editing UI is replaced — with the copy: "This feature is frozen — its record is permanent. Want to evolve it? Spawn a child feature that links back to this one."

5. **Given** the `SpawnDialog` is open, **When** it renders, **Then** the parent feature context is shown read-only at the top, a required "Spawn reason" textarea is focused, and the proposed child `feature_key` year is displayed (e.g., "feat-2026-???")

6. **Given** the user completes the spawn reason and clicks "Spawn Child Feature", **When** `features.spawn` succeeds, **Then** the dialog closes, a success toast fires ("Spawned feat-YYYY-NNN"), and the user lands in the wizard for the new child feature

7. **Given** the user cancels the `SpawnDialog`, **When** "Cancel" is clicked or Esc is pressed, **Then** the dialog closes and the frozen feature detail/wizard is shown unchanged

## Tasks / Subtasks

- [x] Task 1: Create `FreezeConfirmPopover` component (AC: #1, #2)
  - [x] 1.1 Create `apps/nextjs/components/features/freeze-confirm-popover.tsx` (see Dev Notes for exact implementation)
  - [x] 1.2 Component renders "Freeze this feature" Secondary button; clicking toggles an inline confirmation panel
  - [x] 1.3 Confirmation panel shows the required copy and "Yes, freeze it" + "Cancel" buttons
  - [x] 1.4 On confirm: calls `features.freeze`, invalidates `getFeature` cache, shows success toast, dismisses panel
  - [x] 1.5 On success: show toast "Feature frozen. It is now a permanent, read-only record."

- [x] Task 2: Create `SpawnDialog` component (AC: #4, #5, #6, #7)
  - [x] 2.1 Create `apps/nextjs/components/features/spawn-dialog.tsx` (see Dev Notes for exact implementation)
  - [x] 2.2 Dialog shows frozen parent context (featureKey + title) read-only at top
  - [x] 2.3 Dialog shows proposed child key as "feat-{currentYear}-???"
  - [x] 2.4 "Spawn reason" textarea is required, focused on open via `useEffect`
  - [x] 2.5 "Spawn Child Feature" button calls `features.spawn`, on success: shows toast ("Spawned feat-YYYY-NNN"), navigates to `/features/{childId}/wizard`
  - [x] 2.6 "Cancel" button and Esc key close the dialog without action
  - [x] 2.7 Dialog is a fixed-position overlay following the same pattern as `search-overlay.tsx`

- [x] Task 3: Modify `feature-detail-view.tsx` for frozen state (AC: #1, #2, #3)
  - [x] 3.1 Import `FreezeConfirmPopover` and `SpawnDialog`; import `useMutation`, `useQueryClient`; import `useRouter`
  - [x] 3.2 In the header row: conditionally render `FreezeConfirmPopover` when `!feature.frozen`
  - [x] 3.3 When frozen: hide the "Edit in Wizard →" link and show "Evolve this feature" button that opens `SpawnDialog`
  - [x] 3.4 `SpawnDialog` is rendered portaled at the bottom of the component, controlled by `showSpawnDialog` state

- [x] Task 4: Modify `wizard-shell.tsx` to intercept frozen feature editing (AC: #4, #5, #6, #7)
  - [x] 4.1 Read `featureQuery.data?.frozen` after the feature is loaded
  - [x] 4.2 When `frozen === true`: replace the wizard editing UI with a frozen-state screen showing `SpawnDialog` open by default (or a prompt to open it)
  - [x] 4.3 The frozen screen shows: frozen badge, feature key, title, copy "This feature is frozen — its record is permanent. Want to evolve it? Spawn a child feature that links back to this one.", and an "Evolve this feature" button that opens SpawnDialog
  - [x] 4.4 SpawnDialog in wizard context navigates to new child's wizard on success

- [x] Task 5: Typecheck and lint
  - [x] 5.1 Run `bun x tsc --noEmit` in `apps/nextjs` — confirm 0 errors
  - [x] 5.2 Run `bunx oxlint --threads 1` from repo root — confirm 0 errors

## Dev Notes

### CRITICAL: This Project Uses `@base-ui/react`, NOT `shadcn/ui`

`Button` is imported from `@life-as-code/ui` which wraps `@base-ui/react/button`. Do NOT use `@shadcn/ui`.

For dialog/modal: implement as a custom fixed-overlay using the same pattern as `search-overlay.tsx` — a `fixed inset-0 z-50 flex items-center justify-center bg-black/50` wrapper. No `@base-ui/react/dialog` import needed.

---

### CRITICAL: File Naming — kebab-case for non-component files, PascalCase for React components

New files follow existing naming patterns:
- `freeze-confirm-popover.tsx` ✓ (kebab-case filename, PascalCase component export)
- `spawn-dialog.tsx` ✓

---

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

TypeScript in `apps/nextjs`: `bun x tsc --noEmit` from the `apps/nextjs` directory.

---

### CRITICAL: All editable fields in wizard are already server-data-driven

The wizard textareas only get data from `featureQuery.data`. If the feature is frozen, simply not rendering the editable wizard UI is the correct freeze intercept — no need to intercept individual `onChange` handlers.

---

### `Button` import pattern

```typescript
import { Button } from '@life-as-code/ui'
```

Available variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
Available sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`

---

### Toast pattern

```typescript
import { useToastStore } from '@/stores/toast-store'

// Inside component:
const showToast = useToastStore((s) => s.showToast)

// Usage:
showToast({ type: 'success', message: 'Feature frozen. It is now a permanent, read-only record.' })
showToast({ type: 'success', message: `Spawned ${child.featureKey}` })
```

---

### tRPC Mutation + Cache Invalidation Pattern

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTRPC } from '@/trpc/react'

// Inside component:
const trpc = useTRPC()
const queryClient = useQueryClient()
const router = useRouter()

const freezeMutation = useMutation(trpc.features.freeze.mutationOptions())
const spawnMutation = useMutation(trpc.features.spawn.mutationOptions())

// Freeze handler:
freezeMutation.mutate(
  { id: featureId },
  {
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey,
      })
      setShowConfirm(false)
      showToast({ type: 'success', message: 'Feature frozen. It is now a permanent, read-only record.' })
    },
  },
)

// Spawn handler:
spawnMutation.mutate(
  { parentId: featureId, spawnReason },
  {
    onSuccess: (child) => {
      showToast({ type: 'success', message: `Spawned ${child.featureKey}` })
      router.push(`/features/${child.id}/wizard`)
    },
  },
)
```

---

### `FreezeConfirmPopover` — Full Implementation

```typescript
// apps/nextjs/components/features/freeze-confirm-popover.tsx
"use client"

import { useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@life-as-code/ui'

import { useToastStore } from '@/stores/toast-store'
import { useTRPC } from '@/trpc/react'

interface FreezeConfirmPopoverProps {
  featureId: string
}

export function FreezeConfirmPopover({ featureId }: FreezeConfirmPopoverProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  const freezeMutation = useMutation(trpc.features.freeze.mutationOptions())

  function handleFreeze() {
    freezeMutation.mutate(
      { id: featureId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey,
          })
          setShowConfirm(false)
          showToast({ type: 'success', message: 'Feature frozen. It is now a permanent, read-only record.' })
        },
      },
    )
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setShowConfirm((v) => !v) }}
      >
        Freeze this feature
      </Button>

      {showConfirm && (
        <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-border bg-background p-4 shadow-lg">
          <p className="mb-3 text-sm text-foreground">
            This feature will become a permanent, read-only record. You can always evolve it by spawning a child.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleFreeze}
              disabled={freezeMutation.isPending}
            >
              {freezeMutation.isPending ? 'Freezing…' : 'Yes, freeze it'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setShowConfirm(false) }}
            >
              Cancel
            </Button>
          </div>
          {freezeMutation.isError && (
            <p className="mt-2 text-xs text-destructive">
              {freezeMutation.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

---

### `SpawnDialog` — Full Implementation

```typescript
// apps/nextjs/components/features/spawn-dialog.tsx
"use client"

import { useEffect, useRef, useState } from 'react'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { Button } from '@life-as-code/ui'

import { useToastStore } from '@/stores/toast-store'
import { useTRPC } from '@/trpc/react'

interface SpawnDialogProps {
  parentId: string
  parentFeatureKey: string
  parentTitle: string
  onClose: () => void
}

export function SpawnDialog({ parentId, parentFeatureKey, parentTitle, onClose }: SpawnDialogProps) {
  const [spawnReason, setSpawnReason] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const trpc = useTRPC()
  const showToast = useToastStore((s) => s.showToast)
  const currentYear = new Date().getFullYear()

  const spawnMutation = useMutation(trpc.features.spawn.mutationOptions())

  // Focus spawn reason textarea on open
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown) }
  }, [onClose])

  function handleSpawn() {
    if (!spawnReason.trim()) return
    spawnMutation.mutate(
      { parentId, spawnReason: spawnReason.trim() },
      {
        onSuccess: (child) => {
          showToast({ type: 'success', message: `Spawned ${child.featureKey}` })
          router.push(`/features/${child.id}/wizard`)
        },
      },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Spawn child feature"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">Spawn Child Feature</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This feature is frozen — its record is permanent. Want to evolve it? Spawn a child feature that links back to this one.
          </p>
        </div>

        {/* Parent context (read-only) */}
        <div className="border-b border-border bg-muted/40 px-6 py-3">
          <p className="text-xs font-medium text-muted-foreground">Parent feature (frozen)</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{parentFeatureKey}</span>
            <span className="text-xs text-foreground truncate">{parentTitle}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Proposed child key: <span className="font-mono font-medium text-foreground">feat-{currentYear}-???</span>
          </p>
        </div>

        {/* Spawn reason field */}
        <div className="px-6 py-4">
          <label htmlFor="spawn-reason" className="mb-2 block text-sm font-medium text-foreground">
            Spawn reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="spawn-reason"
            ref={textareaRef}
            value={spawnReason}
            onChange={(e) => { setSpawnReason(e.target.value) }}
            placeholder="Why is this feature being evolved? What is changing?"
            rows={4}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-required="true"
          />
          {spawnMutation.isError && (
            <p className="mt-1 text-xs text-destructive">{spawnMutation.error.message}</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleSpawn}
            disabled={!spawnReason.trim() || spawnMutation.isPending}
          >
            {spawnMutation.isPending ? 'Spawning…' : 'Spawn Child Feature'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

### Modified `feature-detail-view.tsx` — Header Changes (AC: #1, #2, #3)

The header section currently has:
```tsx
{/* Header */}
<div className="flex flex-col gap-3">
  ...
  <div className="flex flex-wrap items-center gap-3">
    <FeatureStateBadge status={feature.status} frozen={feature.frozen} />
    <StageCompletionIndicator ... />
    <Link href={`/features/${featureId}/wizard`} className="ml-auto ...">
      Edit in Wizard →
    </Link>
  </div>
```

Replace the `Link` and add freeze/evolve controls conditionally:

```tsx
{/* imports to add: */}
import { useState } from 'react'
import { Button } from '@life-as-code/ui'
import { FreezeConfirmPopover } from './freeze-confirm-popover'
import { SpawnDialog } from './spawn-dialog'

// inside component, add state:
const [showSpawnDialog, setShowSpawnDialog] = useState(false)

// Replace the header row:
<div className="flex flex-wrap items-center gap-3">
  <FeatureStateBadge status={feature.status} frozen={feature.frozen} />
  <StageCompletionIndicator
    completedStages={completedStages}
    totalStages={LIFECYCLE_STAGES.length}
  />
  <div className="ml-auto flex items-center gap-2">
    {!feature.frozen && (
      <>
        <Link
          href={`/features/${featureId}/wizard`}
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          Edit in Wizard →
        </Link>
        <FreezeConfirmPopover featureId={featureId} />
      </>
    )}
    {feature.frozen && (
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => { setShowSpawnDialog(true) }}
      >
        Evolve this feature
      </Button>
    )}
  </div>
</div>

{/* SpawnDialog — rendered at bottom of component: */}
{showSpawnDialog && (
  <SpawnDialog
    parentId={featureId}
    parentFeatureKey={feature.featureKey}
    parentTitle={title}
    onClose={() => { setShowSpawnDialog(false) }}
  />
)}
```

---

### Modified `wizard-shell.tsx` — Frozen Feature Intercept (AC: #4, #5, #6, #7)

After `featureQuery` is defined, add a frozen check. When frozen, replace the entire wizard UI:

```tsx
{/* imports to add: */}
import { useState } from 'react'  // already imported, just add useState if not already there
import { SpawnDialog } from '@/components/features/spawn-dialog'

// Add state:
const [showSpawnDialog, setShowSpawnDialog] = useState(false)

// After loading check (after `if (!feature) return ...` skeleton):
// Read frozen state from feature data
const isFrozen = featureQuery.data?.frozen ?? false

// Add this BEFORE the main return, after the loading check:
if (isFrozen) {
  const frozenFeature = featureQuery.data!  // safe: isFrozen only true when data loaded
  const contentMap = frozenFeature.content as Record<string, Record<string, unknown>> | undefined
  const frozenTitle = (contentMap?.problem?.problemStatement as string | undefined) ?? 'Untitled'

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <FeatureStateBadge status="frozen" frozen={true} />
      <div>
        <p className="font-mono text-sm text-muted-foreground">{frozenFeature.featureKey}</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">{frozenTitle}</h2>
      </div>
      <p className="max-w-md text-sm text-muted-foreground">
        This feature is frozen — its record is permanent. Want to evolve it? Spawn a child feature that links back to this one.
      </p>
      <Button
        type="button"
        variant="default"
        onClick={() => { setShowSpawnDialog(true) }}
      >
        Evolve this feature
      </Button>
      {showSpawnDialog && (
        <SpawnDialog
          parentId={frozenFeature.id}
          parentFeatureKey={frozenFeature.featureKey}
          parentTitle={frozenTitle}
          onClose={() => { setShowSpawnDialog(false) }}
        />
      )}
    </div>
  )
}
```

Note: `FeatureStateBadge` is already imported in `feature-detail-view.tsx` but needs to be imported in `wizard-shell.tsx`:
```typescript
import { FeatureStateBadge } from '@/components/features/feature-state-badge'
```

---

### `no-non-null-assertion` Lint Rule

The `featureQuery.data!` in the frozen check is acceptable because `isFrozen = featureQuery.data?.frozen ?? false` — if `isFrozen` is true, `featureQuery.data` must be defined. However, oxlint will flag `!`. Use a type assertion instead:

```typescript
const frozenFeature = featureQuery.data as NonNullable<typeof featureQuery.data>
```

Or restructure: after `if (!featureQuery.data) return <skeleton>`, the data is guaranteed non-null:

```typescript
// At top of WizardShell, after the loading guard:
const feature = featureQuery.data
if (!feature) {
  return <div className="animate-pulse ...">...</div>
}
// Now feature is typed as non-null for the rest of the component
const isFrozen = feature.frozen
```

This is a better refactor: extract `feature` from `featureQuery.data` early and guard once.

---

### Focus Management in SpawnDialog

The `useEffect` autofocuses the textarea:
```typescript
useEffect(() => {
  textareaRef.current?.focus()
}, [])
```

On close, focus should return to the trigger button. This requires the trigger button to store a ref or use `document.activeElement` before opening. For MVP simplicity, focus is managed by the browser's natural document flow on dialog unmount — acceptable for this story. Full focus return management is a polish item.

---

### `useEffect` and `useCallback` in `wizard-shell.tsx`

`wizard-shell.tsx` already uses `useEffect`, `useCallback`, `useRef`, `useState` from React. Adding the `useState` for `showSpawnDialog` is the only state addition needed.

However, `useState` and `useEffect` are already imported. Just add to the existing destructure.

---

### `button` type attribute

All `<button>` elements in the new components must have `type="button"`. The `Button` component from `@life-as-code/ui` passes props through to `@base-ui/react/button` which requires explicit type. Always use `type="button"` for non-submit buttons (oxlint enforces this).

---

### Verification Steps

```bash
# From apps/nextjs directory:
bun x tsc --noEmit          # Must pass 0 errors

# From repo root:
bunx oxlint --threads 1     # Must pass 0 errors
```

Note: `bun run build` segfaults on Windows post-processing (known Bun bug) — code compiles correctly. TypeScript 0 errors is the quality gate.

---

### File Structure for This Story

```
apps/nextjs/components/features/
├── freeze-confirm-popover.tsx   ← CREATE: freeze button + inline confirm popover
├── spawn-dialog.tsx             ← CREATE: SpawnDialog modal component
├── feature-detail-view.tsx      ← MODIFY: add freeze/evolve controls + spawn dialog
└── (feature-state-badge.tsx)    ← no changes, already handles frozen state visually

apps/nextjs/components/wizard/
└── wizard-shell.tsx             ← MODIFY: intercept frozen feature, show spawn prompt
```

---

### What This Story Does NOT Include

- Feature lineage view — Story 4.4
- Annotations tab (currently "Coming soon") — Story 7.x
- History tab (currently "Coming soon") — Story 7.x
- Full focus-return management on SpawnDialog close (polish item)
- The `SpawnDialog` appearing when individual fields are focused (the intercept is at the page level, not field level — if user is at the wizard for a frozen feature, the entire wizard is replaced)

---

### Previous Story Intelligence (Stories 4.1 & 4.2 Learnings)

1. **`bun x tsc --noEmit` in `apps/nextjs`** — run from the `apps/nextjs` directory, not the root. Windows OOM with turbo.

2. **`bunx oxlint --threads 1`** — from repo root, not package directory.

3. **`type="button"` on all buttons** — oxlint enforces this. `Button` from `@life-as-code/ui` accepts and passes through `type` prop.

4. **`useQuery` pattern** — `useQuery(trpc.features.getFeature.queryOptions({ id }))` — already in `wizard-shell.tsx` as `featureQuery`.

5. **`useMutation` pattern** — `useMutation(trpc.features.freeze.mutationOptions())` — same pattern as `updateStageMutation` in wizard-shell.tsx.

6. **`useQueryClient`** — from `@tanstack/react-query`, used to invalidate cache after freeze.

7. **`useRouter`** — from `next/navigation`, used to navigate after successful spawn.

8. **No `async` on React event handlers** — use `.mutate()` not `await mutateAsync()`. The `onSuccess` callback handles post-mutation logic.

9. **Toast store** — `useToastStore((s) => s.showToast)` — already used in other parts of the app.

10. **`wizard-shell.tsx` already imports `useQuery`, `useMutation`** — no new imports needed for those. Add `useQueryClient` and `useState` (already imported) if needed.

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.3 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — SpawnDialog anatomy, freeze confirmation pattern, button hierarchy, frozen = "trustworthy not locked" mental model]
- [Source: `life-as-code/apps/nextjs/components/features/feature-detail-view.tsx` — existing header, frozen state, edit link location]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` — featureQuery pattern, mutation pattern, existing imports]
- [Source: `life-as-code/apps/nextjs/components/features/feature-state-badge.tsx` — frozen variant exists: purple ✦ Frozen]
- [Source: `life-as-code/apps/nextjs/components/search/search-overlay.tsx` — fixed overlay dialog pattern]
- [Source: `life-as-code/apps/nextjs/stores/toast-store.ts` — useToastStore, showToast pattern]
- [Source: `life-as-code/packages/ui/src/components/button.tsx` — Button variants: default, outline, secondary, ghost, destructive]
- [Source: `_bmad-output/implementation-artifacts/4-1-freeze-feature-trpc-procedure.md` — features.freeze procedure, BAD_REQUEST for already-frozen]
- [Source: `_bmad-output/implementation-artifacts/4-2-spawn-child-feature-trpc-procedure.md` — features.spawn procedure, returns child Feature with featureKey]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Created `freeze-confirm-popover.tsx`: inline 2-step confirm popover with toggle state, freeze mutation, cache invalidation, and success toast
- Created `spawn-dialog.tsx`: fixed-position overlay dialog matching `search-overlay.tsx` pattern; auto-focuses textarea; Esc closes; spawns child and navigates to its wizard
- Modified `feature-detail-view.tsx`: conditionally shows FreezeConfirmPopover + Edit link for active features, and "Evolve this feature" button + SpawnDialog for frozen features
- Modified `wizard-shell.tsx`: adds frozen intercept guard before main return — when `featureQuery.data?.frozen` is true, replaces entire wizard UI with frozen-state screen + SpawnDialog
- Required `packages/api` rebuild (`bun run build`) to regenerate dist types for `freeze`/`spawn` procedures
- Fixed oxlint: `role="dialog"` moved to outer backdrop div (matching search-overlay pattern); `frozen={true}` → `frozen` (boolean shorthand)
- All 5 tasks complete; `tsc --noEmit` 0 errors; `oxlint` 0 errors

### File List

- `apps/nextjs/components/features/freeze-confirm-popover.tsx` (created)
- `apps/nextjs/components/features/spawn-dialog.tsx` (created)
- `apps/nextjs/components/features/feature-detail-view.tsx` (modified)
- `apps/nextjs/components/wizard/wizard-shell.tsx` (modified)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — all 5 tasks complete, status → review
