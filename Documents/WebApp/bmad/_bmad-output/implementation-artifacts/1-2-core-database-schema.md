# Story 1.2: Core Database Schema

Status: done

## Story

As a developer,
I want the core database tables created and migrated in Neon,
so that feature data can be persisted and the append-only audit trail infrastructure is in place from day one.

## Acceptance Criteria

1. **Given** Drizzle ORM is configured with a Neon connection string, **When** `bun db:migrate` is run, **Then** the `features` table is created with all required columns: `id` (ULID), `feature_key` (VARCHAR, feat-YYYY-NNN format), `org_id` (UUID), `status` (ENUM: active/draft/frozen), `frozen` (BOOLEAN default false), `parent_id` (ULID nullable), `content` (JSONB), `created_at`, `updated_at`

2. **Given** the migration runs, **When** it completes, **Then** the `feature_events` table is created with: `id` (ULID), `feature_id` (ULID), `org_id` (UUID), `event_type` (ENUM: FEATURE_CREATED, FEATURE_UPDATED, FEATURE_FROZEN, FEATURE_SPAWNED, STAGE_UPDATED, ANNOTATION_ADDED, SCHEMA_UPDATED), `changed_fields` (JSONB), `actor` (VARCHAR), `created_at`

3. **Given** the features table exists, **When** the immutability trigger migration runs, **Then** attempting to UPDATE or DELETE any `features` row where `frozen = true` raises a database exception and the operation is blocked at the DB level — verifiable via direct SQL test

4. **Given** the features table exists, **When** a tsvector generated column with GIN index and a pg_trgm index are applied across JSONB text content, **Then** `EXPLAIN ANALYZE` on a full-text search query confirms the GIN index is used

5. **Given** the schema is defined in Drizzle, **When** TypeScript types are inferred from the schema, **Then** all table types are correctly generated with no `any` types and column types map accurately to the schema definitions

## Tasks / Subtasks

- [x] Task 1: Restructure `packages/db/src/` to sharded schema layout (AC: #5)
  - [x] 1.1 Create `packages/db/src/schema/` directory
  - [x] 1.2 Move existing NextAuth tables from `schema.ts` into `packages/db/src/schema/auth.ts` (keep them — do NOT delete)
  - [x] 1.3 Create `packages/db/src/schema/index.ts` that re-exports all tables from all schema files
  - [x] 1.4 Update `drizzle.config.ts`: change `schema: './src/schema.ts'` → `schema: './src/schema/index.ts'`
  - [x] 1.5 Update `packages/db/src/index.ts` imports to use `./schema` instead of `./schema.ts`
  - [x] 1.6 Delete the old `packages/db/src/schema.ts` flat file
  - [x] 1.7 Run `bun typecheck` to confirm no type errors introduced

- [x] Task 2: Create `features` table schema (AC: #1, #4, #5)
  - [x] 2.1 Create `packages/db/src/schema/features.ts`
  - [x] 2.2 Define `statusEnum` pgEnum: `('active', 'draft', 'frozen')`
  - [x] 2.3 Define `features` table with all required columns (see Dev Notes for exact Drizzle definition)
  - [x] 2.4 Add `tsvector` generated column `contentSearch` for full-text search across JSONB content (via raw SQL in migration)
  - [x] 2.5 Add GIN index on `contentSearch` column
  - [x] 2.6 Add `pg_trgm` index on `featureKey` for partial match support
  - [x] 2.7 Export `features` and `statusEnum` from `schema/index.ts`

- [x] Task 3: Create `feature_events` table schema (AC: #2, #5)
  - [x] 3.1 Create `packages/db/src/schema/feature-events.ts`
  - [x] 3.2 Define `eventTypeEnum` pgEnum with all 7 values (see Dev Notes)
  - [x] 3.3 Define `featureEvents` table with all required columns (see Dev Notes for exact Drizzle definition)
  - [x] 3.4 Export `featureEvents` and `eventTypeEnum` from `schema/index.ts`

- [x] Task 4: Create `schema_configs` table (AC: #5)
  - [x] 4.1 Create `packages/db/src/schema/schema-configs.ts`
  - [x] 4.2 Define minimal `schemaConfigs` table: `id` (ULID PK), `orgId` (text), `config` (JSONB), `createdAt`, `updatedAt`
  - [x] 4.3 Export from `schema/index.ts`

- [x] Task 5: Create immutability trigger (AC: #3)
  - [x] 5.1 Create `packages/db/src/triggers/` directory
  - [x] 5.2 Create `packages/db/src/triggers/immutability.sql` with the PostgreSQL trigger function and trigger
  - [x] 5.3 Embedded trigger SQL into migration file `drizzle/0000_wide_zzzax.sql`

- [x] Task 6: Run migrations against Neon (AC: #1, #2, #3, #4)
  - [x] 6.1 Ensure root `.env` has correct `DATABASE_URL` (already set from Story 1.1)
  - [x] 6.2 Run `bun db:generate` from root to generate SQL migration files
  - [x] 6.3 Inspect generated SQL in `packages/db/drizzle/` — verified all tables and indexes correct
  - [x] 6.4 Embed the trigger SQL from `triggers/immutability.sql` into the migration
  - [x] 6.5 Run `bun db:migrate` — applied successfully to Neon
  - [x] 6.6 Migration output confirmed all tables created (8 tables total)

- [x] Task 7: Export `EventType` enum to `packages/validators` (AC: #5)
  - [x] 7.1 Created `packages/validators/src/index.ts` with `EventType` const and `EventTypeValue` type
  - [x] 7.2 Single source of truth for event type strings

- [x] Task 8: Verify `bun typecheck` passes (AC: #5)
  - [x] 8.1 All packages typecheck individually with zero errors
  - [x] 8.2 Fixed pre-existing TS2322 in `packages/api/src/trpc.ts` (unrelated to schema changes)
  - [x] 8.3 `typeof features.$inferSelect` and `typeof featureEvents.$inferSelect` produce fully typed results with no `any`

## Dev Notes

### CRITICAL: Existing Scaffold State

The Yuki-Stack scaffold created a **flat `packages/db/src/schema.ts`** file with NextAuth tables. The architecture requires a **sharded `schema/` directory**. This task restructures it.

**Current state:**
```
packages/db/src/
├── index.ts      ← DB client (keep, minor import update needed)
└── schema.ts     ← flat file with auth tables (split and delete)
```

**Target state:**
```
packages/db/src/
├── index.ts
├── schema/
│   ├── index.ts           ← re-exports everything
│   ├── auth.ts            ← moved NextAuth tables (unchanged)
│   ├── features.ts        ← NEW
│   ├── feature-events.ts  ← NEW
│   └── schema-configs.ts  ← NEW
└── triggers/
    └── immutability.sql   ← NEW
```

Do NOT remove the NextAuth tables — `packages/auth` depends on them via `@auth/drizzle-adapter`.

---

### DB Client — Already Configured

`packages/db/src/index.ts` uses `@neondatabase/serverless` with Pool + `drizzle({ client, casing: 'snake_case' })`. The `casing: 'snake_case'` config means:
- TypeScript: `camelCase` (`featureId`, `orgId`, `createdAt`)
- SQL/DB: `snake_case` (`feature_id`, `org_id`, `created_at`)

**Do NOT manually specify column names in `.ts()` calls** — the casing is auto-handled.

---

### `features` Table — Exact Drizzle Definition

```typescript
// packages/db/src/schema/features.ts
import { pgTable, pgEnum, text, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core'

export const statusEnum = pgEnum('status', ['active', 'draft', 'frozen'])

export const features = pgTable(
  'features',
  (t) => ({
    id: t.text('id').primaryKey().$defaultFn(() => generateUlid()),
    featureKey: t.text('feature_key').notNull().unique(),  // e.g. feat-2026-001
    orgId: t.text('org_id').notNull(),
    status: statusEnum('status').notNull().default('draft'),
    frozen: t.boolean('frozen').notNull().default(false),
    parentId: t.text('parent_id'),                        // nullable ULID ref
    content: t.jsonb('content').notNull().default({}),
    // tsvector generated column for full-text search
    contentSearch: t
      .text('content_search')
      .generatedAlwaysAs(
        `to_tsvector('english', coalesce(content::text, ''))`,
        { mode: 'stored' }
      ),
    createdAt: t.timestamp('created_at').notNull().defaultNow(),
    updatedAt: t.timestamp('updated_at').notNull().defaultNow(),
  }),
  (table) => [
    index('idx_features_fts').on(table.contentSearch).using('gin'),
    index('idx_features_org_id').on(table.orgId),
    index('idx_features_trgm').on(table.featureKey),  // pg_trgm via raw SQL in migration
  ],
)
```

**ULID generation:** The scaffold uses `crypto.randomUUID()` for auth tables. For features use the same pattern or install `ulidx`. Check if `ulidx` is already in deps; if not use `crypto.randomUUID()` as a fallback for now (Story 1.2 just needs the table created — ULID format enforcement comes when procedures are built in Epic 2).

**Note on `generatedAlwaysAs`:** Drizzle supports this for PostgreSQL generated columns. The exact syntax may vary by Drizzle version — verify against installed version (`tsdown` config uses latest). If `generatedAlwaysAs` is not available, add the GIN index via raw SQL in the migration file instead.

---

### `feature_events` Table — Exact Drizzle Definition

```typescript
// packages/db/src/schema/feature-events.ts
import { pgTable, pgEnum, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'

export const eventTypeEnum = pgEnum('event_type', [
  'FEATURE_CREATED',
  'FEATURE_UPDATED',
  'FEATURE_FROZEN',
  'FEATURE_SPAWNED',
  'STAGE_UPDATED',
  'ANNOTATION_ADDED',
  'SCHEMA_UPDATED',
])

export const featureEvents = pgTable(
  'feature_events',
  (t) => ({
    id: t.text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    featureId: t.text('feature_id').notNull(),
    orgId: t.text('org_id').notNull(),
    eventType: eventTypeEnum('event_type').notNull(),
    changedFields: t.jsonb('changed_fields').notNull().default({}),
    actor: t.text('actor').notNull(),
    createdAt: t.timestamp('created_at').notNull().defaultNow(),
  }),
  (table) => [
    index('idx_feature_events_feature_id').on(table.featureId),
    index('idx_feature_events_org_id').on(table.orgId),
  ],
)
```

`feature_events` is **append-only** — no `updatedAt`, no `UPDATE`/`DELETE` ever. Keep it that way.

---

### Immutability Trigger SQL

```sql
-- packages/db/src/triggers/immutability.sql
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

This goes into a migration file. After running `bun db:generate`, open the generated migration SQL and append this trigger SQL at the end, then run `bun db:migrate`.

---

### `schema_configs` Table — Minimal for Now

Story 6 builds out admin schema features. For now, just stub the table so it exists:

```typescript
// packages/db/src/schema/schema-configs.ts
import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const schemaConfigs = pgTable('schema_configs', (t) => ({
  id: t.text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: t.text('org_id').notNull(),
  config: t.jsonb('config').notNull().default({}),
  createdAt: t.timestamp('created_at').notNull().defaultNow(),
  updatedAt: t.timestamp('updated_at').notNull().defaultNow(),
}))
```

---

### `EventType` Export in `packages/validators`

```typescript
// packages/validators/src/index.ts (add or create)
export const EventType = {
  FEATURE_CREATED: 'FEATURE_CREATED',
  FEATURE_UPDATED: 'FEATURE_UPDATED',
  FEATURE_FROZEN: 'FEATURE_FROZEN',
  FEATURE_SPAWNED: 'FEATURE_SPAWNED',
  STAGE_UPDATED: 'STAGE_UPDATED',
  ANNOTATION_ADDED: 'ANNOTATION_ADDED',
  SCHEMA_UPDATED: 'SCHEMA_UPDATED',
} as const

export type EventTypeValue = (typeof EventType)[keyof typeof EventType]
```

This is the canonical event type reference used by tRPC mutations in Epic 2+.

---

### drizzle.config.ts Update

Only change the `schema` path — do not alter anything else (the CompressionStream polyfill must stay):

```typescript
schema: './src/schema/index.ts',  // was: './src/schema.ts'
```

---

### Migration Commands (from root `package.json`)

```bash
bun db:generate    # runs: turbo run db:generate -F @life-as-code/db
bun db:migrate     # runs: turbo run db:migrate -F @life-as-code/db
bun db:studio      # Drizzle Studio visual browser (optional, for verification)
```

Root `.env` already has `DATABASE_URL` pointing to Neon (set in Story 1.1).

---

### Package Boundaries — Do NOT Violate

| Package | Allowed | Forbidden |
|---------|---------|-----------|
| `packages/db` | External DB libs, `@life-as-code/validators` | No business logic, no api imports |
| `packages/validators` | Zod, external libs only | No imports from other internal packages |

`EventType` lives in `packages/validators` — not in `packages/db` — because it will be used by tRPC procedures (in `packages/api`) and by the UI without importing `packages/db`.

---

### Naming Conventions (from architecture.md)

| Pattern | Convention |
|---------|-----------|
| DB tables | `plural snake_case` → `features`, `feature_events`, `schema_configs` |
| DB columns | `snake_case` → `feature_id`, `org_id`, `created_at` |
| TypeScript (Drizzle) | `camelCase` → `featureId`, `orgId`, `createdAt` (auto via `casing: 'snake_case'`) |
| JSONB content fields | `camelCase` → `{ problemStatement, acceptanceCriteria }` |
| Indexes | `idx_{table}_{columns}` → `idx_features_fts`, `idx_features_org_id` |
| Booleans | positive named → `frozen` not `is_not_editable` |

---

### What This Story Does NOT Include

- Feature CRUD tRPC procedures → Story 2.1
- Actual JSONB content shape/validation → Story 2.1 (wizard defines the schema)
- `schema_configs` business logic → Story 6.1
- Any UI → Epic 2+
- Playwright E2E tests → no UI yet

The `bun test` suite should not fail — but no new tests are required for this story. The migration running against Neon is the primary verification.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.2 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Data Architecture, Immutability Enforcement, Audit Trail, Full-Text Search, Naming Patterns, Structure Patterns, DB directory layout]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Restructured packages/db/src/schema.ts → schema/ sharded directory; auth tables preserved intact
- features table: 9 columns (id, feature_key, org_id, status enum, frozen, parent_id, content JSONB, created_at, updated_at) + 2 indexes
- feature_events table: 7 columns (append-only audit trail) + event_type enum (7 values) + 2 indexes
- schema_configs table: 5 columns (stub for Epic 6)
- tsvector generated column + GIN index added via raw SQL in migration (Drizzle has no native tsvector type)
- pg_trgm extension + gin_trgm_ops index on feature_key for fuzzy search
- Immutability trigger: prevent_frozen_feature_mutation() blocks UPDATE/DELETE when frozen=true (NFR7)
- Migration 0000_wide_zzzax.sql applied to Neon successfully (8 tables)
- EventType exported from packages/validators/src/index.ts
- Fixed pre-existing TS2322 in packages/api/src/trpc.ts (Session|null type cast)
- Updated tsdown.config.ts entry + package.json exports for new schema path
- Added schema to drizzle() client to enable relational query API

### File List

- packages/db/src/schema/auth.ts (created — moved from schema.ts)
- packages/db/src/schema/features.ts (created)
- packages/db/src/schema/feature-events.ts (created)
- packages/db/src/schema/schema-configs.ts (created)
- packages/db/src/schema/index.ts (created)
- packages/db/src/triggers/immutability.sql (created)
- packages/db/src/index.ts (modified — added schema import)
- packages/db/drizzle.config.ts (modified — schema path)
- packages/db/tsdown.config.ts (modified — entry path)
- packages/db/package.json (modified — exports path)
- packages/db/drizzle/0000_wide_zzzax.sql (created — migration with trigger + FTS)
- packages/db/drizzle/meta/0000_snapshot.json (created)
- packages/db/drizzle/meta/_journal.json (created)
- packages/validators/src/index.ts (created — EventType const)
- packages/api/src/trpc.ts (modified — pre-existing type fix)
