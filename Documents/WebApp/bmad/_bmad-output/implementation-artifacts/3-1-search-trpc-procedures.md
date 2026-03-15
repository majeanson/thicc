# Story 3.1: Search tRPC Procedures

Status: done

## Story

As a developer,
I want tRPC search procedures that perform full-text search across all feature content with filtering support,
So that the search UI has a fast, accurate backend capable of returning results with provenance context within 1 second.

## Acceptance Criteria

1. **Given** the `search.fullText` tRPC procedure, **When** called with a query string, **Then** it queries the tsvector GIN index across all JSONB text content in `features.content` and returns results within 1 second for datasets up to 1,000 features

2. **Given** a search query matches content in multiple lifecycle stages, **When** results are returned, **Then** each result includes: `id`, `featureKey`, title (problem statement), `status`, `frozen`, stage where match was found, and a 2-sentence text snippet with the matching term highlighted

3. **Given** the `search.fullText` procedure accepts filter parameters, **When** called with `{ stage, tags, status, completionLevel }` filters, **Then** results are narrowed to features matching all supplied filter values, and unmatched features are excluded

4. **Given** a query matches a `feature_key` exactly (e.g. `feat-2026-001`), **When** results are returned, **Then** the exact ID match appears first, followed by title matches, then content matches — in that priority order

5. **Given** the pg_trgm index, **When** a partial term is searched (e.g. "filter" matching "filtering"), **Then** the trgm index supports the partial match via `ILIKE` fallback and results are returned correctly

## Tasks / Subtasks

- [x] Task 1: Create `packages/validators/src/search.ts` — Zod schemas for search input/output (AC: #1, #2, #3)
  - [x] 1.1 Create `packages/validators/src/search.ts`
  - [x] 1.2 Define `SearchInputSchema` with `query: z.string().min(1).max(200)` and optional filters
  - [x] 1.3 Define `SearchFilterSchema` with optional `stage`, `tags`, `status`, `completionLevel` fields
  - [x] 1.4 Define `SearchResultItemSchema` — shape of each returned result
  - [x] 1.5 Export all schemas and inferred types

- [x] Task 2: Export search schemas from validators (AC: #1)
  - [x] 2.1 Add `export * from './search'` to `packages/validators/src/index.ts`
  - [x] 2.2 Run `bun run build` in `packages/validators` to verify compilation

- [x] Task 3: Create `packages/api/src/routers/search.ts` — `search.fullText` procedure (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Create `packages/api/src/routers/search.ts`
  - [x] 3.2 Implement `fullText` query using raw SQL via `sql` tagged template from `@life-as-code/db`
  - [x] 3.3 Use `plainto_tsquery('english', ...)` against `content_search` tsvector column (already in DB)
  - [x] 3.4 Add `OR feature_key ILIKE '%' || query || '%'` for partial match fallback (pg_trgm index used)
  - [x] 3.5 Use `ts_headline()` for snippet with `<mark>`/`</mark>` highlight tags
  - [x] 3.6 Use `ts_rank()` for relevance ordering
  - [x] 3.7 Apply priority ORDER BY: exact `feature_key` match (0), title match (1), content match (2)
  - [x] 3.8 Apply optional filters: `status`, `tags`, `stage`, `completionLevel`
  - [x] 3.9 Detect matched stage in application code post-query (iterate LIFECYCLE_STAGES)
  - [x] 3.10 Return results with all required fields from AC #2

- [x] Task 4: Wire search router into app router (AC: #1)
  - [x] 4.1 Import `searchRouter` in `packages/api/src/routers/_app.ts`
  - [x] 4.2 Add `search: searchRouter` to the `appRouter` object

- [x] Task 5: Verification (AC: all)
  - [x] 5.1 Run `bun run build` in `packages/validators`
  - [x] 5.2 Run `bun x tsc --noEmit` in `apps/nextjs` — 0 errors
  - [x] 5.3 Run `bunx oxlint --threads 1` from root — 0 errors

## Dev Notes

### CRITICAL: tsvector Column Exists in DB — NO New Migration Needed

The `content_search` tsvector column and all required indexes were already added in migration `0000_wide_zzzax.sql` (Story 1.2):

```sql
-- Already in DB:
ALTER TABLE "features" ADD COLUMN "content_search" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content::text, ''))) STORED;
CREATE INDEX "idx_features_fts" ON "features" USING gin ("content_search");
CREATE INDEX "idx_features_trgm" ON "features" USING gin ("feature_key" gin_trgm_ops);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Do NOT generate or run a new Drizzle migration for this story.** The DB is ready.

---

### CRITICAL: `content_search` Column is NOT in Drizzle Schema

`packages/db/src/schema/features.ts` only defines the standard columns — `content_search` was added via raw SQL and is not in the Drizzle schema object. You **cannot** reference it via `features.contentSearch` — use raw SQL instead:

```typescript
// WRONG — column not in Drizzle schema:
// features.contentSearch

// CORRECT — use sql tagged template:
import { sql, features } from '@life-as-code/db'
// sql`f.content_search @@ plainto_tsquery('english', ${query})`
```

All Drizzle-ORM operators (`sql`, `eq`, `and`, `or`, `ilike`, `desc`, `asc`) are available from `@life-as-code/db` via its `export * from 'drizzle-orm'`.

---

### Validators: `packages/validators/src/search.ts`

Create with this exact content:

```typescript
import { z } from 'zod'
import { LIFECYCLE_STAGES } from './lifecycle'

export const SearchFilterSchema = z.object({
  stage: z.enum(LIFECYCLE_STAGES).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'draft', 'frozen']).optional(),
  completionLevel: z.enum(['none', 'partial', 'substantial', 'complete']).optional(),
})

export const SearchInputSchema = z.object({
  query: z.string().min(1).max(200),
  filters: SearchFilterSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
})

export const SearchResultItemSchema = z.object({
  id: z.string(),
  featureKey: z.string(),
  title: z.string(),
  status: z.enum(['active', 'draft', 'frozen']),
  frozen: z.boolean(),
  matchedStage: z.enum(LIFECYCLE_STAGES).nullable(),
  snippet: z.string(),
  updatedAt: z.date(),
})

export type SearchInput = z.infer<typeof SearchInputSchema>
export type SearchFilter = z.infer<typeof SearchFilterSchema>
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>
```

---

### Search Router: `packages/api/src/routers/search.ts`

Use `ctx.db.execute(sql`...`)` for the raw FTS query. The `execute` method on the Drizzle Neon client returns `{ rows: Record<string, unknown>[] }`.

```typescript
import { sql, features } from '@life-as-code/db'
import { SearchInputSchema } from '@life-as-code/validators'
import type { SearchResultItem } from '@life-as-code/validators'
import { LIFECYCLE_STAGES } from '@life-as-code/validators'

import { createTRPCRouter, publicProcedure } from '@/trpc'

const DEFAULT_ORG_ID = 'default'

// Completion level thresholds (0-9 stages)
const COMPLETION_RANGES: Record<string, [number, number]> = {
  none: [0, 0],
  partial: [1, 4],
  substantial: [5, 7],
  complete: [8, 9],
}

export const searchRouter = createTRPCRouter({
  fullText: publicProcedure
    .input(SearchInputSchema)
    .query(async ({ ctx, input }) => {
      const { query, filters, limit } = input

      // Build WHERE clause fragments
      const conditions: string[] = [
        `f.org_id = '${DEFAULT_ORG_ID}'`,
        `(
          f.content_search @@ plainto_tsquery('english', ${ctx.db.dialect ? '' : ''}'${query.replace(/'/g, "''")}')
          OR f.feature_key ILIKE '%${query.replace(/'/g, "''")}%'
        )`,
      ]

      if (filters?.status) {
        conditions.push(`f.status = '${filters.status}'`)
      }
      if (filters?.tags && filters.tags.length > 0) {
        // tags are stored as a top-level array in content JSONB
        // Check if any of the requested tags is in content.tags
        const tagList = filters.tags.map(t => `'${t.replace(/'/g, "''")}'`).join(', ')
        conditions.push(`f.content->'tags' ?| array[${tagList}]`)
      }

      const whereClause = conditions.join(' AND ')

      const result = await ctx.db.execute(sql.raw(`
        SELECT
          f.id,
          f.feature_key,
          f.status,
          f.frozen,
          f.content,
          f.updated_at,
          ts_headline(
            'english',
            f.content::text,
            plainto_tsquery('english', '${query.replace(/'/g, "''")}'),
            'MaxFragments=2,MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>,HighlightAll=false'
          ) AS snippet,
          ts_rank(f.content_search, plainto_tsquery('english', '${query.replace(/'/g, "''")}')) AS rank,
          CASE
            WHEN f.feature_key = '${query.replace(/'/g, "''")}' THEN 0
            WHEN f.content->'problem'->>'problemStatement' ILIKE '%${query.replace(/'/g, "''")}%' THEN 1
            ELSE 2
          END AS priority
        FROM features f
        WHERE ${whereClause}
        ORDER BY priority ASC, rank DESC, f.updated_at DESC
        LIMIT ${limit}
      `))

      // Map rows and detect matched stage in application code
      const rows = result.rows as Array<{
        id: string
        feature_key: string
        status: 'active' | 'draft' | 'frozen'
        frozen: boolean
        content: Record<string, unknown>
        updated_at: Date
        snippet: string
        rank: number
        priority: number
      }>

      const lowerQuery = query.toLowerCase()

      const items: SearchResultItem[] = rows
        .map((row) => {
          const content = (row.content ?? {}) as Record<string, Record<string, unknown>>
          const title = (content?.problem?.problemStatement as string | undefined) ?? 'Untitled'

          // Detect matched stage: find first stage whose text content contains the query
          let matchedStage: (typeof LIFECYCLE_STAGES)[number] | null = null
          for (const stage of LIFECYCLE_STAGES) {
            const stageContent = content[stage]
            if (!stageContent) continue
            const stageText = JSON.stringify(stageContent).toLowerCase()
            if (stageText.includes(lowerQuery)) {
              matchedStage = stage
              break
            }
          }

          return {
            id: row.id,
            featureKey: row.feature_key,
            title,
            status: row.status,
            frozen: row.frozen,
            matchedStage,
            snippet: row.snippet ?? '',
            updatedAt: new Date(row.updated_at),
          }
        })
        // Apply stage filter (post-query — stage is derived from content, not a DB column)
        .filter((item) => {
          if (filters?.stage && item.matchedStage !== filters.stage) return false
          return true
        })
        // Apply completionLevel filter post-query
        .filter((item) => {
          if (!filters?.completionLevel) return true
          const [min, max] = COMPLETION_RANGES[filters.completionLevel] ?? [0, 9]
          const content = (rows.find(r => r.id === item.id)?.content ?? {}) as Record<string, Record<string, unknown>>
          const completedCount = LIFECYCLE_STAGES.filter((stage) => {
            const s = content[stage]
            return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
          }).length
          return completedCount >= min && completedCount <= max
        })

      return items
    }),
})
```

> **IMPORTANT:** The raw SQL above uses string interpolation for query building. While acceptable for internal MVP use (no user roles/auth yet), be sure that:
> - All user-provided strings are escaped with `.replace(/'/g, "''")` (SQL single-quote escape)
> - The `limit` value is a validated integer (Zod enforces this)
> - This approach is used because Drizzle's `sql` tagged template doesn't easily support dynamic WHERE clause composition with raw `tsvector` operations. A future refactor can use parameterized Drizzle `.where()` once the search is stabilized.

---

### Alternative Approach: Use `sql` Tagged Templates (Preferred for Safety)

If the raw string approach above feels fragile, use Drizzle's `sql` tagged template with proper parameterization. This is safer but more verbose:

```typescript
// Safer parameterized version for the WHERE clause:
const tsQuery = sql`plainto_tsquery('english', ${query})`
const ilikePat = `%${query}%`

const rows = await ctx.db.execute(
  sql`
    SELECT
      f.id,
      f.feature_key,
      f.status,
      f.frozen,
      f.content,
      f.updated_at,
      ts_headline('english', f.content::text, ${tsQuery},
        'MaxFragments=2,MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>') AS snippet,
      ts_rank(f.content_search, ${tsQuery}) AS rank,
      CASE
        WHEN f.feature_key = ${query} THEN 0
        WHEN f.content->'problem'->>'problemStatement' ILIKE ${ilikePat} THEN 1
        ELSE 2
      END AS priority
    FROM features f
    WHERE
      f.org_id = ${'default'}
      AND (f.content_search @@ ${tsQuery} OR f.feature_key ILIKE ${ilikePat})
      ${filters?.status ? sql`AND f.status = ${filters.status}` : sql``}
    ORDER BY priority ASC, rank DESC, f.updated_at DESC
    LIMIT ${limit}
  `
)
```

**Use the `sql` tagged template version** — it handles parameterization correctly and prevents SQL injection. The `sql` function is available from `@life-as-code/db` (re-exported from `drizzle-orm`).

---

### Wiring: `packages/api/src/routers/_app.ts`

```typescript
import { createTRPCRouter, publicProcedure } from '@/trpc'
import { featuresRouter } from './features'
import { searchRouter } from './search'  // ADD THIS

const appRouter = createTRPCRouter({
  health: publicProcedure
    .meta({ message: 'Health check successful' })
    .query(() => ({ message: 'OK' })),
  features: featuresRouter,
  search: searchRouter,  // ADD THIS
})
```

---

### Existing DB State (What's Already There)

From `packages/db/src/schema/features.ts` (current Drizzle schema):
```typescript
export const features = pgTable('features', {
  id: text('id').primaryKey().$defaultFn(() => ulid()),
  featureKey: text('feature_key').notNull().unique(),
  orgId: text('org_id').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  frozen: boolean('frozen').notNull().default(false),
  parentId: text('parent_id'),
  content: jsonb('content').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
// NOTE: content_search tsvector column is NOT here — it's raw SQL in the migration
```

The DB has `content_search` as a GENERATED column — it auto-updates whenever `content` changes. No application code needs to maintain it.

---

### Content JSONB Structure (Established in Epic 2)

```typescript
// feature.content shape:
{
  problem: {
    problemStatement: "...",    // ← title source
    reporterContext: "...",
    decisions: [...]
  },
  analysis: { analysisNotes: "...", decisions: [...] },
  requirements: { ... },
  design: { ... },
  implementation: { ... },
  validation: { ... },
  documentation: { ... },
  delivery: { ... },
  support: { ... },
  tags: ["backend", "mvp"]    // ← top-level, NOT inside a stage
}
```

Title: `(content as any)?.problem?.problemStatement ?? 'Untitled'`
Tags: `(content as any)?.tags as string[] | undefined ?? []`

---

### Stage Completion Count (Same Logic as wizard-shell.tsx and feature-card.tsx)

```typescript
const completedCount = LIFECYCLE_STAGES.filter((stage) => {
  const s = (content as Record<string, Record<string, unknown>>)?.[stage]
  return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
}).length
```

---

### Lint Rules (Carried Forward from Prior Stories)

- `unicorn/filename-case`: `search.ts` ✓ (kebab-case)
- `require-await`: The `fullText` query procedure is async — keep `await` on `ctx.db.execute()`
- `no-non-null-assertion`: use `?.` and `??` instead of `!`

---

### Windows Build Notes (Carried Forward from Epic 2)

- **Validators build**: `bun run build` in `packages/validators` — required before typecheck
- **Typecheck**: `bun x tsc --noEmit` in `apps/nextjs` — do NOT use turbo typecheck (OOM)
- **Lint**: `bunx oxlint --threads 1` from root — do NOT use `bun run lint` (OOM)
- **API rebuild**: Run `bun run build` in `packages/api` if types are stale before typecheck

---

### Scope for This Story

**In scope:**
- `packages/validators/src/search.ts` — Zod schemas + TypeScript types
- `packages/validators/src/index.ts` — add search export
- `packages/api/src/routers/search.ts` — `search.fullText` tRPC query
- `packages/api/src/routers/_app.ts` — wire in `searchRouter`

**Out of scope (future stories):**
- Search UI, Cmd+K overlay → Story 3.2
- URL-synced filters → Story 3.2
- Feature tree → Story 3.3
- Feature detail view → Story 3.4
- Sort persistence to localStorage → Story 3.2

---

### File Structure for This Story

```
packages/validators/src/
  search.ts                  ← CREATE: Zod schemas + types
  index.ts                   ← MODIFY: add export * from './search'

packages/api/src/routers/
  search.ts                  ← CREATE: searchRouter with fullText procedure
  _app.ts                    ← MODIFY: add search: searchRouter
```

No changes to `packages/db`, `apps/nextjs`, or any other package.

---

### Project Structure Notes

- Architecture doc references `apps/web/` — override confirmed by Stories 2.1–2.5: actual app path is `apps/nextjs/`
- `packages/api/src/routers/_app.ts` is the composition root for all routers
- `packages/validators` is the shared schema package — both FE and BE import from it
- No Drizzle migration needed — `content_search` column exists in DB already

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.1 — BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — tRPC router organization, search.* namespace, tsvector + pg_trgm strategy]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — Search result anatomy, priority ordering, snippet highlighting]
- [Source: `life-as-code/packages/db/drizzle/0000_wide_zzzax.sql` — tsvector column, GIN indexes, pg_trgm (already in DB)]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — existing router pattern, publicProcedure usage, DEFAULT_ORG_ID]
- [Source: `life-as-code/packages/api/src/routers/_app.ts` — appRouter composition pattern]
- [Source: `life-as-code/packages/validators/src/feature.ts` — existing schema patterns]
- [Source: `_bmad-output/implementation-artifacts/2-5-feature-list-view-and-featurecard-component.md` — kebab-case, Windows build notes, stage completion logic]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Used `sql` tagged template approach (the "Alternative/Preferred" approach in story spec) instead of raw string interpolation — safer, prevents SQL injection, handles parameterization correctly via Drizzle
- `content_search` tsvector column confirmed absent from Drizzle schema (`packages/db/src/schema/features.ts`) — all FTS queries use `sql` tagged templates from `@life-as-code/db`
- Tags JSONB filter: used `@>` containment operator (`f.content @> '{"tags":["tagname"]}'::jsonb`) — `?|` operator not available via `sql` tagged templates
- No test runner in `packages/api` or `packages/validators` — vitest/jest not set up; verification done via typecheck + lint only
- Windows OOM constraints followed: `bun x tsc --noEmit` (not turbo), `bunx oxlint --threads 1` (not `bun run lint`)
- Validators built via `bun run build` in `packages/validators` before typecheck

### Completion Notes List

- All 5 tasks completed and marked [x]
- Typecheck: 0 errors (`bun x tsc --noEmit` in `apps/nextjs`)
- Lint: 0 errors/warnings (`bunx oxlint --threads 1`)
- Validators build: clean (`bun run build` in `packages/validators`)
- `search.fullText` tRPC procedure implements: FTS via tsvector GIN index, ILIKE fallback for partial terms, priority ordering (exact key match → title match → content match), stage detection in application code, post-query filters for `stage` and `completionLevel`

### File List

- `packages/validators/src/search.ts` — CREATED: SearchInputSchema, SearchFilterSchema, SearchResultItemSchema + inferred types
- `packages/validators/src/index.ts` — MODIFIED: added `export * from './search'`
- `packages/api/src/routers/search.ts` — CREATED: searchRouter with `fullText` publicProcedure
- `packages/api/src/routers/_app.ts` — MODIFIED: wired `search: searchRouter`
