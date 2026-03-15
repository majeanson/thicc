# Story 6.3: Schema Change Propagation & Feature Flagging

Status: done

## Story

As an admin,
I want the system to flag existing features when I add a new required field to the schema,
So that the team knows which features need updating and non-required changes never break existing features.

## Acceptance Criteria

1. **Given** an admin adds a new required field to the schema and saves, **When** `features.admin.updateSchema` completes, **Then** a scan runs across all existing features and flags any feature missing the new required field — setting `status: 'flagged'` on each affected feature and writing an `ANNOTATION_ADDED` event with message `"New required field added: [fieldName]"`

2. **Given** features are flagged after a schema change, **When** a user views the feature list or tree, **Then** flagged features display the `FeatureStateBadge` in amber ⚑ "Needs attention" state

3. **Given** a user opens a flagged feature in the wizard, **When** it loads, **Then** the new required field is highlighted with an amber border and an inline note: "This field was added to the schema after this feature was created — please complete it"

4. **Given** the flagged feature's new required field is filled and the stage saved, **When** the save succeeds, **Then** the feature's `status` reverts from `'flagged'` to `'active'` and the amber badge is cleared

5. **Given** a non-required field change (standard or custom) is made to the schema, **When** the schema is saved, **Then** no existing features are flagged or altered

6. **Given** a required field is disabled in the schema, **When** the schema is saved, **Then** no existing features are flagged — existing data for that field is preserved in JSONB and the field simply stops being enforced

## Tasks / Subtasks

- [x] Task 1: Add 'flagged' to status enum and generate migration (AC: #1, #2, #4)
  - [x] 1.1 In `packages/db/src/schema/features.ts`, add `'flagged'` to `statusEnum`: `pgEnum('status', ['active', 'draft', 'frozen', 'flagged'])`
  - [x] 1.2 Run `cd packages/db && bunx drizzle-kit generate` — generates `packages/db/drizzle/0001_lonely_the_executioner.sql` with `ALTER TYPE "public"."status" ADD VALUE 'flagged'`
  - [x] 1.3 Run `cd packages/db && bunx drizzle-kit migrate` — applies migration to the live database
  - [x] 1.4 Run `cd packages/db && bun run build` — rebuilds `@life-as-code/db` to include `'flagged'` in the `Feature.status` type

- [x] Task 2: Extend `updateSchema` mutation with propagation scan (AC: #1, #5, #6)
  - [x] 2.1 In `packages/api/src/routers/admin.ts`, add `features` and `and` to the `@life-as-code/db` import (currently imports `desc, eq, featureEvents, schemaConfigs`)
  - [x] 2.2 Before the schema upsert, parse the OLD schema config: `const oldConfig = existing ? (SchemaConfigContentSchema.safeParse(existing.config).data ?? DEFAULT_SCHEMA_CONFIG) : DEFAULT_SCHEMA_CONFIG`
  - [x] 2.3 After SCHEMA_UPDATED event, compute newly-required fields: build `oldEnabledRequired` Set from `oldConfig.requiredFields` where `f.enabled === true`; then `newlyRequiredFields = input.config.requiredFields.filter(f => f.enabled && !oldEnabledRequired.has(f.name))`
  - [x] 2.4 If `newlyRequiredFields.length > 0`: SELECT all features where `orgId = DEFAULT_ORG_ID AND frozen = false` — use `and(eq(features.orgId, DEFAULT_ORG_ID), eq(features.frozen, false))`
  - [x] 2.5 For each feature: flatten all stage content values; compute `missingFields`; if `missingFields.length > 0` AND `feature.status !== 'flagged'`: collect UPDATE + INSERT ops into `flagOps[]`, then `await Promise.all(flagOps)`
  - [x] 2.6 Return `updated` (unchanged return type)

- [x] Task 3: Update `updateStage` to auto-clear 'flagged' status (AC: #4)
  - [x] 3.1 In `packages/api/src/routers/features.ts`, add `schemaConfigs` to the `@life-as-code/db` import; add `DEFAULT_SCHEMA_CONFIG, SchemaConfigContentSchema` to the `@life-as-code/validators` import
  - [x] 3.2 Inside the `updateStage` transaction, before building `updatedContent`, if `existing.status === 'flagged'`: fetch active schema from `schemaConfigs`, compute `enabledRequired = schemaConfig.requiredFields.filter(f => f.enabled)`, flatten prospective content field values, check `allFilled = enabledRequired.every(...)`
  - [x] 3.3 Set `targetStatus = allFilled ? 'active' : existing.status`; include `status: targetStatus` in the `.set({...})` clause of the UPDATE so both content and status change in a single query

- [x] Task 4: Rebuild packages/api (AC: all backend)
  - [x] 4.1 Run `cd packages/api && bun run build` — exposes updated `updateSchema` and `updateStage` procedures

- [x] Task 5: Update FeatureStateBadge to handle 'flagged' state (AC: #2)
  - [x] 5.1 In `apps/nextjs/components/features/feature-state-badge.tsx`, update `status` prop type to `'active' | 'draft' | 'frozen' | 'flagged'`
  - [x] 5.2 Add `flagged` entry to `STATE_STYLES`: `{ className: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300', label: 'Needs attention', icon: '⚑' }`
  - [x] 5.3 The state resolution `const state = frozen ? 'frozen' : status` already handles 'flagged' correctly — no change needed there

- [x] Task 6: Add `schemaAlert` prop to WizardStep (AC: #3)
  - [x] 6.1 In `apps/nextjs/components/wizard/wizard-step.tsx`, add `schemaAlert?: string` to `WizardStepProps`
  - [x] 6.2 When `schemaAlert` is set, change the textarea `className` to use `border-amber-400 focus-visible:ring-amber-400` instead of `border-input focus-visible:ring-ring`
  - [x] 6.3 Render amber-styled paragraph after the textarea: `<p className="text-sm text-amber-600 dark:text-amber-400">⚑ {schemaAlert}</p>` — only when `schemaAlert` is truthy AND `validationError` is falsy (validation error takes priority)

- [x] Task 7: Update WizardShell to compute and pass schema alerts (AC: #3)
  - [x] 7.1 In `apps/nextjs/components/wizard/wizard-shell.tsx`, add `useQuery(trpc.features.admin.getActiveSchema.queryOptions({}))` alongside `featureQuery`
  - [x] 7.2 Compute `schemaAlert` inline IIFE: when feature is `'flagged'` AND schema loaded AND fieldKey is enabled-required AND field is empty → return alert string; else bare `return` (no-useless-undefined compliance)
  - [x] 7.3 Pass `schemaAlert={schemaAlert}` to the `<WizardStep>` render

- [x] Task 8: Typecheck and lint (AC: all)
  - [x] 8.1 `bun x tsc --noEmit` from `apps/nextjs` — confirmed 0 errors
  - [x] 8.2 `bunx oxlint --threads 1` from repo root — confirmed 0 warnings/errors

## Dev Notes

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

TypeScript check: `bun x tsc --noEmit` from `apps/nextjs`. Lint: `bunx oxlint --threads 1` from repo root.

---

### CRITICAL: statusEnum — 'flagged' Is NOT in the DB Yet

The current `packages/db/src/schema/features.ts`:
```typescript
export const statusEnum = pgEnum('status', ['active', 'draft', 'frozen'])
```

Change to:
```typescript
export const statusEnum = pgEnum('status', ['active', 'draft', 'frozen', 'flagged'])
```

Then run `bunx drizzle-kit generate` (reads TypeScript schema, generates SQL diff) → then `bunx drizzle-kit migrate` (applies to DB). Both run from `packages/db`. The generated SQL will be:
```sql
ALTER TYPE "public"."status" ADD VALUE 'flagged';
```

Do NOT manually edit migration files — always use `drizzle-kit generate`.

---

### CRITICAL: Immutability Trigger Blocks Frozen Feature Updates

The DB trigger `enforce_feature_immutability` raises an exception if `OLD.frozen = true` on any UPDATE. **Never attempt to UPDATE a frozen feature's status.** The propagation scan in Task 2 must filter frozen features out:
```typescript
and(eq(features.orgId, DEFAULT_ORG_ID), eq(features.frozen, false))
```

---

### CRITICAL: updateStage Must Set status In the Same UPDATE

Do NOT do a separate UPDATE to change status. Compute `targetStatus` before the UPDATE, then include it in the `.set()` clause:

```typescript
// Inside updateStage transaction, before the existing UPDATE:
let targetStatus = existing.status

if (existing.status === 'flagged') {
  const schemaRows = await tx
    .select()
    .from(schemaConfigs)
    .where(eq(schemaConfigs.orgId, DEFAULT_ORG_ID))
    .orderBy(desc(schemaConfigs.updatedAt))
    .limit(1)

  const schemaConfig = schemaRows[0]
    ? (SchemaConfigContentSchema.safeParse(schemaRows[0].config).data ?? DEFAULT_SCHEMA_CONFIG)
    : DEFAULT_SCHEMA_CONFIG

  const enabledRequired = schemaConfig.requiredFields.filter((f) => f.enabled)

  // Build updated content to check against (what will be in DB after this save)
  const prospectiveContent = {
    ...(existing.content as Record<string, Record<string, unknown>>),
    [input.stage]: input.stageContent,
  }

  const allFieldValues = Object.values(prospectiveContent).reduce<Record<string, unknown>>(
    (acc, stage) => (typeof stage === 'object' && stage !== null ? { ...acc, ...(stage as Record<string, unknown>) } : acc),
    {},
  )

  const allFilled = enabledRequired.every((f) => {
    const v = allFieldValues[f.name]
    return v && (typeof v !== 'string' || v.trim().length > 0)
  })

  if (allFilled) targetStatus = 'active'
}

// THEN the existing UPDATE — add status: targetStatus to the set()
const [updated] = await tx
  .update(features)
  .set({ content: updatedContent, status: targetStatus, updatedAt: new Date() })
  .where(eq(features.id, input.featureId))
  .returning()
```

If `enabledRequired` is empty (no required fields in schema), `allFilled` will be `true` (vacuous truth) — this is correct behaviour, the feature un-flags immediately.

---

### CRITICAL: updateSchema — Get OLD Schema BEFORE the Upsert

The propagation diff requires the previous schema. Get it from the first SELECT in the existing transaction (already done via `const existing = rows[0]`). Parse it:

```typescript
const oldConfig = existing
  ? (SchemaConfigContentSchema.safeParse(existing.config).data ?? DEFAULT_SCHEMA_CONFIG)
  : DEFAULT_SCHEMA_CONFIG
```

This must happen BEFORE the upsert so `existing` is still the pre-update row.

---

### CRITICAL: Propagation Uses Field `name`, Not Field `key`

Schema fields have a `name` property (e.g., `'problemStatement'`). Feature JSONB content stores values keyed by the same names. The match is `field.name === content[stageName][fieldName]`. The flatten approach:

```typescript
const content = (feature.content as Record<string, Record<string, unknown>>) ?? {}
const allFieldValues = Object.values(content).reduce<Record<string, unknown>>(
  (acc, stage) =>
    typeof stage === 'object' && stage !== null
      ? { ...acc, ...(stage as Record<string, unknown>) }
      : acc,
  {},
)

const missingFields = newlyRequiredFields.filter((field) => {
  const v = allFieldValues[field.name]
  return !v || (typeof v === 'string' && !v.trim())
})
```

---

### CRITICAL: `adminRouter` Imports — Add `features` and `and`

Current `admin.ts` import:
```typescript
import { desc, eq, featureEvents, schemaConfigs } from '@life-as-code/db'
```

New import (add `features`, `and`):
```typescript
import { and, desc, eq, featureEvents, features, schemaConfigs } from '@life-as-code/db'
```

---

### CRITICAL: `features.ts` Imports — Add `schemaConfigs` and Validator Types

Current `features.ts` DB import:
```typescript
import { featureEvents, features, and, desc, eq, like, ne } from '@life-as-code/db'
```

Add `schemaConfigs`:
```typescript
import { featureEvents, features, and, desc, eq, like, ne, schemaConfigs } from '@life-as-code/db'
```

Current validators import (partial):
```typescript
import { ..., UpdateStageSchema, ... } from '@life-as-code/validators'
```

Add `DEFAULT_SCHEMA_CONFIG, SchemaConfigContentSchema`:
```typescript
import { ..., DEFAULT_SCHEMA_CONFIG, SchemaConfigContentSchema, UpdateStageSchema, ... } from '@life-as-code/validators'
```

---

### CRITICAL: oxlint Rules (All Previous Stories)

1. **`type="button"`** on all `<button>` / `<Button>` elements
2. **No `!` non-null assertion** — use optional chaining or `?? fallback`
3. **`void` prefix** on floating Promises
4. **No async outer mutation callbacks** — use `onSuccess`/`onError` options object
5. **`prefer-dom-node-append`** / **`prefer-dom-node-remove`**
6. **kebab-case filenames** — no PascalCase file names (existing files keep their names; don't rename them)

---

### WizardStep schemaAlert Implementation

In `wizard-step.tsx`, add `schemaAlert?: string` and apply conditionally:

```tsx
// Props interface addition:
schemaAlert?: string

// Textarea className change — when schemaAlert is set (and no validationError):
className={`w-full resize-none rounded-md border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 [field-sizing:content] ${
  validationError
    ? 'border-destructive focus-visible:ring-destructive'
    : schemaAlert
    ? 'border-amber-400 focus-visible:ring-amber-400'
    : 'border-input focus-visible:ring-ring'
}`}

// After textarea, before the footer div:
{!validationError && schemaAlert && (
  <p className="text-sm text-amber-600 dark:text-amber-400">
    ⚑ {schemaAlert}
  </p>
)}
```

---

### WizardShell Schema Alert Query

The `getActiveSchema` query is cheap (cached by TanStack Query). Add it alongside `featureQuery`:

```typescript
const activeSchemaQuery = useQuery(trpc.features.admin.getActiveSchema.queryOptions({}))
```

Compute the alert inline before the JSX return:
```typescript
const schemaAlert: string | undefined = (() => {
  if (featureQuery.data?.status !== 'flagged') return undefined
  if (!activeSchemaQuery.data) return undefined
  const isRequiredBySchema = activeSchemaQuery.data.config.requiredFields.some(
    (f) => f.enabled && f.name === fieldKey,
  )
  if (!isRequiredBySchema) return undefined
  if ((localStageValue ?? stageValue).trim()) return undefined
  return 'This field was added to the schema after this feature was created — please complete it'
})()
```

Pass `schemaAlert={schemaAlert}` to `<WizardStep>`.

---

### Rebuild Chain After DB Changes

Order matters:
1. `cd packages/db && bun run build` — after schema enum change
2. `cd packages/api && bun run build` — after admin.ts + features.ts changes
3. `bun x tsc --noEmit` from `apps/nextjs` — catches any type errors

---

### FeatureStateBadge STATE_STYLES — Full Updated Map

```typescript
const STATE_STYLES = {
  frozen: {
    className: 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-300',
    label: 'Frozen',
    icon: '✦',
  },
  active: {
    className: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-300',
    label: 'Active',
    icon: '●',
  },
  draft: {
    className: 'text-muted-foreground bg-muted',
    label: 'Draft',
    icon: '○',
  },
  flagged: {
    className: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-300',
    label: 'Needs attention',
    icon: '⚑',
  },
} as const
```

The `const state = frozen ? 'frozen' : status` logic is unchanged. The `STATE_STYLES[state]` lookup will now include 'flagged'.

---

### No New Vitest Tests Required

This story has no new Zod schema changes (validators unchanged). The `packages/db` tests only cover `SchemaConfigContentSchema` — they remain valid. No new unit tests are required by this story.

---

### What This Story Does NOT Include

- **No feature templates** — that's Story 6.4
- **No admin role enforcement** — MVP uses publicProcedure
- **No bulk unflag operation** — features revert individually via `updateStage`
- **No amber highlighting in WizardCanvas (fast/expert mode)** — only WizardStep (focus/guided mode) per AC3 scope
- **No `updateFeatureJson` flagging logic** — JSON editor saves do not trigger status revert in this story (wizard save via `updateStage` is the primary unflag path)

---

### File Structure for This Story

```
packages/
├── db/
│   ├── src/schema/
│   │   └── features.ts                ← MODIFY: add 'flagged' to statusEnum
│   └── drizzle/
│       └── 0001_*.sql                 ← GENERATED: ALTER TYPE ADD VALUE 'flagged'
├── api/
│   └── src/routers/
│       ├── admin.ts                   ← MODIFY: propagation scan in updateSchema
│       └── features.ts                ← MODIFY: status revert in updateStage
apps/nextjs/
└── components/
    ├── features/
    │   └── feature-state-badge.tsx    ← MODIFY: add 'flagged' state
    └── wizard/
        ├── wizard-step.tsx            ← MODIFY: add schemaAlert prop
        └── wizard-shell.tsx           ← MODIFY: fetch getActiveSchema, compute/pass schemaAlert
```

---

### Previous Story Intelligence (Story 6.2)

- `getActiveSchema` is at `trpc.features.admin.getActiveSchema` (nested under `features.admin.*`)
- `packages/api` dist must be rebuilt after any changes to routers (`bun run build` from `packages/api`)
- **kebab-case filenames** are enforced by oxlint — existing files (`feature-state-badge.tsx`, `wizard-step.tsx`, `wizard-shell.tsx`) already comply
- **`no-array-index-key`** — not relevant here (no new list rendering with keys)

---

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 6, Story 6.3 — Full BDD acceptance criteria]
- [Source: `life-as-code/packages/db/src/schema/features.ts` — statusEnum, Feature type]
- [Source: `life-as-code/packages/db/drizzle/0000_wide_zzzax.sql` — migration format reference]
- [Source: `life-as-code/packages/api/src/routers/admin.ts` — existing updateSchema implementation]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — updateStage, existing patterns]
- [Source: `life-as-code/apps/nextjs/components/features/feature-state-badge.tsx` — STATE_STYLES, props type]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-step.tsx` — WizardStep props, render]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` — WizardStep usage, featureQuery]
- [Source: `_bmad-output/implementation-artifacts/6-1-schema-configuration-trpc-procedures.md` — SchemaField types, DEFAULT_SCHEMA_CONFIG, transaction patterns]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- **`no-await-in-loop`**: `admin.ts` propagation loop used sequential `await` inside `for...of`. Fixed by collecting all update/insert operations into a `flagOps: Promise<unknown>[]` array and calling `await Promise.all(flagOps)` after the loop.
- **`no-accumulating-spread`**: Both `admin.ts` and `features.ts` used spread accumulator in `reduce`. Fixed by switching to `Object.assign(acc, stage)` with explicit `return acc`.
- **`no-useless-undefined`**: IIFE in `wizard-shell.tsx` used `return undefined`. Fixed by bare `return` (empty return in `string | undefined` context).
- **Cascading `'flagged'` type errors**: Adding `'flagged'` to DB `statusEnum` caused TypeScript errors in `feature-card.tsx`, `feature-list.tsx`, `home-overview.tsx`, `search-overlay.tsx`, `search-page-client.tsx`. Fixed by: (1) updating `feature-card.tsx` inline status type, (2) adding `'flagged'` to `SearchResultItemSchema` and `SearchFilterSchema` in validators `search.ts`, (3) updating the raw SQL cast in `packages/api/src/routers/search.ts` line 68, (4) rebuilding validators and api.

### Completion Notes List

- Task 1: Added `'flagged'` to `statusEnum` in `packages/db/src/schema/features.ts`. Ran `bunx drizzle-kit generate` (generated `0001_lonely_the_executioner.sql` with `ALTER TYPE "public"."status" ADD VALUE 'flagged'`). Ran `bunx drizzle-kit migrate` — applied to live DB. Rebuilt `packages/db`.
- Task 2: Extended `updateSchema` in `admin.ts` — added `features`, `and` imports; parses OLD config before upsert; computes `newlyRequiredFields` diff; selects all non-frozen features; collects flag+event promises in `flagOps[]`; `await Promise.all(flagOps)`. Used `Object.assign` for accumulator (oxlint compliance).
- Task 3: Updated `updateStage` in `features.ts` — added `schemaConfigs`, `DEFAULT_SCHEMA_CONFIG`, `SchemaConfigContentSchema` imports; when `existing.status === 'flagged'`, fetches active schema, builds prospective content, checks all enabled-required fields; sets `targetStatus` (auto-reverts to `'active'` when all filled); includes `status: targetStatus` in single UPDATE.
- Task 4: Rebuilt `packages/api`.
- Task 5: Updated `feature-state-badge.tsx` — added `'flagged'` to props type and `STATE_STYLES` with amber styling. Also updated `feature-card.tsx` inline type and `packages/validators/src/search.ts` (cascading fix). Rebuilt validators and api.
- Task 6: Added `schemaAlert?: string` to `WizardStepProps`; conditional amber textarea border + amber paragraph after textarea (validation error takes priority).
- Task 7: Added `activeSchemaQuery` to `wizard-shell.tsx`; computed `schemaAlert` via IIFE (bare `return` for no-useless-undefined); passed to `<WizardStep>`.
- Task 8: `bun x tsc --noEmit` → 0 errors; `bunx oxlint --threads 1` → 0 warnings/errors.

### File List

- `life-as-code/packages/db/src/schema/features.ts` (modified: add 'flagged' to statusEnum)
- `life-as-code/packages/db/drizzle/0001_lonely_the_executioner.sql` (generated: ALTER TYPE ADD VALUE 'flagged')
- `life-as-code/packages/db/drizzle/meta/_journal.json` (auto-generated: added 0001 entry)
- `life-as-code/packages/db/drizzle/meta/0001_snapshot.json` (auto-generated: drizzle-kit snapshot)
- `life-as-code/packages/db/dist/schema/index.mjs` (rebuilt)
- `life-as-code/packages/db/dist/schema/index.d.mts` (rebuilt)
- `life-as-code/packages/validators/src/search.ts` (modified: add 'flagged' to SearchResultItemSchema and SearchFilterSchema)
- `life-as-code/packages/validators/dist/search.mjs` (rebuilt)
- `life-as-code/packages/validators/dist/search.d.mts` (rebuilt)
- `life-as-code/packages/api/src/routers/admin.ts` (modified: propagation scan in updateSchema)
- `life-as-code/packages/api/src/routers/features.ts` (modified: status revert in updateStage)
- `life-as-code/packages/api/src/routers/search.ts` (modified: add 'flagged' to raw SQL cast type)
- `life-as-code/packages/api/dist/index.mjs` (rebuilt)
- `life-as-code/packages/api/dist/index.d.mts` (rebuilt)
- `life-as-code/apps/nextjs/components/features/feature-state-badge.tsx` (modified: add 'flagged' state)
- `life-as-code/apps/nextjs/components/features/feature-card.tsx` (modified: add 'flagged' to inline status type)
- `life-as-code/apps/nextjs/components/wizard/wizard-step.tsx` (modified: add schemaAlert prop)
- `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` (modified: fetch getActiveSchema, compute/pass schemaAlert)

## Change Log

- 2026-03-15: Story created by claude-sonnet-4-6
- 2026-03-15: Story implemented by claude-sonnet-4-6 — DB migration applied ('flagged' status), updateSchema propagation scan, updateStage auto-clear, FeatureStateBadge + WizardStep + WizardShell updated, cascading type fixes across feature-card/search/validators, 0 TS errors, 0 lint warnings
- 2026-03-15: Code review pass — added drizzle meta files to File List (M2, M3)
