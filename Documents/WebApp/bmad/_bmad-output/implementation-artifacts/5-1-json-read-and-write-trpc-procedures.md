# Story 5.1: JSON Read & Write tRPC Procedures

Status: done

## Story

As a developer,
I want tRPC procedures to fetch and update the raw JSON of a feature with schema validation on every write,
so that JSON edits are validated before hitting the database and no malformed data can enter the system through the raw edit path.

## Acceptance Criteria

1. **Given** `features.getFeatureJson` is called with a valid feature `id`, **When** it executes, **Then** the complete `content` JSONB of the feature is returned as `{ id, featureKey, frozen, content }` where `content` is a pretty-printed JSON string (2-space indent)

2. **Given** `features.updateFeatureJson` is called with a raw JSON string, **When** the input is received, **Then** it is first parsed and validated against `FeatureContentSchema` from `packages/validators` before any DB write; if validation fails, a `BAD_REQUEST` tRPC error is returned with field-level error details (Zod issue path + message per error, joined with `'; '`)

3. **Given** `features.updateFeatureJson` is called on a frozen feature, **When** the API-level immutability check runs, **Then** a `FORBIDDEN` tRPC error is returned before any DB write

4. **Given** a valid JSON update passes Zod validation, **When** `features.updateFeatureJson` writes to the DB, **Then** the `features.content` JSONB is updated and a `FEATURE_UPDATED` event with `changedFields` delta (`{ updatedViaJson: true, changedKeys: string[] }`) is written to `feature_events` in the same Drizzle transaction

5. **Given** JSON save operations, **When** a write completes, **Then** it does so within 500ms (met by existing tRPC + Neon stack — no special optimization needed)

## Tasks / Subtasks

- [x] Task 1: Add schemas/types to `packages/validators/src/feature.ts` (AC: #1, #2)
  - [x] 1.1 Add `GetFeatureJsonSchema = z.object({ id: z.string().min(1) })`
  - [x] 1.2 Add `UpdateFeatureJsonSchema = z.object({ id: z.string().min(1), jsonContent: z.string().min(1) })`
  - [x] 1.3 Add `FeatureContentSchema` — see Dev Notes for full definition
  - [x] 1.4 Export inferred types: `GetFeatureJsonInput`, `UpdateFeatureJsonInput`, `FeatureContent`

- [x] Task 2: Add `getFeatureJson` query to `packages/api/src/routers/features.ts` (AC: #1)
  - [x] 2.1 Import `GetFeatureJsonSchema` (add to existing import line from `@life-as-code/validators`)
  - [x] 2.2 Implement `getFeatureJson`: fetch feature by id → NOT_FOUND if missing → return `{ id, featureKey, frozen, content: JSON.stringify(feature.content, null, 2) }`

- [x] Task 3: Add `updateFeatureJson` mutation to `packages/api/src/routers/features.ts` (AC: #2, #3, #4)
  - [x] 3.1 Import `UpdateFeatureJsonSchema`, `FeatureContentSchema` (add to existing import line)
  - [x] 3.2 Implement `updateFeatureJson` in a `ctx.db.transaction(async (tx) => {...})` block
  - [x] 3.3 Fetch + check: NOT_FOUND if missing, FORBIDDEN if frozen (before JSON parse)
  - [x] 3.4 Parse `input.jsonContent` with `JSON.parse` in try/catch → BAD_REQUEST on parse failure
  - [x] 3.5 `FeatureContentSchema.safeParse(parsed)` → BAD_REQUEST with mapped error message on failure
  - [x] 3.6 Compute `changedKeys` delta by comparing old and new content top-level keys
  - [x] 3.7 `tx.update(features).set({ content: result.data, updatedAt: new Date() })...returning()`
  - [x] 3.8 `tx.insert(featureEvents)` with `eventType: EventType.FEATURE_UPDATED`, `changedFields: { updatedViaJson: true, changedKeys }`
  - [x] 3.9 Return the updated feature row

- [x] Task 4: Rebuild `packages/api` and verify (AC: all)
  - [x] 4.1 `cd packages/api && bun run build` — confirm 0 errors
  - [x] 4.2 `bun x tsc --noEmit` from `apps/nextjs` — confirm 0 errors
  - [x] 4.3 `bunx oxlint --threads 1` from repo root — confirm 0 errors/warnings

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

Architecture docs show `apps/web` but the actual path in this repo is `apps/nextjs`. Always use `apps/nextjs`.

TypeScript check: `bun x tsc --noEmit` from `apps/nextjs`. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: Rebuild `packages/api` After Adding New Procedures

When new tRPC procedures are added to `packages/api/src/routers/features.ts`, the `apps/nextjs` project resolves types from `packages/api/dist/` — **not** from source. Stale dist causes TSC errors like `Property 'getFeatureJson' does not exist`. Always run:

```bash
cd packages/api && bun run build
```

before running `bun x tsc --noEmit` in `apps/nextjs`.

---

### `FeatureContentSchema` — Full Definition

Add to `packages/validators/src/feature.ts`:

```typescript
export const FeatureContentSchema = z
  .object({
    problem: z
      .object({
        problemStatement: z.string().optional(),
        reporterContext: z.string().optional(),
      })
      .passthrough()
      .optional(),
    analysis: z.record(z.string(), z.unknown()).optional(),
    requirements: z.record(z.string(), z.unknown()).optional(),
    design: z.record(z.string(), z.unknown()).optional(),
    implementation: z.record(z.string(), z.unknown()).optional(),
    validation: z.record(z.string(), z.unknown()).optional(),
    documentation: z.record(z.string(), z.unknown()).optional(),
    delivery: z.record(z.string(), z.unknown()).optional(),
    support: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
    spawn: z
      .object({ spawnReason: z.string().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough()
```

`.passthrough()` is used throughout so that unknown keys (custom fields from future Epic 6 schema configuration) survive round-trips without being stripped. This is the "active schema" referenced in the epics — future Epic 6 will make it configurable, but for now it's the built-in content structure.

---

### `GetFeatureJsonSchema` and `UpdateFeatureJsonSchema`

Add to `packages/validators/src/feature.ts`:

```typescript
export const GetFeatureJsonSchema = z.object({
  id: z.string().min(1),
})

export const UpdateFeatureJsonSchema = z.object({
  id: z.string().min(1),
  jsonContent: z.string().min(1),
})

export type GetFeatureJsonInput = z.infer<typeof GetFeatureJsonSchema>
export type UpdateFeatureJsonInput = z.infer<typeof UpdateFeatureJsonSchema>
export type FeatureContent = z.infer<typeof FeatureContentSchema>
```

No changes needed to `packages/validators/src/index.ts` — it already does `export * from './feature'`.

---

### `getFeatureJson` — Full Procedure

```typescript
getFeatureJson: publicProcedure
  .input(GetFeatureJsonSchema)
  .query(async ({ ctx, input }) => {
    const feature = await ctx.db.query.features.findFirst({
      where: eq(features.id, input.id),
    })
    if (!feature) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
    return {
      id: feature.id,
      featureKey: feature.featureKey,
      frozen: feature.frozen,
      content: JSON.stringify(feature.content, null, 2),
    }
  }),
```

Return shape `{ id: string; featureKey: string; frozen: boolean; content: string }`:
- `frozen` — Story 5.2 needs it to decide read-only mode
- `featureKey` — Story 5.2/5.3 need it for export filename (`feat-YYYY-NNN.json`)
- `content` — pretty-printed JSON string, 2-space indent, suitable for CodeMirror display

---

### `updateFeatureJson` — Full Procedure

```typescript
updateFeatureJson: publicProcedure
  .input(UpdateFeatureJsonSchema)
  .mutation(({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      const existing = await tx.query.features.findFirst({
        where: eq(features.id, input.id),
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
      if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Feature is frozen' })

      let parsed: unknown
      try {
        parsed = JSON.parse(input.jsonContent)
      } catch {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid JSON: could not parse input' })
      }

      const result = FeatureContentSchema.safeParse(parsed)
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; '),
        })
      }

      const oldContent = (existing.content ?? {}) as Record<string, unknown>
      const newContent = result.data as Record<string, unknown>
      const changedKeys = Object.keys({ ...oldContent, ...newContent }).filter(
        (k) => JSON.stringify(oldContent[k]) !== JSON.stringify(newContent[k]),
      )

      const [updated] = await tx
        .update(features)
        .set({ content: result.data, updatedAt: new Date() })
        .where(eq(features.id, input.id))
        .returning()

      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      await tx.insert(featureEvents).values({
        featureId: input.id,
        orgId: DEFAULT_ORG_ID,
        eventType: EventType.FEATURE_UPDATED,
        changedFields: { updatedViaJson: true, changedKeys },
        actor: ctx.session?.user?.name ?? 'anonymous',
      })

      return updated
    })
  }),
```

---

### Import Line Update in `features.ts`

Current import:
```typescript
import { AddDecisionSchema, CreateFeatureSchema, EventType, FreezeFeatureSchema, GetFeatureSchema, GetLineageSchema, SpawnFeatureSchema, UpdateStageSchema, UpdateTagsSchema } from '@life-as-code/validators'
```

After adding new schemas:
```typescript
import { AddDecisionSchema, CreateFeatureSchema, EventType, FeatureContentSchema, FreezeFeatureSchema, GetFeatureJsonSchema, GetFeatureSchema, GetLineageSchema, SpawnFeatureSchema, UpdateFeatureJsonSchema, UpdateStageSchema, UpdateTagsSchema } from '@life-as-code/validators'
```

---

### Frozen Check Order

AC #3 explicitly states the frozen check runs before any DB write — and the frozen check in `updateFeatureJson` must also run before the JSON parse (fail fast):

1. `findFirst` — NOT_FOUND check
2. `frozen` check → FORBIDDEN
3. `JSON.parse` — BAD_REQUEST on parse error
4. `FeatureContentSchema.safeParse` — BAD_REQUEST on schema error
5. DB write + event log

This matches the immutability check pattern from architecture:
> "Always check before any DB write — even though the DB trigger also enforces this"

---

### No `!` Non-Null Assertion

Never use `!`. The code uses `if (!updated) throw new TRPCError(...)` instead of `updated!`.

---

### Event Type for JSON Writes

Use `EventType.FEATURE_UPDATED` (not `STAGE_UPDATED`) — this is a whole-content update, not a stage-specific update.

The `changedFields` delta format:
```typescript
{ updatedViaJson: true, changedKeys: ['problem', 'tags'] }
```

`changedKeys` shows which top-level content keys differed between old and new content — useful for the future audit trail UI (Story 7.3).

---

### No New DB Schema Changes

This story adds no new tables, columns, or migrations. The existing `features` table with `content JSONB` and `feature_events` table are sufficient.

---

### File Structure for This Story

```
packages/validators/src/
└── feature.ts          ← MODIFY: add GetFeatureJsonSchema, UpdateFeatureJsonSchema, FeatureContentSchema + types

packages/api/src/routers/
└── features.ts         ← MODIFY: add getFeatureJson query + updateFeatureJson mutation

apps/nextjs/            ← NO CHANGES (procedures only — UI comes in Stories 5.2 and 5.3)
```

---

### What This Story Does NOT Include

- Any UI component — that's Story 5.2 (JsonEditor) and Story 5.3 (mode switching)
- CodeMirror integration — Story 5.2
- Copy/Export JSON actions — Story 5.3
- Validation status bar — Story 5.2
- Schema configuration (making the schema admin-configurable) — Epic 6

---

### Previous Story Intelligence (Epic 4 Learnings)

1. **Rebuild `packages/api` before TSC** — adding new procedures requires `cd packages/api && bun run build` or TSC will fail with "Property does not exist" on the new procedure names.

2. **`bun x tsc --noEmit` from `apps/nextjs`** — not from repo root (OOM with turbo on Windows).

3. **`bunx oxlint --threads 1`** — from repo root.

4. **`type="button"` on all buttons** — oxlint enforces (no new buttons in this story, but keep in mind).

5. **No `async` on outer mutation/query callbacks** — use `return ctx.db.transaction(async (tx) => {...})` not `async ({ ctx, input }) => { return await ... }` on the outer function.

6. **`no-non-null-assertion`** — no `!` anywhere. Use `if (!x) throw ...` guard.

7. **`useQuery` pattern for client** — `useQuery(trpc.features.getFeatureJson.queryOptions({ id }))` when consumed in Story 5.2.

8. **`listFeatures` invalidation** — `updateFeatureJson` modifies feature content; invalidate both `getFeature` + `listFeatures` + `getFeatureJson` in client's onSuccess if this mutation is used from a client component.

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.1 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — tRPC procedure patterns, immutability check pattern, feature_events write pattern, error format]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — existing procedure patterns (freeze, spawn, updateStage)]
- [Source: `life-as-code/packages/validators/src/feature.ts` — existing schema definitions to extend]
- [Source: `life-as-code/packages/validators/src/event-types.ts` — EventType.FEATURE_UPDATED]
- [Source: `_bmad-output/implementation-artifacts/4-4-feature-lineage-view.md` — learnings: rebuild packages/api, TSC/lint commands]
- [Source: `_bmad-output/implementation-artifacts/4-1-freeze-feature-trpc-procedure.md` — tRPC procedure pattern with transaction + event log]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Rebuilt `packages/validators` dist before test run — `FeatureContentSchema` was undefined in tests because validators dist was stale. Fixed by running `bun run build` in `packages/validators`.

### Completion Notes List

- Added `GetFeatureJsonSchema`, `UpdateFeatureJsonSchema`, `FeatureContentSchema` to `packages/validators/src/feature.ts`. Schema uses `.passthrough()` at top level and on nested objects to allow future Epic 6 custom fields without stripping.
- Added `GetFeatureJsonInput`, `UpdateFeatureJsonInput`, `FeatureContent` type exports.
- Added `getFeatureJson` query: NOT_FOUND guard, returns `{ id, featureKey, frozen, content }` where content is `JSON.stringify(feature.content, null, 2)`.
- Added `updateFeatureJson` mutation: frozen check → JSON.parse try/catch → `FeatureContentSchema.safeParse` → changedKeys delta → `tx.update` + `tx.insert(featureEvents, FEATURE_UPDATED)` in a single transaction.
- Rebuilt `packages/validators` → rebuilt `packages/api` → `tsc --noEmit` 0 errors → `oxlint` 0 warnings.
- Added 8 new tests to `packages/db/src/__tests__/immutability-trigger.test.ts`: 5 `FeatureContentSchema` unit tests (valid/empty/passthrough/invalid-tags/spawn) + 3 DB integration tests (get serialisation, update+event-log transaction, frozen-blocked). All 13 tests pass (8 existing + 5 new schema + 3 new DB = 13 total).

### File List

- `packages/validators/src/feature.ts` (modified)
- `packages/api/src/routers/features.ts` (modified)
- `packages/db/src/__tests__/immutability-trigger.test.ts` (modified)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — all 4 tasks complete, 13/13 tests pass, status → review
