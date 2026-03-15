# Story 2.3: Fast Mode Wizard & Progressive Completion

Status: done

## Story

As a developer or power user,
I want a Fast Mode canvas that shows all fields for a stage simultaneously with a progressive completion toggle,
So that I can work at speed across all fields without the step-by-step pacing.

## Acceptance Criteria

1. **Given** the wizard is in Focus Mode, **When** the user clicks the ⚡ Fast toggle in the wizard shell, **Then** the view switches to Fast Mode showing all fields for the current stage in organized groups, with no data loss

2. **Given** Fast Mode is active, **When** a stage canvas renders on desktop (≥1024px), **Then** field groups are displayed in a 2-column grid; required fields appear first at full opacity, standard fields below with muted labels, and extended fields are collapsed under a "Show extended fields ▾" toggle

3. **Given** Fast Mode is active on tablet/mobile (<1024px), **When** the stage canvas renders, **Then** the layout shifts to a single column with the same field ordering

4. **Given** the "Show extended fields ▾" toggle, **When** clicked, **Then** the extended/custom fields expand inline beneath the standard fields without a page reload

5. **Given** a user tabs between fields in Fast Mode, **When** Tab is pressed, **Then** focus moves to the next field in document order; Shift+Tab moves backwards

6. **Given** the mode preference, **When** a user switches between Focus and Fast mode, **Then** the preference is saved to localStorage and restored the next time the wizard opens

7. **Given** progressive completion levels (quick/standard/deep), **When** a feature is viewed in Fast Mode, **Then** "quick" shows only required fields; "standard" shows required + standard fields; "deep" reveals all fields including extended; the level is persisted per localStorage and toggleable from a segmented control above the field grid

## Tasks / Subtasks

- [x] Task 1: Update `WizardStore.ts` to add `completionLevel` (AC: #7)
  - [x] 1.1 Add `completionLevel: 'quick' | 'standard' | 'deep'` to `WizardState` interface — persisted, not ephemeral
  - [x] 1.2 Add `setCompletionLevel` action: `(level: CompletionLevel) => void`
  - [x] 1.3 Export `CompletionLevel` type: `export type CompletionLevel = 'quick' | 'standard' | 'deep'`
  - [x] 1.4 Add `completionLevel: 'quick'` as initial state default
  - [x] 1.5 Add `completionLevel` to `partialize` in persist config so it is included in localStorage
  - [x] 1.6 Run `bun x tsc --noEmit` in `apps/nextjs` — 0 errors

- [x] Task 2: Create `stage-fields.ts` — field config definitions for all 9 stages (AC: #2, #7)
  - [x] 2.1 Create `apps/nextjs/components/wizard/stage-fields.ts` — define `FieldConfig` type and `STAGE_FIELD_CONFIGS` constant
  - [x] 2.2 `FieldConfig` type: `{ key: string; label: string; placeholder?: string; tier: 'required' | 'standard' | 'extended' }`
  - [x] 2.3 `STAGE_FIELD_CONFIGS: Record<LifecycleStage, FieldConfig[]>` — see Dev Notes for exact field lists per stage

- [x] Task 3: Create `wizard-canvas.tsx` — Fast Mode full stage canvas (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Create `apps/nextjs/components/wizard/wizard-canvas.tsx` (`"use client"`)
  - [x] 3.2 Props: `stage: LifecycleStage, stageContent: Record<string, unknown>, onFieldChange: (fieldKey: string, value: string) => void, completionLevel: CompletionLevel`
  - [x] 3.3 Filter fields by `completionLevel`: `quick` → `tier === 'required'`; `standard` → `tier !== 'extended'`; `deep` → all fields
  - [x] 3.4 Extended fields toggled by local `showExtended: boolean` state — always visible when `completionLevel === 'deep'`
  - [x] 3.5 "Show extended fields ▾" toggle button: only render when `completionLevel !== 'deep'` and extended fields exist
  - [x] 3.6 Field grid layout: `grid grid-cols-1 lg:grid-cols-2 gap-4` for required+standard fields
  - [x] 3.7 Each field: `<div role="group" aria-labelledby={labelId}>` containing label + textarea
  - [x] 3.8 Required field labels: full opacity + `*` suffix; Standard labels: `text-muted-foreground`; Extended: same as standard
  - [x] 3.9 Textareas: `field-sizing: content` for auto-resize; value from `stageContent[field.key] as string ?? ''`; `onChange` calls `onFieldChange(field.key, e.target.value)`
  - [x] 3.10 "Filled" state on textarea: when value is non-empty, apply `border-border` (subtle border treatment)

- [x] Task 4: Update `wizard-shell.tsx` to wire Fast Mode canvas (AC: #1, #6, #7)
  - [x] 4.1 Import `WizardCanvas` from `./wizard-canvas`
  - [x] 4.2 Add `completionLevel`, `setCompletionLevel` from `useWizardStore()`
  - [x] 4.3 Add `pendingChangesRef = useRef<Record<string, string>>({})` for batching multi-field debounce
  - [x] 4.4 Create `handleFastModeFieldChange(fieldKey: string, value: string)` — see Dev Notes for exact debounce batching pattern
  - [x] 4.5 Replace placeholder `<p>Fast Mode coming soon (Story 2.3)</p>` with `<WizardCanvas>` — see Dev Notes for JSX
  - [x] 4.6 Add completion level segmented control in Fast Mode content area above the canvas — `quick | standard | deep` buttons with `aria-pressed`
  - [x] 4.7 Pass `stageContent={content?.[currentStage] as Record<string, unknown> ?? {}}` to `WizardCanvas`
  - [x] 4.8 Run `bun x tsc --noEmit` in `apps/nextjs` — 0 errors

- [x] Task 5: Verification (AC: all)
  - [x] 5.1 `bun x tsc --noEmit` in `apps/nextjs` — 0 errors (run `bun run build` in `packages/validators` first if type errors)
  - [x] 5.2 `bunx oxlint --threads 1` from root — 0 errors

## Dev Notes

### CRITICAL: File Naming is kebab-case (NOT PascalCase)

`unicorn/filename-case` enforces kebab-case for ALL files. Story 2.2's dev notes claimed PascalCase — they were wrong. All actual files from story 2.2 are kebab-case:
- `wizard-shell.tsx` ✓ (not `WizardShell.tsx`)
- `wizard-store.ts` ✓ (not `WizardStore.ts`)
- New files for this story must also be kebab-case: `wizard-canvas.tsx`, `stage-fields.ts`

---

### CRITICAL: Mode Preference is Already Persisted (AC #6 Already Implemented)

`currentMode: 'focus' | 'fast'` is already in `WizardStore` and included in `partialize`, so it persists to localStorage with key `lac-wizard-store`. **No WizardStore changes needed for AC #6** — only `completionLevel` needs to be added.

---

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

All wizard files live under `life-as-code/apps/nextjs/`. Architecture docs say `apps/web/` — override confirmed by Stories 2.1 and 2.2.

---

### CRITICAL: `@base-ui/react`, NOT shadcn/ui

The `packages/ui` components use `@base-ui/react` primitives. Do NOT install shadcn/ui. For Fast Mode field inputs, use plain HTML `<textarea>` elements (same as Focus Mode). For the completion level segmented control, use `<Button>` from `@life-as-code/ui`.

---

### CRITICAL: No Data Loss on Mode Switch

Both Focus Mode and Fast Mode read from `featureQuery.data?.content` (server state via React Query). Mode switching does not reset or lose content — data is identical in both views. The `handleFastModeFieldChange` writes to the same `updateStage` tRPC procedure as Focus Mode.

---

### WizardStore Update Pattern

Update `apps/nextjs/stores/wizard-store.ts`:

```typescript
export type CompletionLevel = 'quick' | 'standard' | 'deep'

export interface WizardState {
  // Persisted
  lastEditedStage: Record<string, LifecycleStage>
  currentMode: 'focus' | 'fast'
  completionLevel: CompletionLevel          // ADD THIS
  // Ephemeral (not persisted)
  saveState: SaveIndicatorState
  // Actions
  setLastEditedStage: (featureId: string, stage: LifecycleStage) => void
  setCurrentMode: (mode: 'focus' | 'fast') => void
  setCompletionLevel: (level: CompletionLevel) => void   // ADD THIS
  setSaveState: (state: SaveIndicatorState) => void
  getLastEditedStage: (featureId: string) => LifecycleStage
}
```

Initial state additions:
```typescript
completionLevel: 'quick',
setCompletionLevel: (level) => set({ completionLevel: level }),
```

Partialize update (add `completionLevel`):
```typescript
partialize: (state) => ({
  lastEditedStage: state.lastEditedStage,
  currentMode: state.currentMode,
  completionLevel: state.completionLevel,    // ADD THIS
}),
```

---

### Stage Field Configs (STAGE_FIELD_CONFIGS)

Create `apps/nextjs/components/wizard/stage-fields.ts` with this exact config:

```typescript
import type { LifecycleStage } from '@life-as-code/validators'

export type FieldTier = 'required' | 'standard' | 'extended'

export interface FieldConfig {
  key: string
  label: string
  placeholder?: string
  tier: FieldTier
}

export const STAGE_FIELD_CONFIGS: Record<LifecycleStage, FieldConfig[]> = {
  problem: [
    { key: 'problemStatement', label: 'Problem Statement', placeholder: 'What human problem triggered this feature?', tier: 'required' },
    { key: 'impactedUsers', label: 'Impacted Users', placeholder: 'Who experiences this problem?', tier: 'standard' },
    { key: 'successMetric', label: 'Success Metric', placeholder: 'How will you know the problem is solved?', tier: 'standard' },
    { key: 'priorityRationale', label: 'Priority Rationale', placeholder: 'Why now / why this priority?', tier: 'extended' },
  ],
  analysis: [
    { key: 'analysisNotes', label: 'Analysis Notes', placeholder: 'What analysis supports solving this problem?', tier: 'required' },
    { key: 'dataPoints', label: 'Supporting Data', placeholder: 'What data or research backs this up?', tier: 'standard' },
    { key: 'riskFactors', label: 'Risk Factors', placeholder: 'What risks exist in solving this?', tier: 'standard' },
    { key: 'competitorAnalysis', label: 'Competitor Analysis', placeholder: 'How do competitors handle this?', tier: 'extended' },
  ],
  requirements: [
    { key: 'requirementsList', label: 'Requirements', placeholder: 'What must this feature do? List the requirements.', tier: 'required' },
    { key: 'outOfScope', label: 'Out of Scope', placeholder: 'What should this feature NOT do?', tier: 'standard' },
    { key: 'constraints', label: 'Constraints', placeholder: 'Technical, business, or resource constraints.', tier: 'standard' },
    { key: 'edgeCases', label: 'Edge Cases', placeholder: 'What edge cases must be handled?', tier: 'extended' },
  ],
  design: [
    { key: 'designNotes', label: 'Design Notes', placeholder: 'How should this feature be designed?', tier: 'required' },
    { key: 'uxConsiderations', label: 'UX Considerations', placeholder: 'User experience notes and interaction patterns.', tier: 'standard' },
    { key: 'alternatives', label: 'Alternatives Considered', placeholder: 'What design alternatives were evaluated?', tier: 'standard' },
    { key: 'accessibilityNotes', label: 'Accessibility Notes', placeholder: 'WCAG and accessibility requirements.', tier: 'extended' },
  ],
  implementation: [
    { key: 'implementationNotes', label: 'Implementation Notes', placeholder: 'How will this be implemented?', tier: 'required' },
    { key: 'technicalStack', label: 'Technical Choices', placeholder: 'Libraries, patterns, and tech decisions.', tier: 'standard' },
    { key: 'dependencies', label: 'Dependencies', placeholder: 'Code or service dependencies.', tier: 'standard' },
    { key: 'performanceNotes', label: 'Performance Notes', placeholder: 'Performance considerations and targets.', tier: 'extended' },
  ],
  validation: [
    { key: 'validationNotes', label: 'Validation Plan', placeholder: 'How will this feature be validated and tested?', tier: 'required' },
    { key: 'testCases', label: 'Test Cases', placeholder: 'Key test cases to cover.', tier: 'standard' },
    { key: 'testEnvironment', label: 'Test Environment', placeholder: 'Environment setup and data requirements.', tier: 'standard' },
    { key: 'loadTestingNotes', label: 'Load Testing', placeholder: 'Performance and load testing considerations.', tier: 'extended' },
  ],
  documentation: [
    { key: 'documentationNotes', label: 'Documentation Plan', placeholder: 'What documentation does this feature require?', tier: 'required' },
    { key: 'audience', label: 'Target Audience', placeholder: 'Who will read this documentation?', tier: 'standard' },
    { key: 'docFormat', label: 'Format & Location', placeholder: 'Where will docs live and in what format?', tier: 'standard' },
    { key: 'translationNotes', label: 'i18n / Translation', placeholder: 'Internationalization considerations.', tier: 'extended' },
  ],
  delivery: [
    { key: 'deliveryPlan', label: 'Delivery Plan', placeholder: 'What is the delivery plan for this feature?', tier: 'required' },
    { key: 'rolloutStrategy', label: 'Rollout Strategy', placeholder: 'How will this be rolled out to users?', tier: 'standard' },
    { key: 'rollbackPlan', label: 'Rollback Plan', placeholder: 'How do we roll back if something goes wrong?', tier: 'standard' },
    { key: 'monitoringPlan', label: 'Post-Delivery Monitoring', placeholder: 'What will be monitored post-launch?', tier: 'extended' },
  ],
  support: [
    { key: 'supportNotes', label: 'Support Notes', placeholder: 'What support considerations exist post-delivery?', tier: 'required' },
    { key: 'knownIssues', label: 'Known Issues', placeholder: 'Known issues or limitations to communicate.', tier: 'standard' },
    { key: 'escalationPath', label: 'Escalation Path', placeholder: 'How should issues be escalated?', tier: 'standard' },
    { key: 'slaDefinitions', label: 'SLA Definitions', placeholder: 'Service level agreements for this feature.', tier: 'extended' },
  ],
}
```

---

### WizardCanvas Component Structure

```tsx
"use client"

import { useState } from 'react'
import type { LifecycleStage } from '@life-as-code/validators'
import type { CompletionLevel } from '@/stores/wizard-store'
import { STAGE_FIELD_CONFIGS } from './stage-fields'

interface WizardCanvasProps {
  stage: LifecycleStage
  stageContent: Record<string, unknown>
  onFieldChange: (fieldKey: string, value: string) => void
  completionLevel: CompletionLevel
}

export function WizardCanvas({ stage, stageContent, onFieldChange, completionLevel }: WizardCanvasProps) {
  const [showExtended, setShowExtended] = useState(false)

  const allFields = STAGE_FIELD_CONFIGS[stage]

  // Filter by completion level
  const visibleFields = allFields.filter((f) => {
    if (completionLevel === 'deep') return true
    if (completionLevel === 'standard') return f.tier !== 'extended'
    return f.tier === 'required' // quick
  })

  const extendedFields = allFields.filter((f) => f.tier === 'extended')
  const hasExtendedToggle = completionLevel !== 'deep' && extendedFields.length > 0

  const mainFields = visibleFields.filter((f) => f.tier !== 'extended')
  const shownExtendedFields = (showExtended || completionLevel === 'deep')
    ? visibleFields.filter((f) => f.tier === 'extended')
    : []

  return (
    <div className="p-6">
      {/* Required + Standard fields in responsive 2-col grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mainFields.map((field) => {
          const labelId = `field-label-${field.key}`
          const value = (stageContent[field.key] as string | undefined) ?? ''
          return (
            <div key={field.key} role="group" aria-labelledby={labelId}>
              <label
                id={labelId}
                htmlFor={`field-${field.key}`}
                className={`mb-1 block text-sm font-medium ${field.tier === 'standard' ? 'text-muted-foreground' : ''}`}
              >
                {field.label}
                {field.tier === 'required' && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
              </label>
              <textarea
                id={`field-${field.key}`}
                aria-labelledby={labelId}
                className={`w-full resize-none rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value ? 'border-border' : 'border-input'}`}
                style={{ fieldSizing: 'content' } as React.CSSProperties}
                rows={3}
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
              />
            </div>
          )
        })}
      </div>

      {/* Extended fields (shown when expanded or completionLevel=deep) */}
      {shownExtendedFields.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {shownExtendedFields.map((field) => {
            const labelId = `field-label-${field.key}`
            const value = (stageContent[field.key] as string | undefined) ?? ''
            return (
              <div key={field.key} role="group" aria-labelledby={labelId}>
                <label
                  id={labelId}
                  htmlFor={`field-${field.key}`}
                  className="mb-1 block text-sm font-medium text-muted-foreground"
                >
                  {field.label}
                </label>
                <textarea
                  id={`field-${field.key}`}
                  aria-labelledby={labelId}
                  className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                  rows={3}
                  placeholder={field.placeholder}
                  value={value}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Show extended toggle */}
      {hasExtendedToggle && (
        <button
          type="button"
          onClick={() => setShowExtended((prev) => !prev)}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground"
          aria-expanded={showExtended}
        >
          {showExtended ? 'Hide extended fields ▴' : 'Show extended fields ▾'}
        </button>
      )}
    </div>
  )
}
```

---

### Multi-Field Debounce Batching Pattern (wizard-shell.tsx update)

The key problem: user edits multiple fields rapidly → each field change cancels the previous debounce → only last field saved. Solution: batch pending changes in a ref.

```typescript
// Add to WizardShell component state/refs:
const pendingChangesRef = useRef<Record<string, string>>({})

// Add alongside existing handleContentChange:
const handleFastModeFieldChange = useCallback(
  (fieldKey: string, value: string) => {
    setSaveState('saving')
    pendingChangesRef.current = { ...pendingChangesRef.current, [fieldKey]: value }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const existingStageContent = (content?.[currentStage] as Record<string, unknown>) ?? {}
      const merged = { ...existingStageContent, ...pendingChangesRef.current }
      pendingChangesRef.current = {}
      updateStageMutation.mutate(
        { featureId, stage: currentStage, stageContent: merged },
        {
          onSuccess: () => setSaveState('saved'),
          onError: () => setSaveState('error'),
        }
      )
    }, 500)
  },
  [currentStage, featureId, content, setSaveState, updateStageMutation],
)
```

**IMPORTANT:** `pendingChangesRef` must be reset on stage change to prevent cross-stage bleed:
```typescript
// In handleStageChange (update existing callback):
const handleStageChange = useCallback(
  (stage: LifecycleStage) => {
    pendingChangesRef.current = {}   // Clear pending changes when switching stages
    setCurrentStage(stage)
    setLastEditedStage(featureId, stage)
  },
  [featureId, setLastEditedStage],
)
```

---

### wizard-shell.tsx Fast Mode JSX (replace placeholder)

```tsx
// Destructure completionLevel and setCompletionLevel from useWizardStore():
const { ..., completionLevel, setCompletionLevel } = useWizardStore()

// In the main content area (replace the placeholder div):
{currentMode === 'focus' ? (
  renderStep()
) : (
  <div className="flex flex-col">
    {/* Completion level segmented control */}
    <div className="flex items-center gap-1 border-b border-border px-6 py-2">
      <span className="mr-2 text-xs text-muted-foreground">Depth:</span>
      {(['quick', 'standard', 'deep'] as const).map((level) => (
        <Button
          key={level}
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={completionLevel === level}
          onClick={() => setCompletionLevel(level)}
          className="capitalize"
        >
          {level}
        </Button>
      ))}
    </div>
    {/* Fast Mode canvas */}
    <WizardCanvas
      stage={currentStage}
      stageContent={(content?.[currentStage] as Record<string, unknown>) ?? {}}
      onFieldChange={handleFastModeFieldChange}
      completionLevel={completionLevel}
    />
  </div>
)}
```

---

### Accessibility Requirements for Fast Mode

- Each field group: `role="group"` with `aria-labelledby` pointing to the label element ID
- Required indicator `*`: `aria-hidden="true"` so screen readers don't read "asterisk"; required status is communicated by label wording or `aria-required`
- Extended toggle button: `aria-expanded={showExtended}`
- Completion level buttons: `aria-pressed={completionLevel === level}` on each
- Textareas: `aria-labelledby` pointing to the label ID (the `role="group"` + `aria-labelledby` covers grouping, individual `aria-labelledby` on textarea ensures direct association)

---

### Package Import Boundaries (same as Story 2.2)

| Component | Allowed Imports |
|---|---|
| `apps/nextjs` components | `@life-as-code/api`, `@life-as-code/ui`, `@life-as-code/validators`, `@life-as-code/lib`, `@tanstack/react-query`, `zustand`, `next/navigation`, `@base-ui/react/*` |
| `apps/nextjs` stores | `zustand`, `zustand/middleware`, `@life-as-code/validators`, `@life-as-code/ui` (types only) |

**Do NOT** import from `packages/db` in any `apps/nextjs` code.

---

### Lint Rules (Critical from Stories 2.1 & 2.2)

- `unicorn/filename-case`: kebab-case only — `wizard-canvas.tsx`, `stage-fields.ts`
- `require-await`: only mark functions `async` if they contain `await`
- `no-non-null-assertion`: use `?.` and `??` instead of `!`
- No unused `async` on event handlers

---

### Windows Build Notes (from Stories 2.1 & 2.2)

- **Typecheck:** `bun x tsc --noEmit` directly in `apps/nextjs` — do NOT use turbo typecheck (OOM)
- **Lint:** `bunx oxlint --threads 1` from root — do NOT use `bun run lint` (OOM)
- **Validators build:** If typecheck fails with missing validators types, run `bun run build` in `packages/validators` first
- **App build:** `bun run build` in `apps/nextjs` segfaults on Windows post-processing — known Bun/Windows bug, not a code issue; Vercel CI builds succeed

---

### What This Story Does NOT Include

- CodeMirror 6 for Markdown fields — UX spec mentions this but it's not required by ACs; plain textarea is correct for MVP
- `Esc` key to exit Focus Mode to Fast Mode — not in ACs; skip
- Command palette (`Cmd+K`) — Fast Mode power user feature, not in ACs
- Decision log entries (`Add Decision` form) — Story 2.4
- Tags — Story 2.4
- Feature list page / FeatureCard — Story 2.5
- Per-feature (not per-session) completion level — ACs only require localStorage persistence (session-level), not per-feature DB persistence

---

### File Structure for This Story

```
apps/nextjs/
  components/
    wizard/
      wizard-canvas.tsx         ← CREATE: "use client" — Fast Mode field canvas
      stage-fields.ts           ← CREATE: field config definitions for all 9 stages
      wizard-shell.tsx          ← MODIFY: wire Fast Mode canvas + completion level control
  stores/
    wizard-store.ts             ← MODIFY: add completionLevel + setCompletionLevel
```

### Project Structure Notes

- `wizard-canvas.tsx` lives alongside other wizard components in `apps/nextjs/components/wizard/`
- `stage-fields.ts` is a non-component config file — kebab-case, no `"use client"` needed
- No new packages, no new dependencies — all imports are from existing packages
- `wizard-store.ts` change is backward-compatible: `completionLevel` defaults to `'quick'`, existing persisted state without `completionLevel` will use the default via Zustand's merge strategy

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.3 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — WizardStep Fast Mode anatomy (UX-DR18), Field Priority Tiers, Responsive Strategy, Core Design Principles]
- [Source: `_bmad-output/implementation-artifacts/2-2-wizard-ui-shell-and-focus-mode.md` — Completion Notes (kebab-case enforcement, SaveIndicatorState export fix), WizardStore pattern, tRPC patterns, debounce pattern, lint rules, Windows build notes]
- [Source: `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` — existing WizardShell implementation, Fast Mode placeholder at line 219]
- [Source: `life-as-code/apps/nextjs/stores/wizard-store.ts` — existing WizardStore with currentMode, persist pattern]
- [Source: `life-as-code/packages/validators/src/lifecycle.ts` — LIFECYCLE_STAGES const, LifecycleStage type]
- [Source: `life-as-code/packages/validators/src/feature.ts` — UpdateStageSchema: `{ featureId, stage, stageContent: Record<string, unknown> }`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_None — implementation completed without issues. TypeScript 0 errors, oxlint 0 errors._

### Completion Notes List

- Added `CompletionLevel` type export and `completionLevel` / `setCompletionLevel` to `WizardState` in `wizard-store.ts`; `completionLevel` defaults to `'quick'` and is persisted in localStorage via `partialize`
- Created `stage-fields.ts` with `FieldConfig` interface and `STAGE_FIELD_CONFIGS` covering all 9 lifecycle stages (4 fields each: 1 required, 2 standard, 1 extended)
- Created `wizard-canvas.tsx`: responsive 2-col grid (1-col on mobile), field visibility filtered by `completionLevel`, "Show extended fields" toggle with `aria-expanded`, required fields starred with `aria-hidden` asterisk, textareas use `fieldSizing: content` for auto-resize, filled border treatment when value is non-empty
- Updated `wizard-shell.tsx`: added `WizardCanvas` import, `completionLevel`/`setCompletionLevel` from store, `pendingChangesRef` for batching multi-field debounce, `handleFastModeFieldChange` with 500ms debounce, `handleStageChange` clears pending ref on stage switch, completion level segmented control (quick/standard/deep) with `aria-pressed`, replaced Fast Mode placeholder with full `WizardCanvas` integration

### File List

- `life-as-code/apps/nextjs/stores/wizard-store.ts` (modified)
- `life-as-code/apps/nextjs/components/wizard/stage-fields.ts` (created)
- `life-as-code/apps/nextjs/components/wizard/wizard-canvas.tsx` (created)
- `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` (modified)
- `_bmad-output/implementation-artifacts/2-3-fast-mode-wizard-and-progressive-completion.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

## Change Log

- 2026-03-14: Story 2.3 implemented — Fast Mode canvas with progressive completion levels (quick/standard/deep), `WizardCanvas` component, `stage-fields.ts` config, `WizardStore` extended with `completionLevel`, multi-field debounce batching in wizard-shell. All 5 tasks complete. TypeScript 0 errors, oxlint 0 errors.
- 2026-03-14: Code review by claude-sonnet-4-6 — no issues specific to story 2.3; fixes applied to shared wizard-shell.tsx in story 2.2 review; status → done
