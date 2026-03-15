# Story 6.1: Schema Configuration tRPC Procedures

Status: done

## Story

As a developer,
I want tRPC procedures to read and write the three-layer schema configuration stored in `schema_configs`,
So that all write paths validate feature data against the active schema and admins can evolve the schema over time.

## Acceptance Criteria

1. **Given** the `features.admin.getActiveSchema` tRPC procedure, **When** called, **Then** it returns the current active `schema_configs` row for the default `org_id` including all three layers: required fields, standard fields, and custom extension fields

2. **Given** no schema config exists for the org, **When** `features.admin.getActiveSchema` is called, **Then** a sensible default schema is returned with the baseline required fields (problem statement, acceptance criteria, implementation refs) pre-populated

3. **Given** `features.admin.updateSchema` is called with a new schema config, **When** it executes, **Then** the `schema_configs` row is updated, a `SCHEMA_UPDATED` event is written to `feature_events` with `actor: "admin"`, and the new schema takes effect immediately for all subsequent write operations

4. **Given** the Zod validation in `packages/validators` is schema-driven, **When** any feature mutation procedure runs after a schema update, **Then** the updated schema is used to validate the incoming data — the active schema is always the source of truth for validation

5. **Given** `features.admin.updateSchema` is called with an invalid schema structure, **When** Zod validates the schema config input, **Then** a `BAD_REQUEST` error is returned with details — invalid schemas are never persisted

## Tasks / Subtasks

- [x] Task 1: Create `SchemaConfigContentSchema` in `packages/validators/src/schema-config.ts` (AC: #1, #2, #4, #5)
  - [x] 1.1 Create `packages/validators/src/schema-config.ts` with: `FieldTypeSchema`, `SchemaFieldSchema`, `CustomFieldSchema`, `SchemaConfigContentSchema`, `GetActiveSchemaSchema`, `UpdateSchemaSchema`
  - [x] 1.2 Export `DEFAULT_SCHEMA_CONFIG` const (typed as `SchemaConfigContent`) from the same file with the three baseline required fields
  - [x] 1.3 Export TypeScript types: `FieldType`, `SchemaField`, `CustomField`, `SchemaConfigContent`, `GetActiveSchemaInput`, `UpdateSchemaInput`
  - [x] 1.4 Add `export * from './schema-config'` to `packages/validators/src/index.ts`

- [x] Task 2: Create `packages/api/src/routers/admin.ts` with `adminRouter` (AC: #1, #2, #3, #5)
  - [x] 2.1 Implement `getActiveSchema` query: SELECT FROM `schema_configs` WHERE `orgId = DEFAULT_ORG_ID` ORDER BY `updatedAt DESC` LIMIT 1 — if no row found, return `DEFAULT_SCHEMA_CONFIG`; if row found but config fails `SchemaConfigContentSchema.safeParse`, return `DEFAULT_SCHEMA_CONFIG`
  - [x] 2.2 Implement `updateSchema` mutation with `.input(UpdateSchemaSchema)`: in a transaction, SELECT existing row → UPDATE if exists / INSERT if not → INSERT SCHEMA_UPDATED event into `feature_events` with `featureId: 'schema:default'`, `actor: 'admin'`, `changedFields: input.config` → return the upserted row
  - [x] 2.3 Export `adminRouter` from `admin.ts`

- [x] Task 3: Wire `adminRouter` into `featuresRouter` (AC: #1, #2, #3)
  - [x] 3.1 In `packages/api/src/routers/features.ts`, import `adminRouter` from `./admin`
  - [x] 3.2 Add `admin: adminRouter` as a key in the `featuresRouter` `createTRPCRouter({...})` call — this exposes procedures at `features.admin.getActiveSchema` and `features.admin.updateSchema`

- [x] Task 4: Add Zod schema tests (AC: #4, #5)
  - [x] 4.1 Create `packages/db/src/__tests__/schema-config.test.ts` (following Story 5.1 vitest pattern in `packages/db`)
  - [x] 4.2 Test valid three-layer config parses through `SchemaConfigContentSchema` without errors
  - [x] 4.3 Test invalid field type (not in enum) fails `SchemaConfigContentSchema.safeParse`
  - [x] 4.4 Test missing required structure (e.g. `requiredFields` not an array) fails validation
  - [x] 4.5 Test `DEFAULT_SCHEMA_CONFIG` itself passes `SchemaConfigContentSchema.safeParse`
  - [x] 4.6 Run tests: `cd packages/db && bun test` — confirm all pass

- [x] Task 5: Typecheck and lint (AC: all)
  - [x] 5.1 `bun x tsc --noEmit` from `apps/nextjs` — confirm 0 errors
  - [x] 5.2 `bunx oxlint --threads 1` from repo root — confirm 0 warnings/errors

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

All Next.js source files live under `apps/nextjs`. The architecture doc says `apps/web` — **ignore that name everywhere**. TypeScript check: `bun x tsc --noEmit` from `apps/nextjs`. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: `schema_configs` Table Already Exists — No Migration Needed

The Drizzle schema at `packages/db/src/schema/schema-configs.ts` already defines the `schema_configs` table with `id`, `orgId`, `config` (JSONB), `createdAt`, `updatedAt`. No database migration is required for this story. **Do NOT run `drizzle-kit generate` or `drizzle-kit migrate`.**

---

### CRITICAL: `adminRouter` Nested Under `features`, Not Top-Level

The architecture specifies `features.admin.*` procedure namespacing. Implement by adding `admin: adminRouter` inside the existing `featuresRouter` `createTRPCRouter({...})` call in `features.ts`. Do NOT add a top-level `admin` key to the appRouter in `_app.ts`. The client will then call `trpc.features.admin.getActiveSchema` and `trpc.features.admin.updateSchema`.

```typescript
// packages/api/src/routers/features.ts
import { adminRouter } from './admin'

export const featuresRouter = createTRPCRouter({
  // ... existing procedures ...
  admin: adminRouter,
})
```

---

### CRITICAL: No Unique Constraint on `schema_configs.org_id`

The existing `schema_configs` table has **no unique constraint** on `org_id`. Do NOT use `INSERT ... ON CONFLICT`. Instead:
1. `SELECT * FROM schema_configs WHERE orgId = DEFAULT_ORG_ID ORDER BY updatedAt DESC LIMIT 1`
2. If row found → `UPDATE schema_configs SET config = input.config, updatedAt = NOW() WHERE id = existingRow.id`
3. If no row → `INSERT INTO schema_configs { orgId: DEFAULT_ORG_ID, config: input.config }`

Use a transaction for `updateSchema` to ensure atomicity with the SCHEMA_UPDATED event insert.

---

### CRITICAL: AC4 Scope for Story 6.1

AC4 ("the updated schema is used to validate incoming data") means the `getActiveSchema` procedure is the foundation for future schema-driven validation. **Story 6.1 does NOT wire the active schema into `updateFeatureJson` or `updateStage` procedures.** That integration is Story 6.3's responsibility. Story 6.1 only establishes the procedures that read/write the schema config — the validation integration is explicitly out of scope here.

---

### `SchemaConfigContentSchema` — Complete Design

Create `packages/validators/src/schema-config.ts`:

```typescript
import { z } from 'zod'
import { LIFECYCLE_STAGES } from './lifecycle'

export const FieldTypeSchema = z.enum(['text', 'textarea', 'tags', 'decision-log'])

export const SchemaFieldSchema = z.object({
  name: z.string().min(1),
  stage: z.enum([...LIFECYCLE_STAGES, 'all'] as const),
  type: FieldTypeSchema,
  enabled: z.boolean().default(true),
})

export const CustomFieldSchema = SchemaFieldSchema.extend({
  description: z.string().optional(),
})

export const SchemaConfigContentSchema = z.object({
  requiredFields: z.array(SchemaFieldSchema),
  standardFields: z.array(SchemaFieldSchema),
  customFields: z.array(CustomFieldSchema),
})

export const GetActiveSchemaSchema = z.object({})
export const UpdateSchemaSchema = z.object({
  config: SchemaConfigContentSchema,
})

export type FieldType = z.infer<typeof FieldTypeSchema>
export type SchemaField = z.infer<typeof SchemaFieldSchema>
export type CustomField = z.infer<typeof CustomFieldSchema>
export type SchemaConfigContent = z.infer<typeof SchemaConfigContentSchema>
export type GetActiveSchemaInput = z.infer<typeof GetActiveSchemaSchema>
export type UpdateSchemaInput = z.infer<typeof UpdateSchemaSchema>

export const DEFAULT_SCHEMA_CONFIG: SchemaConfigContent = {
  requiredFields: [
    { name: 'problemStatement', stage: 'problem', type: 'textarea', enabled: true },
    { name: 'acceptanceCriteria', stage: 'requirements', type: 'textarea', enabled: true },
    { name: 'implementationRefs', stage: 'implementation', type: 'text', enabled: true },
  ],
  standardFields: [
    { name: 'reporterContext', stage: 'problem', type: 'textarea', enabled: true },
    { name: 'edgeCases', stage: 'analysis', type: 'textarea', enabled: true },
    { name: 'designDecisions', stage: 'design', type: 'decision-log', enabled: true },
  ],
  customFields: [],
}
```

Key design notes:
- `stage` enum spreads `LIFECYCLE_STAGES` and adds `'all'` for cross-stage fields
- `enabled: z.boolean().default(true)` — required fields default to enabled
- `CustomFieldSchema` extends `SchemaFieldSchema` with optional `description` for wizard hint text

---

### `adminRouter` — Complete Implementation Guide

```typescript
// packages/api/src/routers/admin.ts
import { schemaConfigs, featureEvents, eq, desc } from '@life-as-code/db'
import {
  EventType,
  GetActiveSchemaSchema,
  UpdateSchemaSchema,
  DEFAULT_SCHEMA_CONFIG,
  SchemaConfigContentSchema,
} from '@life-as-code/validators'

import { createTRPCRouter, publicProcedure } from '@/trpc'

const DEFAULT_ORG_ID = 'default'

export const adminRouter = createTRPCRouter({
  getActiveSchema: publicProcedure
    .input(GetActiveSchemaSchema)
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select()
        .from(schemaConfigs)
        .where(eq(schemaConfigs.orgId, DEFAULT_ORG_ID))
        .orderBy(desc(schemaConfigs.updatedAt))
        .limit(1)

      const row = rows[0]
      if (!row) return { id: null, orgId: DEFAULT_ORG_ID, config: DEFAULT_SCHEMA_CONFIG, createdAt: null, updatedAt: null }

      const parsed = SchemaConfigContentSchema.safeParse(row.config)
      if (!parsed.success) return { ...row, config: DEFAULT_SCHEMA_CONFIG }

      return { ...row, config: parsed.data }
    }),

  updateSchema: publicProcedure
    .input(UpdateSchemaSchema)
    .mutation(({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(schemaConfigs)
          .where(eq(schemaConfigs.orgId, DEFAULT_ORG_ID))
          .orderBy(desc(schemaConfigs.updatedAt))
          .limit(1)

        const existing = rows[0]
        let updated: typeof existing

        if (existing) {
          const [row] = await tx
            .update(schemaConfigs)
            .set({ config: input.config, updatedAt: new Date() })
            .where(eq(schemaConfigs.id, existing.id))
            .returning()
          updated = row
        } else {
          const [row] = await tx
            .insert(schemaConfigs)
            .values({ orgId: DEFAULT_ORG_ID, config: input.config })
            .returning()
          updated = row
        }

        await tx.insert(featureEvents).values({
          featureId: `schema:${DEFAULT_ORG_ID}`,
          orgId: DEFAULT_ORG_ID,
          eventType: EventType.SCHEMA_UPDATED,
          changedFields: input.config as Record<string, unknown>,
          actor: 'admin',
        })

        return updated
      })
    }),
})
```

Key points:
- `DEFAULT_ORG_ID = 'default'` — matches the constant in `features.ts` (define locally in `admin.ts`, do not import from features)
- `featureId: 'schema:default'` — sentinel string for org-level events (no FK constraint on `feature_id` column, plain TEXT)
- `changedFields: input.config as Record<string, unknown>` — JSONB column accepts this cast
- Return type from `getActiveSchema` has `config: SchemaConfigContent` always (never raw `unknown` JSONB)
- Use `publicProcedure` throughout — matching MVP auth pattern from all other procedures

---

### Drizzle Import Pattern from `@life-as-code/db`

Check how the existing features.ts imports from db — follow the exact same pattern:
```typescript
import { schemaConfigs, featureEvents, eq, desc } from '@life-as-code/db'
```
Check `packages/db/src/index.ts` or the `@life-as-code/db` exports for the exact available names. The `schemaConfigs` table is exported from `packages/db/src/schema/index.ts` via `export * from './schema-configs'`.

---

### Test Pattern (Following Story 5.1)

Tests go in `packages/db/src/__tests__/schema-config.test.ts` — vitest is only set up in `packages/db`. Run with: `cd packages/db && bun test`.

Example structure:
```typescript
import { describe, expect, it } from 'vitest'
import { SchemaConfigContentSchema, DEFAULT_SCHEMA_CONFIG } from '@life-as-code/validators'

describe('SchemaConfigContentSchema', () => {
  it('validates DEFAULT_SCHEMA_CONFIG', () => {
    expect(SchemaConfigContentSchema.safeParse(DEFAULT_SCHEMA_CONFIG).success).toBe(true)
  })

  it('rejects invalid field type', () => {
    const bad = { ...DEFAULT_SCHEMA_CONFIG, requiredFields: [{ name: 'x', stage: 'problem', type: 'invalid', enabled: true }] }
    expect(SchemaConfigContentSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects missing requiredFields array', () => {
    expect(SchemaConfigContentSchema.safeParse({ standardFields: [], customFields: [] }).success).toBe(false)
  })
})
```

No DB integration tests for the tRPC procedures in this story — vitest is not set up in `packages/api`. Schema validation tests in packages/db are sufficient for Story 6.1's scope.

---

### oxlint Rules (Established in Epic 5)

1. **`type="button"`** on all `<button>` and `<Button>` elements
2. **No `!` non-null assertion** — use optional chaining or `?? fallback`
3. **`void` prefix** on floating Promises — `void queryClient.invalidateQueries(...)`
4. **No async outer mutation callbacks** — use `.then().catch()` pattern
5. **`prefer-dom-node-append`** — use `.append()` not `.appendChild()`
6. **`prefer-dom-node-remove`** — use `.remove()` not `removeChild()`

These apply to any UI work but this story is purely backend — no UI components.

---

### tRPC Naming Conventions

From the architecture naming guide:
- Queries: `get*` (single), `list*` (collection) → `getActiveSchema` ✓
- Mutations: action verb → `updateSchema` ✓
- Router namespace: `features.admin.*` → achieved by `admin: adminRouter` in featuresRouter ✓
- No `is*` or `fetch*` prefixes

---

### What This Story Does NOT Include

- **No Schema Editor UI** — that's Story 6.2
- **No schema change propagation / feature flagging** — that's Story 6.3
- **No dynamic validation integration** into `updateFeatureJson` or `updateStage` — that's Story 6.3
- **No database migration** — `schema_configs` table already exists
- **No authentication/admin-role enforcement** — MVP uses `publicProcedure` (architecture notes this is "post-MVP activation")
- **No templates** — that's Story 6.4

---

### Previous Story Intelligence (Epic 5 Learnings)

1. **`DEFAULT_ORG_ID` pattern**: Define locally as `const DEFAULT_ORG_ID = 'default'` in each router file — do not import/share
2. **Transaction pattern**: `ctx.db.transaction(async (tx) => { ... })` — use `tx` not `ctx.db` inside
3. **`||`/`??` precedence** (TS5076): Always wrap: `(a || b) ?? c` — not `a || b ?? c`
4. **`void` prefix on floating promises**: Required for `invalidateQueries`, clipboard, etc.
5. **oxlint `prefer-dom-node-append`/`prefer-dom-node-remove`**: Use `.append()`/`.remove()` not legacy `appendChild()`/`removeChild()`
6. **No `biome-ignore` for oxlint**: `biome-ignore` comments don't suppress oxlint — fix the actual issue

---

### File Structure for This Story

```
packages/
├── validators/
│   └── src/
│       ├── schema-config.ts        ← CREATE: SchemaConfigContentSchema + DEFAULT_SCHEMA_CONFIG
│       └── index.ts                ← MODIFY: add `export * from './schema-config'`
├── api/
│   └── src/
│       └── routers/
│           ├── admin.ts            ← CREATE: adminRouter (getActiveSchema + updateSchema)
│           └── features.ts         ← MODIFY: add `admin: adminRouter`
└── db/
    └── src/
        └── __tests__/
            └── schema-config.test.ts  ← CREATE: Zod validator tests
```

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 6, Story 6.1 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — tRPC procedure naming, router structure, RBAC-ready procedure tiers, naming conventions]
- [Source: `life-as-code/packages/db/src/schema/schema-configs.ts` — existing `schema_configs` table]
- [Source: `life-as-code/packages/db/src/schema/feature-events.ts` — `featureEvents` table, `eventTypeEnum`]
- [Source: `life-as-code/packages/validators/src/event-types.ts` — `EventType.SCHEMA_UPDATED` already defined]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — existing router structure and tRPC patterns]
- [Source: `life-as-code/packages/api/src/routers/_app.ts` — appRouter structure]
- [Source: `life-as-code/packages/validators/src/lifecycle.ts` — `LIFECYCLE_STAGES` const array]
- [Source: `_bmad-output/implementation-artifacts/5-1-json-read-and-write-trpc-procedures.md` — tRPC procedure implementation patterns, transaction pattern, event insert pattern]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No blocking issues encountered._

### Completion Notes List

- Task 1: `schema-config.ts` was pre-created with correct content. Added missing `export * from './schema-config'` to `index.ts` and rebuilt validators package with `bun run build`.
- Task 2: Created `packages/api/src/routers/admin.ts` with `getActiveSchema` (query with fallback to `DEFAULT_SCHEMA_CONFIG`) and `updateSchema` (transactional upsert + `SCHEMA_UPDATED` event).
- Task 3: Imported `adminRouter` in `features.ts` and wired as `admin: adminRouter` inside `featuresRouter`, exposing `features.admin.getActiveSchema` and `features.admin.updateSchema`.
- Task 4: Created 4 Zod validator tests in `packages/db/src/__tests__/schema-config.test.ts`; all 4 pass.
- Task 5: `bun x tsc --noEmit` → 0 errors; `bunx oxlint --threads 1` → 0 warnings/errors.

### File List

- `life-as-code/packages/validators/src/schema-config.ts` (pre-existing, verified correct)
- `life-as-code/packages/validators/src/index.ts` (modified: added `export * from './schema-config'`)
- `life-as-code/packages/validators/package.json` (modified: added `"./schema-config"` sub-path export entry)
- `life-as-code/packages/validators/dist/` (rebuilt: `bun run build`)
- `life-as-code/packages/api/src/routers/admin.ts` (created)
- `life-as-code/packages/api/src/routers/features.ts` (modified: import + `admin: adminRouter`)
- `life-as-code/packages/db/src/__tests__/schema-config.test.ts` (created)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — adminRouter created, wired into featuresRouter, Zod tests added (4/4 pass), 0 TS errors, 0 lint warnings
- 2026-03-15: Code review pass — added missing validators/package.json to File List (M1)
