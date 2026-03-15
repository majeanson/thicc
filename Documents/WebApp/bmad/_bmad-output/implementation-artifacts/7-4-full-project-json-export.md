# Story 7.4: Full Project JSON Export

Status: done

## Story

As an admin,
I want to export the entire project's feature data as a single JSON bundle,
So that I have a complete, re-importable backup of all feature artifacts and can archive the project state at any point in time.

## Acceptance Criteria

1. **Given** `features.admin.exportAll` tRPC procedure, **When** called, **Then** it returns a JSON object containing all features for the org with their complete `content` JSONB, `feature_key`, `status`, `frozen`, `parent_id`, `created_at`, `updated_at`, and all `feature_events` for each feature

2. **Given** the admin navigates to Admin → Export, **When** the `ExportPanel` renders, **Then** it shows: a description of what will be exported, optional filters (status, tags), an estimated feature count, and an "Export all features" primary button

3. **Given** the user clicks "Export all features", **When** `features.admin.exportAll` completes, **Then** a `.json` file is downloaded named `life-as-code-export-YYYY-MM-DD.json` containing the full feature bundle

4. **Given** the export file, **When** opened, **Then** it is valid JSON with structure `{ exportedAt, featureCount, features: [...] }` — each feature containing all fields plus an `events` array of its feature_events

5. **Given** optional filters are applied before export, **When** the user selects a status filter and clicks export, **Then** only features matching the filter criteria are included and the filename reflects the filter (e.g. `life-as-code-export-frozen-2026-03-14.json`)

6. **Given** the export is in progress, **When** the button is clicked, **Then** a loading spinner renders inline within the button and the button is disabled until the download begins — preventing double-clicks

## Tasks / Subtasks

- [x] Task 1: Add `ExportAllSchema` to `packages/validators/src/export.ts` (AC: #1, #5)
  - [x] 1.1 Create `packages/validators/src/export.ts` with `ExportAllSchema = z.object({ status: z.enum(['active', 'draft', 'frozen', 'flagged']).optional(), tags: z.array(z.string()).optional() })`
  - [x] 1.2 Add `export * from './export'` to `packages/validators/src/index.ts`
  - [x] 1.3 Add `"./export": "./dist/export.mjs"` export entry to `packages/validators/package.json`

- [x] Task 2: Add `exportAll` mutation to `packages/api/src/routers/admin.ts` (AC: #1, #4, #5)
  - [x] 2.1 Add `inArray` to the db import; add `ExportAllSchema` to the validators import
  - [x] 2.2 Implement `exportAll: publicProcedure.input(ExportAllSchema).mutation(async ({ ctx, input }) => {...})` — see Dev Notes for exact query logic
  - [x] 2.3 Return `{ exportedAt: new Date().toISOString(), featureCount: filteredFeatures.length, features: [...] }` where each feature includes an `events` array of its feature_events

- [x] Task 3: Create `apps/nextjs/components/admin/export-panel.tsx` client component (AC: #2, #3, #5, #6)
  - [x] 3.1 Add `"use client"` directive; import `useMemo, useState` from `react`; import `useMutation, useQuery` from `@tanstack/react-query`; import `Button` from `@life-as-code/ui`; import `useTRPC` from `@/trpc/react`
  - [x] 3.2 State: `const [statusFilter, setStatusFilter] = useState<'active' | 'draft' | 'frozen' | 'flagged' | ''>('')`; `const [tagsInput, setTagsInput] = useState('')`
  - [x] 3.3 Estimated count: `useQuery(trpc.features.listFeatures.queryOptions())`, derive count from result filtered by `statusFilter`
  - [x] 3.4 Mutation: `useMutation(trpc.features.admin.exportAll.mutationOptions())` with `onSuccess` triggering client-side blob download — see Dev Notes for exact filename/blob logic
  - [x] 3.5 Render: section header, description, status `<select>`, tags `<input type="text">`, estimated count `<p>`, "Export all features" `<Button type="button">` with `disabled={exportMutation.isPending}` and inline spinner when pending
  - [x] 3.6 Export named `ExportPanel` function accepting no props

- [x] Task 4: Update admin page to render `ExportPanel` (AC: #2)
  - [x] 4.1 In `apps/nextjs/app/(features)/admin/page.tsx`, import `ExportPanel` from `@/components/admin/export-panel`
  - [x] 4.2 Add `<ExportPanel />` to the page JSX after `<SchemaEditor />`

- [x] Task 5: Rebuild packages, typecheck and lint (AC: all)
  - [x] 5.1 `bun run build` from `packages/validators` — rebuild dist to expose `ExportAllSchema`
  - [x] 5.2 `bun run build` from `packages/api` — rebuild dist to expose `exportAll`
  - [x] 5.3 `bun x tsc --noEmit` from `apps/nextjs` — confirm 0 errors
  - [x] 5.4 `bunx oxlint --threads 1` from repo root — confirm 0 warnings/errors

## Dev Notes

### CRITICAL: Admin Router Is Nested as `features.admin.*`

`adminRouter` is NOT wired directly into `_app.ts`. It is a **sub-router** of `featuresRouter`:

```typescript
// packages/api/src/routers/features.ts (line 349)
export const featuresRouter = createTRPCRouter({
  // ...other procedures...
  admin: adminRouter,  // ← nested here
  listFeatures: publicProcedure.query(...),
  // ...
})
```

Client calls are therefore: `trpc.features.admin.exportAll.mutate(...)` — NOT `trpc.admin.exportAll`.

---

### CRITICAL: Always Rebuild Both Packages After tRPC/Validator Changes

Same pattern as Stories 7-1, 7-2, 7-3:

```bash
cd packages/validators && bun run build
cd packages/api && bun run build
cd apps/nextjs && bun x tsc --noEmit
```

---

### CRITICAL: `validators/package.json` Export Entry Pattern

Add to the `exports` map (simple string format, same as existing entries):

```json
"./export": "./dist/export.mjs"
```

Do NOT use the `{ "import": ..., "require": ... }` object format.

---

### CRITICAL: `inArray` Import from `@life-as-code/db`

The `exportAll` procedure needs `inArray` from Drizzle to query feature_events by feature IDs. Add it to the existing import in `admin.ts`:

```typescript
import { and, desc, eq, featureEvents, featureTemplates, features, inArray, schemaConfigs } from '@life-as-code/db'
```

---

### CRITICAL: oxlint Rules

1. **`type="button"`** on ALL `<button>` and `<Button>` elements
2. **No `!` non-null assertion** — use optional chaining
3. **`void` prefix** on floating Promises
4. **`no-array-index-key`** — no array index as React key
5. **`require-await`** — `exportAll` uses `await` so no issue
6. **Kebab-case filenames** — `export-panel.tsx` (not `ExportPanel.tsx`)
7. **No `async` on functions without `await`**

---

### `exportAll` Mutation — Exact Implementation

```typescript
exportAll: publicProcedure
  .input(ExportAllSchema)
  .mutation(async ({ ctx, input }) => {
    // Build conditions
    const conditions: Parameters<typeof and>[0][] = [eq(features.orgId, DEFAULT_ORG_ID)]
    if (input.status) conditions.push(eq(features.status, input.status))

    const allFeatures = await ctx.db
      .select()
      .from(features)
      .where(and(...conditions))

    // Tags filter in JS (JSONB array — no native Drizzle shorthand)
    const filtered =
      input.tags && input.tags.length > 0
        ? allFeatures.filter((f) => {
            const content = f.content as Record<string, unknown>
            const featureTags = Array.isArray(content.tags) ? (content.tags as string[]) : []
            return input.tags?.some((t) => featureTags.includes(t)) ?? false
          })
        : allFeatures

    const featureIds = filtered.map((f) => f.id)

    const allEvents =
      featureIds.length > 0
        ? await ctx.db
            .select()
            .from(featureEvents)
            .where(inArray(featureEvents.featureId, featureIds))
        : []

    const eventsByFeatureId = new Map<string, typeof allEvents>()
    for (const event of allEvents) {
      const existing = eventsByFeatureId.get(event.featureId) ?? []
      existing.push(event)
      eventsByFeatureId.set(event.featureId, existing)
    }

    return {
      exportedAt: new Date().toISOString(),
      featureCount: filtered.length,
      features: filtered.map((f) => ({
        ...f,
        events: eventsByFeatureId.get(f.id) ?? [],
      })),
    }
  }),
```

**Note:** The `conditions` array type annotation `Parameters<typeof and>[0][]` is needed because `and()` accepts `SQL | undefined` arguments. Alternatively use a simpler approach:

```typescript
// Simpler — build the where clause directly
const whereClause = input.status
  ? and(eq(features.orgId, DEFAULT_ORG_ID), eq(features.status, input.status))
  : eq(features.orgId, DEFAULT_ORG_ID)

const allFeatures = await ctx.db.select().from(features).where(whereClause)
```

Use the simpler approach to avoid TypeScript complexity.

---

### `ExportPanel` Client-Side Download Logic

Use the same blob pattern as `json-editor-view.tsx` (lines 135–147):

```typescript
const dateStr = new Date().toISOString().slice(0, 10) // "2026-03-15"
const suffix = statusFilter ? `-${statusFilter}` : ''
const filename = `life-as-code-export${suffix}-${dateStr}.json`
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = filename
document.body.append(a)
a.click()
a.remove()
URL.revokeObjectURL(url)
```

Put this logic inside `onSuccess` of `useMutation`.

---

### `ExportPanel` Mutation Setup

```typescript
const trpc = useTRPC()
const { data: allFeatures } = useQuery(trpc.features.listFeatures.queryOptions())

const estimatedCount = useMemo(() => {
  if (!allFeatures) return null
  if (!statusFilter) return allFeatures.length
  return allFeatures.filter((f) => f.status === statusFilter).length
}, [allFeatures, statusFilter])

const exportMutation = useMutation(
  trpc.features.admin.exportAll.mutationOptions({
    onSuccess: (data) => {
      const dateStr = new Date().toISOString().slice(0, 10)
      const suffix = statusFilter ? `-${statusFilter}` : ''
      const filename = `life-as-code-export${suffix}-${dateStr}.json`
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.append(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
  }),
)

function handleExport() {
  const tags = tagsInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  exportMutation.mutate({
    status: statusFilter || undefined,
    tags: tags.length > 0 ? tags : undefined,
  })
}
```

**`statusFilter || undefined`** — empty string is falsy, so this cleanly omits the field when no status is selected. TypeScript will accept this because `ExportAllSchema` has `status` as optional.

---

### `ExportPanel` Render Structure

```
ExportPanel (client component — export-panel.tsx)
├── Section header: "Export Project Data"
├── Description: "Download a complete JSON backup of all feature artifacts..."
├── Filters row
│   ├── Status <select>: All statuses / Active / Draft / Frozen / Flagged
│   └── Tags <input type="text"> placeholder="Filter by tags (comma-separated)"
├── Estimated count: "~{n} features will be exported" (or skeleton if loading)
└── <Button type="button" disabled={exportMutation.isPending}>
    └── "Export all features" | "Exporting…" + spinner when isPending
```

---

### `ExportAllSchema` — Exact Content

```typescript
import { z } from 'zod'

export const ExportAllSchema = z.object({
  status: z.enum(['active', 'draft', 'frozen', 'flagged']).optional(),
  tags: z.array(z.string()).optional(),
})
```

---

### Admin Page — Current State

`apps/nextjs/app/(features)/admin/page.tsx` currently:
1. Prefetches `trpc.features.admin.getActiveSchema`
2. Wraps with `<HydrateClient>`
3. Renders only `<SchemaEditor />`

After this story, add `<ExportPanel />` below `<SchemaEditor />`. No additional RSC prefetch needed — `ExportPanel` fetches `listFeatures` client-side for the count display.

---

### `listFeatures` Is Already Available

`trpc.features.listFeatures` already exists in `featuresRouter` (line 351 of `features.ts`). It returns all features for the org. Use it directly in `ExportPanel` for the estimated count — no new procedure needed.

---

### File Structure for This Story

```
packages/validators/src/
├── export.ts              ← CREATE: ExportAllSchema
└── index.ts               ← MODIFY: add export * from './export'

packages/validators/
└── package.json           ← MODIFY: add "./export" export entry

packages/api/src/routers/
└── admin.ts               ← MODIFY: add exportAll mutation + inArray import

apps/nextjs/
├── app/(features)/admin/page.tsx           ← MODIFY: import + render ExportPanel
└── components/admin/
    └── export-panel.tsx                    ← CREATE: ExportPanel component
```

---

### What This Story Does NOT Include

- **No server-side streaming** — the entire JSON payload is returned as a tRPC mutation response; blob is created client-side
- **No re-import functionality** — export only (re-import is out of scope for MVP)
- **No schema_configs in export** — only features + feature_events per AC #1
- **No pagination on export** — all matching features returned in a single response (MVP scale)
- **No auth gates** — `publicProcedure` as per MVP convention (same as all other procedures)

---

### Previous Story Intelligence

- Stories 7-1, 7-2, 7-3: `bun run build` in each package before `tsc --noEmit` — ALWAYS rebuild
- Story 7-2: `useMutation` pattern with `onSuccess` callback — same pattern used here for download trigger
- Story 7-3: `inArray` not needed there, but it IS exported from `@life-as-code/db` (Drizzle re-exports all operators)
- Pattern for `and()` with conditional: see admin.ts `updateSchema` — uses `and(eq(...), eq(...))` directly

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 7, Story 7.4 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — FR42, admin router spec, tRPC naming conventions]
- [Source: `life-as-code/packages/api/src/routers/admin.ts` — existing adminRouter, DEFAULT_ORG_ID, procedure patterns]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — adminRouter nesting (line 349), listFeatures (line 351)]
- [Source: `life-as-code/packages/db/src/schema/features.ts` — Feature type, statusEnum]
- [Source: `life-as-code/packages/db/src/schema/feature-events.ts` — FeatureEvent type]
- [Source: `life-as-code/packages/validators/src/index.ts` — export pattern]
- [Source: `life-as-code/packages/validators/package.json` — export entry pattern]
- [Source: `life-as-code/apps/nextjs/app/(features)/admin/page.tsx` — current admin page (SchemaEditor only)]
- [Source: `life-as-code/apps/nextjs/components/features/json-editor-view.tsx` — blob download pattern (lines 135–147)]
- [Source: `_bmad-output/implementation-artifacts/7-3-audit-trail-change-history-ui.md` — rebuild pattern, oxlint lessons]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without blockers. Fixed one oxlint `no-map-spread` error by replacing `filtered.map((f) => ({ ...f, events: ... }))` with `Object.assign({}, f, { events: ... })`.

### Completion Notes List

- Created `ExportAllSchema` validator with optional `status` enum and `tags` array filters
- Added `exportAll` tRPC mutation to `adminRouter` using simpler `whereClause` pattern (avoids TypeScript `Parameters<typeof and>` complexity)
- Tags filter applied in JS after DB query (JSONB array — no native Drizzle shorthand)
- `eventsByFeatureId` Map built via loop for O(n) grouping of feature_events
- `ExportPanel` client component: status select, tags text input, live estimated count via `listFeatures`, blob download triggered in `onSuccess`
- Download filename respects optional status filter: `life-as-code-export[-{status}]-YYYY-MM-DD.json`
- Button disabled with spinner while `exportMutation.isPending`
- All packages rebuilt; 0 TypeScript errors; 0 oxlint warnings/errors
- **Code review fix (2026-03-15):** Added `useToastStore` import + `onError` handler to `ExportPanel` — shows "Export failed" toast on mutation error, consistent with all other mutation-bearing components
- **Design debt acknowledged:** `ExportPanel` estimated count reflects `statusFilter` only, not `tagsInput` — by design per Dev Notes (client-side `listFeatures` has no tag-filter capability without content inspection); known UX limitation at MVP scale

### File List

- `life-as-code/packages/validators/src/export.ts` (created)
- `life-as-code/packages/validators/src/index.ts` (modified)
- `life-as-code/packages/validators/package.json` (modified)
- `life-as-code/packages/api/src/routers/admin.ts` (modified)
- `life-as-code/apps/nextjs/components/admin/export-panel.tsx` (created)
- `life-as-code/apps/nextjs/app/(features)/admin/page.tsx` (modified)

## Change Log

- 2026-03-15: Implemented full project JSON export — ExportAllSchema validator, exportAll tRPC mutation with status/tags filtering, ExportPanel client component with blob download, admin page integration. All packages rebuilt, 0 TypeScript errors, 0 oxlint errors.
- 2026-03-15: Code review fix — Added `useToastStore` + `onError` handler to `ExportPanel`; 0 TS errors, 0 oxlint errors after fix.
