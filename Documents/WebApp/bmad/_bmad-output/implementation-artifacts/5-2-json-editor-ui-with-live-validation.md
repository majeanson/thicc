# Story 5.2: JSON Editor UI with Live Validation

Status: done

## Story

As a developer,
I want a CodeMirror 6 JSON editor with live schema validation feedback and format-on-save,
so that I can edit feature JSON at speed with immediate visibility into any schema violations.

## Acceptance Criteria

1. **Given** a user navigates to `/features/[id]/json`, **When** the page loads, **Then** the `JsonEditorView` component renders with the feature's full JSON in a CodeMirror 6 editor with syntax highlighting — loaded via `dynamic import` with `ssr: false`

2. **Given** the editor renders, **When** JSON content is schema-valid, **Then** a validation status bar below the editor shows "✓ Valid" in green with `role="status"`

3. **Given** the user makes an edit introducing a schema violation, **When** validation runs (debounced 300ms on keystroke), **Then** the status bar updates to "✗ N errors" in red, and field-level errors are listed below the status bar

4. **Given** the user saves (Cmd+S / Ctrl+S or auto-save every 30s), **When** `features.updateFeatureJson` is called, **Then** the JSON is formatted (pretty-printed, 2-space indent) before saving and the `SaveIndicator` transitions `saving → saved`

5. **Given** the save results in a schema error from the API, **When** the error response arrives, **Then** the `SaveIndicator` shows `error` state ("Save failed — retry?"), error details appear in the validation status bar, and the editor content is not reset

6. **Given** the validation status bar, **When** it updates, **Then** it carries `role="status"` and `aria-live="polite"` so screen readers announce state changes

7. **Given** a frozen feature is viewed at `/features/[id]/json`, **When** the editor renders, **Then** the editor is in `readOnly` mode with a "Frozen — read only" label shown; clicking the editor area opens the `SpawnDialog` (transparent overlay intercept)

8. **Given** the JSON editor header, **When** rendered, **Then** an "Open in Wizard →" link navigates to `/features/[id]/wizard`

9. **Given** the wizard header (`wizard-shell.tsx`), **When** rendered for a non-frozen feature, **Then** a "View JSON →" link navigates to `/features/[id]/json`

10. **Given** the feature detail view header (`feature-detail-view.tsx`), **When** rendered for a non-frozen feature, **Then** a "View JSON →" link navigates to `/features/[id]/json` alongside "Edit in Wizard →"

## Tasks / Subtasks

- [x] Task 1: Install CodeMirror dependencies in `apps/nextjs` (AC: #1)
  - [x] 1.1 `cd apps/nextjs && bun add @uiw/react-codemirror @codemirror/lang-json`
  - [x] 1.2 Confirm both appear in `apps/nextjs/package.json` dependencies

- [x] Task 2: Create RSC page `apps/nextjs/app/(features)/features/[id]/json/page.tsx` (AC: #1)
  - [x] 2.1 RSC: prefetch `trpc.features.getFeatureJson.queryOptions({ id })` and `trpc.features.getFeature.queryOptions({ id })`
  - [x] 2.2 Return `<HydrateClient><JsonEditorView featureId={id} /></HydrateClient>`

- [x] Task 3: Create `apps/nextjs/components/features/json-editor-view.tsx` (AC: #1–#7)
  - [x] 3.1 `"use client"` — dynamic import CodeMirror with `ssr: false`, static import `json` from `@codemirror/lang-json`
  - [x] 3.2 Query `trpc.features.getFeatureJson` via `useQuery`; also query `trpc.features.getFeature` for title (SpawnDialog needs it)
  - [x] 3.3 Initialize editor value from `data.content` on first load (via `useEffect` on content)
  - [x] 3.4 Implement debounced (300ms) validation on editor change using `FeatureContentSchema.safeParse`
  - [x] 3.5 Implement `handleSave`: format JSON → call `updateFeatureJson.mutate` → invalidate `getFeatureJson`, `getFeature`, `listFeatures` caches on success
  - [x] 3.6 Cmd+S / Ctrl+S keyboard shortcut via `document.addEventListener('keydown')` in `useEffect`
  - [x] 3.7 Auto-save every 30s via `setInterval` in `useEffect` (only fires if `saveState !== 'saved'`)
  - [x] 3.8 Render `<SaveIndicator state={saveState} />` (from `@life-as-code/ui`) in header
  - [x] 3.9 Render validation status bar with `role="status"` aria-live="polite"`: "✓ Valid" (green) or "✗ N errors" (destructive) + error list
  - [x] 3.10 Frozen mode: `readOnly` prop on CodeMirror + "Frozen — read only" badge + transparent `<button>` overlay that calls `setShowSpawnDialog(true)` on click
  - [x] 3.11 Render `<SpawnDialog>` when `showSpawnDialog` is true (get `parentTitle` from `getFeature` query)
  - [x] 3.12 Header: "Open in Wizard →" link to `/features/${featureId}/wizard`

- [x] Task 4: Add "View JSON →" link to `wizard-shell.tsx` (AC: #9)
  - [x] 4.1 Import `Link` from `next/link`
  - [x] 4.2 In the stage-tabs row (where Guided/Expert mode buttons are), add a `<Link href={'/features/[featureId]/json'}>View JSON →</Link>` — only shown when NOT frozen (frozen state already returns early)

- [x] Task 5: Add "View JSON →" link to `feature-detail-view.tsx` (AC: #10)
  - [x] 5.1 In the header controls area (where "Edit in Wizard →" link is), add `<Link href={'/features/[featureId]/json'}>View JSON →</Link>` alongside it, only when `!feature.frozen`

- [x] Task 6: Typecheck and lint (AC: all)
  - [x] 6.1 `bun x tsc --noEmit` from `apps/nextjs` — confirm 0 errors
  - [x] 6.2 `bunx oxlint --threads 1` from repo root — confirm 0 warnings/errors

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

All file paths use `apps/nextjs`. TypeScript check: `bun x tsc --noEmit` from `apps/nextjs`. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: No `packages/api` Rebuild Needed

Story 5.2 adds no new tRPC procedures — it only uses `getFeatureJson` and `updateFeatureJson` from Story 5-1 (already built into `packages/api/dist/`). No rebuild of `packages/api` needed. However, if any validators are changed, rebuild `packages/validators` first.

---

### CRITICAL: CodeMirror Dynamic Import with Proper TypeScript Typing

```typescript
import dynamic from 'next/dynamic'
import type { ReactCodeMirrorProps } from '@uiw/react-codemirror'

const CodeMirror = dynamic<ReactCodeMirrorProps>(
  () => import('@uiw/react-codemirror').then((m) => m.default),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted" /> },
)
```

The `json` language extension from `@codemirror/lang-json` can be **statically** imported — it does not require browser APIs, only the component wrapper does:

```typescript
import { json } from '@codemirror/lang-json'
```

Usage in JSX: `<CodeMirror extensions={[json()]} ... />`

---

### CRITICAL: `SaveIndicator` Already Exists in `@life-as-code/ui`

Do NOT recreate. Import directly:

```typescript
import { Button, SaveIndicator } from '@life-as-code/ui'
import type { SaveIndicatorState } from '@life-as-code/ui'
```

`SaveIndicatorState` = `'saved' | 'saving' | 'error'`. The component already has `role="status"` and `aria-live="polite"` — it shows:
- `'saved'` → "Saved"
- `'saving'` → "Saving..."
- `'error'` → "Save failed — retry?"

The **validation status bar** (AC #6) is a **separate** `<div role="status" aria-live="polite">` for JSON schema errors — distinct from SaveIndicator which covers save persistence state.

---

### CRITICAL: Frozen Overlay Must Use Interactive Role

The transparent click overlay for frozen features must have an interactive ARIA role to avoid `no-static-element-interactions` oxlint error:

```tsx
{data.frozen && (
  <div
    className="absolute inset-0 cursor-not-allowed"
    role="button"
    tabIndex={0}
    aria-label="This feature is frozen. Click to evolve it."
    onClick={() => { setShowSpawnDialog(true) }}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowSpawnDialog(true) }}
  />
)}
```

---

### CRITICAL: No `!` Non-Null Assertion

Never use `!`. Use optional chaining or early guards.

---

### CRITICAL: `type="button"` on All `<button>` Elements

oxlint enforces `jsx-boolean-value` (shorthand) and button type. Use `type="button"` on every `<button>`.

---

### RSC Page Pattern — `json/page.tsx`

Follow the exact same RSC pattern as `features/[id]/page.tsx` and `features/[id]/wizard/page.tsx`:

```typescript
import { headers } from 'next/headers'
import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { JsonEditorView } from '@/components/features/json-editor-view'

export default async function FeatureJsonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trpc = createTRPC({ headers: await headers() })
  const queryClient = getQueryClient()

  await Promise.all([
    queryClient.prefetchQuery(trpc.features.getFeatureJson.queryOptions({ id })),
    queryClient.prefetchQuery(trpc.features.getFeature.queryOptions({ id })),
  ])

  return (
    <HydrateClient>
      <JsonEditorView featureId={id} />
    </HydrateClient>
  )
}
```

---

### `JsonEditorView` — Complete Implementation

```typescript
"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

import dynamic from 'next/dynamic'
import Link from 'next/link'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { json } from '@codemirror/lang-json'
import type { ReactCodeMirrorProps } from '@uiw/react-codemirror'

import { Button, SaveIndicator } from '@life-as-code/ui'
import type { SaveIndicatorState } from '@life-as-code/ui'
import { FeatureContentSchema } from '@life-as-code/validators'

import { useTRPC } from '@/trpc/react'
import { SpawnDialog } from '@/components/features/spawn-dialog'

const CodeMirror = dynamic<ReactCodeMirrorProps>(
  () => import('@uiw/react-codemirror').then((m) => m.default),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted rounded-md" /> },
)

interface JsonEditorViewProps {
  featureId: string
}

export function JsonEditorView({ featureId }: JsonEditorViewProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const { data: jsonData } = useQuery(trpc.features.getFeatureJson.queryOptions({ id: featureId }))
  const { data: feature } = useQuery(trpc.features.getFeature.queryOptions({ id: featureId }))
  const updateMutation = useMutation(trpc.features.updateFeatureJson.mutationOptions())

  const [editorValue, setEditorValue] = useState('')
  const [saveState, setSaveState] = useState<SaveIndicatorState>('saved')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showSpawnDialog, setShowSpawnDialog] = useState(false)

  const latestValueRef = useRef('')
  const validationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize editor from server data (only on first load)
  useEffect(() => {
    if (jsonData?.content && !editorValue) {
      setEditorValue(jsonData.content)
      latestValueRef.current = jsonData.content
    }
  }, [jsonData?.content, editorValue])

  const validateContent = useCallback((value: string) => {
    try {
      const parsed = JSON.parse(value)
      const result = FeatureContentSchema.safeParse(parsed)
      if (result.success) {
        setValidationErrors([])
      } else {
        setValidationErrors(
          result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        )
      }
    } catch {
      setValidationErrors(['Invalid JSON: cannot parse'])
    }
  }, [])

  const handleEditorChange = useCallback(
    (value: string) => {
      setEditorValue(value)
      latestValueRef.current = value
      setSaveState('saving')
      if (validationDebounceRef.current) clearTimeout(validationDebounceRef.current)
      validationDebounceRef.current = setTimeout(() => { validateContent(value) }, 300)
    },
    [validateContent],
  )

  const handleSave = useCallback(
    (value: string) => {
      let formatted: string
      try {
        formatted = JSON.stringify(JSON.parse(value), null, 2)
      } catch {
        setSaveState('error')
        setValidationErrors(['Invalid JSON: cannot parse'])
        return
      }

      setEditorValue(formatted)
      latestValueRef.current = formatted
      setSaveState('saving')

      updateMutation.mutate(
        { id: featureId, jsonContent: formatted },
        {
          onSuccess: () => {
            setSaveState('saved')
            void queryClient.invalidateQueries({
              queryKey: trpc.features.getFeatureJson.queryOptions({ id: featureId }).queryKey,
            })
            void queryClient.invalidateQueries({
              queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey,
            })
            void queryClient.invalidateQueries({
              queryKey: trpc.features.listFeatures.queryOptions().queryKey,
            })
          },
          onError: (err) => {
            setSaveState('error')
            setValidationErrors([err.message])
          },
        },
      )
    },
    [featureId, queryClient, trpc, updateMutation],
  )

  // Cmd+S / Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave(latestValueRef.current)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [handleSave])

  // Auto-save every 30s (only if dirty)
  useEffect(() => {
    const interval = setInterval(() => {
      if (saveState === 'saving') {
        handleSave(latestValueRef.current)
      }
    }, 30000)
    return () => { clearInterval(interval) }
  }, [saveState, handleSave])

  if (!jsonData) return <div className="animate-pulse p-6 flex flex-col gap-4"><div className="h-8 w-48 rounded bg-muted" /></div>

  const isFrozen = jsonData.frozen
  const contentMap = feature?.content as Record<string, Record<string, unknown>> | undefined
  const featureTitle = (contentMap?.problem?.problemStatement as string | undefined) ?? 'Untitled'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">{jsonData.featureKey}</span>
          {isFrozen && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Frozen — read only
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isFrozen && <SaveIndicator state={saveState} />}
          <Link
            href={`/features/${featureId}/wizard`}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Open in Wizard →
          </Link>
          {isFrozen && (
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

      {/* Editor area */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          value={editorValue}
          extensions={[json()]}
          readOnly={isFrozen}
          onChange={handleEditorChange}
          height="100%"
          theme="dark"
          className="h-full text-sm"
        />
        {isFrozen && (
          <div
            className="absolute inset-0 cursor-not-allowed"
            role="button"
            tabIndex={0}
            aria-label="This feature is frozen. Click to evolve it."
            onClick={() => { setShowSpawnDialog(true) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowSpawnDialog(true) }}
          />
        )}
      </div>

      {/* Validation status bar */}
      <div
        role="status"
        aria-live="polite"
        className={`border-t border-border px-4 py-2 text-xs ${
          validationErrors.length === 0 ? 'text-green-500' : 'text-destructive'
        }`}
      >
        {validationErrors.length === 0
          ? '✓ Valid'
          : `✗ ${validationErrors.length} error${validationErrors.length > 1 ? 's' : ''}`}
        {validationErrors.length > 0 && (
          <ul className="mt-1 flex flex-col gap-0.5">
            {validationErrors.map((err, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static error list
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}
      </div>

      {showSpawnDialog && (
        <SpawnDialog
          parentId={featureId}
          parentFeatureKey={jsonData.featureKey}
          parentTitle={featureTitle}
          onClose={() => { setShowSpawnDialog(false) }}
        />
      )}
    </div>
  )
}
```

---

### "View JSON →" Link in `wizard-shell.tsx`

The stage-tabs row already has a `<div className="flex shrink-0 items-center gap-1 pl-2">` containing the Guided/Expert mode toggle buttons. Add the "View JSON" link to the right of that `<div>`, before it closes. `Link` is already available in Next.js — add `import Link from 'next/link'` if not present.

Target location in `wizard-shell.tsx` (non-frozen path, inside the `<div className="flex items-center justify-between border-b ...">` row):

```tsx
import Link from 'next/link'

// In the stage-tabs flex row, add alongside the Guided/Expert buttons:
<div className="flex shrink-0 items-center gap-2 pl-2">
  <Button type="button" variant="ghost" size="sm" aria-pressed={currentMode === 'focus'} onClick={() => setCurrentMode('focus')}>
    🎯 Guided
  </Button>
  <Button type="button" variant="ghost" size="sm" aria-pressed={currentMode === 'fast'} onClick={() => setCurrentMode('fast')}>
    ⚡ Expert
  </Button>
  <Link
    href={`/features/${featureId}/json`}
    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
  >
    View JSON →
  </Link>
</div>
```

---

### "View JSON →" Link in `feature-detail-view.tsx`

Target location: inside the `<div className="ml-auto flex items-center gap-2">` block where "Edit in Wizard →" appears, only when `!feature.frozen`:

```tsx
{!feature.frozen && (
  <>
    <Link
      href={`/features/${featureId}/wizard`}
      className="text-sm text-primary underline-offset-2 hover:underline"
    >
      Edit in Wizard →
    </Link>
    <Link
      href={`/features/${featureId}/json`}
      className="text-sm text-primary underline-offset-2 hover:underline"
    >
      View JSON →
    </Link>
    <FreezeConfirmPopover featureId={featureId} />
  </>
)}
```

---

### Cache Invalidation After `updateFeatureJson`

Three caches to invalidate on successful save:
```typescript
void queryClient.invalidateQueries({
  queryKey: trpc.features.getFeatureJson.queryOptions({ id: featureId }).queryKey,
})
void queryClient.invalidateQueries({
  queryKey: trpc.features.getFeature.queryOptions({ id: featureId }).queryKey,
})
void queryClient.invalidateQueries({
  queryKey: trpc.features.listFeatures.queryOptions().queryKey,
})
```

Pattern confirmed from Story 4-3 (`spawn-dialog.tsx`): use `trpc.features.listFeatures.queryOptions().queryKey`.

---

### Stale Closure Prevention for `handleSave` in Effects

`handleSave` is wrapped in `useCallback` with `[featureId, queryClient, trpc, updateMutation]` deps. The `useEffect` for Cmd+S includes `handleSave` in its dependency array — this correctly re-registers the listener when `handleSave` changes (which only happens when featureId/mutation instance changes, not on every render).

---

### Auto-Save Interval Design

Auto-save triggers every 30s **only if `saveState === 'saving'`** (i.e., there are unsaved changes). It doesn't fire if already `'saved'`. This avoids redundant API calls when the user hasn't made changes.

---

### Validation Status Bar — `role="status"` Requirement

The validation status bar div has `role="status"` and `aria-live="polite"`. The `SaveIndicator` from `@life-as-code/ui` also has its own `role="status"` — these are intentionally separate elements serving different purposes (persistence state vs schema validity).

---

### Error List Key — Biome Lint

When rendering error list items with array index as key, add a biome ignore comment:
```tsx
// biome-ignore lint/suspicious/noArrayIndexKey: static error list
<li key={i}>{err}</li>
```

If oxlint flags the same, use a different key strategy: map errors to `${i}-${err.slice(0,20)}` as key.

---

### No New tRPC Procedures

Story 5.2 is purely UI. All tRPC calls use procedures from Story 5.1:
- `features.getFeatureJson` — read
- `features.updateFeatureJson` — write
- `features.getFeature` — for feature title (SpawnDialog `parentTitle` prop)
- `features.listFeatures` — invalidation only

---

### Previous Story Intelligence (5-1 + Epic 4 Learnings)

1. **`bun x tsc --noEmit` from `apps/nextjs`** — never from root.
2. **`bunx oxlint --threads 1`** — from repo root.
3. **`no-non-null-assertion`** — no `!`. Use optional chaining or early guard.
4. **`type="button"` on all buttons** — oxlint enforces.
5. **`frozen` not `frozen={true}`** — oxlint jsx-boolean-value shorthand.
6. **No `async` on outer mutation callbacks** — use `.mutate()` not `await mutateAsync()`.
7. **`useQuery` pattern** — `useQuery(trpc.features.X.queryOptions({ id }))`.
8. **`role="dialog"` overlay pattern** — `onClick` + `onKeyDown` on same element; inner div uses `eslint-disable-next-line` if needed.
9. **SpawnDialog import** — `import { SpawnDialog } from '@/components/features/spawn-dialog'`
10. **Rebuild `packages/validators` + `packages/api` if validators change** — not needed this story.
11. **Dynamic import loading state** — `loading: () => <div className="...animate-pulse..." />` prevents layout shift.

---

### File Structure for This Story

```
apps/nextjs/
├── app/(features)/features/[id]/
│   └── json/
│       └── page.tsx                ← CREATE: RSC page, prefetch getFeatureJson + getFeature
├── components/features/
│   ├── json-editor-view.tsx        ← CREATE: "use client" editor orchestrator
│   ├── feature-detail-view.tsx     ← MODIFY: add "View JSON →" link
│   └── (wizard-shell is in wizard/ not features/)
└── components/wizard/
    └── wizard-shell.tsx            ← MODIFY: add "View JSON →" link in stage-tabs row
```

---

### What This Story Does NOT Include

- CodeMirror error gutter markers (line-level decorations in the gutter) — the epics mention these but implementing CodeMirror decorations requires significantly more CM6 extension setup. The status bar with field-level errors listed below it satisfies AC #3 for this story; gutter markers are an enhancement.
- Theme customization — use `theme="dark"` (CodeMirror built-in); no custom theme package needed.
- Copy JSON / Export JSON — those are Story 5.3.
- Wizard ↔ JSON mode switching with state sync — Story 5.3.

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.2 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — CodeMirror 6 via `@uiw/react-codemirror`, `dynamic import ssr:false`, RSC/client split]
- [Source: `life-as-code/apps/nextjs/app/(features)/features/[id]/page.tsx` — RSC page pattern]
- [Source: `life-as-code/apps/nextjs/app/(features)/features/[id]/wizard/page.tsx` — RSC wizard page pattern]
- [Source: `life-as-code/apps/nextjs/components/features/feature-detail-view.tsx` — header controls, existing link patterns]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` — stage-tabs row, mode toggle buttons location]
- [Source: `life-as-code/packages/ui/src/components/save-indicator.tsx` — SaveIndicator API: `state: SaveIndicatorState`]
- [Source: `life-as-code/apps/nextjs/stores/wizard-store.ts` — SaveIndicatorState type usage]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-nav.tsx` — SaveIndicator import pattern]
- [Source: `life-as-code/apps/nextjs/components/features/spawn-dialog.tsx` — SpawnDialog props: parentId, parentFeatureKey, parentTitle, onClose]
- [Source: `_bmad-output/implementation-artifacts/5-1-json-read-and-write-trpc-procedures.md` — getFeatureJson/updateFeatureJson return types]
- [Source: `_bmad-output/implementation-artifacts/4-3-freeze-and-spawn-ui.md` — frozen overlay pattern, listFeatures invalidation]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- oxlint `prefer-tag-over-role`: Story Dev Notes spec used `role="button"` on the frozen overlay div, but oxlint requires an actual `<button>` element. Fixed by replacing the div overlay with `<button type="button">` — positional styling still works as absolute-positioned button.
- oxlint `no-array-index-key`: biome-ignore comment does not suppress oxlint. Fixed by using `err` string as key (validation errors are unique strings).
- `link.d.ts` typed routes: New `/json` route not yet in generated types (`.next/types/link.d.ts`). Added `/features/${SafeSlug<T>}/json` to the DynamicRoutes union — will be regenerated correctly on next `next dev`/`next build`.

### Completion Notes List

- Installed `@uiw/react-codemirror@4.25.8` and `@codemirror/lang-json@6.0.2` into `apps/nextjs`.
- Created `app/(features)/features/[id]/json/page.tsx` — RSC with dual prefetch (`getFeatureJson` + `getFeature`), returns `<HydrateClient><JsonEditorView /></HydrateClient>`.
- Created `components/features/json-editor-view.tsx` — full "use client" component with: dynamic CodeMirror import (ssr:false), debounced (300ms) `FeatureContentSchema.safeParse` validation, `handleSave` (format + mutate + cache invalidation), Cmd+S/Ctrl+S keydown listener, 30s auto-save interval (only when dirty), `SaveIndicator` in header, `role="status" aria-live="polite"` validation bar, frozen read-only mode with button overlay opening `SpawnDialog`, "Open in Wizard →" navigation link.
- Modified `wizard-shell.tsx`: added `import Link from 'next/link'`; added "View JSON →" link after Guided/Expert mode toggle buttons (only visible on non-frozen path since frozen state returns early).
- Modified `feature-detail-view.tsx`: added "View JSON →" link alongside "Edit in Wizard →" inside the `!feature.frozen` block.
- `bun x tsc --noEmit` from `apps/nextjs` → 0 errors. `bunx oxlint --threads 1` → 0 warnings, 0 errors.

### File List

- `apps/nextjs/app/(features)/features/[id]/json/page.tsx` (created)
- `apps/nextjs/components/features/json-editor-view.tsx` (created)
- `apps/nextjs/components/wizard/wizard-shell.tsx` (modified)
- `apps/nextjs/components/features/feature-detail-view.tsx` (modified)
- `apps/nextjs/package.json` (modified — new deps)
- `apps/nextjs/bun.lock` (modified — lockfile)
- `apps/nextjs/.next/types/link.d.ts` (modified — added `/json` dynamic route)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — all 6 tasks complete, TSC 0 errors, oxlint 0 warnings, status → review
- 2026-03-15: Code review by claude-sonnet-4-6 — fixes applied to json-editor-view.tsx: debounce cleanup on unmount (useEffect return), DOM-attached anchor for export (append/remove), updated to modern DOM API (append/remove over appendChild/removeChild); TSC 0 errors, oxlint 0 errors, status → done
