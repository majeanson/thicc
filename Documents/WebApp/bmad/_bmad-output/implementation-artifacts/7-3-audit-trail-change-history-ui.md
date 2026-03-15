# Story 7.3: Audit Trail — Change History UI

Status: done

## Story

As a developer or product manager,
I want to view the complete change history of any feature as a chronological timeline,
So that I can understand exactly what changed, when, and trace the evolution of the feature record over time.

## Acceptance Criteria

1. **Given** `events.listFeatureEvents` is called with a feature `id`, **When** it executes, **Then** all `feature_events` rows for that feature are returned in reverse-chronological order with: `event_type`, `changed_fields` delta, `actor`, and `created_at`

2. **Given** a user views the History tab on a feature detail page, **When** the tab is selected, **Then** all events render as a timeline with event type label, human-readable description of what changed, actor name, and a relative timestamp ("2 hours ago") with absolute timestamp on hover via `<time>` element

3. **Given** different event types, **When** displayed in the history timeline, **Then** each has a distinct readable label: "Feature created", "Stage updated: Analysis", "Feature frozen", "Child feature spawned", "Annotation added", "Schema updated"

4. **Given** a `FEATURE_UPDATED` event with a `changed_fields` delta, **When** displayed, **Then** the specific fields that changed are listed (e.g. "Updated: problem statement, acceptance criteria") — not just "Feature updated"

5. **Given** the history timeline, **When** it renders, **Then** it uses `role="list"` with each event as `role="listitem"` for screen reader navigation

6. **Given** a feature with more than 50 events, **When** the History tab loads, **Then** the 20 most recent events are shown with a "Load more" button to paginate

## Tasks / Subtasks

- [x] Task 1: Add `ListFeatureEventsSchema` to `packages/validators/src/audit.ts` (AC: #1, #6)
  - [x] 1.1 Create `packages/validators/src/audit.ts` with `ListFeatureEventsSchema = z.object({ id: z.string().min(1), cursor: z.number().int().min(0).default(0) })`
  - [x] 1.2 Add `export * from './audit'` to `packages/validators/src/index.ts`
  - [x] 1.3 Add `"./audit": "./dist/audit.mjs"` export entry to `packages/validators/package.json`

- [x] Task 2: Create `packages/api/src/routers/events.ts` with `listFeatureEvents` procedure (AC: #1, #6)
  - [x] 2.1 Import `featureEvents, eq, desc` from `@life-as-code/db`; import `ListFeatureEventsSchema` from `@life-as-code/validators`; import `createTRPCRouter, publicProcedure` from `@/trpc`
  - [x] 2.2 Define `const PAGE_LIMIT = 20`
  - [x] 2.3 Implement `listFeatureEvents: publicProcedure.input(ListFeatureEventsSchema).query(async ({ ctx, input }) => { ... })`:
    - Query `PAGE_LIMIT + 1` rows: `ctx.db.select().from(featureEvents).where(eq(featureEvents.featureId, input.id)).orderBy(desc(featureEvents.createdAt)).limit(PAGE_LIMIT + 1).offset(input.cursor)`
    - If result length > `PAGE_LIMIT`: set `hasMore = true`, slice to `PAGE_LIMIT`
    - Return `{ events: rows, hasMore, nextCursor: hasMore ? input.cursor + PAGE_LIMIT : null }`
  - [x] 2.4 Export `eventsRouter = createTRPCRouter({ listFeatureEvents })`

- [x] Task 3: Wire `eventsRouter` into `_app.ts` (AC: #1)
  - [x] 3.1 In `packages/api/src/routers/_app.ts`, add `import { eventsRouter } from './events'`
  - [x] 3.2 Add `events: eventsRouter` to the `createTRPCRouter({...})` call alongside `features` and `search`

- [x] Task 4: Create `apps/nextjs/components/features/audit-history.tsx` client component (AC: #2–#6)
  - [x] 4.1 Add `"use client"` directive; import `useEffect, useRef, useState` from `react`; import `useQuery` from `@tanstack/react-query`; import `useTRPC` from `@/trpc/react`; import `EventType` from `@life-as-code/validators`; import `Button` from `@life-as-code/ui`
  - [x] 4.2 Define local `STAGE_LABEL` const (same as in `feature-detail-view.tsx`): `{ problem: 'Problem', analysis: 'Analysis', requirements: 'Requirements', design: 'Design', implementation: 'Implementation', validation: 'Validation', documentation: 'Documentation', delivery: 'Delivery', support: 'Support' }`
  - [x] 4.3 Define `EVENT_LABEL` const mapping each `EventType` value to a readable string: `FEATURE_CREATED → "Feature created"`, `FEATURE_UPDATED → "Feature updated"`, `FEATURE_FROZEN → "Feature frozen"`, `FEATURE_SPAWNED → "Child feature spawned"`, `STAGE_UPDATED → "Stage updated"`, `ANNOTATION_ADDED → "Annotation added"`, `SCHEMA_UPDATED → "Schema updated"`
  - [x] 4.4 Define `describeEvent(eventType: string, changedFields: unknown): string` function — see Dev Notes for exact logic
  - [x] 4.5 Define `formatRelativeTime(date: Date): string` function — see Dev Notes for exact logic
  - [x] 4.6 Component state: `const [allEvents, setAllEvents] = useState<FeatureEvent[]>([])`, `const [cursor, setCursor] = useState(0)`, `const [hasMore, setHasMore] = useState(false)`; use `const cursorRef = useRef(-1)` to guard against double-append in StrictMode
  - [x] 4.7 Query: `const { data, isPending, isFetching } = useQuery(trpc.events.listFeatureEvents.queryOptions({ id: featureId, cursor }))`; in `useEffect([data, cursor])`: if `cursor !== cursorRef.current`, set `cursorRef.current = cursor`, append (or replace if cursor=0), update `hasMore`
  - [x] 4.8 **Loading skeleton**: while `isPending && allEvents.length === 0`, render 3 `animate-pulse bg-muted rounded h-12` divs
  - [x] 4.9 **Empty state**: when `allEvents.length === 0 && !isPending`: render "No history recorded yet."
  - [x] 4.10 **Timeline** (when `allEvents.length > 0`): render `<ol role="list" className="flex flex-col gap-4">` with each event as `<li role="listitem" key={event.id}>`:
    - Event type badge: small pill with `EVENT_LABEL[event.eventType]` text
    - Description: `<p>{describeEvent(event.eventType, event.changedFields)}</p>`
    - Actor + timestamp row: `<span>{event.actor}</span>` + `<time dateTime={event.createdAt.toISOString()} title={event.createdAt.toLocaleString()}>{formatRelativeTime(event.createdAt)}</time>`
  - [x] 4.11 **"Load more" button**: when `hasMore`, render `<Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => { setCursor(data?.nextCursor ?? cursor + 20) }}>` showing "Load more" or "Loading…" when `isFetching`
  - [x] 4.12 Export named `AuditHistory` function accepting `{ featureId: string }`

- [x] Task 5: Wire `AuditHistory` into RSC page and `feature-detail-view.tsx` (AC: #2–#6)
  - [x] 5.1 In `apps/nextjs/app/(features)/features/[id]/page.tsx`, add `await queryClient.prefetchQuery(trpc.events.listFeatureEvents.queryOptions({ id, cursor: 0 }))` after the existing prefetches
  - [x] 5.2 In `feature-detail-view.tsx`, import `AuditHistory` from `@/components/features/audit-history`
  - [x] 5.3 Replace `<p className="text-sm text-muted-foreground">Change history — Coming soon</p>` with `<AuditHistory featureId={featureId} />`

- [x] Task 6: Rebuild packages, typecheck and lint (AC: all)
  - [x] 6.1 `bun run build` from `packages/validators` — rebuild dist to expose `ListFeatureEventsSchema`
  - [x] 6.2 `bun run build` from `packages/api` — rebuild dist to expose `eventsRouter` and `events.listFeatureEvents`
  - [x] 6.3 `bun x tsc --noEmit` from `apps/nextjs` — confirm 0 errors
  - [x] 6.4 `bunx oxlint --threads 1` from repo root — confirm 0 warnings/errors

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

All file paths use `apps/nextjs`. TypeScript check: `bun x tsc --noEmit` from `apps/nextjs`. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: `events.ts` Router Is New — Must Also Wire Into `_app.ts`

The `events.ts` router does not exist yet. After creating it, **you must also update `_app.ts`**:

Current `_app.ts`:
```typescript
const appRouter = createTRPCRouter({
  health: publicProcedure.meta({ message: 'Health check successful' }).query(() => ({ message: 'OK' })),
  features: featuresRouter,
  search: searchRouter,
})
```

Updated:
```typescript
import { eventsRouter } from './events'
// ...
const appRouter = createTRPCRouter({
  health: publicProcedure.meta({ message: 'Health check successful' }).query(() => ({ message: 'OK' })),
  features: featuresRouter,
  search: searchRouter,
  events: eventsRouter,
})
```

The client-side calls will then be `trpc.events.listFeatureEvents.*`.

---

### CRITICAL: Always Rebuild Both Packages After tRPC/Validator Changes

Pattern established in Stories 7-1 and 7-2 — whenever new procedures or types are added to `packages/validators` or `packages/api`, the dist must be rebuilt **before** running `tsc --noEmit`:

```bash
cd packages/validators && bun run build
cd packages/api && bun run build
cd apps/nextjs && bun x tsc --noEmit
```

---

### CRITICAL: `validators/package.json` Export Entry Pattern

Add to the `exports` map (simple string format, same as existing entries):

```json
"./audit": "./dist/audit.mjs"
```

Do NOT use the `{ "import": ..., "require": ... }` object format — all existing entries use the simple string format pointing to `./dist/*.mjs`.

---

### CRITICAL: `FeatureEvent` Type from `@life-as-code/db`

```typescript
import type { FeatureEvent } from '@life-as-code/db'
```

Shape (from `packages/db/src/schema/feature-events.ts`):
```typescript
{
  id: string              // crypto.randomUUID()
  featureId: string
  orgId: string
  eventType: string       // one of EventType values
  changedFields: unknown  // JSONB — cast to Record<string, unknown> when reading
  actor: string
  createdAt: Date         // Drizzle returns Date for timestamp columns
}
```

`createdAt` is a `Date` object from Drizzle — call `.toISOString()` and `.toLocaleString()` directly on it.

---

### CRITICAL: oxlint Rules

1. **`type="button"`** on ALL `<button>` and `<Button>` elements
2. **No `!` non-null assertion** — use optional chaining
3. **`void` prefix** on floating Promises
4. **`no-array-index-key`** — use `event.id` as React key (UUIDs)
5. **`no-map-spread`** — use `Object.assign({}, obj, { field })` in `.map()` if needed
6. **`no-array-sort`** — use `.toSorted()` not `.sort()`
7. **`require-await`** — the `listFeatureEvents` query uses `await` so no issue; don't add `async` to helper functions that have no `await`
8. **Kebab-case filenames** — `audit-history.tsx` (not `AuditHistory.tsx`)
9. **`no-useless-fallback-in-spread`** — don't write `{ ...(x ?? {}) }`

---

### `describeEvent` Function

```typescript
function describeEvent(eventType: string, changedFields: unknown): string {
  const fields = (changedFields ?? {}) as Record<string, unknown>

  switch (eventType) {
    case EventType.FEATURE_CREATED:
      return 'Feature created'
    case EventType.FEATURE_FROZEN:
      return 'Feature frozen'
    case EventType.FEATURE_SPAWNED:
      return typeof fields.childId === 'string'
        ? 'Child feature spawned'
        : 'Spawned from parent feature'
    case EventType.STAGE_UPDATED: {
      const stage = typeof fields.stage === 'string' ? fields.stage : null
      return stage ? `Stage updated: ${STAGE_LABEL[stage] ?? stage}` : 'Stage updated'
    }
    case EventType.ANNOTATION_ADDED:
      return 'Annotation added'
    case EventType.SCHEMA_UPDATED:
      return 'Schema updated'
    case EventType.FEATURE_UPDATED: {
      if (Array.isArray(fields.changedKeys) && fields.changedKeys.length > 0) {
        return `Updated: ${(fields.changedKeys as string[]).join(', ')}`
      }
      const sc = fields.statusChange as { from?: string; to?: string } | undefined
      if (sc?.from && sc?.to) {
        return `Status changed: ${sc.from} → ${sc.to}`
      }
      if (fields.updatedViaJson === true) {
        return 'Updated via JSON editor'
      }
      return 'Feature updated'
    }
    default:
      return 'Event recorded'
  }
}
```

---

### `formatRelativeTime` Function

```typescript
function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}
```

---

### Pagination Pattern — Accumulating Events Across Pages

The "Load more" button appends new pages to the displayed list. Use a ref guard to prevent double-append in React StrictMode:

```typescript
const [allEvents, setAllEvents] = useState<FeatureEvent[]>([])
const [cursor, setCursor] = useState(0)
const [hasMore, setHasMore] = useState(false)
const cursorRef = useRef(-1)

const { data, isPending, isFetching } = useQuery(
  trpc.events.listFeatureEvents.queryOptions({ id: featureId, cursor })
)

useEffect(() => {
  if (!data || cursor === cursorRef.current) return
  cursorRef.current = cursor
  setAllEvents((prev) => (cursor === 0 ? data.events : [...prev, ...data.events]))
  setHasMore(data.hasMore)
}, [data, cursor])

function handleLoadMore() {
  if (data?.nextCursor !== null && data?.nextCursor !== undefined) {
    setCursor(data.nextCursor)
  }
}
```

---

### `listFeatureEvents` Procedure — Pagination Query

```typescript
const PAGE_LIMIT = 20

listFeatureEvents: publicProcedure
  .input(ListFeatureEventsSchema)
  .query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select()
      .from(featureEvents)
      .where(eq(featureEvents.featureId, input.id))
      .orderBy(desc(featureEvents.createdAt))
      .limit(PAGE_LIMIT + 1)
      .offset(input.cursor)

    const hasMore = rows.length > PAGE_LIMIT
    return {
      events: hasMore ? rows.slice(0, PAGE_LIMIT) : rows,
      hasMore,
      nextCursor: hasMore ? input.cursor + PAGE_LIMIT : null,
    }
  }),
```

No `NOT_FOUND` guard needed — if the feature doesn't exist, an empty array is returned (safe, no side-effects).

---

### `EventType` Import

Already defined in `packages/validators/src/event-types.ts` and exported from the main index:

```typescript
import { EventType } from '@life-as-code/validators'
```

Values: `FEATURE_CREATED`, `FEATURE_UPDATED`, `FEATURE_FROZEN`, `FEATURE_SPAWNED`, `STAGE_UPDATED`, `ANNOTATION_ADDED`, `SCHEMA_UPDATED`

---

### RSC Prefetch Pattern

In `apps/nextjs/app/(features)/features/[id]/page.tsx`, add after the existing annotation prefetch:

```typescript
await queryClient.prefetchQuery(
  trpc.events.listFeatureEvents.queryOptions({ id, cursor: 0 })
)
```

`trpc.events.*` is available on the RSC `createTRPC` client once `eventsRouter` is wired into `_app.ts` and the `packages/api` dist is rebuilt.

---

### `AuditHistory` Component Structure

```
AuditHistory (client component — audit-history.tsx)
├── Loading skeleton (isPending && allEvents.length === 0)
├── Empty state (allEvents.length === 0 && !isPending)
├── Timeline (ol role="list")
│   └── li role="listitem" (key=event.id) × N
│       ├── Event type badge pill (EVENT_LABEL[eventType])
│       ├── Description paragraph (describeEvent result)
│       └── Actor + <time> row (formatRelativeTime, absolute on hover via title attr)
└── "Load more" Button (when hasMore)
```

---

### `<time>` Element Pattern for Hover Tooltip

Use the `title` attribute for the absolute timestamp on hover (no custom tooltip component needed):

```tsx
<time
  dateTime={event.createdAt.toISOString()}
  title={event.createdAt.toLocaleString()}
  className="text-xs text-muted-foreground"
>
  {formatRelativeTime(event.createdAt)}
</time>
```

---

### File Structure for This Story

```
packages/validators/src/
├── audit.ts              ← CREATE: ListFeatureEventsSchema
└── index.ts              ← MODIFY: add export * from './audit'

packages/validators/
└── package.json          ← MODIFY: add "./audit" export entry

packages/api/src/routers/
├── events.ts             ← CREATE: eventsRouter with listFeatureEvents
└── _app.ts               ← MODIFY: import + wire eventsRouter

apps/nextjs/
├── app/(features)/features/[id]/page.tsx    ← MODIFY: add listFeatureEvents prefetch
└── components/features/
    ├── audit-history.tsx                    ← CREATE: AuditHistory client component
    └── feature-detail-view.tsx              ← MODIFY: import + wire AuditHistory
```

---

### What This Story Does NOT Include

- **No write procedures** — `events.*` is read-only; writes happen inside feature mutations (already implemented in all previous stories)
- **No `ANNOTATION_FLAGGED` event type** — flagging writes `FEATURE_UPDATED` (implemented in Story 7-1)
- **No export procedures** — that's Story 7.4
- **No custom tooltip component** — use HTML `title` attribute for hover absolute timestamp
- **No infinite scroll** — use explicit "Load more" button per AC #6

---

### Previous Story Intelligence

- Story 7-1: `packages/api` and `packages/validators` dists must be rebuilt after adding new procedures/types — `bun run build` in each package before `tsc --noEmit`
- Story 7-2: Same rebuild pattern confirmed; `annotation-list.tsx` used `invalidateBoth()` helper for deduplication — similar helper not needed here (read-only component)
- `feature-detail-view.tsx` history tab placeholder: `<p className="text-sm text-muted-foreground">Change history — Coming soon</p>` — replace with `<AuditHistory featureId={featureId} />`

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 7, Story 7.3 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — FR36–FR37, events router spec, tRPC router organization]
- [Source: `life-as-code/packages/db/src/schema/feature-events.ts` — featureEvents table, FeatureEvent type]
- [Source: `life-as-code/packages/validators/src/event-types.ts` — EventType const values]
- [Source: `life-as-code/packages/api/src/routers/_app.ts` — current router wiring (events missing)]
- [Source: `life-as-code/apps/nextjs/components/features/feature-detail-view.tsx` — history placeholder location, featureId prop]
- [Source: `life-as-code/apps/nextjs/app/(features)/features/[id]/page.tsx` — RSC prefetch pattern]
- [Source: `_bmad-output/implementation-artifacts/7-2-annotations-ui.md` — rebuild pattern, oxlint lessons]

## Dev Agent Record

### Implementation Plan

Implemented all 6 tasks in sequence:
1. Created `packages/validators/src/audit.ts` with `ListFeatureEventsSchema` (zod, cursor-based pagination)
2. Added export and package.json entry for the new `audit` module
3. Created `packages/api/src/routers/events.ts` with `eventsRouter` + `listFeatureEvents` procedure (cursor pagination, PAGE_LIMIT=20, returns hasMore + nextCursor)
4. Wired `eventsRouter` into `_app.ts` as `events: eventsRouter`
5. Created `apps/nextjs/components/features/audit-history.tsx` — full client component with loading skeleton, empty state, timeline (`ol role="list"`), `describeEvent`, `formatRelativeTime`, StrictMode-safe accumulation via `cursorRef`, and "Load more" button
6. Added `listFeatureEvents` prefetch to RSC page; replaced history placeholder in `feature-detail-view.tsx` with `<AuditHistory featureId={featureId} />`
7. Built both packages, ran `tsc --noEmit` (0 errors), ran `oxlint` (0 warnings/errors)

### Completion Notes

- All 6 tasks and all subtasks marked complete
- All ACs satisfied: paginated query (AC#1,#6), timeline UI with actor/timestamp (AC#2), distinct event labels (AC#3), changedFields detail (AC#4), ARIA roles (AC#5), "Load more" pagination (AC#6)
- `tsc --noEmit`: 0 errors
- `oxlint`: 0 warnings, 0 errors
- All oxlint rules respected: `type="button"`, no non-null assertions, `event.id` as React key, no map spread

## File List

- `life-as-code/packages/validators/src/audit.ts` — CREATED
- `life-as-code/packages/validators/src/index.ts` — MODIFIED
- `life-as-code/packages/validators/package.json` — MODIFIED
- `life-as-code/packages/api/src/routers/events.ts` — CREATED
- `life-as-code/packages/api/src/routers/_app.ts` — MODIFIED
- `life-as-code/apps/nextjs/components/features/audit-history.tsx` — CREATED
- `life-as-code/apps/nextjs/components/features/feature-detail-view.tsx` — MODIFIED
- `life-as-code/apps/nextjs/app/(features)/features/[id]/page.tsx` — MODIFIED

## Change Log

- 2026-03-15: Implemented Story 7-3 — Audit Trail Change History UI. Created `eventsRouter` with paginated `listFeatureEvents` tRPC procedure, `ListFeatureEventsSchema` validator, and `AuditHistory` client component with timeline, loading skeleton, empty state, and "Load more" pagination. Wired into RSC page prefetch and feature-detail-view History tab.
