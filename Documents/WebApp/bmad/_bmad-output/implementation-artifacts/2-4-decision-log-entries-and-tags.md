# Story 2.4: Decision Log Entries & Tags

Status: done

## Story

As a developer or product manager,
I want to add timestamped decision log entries and tags to features while in the wizard,
So that the reasoning behind design choices is captured in context and features are discoverable by category.

## Acceptance Criteria

1. **Given** a user is on any lifecycle stage in the wizard, **When** they click "Add Decision", **Then** an inline form appears with fields for: what was decided, why, and alternatives considered — all within the current stage context

2. **Given** a decision entry is submitted, **When** `features.addDecision` is called, **Then** the decision is stored with a timestamp in the feature's `content` JSONB under the correct stage (as `content[stage].decisions[]`), a `STAGE_UPDATED` event is written to `feature_events`, and the entry renders inline as a `DecisionLogEntry` component with left accent border and author/timestamp metadata

3. **Given** multiple decisions exist on a stage, **When** the stage is viewed, **Then** all decision entries render in chronological order, each with its what/why/alternatives and a `<time>` element for the timestamp

4. **Given** the tag input on a feature, **When** a user types a tag name and presses Enter or comma, **Then** the tag is added to the feature's `content.tags` array, saved via `features.updateTags`, and renders as a badge in the tag input component

5. **Given** a tag is added, **When** the user clicks the ✕ on the tag badge, **Then** the tag is removed from the feature, the change is persisted, and a `STAGE_UPDATED` event is logged to `feature_events`

## Tasks / Subtasks

- [x] Task 1: Add validators for decision log and tags (AC: #2, #4)
  - [x] 1.1 In `packages/validators/src/feature.ts`, add `DecisionEntrySchema`: `{ what: z.string().min(1), why: z.string().min(1), alternatives: z.string().optional() }`
  - [x] 1.2 Add `AddDecisionSchema`: `{ featureId: z.string().min(1), stage: z.enum(LIFECYCLE_STAGES), entry: DecisionEntrySchema }`
  - [x] 1.3 Add `UpdateTagsSchema`: `{ featureId: z.string().min(1), tags: z.array(z.string().min(1).max(50)).max(10) }`
  - [x] 1.4 Export `DecisionEntry` type: `z.infer<typeof DecisionEntrySchema> & { id: string; createdAt: string; actor: string }`
  - [x] 1.5 Export type aliases: `AddDecisionInput`, `UpdateTagsInput`
  - [x] 1.6 Run `bun run build` in `packages/validators` — 0 errors

- [x] Task 2: Add `addDecision` and `updateTags` tRPC procedures (AC: #2, #4, #5)
  - [x] 2.1 In `packages/api/src/routers/features.ts`, import `AddDecisionSchema`, `UpdateTagsSchema` from `@life-as-code/validators`
  - [x] 2.2 Add `addDecision` procedure: fetch → check frozen → append entry to `content[stage].decisions[]` → write `STAGE_UPDATED` event → return updated feature (see Dev Notes for exact pattern)
  - [x] 2.3 Add `updateTags` procedure: fetch → check frozen → set `content.tags` → write `STAGE_UPDATED` event → return updated feature
  - [x] 2.4 Use `crypto.randomUUID()` server-side for decision entry ID generation — no external dependency needed
  - [x] 2.5 Run `bun x tsc --noEmit` in `apps/nextjs` — 0 errors

- [x] Task 3: Create `decision-log-entry.tsx` — single decision display (AC: #2, #3)
  - [x] 3.1 Create `apps/nextjs/components/wizard/decision-log-entry.tsx` (`"use client"`)
  - [x] 3.2 Props: `entry: DecisionEntry` (imported from `@life-as-code/validators`)
  - [x] 3.3 Wrapper: `role="article"` with left accent border `border-l-2 border-primary pl-3`
  - [x] 3.4 "DECISION" label: uppercase, `text-xs text-muted-foreground font-medium mb-1`
  - [x] 3.5 `entry.what` text: `text-sm`
  - [x] 3.6 "Why" row: muted `text-xs text-muted-foreground` label + `entry.why` text
  - [x] 3.7 "Alternatives" row: conditional, only render when `entry.alternatives` is non-empty
  - [x] 3.8 Metadata footer: `entry.actor` + `<time dateTime={entry.createdAt}>` with formatted date — use `new Date(entry.createdAt).toLocaleDateString()` for MVP

- [x] Task 4: Create `decision-log-panel.tsx` — form + list for a stage (AC: #1, #2, #3)
  - [x] 4.1 Create `apps/nextjs/components/wizard/decision-log-panel.tsx` (`"use client"`)
  - [x] 4.2 Props: `featureId: string, stage: LifecycleStage, decisions: DecisionEntry[]`
  - [x] 4.3 Local state: `isFormOpen: boolean` (false), `what: string`, `why: string`, `alternatives: string`
  - [x] 4.4 "Add Decision" button: `variant="ghost"` `size="sm"`, toggles `isFormOpen`
  - [x] 4.5 Inline form (when `isFormOpen`): `<textarea>` fields for what (required), why (required), alternatives (optional) — same `field-sizing: content` pattern as `wizard-canvas.tsx`
  - [x] 4.6 Form: "Submit" button calls `addDecisionMutation.mutate(...)`, "Cancel" button closes form + resets state
  - [x] 4.7 Use `useMutation(trpc.features.addDecision.mutationOptions())` with `onSuccess` that invalidates `getFeature` query + resets form (see Dev Notes for pattern)
  - [x] 4.8 Decision list: renders `<DecisionLogEntry>` for each in `decisions` array, chronological (array order)
  - [x] 4.9 Show nothing for empty decisions except the "Add Decision" button

- [x] Task 5: Create `tag-input.tsx` — tag badges + input (AC: #4, #5)
  - [x] 5.1 Create `apps/nextjs/components/wizard/tag-input.tsx` (`"use client"`)
  - [x] 5.2 Props: `featureId: string, tags: string[]`
  - [x] 5.3 Local state: `inputValue: string`
  - [x] 5.4 On `keydown` Enter or comma: trim input, skip empty/duplicate, call `updateTagsMutation.mutate({ featureId, tags: [...tags, trimmedTag] })`, clear `inputValue`
  - [x] 5.5 ✕ dismiss: `updateTagsMutation.mutate({ featureId, tags: tags.filter(t => t !== tag) })`
  - [x] 5.6 Render each tag as a flex chip: `<span>` + tag text + `<button aria-label="Remove tag: {tag}">✕</button>`
  - [x] 5.7 Counter: show `{tags.length}/10` in `text-xs text-muted-foreground` when `tags.length >= 8`
  - [x] 5.8 Max 10: disable `<input>` and hide it when `tags.length >= 10`
  - [x] 5.9 Use `useMutation(trpc.features.updateTags.mutationOptions())` with `onSuccess` invalidating `getFeature` query
  - [x] 5.10 Wrapper: `role="group"` `aria-label="Feature tags"`, input: `aria-label="Add tag, press Enter or comma to confirm"`
  - [x] 5.11 Prevent comma from appearing in input: call `e.preventDefault()` before adding tag on comma keydown

- [x] Task 6: Update `wizard-shell.tsx` — wire panels + fix Focus Mode regression (AC: all)
  - [x] 6.1 **CRITICAL**: Fix `handleContentChange` to merge existing stage content — prevents wiping decisions on Focus Mode save (see Dev Notes for exact code)
  - [x] 6.2 Add `content` to `handleContentChange` useCallback dependency array
  - [x] 6.3 Import `DecisionLogPanel` and `TagInput`
  - [x] 6.4 Derive `decisions` for current stage: `(content?.[currentStage]?.decisions as DecisionEntry[]) ?? []`
  - [x] 6.5 Derive `tags`: `(content?.tags as string[]) ?? []`
  - [x] 6.6 Add tags strip between stage tabs and main content area (see Dev Notes for layout JSX)
  - [x] 6.7 Wrap Focus Mode content: `renderStep()` + `<DecisionLogPanel>` in a `flex-col` div
  - [x] 6.8 Wrap Fast Mode content: `<WizardCanvas>` + `<DecisionLogPanel>` in a `flex-col` div (below completion level control + canvas)
  - [x] 6.9 Run `bun x tsc --noEmit` in `apps/nextjs` — 0 errors

- [x] Task 7: Verification (AC: all)
  - [x] 7.1 `bun x tsc --noEmit` in `apps/nextjs` — 0 errors (run `bun run build` in `packages/validators` first if type errors)
  - [x] 7.2 `bunx oxlint --threads 1` from root — 0 errors

## Dev Notes

### CRITICAL: File Naming is kebab-case (NOT PascalCase)

`unicorn/filename-case` enforces kebab-case for ALL files (established in Stories 2.1–2.3). New files:
- `decision-log-entry.tsx` ✓
- `decision-log-panel.tsx` ✓
- `tag-input.tsx` ✓

---

### CRITICAL: Focus Mode Regression Fix Required

**Existing `handleContentChange` WILL wipe `decisions[]` on every Focus Mode keystroke save!**

Current pattern (broken with decisions):
```typescript
stageContent: { [fieldKey]: value }  // replaces entire stage → wipes decisions[]
```

Required fix (Task 6.1):
```typescript
const handleContentChange = useCallback(
  (value: string) => {
    setSaveState('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const fieldKey = STAGE_FIELD_KEY[currentStage]
      const existingStageContent = (content?.[currentStage] as Record<string, unknown>) ?? {}
      updateStageMutation.mutate(
        { featureId, stage: currentStage, stageContent: { ...existingStageContent, [fieldKey]: value } },
        {
          onSuccess: () => setSaveState('saved'),
          onError: () => setSaveState('error'),
        },
      )
    }, 500)
  },
  [currentStage, featureId, content, setSaveState, updateStageMutation],
)
```

**Why Fast Mode is safe**: `handleFastModeFieldChange` already spreads `existingStageContent`. Focus Mode does not — this story introduces the regression trigger.

---

### CRITICAL: Decision Storage Format in JSONB

Decisions stored PER STAGE within `content` JSONB:
```
content = {
  problem: {
    problemStatement: "...",
    decisions: [
      { id: "uuid-...", what: "Use ULID not UUID", why: "URL-safe, sortable", alternatives: "UUID v4", createdAt: "2026-03-14T...", actor: "anonymous" }
    ]
  },
  analysis: { analysisNotes: "...", decisions: [] },
  tags: ["backend", "mvp", "auth"]   ← top-level, not inside any stage
}
```

- `content[stage].decisions` — per-stage array, chronological order
- `content.tags` — feature-level string array, NOT inside any stage object

---

### `addDecision` tRPC Procedure — Exact Pattern

```typescript
addDecision: publicProcedure
  .input(AddDecisionSchema)
  .mutation(({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      const existing = await tx.query.features.findFirst({
        where: eq(features.id, input.featureId),
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
      if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Feature is frozen' })

      const existingContent = (existing.content as Record<string, unknown>) ?? {}
      const existingStageContent = (existingContent[input.stage] as Record<string, unknown>) ?? {}
      const existingDecisions = (existingStageContent.decisions as DecisionEntry[]) ?? []

      const newEntry: DecisionEntry = {
        id: crypto.randomUUID(),
        ...input.entry,
        createdAt: new Date().toISOString(),
        actor: ctx.session?.user?.name ?? 'anonymous',
      }

      const [updated] = await tx
        .update(features)
        .set({
          content: {
            ...existingContent,
            [input.stage]: { ...existingStageContent, decisions: [...existingDecisions, newEntry] },
          },
          updatedAt: new Date(),
        })
        .where(eq(features.id, input.featureId))
        .returning()

      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      await tx.insert(featureEvents).values({
        featureId: input.featureId,
        orgId: DEFAULT_ORG_ID,
        eventType: EventType.STAGE_UPDATED,
        changedFields: { stage: input.stage, decisionAdded: true },
        actor: ctx.session?.user?.name ?? 'anonymous',
      })

      return updated
    })
  }),
```

**Note**: `DecisionEntry` type must be imported from `@life-as-code/validators` in the API router.

---

### `updateTags` tRPC Procedure — Exact Pattern

```typescript
updateTags: publicProcedure
  .input(UpdateTagsSchema)
  .mutation(({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      const existing = await tx.query.features.findFirst({
        where: eq(features.id, input.featureId),
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Feature not found' })
      if (existing.frozen) throw new TRPCError({ code: 'FORBIDDEN', message: 'Feature is frozen' })

      const [updated] = await tx
        .update(features)
        .set({
          content: { ...(existing.content as Record<string, unknown>), tags: input.tags },
          updatedAt: new Date(),
        })
        .where(eq(features.id, input.featureId))
        .returning()

      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      await tx.insert(featureEvents).values({
        featureId: input.featureId,
        orgId: DEFAULT_ORG_ID,
        eventType: EventType.STAGE_UPDATED,
        changedFields: { tags: input.tags },
        actor: ctx.session?.user?.name ?? 'anonymous',
      })

      return updated
    })
  }),
```

---

### Tags: `updateTags` not `updateStage` — Architecture Decision

The epics AC says "saved via `features.updateStage`" but this is architecturally incorrect:
- Tags live at `content.tags` (feature-level) — not inside any lifecycle stage
- `UpdateStageSchema` requires `stage: z.enum(LIFECYCLE_STAGES)` — "tags" is not a valid stage
- Using `updateStage` for tags requires either a hack or polluting the lifecycle stage enum

**Decision**: Add `features.updateTags` procedure. Type-safe, clean, no hacks. `STAGE_UPDATED` event is still written (consistent audit trail).

---

### Query Invalidation Pattern for Panel Components

After `addDecision` or `updateTags` mutations succeed, invalidate `getFeature` to refresh displayed decisions/tags:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/react'

// Inside component:
const trpc = useTRPC()
const queryClient = useQueryClient()

const addDecisionMutation = useMutation({
  ...trpc.features.addDecision.mutationOptions(),
  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.features.getFeature.queryKey({ id: featureId }),
    })
    setIsFormOpen(false)
    setWhat('')
    setWhy('')
    setAlternatives('')
  },
})
```

Same pattern for `updateTags` in `tag-input.tsx`.

---

### WizardShell Layout — Tags Strip + Decision Log Integration

Updated wizard structure in `wizard-shell.tsx`:

```
┌──────────────────────────────────────────┐
│ WizardProgress                           │
├──────────────────────────────────────────┤
│ Stage tabs                  [Focus][Fast]│
├──────────────────────────────────────────┤
│ 🏷 Tags strip (persistent)               │  ← NEW
├──────────────────────────────────────────┤
│ [Completion level: quick|standard|deep]  │  (Fast Mode only)
│ Main content (step or canvas)            │
│ ─────────────────────────────────────── │
│ 📝 DecisionLogPanel (per-stage)          │  ← NEW
├──────────────────────────────────────────┤
│ WizardNav (Prev/Next/Save)               │
└──────────────────────────────────────────┘
```

Tags strip JSX (insert between stage tab row and main content div):
```tsx
{/* Tags strip — persistent across all stages */}
<div className="flex items-center gap-2 border-b border-border px-4 py-2">
  <span className="shrink-0 text-xs text-muted-foreground">Tags:</span>
  <TagInput featureId={featureId} tags={tags} />
</div>
```

Focus Mode with decision log:
```tsx
{currentMode === 'focus' ? (
  <div className="flex flex-col">
    {renderStep()}
    <div className="border-t border-border px-4 py-3">
      <DecisionLogPanel featureId={featureId} stage={currentStage} decisions={decisions} />
    </div>
  </div>
) : (
  <div className="flex flex-col">
    <div className="flex items-center gap-1 border-b border-border px-6 py-2">
      {/* completion level control — unchanged from Story 2.3 */}
    </div>
    <WizardCanvas ... />
    <div className="border-t border-border px-4 py-3">
      <DecisionLogPanel featureId={featureId} stage={currentStage} decisions={decisions} />
    </div>
  </div>
)}
```

---

### Deriving `decisions` and `tags` in WizardShell

Add after the existing `content` derivation line (line ~88):
```typescript
const content = featureQuery.data?.content as Record<string, Record<string, unknown>> | undefined
// ADD:
const decisions = (content?.[currentStage]?.decisions as DecisionEntry[]) ?? []
const tags = (content?.tags as string[]) ?? []
```

Import `DecisionEntry` from `@life-as-code/validators`.

---

### Package Import Boundaries (same as Stories 2.2/2.3)

| Component | Allowed Imports |
|---|---|
| `apps/nextjs` components | `@life-as-code/api`, `@life-as-code/ui`, `@life-as-code/validators`, `@life-as-code/lib`, `@tanstack/react-query`, `zustand`, `next/navigation`, `@base-ui/react/*` |
| `apps/nextjs` stores | `zustand`, `zustand/middleware`, `@life-as-code/validators` |

Do NOT import from `packages/db` in any `apps/nextjs` code.

---

### Lint Rules (from Stories 2.1–2.3)

- `unicorn/filename-case`: kebab-case only
- `require-await`: only mark functions `async` if they use `await`
- `no-non-null-assertion`: use `?.` and `??` instead of `!`
- No unused `async` on event handlers

---

### Windows Build Notes (from Stories 2.1–2.3)

- **Typecheck**: `bun x tsc --noEmit` in `apps/nextjs` — do NOT use turbo typecheck (OOM)
- **Lint**: `bunx oxlint --threads 1` from root — do NOT use `bun run lint` (OOM)
- **Validators build**: Run `bun run build` in `packages/validators` first if typecheck fails with missing types
- **App build**: `bun run build` in `apps/nextjs` segfaults on Windows post-processing — known Bun/Windows bug; Vercel CI succeeds

---

### Scope for This Story

**In scope:**
- `features.addDecision` tRPC procedure
- `features.updateTags` tRPC procedure
- `decision-log-entry.tsx`, `decision-log-panel.tsx`, `tag-input.tsx` — within wizard only
- Focus Mode regression fix in `handleContentChange`

**Out of scope (future stories):**
- Tag badges on FeatureCard → Story 2.5
- Decision log in ProvenanceChain view → Story 3.4+
- Annotations (FR38–FR40) → Story 7.2
- `DecisionLog.tsx` in `components/features/` folder → Story 3.4+
- Tags search filtering → Story 3.2
- Decision entry editing or deletion → post-MVP

---

### File Structure for This Story

```
packages/validators/src/
  feature.ts                         ← MODIFY: add DecisionEntrySchema, AddDecisionSchema, UpdateTagsSchema, DecisionEntry type

packages/api/src/routers/
  features.ts                        ← MODIFY: add addDecision + updateTags procedures

apps/nextjs/
  components/
    wizard/
      decision-log-entry.tsx         ← CREATE: single decision display (role="article", left accent border)
      decision-log-panel.tsx         ← CREATE: "Add Decision" button + inline form + decision list
      tag-input.tsx                  ← CREATE: tag chips + input (Enter/comma to add, ✕ to remove)
      wizard-shell.tsx               ← MODIFY: fix handleContentChange, add tags strip + decision log panels
```

### Project Structure Notes

- Architecture doc references `apps/web/` — override confirmed by Stories 2.1–2.3: actual path is `apps/nextjs/`
- All new wizard components follow established `apps/nextjs/components/wizard/` kebab-case convention
- `DecisionEntry` type lives in `packages/validators` to serve both API router and frontend components
- No new packages or external dependencies — `crypto.randomUUID()` is built-in

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.4 — BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — DecisionLogEntry anatomy, tag input patterns, ProvenanceChain context, Phase 2 roadmap]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — tRPC naming conventions, JSONB camelCase, feature_events write pattern, immutability check pattern]
- [Source: `_bmad-output/implementation-artifacts/2-3-fast-mode-wizard-and-progressive-completion.md` — kebab-case enforcement, package import boundaries, Windows build notes, lint rules, WizardStore patterns, debounce pattern]
- [Source: `life-as-code/packages/api/src/routers/features.ts` — existing transaction pattern, event logging, frozen check, DEFAULT_ORG_ID usage]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` — existing structure, content derivation, mutation patterns, handleFastModeFieldChange merge pattern]
- [Source: `life-as-code/packages/validators/src/feature.ts` — existing schema exports, UpdateStageSchema pattern]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No blockers encountered._

### Completion Notes List

- Implemented `DecisionEntrySchema`, `AddDecisionSchema`, `UpdateTagsSchema` and associated types in `packages/validators/src/feature.ts`
- Added `addDecision` tRPC procedure: transaction-based, appends to `content[stage].decisions[]`, writes `STAGE_UPDATED` event, uses `crypto.randomUUID()` for ID generation
- Added `updateTags` tRPC procedure: sets `content.tags` at feature level (not inside any stage), writes `STAGE_UPDATED` event
- Fixed Focus Mode regression in `handleContentChange`: now merges `existingStageContent` before saving, preventing decisions from being wiped on debounced saves
- Created `decision-log-entry.tsx`: `role="article"`, left accent border, conditional alternatives row, `<time>` element for timestamp
- Created `decision-log-panel.tsx`: "Add Decision" toggle button, inline form with textarea fields, query invalidation on success, chronological decision list
- Created `tag-input.tsx`: Enter/comma to add, ✕ to remove, duplicate guard, 8/10 counter, input hidden at max 10, full ARIA roles
- Updated `wizard-shell.tsx`: tags strip persistent above main content, `DecisionLogPanel` wired into both Focus and Fast modes; required `bun run build` in `packages/api` to surface new procedure types for typecheck

### File List

- `packages/validators/src/feature.ts` (modified)
- `packages/api/src/routers/features.ts` (modified)
- `apps/nextjs/components/wizard/decision-log-entry.tsx` (created)
- `apps/nextjs/components/wizard/decision-log-panel.tsx` (created)
- `apps/nextjs/components/wizard/tag-input.tsx` (created)
- `apps/nextjs/components/wizard/wizard-shell.tsx` (modified)

## Change Log

- 2026-03-14: Story 2.4 implemented — added decision log and tags to wizard; 3 new components, 2 new tRPC procedures, validators extended, Focus Mode regression fixed (Date: 2026-03-14)
- 2026-03-14: Code review by claude-sonnet-4-6 — fixed M-3: removed `async/await` from `onSuccess` callbacks in `tag-input.tsx` and `decision-log-panel.tsx` (used `void` for fire-and-forget invalidation); status → done
