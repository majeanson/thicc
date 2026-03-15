# Quick Tech Spec: Wizard Structured Input & Guided Fields

**Status:** draft
**Date:** 2026-03-14
**Scope:** Focus mode — structured prompts and list-based input for wizard stages

---

## Problem

The current wizard stages use a single free-text textarea per field with no structure. Users must figure out what to write on their own. Stages like Requirements naturally produce a list of items, not a paragraph — forcing list structure into a textarea creates friction. There's no guidance on what good content looks like.

---

## Goal

- Guide users toward richer, better-structured content without blocking them
- Requirements (and similar list-friendly stages) get a `+`-driven list input
- Each stage gets a contextual hint showing an example or starter structure
- Keep it minimal — no form validation gates, no mandatory field patterns

---

## Changes by Stage

### Requirements — List Input (highest priority)

Replace the single textarea with a list builder:

```
What must this feature do?

• [text field for item 1]          [×]
• [text field for item 2]          [×]
• [empty — cursor here]            [×]
  [+ Add requirement]
```

**Behavior:**
- Each item is a single-line `<input type="text">` with a remove `×` button
- `+ Add requirement` button appends a new empty item and focuses it
- `Enter` key in any item adds a new item below and focuses it (no form submit)
- `Backspace` on empty item removes it and focuses the item above
- `↑` / `↓` arrow keys move focus between items
- `Tab` moves to the next item (natural browser behavior)
- Value is serialized as a newline-joined string (`items.join('\n')`) and stored in the existing `requirementsList` field — backwards compatible with existing textarea-saved data (split by `\n` on load)
- When loading, if saved value contains `\n`, split into items; otherwise treat as single item

### All Other Focus-Mode Stages — Contextual Starter Hints

For stages that stay as textarea (problem, analysis, design, implementation, validation, documentation, delivery, support):

Add a **collapsible hint** below the prompt that shows an example structure. Collapsed by default, revealed by clicking "See example →":

| Stage | Example hint text |
|---|---|
| Problem | "e.g. Users on mobile can't filter search results by date, causing them to scroll through hundreds of irrelevant entries." |
| Analysis | "e.g. Root cause: the filter component doesn't render on viewports < 768px. Impact: ~40% of users on mobile. Context: filtering was added desktop-first." |
| Design | "e.g. Add a collapsible filter drawer triggered by a 'Filter' button. Drawer contains date range picker + category chips. Closes on backdrop tap." |
| Implementation | "e.g. Modified `FilterDrawer.tsx` to use `position: fixed` instead of relative. Added `useMediaQuery` hook to render drawer trigger on mobile. Filter state lifted to URL params." |
| Validation | "e.g. Tested on iPhone 14 Pro (Safari) and Pixel 7 (Chrome). All filter types work. Edge case: very long category names truncate correctly." |
| Documentation | "e.g. Updated component README with new `mobileDrawer` prop. Added mobile filter to the user guide." |
| Delivery | "e.g. Feature flagged under `mobile-filter-v1`. Deploy to staging first. Monitor filter usage events in analytics for 48h before full rollout." |
| Support | "e.g. If filter drawer doesn't open: check viewport width detection in `useMediaQuery`. Known issue: drawer z-index conflict with cookie banner (workaround: dismiss cookie banner first)." |

The hint is shown as:
```
[Hint: See example →]   (clicking expands inline, clicking again collapses)
```

---

## Data Compatibility

The `requirementsList` field currently stores a plain string in JSONB. The new list input serializes to/from `\n`-delimited string, so:
- Old data (no newlines): treated as a single item on load
- New data: newline-delimited items
- The tRPC `updateStage` mutation is unchanged — still receives `stageContent: Record<string, string>`

---

## Files to Create/Modify

```
apps/nextjs/components/wizard/
  requirements-list-input.tsx     ← CREATE: list builder component ("use client")
  stage-hint.tsx                  ← CREATE: collapsible example hint ("use client")
  steps/
    requirements-step.tsx         ← MODIFY: replace WizardStep with RequirementsListInput + StageHint
    problem-step.tsx              ← MODIFY: add StageHint
    analysis-step.tsx             ← MODIFY: add StageHint
    design-step.tsx               ← MODIFY: add StageHint
    implementation-step.tsx       ← MODIFY: add StageHint
    validation-step.tsx           ← MODIFY: add StageHint
    documentation-step.tsx        ← MODIFY: add StageHint
    delivery-step.tsx             ← MODIFY: add StageHint
    support-step.tsx              ← MODIFY: add StageHint
```

---

## Out of Scope (refine later)

- Fast mode structured fields (canvas stays as-is for now)
- Decision log structured input (already has its own form)
- Drag-to-reorder for requirements list items
- Nested sub-requirements
- AI-assisted starter content

---

## Open Questions

1. Should `Enter` in the requirements list advance to the next wizard stage (current focus mode behavior) or add a new list item? → Proposed: add new item; user advances via the "Continue" button or clicking the next stage tab.
2. Should the stage hint auto-expand on first visit for empty stages? → Proposed: no — keep collapsed, user opts in.
3. Should hints be per-user dismissible permanently? → Proposed: no for now — keep simple.
