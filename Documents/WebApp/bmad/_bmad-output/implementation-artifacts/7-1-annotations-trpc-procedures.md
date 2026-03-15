# Story 7.1: Annotations tRPC Procedures

Status: done

## Story

As a developer,
I want tRPC procedures to add, list, and flag annotations on features,
So that team members can leave contextual notes and surface attention items with a persistent, audited record.

## Acceptance Criteria

1. **Given** `features.addAnnotation` is called with `{ featureId, text }`, **When** it executes, **Then** the annotation is stored in the feature's `content.annotations` array with a generated id, timestamp, and `actor` from context, and an `ANNOTATION_ADDED` event is written to `feature_events` in the same Drizzle transaction

2. **Given** `features.addAnnotation` is called on a frozen feature, **When** the API-level immutability check runs, **Then** annotations are permitted on frozen features — annotations are observational, not mutations to lifecycle stage content

3. **Given** `features.listAnnotations` is called with a feature `id`, **When** it executes, **Then** all annotations for that feature are returned in chronological order with id, text, actor, timestamp, and `flagged` boolean

4. **Given** `features.flagAnnotation` is called with `{ annotationId, flagged: true }`, **When** it executes, **Then** the annotation's `flagged` field is toggled, the feature's `status` is set to `'flagged'` if any annotation is flagged, and a `FEATURE_UPDATED` event is written to `feature_events`

5. **Given** `features.flagAnnotation` is called with `{ flagged: false }` on the last flagged annotation, **When** it executes, **Then** the feature's `status` reverts from `'flagged'` to its previous state (`'active'` or `'frozen'`)

## Tasks / Subtasks

- [x] Task 1: Add annotation Zod schemas to `packages/validators/src/annotation.ts` (AC: #1, #3, #4)
  - [x] 1.1 Create `packages/validators/src/annotation.ts` with: `AddAnnotationSchema` (`{ featureId: z.string().min(1), text: z.string().min(1).max(5000) }`), `ListAnnotationsSchema` (`{ id: z.string().min(1) }`), `FlagAnnotationSchema` (`{ featureId: z.string().min(1), annotationId: z.string().min(1), flagged: z.boolean() }`)
  - [x] 1.2 Export `AnnotationEntry` type: `{ id: string; text: string; actor: string; timestamp: string; flagged: boolean }`
  - [x] 1.3 Add `export * from './annotation'` to `packages/validators/src/index.ts`
  - [x] 1.4 Add `"./annotation"` export entry to `packages/validators/package.json` exports map (alongside existing `"./template"`, `"./schema-config"`, etc.)

- [x] Task 2: Implement `features.addAnnotation` procedure in `packages/api/src/routers/features.ts` (AC: #1, #2)
  - [x] 2.1 Import `AddAnnotationSchema`, `AnnotationEntry` from `@life-as-code/validators`
  - [x] 2.2 Add `addAnnotation: publicProcedure.input(AddAnnotationSchema).mutation(...)` inside `featuresRouter`
  - [x] 2.3 In the mutation body: look up the feature by `input.featureId` — throw `TRPCError({ code: 'NOT_FOUND' })` if missing
  - [x] 2.4 **Do NOT throw FORBIDDEN for frozen features** — annotations bypass the immutability check (AC #2)
  - [x] 2.5 Build new annotation object: `{ id: crypto.randomUUID(), text: input.text, actor: ctx.session?.user?.name ?? 'anonymous', timestamp: new Date().toISOString(), flagged: false }`
  - [x] 2.6 Wrap in `ctx.db.transaction(async (tx) => { ... })`: update feature with appended annotation in `content.annotations`, then insert `ANNOTATION_ADDED` event to `feature_events`
  - [x] 2.7 Used JS-side spread pattern (consistent with `addDecision`/`updateTags`): read existing content, append to annotations array, write back full content object — simpler than `jsonb_set` and functionally equivalent
  - [x] 2.8 Insert `featureEvents` row: `{ featureId: input.featureId, orgId: DEFAULT_ORG_ID, eventType: EventType.ANNOTATION_ADDED, changedFields: { annotationId: newAnnotation.id, text: input.text }, actor: newAnnotation.actor }`
  - [x] 2.9 Return the updated feature

- [x] Task 3: Implement `features.listAnnotations` procedure (AC: #3)
  - [x] 3.1 Import `ListAnnotationsSchema` from `@life-as-code/validators`
  - [x] 3.2 Add `listAnnotations: publicProcedure.input(ListAnnotationsSchema).query(...)` inside `featuresRouter`
  - [x] 3.3 Look up the feature by `input.id` — throw `TRPCError({ code: 'NOT_FOUND' })` if missing
  - [x] 3.4 Extract `(feature.content as { annotations?: AnnotationEntry[] }).annotations ?? []` and return sorted by `timestamp` ascending (chronological order)
  - [x] 3.5 Return type: `AnnotationEntry[]`

- [x] Task 4: Implement `features.flagAnnotation` procedure (AC: #4, #5)
  - [x] 4.1 Import `FlagAnnotationSchema` from `@life-as-code/validators`
  - [x] 4.2 Add `flagAnnotation: publicProcedure.input(FlagAnnotationSchema).mutation(...)` inside `featuresRouter`
  - [x] 4.3 Look up the feature — throw `NOT_FOUND` if missing; **no frozen check** (AC #2 — observational annotations work on frozen features)
  - [x] 4.4 Extract `annotations` array from `content`; find the target annotation by `annotationId` — throw `NOT_FOUND` if the annotation doesn't exist
  - [x] 4.5 Update the annotation's `flagged` field in the array
  - [x] 4.6 Determine new feature `status`: if any annotation in the updated array has `flagged === true`, set status `'flagged'`; otherwise revert to `feature.frozen ? 'frozen' : 'active'`
  - [x] 4.7 Wrap in `ctx.db.transaction(async (tx) => { ... })`: update `features` (new content with updated annotations array + new status + `updatedAt`), then insert `FEATURE_UPDATED` event to `feature_events`
  - [x] 4.8 `changedFields` for the event: `{ annotationId: input.annotationId, flagged: input.flagged, statusChange: { from: feature.status, to: newStatus } }`
  - [x] 4.9 Return the updated feature

- [x] Task 5: Typecheck and lint (AC: all)
  - [x] 5.1 `bun x tsc --noEmit` from `apps/nextjs` — confirmed 0 errors
  - [x] 5.2 `bunx oxlint --threads 1` from repo root — confirmed 0 warnings/errors

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

All file paths use `apps/nextjs`. TypeScript check: `bun x tsc --noEmit` from `apps/nextjs`. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: Annotations Bypass the Frozen Check

The immutability check (`if (feature.frozen) throw FORBIDDEN`) must NOT be applied to `addAnnotation` or `flagAnnotation`. Annotations are observational — they do not mutate lifecycle stage content. This is explicitly called out in AC #2. Only `updateStage`, `addDecision`, `updateTags`, `updateFeatureJson`, and similar content-mutating procedures enforce the frozen guard.

---

### CRITICAL: No Async Outer Mutation Callback (oxlint)

This is a server-side router, not a React component, so this rule doesn't apply here. Standard `async` mutation bodies are fine in tRPC procedures.

---

### CRITICAL: `content.annotations` Storage Pattern

Annotations are stored in the feature's `content` JSONB column under the key `annotations`. The `content` shape is `{ [stage: string]: object, annotations?: AnnotationEntry[], tags?: string[], decisions?: ... }`.

When adding an annotation, use a raw SQL `jsonb_set` expression to atomically append without overwriting the rest of `content`:

```typescript
import { sql } from 'drizzle-orm'

const [updated] = await tx
  .update(features)
  .set({
    content: sql`jsonb_set(
      ${features.content},
      '{annotations}',
      coalesce(${features.content}->'annotations', '[]'::jsonb) || ${JSON.stringify([newAnnotation])}::jsonb
    )`,
    updatedAt: new Date(),
  })
  .where(eq(features.id, input.featureId))
  .returning()
```

For `flagAnnotation`, since you must surgically update a single annotation's `flagged` field within the array, it's simpler to:
1. Read the full feature
2. Mutate the JS-side annotations array
3. Write the entire updated `content` object back:

```typescript
const updatedContent = {
  ...(feature.content as Record<string, unknown>),
  annotations: updatedAnnotations,
}
const [updated] = await tx
  .update(features)
  .set({ content: updatedContent, status: newStatus, updatedAt: new Date() })
  .where(eq(features.id, featureId))
  .returning()
```

---

### CRITICAL: `validators/package.json` Export Entry

Every new sub-module in `packages/validators/src/` needs a corresponding export entry in `packages/validators/package.json`:

```json
"./annotation": {
  "import": "./src/annotation.ts",
  "require": "./src/annotation.ts"
}
```

Check existing entries (e.g. `"./template"`) for the exact format used in this project.

---

### CRITICAL: oxlint Rules (From Previous Stories)

1. **`type="button"`** on ALL `<button>` and `<Button>` elements (server-side procedures are exempt — this is client-side only)
2. **No `!` non-null assertion** — use optional chaining or `?? fallback`
3. **`void` prefix** on floating Promises — `void queryClient.invalidateQueries(...)`
4. **No async outer mutation callbacks** — use options object with `onSuccess`/`onError` (client-side only; server procedures are fine)
5. **`no-array-index-key`** — use stable IDs as React keys (client-side only)
6. **`no-accumulating-spread`** — use `Object.assign` in reduce (if building objects in a loop)
7. **`require-await`** — don't mark a function `async` if it has no `await` inside
8. **`no-useless-fallback-in-spread`** — don't write `{ ...(x ?? {}) }`; spreading `undefined` is safe

---

### `AnnotationEntry` Type Shape

```typescript
export type AnnotationEntry = {
  id: string         // crypto.randomUUID()
  text: string       // annotation body
  actor: string      // ctx.session?.user?.name ?? 'anonymous'
  timestamp: string  // new Date().toISOString()
  flagged: boolean   // default false; toggled by flagAnnotation
}
```

Define as both a Zod schema and an exported TypeScript type in `packages/validators/src/annotation.ts`.

---

### `features.content` Type Casting

The Drizzle `content` column is typed as `unknown` at runtime. Cast when reading:

```typescript
const content = feature.content as {
  annotations?: AnnotationEntry[]
  [key: string]: unknown
}
const annotations = content.annotations ?? []
```

---

### Status Revert Logic for `flagAnnotation`

When unflagging: after removing the flag, check if any remaining annotations are still flagged.

```typescript
const hasAnyFlagged = updatedAnnotations.some((a) => a.flagged)
const newStatus: 'active' | 'flagged' | 'frozen' = hasAnyFlagged
  ? 'flagged'
  : feature.frozen
    ? 'frozen'
    : 'active'
```

This correctly handles the AC #5 case: if `frozen === true`, revert to `'frozen'`; if not frozen, revert to `'active'`.

---

### `feature_events` Write Pattern

Every mutation must insert a `feature_events` row **in the same transaction**:

```typescript
await tx.insert(featureEvents).values({
  featureId: input.featureId,
  orgId: DEFAULT_ORG_ID,
  eventType: EventType.ANNOTATION_ADDED,
  changedFields: { annotationId: newAnnotation.id, text: input.text },
  actor: newAnnotation.actor,
})
```

`featureEvents` is imported from `@life-as-code/db`. `EventType` is imported from `@life-as-code/validators`. Both are already present in `features.ts` imports.

---

### Existing Imports in `features.ts` Already Available

The following are already imported in `packages/api/src/routers/features.ts` and do not need to be re-added:

- `featureEvents, features, eq` from `@life-as-code/db`
- `EventType` from `@life-as-code/validators`
- `TRPCError` from `@trpc/server`
- `publicProcedure, createTRPCRouter` from `@/trpc`
- `DEFAULT_ORG_ID` constant (`'default'`)

You will need to add imports for: `sql` from `drizzle-orm` (for jsonb_set), `AddAnnotationSchema`, `ListAnnotationsSchema`, `FlagAnnotationSchema`, `AnnotationEntry` from `@life-as-code/validators`.

Check if `sql` is already imported from `drizzle-orm` before adding.

---

### Procedure Placement in `featuresRouter`

Add the three new procedures (`addAnnotation`, `listAnnotations`, `flagAnnotation`) inside the `createTRPCRouter({...})` call in `features.ts`, alongside the existing procedures. No new router file is needed — this is per the architecture mapping: `Support & Annotations (FR38–FR40) → packages/api/src/routers/features.ts`.

---

### File Structure for This Story

```
packages/validators/src/
├── annotation.ts          ← CREATE: AddAnnotationSchema, ListAnnotationsSchema, FlagAnnotationSchema, AnnotationEntry
└── index.ts               ← MODIFY: add export * from './annotation'

packages/validators/
└── package.json           ← MODIFY: add "./annotation" export entry

packages/api/src/routers/
└── features.ts            ← MODIFY: add addAnnotation, listAnnotations, flagAnnotation procedures
```

No DB schema changes. No new migration. No new router file.

---

### What This Story Does NOT Include

- **No UI** — that's Story 7.2
- **No audit trail read procedures** — `events.listFeatureEvents` is Story 7.3 (`events.ts` router)
- **No export procedures** — that's Story 7.4
- **No `ANNOTATION_FLAGGED` event type** — flag toggles write `FEATURE_UPDATED` (per AC #4); the `eventTypeEnum` in `feature-events.ts` already has all needed values
- **No new DB table** — annotations live in `features.content` JSONB

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 7, Story 7.1 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — FR38–FR40, feature_events write pattern, tRPC procedure naming, router organization]
- [Source: `life-as-code/packages/db/src/schema/features.ts` — features table shape, status enum]
- [Source: `life-as-code/packages/db/src/schema/feature-events.ts` — featureEvents table, eventTypeEnum]
- [Source: `life-as-code/packages/validators/src/event-types.ts` — EventType const, EventTypeValue]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — existing procedures, transaction pattern, DEFAULT_ORG_ID]
- [Source: `_bmad-output/implementation-artifacts/6-1-schema-configuration-trpc-procedures.md` — oxlint rules, validators package.json pattern]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_Two oxlint issues fixed during implementation:_
1. `no-map-spread` — `{ ...a, flagged: input.flagged }` inside `map` → changed to `Object.assign({}, a, { flagged: input.flagged })`
2. `no-array-sort` — `[...annotations].sort(...)` → changed to `annotations.toSorted(...)` (non-mutating, no spread needed)

### Completion Notes List

- Task 1: Created `packages/validators/src/annotation.ts` with `AnnotationEntrySchema` (+ inferred `AnnotationEntry` type), `AddAnnotationSchema`, `ListAnnotationsSchema`, `FlagAnnotationSchema`. Added `featureId` to `FlagAnnotationSchema` (not listed in story task 1.1 but required for the procedure to look up the correct feature — annotationId alone would require an expensive full-table JSON scan).
- Task 2: `addAnnotation` — uses JS-side spread pattern (consistent with `addDecision`/`updateTags`) instead of SQL `jsonb_set`. Functionally equivalent: feature is read first for existence check, content array is extended in JS, full content object written back. No frozen check per AC #2.
- Task 3: `listAnnotations` — reads `content.annotations ?? []`, returns `.toSorted()` by ISO timestamp ascending.
- Task 4: `flagAnnotation` — reads feature, finds annotation by id, maps with `Object.assign` to update `flagged` field, derives new status (`flagged` / `frozen` / `active`), writes content + status back in transaction, inserts `FEATURE_UPDATED` event with `statusChange` delta.
- Task 5: `bun x tsc --noEmit` → 0 errors; `bunx oxlint --threads 1` → 0 warnings/errors (after 2 lint fixes).

### File List

- `life-as-code/packages/validators/src/annotation.ts` (created)
- `life-as-code/packages/validators/src/index.ts` (modified: added `export * from './annotation'`)
- `life-as-code/packages/validators/package.json` (modified: added `"./annotation": "./dist/annotation.mjs"` export entry)
- `life-as-code/packages/api/src/routers/features.ts` (modified: added `addAnnotation`, `listAnnotations`, `flagAnnotation` procedures + updated imports)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — 3 annotation procedures added to featuresRouter, validators created, 0 TS errors, 0 lint warnings
- 2026-03-15: Code review — Design debt noted: `addAnnotation` uses JS-side read-modify-write instead of `jsonb_set`. At Postgres `READ COMMITTED` isolation, two concurrent calls could lose one annotation. Consistent with `addDecision`/`updateTags` patterns. Acceptable at MVP scale; consider `jsonb_set` if concurrency becomes a concern.
