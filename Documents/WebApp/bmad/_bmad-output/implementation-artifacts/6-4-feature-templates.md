# Story 6.4: Feature Templates

Status: done

## Story

As an admin,
I want to create and manage feature templates with pre-populated field structures,
So that the team can start new features from a consistent baseline rather than from an empty form every time.

## Acceptance Criteria

1. **Given** an admin navigates to Admin → Templates, **When** the page loads, **Then** the `TemplateManager` renders a list of all templates showing name, description, field count, and last-modified date

2. **Given** an admin clicks "Create new template", **When** the template editor opens, **Then** it presents the same field structure as the wizard (all 9 stages, all field layers) with editable default values for each field

3. **Given** a template is saved, **When** the admin confirms, **Then** the template is persisted and appears in the list with a success toast ("Template saved")

4. **Given** an existing template, **When** an admin clicks "Clone", **Then** a copy is created with the name "Copy of [original name]" and a success toast fires ("Template cloned")

5. **Given** an admin clicks "Delete" on a template, **When** the 2-step confirmation is confirmed, **Then** the template is removed with a success toast ("Template deleted"); features created from that template are NOT affected

6. **Given** a user navigates to `/features/new` and templates exist, **When** the template picker loads, **Then** a picker is shown with "Start blank" and one card per template; selecting any option creates the feature and redirects to the wizard

## Tasks / Subtasks

- [x] Task 1: Add `feature_templates` table and DB migration (AC: #1, #3, #4, #5, #6)
  - [x] 1.1 Create `life-as-code/packages/db/src/schema/feature-templates.ts` with `featureTemplates` pgTable (id TEXT PK via ulid, org_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT nullable, content JSONB NOT NULL default `{}`, created_at + updated_at timestamps)
  - [x] 1.2 Add `export * from './feature-templates'` to `packages/db/src/schema/index.ts`
  - [x] 1.3 Run `cd packages/db && DATABASE_URL=... bunx drizzle-kit generate` — generates `packages/db/drizzle/0002_boring_mandroid.sql`
  - [x] 1.4 Run `cd packages/db && DATABASE_URL=... bunx drizzle-kit migrate` — applies to live DB
  - [x] 1.5 Run `cd packages/db && bun run build` — rebuilds `@life-as-code/db`

- [x] Task 2: Add template validators to `packages/validators` (AC: #1–#6)
  - [x] 2.1 Create `packages/validators/src/template.ts` exporting: `ListTemplatesSchema = z.object({})`, `CreateTemplateSchema` (name string min 1 max 100, description string max 500 optional, content FeatureContentSchema default {}), `UpdateTemplateSchema` (id string min 1, name/description/content optional), `CloneTemplateSchema` (id string min 1), `DeleteTemplateSchema` (id string min 1), and corresponding TypeScript types
  - [x] 2.2 Add `export * from './template'` to `packages/validators/src/index.ts`
  - [x] 2.3 In `packages/validators/src/feature.ts`, extend `CreateFeatureSchema` to add `templateContent: FeatureContentSchema.optional()` — also moved `FeatureContentSchema` above `CreateFeatureSchema` to fix forward reference
  - [x] 2.4 Run `cd packages/validators && bun run build`

- [x] Task 3: Add 5 template tRPC procedures to `adminRouter` (AC: #1–#6)
  - [x] 3.1 In `packages/api/src/routers/admin.ts`, add `featureTemplates` to `@life-as-code/db` import; add template schema imports to validators import (no `delete` alias needed — using `ctx.db.delete()`)
  - [x] 3.2 Add `listTemplates` query: select all `featureTemplates` where `orgId = DEFAULT_ORG_ID` ordered by `desc(featureTemplates.updatedAt)`
  - [x] 3.3 Add `createTemplate` mutation: insert into `featureTemplates` with `orgId`, `name`, `description`, `content` (default `{}`); throw `INTERNAL_SERVER_ERROR` if insert fails; return created template
  - [x] 3.4 Add `updateTemplate` mutation: build typed `setValues: Partial<typeof featureTemplates.$inferInsert>`; throw `NOT_FOUND` if no row returned
  - [x] 3.5 Add `cloneTemplate` mutation: SELECT source by id+orgId → throw NOT_FOUND if missing; INSERT copy with `name: Copy of ${source.name}`; return cloned template
  - [x] 3.6 Add `deleteTemplate` mutation: `ctx.db.delete(featureTemplates).where(and(...))`
  - [x] 3.7 In `packages/api/src/routers/features.ts`, update `create` mutation: use `input.templateContent ?? { problem: ... }` for initial content

- [x] Task 4: Rebuild `packages/api` (AC: all backend)
  - [x] 4.1 Run `cd packages/api && bun run build`

- [x] Task 5: Create `TemplateManager` admin page and components (AC: #1–#5)
  - [x] 5.1 Create `apps/nextjs/app/(features)/admin/templates/page.tsx` — async RSC that prefetches `trpc.features.admin.listTemplates` via `queryClient.prefetchQuery(...)` and returns `<HydrateClient><TemplateManager /></HydrateClient>`
  - [x] 5.2 Create `apps/nextjs/components/admin/template-manager.tsx` (kebab-case) — client component with list, create/edit/clone/delete CRUD, 2-step delete confirm, inline TemplateEditor
  - [x] 5.3 Create `apps/nextjs/components/admin/template-editor.tsx` (kebab-case) — client component with stage tabs via LIFECYCLE_STAGES + STAGE_FIELD_CONFIGS, local state, save/cancel

- [x] Task 6: Update `/features/new` page with template picker (AC: #6)
  - [x] 6.1 Modify `apps/nextjs/app/(features)/features/new/page.tsx` — fetch templates first; auto-create when empty; show TemplatePicker when templates exist
  - [x] 6.2 Create `apps/nextjs/components/admin/template-picker.tsx` — "Start blank" + one card per template; disables all on isCreating

- [x] Task 7: Typecheck and lint (AC: all)
  - [x] 7.1 `bun x tsc --noEmit` from `apps/nextjs` — 0 errors
  - [x] 7.2 `bunx oxlint --threads 1` from repo root — 0 warnings/errors (fixed: removed `async` from listTemplates query; removed unnecessary `?? {}` fallback in spread)

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

All file paths use `apps/nextjs`. TypeScript check: `bun x tsc --noEmit` from `apps/nextjs`. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: `feature_templates` Table Schema

Follow the same pattern as `schema-configs.ts`. Use `ulid` for IDs (not `crypto.randomUUID` — `schema-configs.ts` uses UUID because it pre-existed; new tables in this codebase use ulid like `features`):

```typescript
// packages/db/src/schema/feature-templates.ts
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { ulid } from 'ulidx'

export const featureTemplates = pgTable('feature_templates', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => ulid()),
  orgId: text('org_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  content: jsonb('content').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type FeatureTemplate = typeof featureTemplates.$inferSelect
export type NewFeatureTemplate = typeof featureTemplates.$inferInsert
```

---

### CRITICAL: DB Migration Commands Require DATABASE_URL

drizzle-kit requires explicit `DATABASE_URL` env var (no `.env` auto-loading via shell). Use:
```bash
cd packages/db && DATABASE_URL="postgres://neondb_owner:..." bunx drizzle-kit generate
cd packages/db && DATABASE_URL="postgres://neondb_owner:..." bunx drizzle-kit migrate
```

The URL is in `life-as-code/.env`.

---

### CRITICAL: tRPC Namespace — `features.admin.*`

All admin procedures are nested under `featuresRouter → adminRouter`. Client-side access:
```typescript
trpc.features.admin.listTemplates.queryOptions({})
trpc.features.admin.createTemplate.mutationOptions()
trpc.features.admin.updateTemplate.mutationOptions()
trpc.features.admin.cloneTemplate.mutationOptions()
trpc.features.admin.deleteTemplate.mutationOptions()
```

---

### CRITICAL: `delete` Import Conflict in admin.ts

Drizzle's `delete` function shadows the JavaScript `delete` keyword. Import it aliased:
```typescript
import { and, delete as dbDelete, desc, eq, featureEvents, features, featureTemplates, schemaConfigs } from '@life-as-code/db'
// Usage:
await ctx.db[dbDelete](featureTemplates).where(...)
```

Wait — actually Drizzle exports it as `sql` helper, not as `delete`. In Drizzle ORM, `db.delete(table)` is a method on the `db` object, not a named export. So:
```typescript
// NO import of 'delete' needed — use ctx.db.delete(featureTemplates)
await ctx.db.delete(featureTemplates).where(and(eq(featureTemplates.id, input.id), eq(featureTemplates.orgId, DEFAULT_ORG_ID)))
```
No import alias needed. `ctx.db.delete(...)` is the Drizzle pattern.

---

### CRITICAL: `updateTemplate` — Dynamic `set` Object Typing

Drizzle's `.set()` requires the correct partial type. Avoid `Record<string, unknown>` for the set object — build it typed:
```typescript
const setValues: Partial<typeof featureTemplates.$inferInsert> = { updatedAt: new Date() }
if (input.name !== undefined) setValues.name = input.name
if (input.description !== undefined) setValues.description = input.description ?? null
if (input.content !== undefined) setValues.content = input.content
```

---

### CRITICAL: Extending `CreateFeatureSchema` — FeatureContentSchema Import

`feature.ts` currently doesn't import from another validator file. The new field uses `FeatureContentSchema` which is already defined in the same file:
```typescript
export const CreateFeatureSchema = z.object({
  problemStatement: z.string(),
  reporterContext: z.string().optional(),
  templateContent: FeatureContentSchema.optional(),
})
```
`FeatureContentSchema` is already defined above `CreateFeatureSchema` in `feature.ts` — no import needed.

---

### CRITICAL: Feature Create Mutation — Template Content Logic

In `packages/api/src/routers/features.ts`, the `create` mutation currently sets:
```typescript
content: {
  problem: {
    problemStatement: input.problemStatement,
    reporterContext: input.reporterContext ?? '',
  },
},
```

When `templateContent` is provided, use it directly:
```typescript
content: input.templateContent ?? {
  problem: {
    problemStatement: input.problemStatement,
    reporterContext: input.reporterContext ?? '',
  },
},
```

The `templateContent` validator uses `FeatureContentSchema` which accepts the full content structure including all stages.

---

### CRITICAL: oxlint Rules (All Previous Stories)

1. **`type="button"`** on all `<button>` / `<Button>` elements
2. **No `!` non-null assertion** — use optional chaining or `?? fallback`
3. **`void` prefix** on floating Promises
4. **No async outer mutation callbacks** — use `onSuccess`/`onError` options object
5. **kebab-case filenames** — `template-manager.tsx`, `template-editor.tsx`, `template-picker.tsx`
6. **`no-array-index-key`** — use stable IDs (template.id) as React keys
7. **`no-accumulating-spread`** — use `Object.assign(acc, ...)` in reduce
8. **`no-await-in-loop`** — use `Promise.all([...ops])`
9. **`no-useless-undefined`** — bare `return` instead of `return undefined`

---

### CRITICAL: Local State Pattern for TemplateEditor

TemplateEditor receives initial values via props and manages local state:
```typescript
const [localName, setLocalName] = useState(template.name)
const [localDescription, setLocalDescription] = useState(template.description ?? '')
const [localContent, setLocalContent] = useState<Record<string, Record<string, unknown>>>(
  template.content as Record<string, Record<string, unknown>>
)
```

For updating a field within a stage:
```typescript
function handleFieldChange(stage: LifecycleStage, fieldKey: string, value: string) {
  setLocalContent((prev) => ({
    ...prev,
    [stage]: { ...(prev[stage] ?? {}), [fieldKey]: value },
  }))
}
```
Note: spread accumulator in `setLocalContent` is fine (it's not inside a `reduce` accumulator — it's a simple object spread for a new object, which oxlint allows). The `no-accumulating-spread` rule only flags `reduce` callbacks.

---

### CRITICAL: Template Picker in `/features/new/page.tsx`

The current page fires `createMutation.mutate` immediately on mount. We need to CONDITIONALLY fire it:
```typescript
// Strategy: fetch templates first, then decide
const { data: templates, isPending: templatesLoading } = useQuery(
  trpc.features.admin.listTemplates.queryOptions({})
)

// Auto-create when no templates (preserve existing UX)
useEffect(() => {
  if (!templatesLoading && (templates === undefined || templates.length === 0)) {
    createMutation.mutate({ problemStatement: '' })
  }
}, [templatesLoading, templates]) // NOTE: createMutation excluded — stable reference

// Remove the old unconditional useEffect
```

When templates exist, show `<TemplatePicker>` with `onCreate` callback:
```typescript
function handlePickerSelect(templateContent?: FeatureContent) {
  createMutation.mutate({ problemStatement: '', templateContent })
}
```

This page is already `"use client"` — no changes needed to the directive.

---

### CRITICAL: `TemplatePicker` `onCreate` Callback Typing

Use `FeatureContent` type from `@life-as-code/validators`:
```typescript
import type { FeatureContent, FeatureTemplate } from '@life-as-code/validators'

interface TemplatePickerProps {
  templates: FeatureTemplate[]
  onCreate: (templateContent?: FeatureContent) => void
  isCreating: boolean
}
```

`FeatureTemplate` is the `typeof featureTemplates.$inferSelect` type exported from `@life-as-code/db`. But for the picker props, it's better to import from the db package since that's where the type lives:
```typescript
import type { FeatureTemplate } from '@life-as-code/db'
```

Wait — `FeatureTemplate` type would come from `packages/db/dist/schema/index.d.mts`. But in `apps/nextjs`, the codebase uses `@life-as-code/validators` for most types. Since `FeatureTemplate` is not in validators (it's a DB row type), import it from `@life-as-code/db`:
```typescript
import type { FeatureTemplate } from '@life-as-code/db'
```

---

### CRITICAL: RSC Prefetch Pattern for Templates Page

Follow the same pattern as `apps/nextjs/app/(features)/admin/page.tsx`:
```typescript
import { headers } from 'next/headers'
import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { TemplateManager } from '@/components/admin/template-manager'

export default async function AdminTemplatesPage() {
  const trpc = createTRPC({ headers: await headers() })
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery(trpc.features.admin.listTemplates.queryOptions({}))
  return (
    <HydrateClient>
      <TemplateManager />
    </HydrateClient>
  )
}
```

---

### CRITICAL: Cache Invalidation Pattern

After create/clone/delete/update mutations, invalidate using `queryOptions({}).queryKey`:
```typescript
void queryClient.invalidateQueries({
  queryKey: trpc.features.admin.listTemplates.queryOptions({}).queryKey,
})
```

---

### CRITICAL: `useToastStore` Pattern (from Story 6.2)

```typescript
import { useToastStore } from '@/stores/toast-store'
const showToast = useToastStore((s) => s.showToast)
showToast({ type: 'success', message: 'Template saved' })
showToast({ type: 'error', message: 'Failed to save template' })
```

---

### Template Editor Field Structure

The template editor renders all 9 stages using `STAGE_FIELD_CONFIGS` from `@/components/wizard/stage-fields`. Each stage shows all fields (required + standard + extended tiers). Use a tab-like navigation (same stage labels as wizard):

```typescript
import { LIFECYCLE_STAGES } from '@life-as-code/validators'
import { STAGE_FIELD_CONFIGS } from '@/components/wizard/stage-fields'
import type { LifecycleStage } from '@life-as-code/validators'

const STAGE_LABEL: Record<LifecycleStage, string> = {
  problem: 'Problem', analysis: 'Analysis', requirements: 'Requirements',
  design: 'Design', implementation: 'Implementation', validation: 'Validation',
  documentation: 'Documentation', delivery: 'Delivery', support: 'Support',
}
```

For each field in a stage, render a `<textarea>` with `value={localContent[stage]?.[field.key] as string ?? ''}` and `onChange` calling `handleFieldChange`. No `field-sizing:content` needed — use fixed `rows={3}`.

---

### Field Count Calculation for TemplateManager List

Count non-empty string values across all stage content:
```typescript
function countFields(content: unknown): number {
  const contentMap = content as Record<string, Record<string, unknown>> | null
  if (!contentMap) return 0
  return Object.values(contentMap).reduce<number>((total, stage) => {
    if (typeof stage !== 'object' || stage === null) return total
    const filled = Object.values(stage).filter(
      (v) => typeof v === 'string' && v.trim().length > 0
    ).length
    return total + filled
  }, 0)
}
```

---

### 2-Step Delete Confirmation Pattern

Use local `deletingId` state:
```typescript
const [deletingId, setDeletingId] = useState<string | null>(null)

// First click:
onClick={() => { setDeletingId(template.id) }}

// Confirmation UI (shown when deletingId === template.id):
<button type="button" onClick={() => { setDeletingId(null) }}>Cancel</button>
<button type="button" onClick={() => { handleDelete(template.id) }}>Yes, delete</button>
```

---

### What This Story Does NOT Include

- **No template versioning** — templates are mutable; no history
- **No drag-and-drop field reorder** in template editor — not in AC
- **No template search/filter** — all templates listed flat
- **No template sharing between orgs** — always scoped to `DEFAULT_ORG_ID`
- **No authentication/admin enforcement** — MVP uses publicProcedure
- **No `updateFeatureJson` template integration** — only `create` feature flow
- **No stage selector for template fields** — template shows all stages always

---

### File Structure for This Story

```
packages/
├── db/
│   ├── src/schema/
│   │   ├── feature-templates.ts    ← CREATE: featureTemplates table
│   │   └── index.ts                ← MODIFY: add export
│   └── drizzle/
│       └── 0002_*.sql              ← GENERATED: CREATE TABLE feature_templates
├── validators/
│   └── src/
│       ├── template.ts             ← CREATE: template Zod schemas
│       ├── feature.ts              ← MODIFY: extend CreateFeatureSchema
│       └── index.ts                ← MODIFY: add template export
├── api/
│   └── src/routers/
│       ├── admin.ts                ← MODIFY: 5 new template procedures
│       └── features.ts             ← MODIFY: templateContent in create
apps/nextjs/
├── app/(features)/
│   ├── admin/templates/
│   │   └── page.tsx                ← CREATE: RSC prefetch + HydrateClient
│   └── features/new/
│       └── page.tsx                ← MODIFY: template picker conditional
└── components/admin/
    ├── template-manager.tsx        ← CREATE: list view with CRUD actions
    ├── template-editor.tsx         ← CREATE: per-stage field editor
    └── template-picker.tsx         ← CREATE: "Start blank" + template cards
```

---

### Previous Story Intelligence (Story 6.3)

- `packages/api` dist must be rebuilt after router changes (`bun run build` from `packages/api`)
- `packages/validators` dist must also be rebuilt when validators change
- `packages/db` dist must be rebuilt after schema changes
- oxlint: `no-accumulating-spread` — use `Object.assign` in `reduce` callbacks
- oxlint: `no-await-in-loop` — use `Promise.all` for batch DB ops
- oxlint: `no-useless-undefined` — bare `return` not `return undefined`
- When `'flagged'` was added to DB, cascading TypeScript errors appeared in multiple files — always check for inline status type literals when changing DB enum types
- DB migration sequence: generate → migrate → rebuild db → rebuild api

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 6, Story 6.4 — Full BDD acceptance criteria]
- [Source: `life-as-code/packages/db/src/schema/schema-configs.ts` — table pattern (JSONB content, timestamps)]
- [Source: `life-as-code/packages/db/src/schema/features.ts` — ulid pattern for ID generation]
- [Source: `life-as-code/packages/db/drizzle/0000_wide_zzzax.sql` — migration format reference]
- [Source: `life-as-code/packages/api/src/routers/admin.ts` — existing adminRouter, transaction patterns]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — create mutation, content shape]
- [Source: `life-as-code/packages/validators/src/feature.ts` — CreateFeatureSchema, FeatureContentSchema]
- [Source: `life-as-code/packages/validators/src/schema-config.ts` — validator structure pattern]
- [Source: `life-as-code/apps/nextjs/app/(features)/admin/page.tsx` — RSC prefetch pattern]
- [Source: `life-as-code/apps/nextjs/app/(features)/features/new/page.tsx` — current new feature creation flow]
- [Source: `life-as-code/apps/nextjs/components/admin/schema-editor.tsx` — SchemaEditor patterns, useToastStore, local state]
- [Source: `life-as-code/apps/nextjs/components/wizard/stage-fields.ts` — STAGE_FIELD_CONFIGS structure]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` — STAGE_LABEL map pattern]
- [Source: `_bmad-output/implementation-artifacts/6-3-schema-change-propagation-and-feature-flagging.md` — oxlint patterns, rebuild chain]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

1. **oxlint `require-await`**: `listTemplates` query had `async` keyword with no `await` — removed `async`
2. **oxlint `no-useless-fallback-in-spread`**: `{ ...(prev[stage] ?? {}), ... }` in template-editor.tsx — removed `?? {}` (spreading `undefined` is safe)
3. **Forward reference**: `FeatureContentSchema` was defined after `CreateFeatureSchema` in `feature.ts` — moved `FeatureContentSchema` above `CreateFeatureSchema` to fix runtime reference error

### Completion Notes List

- All 7 tasks completed in single session
- `feature_templates` DB table created with ulid PK; migration `0002_boring_mandroid.sql` applied to live Neon DB
- `FeatureContentSchema` reordered before `CreateFeatureSchema` in `feature.ts` (story note incorrectly said it was already above)
- `listTemplates` uses non-async query (no await needed for Drizzle chain return)
- `ctx.db.delete()` used directly — no import alias needed
- Template picker: auto-creates immediately when no templates; shows picker when templates exist; preserves original UX for zero-template state
- `bun x tsc --noEmit` → 0 errors; `bunx oxlint --threads 1` → 0 warnings/errors

### File List

- `life-as-code/packages/db/src/schema/feature-templates.ts` (created)
- `life-as-code/packages/db/src/schema/index.ts` (modified)
- `life-as-code/packages/db/drizzle/0002_boring_mandroid.sql` (generated + applied)
- `life-as-code/packages/db/drizzle/meta/_journal.json` (auto-generated: added 0002 entry)
- `life-as-code/packages/db/drizzle/meta/0002_snapshot.json` (auto-generated: drizzle-kit snapshot)
- `life-as-code/packages/validators/src/template.ts` (created)
- `life-as-code/packages/validators/src/feature.ts` (modified — reordered FeatureContentSchema, extended CreateFeatureSchema)
- `life-as-code/packages/validators/src/index.ts` (modified)
- `life-as-code/packages/validators/package.json` (modified: added `"./template"` sub-path export entry)
- `life-as-code/packages/api/src/routers/admin.ts` (modified — 5 new template procedures)
- `life-as-code/packages/api/src/routers/features.ts` (modified — templateContent in create)
- `life-as-code/apps/nextjs/app/(features)/admin/templates/page.tsx` (created)
- `life-as-code/apps/nextjs/components/admin/template-manager.tsx` (created)
- `life-as-code/apps/nextjs/components/admin/template-editor.tsx` (created)
- `life-as-code/apps/nextjs/components/admin/template-picker.tsx` (created)
- `life-as-code/apps/nextjs/app/(features)/features/new/page.tsx` (modified)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — feature_templates table, 5 admin tRPC procedures, TemplateManager + TemplateEditor + TemplatePicker UI, template-aware new feature flow
- 2026-03-15: Code review pass — added validators/package.json and drizzle meta files to File List (M1, M2, M3)
