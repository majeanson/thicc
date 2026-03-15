# Story 5.3: Wizard ↔ JSON Mode Switching & Individual Export

Status: done

## Story

As a developer,
I want to switch between wizard mode and raw JSON mode for any feature and export individual feature JSON,
So that I can move between guided editing and direct JSON manipulation without friction, and share or archive individual features.

## Acceptance Criteria

1. **Given** a user is in the wizard for any feature, **When** they click "View JSON →" in the wizard header, **Then** they navigate to the JSON editor view for the same feature showing the current saved state — no unsaved wizard content is lost

2. **Given** a user is in the JSON editor, **When** they click "Open in Wizard →", **Then** they navigate to the wizard for the same feature opened at the last edited stage with current JSON content reflected in the fields

3. **Given** a user switches from JSON editor back to wizard after making JSON edits, **When** the wizard loads, **Then** all field values reflect the latest saved JSON state — wizard and JSON views are always in sync with the persisted DB state

4. **Given** the "Copy JSON" button in the JSON editor header, **When** the user clicks it, **Then** the complete current editor JSON is copied to the clipboard and a success toast fires: "JSON copied to clipboard"

5. **Given** the "Export JSON" button in the JSON editor header, **When** the user clicks it, **Then** a `.json` file is downloaded named `feat-YYYY-NNN.json` (using the feature's `featureKey`) containing the current editor JSON content

6. **Given** the exported file, **When** opened, **Then** it is valid JSON containing all lifecycle stage content, decision log entries, tags, and metadata — a complete, self-contained feature artifact

## Tasks / Subtasks

- [x] Task 1: Add Copy JSON and Export JSON actions to `json-editor-view.tsx` (AC: #4, #5, #6)
  - [x] 1.1 Import `useToastStore` from `@/stores/toast-store`
  - [x] 1.2 Add `const showToast = useToastStore((s) => s.showToast)` inside component
  - [x] 1.3 Implement `handleCopyJson` callback: copy `latestValueRef.current` (falling back to `jsonData.content`) via `navigator.clipboard.writeText()` → on success `showToast({ type: 'success', message: 'JSON copied to clipboard' })` → on error `showToast({ type: 'error', message: 'Failed to copy to clipboard' })`
  - [x] 1.4 Implement `handleExportJson` callback: create `Blob([content], { type: 'application/json' })` → `URL.createObjectURL` → create `<a>` with `download={featureKey + '.json'}` → `.click()` → `URL.revokeObjectURL`
  - [x] 1.5 Add "Copy JSON" and "Export JSON" `<Button type="button" variant="ghost" size="sm">` to header (both work for frozen and non-frozen features)

- [x] Task 2: Verify navigation and sync (AC: #1, #2, #3)
  - [x] 2.1 Confirm "View JSON →" link exists in `wizard-shell.tsx` (implemented in Story 5.2 — verify, do NOT re-add)
  - [x] 2.2 Confirm "Open in Wizard →" link exists in `json-editor-view.tsx` (implemented in Story 5.2 — verify, do NOT re-add)
  - [x] 2.3 Confirm cache invalidation on `updateFeatureJson` success covers `getFeature` + `getFeatureJson` + `listFeatures` (already in Story 5.2 — verify)

- [x] Task 3: Typecheck and lint (AC: all)
  - [x] 3.1 `bun x tsc --noEmit` from `apps/nextjs` — confirm 0 errors
  - [x] 3.2 `bunx oxlint --threads 1` from repo root — confirm 0 warnings/errors

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

All file paths use `apps/nextjs`. TypeScript check: `bun x tsc --noEmit` from `apps/nextjs`. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: Navigation Links Already Exist — Do NOT Recreate

Story 5.2 already implemented:
- `wizard-shell.tsx` — "View JSON →" link → `/features/${featureId}/json` (AC #1 satisfied)
- `json-editor-view.tsx` — "Open in Wizard →" link → `/features/${featureId}/wizard` (AC #2 satisfied)
- Cache invalidation on save covers `getFeature`, `getFeatureJson`, `listFeatures` (AC #3 satisfied)

State sync (AC #3) is **inherently correct**: the wizard reads from tRPC (DB), the JSON editor reads from tRPC (DB), and the JSON editor invalidates all three caches on save. No additional synchronization code is needed.

---

### CRITICAL: No New tRPC Procedures Needed

Story 5.3 is **purely client-side UI** additions to the existing `json-editor-view.tsx`. All data comes from the `getFeatureJson` query already in place (`jsonData.content` + `jsonData.featureKey`).

---

### CRITICAL: No `packages/api` Rebuild Needed

No changes to `packages/api` or `packages/validators` in this story.

---

### Toast System — `useToastStore`

The project has a custom Zustand-based toast system. Use it exactly as in `spawn-dialog.tsx`:

```typescript
import { useToastStore } from '@/stores/toast-store'

// Inside component:
const showToast = useToastStore((s) => s.showToast)

// Call:
showToast({ type: 'success', message: 'JSON copied to clipboard' })
showToast({ type: 'error', message: 'Failed to copy to clipboard' })
```

Available types: `'success' | 'error' | 'warning' | 'info'`. Toasts auto-dismiss after 3000ms. The `ToastContainer` is already mounted in `app/layout.tsx`.

---

### `handleCopyJson` — Complete Implementation

```typescript
const handleCopyJson = useCallback(() => {
  const content = latestValueRef.current || jsonData?.content ?? ''
  void navigator.clipboard.writeText(content)
    .then(() => { showToast({ type: 'success', message: 'JSON copied to clipboard' }) })
    .catch(() => { showToast({ type: 'error', message: 'Failed to copy to clipboard' }) })
}, [jsonData?.content, showToast])
```

Key points:
- Uses `latestValueRef.current` (reflects unsaved edits) — falls back to `jsonData.content` if editor not yet hydrated
- `navigator.clipboard.writeText()` returns a Promise — use `.then().catch()` chaining (not `async/await` on the callback itself — oxlint flags no-async-promise-executor)
- `void` prefix suppresses the floating promise lint warning

---

### `handleExportJson` — Complete Implementation

```typescript
const handleExportJson = useCallback(() => {
  const content = latestValueRef.current || jsonData?.content ?? ''
  const filename = `${jsonData?.featureKey ?? 'feature'}.json`
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}, [jsonData])
```

Key points:
- Filename is exactly `featureKey` + `.json` (e.g., `feat-2026-001.json`) — satisfies AC #5
- Content uses `latestValueRef.current` to capture current editor state (including unsaved edits)
- `URL.revokeObjectURL` immediately after click — memory cleanup
- No external library needed for file download

---

### Header Button Placement

Add Copy JSON and Export JSON buttons to the right side of the existing header `<div className="flex items-center gap-3">`. They appear for BOTH frozen and non-frozen features (export/copy always makes sense):

```tsx
<div className="flex items-center gap-3">
  {!isFrozen && <SaveIndicator state={saveState} />}
  <Button type="button" variant="ghost" size="sm" onClick={handleCopyJson}>
    Copy JSON
  </Button>
  <Button type="button" variant="ghost" size="sm" onClick={handleExportJson}>
    Export JSON
  </Button>
  <Link
    href={`/features/${featureId}/wizard`}
    className="text-sm text-primary underline-offset-2 hover:underline"
  >
    Open in Wizard →
  </Link>
  {isFrozen && (
    <Button type="button" variant="default" size="sm" onClick={() => { setShowSpawnDialog(true) }}>
      Evolve this feature
    </Button>
  )}
</div>
```

---

### oxlint Patterns from Stories 5.1 and 5.2

1. **`type="button"` on all `<button>` and `<Button>` elements** — oxlint enforces this
2. **No `!` non-null assertion** — use optional chaining or `?? ''` fallback
3. **`prefer-tag-over-role`** — never `<div role="button">`, always `<button type="button">`
4. **`no-array-index-key`** — use string-based keys (not array index)
5. **`void` prefix** on floating Promises — `void navigator.clipboard.writeText(...).then(...)` and `void queryClient.invalidateQueries(...)`
6. **No `async` on outer mutation callbacks** — use `.then().catch()` or `return promise` pattern

---

### State Sync Deep Dive (for AC #3 clarity)

The wizard → JSON sync is automatic:
1. Wizard saves on keystroke (500ms debounce via `updateStage` mutation)
2. When user clicks "View JSON →", Next.js Link navigates to `/features/[id]/json`
3. RSC page (`json/page.tsx`) prefetches `getFeatureJson` fresh from DB on each navigation
4. Any pending debounce in the wizard saves within 500ms of last keystroke — by the time navigation completes, the data is saved

The JSON → wizard sync is automatic:
1. JSON editor saves on Cmd+S (or auto-save), invalidating `getFeature` + `getFeatureJson` + `listFeatures` caches
2. When user clicks "Open in Wizard →", wizard RSC page (`wizard/page.tsx`) prefetches `getFeature` fresh from DB
3. WizardStore's `getLastEditedStage(featureId)` restores the last stage (persisted in localStorage via Zustand persist middleware)

No additional sync code needed.

---

### `latestValueRef` Pattern

`latestValueRef` is already declared in `json-editor-view.tsx` (Story 5.2). It is updated on every editor change and after every save (formatted content). It avoids stale closure issues in `handleCopyJson` and `handleExportJson` by using a ref instead of state.

---

### File Structure for This Story

```
apps/nextjs/
└── components/features/
    └── json-editor-view.tsx    ← MODIFY: add handleCopyJson, handleExportJson, two header buttons
```

**That's the only file that needs changing.**

---

### What This Story Does NOT Include

- Keyboard shortcuts for Copy/Export (not in ACs)
- Copy/Export from the wizard directly (not in ACs — only from JSON editor)
- Full-project JSON export (many features) — that's Story 7.4
- Wizard ↔ JSON state preservation with unsaved changes warning (not in ACs — auto-save handles it)
- Schema configuration (making schema admin-configurable) — Epic 6

---

### Previous Story Intelligence (5.2 Learnings)

1. **`prefer-tag-over-role`**: `<div role="button">` → `<button type="button">` — oxlint error, not warning
2. **`no-array-index-key`**: biome-ignore comments don't suppress oxlint — use string-based keys
3. **`link.d.ts` typed routes**: New routes must be added to `.next/types/link.d.ts` when `typedRoutes: true` — the `/json` route is already there from Story 5.2
4. **`void` prefix on floating Promises**: `void queryClient.invalidateQueries(...)` suppresses lint warnings
5. **`useToastStore` pattern**: `const showToast = useToastStore((s) => s.showToast)` — selector pattern, not full store subscription

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.3 — Full BDD acceptance criteria]
- [Source: `life-as-code/apps/nextjs/components/features/json-editor-view.tsx` — existing component to modify (Story 5.2)]
- [Source: `life-as-code/apps/nextjs/stores/toast-store.ts` — Toast system: `useToastStore`, `showToast({ type, message })`]
- [Source: `life-as-code/apps/nextjs/components/features/spawn-dialog.tsx` — `useToastStore` usage pattern]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` — existing "View JSON →" link (Story 5.2)]
- [Source: `_bmad-output/implementation-artifacts/5-2-json-editor-ui-with-live-validation.md` — Story 5.2 learnings, debug notes]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- TSC error `TS5076`: `||` and `??` cannot be mixed without parentheses. Fixed by wrapping: `(latestValueRef.current || jsonData?.content) ?? ''`

### Completion Notes List

- Added `import { useToastStore } from '@/stores/toast-store'` to `json-editor-view.tsx`.
- Added `const showToast = useToastStore((s) => s.showToast)` inside component.
- Implemented `handleCopyJson`: copies `(latestValueRef.current || jsonData?.content) ?? ''` to clipboard via `navigator.clipboard.writeText()`, shows success/error toast.
- Implemented `handleExportJson`: creates Blob, triggers download as `${featureKey}.json`, revokes object URL.
- Added "Copy JSON" and "Export JSON" `<Button type="button" variant="ghost" size="sm">` to header — both work for frozen and non-frozen features.
- Verified "View JSON →" link in `wizard-shell.tsx` (AC #1 ✓), "Open in Wizard →" in `json-editor-view.tsx` (AC #2 ✓), three `invalidateQueries` calls on save (AC #3 ✓).
- `bun x tsc --noEmit` → 0 errors. `bunx oxlint --threads 1` → 0 warnings, 0 errors.

### File List

- `apps/nextjs/components/features/json-editor-view.tsx` (modified)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — all 3 tasks complete, TSC 0 errors, oxlint 0 warnings, status → review
