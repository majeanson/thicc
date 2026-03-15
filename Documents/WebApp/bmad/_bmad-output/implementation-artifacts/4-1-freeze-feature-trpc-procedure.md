# Story 4.1: Freeze Feature tRPC Procedure

Status: done

## Story

As a developer,
I want a tRPC procedure that freezes a feature with defense-in-depth enforcement at both the API and database layers,
so that frozen features are permanently immutable through every interface and no code path can bypass this guarantee.

## Acceptance Criteria

1. **Given** the `features.freeze` tRPC procedure, **When** called with a valid feature `id`, **Then** the feature's `frozen` field is set to `true`, `status` is set to `'frozen'`, and a `FEATURE_FROZEN` event is written to `feature_events` in the same Drizzle transaction

2. **Given** a feature is already frozen, **When** `features.freeze` is called on it again, **Then** a `BAD_REQUEST` tRPC error is returned with message "Feature is already frozen"

3. **Given** the API-level immutability check, **When** any mutation procedure (`updateStage`, `addDecision`, `updateTags`) is called on a frozen feature, **Then** the procedure returns a `FORBIDDEN` tRPC error before touching the database — providing clean typed error feedback to the client

4. **Given** the DB-level immutability trigger (established in Story 1.2), **When** a direct SQL UPDATE is attempted on a frozen feature row, **Then** the PostgreSQL trigger raises an exception blocking the write — verifiable via Vitest integration test

5. **Given** both immutability layers, **When** the API check is bypassed and a write reaches the DB, **Then** the DB trigger acts as the hard stop — confirmed via a test that bypasses the API layer directly

## Tasks / Subtasks

- [x] Task 1: Add `FreezeFeatureSchema` to validators (AC: #1, #2)
  - [x] 1.1 Open `packages/validators/src/feature.ts` and add `FreezeFeatureSchema` and `FreezeFeatureInput` type (see Dev Notes for exact shape)
  - [x] 1.2 Update `packages/validators/src/index.ts` to re-export `FreezeFeatureSchema` and `FreezeFeatureInput` from `./feature` (they should be added to the existing export, not as a new line if it already wildcards)
  - [x] 1.3 Run `bun x tsc --noEmit` in `packages/validators` — confirm 0 errors

- [x] Task 2: Implement `features.freeze` tRPC procedure (AC: #1, #2)
  - [x] 2.1 Open `packages/api/src/routers/features.ts`
  - [x] 2.2 Add `FreezeFeatureSchema` to the import from `@life-as-code/validators`
  - [x] 2.3 Add `features.freeze` procedure to `featuresRouter` (see Dev Notes for full implementation)
  - [x] 2.4 Run `bun x tsc --noEmit` in `packages/api` — confirm 0 errors
  - [x] 2.5 Run `bunx oxlint --threads 1` from repo root — confirm 0 errors

- [x] Task 3: Verify API-layer frozen guard on existing procedures (AC: #3)
  - [x] 3.1 Read `packages/api/src/routers/features.ts` — confirm `updateStage`, `addDecision`, and `updateTags` all include the `if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Feature is frozen' })` guard before any DB write
  - [x] 3.2 If any guard is missing, add it following the existing pattern
  - [x] 3.3 This is verification only — AC #3 is already satisfied by the existing router implementation

- [x] Task 4: Write Vitest integration test for DB-level trigger (AC: #4, #5)
  - [x] 4.1 Create `packages/db/src/__tests__/immutability-trigger.test.ts` (see Dev Notes for test pattern)
  - [x] 4.2 Test bypasses tRPC entirely — uses the Drizzle `db` client directly to insert a frozen feature then attempt a raw UPDATE
  - [x] 4.3 Assert that the UPDATE throws with the trigger exception message "Cannot modify a frozen feature"
  - [x] 4.4 Run `bun test` from `packages/db` to confirm tests pass (requires `DATABASE_URL` env var pointing to a real Neon/Postgres DB)

## Dev Notes

### CRITICAL: This Project Uses `@base-ui/react`, NOT `shadcn/ui`

This story is backend-only. No UI components. Story 4.3 handles the freeze/spawn UI.

---

### CRITICAL: File Naming — kebab-case Only

`unicorn/filename-case` in oxlint enforces kebab-case for non-component files. Files created/modified in this story:
- `packages/validators/src/feature.ts` (MODIFY — add FreezeFeatureSchema) ✓
- `packages/api/src/routers/features.ts` (MODIFY — add freeze procedure) ✓
- `packages/db/src/__tests__/immutability-trigger.test.ts` (CREATE) ✓

---

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

This story only touches `packages/api`, `packages/validators`, and `packages/db`. No `apps/` files.

---

### CRITICAL: Package Import Boundaries

| Package | Allowed imports | Forbidden |
|---|---|---|
| `packages/validators` | External libs (Zod) only | No internal workspace packages |
| `packages/api` | `@life-as-code/db`, `@life-as-code/validators`, `@trpc/server`, `superjson` | No `apps/`, no `packages/ui` |
| `packages/db` tests | `@life-as-code/db` (self), `vitest` | No `@trpc/server` in DB tests |

---

### `FreezeFeatureSchema` — Exact Definition

Add to `packages/validators/src/feature.ts`:

```typescript
export const FreezeFeatureSchema = z.object({
  id: z.string().min(1),
})

export type FreezeFeatureInput = z.infer<typeof FreezeFeatureSchema>
```

The schema is intentionally minimal — `id` is the only required field. No reason field needed for freeze (spawn is where reason is required, Story 4.2).

---

### `features.freeze` Procedure — Full Implementation

```typescript
freeze: publicProcedure
  .input(FreezeFeatureSchema)
  .mutation(({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      const existing = await tx.query.features.findFirst({
        where: eq(features.id, input.id),
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
      if (existing.frozen) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Feature is already frozen' })

      const [updated] = await tx
        .update(features)
        .set({ frozen: true, status: 'frozen', updatedAt: new Date() })
        .where(eq(features.id, input.id))
        .returning()

      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      await tx.insert(featureEvents).values({
        featureId: input.id,
        orgId: DEFAULT_ORG_ID,
        eventType: EventType.FEATURE_FROZEN,
        changedFields: { frozen: true, status: 'frozen' },
        actor: ctx.session?.user?.name ?? 'anonymous',
      })

      return updated
    })
  }),
```

**Key differences from other mutations:**
- Returns `BAD_REQUEST` for already-frozen (not `FORBIDDEN`) — this is intentional per the AC. `FORBIDDEN` is reserved for "you cannot do this to a frozen feature" (editing). `BAD_REQUEST` means "this request doesn't make sense" (freezing a frozen feature).
- Sets both `frozen: true` AND `status: 'frozen'` in the same `.set()` call
- Uses `EventType.FEATURE_FROZEN` (already exists in validators `event-types.ts`)
- Always include `updatedAt: new Date()` — Drizzle does NOT auto-update this on `.update()`

---

### Updated `features.ts` Import Line

```typescript
// packages/api/src/routers/features.ts — MODIFY the import:
import {
  AddDecisionSchema,
  CreateFeatureSchema,
  EventType,
  FreezeFeatureSchema,  // ADD THIS
  GetFeatureSchema,
  UpdateStageSchema,
  UpdateTagsSchema,
} from '@life-as-code/validators'
```

---

### Existing API-Layer Frozen Guard (AC #3 — Already Implemented)

The following procedures already have the guard — no changes needed:

```typescript
// In updateStage, addDecision, updateTags (all already have this):
if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Feature is frozen' })
```

Task 3 is verification only. Just read the file and confirm the guards exist.

---

### DB-Level Immutability Trigger — Already In Place (Story 1.2)

The PostgreSQL trigger was established in Story 1.2. It lives in:
- `packages/db/src/triggers/immutability.sql` (source)
- `packages/db/drizzle/0000_wide_zzzax.sql` (embedded in migration, already applied)

The trigger:
```sql
CREATE OR REPLACE FUNCTION prevent_frozen_feature_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.frozen = true THEN
    RAISE EXCEPTION 'Cannot modify a frozen feature (id: %)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_feature_immutability
  BEFORE UPDATE OR DELETE ON features
  FOR EACH ROW
  EXECUTE FUNCTION prevent_frozen_feature_mutation();
```

**Critical:** The trigger checks `OLD.frozen = true`, meaning it fires on rows that are ALREADY frozen. The `features.freeze` procedure itself (setting `frozen = false → true`) is NOT blocked — `OLD.frozen` is `false` at that point.

---

### Vitest Integration Test — Pattern for DB-Level Trigger Verification

```typescript
// packages/db/src/__tests__/immutability-trigger.test.ts
import { describe, expect, it } from 'vitest'
import { db, features, eq } from '@life-as-code/db'
import { ulid } from 'ulidx'

describe('immutability trigger', () => {
  it('blocks UPDATE on a frozen feature row', async () => {
    const id = ulid()
    const featureKey = `feat-test-${Date.now()}`

    // Insert a frozen feature directly
    await db.insert(features).values({
      id,
      featureKey,
      orgId: 'default',
      status: 'frozen',
      frozen: true,
      content: {},
    })

    // Attempt to UPDATE a frozen row — trigger should block it
    await expect(
      db.update(features)
        .set({ content: { modified: true } })
        .where(eq(features.id, id))
    ).rejects.toThrow('Cannot modify a frozen feature')

    // Cleanup
    // Note: DELETE also blocked by trigger — can't clean up easily.
    // Use a test-specific org_id and truncate table between test runs,
    // OR accept that test rows persist (dev DB only, not prod).
  })
})
```

**Important notes on integration tests:**
- Requires `DATABASE_URL` env var pointing to a real PostgreSQL/Neon DB
- Tests should NOT run in CI unless `DATABASE_URL` is configured — use `dotenv` or a `.env.test` file
- If `DATABASE_URL` is unavailable, skip Task 4 and leave it noted as a manual verification step
- The `DELETE` after the test will also be blocked by the trigger (trigger also covers DELETE). Either accept the leftover row in dev DB, or use a separate test database.
- Consider using `status: 'frozen'` with a recognizable `featureKey` pattern (`feat-test-*`) for easy manual cleanup

---

### `require-await` Lint Rule

Like other procedures, the outer `.mutation()` callback does NOT need `async` — it directly `return`s the `ctx.db.transaction(...)` Promise. Only the inner transaction callback is `async`. Pattern:

```typescript
freeze: publicProcedure
  .input(FreezeFeatureSchema)
  .mutation(({ ctx, input }) => {          // NOT async — returns the transaction Promise directly
    return ctx.db.transaction(async (tx) => {  // IS async — contains multiple awaits
      ...
    })
  }),
```

---

### `no-non-null-assertion` Lint Rule

Do NOT use `!` assertions. The `existing` check (`if (!existing)`) before accessing properties handles nullability. The pattern:

```typescript
// Wrong:
const id = existing!.id

// Correct:
if (!existing) throw new TRPCError(...)
const id = existing.id  // TypeScript narrowed — safe
```

---

### What `status: 'frozen'` Means vs `frozen: boolean`

Both fields coexist by design (architecture decision):
- `frozen: boolean` — the authoritative immutability flag, checked by the trigger and all mutation guards
- `status: statusEnum` — the lifecycle display state (`'active' | 'draft' | 'frozen'`)

When freezing, set BOTH fields atomically. They must stay in sync. `frozen: true` without `status: 'frozen'` would be a data inconsistency. Story 4.3 (UI) will show the frozen state badge from the `status` field.

---

### Existing Router Structure — Where to Add `freeze`

Insert `freeze` after `updateTags` and before `getFeature` to maintain a logical order: mutations first, then queries.

```typescript
export const featuresRouter = createTRPCRouter({
  create: ...,
  updateStage: ...,
  addDecision: ...,
  updateTags: ...,
  freeze: ...,        // ADD HERE
  getFeature: ...,
  listFeatures: ...,
})
```

---

### Verification Steps

```bash
# From packages/validators directory:
bun x tsc --noEmit          # Must pass 0 errors

# From packages/api directory:
bun x tsc --noEmit          # Must pass 0 errors

# From repo root:
bunx oxlint --threads 1     # Must pass 0 errors (Windows workaround for OOM)

# Integration test (requires DATABASE_URL):
# From packages/db:
bun test                    # Only if DATABASE_URL is configured
```

---

### What This Story Does NOT Include

- Freeze UI button/dialog — Story 4.3
- Spawn child feature procedure — Story 4.2
- Lineage view — Story 4.4
- Any changes to existing mutation guards (they already have `FORBIDDEN` checks — Story 4.1 is additive only)
- Auth promotion to `protectedProcedure` — post-MVP

---

### File Structure for This Story

```
packages/validators/src/
└── feature.ts              ← MODIFY: add FreezeFeatureSchema + FreezeFeatureInput

packages/api/src/routers/
└── features.ts             ← MODIFY: import FreezeFeatureSchema, add freeze procedure

packages/db/src/__tests__/
└── immutability-trigger.test.ts  ← CREATE: Vitest integration test for DB trigger
```

---

### Previous Story Intelligence (Epic 3 / Story 3-5 Learnings)

1. **Windows build OOM pattern**: `bun x tsc --noEmit` directly in each package directory, NOT via turbo. `bunx oxlint --threads 1` from root. `bun run build` segfaults on Windows post-processing (known Bun bug) — code is fine.

2. **`updatedAt` must be set explicitly** — Drizzle does NOT auto-update `updatedAt` on `.update()`. Always include `updatedAt: new Date()` in `.set({})`.

3. **Drizzle import pattern** — All imports come from `@life-as-code/db`, never directly from `drizzle-orm` in router files:
   ```typescript
   import { features, featureEvents, eq, desc, like } from '@life-as-code/db'
   ```

4. **`ctx.db` is the Drizzle client** — injected via tRPC context (`packages/api/src/trpc.ts`). Use `ctx.db.transaction(...)` for mutations, `ctx.db.query.features.findFirst(...)` for typed queries.

5. **SuperJSON transformer** — `Date` objects serialize correctly through tRPC. No ISO string conversion needed.

6. **`packages/validators` must be rebuilt after changes** — run `bun run build` in `packages/validators` after adding new schema exports so `packages/api` TypeScript resolution finds the updated `dist/`.

7. **kebab-case filenames mandatory** — `unicorn/filename-case` oxlint rule. All new files in this story follow the pattern.

8. **`EventType.FEATURE_FROZEN` already exists** — it's defined in `packages/validators/src/event-types.ts` and re-exported through `packages/validators/src/index.ts`. No changes to event-types needed.

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.1 — Full BDD acceptance criteria]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — existing featuresRouter, all 6 current procedures, frozen guard pattern]
- [Source: `life-as-code/packages/db/src/schema/features.ts` — frozen: boolean, status: statusEnum, parentId, Feature type]
- [Source: `life-as-code/packages/validators/src/event-types.ts` — EventType.FEATURE_FROZEN already defined]
- [Source: `_bmad-output/implementation-artifacts/1-2-core-database-schema.md` — immutability trigger SQL, trigger file locations, migration embedding]
- [Source: `_bmad-output/implementation-artifacts/2-1-feature-crud-trpc-procedures.md` — tRPC patterns, transaction pattern, lint rules]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- `FreezeFeatureSchema` (`{ id: z.string().min(1) }`) and `FreezeFeatureInput` type added to `packages/validators/src/feature.ts`; re-exported via existing wildcard in `index.ts`
- `packages/validators` rebuilt via `bun run build` so `packages/api` TypeScript resolution picks up new export
- `features.freeze` procedure added to `featuresRouter` between `updateTags` and `getFeature`: fetches feature, returns `BAD_REQUEST` if already frozen, atomically sets `frozen=true` + `status='frozen'` + `updatedAt=new Date()`, writes `FEATURE_FROZEN` event in same transaction
- API-layer frozen guards verified: `updateStage`, `addDecision`, `updateTags` all have `FORBIDDEN` guard — no changes needed
- DB-level trigger verified via Vitest integration test against real Neon DB (DATABASE_URL configured in .env)
- Added `vitest@4.1.0` as devDependency to `packages/db`; added `vitest.config.ts` and `"test": "dotenv -e ../../.env -- vitest run"` script
- Integration test: 2 passing — (1) freeze succeeds when `frozen=false` (trigger passes), (2) UPDATE blocked when `frozen=true` (trigger fires, error thrown, serialized error contains "frozen")
- Neon serverless driver wraps PostgreSQL exception as "Failed query: ..." so trigger message assertion uses `JSON.stringify(err)` + `/frozen|Cannot modify/i` regex instead of `.toThrow()` string match
- All validations pass: `bun x tsc --noEmit` (0 errors in validators, api, db), `bunx oxlint --threads 1` (0 warnings, 0 errors), `bun run test` in packages/db (2/2 passing)

### File List

**Modified:**
- `packages/validators/src/feature.ts` — added `FreezeFeatureSchema` + `FreezeFeatureInput`
- `packages/api/src/routers/features.ts` — imported `FreezeFeatureSchema`, added `freeze` procedure
- `packages/db/package.json` — added `vitest@^4.1.0` devDependency, added `test` script
- `bun.lock` — updated lockfile after vitest added to packages/db

**Created:**
- `packages/db/vitest.config.ts` — vitest config (node environment)
- `packages/db/src/__tests__/immutability-trigger.test.ts` — 2 integration tests for DB trigger

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — all tasks complete, lint and typecheck pass, integration tests pass (2/2), status → review
