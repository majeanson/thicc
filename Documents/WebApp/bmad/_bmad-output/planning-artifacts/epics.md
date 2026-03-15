---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: complete
completedAt: '2026-03-14'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# life-as-code - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for life-as-code, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can create a new feature artifact with a unique identifier, problem statement, and reporter context
FR2: Users can progress a feature through 9 lifecycle stages (Problem → Analysis → Requirements → Design → Implementation → Validation → Documentation → Delivery → Support) in any order
FR3: Users can fill lifecycle stages progressively — quick capture (required fields only), standard (required + standard fields), or deep (all fields + custom extensions)
FR4a: Users can view a feature's provenance chain as a stage-by-stage summary (which stages are filled, completion status, key decisions)
FR4b: Users can drill into any individual lifecycle stage to view its full detail
FR5: Users can add decision log entries with timestamped what/why/alternatives-considered records at any lifecycle stage
FR6: System enforces required fields based on the active schema configuration before a feature can be marked complete
FR7: Users can add tags to features for categorization and discoverability
FR8: Users can freeze a completed feature, making it read-only
FR9: Users can spawn a new child feature from any existing feature with an explicit spawn reason
FR10: System maintains parent-child linkage between spawned features and their origins
FR11: Users can view the full lineage of a feature — its parent, siblings, and children
FR12: System prevents editing of frozen features (enforces immutability)
FR13: Users can view all features as a navigable tree structure showing parent-child relationships
FR14: Users can browse the feature tree to understand how features evolved over time
FR15: Users can expand/collapse tree nodes to focus on specific feature branches
FR16: Users can view feature summary information (status, completion level, stage progress) from the tree view
FR17: Users can create and edit features through a step-by-step wizard that walks through lifecycle stages sequentially
FR18: Wizard prompts users with contextual guidance at each stage (e.g., edge case prompting at analysis stage)
FR19: Wizard enforces required field completion before allowing progression past validation checkpoints
FR20: Users can save and resume wizard progress at any point (partial completion)
FR21: Users can switch between wizard mode and raw JSON mode for the same feature
FR22: Users can view and edit the complete JSON representation of any feature directly
FR23: System validates JSON edits against the active schema before saving
FR24: Users can copy/export the JSON of any individual feature
FR25: Users can perform full-text search across all feature artifacts (all stages, all fields)
FR26: Users can filter search results by lifecycle stage, tags, feature status, and completion level
FR27: Search results display provenance context (feature ID, title, matching stage, relevant snippet)
FR28: Users can search by domain concept (e.g., "menu filtering") and find all related features
FR29: Admin can define required fields (enforced for feature completion)
FR30: Admin can define standard fields (guided by wizard, skippable)
FR31: Admin can define custom extension fields (flexible, team-specific)
FR32: Admin can create feature templates with pre-populated field structures
FR33: System validates all feature data against the active schema configuration
FR34: When a new required field is added to the schema, system flags all existing features that need updating with the new field
FR35: When non-required schema changes are made, existing features remain valid and unaffected
FR36: System records a timestamped history of all mutations to a feature (who changed what, when)
FR37: Users can view the change history of any feature to understand how it evolved over time
FR38: Users can add annotations/notes to any feature at any lifecycle stage
FR39: Users can view all annotations on a feature in chronological order
FR40: Users can flag a feature for attention (e.g., "needs new child feature", "gap identified")
FR41: Users can view a home/overview screen that provides entry points to feature tree, search, and recent activity
FR42: Admin can export all features as a JSON bundle (full project backup)

### NonFunctional Requirements

NFR1: Page transitions and wizard step navigation complete in < 500ms
NFR2: Full-text search returns results in < 1 second for datasets up to 1,000 features
NFR3: Feature tree renders and is interactive within 1 second for trees up to 500 nodes
NFR4: JSON save operations (wizard or raw edit) complete in < 500ms
NFR5: Application feels responsive — no perceptible lag on standard user interactions
NFR6: JSONB data is validated against schema on every write operation — no invalid data enters the database
NFR7: Feature immutability is enforced at the database level — frozen features cannot be modified through any interface
NFR8: All feature mutations are atomic — partial saves never corrupt feature state
NFR9: Full project JSON export produces a complete, re-importable backup
NFR10: Codebase follows modern framework conventions and idiomatic patterns
NFR11: Code is well-structured with clear separation of concerns (API / business logic / data / UI)
NFR12: Automated tests cover critical paths — schema validation, immutability enforcement, search accuracy, wizard flow completion
NFR13: No known security vulnerabilities in dependencies at time of release
NFR14: JSON schema is designed for direct LLM consumption — feature artifacts are self-contained, structured, and parseable without summarization or RAG
NFR15: Feature JSON structure uses clear, descriptive field names and consistent patterns that AI agents can consume as context without transformation
NFR16: Data model supports multi-tenant isolation via `org_id` without schema changes
NFR17: API layer structured to accept auth middleware without refactoring
NFR18: No architectural decisions that prevent horizontal scaling post-MVP
NFR19: Application is keyboard-navigable for core workflows (create feature, search, browse tree)
NFR20: UI meets WCAG 2.1 Level A as a baseline — proper contrast, labels, semantic HTML

### Additional Requirements

- **Starter Template:** Create-Yuki-Stack is the selected starter. Bootstrap via `bun create yuki-stack` selecting Next.js + tRPC + Drizzle + PostgreSQL. This is the Epic 1 Story 1 foundation.
- **Monorepo Structure:** Turborepo with `apps/web` (Next.js 15 App Router), `packages/api` (tRPC v11 router), `packages/db` (Drizzle ORM + migrations), `packages/ui` (shadcn/ui + Tailwind CSS v4), `packages/validators` (Zod schemas shared FE/BE)
- **Database Provider:** Neon (managed PostgreSQL with JSONB support, DB branching, native Vercel integration). Environment configured via `DATABASE_URL`.
- **Deployment:** `apps/web` → Vercel. tRPC handlers served via Next.js API routes (no separate server). GitHub Actions CI/CD (lint, typecheck, test, bun audit on PR).
- **Environment variable validation:** `@t3-oss/env-nextjs` for Zod-validated env vars at build time.
- **Data Model — features table:** `id` (ULID), `feature_key` (feat-YYYY-NNN, generated per org_id), `org_id` (UUID, from day one), `status` (ENUM: active/draft/frozen), `frozen` (BOOLEAN), `parent_id` (ULID, nullable), `content` (JSONB), `created_at`, `updated_at`.
- **Data Model — feature_events table (append-only audit trail):** `id`, `feature_id`, `org_id`, `event_type` (ENUM: FEATURE_CREATED, FEATURE_UPDATED, FEATURE_FROZEN, FEATURE_SPAWNED, STAGE_UPDATED, ANNOTATION_ADDED, SCHEMA_UPDATED), `changed_fields` (JSONB delta), `actor` (user ID or "system"), `created_at`.
- **Data Model — schema_configs table:** `id`, `org_id`, `config` (JSONB — 3-layer schema), `created_at`, `updated_at`.
- **Immutability — defense in depth:** Layer 1: PostgreSQL trigger blocking UPDATE/DELETE when `frozen = true`. Layer 2: tRPC mutation validates `frozen` state before write.
- **Full-Text Search:** tsvector generated column with GIN index across all JSONB text content. pg_trgm index for partial/fuzzy match. Both standard PostgreSQL extensions.
- **Zod validation:** Single validation engine in `packages/validators` — shared by wizard saves, raw JSON edits, tRPC procedure inputs. One schema definition, enforced on every write.
- **Atomicity pattern:** All mutations writing to `features` AND `feature_events` MUST use a single Drizzle transaction. No partial writes.
- **tRPC procedure tiers:** MVP uses `publicProcedure` throughout. `protectedProcedure` and `adminProcedure` defined but inactive (post-MVP RBAC promotion is a one-line change per procedure).
- **tRPC Router namespaces:** `features.*` (create, read, update, freeze, spawn), `features.admin.*` (schema config, templates), `search.*` (full-text, filtering), `events.*` (audit trail reads).
- **RSC data fetching:** Server pages prefetch via `trpc.procedure.fetch()`. Client components hydrate via `HydrateClient` + `useQuery(trpc.procedure.queryOptions())`. No `useEffect` data fetching.
- **State management:** Server state via TanStack Query (tRPC). Client UI state via Zustand. Zustand stores co-located with features, not global.
- **Feature ID strategy:** Internal references use ULID (`id`). Display/provenance uses `feat-YYYY-NNN` (`feature_key`). Both stored; both used in different contexts.
- **No save buttons:** Auto-save on every keystroke. SaveIndicator (dot + status) provides feedback.
- **Frozen feature edit intercept:** Attempts to edit frozen features trigger SpawnDialog — not an error state. Dialog pre-loads parent context.
- **Package boundaries:** `apps/web` → `packages/api` → `packages/db` (never skip layers). `apps/web` never imports from `packages/db` directly.
- **Testing infrastructure:** Vitest for unit/integration (tRPC procedures, schema validation, immutability, search). Playwright for E2E (wizard flow, tree navigation).
- **Tailwind v4 + shadcn/ui compatibility:** Verify component availability on Tailwind v4 in first implementation story. Flag any gaps.

### UX Design Requirements

UX-DR1: Implement three-layer design token system — brightness (dark/light), visual character (code-like/human-like), and theme/accent — with all tokens as CSS variables persisted to localStorage
UX-DR2: Implement base surface color tokens for all four mode combinations: Code Dark (zinc-950/900), Code Light (white/zinc-50), Human Dark (stone-950/900), Human Light (stone-50/white)
UX-DR3: Implement visual character tokens: `--radius` (2px code / 10px human), `--font-family-prose`, `--line-height-prose` (1.4 code / 1.75 human), `--spacing-density`, `--color-border`
UX-DR4: Implement 6 preset accent theme palettes (Indigo default, Emerald, Rose, Amber, Cyan, Slate) with verified compatibility across all brightness + character combinations
UX-DR5: Implement fixed feature-state color tokens (not themeable): `--color-feature-active` (blue-500), `--color-feature-frozen` (purple-500), `--color-feature-draft` (gray-500), `--color-feature-flagged` (amber-500)
UX-DR6: Implement Dark Operator default theme: stone-950/900 surfaces, stone-100/400 text, rose-400 accent, 2px/10px radius per character mode
UX-DR7: Implement typography system — Inter/Geist for UI+prose, JetBrains Mono/Geist Mono for feature keys and JSON content (always monospace regardless of theme)
UX-DR8: Implement 8px-grid spacing foundation with density tokens varying per visual character mode
UX-DR9: Implement app shell layout: fixed 48px header, 240px left sidebar (collapsible to 48px icon rail), fluid main content (max 800px wizard/detail, full-width tree/search)
UX-DR10: Build `FeatureStateBadge` component — icon + label, states: frozen (purple ✦), active (blue ●), draft (gray ○), flagged (amber ⚑). Variants: full/compact/dot. `aria-label` on compact/dot variants.
UX-DR11: Build `StageCompletionIndicator` component — 5 pips (9 stages → 5 groups), filled/empty states, row and detail variants. `aria-label="3 of 9 lifecycle stages complete"`.
UX-DR12: Build `FeatureCard` component — feature key (monospace) + title + FeatureStateBadge + StageCompletionIndicator + metadata row. Variants: compact/full. `role="article"`.
UX-DR13: Build `TreeNode` component — expand toggle + feature key + title + badges. Expanded state adds problem statement summary + stage count + spawn children count + "View full feature →" CTA. `aria-expanded`, keyboard navigation.
UX-DR14: Build `ProvenanceChain` component — vertical timeline, each stage: dot (filled/empty) + stage name + content + optional DecisionLogEntry. Collapse/expand inline. `role="list"`.
UX-DR15: Build `DecisionLogEntry` component — left accent border + "Decision" label + text + metadata. Inline and standalone variants. `<time>` element for timestamps.
UX-DR16: Build `WizardShell` component — progress bar (2px top) + mode toggle (⚡/🎯) + stage tabs + main content area + footer (SaveIndicator + prev/next). Focus Mode and Fast Mode child components. Stage tabs `role="tablist"`, progress bar `role="progressbar"`.
UX-DR17: Build `WizardStep — Focus Mode` component — single-question full-screen layout. One prompt, large textarea, enter-to-advance, Shift+Enter = newline, Esc = exit. `aria-describedby` pointing to prompt + hint.
UX-DR18: Build `WizardStep — Fast Mode` component — full stage canvas, all fields visible, organized field groups, 2-column desktop / 1-column mobile, "Show extended fields ▾" toggle. Each field group `role="group"` with `aria-labelledby`.
UX-DR19: Build `SpawnDialog` component — parent feature context (read-only) + spawn reason field (required) + inherited tags preview + Create button. Triggered by frozen feature edit intercept. Focus moves to spawn reason on open.
UX-DR20: Build `SearchResult` component — feature key (monospace) + title + FeatureStateBadge + stage badge + 2-line highlighted snippet. `role="article"` with stage context in `aria-label`.
UX-DR21: Build `AnnotationItem` component — author initial + name + timestamp + text + flag toggle. States: default, flagged (amber). `aria-label` and `aria-pressed` on flag toggle.
UX-DR22: Build `JsonEditor` component — CodeMirror 6 wrapper + validation status bar (✓ Valid / ✗ Error count) + format-on-save. `"use client"` + `dynamic import ssr: false`. Status bar `role="status"`.
UX-DR23: Build `SaveIndicator` component — 6px dot + text, states: saved (green), saving (amber, pulsing), error (red). Lives in wizard footer and feature detail header. `role="status"`, `aria-live="polite"`.
UX-DR24: Build `SchemaEditor` admin component — 3-layer schema config UI (required/standard/custom field layers) with field type selectors and toggle controls.
UX-DR25: Build `TemplateManager` admin component — list of feature templates with create/clone/delete actions.
UX-DR26: Build `ExportPanel` admin component — full JSON bundle export with optional filters (stage, status, tags) and file download.
UX-DR27: Implement WCAG 2.1 Level AA compliance — target contrast ratios verified: body text 16.5:1, muted text 5.2:1, accent 4.8:1 against dark background
UX-DR28: Implement keyboard navigation: skip link ("Skip to main content") as first focusable element, Tab order (sidebar → main → detail), Enter/↑↓ for all interactive lists, Cmd+K for global search with focus trap
UX-DR29: Implement ARIA patterns for all interactive elements: `aria-expanded` (tree), `aria-live="polite"` (save status), `role="status"` (toasts), `role="list"`/`listitem"` (provenance chain), `aria-modal="true"` + focus trap (modals)
UX-DR30: Implement `prefers-reduced-motion` media query — disable wizard slide transitions, skeleton pulse, toast slide-in when set
UX-DR31: Implement forced-colors (high contrast) mode support — border-based state indicators, text alternatives for all meaningful icons
UX-DR32: Integrate `eslint-plugin-jsx-a11y` in CI and `axe-core` in Playwright E2E suite (every view scanned)
UX-DR33: Implement responsive layout — full canvas ≥1024px, icon-rail + toggle panels at 768–1023px, bottom drawer/overlay at <768px
UX-DR34: Implement feature tree mobile view — full-screen overlay triggered by persistent "Browse features" button, indent depth capped, deep lineage truncated with "…N more levels"
UX-DR35: Implement fluid typography: `font-size: clamp(0.875rem, 2vw, 1rem)` where density matters
UX-DR36: Implement toast notification system — 4 variants (success/error/warning/info) with left border color coding, bottom-center, 3s auto-dismiss, accessible `role="status"`
UX-DR37: Implement inline validation pattern — show on blur only (never keystroke), error text below field in red, field border shifts to red, no success visual change
UX-DR38: Implement frozen feature guard — intercept edit attempts immediately, show SpawnDialog with explanation copy, never show field as editable
UX-DR39: Implement 4-tier button hierarchy: Primary (bg-accent fill), Secondary (border outline), Ghost/Tertiary (no border, text-muted), Destructive (amber/red, 2-step confirmation)
UX-DR40: Implement consistent focus rings: `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg` on all interactive elements — never remove
UX-DR41: Implement global search (Cmd+K) — grouped results (exact ID → title → content), keyboard navigation (↑↓/Enter/Esc), recent features before keystroke, stage badge per result
UX-DR42: Implement URL-synced filters — active filters reflected in URL query params (e.g., `?stage=implementation&sort=updated`) for shareability; navigating to URL restores state
UX-DR43: Implement loading states — animate-pulse shimmer blocks matching actual content layout. Spinner only for button-triggered async actions (16px inline in button). Never spinner for layout-level loading.
UX-DR44: Implement empty states as invitations not failures — "Start here..." for empty fields, "Create your first feature" CTA for empty tree, contextual suggestions for empty search
UX-DR45: Implement feature detail tabs (Overview / Decisions / Annotations / History) with URL hash sync and ←→ keyboard navigation when tab strip focused
UX-DR46: Implement breadcrumb navigation for feature detail: `[Project] › [Parent Feature ID] › feat-YYYY-NNN` with linked IDs, truncated on mobile
UX-DR47: Implement sidebar collapse state stored in localStorage and Zustand UIStore — collapsible to 48px icon rail with instant toggle

### FR Coverage Map

```
FR1:  Epic 2 — Create new feature artifact with ID, problem statement, reporter context
FR2:  Epic 2 — Progress feature through 9 lifecycle stages
FR3:  Epic 2 — Progressive completion (quick/standard/deep)
FR4a: Epic 3 — View provenance chain as stage-by-stage summary
FR4b: Epic 3 — Drill into individual lifecycle stage full detail
FR5:  Epic 2 — Add timestamped decision log entries at any stage
FR6:  Epic 2 — Required field enforcement before marking complete
FR7:  Epic 2 — Add tags to features
FR8:  Epic 4 — Freeze a completed feature (read-only)
FR9:  Epic 4 — Spawn child feature with explicit spawn reason
FR10: Epic 4 — System maintains parent-child linkage
FR11: Epic 4 — View full lineage (parent, siblings, children)
FR12: Epic 4 — Prevent editing of frozen features
FR13: Epic 3 — View all features as navigable tree (parent-child)
FR14: Epic 3 — Browse feature tree to understand evolution
FR15: Epic 3 — Expand/collapse tree nodes
FR16: Epic 3 — View feature summary info from tree view
FR17: Epic 2 — Step-by-step wizard creation through lifecycle stages
FR18: Epic 2 — Wizard contextual guidance at each stage
FR19: Epic 2 — Wizard required field enforcement before progression
FR20: Epic 2 — Save and resume wizard progress (partial completion)
FR21: Epic 5 — Switch between wizard mode and raw JSON mode
FR22: Epic 5 — View and edit complete JSON representation directly
FR23: Epic 5 — Validate JSON edits against active schema before saving
FR24: Epic 5 — Copy/export JSON of any individual feature
FR25: Epic 3 — Full-text search across all feature artifacts
FR26: Epic 3 — Filter search by stage, tags, status, completion level
FR27: Epic 3 — Search results display provenance context + snippet
FR28: Epic 3 — Search by domain concept
FR29: Epic 6 — Admin defines required fields
FR30: Epic 6 — Admin defines standard fields
FR31: Epic 6 — Admin defines custom extension fields
FR32: Epic 6 — Admin creates feature templates
FR33: Epic 6 — System validates all feature data against active schema
FR34: Epic 6 — Flag existing features when new required field added to schema
FR35: Epic 6 — Non-required schema changes don't affect existing features
FR36: Epic 1 — System records timestamped mutation history (infrastructure: feature_events table + write pattern)
FR37: Epic 7 — Users can view change history of any feature (audit trail UI)
FR38: Epic 7 — Add annotations/notes to any feature at any stage
FR39: Epic 7 — View all annotations chronologically
FR40: Epic 7 — Flag a feature for attention
FR41: Epic 3 — Home/overview screen with entry points to tree, search, activity
FR42: Epic 7 — Admin exports all features as JSON bundle
```

## Epic List

### Epic 1: Foundation & Infrastructure Setup
Establish the complete technical foundation — monorepo, database schema, deployment pipeline, app shell, and design system — so that all subsequent epics can deliver user value on top of a working, deployed stack.
**FRs covered:** FR36 (infrastructure portion — `feature_events` table and append-only write pattern)
**Architecture covered:** Create-Yuki-Stack bootstrap, all 3 database tables (`features`, `feature_events`, `schema_configs`), Neon + Vercel deployment, GitHub Actions CI/CD, `@t3-oss/env-nextjs`, `packages/validators` foundation
**UX covered:** Design token system (UX-DR1–9), app shell layout, Dark Operator default theme, button hierarchy (UX-DR39), focus ring standards (UX-DR40), toast notification system (UX-DR36), `SaveIndicator` component (UX-DR23), accessibility infrastructure (UX-DR27, UX-DR32)

### Epic 2: Feature Creation & Lifecycle Management via Wizard
Developers and PMs can create feature artifacts through a guided wizard (Focus Mode and Fast Mode), fill lifecycle stages progressively, log decisions, and add tags — delivering the core "thinking tool" experience of life-as-code.
**FRs covered:** FR1, FR2, FR3, FR5, FR6, FR7, FR17, FR18, FR19, FR20
**UX covered:** `WizardShell` (UX-DR16), `WizardStep — Focus Mode` (UX-DR17), `WizardStep — Fast Mode` (UX-DR18), `FeatureStateBadge` (UX-DR10), `StageCompletionIndicator` (UX-DR11), `FeatureCard` (UX-DR12), inline validation (UX-DR37), empty states (UX-DR44)

### Epic 3: Feature Discovery — Search, Tree & Provenance
Developers, support engineers, and new team members can find features via full-text search with filters, navigate the feature tree to understand relationships, and read the complete provenance chain — enabling the < 30-second "why" lookup.
**FRs covered:** FR4a, FR4b, FR13, FR14, FR15, FR16, FR25, FR26, FR27, FR28, FR41
**UX covered:** `SearchBar` Cmd+K (UX-DR41), `SearchResult` (UX-DR20), `SearchFilters` with URL-synced state (UX-DR42), `FeatureTree` via react-arborist (UX-DR13), `ProvenanceChain` (UX-DR14), `DecisionLogEntry` (UX-DR15), feature detail view with tabs (UX-DR45), breadcrumb navigation (UX-DR46), mobile tree overlay (UX-DR34)

### Epic 4: Feature Immutability & Lineage
Teams can freeze completed features (making them permanent, immutable records) and spawn child features to evolve functionality without destroying history — implementing the core immutability model that makes provenance trustworthy.
**FRs covered:** FR8, FR9, FR10, FR11, FR12
**UX covered:** `SpawnDialog` — frozen feature edit intercept (UX-DR19), frozen feature guard (UX-DR38)

### Epic 5: Raw JSON Access & Dual-Mode Editing
Developers can view, edit, and export the raw JSON of any feature, switch between wizard and JSON modes, and receive live schema validation feedback — delivering the speed and precision developers need.
**FRs covered:** FR21, FR22, FR23, FR24
**UX covered:** `JsonEditor` CodeMirror 6 (UX-DR22), wizard ↔ JSON mode switching, JSON validation status bar

### Epic 6: Admin — Schema Configuration & Templates
Admins can configure the three-layer schema (required/standard/custom fields), create feature templates, and manage how schema changes propagate to existing features — enabling team-wide consistency and customization.
**FRs covered:** FR29, FR30, FR31, FR32, FR33, FR34, FR35
**UX covered:** `SchemaEditor` (UX-DR24), `TemplateManager` (UX-DR25), admin panel

### Epic 7: Annotations, Audit Trail & Export
Team members can annotate and flag features for attention, view the complete change history of any feature, and export the full project as a JSON bundle — completing the collaborative and operational layer of life-as-code.
**FRs covered:** FR37, FR38, FR39, FR40, FR42
**UX covered:** `AnnotationItem` (UX-DR21), `ExportPanel` (UX-DR26), `AuditHistory` component

---

## Epic 1: Foundation & Infrastructure Setup

Establish the complete technical foundation — monorepo, database schema, deployment pipeline, app shell, and design system — so that all subsequent epics can deliver user value on top of a working, deployed stack.

### Story 1.1: Monorepo Bootstrap & Development Environment

As a developer,
I want a working monorepo project structure with all required packages configured,
So that the team has a consistent, reproducible development environment to build life-as-code on.

**Acceptance Criteria:**

**Given** the Create-Yuki-Stack CLI is available,
**When** `bun create yuki-stack` is run with Next.js + tRPC + Drizzle + PostgreSQL selections,
**Then** the monorepo is initialized with `apps/web`, `packages/api`, `packages/db`, `packages/ui`, `packages/validators` packages all present and correctly linked via Turborepo

**Given** the monorepo is initialized,
**When** `bun dev` is run from the root,
**Then** the Next.js dev server starts and the app loads at localhost:3000 without errors

**Given** the packages are configured,
**When** TypeScript strict mode is enabled across all packages with project references,
**Then** `bun typecheck` passes across all packages without errors

**Given** the project needs environment validation,
**When** `@t3-oss/env-nextjs` is configured requiring `DATABASE_URL`,
**Then** attempting to start or build the app with a missing `DATABASE_URL` fails with a descriptive error at startup — not at runtime

**Given** the project needs CI/CD,
**When** a GitHub Actions workflow is configured for PR checks (lint, typecheck, `bun audit`),
**Then** all CI steps pass on the initial codebase and the workflow is visible in the repository

### Story 1.2: Core Database Schema

As a developer,
I want the core database tables created and migrated in Neon,
So that feature data can be persisted and the append-only audit trail infrastructure is in place from day one.

**Acceptance Criteria:**

**Given** Drizzle ORM is configured with a Neon connection string,
**When** `bun db:migrate` is run,
**Then** the `features` table is created with all required columns: `id` (ULID), `feature_key` (VARCHAR, feat-YYYY-NNN format), `org_id` (UUID), `status` (ENUM: active/draft/frozen), `frozen` (BOOLEAN default false), `parent_id` (ULID nullable), `content` (JSONB), `created_at`, `updated_at`

**Given** the migration runs,
**When** it completes,
**Then** the `feature_events` table is created with: `id` (ULID), `feature_id` (ULID), `org_id` (UUID), `event_type` (ENUM: FEATURE_CREATED, FEATURE_UPDATED, FEATURE_FROZEN, FEATURE_SPAWNED, STAGE_UPDATED, ANNOTATION_ADDED, SCHEMA_UPDATED), `changed_fields` (JSONB), `actor` (VARCHAR), `created_at`

**Given** the features table exists,
**When** the immutability trigger migration runs,
**Then** attempting to UPDATE or DELETE any `features` row where `frozen = true` raises a database exception and the operation is blocked at the DB level — verifiable via direct SQL test

**Given** the features table exists,
**When** a tsvector generated column with GIN index and a pg_trgm index are applied across JSONB text content,
**Then** `EXPLAIN ANALYZE` on a full-text search query confirms the GIN index is used

**Given** the schema is defined in Drizzle,
**When** TypeScript types are inferred from the schema,
**Then** all table types are correctly generated with no `any` types and column types map accurately to the schema definitions

### Story 1.3: Vercel Deployment Pipeline

As a developer,
I want the app deployed to Vercel connected to Neon with the full CI/CD pipeline verified,
So that there is a working production URL from day one and deployments are automated on merge.

**Acceptance Criteria:**

**Given** the monorepo is connected to a Vercel project,
**When** a commit is pushed to `main`,
**Then** Vercel automatically builds and deploys `apps/web` and the deployment succeeds at the production URL

**Given** the Neon `DATABASE_URL` is set as a Vercel environment variable,
**When** the deployed app boots,
**Then** `@t3-oss/env-nextjs` validates the env var successfully and the app is accessible without runtime errors

**Given** a PR is opened against `main`,
**When** GitHub Actions CI runs,
**Then** lint, typecheck, test, and `bun audit` steps all complete and their pass/fail status is reported on the PR

**Given** Neon DB branching is configured,
**When** a Vercel preview deployment is triggered on a PR,
**Then** the preview environment connects to a Neon development branch (not the production database)

### Story 1.4: App Shell & Navigation Layout

As a user,
I want a consistent application shell with header and collapsible sidebar navigation,
So that I can navigate between all main areas of the app from any page.

**Acceptance Criteria:**

**Given** the app is loaded on desktop (≥1024px),
**When** any page renders,
**Then** a fixed 48px header is displayed with the app name and a persistent 240px left sidebar with navigation links to Feature Tree, Search, and Admin

**Given** the sidebar is visible,
**When** the collapse toggle is clicked,
**Then** the sidebar animates to a 48px icon-rail, the main content expands to fill the space, and the new state is persisted to localStorage

**Given** the sidebar state was previously persisted,
**When** the page is refreshed,
**Then** the sidebar renders in its previously saved state without flash (Zustand UIStore hydrated from localStorage)

**Given** the app is loaded on mobile (<768px),
**When** the layout renders,
**Then** the sidebar is hidden and replaced by a hamburger button that opens a full-screen nav overlay

**Given** the semantic HTML requirement,
**When** the app shell renders,
**Then** `<header>`, `<nav>`, `<main>`, and `<aside>` elements are used with appropriate `aria-label` attributes and a visually-hidden "Skip to main content" link is the first focusable element

**Given** a nav link is active,
**When** the current route matches a nav item,
**Then** the active nav item receives a visible accent-color indicator distinguishing it from inactive items

### Story 1.5: Design System Foundation & Accessibility Infrastructure

As a developer,
I want the design token system, base themes, and accessibility tooling configured,
So that all future UI components are built on a consistent, accessible, and themeable foundation.

**Acceptance Criteria:**

**Given** Tailwind CSS v4 and shadcn/ui are configured,
**When** the Dark Operator default theme CSS variables are applied,
**Then** the app renders with the correct palette: `--bg: #1c1917`, `--bg-raised: #292524`, `--text: #f5f5f4`, `--text-muted: #a8a29e`, `--border: #44403c`, `--accent: #fb7185`

**Given** the three-layer token system is implemented,
**When** brightness, visual character, or accent theme CSS variables are changed,
**Then** all themed elements update correctly without component-level changes, and the preference is persisted to localStorage

**Given** the button hierarchy is required,
**When** Primary, Secondary, Ghost/Tertiary, and Destructive button variants are built in `packages/ui`,
**Then** each variant renders with the correct spec styling and all are keyboard-focusable with visible focus rings

**Given** the focus ring standard,
**When** any interactive element receives keyboard focus via Tab,
**Then** `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg` is applied and clearly visible — never hidden

**Given** the toast notification system,
**When** `showToast({ type, message })` is called with success/error/warning/info,
**Then** a toast renders bottom-center with the correct left-border color (emerald/red/amber/accent), auto-dismisses after 3s, and carries `role="status"` for screen readers

**Given** the `SaveIndicator` component,
**When** rendered in `saved | saving | error` state,
**Then** the correct 6px dot color and text label render with `role="status"` and `aria-live="polite"` — no save button present

**Given** `prefers-reduced-motion` is active in the OS,
**When** any animated UI element renders,
**Then** all CSS transitions and animations are suppressed via `@media (prefers-reduced-motion: reduce)`

**Given** accessibility CI tooling,
**When** `eslint-plugin-jsx-a11y` is added to ESLint and `axe-core` is integrated into the Playwright setup,
**Then** the CI pipeline fails on Level AA accessibility violations in any scanned page or component

---

## Epic 2: Feature Creation & Lifecycle Management via Wizard

Developers and PMs can create feature artifacts through a guided wizard (Focus Mode and Fast Mode), fill lifecycle stages progressively, log decisions, and add tags — delivering the core "thinking tool" experience of life-as-code.

### Story 2.1: Feature CRUD tRPC Procedures

As a developer,
I want tRPC procedures for creating, reading, and updating feature artifacts with atomic event logging,
So that all feature data flows through a validated, type-safe API that enforces business rules on every write.

**Acceptance Criteria:**

**Given** the `features` router in `packages/api`,
**When** `features.create` is called with a problem statement and reporter context,
**Then** a new `features` row is inserted with a generated ULID `id`, a `feature_key` in `feat-YYYY-NNN` format, `status: 'draft'`, `frozen: false`, and a corresponding `FEATURE_CREATED` event is written to `feature_events` in the same Drizzle transaction

**Given** Zod validators in `packages/validators`,
**When** `features.create` or `features.updateStage` receive input,
**Then** the input is validated against the Zod schema before any DB write, and a `BAD_REQUEST` tRPC error with field-level detail is returned for invalid input

**Given** the atomicity requirement,
**When** `features.updateStage` writes a stage update,
**Then** the `features.content` JSONB update and the `STAGE_UPDATED` event write to `feature_events` are executed in a single Drizzle transaction — if either fails, both roll back

**Given** `features.getFeature` is called with a valid `id`,
**When** the procedure executes,
**Then** the full feature row including `content` JSONB is returned with correct TypeScript types inferred from the Drizzle schema

**Given** `features.listFeatures` is called,
**When** no filters are applied,
**Then** all features for the default `org_id` are returned sorted by `updated_at` descending

**Given** the tRPC procedure tier setup,
**When** all feature procedures are defined,
**Then** they use `publicProcedure` and the context shape includes `user: null` — ready for post-MVP auth promotion with no signature changes

### Story 2.2: Wizard UI Shell & Focus Mode

As a product manager or developer,
I want a step-by-step guided wizard in Focus Mode that walks me through one lifecycle stage question at a time,
So that I'm prompted to think through each aspect of the feature without being overwhelmed by all fields at once.

**Acceptance Criteria:**

**Given** a user navigates to "New Feature",
**When** the wizard opens,
**Then** the `WizardShell` renders with a 2px progress bar at top, stage tabs, a mode toggle (⚡ Fast / 🎯 Focus) defaulting to Focus, and a footer with SaveIndicator and Prev/Next buttons

**Given** Focus Mode is active,
**When** a wizard stage renders,
**Then** a single large prompt fills the screen (e.g. "What human problem triggered this feature?"), a large textarea is focused, and no other fields are visible

**Given** the user types in a Focus Mode field,
**When** any keystroke occurs,
**Then** the content auto-saves via `features.updateStage` within 500ms and the `SaveIndicator` transitions through `saving → saved` states

**Given** the wizard is on any stage,
**When** the user presses Enter,
**Then** the wizard advances to the next stage; when Shift+Enter is pressed, a newline is inserted in the textarea

**Given** the Analysis stage is active in Focus Mode,
**When** the stage renders,
**Then** a contextual edge-case prompt appears below the main question: "Have you considered edge cases? What should this feature NOT do?"

**Given** required fields are defined in the schema,
**When** the user attempts to click "Mark stage complete" with required fields empty,
**Then** the system shows an inline validation message below the relevant field and prevents completion — it does not block navigation between stages

**Given** a user leaves mid-wizard and returns later,
**When** they navigate back to the feature,
**Then** the wizard reopens at the last edited stage with all previously entered content intact

**Given** stage tabs are rendered,
**When** the user clicks a stage tab directly,
**Then** the wizard navigates to that stage without losing any unsaved content

### Story 2.3: Fast Mode Wizard & Progressive Completion

As a developer or power user,
I want a Fast Mode canvas that shows all fields for a stage simultaneously with a progressive completion toggle,
So that I can work at speed across all fields without the step-by-step pacing.

**Acceptance Criteria:**

**Given** the wizard is in Focus Mode,
**When** the user clicks the ⚡ Fast toggle in the wizard shell,
**Then** the view switches to Fast Mode showing all fields for the current stage in organized groups, with no data loss

**Given** Fast Mode is active,
**When** a stage canvas renders on desktop (≥1024px),
**Then** field groups are displayed in a 2-column grid; required fields appear first at full opacity, standard fields below with muted labels, and extended fields are collapsed under a "Show extended fields ▾" toggle

**Given** Fast Mode is active on tablet/mobile (<1024px),
**When** the stage canvas renders,
**Then** the layout shifts to a single column with the same field ordering

**Given** the "Show extended fields ▾" toggle,
**When** clicked,
**Then** the extended/custom fields expand inline beneath the standard fields without a page reload

**Given** a user tabs between fields in Fast Mode,
**When** Tab is pressed,
**Then** focus moves to the next field in document order; Shift+Tab moves backwards

**Given** the mode preference,
**When** a user switches between Focus and Fast mode,
**Then** the preference is saved to localStorage and restored the next time the wizard opens

**Given** progressive completion levels (quick/standard/deep),
**When** a feature is created in "quick capture" mode,
**Then** only required fields are shown in the wizard; switching to "standard" adds standard fields; switching to "deep" reveals all including custom extensions

### Story 2.4: Decision Log Entries & Tags

As a developer or product manager,
I want to add timestamped decision log entries and tags to features while in the wizard,
So that the reasoning behind design choices is captured in context and features are discoverable by category.

**Acceptance Criteria:**

**Given** a user is on any lifecycle stage in the wizard,
**When** they click "Add Decision",
**Then** an inline form appears with fields for: what was decided, why, and alternatives considered — all within the current stage context

**Given** a decision entry is submitted,
**When** `features.addDecision` is called,
**Then** the decision is stored with a timestamp in the feature's `content` JSONB under the correct stage, a `STAGE_UPDATED` event is written to `feature_events`, and the entry renders inline as a `DecisionLogEntry` component with left accent border and author/timestamp metadata

**Given** multiple decisions exist on a stage,
**When** the stage is viewed,
**Then** all decision entries render in chronological order, each with its what/why/alternatives and a `<time>` element for the timestamp

**Given** the tag input on a feature,
**When** a user types a tag name and presses Enter or comma,
**Then** the tag is added to the feature's `content.tags` array, saved via `features.updateStage`, and renders as a badge on the `FeatureCard`

**Given** a tag is added,
**When** the user clicks the ✕ on the tag badge,
**Then** the tag is removed from the feature, the change is persisted, and a `STAGE_UPDATED` event is logged to `feature_events`

### Story 2.5: Feature List View & FeatureCard Component

As a user,
I want to see a list of all features with their status and lifecycle progress at a glance,
So that I can navigate to any feature and continue working on it.

**Acceptance Criteria:**

**Given** a user navigates to the features list page,
**When** the page loads,
**Then** all features are displayed as `FeatureCard` components sorted by `updated_at` descending, with data server-prefetched via RSC `trpc.features.listFeatures.fetch()`

**Given** a `FeatureCard` renders,
**When** a feature is displayed,
**Then** the card shows: feature key in monospace font, title, `FeatureStateBadge` (active/draft/frozen/flagged with icon + label), `StageCompletionIndicator` (5 pips representing lifecycle progress), and a metadata row with last-updated timestamp

**Given** `FeatureStateBadge` renders in compact context,
**When** space is constrained to icon-only,
**Then** the badge includes `aria-label="Feature status: [state]"` so screen readers convey the state

**Given** `StageCompletionIndicator` renders,
**When** 3 of 9 stages have content,
**Then** 5 pips display with the appropriate number filled in accent color, and carries `aria-label="3 of 9 lifecycle stages complete"`

**Given** the feature list is empty,
**When** the page renders with no features,
**Then** an empty state shows "Create your first feature" with a primary CTA button — not a void or error state

**Given** a `FeatureCard` is clicked,
**When** the user selects a feature,
**Then** they navigate to the wizard for that feature opened at the last edited stage

**Given** the feature list is fetching,
**When** data is loading,
**Then** 3 `FeatureCard` skeleton shimmer blocks render matching the card layout — no spinner

---

## Epic 3: Feature Discovery — Search, Tree & Provenance

Developers, support engineers, and new team members can find features via full-text search with filters, navigate the feature tree to understand relationships, and read the complete provenance chain — enabling the < 30-second "why" lookup.

### Story 3.1: Search tRPC Procedures

As a developer,
I want tRPC search procedures that perform full-text search across all feature content with filtering support,
So that the search UI has a fast, accurate backend capable of returning results with provenance context within 1 second.

**Acceptance Criteria:**

**Given** the `search.fullText` tRPC procedure,
**When** called with a query string,
**Then** it queries the tsvector GIN index across all JSONB text content in `features.content` and returns results within 1 second for datasets up to 1,000 features

**Given** a search query matches content in multiple lifecycle stages,
**When** results are returned,
**Then** each result includes: `id`, `feature_key`, title, `status`, `frozen`, stage where match was found, and a 2-sentence text snippet with the matching term highlighted

**Given** the `search.fullText` procedure accepts filter parameters,
**When** called with `{ stage, tags, status, completionLevel }` filters,
**Then** results are narrowed to features matching all supplied filter values, and unmatched features are excluded

**Given** a query matches a `feature_key` exactly (e.g. `feat-2025-087`),
**When** results are returned,
**Then** the exact ID match appears first, followed by title matches, then content matches — in that priority order

**Given** the pg_trgm index,
**When** a partial term is searched (e.g. "filter" matching "filtering"),
**Then** the trgm index supports the partial match and results are returned correctly

### Story 3.2: Global Search UI & URL-Synced Filters

As a developer or support engineer,
I want a Cmd+K global search overlay with filter pills and shareable URL state,
So that I can find any feature by concept, stage, or tag in seconds and share search results with teammates.

**Acceptance Criteria:**

**Given** the app is loaded,
**When** Cmd+K (or Ctrl+K) is pressed from anywhere,
**Then** the global search overlay opens, focus moves to the search input, and recent features are shown before any keystroke

**Given** the search overlay is open,
**When** a query is typed,
**Then** `search.fullText` is called and `SearchResult` cards render showing feature key (monospace), title, `FeatureStateBadge`, stage badge, and a 2-line highlighted snippet — all within 1 second

**Given** search results are displayed,
**When** the user presses ↑ or ↓,
**Then** keyboard focus moves between result cards; pressing Enter navigates to the selected feature; pressing Esc closes the overlay and returns focus to the trigger element

**Given** the search overlay closes,
**When** focus returns,
**Then** it lands on the element that triggered the overlay

**Given** stage filter pills are shown below the search bar on the search results page,
**When** a pill is clicked,
**Then** results filter to that stage; multiple pills can be active simultaneously; active pills render with `bg-accent-subtle border-accent`; an "All" chip deselects others

**Given** active filters are applied,
**When** the URL is copied and visited in a new tab,
**Then** the same filters and sort order are restored from URL query params (e.g. `?q=menu+filter&stage=implementation&sort=updated`)

**Given** the sort dropdown,
**When** a sort option is selected (Last updated / Created / Stage / ID),
**Then** results reorder immediately and the sort preference persists to localStorage

**Given** a search returns no results,
**When** the empty state renders,
**Then** the message reads "No features match `[query]`" with a "Clear filters" link and a suggestion to try broader terms

### Story 3.3: Feature Tree View

As a new team member or developer,
I want to navigate all features as an interactive tree showing parent-child relationships,
So that I can understand how features evolved over time and browse lineage without knowing specific feature IDs.

**Acceptance Criteria:**

**Given** the Feature Tree page,
**When** it loads,
**Then** react-arborist renders all features as a tree with root features at top level and child features indented beneath their parents, server-prefetched via RSC

**Given** a `TreeNode` renders in collapsed state,
**When** displayed,
**Then** it shows: expand toggle (►), feature key (monospace), title, `FeatureStateBadge`, and `StageCompletionIndicator` pips on a single row

**Given** a `TreeNode` is expanded,
**When** the user clicks the expand toggle or presses Enter/Space,
**Then** the node expands to show: problem statement summary (first 100 chars), stage count, child feature count, and a "View full feature →" CTA link

**Given** parent features have children,
**When** the tree renders,
**Then** child nodes are indented with a left-border connector line visually linking them to their parent

**Given** the keyboard navigation requirement,
**When** focus is on the tree,
**Then** ↑↓ navigates between nodes, → expands a collapsed node, ← collapses an expanded node, and Enter opens the feature detail — using react-arborist's built-in keyboard handling

**Given** the tree on mobile (<768px),
**When** the user taps the "Browse features" persistent button,
**Then** the tree opens as a full-screen overlay with indent depth capped and deep chains showing "…N more levels" truncation

**Given** a search/filter input above the tree,
**When** the user types a query,
**Then** non-matching nodes are hidden; parent nodes with matching children remain visible but dimmed; a clear button appears when filter is active

**Given** the tree renders up to 500 nodes,
**When** it displays,
**Then** it is interactive within 1 second using react-arborist's built-in virtualization

### Story 3.4: Feature Detail View & Provenance Chain

As a developer or support engineer,
I want to view the full provenance chain of any feature as a readable timeline,
So that I can understand why a feature was built, what decisions shaped it, and what each lifecycle stage contains — without needing to ask the original author.

**Acceptance Criteria:**

**Given** a user navigates to a feature detail page,
**When** it loads,
**Then** the feature key (monospace), title (large), `FeatureStateBadge`, and `StageCompletionIndicator` are displayed prominently in the header above the provenance chain

**Given** the `ProvenanceChain` component,
**When** it renders,
**Then** all 9 lifecycle stages appear as a vertical timeline: each stage has a dot (filled = has content, empty = not started), stage name, and content area; stages with content are expanded by default

**Given** a lifecycle stage has content,
**When** displayed in the provenance chain,
**Then** the full stage content is visible including any `DecisionLogEntry` items with left accent border and `<time>` timestamps

**Given** a lifecycle stage has no content,
**When** displayed,
**Then** the stage shows "Not yet documented" in `text-text-muted` — not hidden or errored

**Given** the drill-into-stage requirement,
**When** a user clicks a stage in the provenance chain,
**Then** the stage expands to show its complete detail inline with a "Collapse" toggle available

**Given** the feature detail tabs,
**When** the page renders,
**Then** tabs for Overview / Decisions / Annotations / History are visible; Overview shows the provenance chain; Decisions shows all decision log entries across all stages; Annotations and History tabs render as "Coming soon" placeholders

**Given** the tabs are URL-hash synced,
**When** the user navigates to `feat-2025-087#decisions`,
**Then** the Decisions tab is active on load; ←→ arrow keys switch tabs when the tab strip is focused

**Given** the breadcrumb navigation,
**When** a feature with a parent is viewed,
**Then** the breadcrumb shows `[Project] › [Parent Feature Key] › feat-YYYY-NNN` with each ID as a clickable link

### Story 3.5: Home / Overview Screen

As a user,
I want a home screen that shows recent activity and provides clear entry points to core workflows,
So that I can orient myself quickly and reach the right area of the app from a single landing page.

**Acceptance Criteria:**

**Given** a user navigates to `/`,
**When** the home page loads,
**Then** it displays three clear entry point sections: "Browse Feature Tree", "Search Features", and "Recent Activity"

**Given** the "Recent Activity" section,
**When** features exist,
**Then** the 5 most recently updated features are shown as compact `FeatureCard` components with last-updated timestamps, server-prefetched via RSC

**Given** the "Browse Feature Tree" entry point,
**When** clicked,
**Then** the user navigates to the Feature Tree page

**Given** the "Search Features" entry point,
**When** clicked or when Cmd+K is pressed,
**Then** the global search overlay opens with focus on the search input

**Given** no features exist yet,
**When** the home page loads,
**Then** the Recent Activity section shows: "No features yet — create your first one" with a primary CTA

**Given** the home page renders on mobile (<768px),
**When** viewed,
**Then** the three entry point sections stack vertically and the layout is fully readable without horizontal scrolling

---

## Epic 4: Feature Immutability & Lineage

Teams can freeze completed features (permanent, immutable records) and spawn child features to evolve functionality without destroying history — implementing the core immutability model that makes provenance trustworthy.

### Story 4.1: Freeze Feature tRPC Procedure

As a developer,
I want a tRPC procedure that freezes a feature with defense-in-depth enforcement at both the API and database layers,
So that frozen features are permanently immutable through every interface and no code path can bypass this guarantee.

**Acceptance Criteria:**

**Given** the `features.freeze` tRPC procedure,
**When** called with a valid feature `id`,
**Then** the feature's `frozen` field is set to `true`, `status` is set to `'frozen'`, and a `FEATURE_FROZEN` event is written to `feature_events` in the same Drizzle transaction

**Given** a feature is already frozen,
**When** `features.freeze` is called on it again,
**Then** a `BAD_REQUEST` tRPC error is returned with message "Feature is already frozen"

**Given** the API-level immutability check,
**When** any mutation procedure (`updateStage`, `addDecision`, `addAnnotation`) is called on a frozen feature,
**Then** the procedure returns a `FORBIDDEN` tRPC error before touching the database — providing clean typed error feedback to the client

**Given** the DB-level immutability trigger (established in Story 1.2),
**When** a direct SQL UPDATE is attempted on a frozen feature row,
**Then** the PostgreSQL trigger raises an exception blocking the write — verifiable via Vitest integration test

**Given** both immutability layers,
**When** the API check is bypassed and a write reaches the DB,
**Then** the DB trigger acts as the hard stop — confirmed via a test that bypasses the API layer directly

### Story 4.2: Spawn Child Feature tRPC Procedure

As a developer,
I want a tRPC procedure that spawns a child feature from any existing feature with explicit lineage tracking,
So that feature evolution is always linked back to its origin and the provenance chain is never broken.

**Acceptance Criteria:**

**Given** the `features.spawn` tRPC procedure,
**When** called with `{ parentId, spawnReason }`,
**Then** a new `features` row is created with `parent_id` set to the parent's `id`, `status: 'draft'`, `frozen: false`, a new generated `feature_key`, and the `spawnReason` stored in the child's `content`

**Given** a spawn operation completes,
**When** the transaction commits,
**Then** a `FEATURE_SPAWNED` event is written to `feature_events` for both the parent and the child in the same Drizzle transaction

**Given** `features.spawn` is called on any feature regardless of frozen state,
**When** it executes,
**Then** spawning is allowed from both frozen and active features — frozen features can always be evolved via spawn

**Given** `features.getLineage` is called with a feature `id`,
**When** it executes,
**Then** it returns the feature's direct parent, all siblings (features sharing the same `parent_id`), and all direct children — resolved in a single query

**Given** `features.spawn` is called with a missing or empty `spawnReason`,
**When** Zod validation runs,
**Then** a `BAD_REQUEST` error is returned — spawn reason is required

### Story 4.3: Freeze & Spawn UI

As a developer or product manager,
I want clear UI affordances to freeze features and spawn children — including an intercept when I accidentally try to edit a frozen feature,
So that the immutability model is intuitive and I'm guided toward the correct workflow rather than blocked with a confusing error.

**Acceptance Criteria:**

**Given** an active (non-frozen) feature detail page,
**When** the user views it,
**Then** a "Freeze this feature" Secondary button is visible in the header area

**Given** the user clicks "Freeze this feature",
**When** the 2-step confirmation renders,
**Then** a confirmation popover appears with the text "This feature will become a permanent, read-only record. You can always evolve it by spawning a child." and a "Yes, freeze it" confirm button — no browser `confirm()`

**Given** a feature is frozen,
**When** the feature detail page renders,
**Then** the `FeatureStateBadge` shows `frozen` (purple ✦ Frozen), all edit controls are hidden, and an "Evolve this feature" CTA button is shown in their place

**Given** a user attempts to edit a frozen feature,
**When** the edit attempt is intercepted,
**Then** the `SpawnDialog` opens immediately — the field never becomes editable — with the copy: "This feature is frozen — its record is permanent. Want to evolve it? Spawn a child feature that links back to this one."

**Given** the `SpawnDialog` is open,
**When** it renders,
**Then** the parent feature context is shown read-only at the top, a required "Spawn reason" textarea is focused, and the proposed child `feature_key` is displayed

**Given** the user completes the spawn reason and clicks "Spawn Child Feature",
**When** `features.spawn` succeeds,
**Then** the dialog closes, a success toast fires ("Spawned feat-YYYY-NNN"), and the user lands in the wizard for the new child feature with the parent context visible

**Given** the user cancels the `SpawnDialog`,
**When** "Cancel" is clicked or Esc is pressed,
**Then** the dialog closes, focus returns to the "Evolve this feature" button, and the frozen feature detail is shown unchanged

### Story 4.4: Feature Lineage View

As a developer or new team member,
I want to see the full lineage of any feature — its parent, siblings, and children — in context,
So that I can trace how a feature evolved and navigate the complete family tree from a single feature.

**Acceptance Criteria:**

**Given** a feature detail page for a feature with a parent,
**When** the Overview tab renders,
**Then** a "Lineage" section shows the direct parent feature as a compact `FeatureCard` link above the current feature

**Given** the lineage section,
**When** sibling features exist (other children of the same parent),
**Then** siblings are listed as compact `FeatureCard` links with their status badges

**Given** the lineage section,
**When** child features exist (features spawned from this one),
**Then** children are listed as compact `FeatureCard` links with spawn reason shown beneath each

**Given** a lineage link is clicked,
**When** the user navigates to a parent, sibling, or child,
**Then** they land on that feature's detail page with its own lineage section correctly populated

**Given** a root feature (no parent),
**When** the lineage section renders,
**Then** the parent section is absent and only children (if any) are shown

**Given** the Feature Tree page,
**When** the current feature is highlighted,
**Then** its position in the tree correctly reflects the parent-child relationships established via spawn

---

## Epic 5: Raw JSON Access & Dual-Mode Editing

Developers can view, edit, and export the raw JSON of any feature, switch between wizard and JSON modes, and receive live schema validation feedback — delivering the speed and precision developers need.

### Story 5.1: JSON Read & Write tRPC Procedures

As a developer,
I want tRPC procedures to fetch and update the raw JSON of a feature with schema validation on every write,
So that JSON edits are validated before hitting the database and no malformed data can enter the system through the raw edit path.

**Acceptance Criteria:**

**Given** `features.getFeatureJson` is called with a valid feature `id`,
**When** it executes,
**Then** the complete `content` JSONB of the feature is returned as a typed object serialized to a formatted JSON string suitable for display in an editor

**Given** `features.updateFeatureJson` is called with a raw JSON string,
**When** the input is received,
**Then** it is first parsed and validated against the active Zod schema from `packages/validators` before any DB write; if validation fails, a `BAD_REQUEST` tRPC error is returned with field-level error details

**Given** `features.updateFeatureJson` is called on a frozen feature,
**When** the API-level immutability check runs,
**Then** a `FORBIDDEN` tRPC error is returned before any DB write

**Given** a valid JSON update passes Zod validation,
**When** `features.updateFeatureJson` writes to the DB,
**Then** the `features.content` JSONB is updated and a `FEATURE_UPDATED` event with `changedFields` delta is written to `feature_events` in the same Drizzle transaction

**Given** JSON save operations,
**When** a write completes,
**Then** it does so within 500ms

### Story 5.2: JSON Editor UI with Live Validation

As a developer,
I want a CodeMirror 6 JSON editor with live schema validation feedback and format-on-save,
So that I can edit feature JSON at speed with immediate visibility into any schema violations.

**Acceptance Criteria:**

**Given** a user navigates to the JSON view of a feature,
**When** the page loads,
**Then** the `JsonEditor` component renders with the feature's full JSON in a CodeMirror 6 editor with syntax highlighting — loaded via `dynamic import` with `ssr: false`

**Given** the editor renders,
**When** JSON content is schema-valid,
**Then** a validation status bar below the editor shows "✓ Valid" in green

**Given** the user makes an edit introducing a schema violation,
**When** validation runs (debounced on keystroke),
**Then** the status bar updates to "✗ N errors" in red, error markers appear in the gutter at the relevant lines, and field-level errors are listed below the status bar

**Given** the user saves (Cmd+S or auto-save interval),
**When** `features.updateFeatureJson` is called,
**Then** the JSON is formatted (pretty-printed, 2-space indent) before saving and the `SaveIndicator` transitions through `saving → saved`

**Given** the save results in a schema error from the API,
**When** the error response arrives,
**Then** the `SaveIndicator` shows `error` state ("Save failed — retry?"), error details appear in the validation status bar, and the editor content is not reset

**Given** the editor status bar,
**When** it updates,
**Then** it carries `role="status"` so screen readers announce validation state changes

**Given** a frozen feature is viewed in the JSON editor,
**When** the editor renders,
**Then** the editor is in read-only mode with a "Frozen — read only" label shown, and the `SpawnDialog` intercept fires if the user attempts to click into the editor

### Story 5.3: Wizard ↔ JSON Mode Switching & Individual Export

As a developer,
I want to switch between wizard mode and raw JSON mode for any feature and export individual feature JSON,
So that I can move between guided editing and direct JSON manipulation without friction, and share or archive individual features.

**Acceptance Criteria:**

**Given** a user is in the wizard for any feature,
**When** they click "View JSON" in the wizard header,
**Then** they navigate to the JSON editor view for the same feature showing the current saved state — no unsaved wizard content is lost

**Given** a user is in the JSON editor,
**When** they click "Open in Wizard",
**Then** they navigate to the wizard for the same feature opened at the last edited stage with current JSON content reflected in the fields

**Given** a user switches from JSON editor back to wizard after making JSON edits,
**When** the wizard loads,
**Then** all field values reflect the latest saved JSON state — wizard and JSON views are always in sync with the persisted DB state

**Given** the "Copy JSON" action on a feature,
**When** the user clicks it,
**Then** the complete feature JSON is copied to the clipboard and a success toast fires: "JSON copied to clipboard"

**Given** the "Export JSON" action on a feature,
**When** the user clicks it,
**Then** a `.json` file is downloaded named `feat-YYYY-NNN.json` containing the complete feature content JSONB

**Given** the exported file,
**When** opened,
**Then** it is valid JSON containing all lifecycle stage content, decision log entries, tags, and metadata — a complete, self-contained feature artifact

---

## Epic 6: Admin — Schema Configuration & Templates

Admins can configure the three-layer schema (required/standard/custom fields), create feature templates, and manage how schema changes propagate to existing features — enabling team-wide consistency and customization.

### Story 6.1: Schema Configuration tRPC Procedures

As a developer,
I want tRPC procedures to read and write the three-layer schema configuration stored in `schema_configs`,
So that all write paths validate feature data against the active schema and admins can evolve the schema over time.

**Acceptance Criteria:**

**Given** the `features.admin.getActiveSchema` tRPC procedure,
**When** called,
**Then** it returns the current active `schema_configs` row for the default `org_id` including all three layers: required fields, standard fields, and custom extension fields

**Given** no schema config exists for the org,
**When** `features.admin.getActiveSchema` is called,
**Then** a sensible default schema is returned with the baseline required fields (problem statement, acceptance criteria, implementation refs) pre-populated

**Given** `features.admin.updateSchema` is called with a new schema config,
**When** it executes,
**Then** the `schema_configs` row is updated, a `SCHEMA_UPDATED` event is written to `feature_events` with `actor: "admin"`, and the new schema takes effect immediately for all subsequent write operations

**Given** the Zod validation in `packages/validators` is schema-driven,
**When** any feature mutation procedure runs after a schema update,
**Then** the updated schema is used to validate the incoming data — the active schema is always the source of truth for validation

**Given** `features.admin.updateSchema` is called with an invalid schema structure,
**When** Zod validates the schema config input,
**Then** a `BAD_REQUEST` error is returned with details — invalid schemas are never persisted

### Story 6.2: Schema Editor UI

As an admin,
I want a visual three-layer schema editor to configure required, standard, and custom fields,
So that I can define what information the team captures on every feature without writing code or JSON directly.

**Acceptance Criteria:**

**Given** an admin navigates to Admin → Schema Configuration,
**When** the page loads,
**Then** the `SchemaEditor` renders three labeled sections: "Required Fields", "Standard Fields", and "Custom Extension Fields" — each showing the currently configured fields for that layer

**Given** the Required Fields section,
**When** displayed,
**Then** each required field shows its name, field type (text/textarea/tags/decision-log), and an enable/disable toggle — required fields cannot be deleted, only disabled

**Given** the Standard Fields section,
**When** displayed,
**Then** each standard field shows name, type, and an enable/disable toggle; new standard fields can be added via an "Add field" button with name and type inputs

**Given** the Custom Extension Fields section,
**When** displayed,
**Then** custom fields can be freely added, renamed, reordered, and deleted; each has name, type, and an optional description for wizard hint text

**Given** any schema change is made in the editor,
**When** the admin clicks "Save Schema",
**Then** `features.admin.updateSchema` is called, a success toast fires ("Schema updated"), and the updated field list is reflected immediately

**Given** a field is marked as Required,
**When** the schema is saved,
**Then** the wizard enforces that field across all 9 lifecycle stages for all future feature creates and updates

### Story 6.3: Schema Change Propagation & Feature Flagging

As an admin,
I want the system to flag existing features when I add a new required field to the schema,
So that the team knows which features need updating and non-required changes never break existing features.

**Acceptance Criteria:**

**Given** an admin adds a new required field to the schema and saves,
**When** `features.admin.updateSchema` completes,
**Then** a scan runs across all existing features and flags any feature missing the new required field — setting `status: 'flagged'` on each affected feature and writing an `ANNOTATION_ADDED` event with message "New required field added: [fieldName]"

**Given** features are flagged after a schema change,
**When** a user views the feature list or tree,
**Then** flagged features display the `FeatureStateBadge` in amber ⚑ "Needs attention" state

**Given** a user opens a flagged feature in the wizard,
**When** it loads,
**Then** the new required field is highlighted with an amber border and an inline note: "This field was added to the schema after this feature was created — please complete it"

**Given** the flagged feature's new required field is filled and the stage marked complete,
**When** the save succeeds,
**Then** the feature's `status` reverts from `'flagged'` to `'active'` and the amber badge is cleared

**Given** a non-required field change (standard or custom) is made to the schema,
**When** the schema is saved,
**Then** no existing features are flagged or altered — they remain valid and unaffected

**Given** a required field is disabled in the schema,
**When** the schema is saved,
**Then** no existing features are flagged — existing data for that field is preserved in JSONB and the field simply stops being enforced

### Story 6.4: Feature Templates

As an admin,
I want to create and manage feature templates with pre-populated field structures,
So that the team can start new features from a consistent baseline rather than from an empty form every time.

**Acceptance Criteria:**

**Given** an admin navigates to Admin → Templates,
**When** the page loads,
**Then** the `TemplateManager` renders a list of all templates showing name, description, field count, and last-modified date

**Given** an admin clicks "Create new template",
**When** the template editor opens,
**Then** it presents the same field structure as the wizard (all 9 stages, all field layers) with editable default values for each field

**Given** a template is saved,
**When** the admin confirms,
**Then** the template is persisted and appears in the list with a success toast

**Given** an existing template,
**When** an admin clicks "Clone",
**Then** a copy is created with the name "Copy of [original name]" and opens in the template editor for modification

**Given** an admin clicks "Delete" on a template,
**When** the 2-step confirmation is confirmed,
**Then** the template is removed; the feature content of any features created from that template is not affected

**Given** a user creates a new feature,
**When** the "New Feature" wizard flow starts and templates exist,
**Then** a template picker step is shown first allowing the user to start from a template or blank; selecting a template pre-populates all wizard fields with the template's default values

---

## Epic 7: Annotations, Audit Trail & Export

Team members can annotate and flag features for attention, view the complete change history of any feature, and export the full project as a JSON bundle — completing the collaborative and operational layer of life-as-code.

### Story 7.1: Annotations tRPC Procedures

As a developer,
I want tRPC procedures to add, list, and flag annotations on features,
So that team members can leave contextual notes and surface attention items with a persistent, audited record.

**Acceptance Criteria:**

**Given** `features.addAnnotation` is called with `{ featureId, text }`,
**When** it executes,
**Then** the annotation is stored in the feature's `content.annotations` array with a generated id, timestamp, and `actor` from context, and an `ANNOTATION_ADDED` event is written to `feature_events` in the same Drizzle transaction

**Given** `features.addAnnotation` is called on a frozen feature,
**When** the API-level immutability check runs,
**Then** annotations are permitted on frozen features — annotations are observational, not mutations to lifecycle stage content

**Given** `features.listAnnotations` is called with a feature `id`,
**When** it executes,
**Then** all annotations for that feature are returned in chronological order with id, text, actor, timestamp, and `flagged` boolean

**Given** `features.flagAnnotation` is called with `{ annotationId, flagged: true }`,
**When** it executes,
**Then** the annotation's `flagged` field is toggled, the feature's `status` is set to `'flagged'` if any annotation is flagged, and a `FEATURE_UPDATED` event is written to `feature_events`

**Given** `features.flagAnnotation` is called with `{ flagged: false }` on the last flagged annotation,
**When** it executes,
**Then** the feature's `status` reverts from `'flagged'` to its previous state (`'active'` or `'frozen'`)

### Story 7.2: Annotations UI

As a support engineer or developer,
I want to read, add, and flag annotations on any feature from the feature detail page,
So that I can leave contextual notes for teammates and surface issues that need attention without creating a separate ticket.

**Acceptance Criteria:**

**Given** a user views the Annotations tab on a feature detail page,
**When** the tab is selected,
**Then** all annotations render as `AnnotationItem` components in chronological order, each showing: author initial avatar, author name, timestamp in a `<time>` element, annotation text, and a flag toggle button

**Given** the Annotations tab has no annotations,
**When** it renders,
**Then** an empty state shows "No annotations yet — be the first to add one" with a clear "Add annotation" CTA

**Given** the user clicks "Add annotation",
**When** the inline form appears,
**Then** a textarea is focused; pressing Cmd+Enter or clicking "Post" submits it

**Given** an annotation is submitted,
**When** `features.addAnnotation` succeeds,
**Then** the new `AnnotationItem` appears at the bottom of the list without a page reload and a success toast fires

**Given** an `AnnotationItem`'s flag toggle is clicked to flag,
**When** it activates,
**Then** the annotation renders with an amber accent, the `FeatureStateBadge` on the feature updates to amber ⚑ "Needs attention", and the toggle has `aria-pressed="true"` and `aria-label="Unflag this annotation"`

**Given** all annotations on a feature are unflagged,
**When** the last flag is removed,
**Then** the feature's `FeatureStateBadge` reverts to its pre-flagged state (`active` or `frozen`)

### Story 7.3: Audit Trail — Change History UI

As a developer or product manager,
I want to view the complete change history of any feature as a chronological timeline,
So that I can understand exactly what changed, when, and trace the evolution of the feature record over time.

**Acceptance Criteria:**

**Given** `events.listFeatureEvents` is called with a feature `id`,
**When** it executes,
**Then** all `feature_events` rows for that feature are returned in reverse-chronological order with: `event_type`, `changed_fields` delta, `actor`, and `created_at`

**Given** a user views the History tab on a feature detail page,
**When** the tab is selected,
**Then** all events render as a timeline with event type label, human-readable description of what changed, actor name, and a relative timestamp ("2 hours ago") with absolute timestamp on hover via `<time>` element

**Given** different event types,
**When** displayed in the history timeline,
**Then** each has a distinct readable label: "Feature created", "Stage updated: Analysis", "Feature frozen", "Child feature spawned", "Annotation added", "Schema updated"

**Given** a `FEATURE_UPDATED` event with a `changed_fields` delta,
**When** displayed,
**Then** the specific fields that changed are listed (e.g. "Updated: problem statement, acceptance criteria") — not just "Feature updated"

**Given** the history timeline,
**When** it renders,
**Then** it uses `role="list"` with each event as `role="listitem"` for screen reader navigation

**Given** a feature with more than 50 events,
**When** the History tab loads,
**Then** the 20 most recent events are shown with a "Load more" button to paginate

### Story 7.4: Full Project JSON Export

As an admin,
I want to export the entire project's feature data as a single JSON bundle,
So that I have a complete, re-importable backup of all feature artifacts and can archive the project state at any point in time.

**Acceptance Criteria:**

**Given** `features.admin.exportAll` tRPC procedure,
**When** called,
**Then** it returns a JSON object containing all features for the org with their complete `content` JSONB, `feature_key`, `status`, `frozen`, `parent_id`, `created_at`, `updated_at`, and all `feature_events` for each feature

**Given** the admin navigates to Admin → Export,
**When** the `ExportPanel` renders,
**Then** it shows: a description of what will be exported, optional filters (status, stage, tags), an estimated feature count, and an "Export all features" primary button

**Given** the user clicks "Export all features",
**When** `features.admin.exportAll` completes,
**Then** a `.json` file is downloaded named `life-as-code-export-YYYY-MM-DD.json` containing the full feature bundle

**Given** the export file,
**When** opened,
**Then** it is valid JSON with structure `{ exportedAt, featureCount, features: [...] }` — each feature containing all fields needed for a complete re-import

**Given** optional filters are applied before export,
**When** the user selects a status filter and clicks export,
**Then** only features matching the filter criteria are included and the filename reflects the filter (e.g. `life-as-code-export-frozen-2026-03-14.json`)

**Given** the export is in progress,
**When** the button is clicked,
**Then** a loading spinner renders inline within the button and the button is disabled until the download begins — preventing double-clicks
