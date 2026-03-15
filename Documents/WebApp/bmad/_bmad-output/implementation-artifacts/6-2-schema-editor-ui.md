# Story 6.2: Schema Editor UI

Status: done

## Story

As an admin,
I want a visual three-layer schema editor to configure required, standard, and custom fields,
So that I can define what information the team captures on every feature without writing code or JSON directly.

## Acceptance Criteria

1. **Given** an admin navigates to Admin → Schema Configuration, **When** the page loads, **Then** the `SchemaEditor` renders three labeled sections: "Required Fields", "Standard Fields", and "Custom Extension Fields" — each showing the currently configured fields for that layer

2. **Given** the Required Fields section, **When** displayed, **Then** each required field shows its name, field type (text/textarea/tags/decision-log), and an enable/disable toggle — required fields cannot be deleted, only disabled

3. **Given** the Standard Fields section, **When** displayed, **Then** each standard field shows name, type, and an enable/disable toggle; new standard fields can be added via an "Add field" button with name and type inputs

4. **Given** the Custom Extension Fields section, **When** displayed, **Then** custom fields can be freely added, renamed, reordered, and deleted; each has name, type, and an optional description for wizard hint text

5. **Given** any schema change is made in the editor, **When** the admin clicks "Save Schema", **Then** `features.admin.updateSchema` is called, a success toast fires ("Schema updated"), and the updated field list is reflected immediately

6. **Given** a field is marked as Required, **When** the schema is saved, **Then** the wizard enforces that field across all 9 lifecycle stages for all future feature creates and updates

## Tasks / Subtasks

- [x] Task 1: Update admin RSC page to prefetch active schema (AC: #1)
  - [x] 1.1 In `apps/nextjs/app/(features)/admin/page.tsx`, add `import { headers } from 'next/headers'`, `import { createTRPC, HydrateClient } from '@/trpc/rsc'`
  - [x] 1.2 Convert to `async function AdminPage()`, prefetch `trpc.features.admin.getActiveSchema` via `void trpc.features.admin.getActiveSchema.prefetch({})`
  - [x] 1.3 Return `<HydrateClient><SchemaEditor /></HydrateClient>`

- [x] Task 2: Create `apps/nextjs/components/admin/SchemaEditor.tsx` client component (AC: #1–#6)
  - [x] 2.1 Add `"use client"` directive; import `useState` from react; import `useTRPC` from `@/trpc/react`; import `useQuery`, `useMutation`, `useQueryClient` from `@tanstack/react-query`; import `useToastStore` from `@/stores/toast-store`; import `Button` from `@life-as-code/ui`; import types `SchemaConfigContent`, `SchemaField`, `CustomField`, `FieldType` from `@life-as-code/validators`
  - [x] 2.2 Query `trpc.features.admin.getActiveSchema` via `useQuery(trpc.features.admin.getActiveSchema.queryOptions({}))`; initialize local state from query data using `useEffect` — only on first load (guard with `initialized` ref)
  - [x] 2.3 Declare `useMutation(trpc.features.admin.updateSchema.mutationOptions())` for save; in `handleSave`, call `mutation.mutate({ config: localSchema }, { onSuccess: ..., onError: ... })` — NOT async outer callback (oxlint rule)
  - [x] 2.4 **Required Fields section**: map over `localSchema.requiredFields`, render each field's `name`, `type` badge, and enabled toggle; NO delete button; label section "Required Fields"
  - [x] 2.5 **Standard Fields section**: map over `localSchema.standardFields`, render name, type badge, enabled toggle, and a delete button; render "Add standard field" inline form (name text input + type select + "Add" button) below the list
  - [x] 2.6 **Custom Extension Fields section**: map over `localSchema.customFields`, render name, type badge, optional description, enabled toggle, up/down reorder buttons, and delete button; render "Add custom field" inline form (name + type + optional description + "Add" button) below the list
  - [x] 2.7 Render a "Save Schema" `<Button type="button">` at the bottom; call `handleSave` on click; show loading state while mutation is pending
  - [x] 2.8 On `onSuccess`: call `void queryClient.invalidateQueries(...)` and call `showToast({ type: 'success', message: 'Schema updated' })`
  - [x] 2.9 On `onError`: call `showToast({ type: 'error', message: 'Failed to save schema' })`
  - [x] 2.10 Show `animate-pulse bg-muted` skeleton divs while `useQuery` `isPending` is true (no Skeleton component in packages/ui — used animate-pulse fallback)

- [x] Task 3: Typecheck and lint (AC: all)
  - [x] 3.1 `bun x tsc --noEmit` from `apps/nextjs` — confirmed 0 errors
  - [x] 3.2 `bunx oxlint --threads 1` from repo root — confirmed 0 warnings/errors

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

All file paths use `apps/nextjs`. TypeScript check: `bun x tsc --noEmit` from `apps/nextjs`. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: tRPC Procedure Namespace — `features.admin.*`

The adminRouter is nested under featuresRouter (Story 6.1). Client-side calls are:
```typescript
trpc.features.admin.getActiveSchema.queryOptions({})
trpc.features.admin.updateSchema.mutationOptions()
```
NOT `trpc.admin.*`. This nesting is per architecture spec.

---

### CRITICAL: No Async Outer Mutation Callback (oxlint)

oxlint rejects async outer mutation callbacks. Use the options object pattern:

```typescript
mutation.mutate(
  { config: localSchema },
  {
    onSuccess: () => {
      void queryClient.invalidateQueries(trpc.features.admin.getActiveSchema.queryFilter())
      showToast({ type: 'success', message: 'Schema updated' })
    },
    onError: () => {
      showToast({ type: 'error', message: 'Failed to save schema' })
    },
  }
)
```

---

### CRITICAL: oxlint Rules (From Previous Stories)

1. **`type="button"`** on ALL `<button>` and `<Button>` elements (or `type="submit"` inside `<form>`)
2. **No `!` non-null assertion** — use optional chaining or `?? fallback`
3. **`void` prefix** on floating Promises — `void queryClient.invalidateQueries(...)`
4. **No async outer mutation callbacks** — use options object with `onSuccess`/`onError`
5. **`prefer-dom-node-append`** — use `.append()` not `.appendChild()`
6. **`prefer-dom-node-remove`** — use `.remove()` not `removeChild()`

---

### CRITICAL: Local State Pattern — Initialize Once from Server Data

Use `useEffect` with a ref guard to avoid reinitializing on every query refetch:

```typescript
const initialized = useRef(false)
const { data, isPending } = useQuery(trpc.features.admin.getActiveSchema.queryOptions({}))

useEffect(() => {
  if (data && !initialized.current) {
    initialized.current = true
    setLocalSchema(data.config)
  }
}, [data])
```

The `data.config` is of type `SchemaConfigContent` (guaranteed by the adminRouter fallback to `DEFAULT_SCHEMA_CONFIG`).

---

### Admin Page RSC Prefetch Pattern

Follow the pattern established in other RSC pages (e.g., `apps/nextjs/app/(features)/features/[id]/json/page.tsx`):

```typescript
import { headers } from 'next/headers'
import { createTRPC, HydrateClient } from '@/trpc/rsc'
import { SchemaEditor } from '@/components/admin/SchemaEditor'

export default async function AdminPage() {
  const trpc = createTRPC({ headers: await headers() })
  void trpc.features.admin.getActiveSchema.prefetch({})
  return (
    <HydrateClient>
      <SchemaEditor />
    </HydrateClient>
  )
}
```

Note: `createTRPC` (not `createApi`) is used for prefetch. `createApi` is for direct server-side data access.

---

### Types from `@life-as-code/validators`

All types needed are already exported from Story 6.1:

```typescript
import type {
  SchemaConfigContent,
  SchemaField,
  CustomField,
  FieldType,
} from '@life-as-code/validators'
```

`FieldType` enum values: `'text' | 'textarea' | 'tags' | 'decision-log'`

`SchemaConfigContent` shape:
```typescript
{
  requiredFields: SchemaField[]   // name, stage, type, enabled — no delete
  standardFields: SchemaField[]   // name, stage, type, enabled — deletable, addable
  customFields: CustomField[]     // name, stage, type, enabled, description? — full CRUD + reorder
}
```

`SchemaField.stage` is a `LifecycleStage | 'all'`. For new standard/custom fields added in the UI, default `stage` to `'all'`.

---

### `useToastStore` Pattern

From `@/stores/toast-store` — follow the same pattern as `json-editor-view.tsx`:

```typescript
import { useToastStore } from '@/stores/toast-store'
const showToast = useToastStore((s) => s.showToast)
// Usage:
showToast({ type: 'success', message: 'Schema updated' })
showToast({ type: 'error', message: 'Failed to save schema' })
```

---

### Cache Invalidation After Save

```typescript
void queryClient.invalidateQueries(trpc.features.admin.getActiveSchema.queryFilter())
```

Use `queryFilter()` not `queryOptions()` for invalidation — this is the pattern seen in `json-editor-view.tsx` with `invalidateQueries`.

---

### Loading State

While `isPending` is true (first load), render skeleton placeholders. The `Skeleton` component is available from shadcn/ui — verify import path before use (check `apps/nextjs/components/ui/` for re-exports). If not available, use `animate-pulse bg-muted rounded` divs as fallback.

---

### SchemaEditor Structure Overview

```
SchemaEditor (client component)
├── Required Fields section (read-only names, type badges, enable toggle)
├── Standard Fields section (enable toggle, delete, + Add field form)
├── Custom Fields section (enable toggle, rename input, description input, up/down, delete, + Add field form)
└── "Save Schema" button (full width or right-aligned, disabled while mutation pending)
```

No Zustand store needed — local `useState` for `localSchema` is sufficient.

---

### What This Story Does NOT Include

- **No schema change propagation / feature flagging** — that's Story 6.3
- **No dynamic validation integration** into wizard or `updateFeatureJson` — that's Story 6.3
- **No feature templates** — that's Story 6.4
- **No authentication/admin enforcement** — MVP uses public access
- **No drag-and-drop reorder** — use up/down arrow buttons for custom field reorder
- **No stage selector for new fields** — default `stage: 'all'` for any new field added through the UI (simplest correct behavior for MVP)

---

### File Structure for This Story

```
apps/nextjs/
├── app/
│   └── (features)/
│       └── admin/
│           └── page.tsx           ← MODIFY: RSC prefetch + HydrateClient wrapper
└── components/
    └── admin/
        └── SchemaEditor.tsx       ← CREATE: 3-layer schema editor client component
```

---

### Previous Story Intelligence (Story 6.1)

- `DEFAULT_SCHEMA_CONFIG` has 3 requiredFields, 3 standardFields, 0 customFields — test the UI against this expected initial state
- `getActiveSchema` always returns a typed `SchemaConfigContent` (never raw `unknown`) — safe to use directly as state initializer
- `adminRouter` uses `publicProcedure` — no auth headers or token needed from UI
- Tests for validators are in `packages/db` — no new tests required for Story 6.2 (UI components are not tested with vitest in this project; no E2E tests defined for admin yet)

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 6, Story 6.2 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Admin component paths, tRPC client patterns, RSC prefetch pattern, naming conventions]
- [Source: `_bmad-output/implementation-artifacts/6-1-schema-configuration-trpc-procedures.md` — SchemaConfigContent types, DEFAULT_SCHEMA_CONFIG, oxlint rules, mutation patterns]
- [Source: `life-as-code/apps/nextjs/components/features/json-editor-view.tsx` — useTRPC, useQuery, useMutation, useToastStore, invalidateQueries patterns]
- [Source: `life-as-code/apps/nextjs/app/(features)/admin/page.tsx` — existing placeholder to replace]
- [Source: `life-as-code/packages/ui/src/index.ts` — Button, SaveIndicator exports]
- [Source: `life-as-code/apps/nextjs/trpc/rsc.tsx` — createTRPC, HydrateClient for RSC prefetch]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No blocking issues. Required `packages/api` rebuild after Story 6.1 — `adminRouter` was wired but dist was stale._

### Completion Notes List

- Task 1: Updated `apps/nextjs/app/(features)/admin/page.tsx` — converted from placeholder to async RSC that prefetches `getActiveSchema` and returns `<HydrateClient><SchemaEditor /></HydrateClient>`. Used `queryClient.prefetchQuery(trpc.features.admin.getActiveSchema.queryOptions({}))` pattern (matching existing RSC pages).
- Task 2: Created `apps/nextjs/components/admin/schema-editor.tsx` (kebab-case per oxlint filename-case rule). Uses stable `_localId` (crypto.randomUUID) on each field for React keys, avoiding `no-array-index-key` violation. Three sections: Required Fields (toggle only, no delete), Standard Fields (toggle + delete + add form), Custom Extension Fields (inline name edit, description edit, toggle, up/down reorder, delete + add form). `fromLocalSchema` strips `_localId` before passing to `updateSchema` mutation. All 6 oxlint rules satisfied.
- Task 3: `bun x tsc --noEmit` → 0 errors; `bunx oxlint --threads 1` → 0 warnings/errors. Also rebuilt `packages/api` (`bun run build`) to expose `features.admin.*` procedures.

### File List

- `life-as-code/packages/api/dist/index.mjs` (rebuilt: bun run build — expose adminRouter)
- `life-as-code/packages/api/dist/index.d.mts` (rebuilt)
- `life-as-code/apps/nextjs/app/(features)/admin/page.tsx` (modified: RSC prefetch + HydrateClient)
- `life-as-code/apps/nextjs/components/admin/schema-editor.tsx` (created)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — SchemaEditor UI created, admin page wired, API rebuilt, 0 TS errors, 0 lint warnings
