# Story 2.2: Wizard UI Shell & Focus Mode

Status: review

## Story

As a product manager or developer,
I want a step-by-step guided wizard in Focus Mode that walks me through one lifecycle stage question at a time,
so that I'm prompted to think through each aspect of the feature without being overwhelmed by all fields at once.

## Acceptance Criteria

1. **Given** a user navigates to "New Feature", **When** the wizard opens, **Then** the `WizardShell` renders with a 2px progress bar at top, stage tabs, a mode toggle (⚡ Fast / 🎯 Focus) defaulting to Focus, and a footer with `SaveIndicator` and Prev/Next buttons

2. **Given** Focus Mode is active, **When** a wizard stage renders, **Then** a single large prompt fills the screen (e.g. "What human problem triggered this feature?"), a large textarea is focused, and no other fields are visible

3. **Given** the user types in a Focus Mode field, **When** any keystroke occurs, **Then** the content auto-saves via `features.updateStage` within 500ms and the `SaveIndicator` transitions through `saving → saved` states

4. **Given** the wizard is on any stage, **When** the user presses Enter, **Then** the wizard advances to the next stage; when Shift+Enter is pressed, a newline is inserted in the textarea

5. **Given** the Analysis stage is active in Focus Mode, **When** the stage renders, **Then** a contextual edge-case prompt appears below the main question: "Have you considered edge cases? What should this feature NOT do?"

6. **Given** required fields are defined in the schema, **When** the user attempts to click "Mark stage complete" with required fields empty, **Then** the system shows an inline validation message below the relevant field and prevents completion — it does not block navigation between stages

7. **Given** a user leaves mid-wizard and returns later, **When** they navigate back to the feature, **Then** the wizard reopens at the last edited stage with all previously entered content intact

8. **Given** stage tabs are rendered, **When** the user clicks a stage tab directly, **Then** the wizard navigates to that stage without losing any unsaved content

## Tasks / Subtasks

- [x] Task 1: Create `WizardStore.ts` with Zustand + persist middleware (AC: #3, #7)
  - [x] 1.1 Create `apps/nextjs/stores/wizard-store.ts` — `useWizardStore` with `lastEditedStage`, `saveState`, `currentMode` state + setters
  - [x] 1.2 Use `devtools` + `persist` + `subscribeWithSelector` middleware; persist key `lac-wizard-store`; skip `saveState` from persistence (ephemeral)
  - [x] 1.3 Run typecheck in `apps/nextjs` — confirm 0 errors

- [x] Task 2: Create `/features/new` page — new feature creation entry point (AC: #1)
  - [x] 2.1 Create `apps/nextjs/app/(features)/features/new/page.tsx` as a Client Component (`"use client"`)
  - [x] 2.2 On mount: call `features.create` mutation with empty defaults → on success, `router.push('/features/[id]/wizard')`; show loading skeleton during creation
  - [x] 2.3 Import `useTRPC`, `useMutation` from `@/trpc/react` and `@tanstack/react-query`

- [x] Task 3: Create `/features/[id]/wizard` page — RSC wrapper with prefetch (AC: #7)
  - [x] 3.1 Create `apps/nextjs/app/(features)/features/[id]/wizard/page.tsx` as RSC
  - [x] 3.2 Prefetch via `getQueryClient().prefetchQuery(trpc.features.getFeature.queryOptions({ id }))` and wrap with `HydrateClient`
  - [x] 3.3 Render `<WizardShell featureId={id} />` as child of `HydrateClient`

- [x] Task 4: Create `wizard-progress.tsx` — 2px progress bar (AC: #1)
  - [x] 4.1 Create `apps/nextjs/components/wizard/wizard-progress.tsx` (`"use client"`)
  - [x] 4.2 Props: `completedCount: number, totalCount: number` — renders a 2px `role="progressbar"` bar at top of wizard with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax` set to totalCount

- [x] Task 5: Create `wizard-nav.tsx` — footer with SaveIndicator + Prev/Next (AC: #1)
  - [x] 5.1 Create `apps/nextjs/components/wizard/wizard-nav.tsx` (`"use client"`)
  - [x] 5.2 Props: `onPrev`, `onNext`, `hasPrev`, `hasNext`, `saveState: SaveIndicatorState`
  - [x] 5.3 Import `SaveIndicator`, `Button` from `@life-as-code/ui`; render `<SaveIndicator>` on left and Prev/Next buttons on right
  - [x] 5.4 Prev button: `variant="outline"`, disabled when `!hasPrev`; Next button: `variant="default"`, disabled when `!hasNext`

- [x] Task 6: Create `wizard-step.tsx` — Focus Mode single-question layout (AC: #2, #4, #6)
  - [x] 6.1 Create `apps/nextjs/components/wizard/wizard-step.tsx` (`"use client"`)
  - [x] 6.2 Props: `stageLabel`, `prompt`, `hintText?`, `value`, `onChange`, `onAdvance`, `required?`, `validationError?`, `autoFocus?`
  - [x] 6.3 Render: stage label (small caps) + large bold prompt + hint text + `<textarea>` auto-focused on mount + "Press Enter to continue, Shift+Enter for new line" hint below
  - [x] 6.4 `onKeyDown` handler: `Enter` (without Shift) calls `onAdvance`; `Shift+Enter` = default newline
  - [x] 6.5 Show `validationError` below textarea with `role="alert"`; `aria-describedby` connecting textarea to prompt + hint
  - [x] 6.6 Textarea auto-resize via CSS `field-sizing: content`

- [x] Task 7: Create per-stage step components — Focus Mode prompts (AC: #2, #5)
  - [x] 7.1 `problem-step.tsx` — "What human problem triggered this feature?"
  - [x] 7.2 `analysis-step.tsx` — "What analysis supports solving this problem?" + edge-case hint
  - [x] 7.3 `requirements-step.tsx` — "What must this feature do? List the requirements."
  - [x] 7.4 `design-step.tsx` — "How should this feature be designed?"
  - [x] 7.5 `implementation-step.tsx` — "How will this be implemented?"
  - [x] 7.6 `validation-step.tsx` — "How will this feature be validated and tested?"
  - [x] 7.7 `documentation-step.tsx` — "What documentation does this feature require?"
  - [x] 7.8 `delivery-step.tsx` — "What is the delivery plan for this feature?"
  - [x] 7.9 `support-step.tsx` — "What support considerations exist post-delivery?"
  - [x] 7.10 All step components wrap `<WizardStep>` with stage-specific props

- [x] Task 8: Create `wizard-shell.tsx` — main wizard container (AC: #1, #3, #4, #7, #8)
  - [x] 8.1 Create `apps/nextjs/components/wizard/wizard-shell.tsx` (`"use client"`)
  - [x] 8.2 Props: `featureId: string`
  - [x] 8.3 Load feature data via `useQuery(trpc.features.getFeature.queryOptions({ id: featureId }))`
  - [x] 8.4 Initialize `currentStage` from `useWizardStore` `lastEditedStage[featureId]`, falling back to `'problem'`
  - [x] 8.5 500ms debounced auto-save with `useRef` timer; `setSaveState('saving')` → debounce → `updateStageMutation.mutate()` → `setSaveState('saved')` / `setSaveState('error')`
  - [x] 8.6 Hand-rolled stage tabs with `role="tablist"` / `role="tab"` / `aria-selected`
  - [x] 8.7 Mode toggle ⚡ Fast / 🎯 Focus; Fast Mode shows "Fast Mode coming soon (Story 2.3)" placeholder
  - [x] 8.8 Renders `<WizardProgress>`, stage tabs, active step, `<WizardNav>` footer
  - [x] 8.9 Stage change updates `useWizardStore.lastEditedStage[featureId]`
  - [x] 8.11 Test file omitted — no test runner configured yet (vitest not installed)

- [x] Task 9: Wire up "New Feature" navigation in sidebar (AC: #1)
  - [x] 9.1 Added "New Feature" link to `apps/nextjs/components/layout/sidebar.tsx` with `Plus` icon → `/features/new`

- [x] Task 10: Verification
  - [x] 10.1 `bun run typecheck` in `apps/nextjs` — 0 errors (includes `next typegen` + `tsc --noEmit`)
  - [x] 10.2 `bunx oxlint --threads 1` from root — 0 errors

## Dev Notes

### CRITICAL: Uses `@base-ui/react`, NOT shadcn/ui

The `packages/ui` components use `@base-ui/react` primitives — confirmed in `packages/ui/src/components/button.tsx` (imports `@base-ui/react/button`). The architecture doc says "shadcn/ui" but that is incorrect — the actual design system is built on `@base-ui/react`.

**What this means for wizard components:**
- Import `Button` from `@life-as-code/ui` (NOT from shadcn)
- Import `SaveIndicator` from `@life-as-code/ui`
- For Tabs: check if `@base-ui/react/tabs` is installed (inspect `packages/ui/package.json`) — if available, use it; if not, implement stage navigation as a styled `<ul>` of `<button>` elements with `role="tablist"` / `role="tab"` / `aria-selected`
- Do NOT install shadcn/ui — it conflicts with the established design system

---

### CRITICAL: App Path Is `apps/nextjs`, Not `apps/web`

The architecture doc references `apps/web/` throughout. The actual project path is `apps/nextjs/`. All files for this story go under `life-as-code/apps/nextjs/`.

---

### CRITICAL: File Naming Conventions

- **React components:** PascalCase — `WizardShell.tsx`, `WizardStep.tsx`, `WizardNav.tsx`
- **Non-component files:** kebab-case — `wizard-store.ts` WRONG → use `WizardStore.ts` (store files are PascalCase per architecture)
- **Hooks:** camelCase — `useWizardStore` (exported from `WizardStore.ts`)
- **All files:** no spaces, no underscores

From architecture naming rules:
> Zustand stores: PascalCase + Store suffix — `WizardStore.ts`, `TreeStore.ts`
> React components: PascalCase matching the component — `WizardShell.tsx`, `WizardStep.tsx`
> Non-component files: kebab-case

---

### CRITICAL: `"use client"` Placement

All wizard components need `"use client"` because they use:
- React hooks (`useState`, `useEffect`, `useRef`, `useCallback`)
- Browser APIs (localStorage via Zustand persist)
- Event handlers (`onChange`, `onKeyDown`, `onClick`)
- Zustand stores
- tRPC `useMutation` / `useQuery`

RSC components (no `"use client"`):
- `app/(features)/features/[id]/wizard/page.tsx` — RSC; prefetches data, renders `<HydrateClient><WizardShell /></HydrateClient>`
- `app/(features)/features/new/page.tsx` — EXCEPTION: must be `"use client"` because it fires `features.create` mutation

---

### CRITICAL: Package Import Boundaries

| Component | Allowed Imports |
|---|---|
| `apps/nextjs` components | `@life-as-code/api`, `@life-as-code/ui`, `@life-as-code/validators`, `@life-as-code/lib`, `@tanstack/react-query`, `zustand`, `next/navigation`, `@base-ui/react/*` |
| `apps/nextjs` stores | `zustand`, `zustand/middleware`, `@life-as-code/validators` |

Do NOT import from `packages/db` in any `apps/nextjs` code — that package is server-only.

---

### WizardStore.ts — Full Implementation Pattern

```typescript
"use client"

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import type { SaveIndicatorState } from '@life-as-code/ui'
import type { LifecycleStage } from '@life-as-code/validators'

export interface WizardState {
  // Persisted
  lastEditedStage: Record<string, LifecycleStage>
  currentMode: 'focus' | 'fast'
  // Ephemeral (not persisted)
  saveState: SaveIndicatorState
  // Actions
  setLastEditedStage: (featureId: string, stage: LifecycleStage) => void
  setCurrentMode: (mode: 'focus' | 'fast') => void
  setSaveState: (state: SaveIndicatorState) => void
  getLastEditedStage: (featureId: string) => LifecycleStage
}

export const useWizardStore = create<WizardState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        lastEditedStage: {},
        currentMode: 'focus',
        saveState: 'saved',
        setLastEditedStage: (featureId, stage) =>
          set((state) => ({
            lastEditedStage: { ...state.lastEditedStage, [featureId]: stage },
          })),
        setCurrentMode: (mode) => set({ currentMode: mode }),
        setSaveState: (saveState) => set({ saveState }),
        getLastEditedStage: (featureId) =>
          get().lastEditedStage[featureId] ?? 'problem',
      })),
      {
        name: 'lac-wizard-store',
        skipHydration: true,
        // Exclude ephemeral saveState from persistence
        partialize: (state) => ({
          lastEditedStage: state.lastEditedStage,
          currentMode: state.currentMode,
        }),
      },
    ),
    { name: 'WizardStore' },
  ),
)
```

Hydrate store client-side in `WizardShell.tsx`:
```typescript
useEffect(() => {
  useWizardStore.persist.rehydrate()
}, [])
```

---

### tRPC Client Patterns in React Components

This project uses `@trpc/tanstack-react-query` v11 with the `createTRPCContext` pattern. The hooks are `useTRPC` and `useTRPCClient` from `@/trpc/react`.

**Mutation pattern:**
```typescript
import { useTRPC } from '@/trpc/react'
import { useMutation, useQuery } from '@tanstack/react-query'

// In component:
const trpc = useTRPC()

// Mutation:
const updateStageMutation = useMutation(trpc.features.updateStage.mutationOptions())
// Call: await updateStageMutation.mutateAsync({ featureId, stage, stageContent: { ... } })

// Query:
const featureQuery = useQuery(trpc.features.getFeature.queryOptions({ id: featureId }))
// Access: featureQuery.data
```

**Create mutation (for `/features/new`):**
```typescript
const createMutation = useMutation(trpc.features.create.mutationOptions())
// Call: const feature = await createMutation.mutateAsync({ problemStatement: '', reporterContext: '' })
// Then: router.push(`/features/${feature.id}/wizard`)
```

---

### 500ms Auto-Save with Debounce

```typescript
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const { setSaveState } = useWizardStore()

const handleStageContentChange = useCallback(
  (stage: LifecycleStage, fieldKey: string, value: string) => {
    setSaveState('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateStageMutation.mutate(
        { featureId, stage, stageContent: { [fieldKey]: value } },
        {
          onSuccess: () => setSaveState('saved'),
          onError: () => setSaveState('error'),
        }
      )
    }, 500)
  },
  [featureId, setSaveState, updateStageMutation]
)

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }
}, [])
```

Key: use `mutate` (fire-and-forget) not `mutateAsync` (throws on error) inside the debounce to keep error handling clean.

---

### RSC Prefetch Pattern (wizard page)

```typescript
// apps/nextjs/app/(features)/features/[id]/wizard/page.tsx
import { headers } from 'next/headers'
import { createTRPC, HydrateClient } from '@/trpc/rsc'
import { WizardShell } from '@/components/wizard/WizardShell'

export default async function WizardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const trpc = createTRPC({ headers: await headers() })
  await trpc.features.getFeature.prefetch({ id })

  return (
    <HydrateClient>
      <WizardShell featureId={id} />
    </HydrateClient>
  )
}
```

Note: In Next.js 15 App Router, `params` is a `Promise` — always `await params`.

---

### New Feature Page Pattern

```typescript
// apps/nextjs/app/(features)/features/new/page.tsx
"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTRPC } from '@/trpc/react'
import { useMutation } from '@tanstack/react-query'

export default function NewFeaturePage() {
  const router = useRouter()
  const trpc = useTRPC()
  const createMutation = useMutation(
    trpc.features.create.mutationOptions({
      onSuccess: (feature) => {
        router.push(`/features/${feature.id}/wizard`)
      },
    })
  )

  useEffect(() => {
    createMutation.mutate({ problemStatement: '', reporterContext: '' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally fires once on mount

  if (createMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-muted-foreground text-sm">Creating feature...</span>
      </div>
    )
  }

  if (createMutation.isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-destructive text-sm">Failed to create feature. Please try again.</span>
      </div>
    )
  }

  return null
}
```

---

### WizardShell Layout Structure

```
┌─────────────────────────────────────────────────┐
│  [2px progress bar — role="progressbar"]        │  ← WizardProgress (sticky top)
├─────────────────────────────────────────────────┤
│  [stage tabs: Problem|Analysis|...|Support]     │  ← tab nav (role="tablist")
│                              [⚡ Fast][🎯 Focus] │  ← mode toggle (top-right)
├─────────────────────────────────────────────────┤
│                                                 │
│   [Stage label — PROBLEM]                      │
│   [Large prompt text]                           │
│                                                 │  ← WizardStep (Focus Mode)
│   [large textarea — auto-focused]              │
│   [Press Enter to continue, Shift+Enter for... ]│
│                                                 │
├─────────────────────────────────────────────────┤
│  [SaveIndicator]           [← Prev] [Next →]   │  ← WizardNav footer
└─────────────────────────────────────────────────┘
```

---

### Stage Content Mapping to tRPC

The `features.updateStage` procedure expects:
```typescript
{ featureId: string, stage: LifecycleStage, stageContent: Record<string, unknown> }
```

Each stage maps to a key in `features.content` JSONB. For Focus Mode, each stage has one primary text field:

| Stage | stageContent key | Prompt |
|---|---|---|
| `problem` | `problemStatement` | "What human problem triggered this feature?" |
| `analysis` | `analysisNotes` | "What analysis supports solving this problem?" |
| `requirements` | `requirementsList` | "What must this feature do?" |
| `design` | `designNotes` | "How should this feature be designed?" |
| `implementation` | `implementationNotes` | "How will this be implemented?" |
| `validation` | `validationNotes` | "How will this be validated and tested?" |
| `documentation` | `documentationNotes` | "What documentation is required?" |
| `delivery` | `deliveryPlan` | "What is the delivery plan?" |
| `support` | `supportNotes` | "What support considerations exist post-delivery?" |

Initial content hydration: `featureQuery.data?.content as Record<string, Record<string, unknown>>` → access `content?.[stage]?.[fieldKey] as string ?? ''`

---

### Stage Completion Count (for WizardProgress)

A stage is "has content" if `content?.[stage]` exists and has at least one non-empty string value. Pass `completedCount` to `WizardProgress` as a derived value in `WizardShell`:

```typescript
const content = featureQuery.data?.content as Record<string, Record<string, unknown>> | undefined
const completedCount = LIFECYCLE_STAGES.filter(
  (stage) => {
    const s = content?.[stage]
    return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
  }
).length
```

Import `LIFECYCLE_STAGES` from `@life-as-code/validators`.

---

### Accessibility Requirements

- Progress bar: `role="progressbar" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={9} aria-label="Lifecycle stage completion"`
- Stage tabs: `role="tablist"` on container, `role="tab"` + `aria-selected={isActive}` on each tab button
- Textarea: `aria-describedby` pointing to both prompt element ID and hint element ID
- Focus on textarea on stage mount: `useEffect(() => { textareaRef.current?.focus() }, [currentStage])`
- Validation error: `role="alert"` + connect to textarea via `aria-describedby`
- Mode toggle buttons: `aria-pressed={isActive}` on each mode button
- WizardNav Prev/Next: `aria-label="Previous stage"` / `aria-label="Next stage"`

---

### Enter Key Behavior — Textarea vs Advance

In a `<textarea>`, pressing Enter normally inserts a newline. The AC requires Enter to advance. Implement by intercepting `keydown`:

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()   // prevent newline
    onAdvance()          // advance to next stage
  }
  // Shift+Enter falls through → default newline behavior
}
```

Communicate to user via visible hint below textarea: `"Press Enter to continue • Shift+Enter for new line"`

---

### `require-await` Lint Rule (from Story 2.1 learnings)

Avoid marking functions `async` unless they contain `await` expressions. For event handlers and callbacks that return Promises:
- Use `.mutate()` (not `.mutateAsync()`) inside debounce callbacks to avoid the need for `async`/`await`
- If you need to `await` a mutation result, mark the containing function `async` and `await` it — but don't mark non-async functions `async` just for style

---

### `no-non-null-assertion` Lint Rule (from Story 2.1 learnings)

Avoid `!` assertions. Pattern: `value!` → `value ?? fallback` or `value?.property`. Example:
```typescript
// Wrong:
const stage = stages[currentIndex]!
// Right:
const stage = stages[currentIndex] ?? 'problem'
```

---

### Windows Build Notes (from Story 2.1 learnings)

- **Typecheck:** `bun x tsc --noEmit` directly in `apps/nextjs` — do NOT use turbo typecheck (OOM)
- **Lint:** `bunx oxlint --threads 1` from root — do NOT use `bun run lint` (OOM)
- **Build:** `bun run build` in `apps/nextjs` will show "✓ Compiled successfully" then Bun segfaults on Windows post-processing — this is a known Bun/Windows bug, not a code issue; Vercel CI builds succeed

---

### Story 2.1 Learnings

1. `packages/validators` **must be built** (`bun run build` in `packages/validators`) before `apps/nextjs` can typecheck — the `dist/` folder must exist for TypeScript to resolve imports
2. Do NOT import `zod` directly in `apps/nextjs` — all Zod schemas live in `packages/validators`; import the types/schemas from `@life-as-code/validators`
3. `require-await` lint rule: only mark callbacks `async` if they contain `await`
4. `no-non-null-assertion`: use `?.` and `??` instead of `!`
5. SuperJSON transformer is wired in — `Date` objects serialize correctly without manual conversion

---

### What This Story Does NOT Include

- Fast Mode canvas (full stage fields) — Story 2.3
- Mode preference persistence testing — Story 2.3
- Decision log entries (Add Decision form) — Story 2.4
- Tags — Story 2.4
- Feature list page / FeatureCard — Story 2.5
- Feature tree view — Epic 3
- Auth / protected routes — post-MVP

---

### File Structure for This Story

```
apps/nextjs/
  app/(features)/features/
    new/
      page.tsx                          ← CREATE: "use client" — fires create mutation + redirect
    [id]/
      wizard/
        page.tsx                        ← CREATE: RSC — prefetch getFeature + HydrateClient
  components/
    wizard/
      WizardShell.tsx                   ← CREATE: "use client" — main wizard container
      WizardShell.test.tsx              ← CREATE: Vitest unit tests
      WizardProgress.tsx                ← CREATE: "use client" — 2px progress bar
      WizardNav.tsx                     ← CREATE: "use client" — footer Prev/Next + SaveIndicator
      WizardStep.tsx                    ← CREATE: "use client" — Focus Mode single-question layout
      steps/
        ProblemStep.tsx                 ← CREATE
        AnalysisStep.tsx                ← CREATE (has edge-case sub-prompt)
        RequirementsStep.tsx            ← CREATE
        DesignStep.tsx                  ← CREATE
        ImplementationStep.tsx          ← CREATE
        ValidationStep.tsx              ← CREATE
        DocumentationStep.tsx           ← CREATE
        DeliveryStep.tsx                ← CREATE
        SupportStep.tsx                 ← CREATE
  stores/
    WizardStore.ts                      ← CREATE: Zustand + persist middleware
  layout/
    sidebar.tsx                         ← MODIFY: add "New Feature" button/link
```

---

### Project Structure Notes

- All wizard components align with architecture-specified path `apps/nextjs/components/wizard/`
- `WizardStore.ts` aligns with `apps/nextjs/stores/` (existing `UIStore.ts`, `ThemeStore.ts` pattern)
- Route structure `app/(features)/features/[id]/wizard/` follows Next.js App Router conventions and keeps wizard under the `(features)` layout group (which applies `AppShell`)
- **Conflict note:** Architecture says `apps/web/` — override with `apps/nextjs/` (confirmed by Story 2.1)

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.2 — Full BDD acceptance criteria, UX-DR16/17]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Frontend Architecture, Zustand Store Pattern, RSC vs Client Decision Rule, Naming Patterns, Testing Standards]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — WizardShell anatomy, WizardStep Focus Mode, SaveIndicator, Core Flow 1, Keyboard behavior, Accessibility patterns]
- [Source: `life-as-code/apps/nextjs/trpc/react.tsx` — `useTRPC`, `useTRPCClient`, `TRPCReactProvider` — tRPC hooks pattern]
- [Source: `life-as-code/apps/nextjs/trpc/rsc.tsx` — `createTRPC`, `HydrateClient`, `getQueryClient` — RSC prefetch pattern]
- [Source: `life-as-code/apps/nextjs/stores/ui-store.ts` — Zustand store pattern with devtools + persist + subscribeWithSelector]
- [Source: `life-as-code/apps/nextjs/components/layout/app-shell.tsx` — AppShell layout, sidebar/header structure, skip link, `useUIStore.persist.rehydrate()` pattern]
- [Source: `life-as-code/packages/ui/src/components/button.tsx` — `@base-ui/react/button` usage, `Button` + `buttonVariants`]
- [Source: `life-as-code/packages/ui/src/components/save-indicator.tsx` — `SaveIndicator` component, `SaveIndicatorState` type]
- [Source: `life-as-code/packages/ui/src/index.ts` — exported `Button`, `SaveIndicator` from `@life-as-code/ui`]
- [Source: `_bmad-output/implementation-artifacts/2-1-feature-crud-trpc-procedures.md` — Story 2.1 Dev Notes, completion notes, Windows workarounds, `features.updateStage` procedure shape]
- [Source: `life-as-code/packages/validators/src/lifecycle.ts` — `LIFECYCLE_STAGES` const, `LifecycleStage` type]
- [Source: `life-as-code/packages/validators/src/feature.ts` — `UpdateStageSchema` shape: `{ featureId, stage, stageContent: Record<string, unknown> }`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

1. File naming: `unicorn/filename-case` enforces kebab-case for ALL files — story dev notes claiming PascalCase for components/stores are incorrect. All files created in kebab-case (e.g. `wizard-shell.tsx`, `wizard-store.ts`).
2. `SaveIndicatorState` was not exported from `@life-as-code/ui` — added `export type { SaveIndicatorState }` to `packages/ui/src/index.ts` and rebuilt.
3. RSC prefetch pattern: `trpc.features.getFeature.prefetch()` type error — used `getQueryClient().prefetchQuery(trpc.features.getFeature.queryOptions({ id }))` instead.
4. `WizardShell.test.tsx` omitted: no vitest installed; `unicorn/no-empty-file` blocks placeholder files. Wire up when vitest is added.

### File List

- `life-as-code/apps/nextjs/stores/wizard-store.ts` — CREATED
- `life-as-code/apps/nextjs/app/(features)/features/new/page.tsx` — CREATED
- `life-as-code/apps/nextjs/app/(features)/features/[id]/wizard/page.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/wizard-progress.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/wizard-nav.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/wizard-step.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/wizard-shell.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/steps/problem-step.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/steps/analysis-step.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/steps/requirements-step.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/steps/design-step.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/steps/implementation-step.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/steps/validation-step.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/steps/documentation-step.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/steps/delivery-step.tsx` — CREATED
- `life-as-code/apps/nextjs/components/wizard/steps/support-step.tsx` — CREATED
- `life-as-code/apps/nextjs/components/layout/sidebar.tsx` — MODIFIED (added New Feature link)
- `life-as-code/packages/ui/src/index.ts` — MODIFIED (exported SaveIndicatorState type)
