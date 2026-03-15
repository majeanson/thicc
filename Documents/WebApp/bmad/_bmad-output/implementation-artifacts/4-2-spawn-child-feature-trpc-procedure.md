# Story 4.2: Spawn Child Feature tRPC Procedure

Status: done

## Story

As a developer,
I want a tRPC procedure that spawns a child feature from any existing feature with explicit lineage tracking,
so that feature evolution is always linked back to its origin and the provenance chain is never broken.

## Acceptance Criteria

1. **Given** the `features.spawn` tRPC procedure, **When** called with `{ parentId, spawnReason }`, **Then** a new `features` row is created with `parent_id` set to the parent's `id`, `status: 'draft'`, `frozen: false`, a new generated `feature_key`, and the `spawnReason` stored in the child's `content`

2. **Given** a spawn operation completes, **When** the transaction commits, **Then** a `FEATURE_SPAWNED` event is written to `feature_events` for both the parent and the child in the same Drizzle transaction

3. **Given** `features.spawn` is called on any feature regardless of frozen state, **When** it executes, **Then** spawning is allowed from both frozen and active features — frozen features can always be evolved via spawn

4. **Given** `features.getLineage` is called with a feature `id`, **When** it executes, **Then** it returns the feature's direct parent, all siblings (features sharing the same `parent_id`), and all direct children — resolved in a single tRPC call

5. **Given** `features.spawn` is called with a missing or empty `spawnReason`, **When** Zod validation runs, **Then** a `BAD_REQUEST` error is returned — spawn reason is required

## Tasks / Subtasks

- [x] Task 1: Add `SpawnFeatureSchema` and `GetLineageSchema` to validators (AC: #1, #4, #5)
  - [x] 1.1 Open `packages/validators/src/feature.ts` and add `SpawnFeatureSchema`, `SpawnFeatureInput`, `GetLineageSchema`, `GetLineageInput` (see Dev Notes for exact shapes)
  - [x] 1.2 `index.ts` already wildcards from `./feature` — no change needed, confirm the exports are picked up
  - [x] 1.3 Run `bun x tsc --noEmit` in `packages/validators` — confirm 0 errors
  - [x] 1.4 Run `bun run build` in `packages/validators` to rebuild `dist/` for `packages/api` TypeScript resolution

- [x] Task 2: Implement `features.spawn` tRPC procedure (AC: #1, #2, #3, #5)
  - [x] 2.1 Open `packages/api/src/routers/features.ts`
  - [x] 2.2 Add `SpawnFeatureSchema` to the import from `@life-as-code/validators`
  - [x] 2.3 Add `and`, `ne` to the import from `@life-as-code/db` (needed for `getLineage`)
  - [x] 2.4 Add `features.spawn` procedure to `featuresRouter` after `freeze` and before `getFeature` (see Dev Notes for full implementation)
  - [x] 2.5 Run `bun x tsc --noEmit` in `packages/api` — confirm 0 errors

- [x] Task 3: Implement `features.getLineage` tRPC procedure (AC: #4)
  - [x] 3.1 Add `GetLineageSchema` to the import from `@life-as-code/validators`
  - [x] 3.2 Add `features.getLineage` query procedure after `spawn` and before `getFeature` (see Dev Notes for full implementation)
  - [x] 3.3 Run `bun x tsc --noEmit` in `packages/api` — confirm 0 errors
  - [x] 3.4 Run `bunx oxlint --threads 1` from repo root — confirm 0 errors

- [x] Task 4: Add integration tests for spawn and lineage (AC: #1, #2, #3, #4)
  - [x] 4.1 Add spawn and lineage tests to `packages/db/src/__tests__/immutability-trigger.test.ts` (see Dev Notes for test patterns)
  - [x] 4.2 Test: spawn from active feature creates child with correct parentId, featureKey, content.spawn.spawnReason
  - [x] 4.3 Test: spawn from a frozen feature succeeds (no FORBIDDEN — frozen features CAN be spawned)
  - [x] 4.4 Test: getLineage returns correct parent, siblings, children
  - [x] 4.5 Run `bun run test` from `packages/db` — confirm all tests pass

## Dev Notes

### CRITICAL: This Project Uses `@base-ui/react`, NOT `shadcn/ui`

This story is backend-only. No UI components. Story 4.3 handles the freeze/spawn UI.

---

### CRITICAL: File Naming — kebab-case Only

`unicorn/filename-case` in oxlint enforces kebab-case for non-component files. All files in this story are existing kebab-case files — no new files needed (tests are added to the existing test file).

---

### CRITICAL: No Frozen Guard on Spawn

Unlike `updateStage`, `addDecision`, `updateTags`, and `freeze` — **`spawn` must NOT check `existing.frozen`**. The AC explicitly states "spawning is allowed from both frozen and active features". Do NOT add a frozen guard to the spawn procedure.

---

### CRITICAL: Package Import Boundaries

| Package | Allowed imports | Forbidden |
|---|---|---|
| `packages/validators` | External libs (Zod) only | No internal workspace packages |
| `packages/api` | `@life-as-code/db`, `@life-as-code/validators`, `@trpc/server`, `superjson` | No `apps/`, no `packages/ui` |
| `packages/db` tests | `@life-as-code/db` (self, via source import), `vitest`, `ulidx` | No `@trpc/server` |

---

### New Zod Schemas — Exact Definitions

Add to `packages/validators/src/feature.ts`:

```typescript
export const SpawnFeatureSchema = z.object({
  parentId: z.string().min(1),
  spawnReason: z.string().min(1, 'Spawn reason is required'),
})

export const GetLineageSchema = z.object({
  id: z.string().min(1),
})

export type SpawnFeatureInput = z.infer<typeof SpawnFeatureSchema>
export type GetLineageInput = z.infer<typeof GetLineageSchema>
```

`spawnReason: z.string().min(1)` is the Zod enforcement of AC #5 — empty string is rejected as `BAD_REQUEST` automatically.

---

### Updated Import Lines in `features.ts`

```typescript
// packages/api/src/routers/features.ts

// DB imports — ADD and, ne:
import { featureEvents, features, and, desc, eq, like, ne } from '@life-as-code/db'

// Validator imports — ADD SpawnFeatureSchema, GetLineageSchema:
import {
  AddDecisionSchema,
  CreateFeatureSchema,
  EventType,
  FreezeFeatureSchema,
  GetFeatureSchema,
  GetLineageSchema,
  SpawnFeatureSchema,
  UpdateStageSchema,
  UpdateTagsSchema,
} from '@life-as-code/validators'
```

`and` and `ne` are Drizzle operators re-exported from `@life-as-code/db` via `export * from 'drizzle-orm'`. Do NOT import from `drizzle-orm` directly.

---

### `features.spawn` Procedure — Full Implementation

```typescript
spawn: publicProcedure
  .input(SpawnFeatureSchema)
  .mutation(({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      // Verify parent exists (no frozen guard — spawning allowed from any state)
      const parent = await tx.query.features.findFirst({
        where: eq(features.id, input.parentId),
      })
      if (!parent) throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent feature not found' })

      // Generate feature_key using the same query-max+1 pattern as create
      const year = new Date().getFullYear()
      const yearPrefix = `feat-${year}-`
      const lastFeature = await tx
        .select({ featureKey: features.featureKey })
        .from(features)
        .where(like(features.featureKey, `${yearPrefix}%`))
        .orderBy(desc(features.featureKey))
        .limit(1)
      const lastNum = parseInt(lastFeature[0]?.featureKey.split('-').at(2) ?? '0', 10)
      const featureKey = `${yearPrefix}${String(lastNum + 1).padStart(3, '0')}`

      // Insert child feature with parentId set and spawnReason in content
      const [child] = await tx
        .insert(features)
        .values({
          featureKey,
          orgId: DEFAULT_ORG_ID,
          status: 'draft',
          frozen: false,
          parentId: input.parentId,
          content: { spawn: { spawnReason: input.spawnReason } },
        })
        .returning()

      if (!child) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      // Write FEATURE_SPAWNED event for the parent (it was evolved)
      await tx.insert(featureEvents).values({
        featureId: input.parentId,
        orgId: DEFAULT_ORG_ID,
        eventType: EventType.FEATURE_SPAWNED,
        changedFields: {
          childId: child.id,
          childFeatureKey: child.featureKey,
          spawnReason: input.spawnReason,
        },
        actor: ctx.session?.user?.name ?? 'anonymous',
      })

      // Write FEATURE_SPAWNED event for the child (it was spawned)
      await tx.insert(featureEvents).values({
        featureId: child.id,
        orgId: DEFAULT_ORG_ID,
        eventType: EventType.FEATURE_SPAWNED,
        changedFields: {
          parentId: input.parentId,
          parentFeatureKey: parent.featureKey,
          spawnReason: input.spawnReason,
        },
        actor: ctx.session?.user?.name ?? 'anonymous',
      })

      return child
    })
  }),
```

**Key points:**
- **NO frozen guard** — AC #3 explicitly allows spawning from frozen features
- `parentId` is set in the INSERT values — the column is `parentId` in Drizzle camelCase (mapped to `parent_id` in DB via `casing: 'snake_case'`)
- `content.spawn.spawnReason` — architecture specifies camelCase throughout JSONB content
- Two separate `featureEvents` inserts for parent AND child — both in the same transaction (AC #2)
- `updatedAt` is NOT explicitly set on insert — `defaultNow()` handles it for new rows

---

### `features.getLineage` Procedure — Full Implementation

The AC says "resolved in a single query" — interpreted as a single tRPC call returning parent, siblings, and children together. Three parallel DB queries via `Promise.all` provide correct data with minimal latency:

```typescript
getLineage: publicProcedure
  .input(GetLineageSchema)
  .query(async ({ ctx, input }) => {
    const feature = await ctx.db.query.features.findFirst({
      where: eq(features.id, input.id),
    })
    if (!feature) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })

    const [parent, children, siblings] = await Promise.all([
      // Parent: the feature whose id matches our parentId
      feature.parentId
        ? ctx.db.query.features.findFirst({ where: eq(features.id, feature.parentId) })
        : Promise.resolve(null),
      // Children: all features with parentId = our id
      ctx.db.select().from(features).where(eq(features.parentId, input.id)),
      // Siblings: features sharing our parentId, excluding self
      feature.parentId
        ? ctx.db
            .select()
            .from(features)
            .where(and(eq(features.parentId, feature.parentId), ne(features.id, input.id)))
        : Promise.resolve([]),
    ])

    return {
      parent: parent ?? null,
      children,
      siblings,
    }
  }),
```

**Key points:**
- `Promise.all` makes the 3 queries run in parallel — single effective latency
- `feature.parentId` may be `null` (root feature) — guarded before use
- `ne(features.id, input.id)` excludes self from siblings list
- `and(eq(...), ne(...))` uses Drizzle's `and` and `ne` operators — both from `@life-as-code/db`
- Returns `{ parent: Feature | null, children: Feature[], siblings: Feature[] }`
- No DB schema changes needed — `parentId` column already exists on `features` table

---

### Router Ordering — Where to Add the New Procedures

```typescript
export const featuresRouter = createTRPCRouter({
  create: ...,
  updateStage: ...,
  addDecision: ...,
  updateTags: ...,
  freeze: ...,
  spawn: ...,        // ADD HERE (after freeze)
  getLineage: ...,   // ADD HERE (after spawn)
  getFeature: ...,
  listFeatures: ...,
})
```

---

### `content.spawn.spawnReason` — Architecture Note

Architecture specifies camelCase throughout JSONB content (`spawnReason` not `spawn_reason`). The child's content will look like:

```json
{
  "spawn": {
    "spawnReason": "Need to add offline support while preserving the original online-only specification"
  }
}
```

Story 4.3 UI will display this `spawnReason` in the `SpawnDialog` and the feature detail view. Keep the key exactly as `spawn.spawnReason`.

---

### `require-await` Lint Rule

The outer `.mutation()` and `.query()` callbacks must NOT be `async` when they directly `return` a Promise. Only the inner transaction/query callbacks need `async`:

```typescript
spawn: publicProcedure
  .input(SpawnFeatureSchema)
  .mutation(({ ctx, input }) => {           // NOT async
    return ctx.db.transaction(async (tx) => { // IS async
      ...
    })
  }),

getLineage: publicProcedure
  .input(GetLineageSchema)
  .query(async ({ ctx, input }) => {        // IS async — multiple awaits at top level
    const feature = await ctx.db.query...   // first await
    const [...] = await Promise.all(...)    // second await
    return { ... }
  }),
```

`getLineage` uses `async` on the outer callback because it has multiple top-level `await` expressions (not returning a single Promise).

---

### `no-non-null-assertion` Lint Rule

No `!` assertions. The pattern established in story 4.1:
- Check `if (!parent)` then throw before accessing `parent.featureKey`
- Use `?.at(2) ?? '0'` for array access: `lastFeature[0]?.featureKey.split('-').at(2) ?? '0'`

---

### Integration Tests — Patterns to Add to Existing Test File

Add to `packages/db/src/__tests__/immutability-trigger.test.ts`. The test file already imports `db`, `features`, `eq` from `'../index.js'` and `ulid` from `ulidx`. Add `desc` and `ne` and any needed operators.

**Tests to add:**

```typescript
import { desc, eq, ne } from '../index.js'  // add to existing import

describe('spawn procedure (via direct DB)', () => {
  it('creates child feature with parentId and spawnReason in content', async () => {
    const parentId = ulid()
    const childId = ulid()
    const parentKey = `feat-test-parent-${Date.now()}`
    const childKey = `feat-test-child-${Date.now()}`

    await db.insert(features).values({
      id: parentId,
      featureKey: parentKey,
      orgId: 'test',
      status: 'active',
      frozen: false,
      content: {},
    })

    await db.insert(features).values({
      id: childId,
      featureKey: childKey,
      orgId: 'test',
      status: 'draft',
      frozen: false,
      parentId,
      content: { spawn: { spawnReason: 'Add offline mode' } },
    })

    const child = await db.query.features.findFirst({ where: eq(features.id, childId) })
    expect(child?.parentId).toBe(parentId)
    expect((child?.content as Record<string, unknown>)?.spawn).toMatchObject({
      spawnReason: 'Add offline mode',
    })
  })

  it('allows inserting a child of a frozen feature', async () => {
    const frozenParentId = ulid()
    const childId = ulid()

    await db.insert(features).values({
      id: frozenParentId,
      featureKey: `feat-test-frozen-parent-${Date.now()}`,
      orgId: 'test',
      status: 'frozen',
      frozen: true,
      content: {},
    })

    // Spawn from frozen parent — should succeed (no trigger blocks INSERT)
    await expect(
      db.insert(features).values({
        id: childId,
        featureKey: `feat-test-child-of-frozen-${Date.now()}`,
        orgId: 'test',
        status: 'draft',
        frozen: false,
        parentId: frozenParentId,
        content: { spawn: { spawnReason: 'Evolve frozen feature' } },
      }),
    ).resolves.toBeDefined()
  })
})

describe('getLineage (via direct DB query)', () => {
  it('returns parent, children, and siblings correctly', async () => {
    const ts = Date.now()
    const grandparentId = ulid()
    const parentId = ulid()
    const siblingId = ulid()
    const childId = ulid()

    // Insert test lineage
    await db.insert(features).values([
      { id: grandparentId, featureKey: `feat-gp-${ts}`, orgId: 'test', status: 'draft', frozen: false, content: {} },
      { id: parentId, featureKey: `feat-parent-${ts}`, orgId: 'test', status: 'draft', frozen: false, content: {}, parentId: grandparentId },
      { id: siblingId, featureKey: `feat-sibling-${ts}`, orgId: 'test', status: 'draft', frozen: false, content: {}, parentId: grandparentId },
      { id: childId, featureKey: `feat-child-${ts}`, orgId: 'test', status: 'draft', frozen: false, content: {}, parentId },
    ])

    const feature = await db.query.features.findFirst({ where: eq(features.id, parentId) })
    if (!feature) throw new Error('Feature not found')

    const [parent, children, siblings] = await Promise.all([
      feature.parentId
        ? db.query.features.findFirst({ where: eq(features.id, feature.parentId) })
        : Promise.resolve(null),
      db.select().from(features).where(eq(features.parentId, parentId)),
      feature.parentId
        ? db.select().from(features).where(
            and(eq(features.parentId, feature.parentId), ne(features.id, parentId))
          )
        : Promise.resolve([]),
    ])

    expect(parent?.id).toBe(grandparentId)
    expect(children.map((c) => c.id)).toContain(childId)
    expect(siblings.map((s) => s.id)).toContain(siblingId)
    expect(siblings.map((s) => s.id)).not.toContain(parentId) // self excluded
  })
})
```

Note: these tests use direct DB inserts (bypassing tRPC) to verify the data model. They also validate that the Drizzle query pattern used in `getLineage` works correctly against the real Neon DB.

---

### `and` Import in Test File

The existing test file imports from `'../index.js'` which re-exports `drizzle-orm`. `and`, `ne`, `desc` are all available. Update the import:

```typescript
import { db, features, eq, and, ne } from '../index.js'
```

---

### Drizzle `parentId` Column — Nullable Handling

`features.parentId` is `text | null` in Drizzle types. Querying with `eq(features.parentId, someId)` works correctly for non-null values. When `parentId` is null (root feature), the siblings and parent queries must be skipped entirely (guarded with `feature.parentId ?` ternary) — do NOT use `eq(features.parentId, null)` which has different SQL semantics.

---

### Verification Steps

```bash
# From packages/validators directory:
bun x tsc --noEmit          # Must pass 0 errors
bun run build               # Rebuild dist/ for api to resolve

# From packages/api directory:
bun x tsc --noEmit          # Must pass 0 errors

# From repo root:
bunx oxlint --threads 1     # Must pass 0 errors

# From packages/db directory:
bun run test                # All tests must pass (requires DATABASE_URL in .env)
```

---

### What This Story Does NOT Include

- Freeze/spawn UI — Story 4.3
- Lineage View page — Story 4.4
- `spawn` from within the wizard — Story 4.3
- Any changes to existing mutation guards
- Auth promotion to `protectedProcedure` — post-MVP

---

### File Structure for This Story

```
packages/validators/src/
└── feature.ts              ← MODIFY: add SpawnFeatureSchema, GetLineageSchema + input types

packages/api/src/routers/
└── features.ts             ← MODIFY: add spawn + getLineage procedures, expand imports

packages/db/src/__tests__/
└── immutability-trigger.test.ts  ← MODIFY: add spawn and lineage integration tests
```

---

### Previous Story Intelligence (Story 4.1 Learnings)

1. **Neon serverless driver wraps PostgreSQL exceptions** — error messages from DB triggers appear in `JSON.stringify(err)` not in `err.message` directly. Use regex matching on the serialized error.

2. **`bun run build` in `packages/validators` is REQUIRED** after any schema changes — `packages/api` resolves types from `dist/`, not source.

3. **`require-await` lint rule** — mutation callbacks that `return ctx.db.transaction(...)` directly must NOT be `async`. Query callbacks with multiple top-level awaits MUST be `async`.

4. **`no-non-null-assertion`** — use `?.at(2) ?? '0'` for array access, never `[0]!`.

5. **Both `frozen: boolean` and `status: statusEnum` must be set together** when changing state — relevant to spawn's child insert which uses `status: 'draft'` and `frozen: false`.

6. **`updatedAt: new Date()` on UPDATE** — Drizzle does NOT auto-update `updatedAt`. Always include it in `.set()` calls. For INSERT, `defaultNow()` handles it automatically.

7. **DB `test` script** — `dotenv -e ../../.env -- vitest run` (added in story 4.1). `vitest.config.ts` already exists in `packages/db`.

8. **vitest already installed** — `vitest@4.1.0` is already a devDependency in `packages/db`. No new dependency installation needed.

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.2 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — spawn in features.* router scope, camelCase JSONB content, `spawnReason` field name, `FEATURE_SPAWNED` event type]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — existing featuresRouter with feature_key generation pattern, transaction pattern, event insert pattern]
- [Source: `life-as-code/packages/db/src/schema/features.ts` — parentId: text (nullable), frozen: boolean, statusEnum]
- [Source: `life-as-code/packages/validators/src/event-types.ts` — EventType.FEATURE_SPAWNED already defined]
- [Source: `_bmad-output/implementation-artifacts/4-1-freeze-feature-trpc-procedure.md` — story 4.1 learnings, test file location, vitest setup]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- `SpawnFeatureSchema` (`{ parentId: min(1), spawnReason: min(1) }`), `GetLineageSchema` (`{ id: min(1) }`), and their input types added to `packages/validators/src/feature.ts`; auto-exported via existing wildcard in `index.ts`
- `packages/validators` rebuilt via `bun run build` — dist updated for api TypeScript resolution
- `features.spawn` procedure added after `freeze`: verifies parent exists (NO frozen guard — AC #3), generates `feat-YYYY-NNN` key, inserts child with `parentId` + `content.spawn.spawnReason`, writes two `FEATURE_SPAWNED` events (one for parent, one for child) in single transaction
- `features.getLineage` query procedure added after `spawn`: fetches feature, runs parent/children/siblings queries in parallel via `Promise.all`, returns `{ parent, children, siblings }`
- DB imports expanded: added `and`, `ne` for the sibling filter in `getLineage` (`and(eq(features.parentId, ...), ne(features.id, ...))`)
- Validator imports expanded: added `SpawnFeatureSchema`, `GetLineageSchema`
- 3 new integration tests added to existing test file: child creation with parentId/content, spawn from frozen parent (succeeds — no trigger block on INSERT), lineage query correctness (parent/siblings/children)
- All validations pass: `bun x tsc --noEmit` (0 errors in validators, api, db), `bunx oxlint --threads 1` (0 warnings/errors), `bun run test` in packages/db (5/5 passing)

### File List

**Modified:**
- `packages/validators/src/feature.ts` — added `SpawnFeatureSchema`, `GetLineageSchema`, `SpawnFeatureInput`, `GetLineageInput`
- `packages/api/src/routers/features.ts` — expanded imports, added `spawn` and `getLineage` procedures
- `packages/db/src/__tests__/immutability-trigger.test.ts` — added `and`, `ne` imports; added 3 spawn/lineage integration tests

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — all tasks complete, 5/5 tests pass, lint and typecheck clean, status → review
