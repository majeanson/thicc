---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: "complete"
completedAt: "2026-03-14"
inputDocuments:
  [
    "_bmad-output/planning-artifacts/product-brief-bmad-2026-03-13.md",
    "_bmad-output/planning-artifacts/prd.md",
  ]
workflowType: "architecture"
project_name: "life-as-code"
user_name: "Marc_"
date: "2026-03-14"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — Next.js App Router (React Server Components) frontend with tRPC API layer, PostgreSQL + JSONB data store, deployed as a unified Vercel deployment with logical FE/BE separation via Turborepo monorepo.

### Starter Options Considered

| Option            | tRPC v11  | Bun             | Drizzle | RSC     | Status            |
| ----------------- | --------- | --------------- | ------- | ------- | ----------------- |
| Create-Yuki-Stack | ✅        | ✅ native       | ✅      | ✅      | Active (Jan 2026) |
| NERD Stack        | ❌ Elysia | ✅              | ✅      | ✅      | Small community   |
| Create-T3-Turbo   | ✅        | ⚠️ experimental | ✅      | ✅ best | Active (Mar 2026) |

NERD Stack eliminated: Elysia's tRPC plugin was archived August 2025 — not compatible with the tRPC requirement. Create-T3-Turbo eliminated: Bun support is a pending draft PR as of March 2026, not production-ready.

### Selected Starter: Create-Yuki-Stack

**Rationale for Selection:**
Only option that delivers all three non-negotiables simultaneously — tRPC v11, Bun-native, Drizzle ORM — with an active maintenance record and Turborepo monorepo structure matching the logical FE/BE separation requirement.

**Monorepo Tooling: Turborepo (over Nx)**
Turborepo was chosen over Nx for this project. Both are valid — Nx is more powerful for large teams and complex dependency graphs, but adds significant configuration overhead. For a solo developer on a greenfield project, Turborepo's simpler mental model, lighter config, and native support in Yuki-Stack is the right tradeoff. Learning Turborepo builds applicable skills without Nx's complexity tax.

**Initialization Command:**

```bash
bun create yuki-stack
```

Select during CLI prompts:

- Framework: Next.js
- API layer: tRPC
- ORM: Drizzle
- Database: PostgreSQL

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**

- TypeScript throughout — strict mode
- Bun as runtime and package manager

**Monorepo Structure (Turborepo):**

- `apps/web` — Next.js 15 App Router (React Server Components)
- `packages/api` — tRPC v11 router (logical backend separation)
- `packages/db` — Drizzle ORM schema + migrations
- `packages/ui` — Shared component library (shadcn/ui + Tailwind CSS v4)
- `packages/validators` — Zod schemas shared between FE and BE

**API Layer:**

- tRPC v11 served via Next.js API route (`/api/trpc/[trpc]`)
- RSC integration: server-side prefetch via `trpc.procedure.fetch()`, client hydration via `HydrateClient` + `useQuery(trpc.procedure.queryOptions())`
- Type safety flows end-to-end: DB schema → Drizzle types → tRPC → React

**Styling Solution:**

- Tailwind CSS v4
- shadcn/ui component library

**Build Tooling:**

- Turborepo for monorepo task orchestration
- Next.js build for web app
- TypeScript project references

**Development Experience:**

- Hot reloading via Next.js dev server
- Turborepo caching for fast rebuilds
- Zod for runtime validation (shared validators package)
- GitHub Actions CI/CD included

**Deployment Architecture:**

- `apps/web` → Vercel (native Next.js deployment)
- `packages/api` tRPC handlers served via Next.js API routes — no separate server needed
- PostgreSQL → Neon, Supabase, or Railway (managed PostgreSQL with JSONB support)

**ORM Decision: Drizzle (over Prisma)**

- Pure TypeScript — no native binary, full Bun compatibility
- SQL-close mental model — good for learning, no magic
- No codegen step — schema changes are immediate
- Superior JSONB operator support with TypeScript types
- Migrations are plain SQL (readable, auditable)

**Note:** Project initialization using `bun create yuki-stack` should be the first implementation story.

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
42 FRs across 10 capability areas covering the full feature lifecycle — creation, immutability/lineage, tree navigation, wizard-guided entry, raw JSON editing, full-text search, schema configuration, audit trail, annotations, and export. The wizard and raw JSON mode are two surfaces for the same underlying data model, making the data schema the most critical architectural element.

**Non-Functional Requirements:**

- Performance: <500ms wizard/save interactions, <1s search (1K features), <1s tree render (500 nodes)
- Data Integrity: JSONB validated on every write, immutability enforced at DB level, atomic saves
- Code Quality: Clear separation of concerns (API / business logic / data / UI), automated tests on critical paths
- LLM Readability: Feature artifacts self-contained and directly parseable without RAG or transformation
- Scalability: org_id from day one, auth middleware slot in API routing, no horizontal scaling blockers

**Scale & Complexity:**

- Primary domain: Full-stack web app (JSONB data layer + API + rich frontend)
- Complexity level: Medium — greenfield, single developer, no real-time features or integrations in MVP
- Estimated major architectural components: 5–6 (DB schema, schema validation engine, API server, wizard UI, tree/search UI, auth middleware slot)

### Technical Constraints & Dependencies

- **Solo developer (Marc\_)** — lean architecture, minimal ops overhead; prefer managed services over self-hosted infra
- **PostgreSQL + JSONB** — implied by PRD language; enables full-text search, schema validation at DB level, and JSONB query operators
- **Modern stack** — no legacy constraints; greenfield choices
- **Marc\_ has direct input on all architecture decisions** — AI assists and proposes, does not dictate
- **MVP has no auth, no integrations, no multi-tenancy activation** — but all three must be structurally supported without future refactoring

### Cross-Cutting Concerns Identified

1. **JSONB Schema Validation** — single validation engine must serve wizard saves, raw JSON edits, and API writes consistently
2. **Immutability Enforcement** — frozen feature state must be enforced at the database layer (DB-level constraint or trigger), not just API or UI
3. **org_id Multi-Tenancy Readiness** — every data model table requires org_id from day one, unused in MVP
4. **Auth Middleware Slot** — API routing must accept pluggable auth middleware without structural change; empty slot in MVP
5. **Full-Text Search on JSONB** — PostgreSQL FTS index strategy must be decided at schema design time for performance targets
6. **Audit Trail / Mutation Logging** — all state changes must be recorded; log table or trigger strategy needed from the start
7. **LLM-Readability** — JSON schema field naming, nesting depth, and self-containment directly affect how AI agents consume feature artifacts

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- PostgreSQL + JSONB as data store with Drizzle ORM (from Step 3)
- tsvector GIN + pg_trgm for full-text search — must be in initial schema
- Immutability enforced at DB level via trigger + API-level tRPC check
- feature_events table for audit trail — all mutations write explicitly
- Zod as single JSONB validation engine across all write paths

**Important Decisions (Shape Architecture):**

- Neon as managed PostgreSQL provider (DB branching, native Vercel integration)
- react-arborist for feature tree visualization (virtualized, keyboard-navigable)
- CodeMirror 6 (@uiw/react-codemirror) for raw JSON editing surface
- Zustand for client-side UI state management
- Vitest (unit/integration) + Playwright (E2E) for testing

**Deferred Decisions (Post-MVP):**

- Authentication / RBAC — empty middleware slot in tRPC router, no implementation
- Monitoring / error tracking — Vercel logs sufficient for MVP internal tool
- Multi-tenant activation — org_id column present in schema, unused
- Server-side wizard draft persistence — Zustand persist (localStorage) sufficient for MVP

---

### Data Architecture

**Database:** PostgreSQL (Neon — managed, DB branching, native Vercel integration)
**Data format:** JSONB for feature lifecycle content; relational columns for metadata
(id, org_id, status, frozen, parent_id, created_at, updated_at)
**ORM:** Drizzle ORM + drizzle-kit for migrations (plain SQL, Bun-compatible)
**Validation engine:** Zod — single validation engine serving wizard saves, raw JSON
edits, and tRPC procedure inputs. One schema definition, enforced on every write path.

**Full-Text Search:**

- Primary: tsvector generated column with GIN index across all JSONB text content
- Secondary: pg_trgm index for partial/fuzzy match support
- Both are standard PostgreSQL — no extensions to manage
- Meets NFR2: <1s search for 1,000 features

**Immutability Enforcement (NFR7):**

- Layer 1 — DB trigger: PostgreSQL trigger blocks UPDATE/DELETE when frozen = true.
  Enforced at the database level; cannot be bypassed by any interface or future integration.
- Layer 2 — API check: tRPC mutation validates frozen state before write and returns
  a clean, typed tRPC error to the client.
- Defense in depth: API layer gives clear UX feedback; DB trigger is the hard stop.

**Audit Trail (FR36):**

- Dedicated feature_events table (append-only, never updated or deleted)
- Schema: id, feature_id, org_id, event_type, changed_fields (JSONB), actor, created_at
- tRPC mutations explicitly write to feature_events — no trigger magic
- Full control, easy to query, easy to test, transparent behavior

**Migration approach:** drizzle-kit generate + drizzle-kit migrate

- Migrations are plain SQL files — readable, auditable, version-controlled

---

### Authentication & Security

**MVP:** No authentication. Internal tool behind network-level access.
**Auth middleware slot:** Empty middleware function in tRPC router context —
pluggable without structural refactoring when auth is added post-MVP.
**API security:** Input validation via Zod on all tRPC procedures.
No public endpoints in MVP.

---

### API & Communication Patterns

**API layer:** tRPC v11 served via Next.js API route (/api/trpc/[trpc])
**Type safety:** End-to-end — Drizzle schema → Zod validators → tRPC → React
**Input validation:** Zod schemas in packages/validators — shared between
tRPC procedures and frontend form validation

**tRPC Procedure Tiers (RBAC-ready, MVP uses one tier):**
Define procedure tiers now so post-MVP RBAC is additive, not structural:

- publicProcedure — unauthenticated access (MVP: all procedures use this)
- protectedProcedure — requires authenticated user (post-MVP activation)
- adminProcedure — requires Admin role (post-MVP activation)
  MVP wires all routes through publicProcedure. Promoting a route to
  protectedProcedure or adminProcedure is a one-line change per procedure.

**tRPC Router Organization (maps to future RBAC boundaries):**

- features.\* — create, read, update, freeze, spawn (Developer + PM scope)
- features.admin.\* — schema config, template management (Admin scope)
- search.\* — full-text search, filtering (all roles)
- events.\* — audit trail reads (all roles), writes are internal only
  Router namespacing mirrors the post-MVP role matrix from the PRD:
  Admin | Developer | PM | Stakeholder — all view, restrictions on edit/admin.

**Context shape (auth-slot ready):**
tRPC context always carries a user field, even if null in MVP:
{ db: DrizzleClient, user: { id, role, orgId } | null }
Post-MVP: populate from session token. No procedure signature changes needed.

**Error handling:** tRPC TRPCError with typed error codes:

- NOT_FOUND — feature doesn't exist
- FORBIDDEN — immutability violation or (post-MVP) insufficient role
- BAD_REQUEST — Zod validation failure with field-level detail
- UNAUTHORIZED — (post-MVP) unauthenticated request to protectedProcedure

**RSC integration pattern:**

- Server: prefetch via trpc.procedure.fetch() in RSC
- Client: HydrateClient + useQuery(trpc.procedure.queryOptions()) for hydration

---

### Frontend Architecture

**Framework:** Next.js 15 App Router — RSC by default, opt-in to Client Components
**Component split strategy:**

- RSC: data fetching, feature detail views, search results, tree data loading
- Client Components: wizard form steps, JSON editor, tree interaction, Zustand consumers

**State management:**

- Server state: TanStack Query via tRPC (prefetch in RSC, hydrate in client)
- Client UI state: Zustand (pmndrs) — wizard step tracking, tree expand/collapse,
  editor dirty state, panel visibility
- Wizard persistence: Zustand persist middleware → localStorage (FR20 MVP solution)
- Zustand stores co-located with their feature (wizard store near wizard,
  tree store near tree) — not a single global store

**JSON editor:** CodeMirror 6 via @uiw/react-codemirror

- JSON syntax highlighting, error markers, format-on-save
- Requires "use client" + dynamic import with ssr: false in Next.js
- ~400kb — appropriate weight for a dev-facing feature

**Feature tree:** react-arborist

- Virtualized — handles 500+ nodes (meets NFR3)
- Keyboard navigation built in (meets NFR19)
- Purpose-built tree component, not a graph library

**Styling:** Tailwind CSS v4 + shadcn/ui component library
**Accessibility baseline:** WCAG 2.1 Level A — keyboard navigability via
react-arborist + shadcn/ui accessible primitives (meets NFR19, NFR20)

---

### Infrastructure & Deployment

**Frontend + API:** Vercel (native Next.js deployment, tRPC via API routes)
**Database:** Neon (managed PostgreSQL, DB branching for safe schema iteration)
**Environment config:** .env.local for development, Vercel environment variables
for preview + production. Neon provides separate connection strings per branch.
**CI/CD:** GitHub Actions (included in Yuki-Stack) — lint, typecheck, test on PR
**Testing:**

- Vitest: unit + integration tests for tRPC procedures, schema validation,
  immutability enforcement, search accuracy
- Playwright: E2E tests for wizard flow completion and feature tree navigation
  **Monitoring:** None for MVP. Vercel deployment logs for error visibility.
  Sentry to be added when moving beyond internal tool.

---

### Decision Impact Analysis

**Implementation Sequence (order matters):**

1. DB schema (features, feature_events, org_id column) + Drizzle setup
2. tsvector + pg_trgm indexes on initial schema
3. Immutability trigger (must exist before any write logic)
4. feature_events table + explicit write pattern in tRPC mutations
5. tRPC router with auth middleware slot + Zod validation + procedure tiers
6. Core tRPC procedures (CRUD, freeze, spawn, search)
7. RSC pages + HydrateClient pattern
8. Wizard (Client Components + Zustand step state + localStorage persist)
9. Feature tree (react-arborist + RSC data loading)
10. Raw JSON editor (CodeMirror 6 + schema validation feedback)

**Cross-Component Dependencies:**

- Zod validators (packages/validators) must be defined before tRPC procedures
  and frontend forms — both consume the same schemas
- feature_events write must be co-located with every tRPC mutation that modifies
  feature state — not an afterthought
- Immutability DB trigger must exist before any write tRPC procedures are built —
  test suite will verify it from day one
- Zustand stores should be co-located with the feature they serve — not a single global store
- tRPC procedure tiers (public/protected/admin) must be established in router setup
  before any procedures are written — promotes cleanly post-MVP

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

8 areas where AI agents could make different choices without explicit rules:
naming conventions, file organization, component boundary decisions,
tRPC procedure patterns, JSONB field naming, event_type naming,
error handling placement, and loading state management.

---

### Naming Patterns

**Database Naming (Drizzle + PostgreSQL):**

- Tables: plural snake_case — `features`, `feature_events`, `schema_configs`
- Columns: snake_case — `feature_id`, `org_id`, `created_at`, `parent_id`
- Foreign keys: `{table_singular}_id` — `feature_id`, `org_id`
- Indexes: `idx_{table}_{columns}` — `idx_features_org_id`, `idx_features_fts`
- Booleans: positive named — `frozen` not `is_not_editable`

✅ `features.org_id`, `feature_events.event_type`, `features.frozen`
❌ `Feature`, `featureId`, `features.isNotEditable`

**tRPC Procedure Naming:**

- camelCase verb-noun — `getFeature`, `listFeatures`, `createFeature`,
  `updateFeature`, `freezeFeature`, `spawnFeature`, `searchFeatures`
- Queries: `get*` (single), `list*` (collection)
- Mutations: action verb — `create*`, `update*`, `freeze*`, `spawn*`, `delete*`
- Router namespaces: camelCase — `features`, `search`, `events`, `admin`

✅ `features.getFeature`, `features.listFeatures`, `features.freezeFeature`
❌ `features.feature`, `features.fetchFeatures`, `features.doFreeze`

**TypeScript / Code Naming:**

- Variables & functions: camelCase — `featureId`, `getFeature`, `isFrozen`
- Types & interfaces: PascalCase — `Feature`, `FeatureEvent`, `LifecycleStage`
- Zod schemas: PascalCase + Schema suffix — `FeatureSchema`, `CreateFeatureSchema`
- Zustand stores: PascalCase + Store suffix — `WizardStore`, `TreeStore`
- Constants: SCREAMING_SNAKE_CASE — `MAX_TREE_DEPTH`, `LIFECYCLE_STAGES`
- React components: PascalCase — `FeatureTree`, `WizardStep`, `JsonEditor`

**File Naming:**

- React components: PascalCase matching the component — `FeatureDetail.tsx`, `WizardStep.tsx`, `JsonEditor.tsx`
- Hooks: camelCase — `useFeature.ts`, `useFreezeFeature.ts`, `useTreeNavigation.ts`
- Zustand stores: PascalCase — `WizardStore.ts`, `TreeStore.ts`
- Non-component files: kebab-case — `trpc.ts`, `utils.ts`, `event-types.ts`
- Next.js conventions unchanged — `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Test files: co-located, `.test.ts` / `.test.tsx` suffix — `FeatureDetail.test.tsx`

✅ `FeatureDetail.tsx`, `useFreezeFeature.ts`, `WizardStore.ts`
❌ `feature-detail.tsx`, `use-freeze-feature.ts`, `wizard-store.ts`

**JSONB Feature Content Field Naming:**

- camelCase throughout — `problemStatement`, `acceptanceCriteria`, `spawnReason`
- Consistent with TypeScript — no translation layer needed between DB and code
- Drizzle maps JSONB as-is; camelCase in JSON = camelCase in TypeScript types

✅ `{ problemStatement: "...", edgeCases: [...] }`
❌ `{ problem_statement: "...", edge_cases: [...] }`

**feature_events.event_type Values:**

- SCREAMING_SNAKE_CASE strings — treated as an enum
- `FEATURE_CREATED`, `FEATURE_UPDATED`, `FEATURE_FROZEN`, `FEATURE_SPAWNED`,
  `STAGE_UPDATED`, `ANNOTATION_ADDED`, `SCHEMA_UPDATED`
- Define as a TypeScript const enum in packages/validators — single source of truth

---

### Structure Patterns

**Monorepo Package Responsibilities (strict boundaries):**

- `packages/db` — Drizzle schema, migrations, DB client. No business logic.
- `packages/api` — tRPC router, procedures, context. Imports from db + validators only.
- `packages/validators` — Zod schemas, TypeScript types, event_type enum. No imports
  from other internal packages.
- `packages/ui` — shadcn/ui components, Tailwind config. No business logic.
- `apps/web` — Next.js pages, RSC, Client Components, Zustand stores. Imports from
  all packages but never imports across apps.

**Within apps/web — Feature-Based Organization:**

```
apps/web/
  app/
    (features)/
      features/          ← feature list, tree, search pages
      wizard/            ← wizard flow pages
      [feature-id]/      ← feature detail pages
  components/
    features/            ← FeatureCard, FeatureTree, FeatureDetail
    wizard/              ← WizardStep, WizardProgress, WizardNav
    json-editor/         ← JsonEditor (CodeMirror wrapper)
    ui/                  ← re-exports from packages/ui
  stores/
    WizardStore.ts
    TreeStore.ts
  lib/
    trpc.ts              ← tRPC client setup
    utils.ts             ← shared utilities
```

**Test Co-location Rule:**

- Tests live next to the file they test — `FeatureDetail.tsx` + `FeatureDetail.test.tsx`
- Integration tests for tRPC procedures: `packages/api/src/routers/features.test.ts`
- E2E tests: `apps/web/e2e/` directory (Playwright)
- No `__tests__` directories — co-location only

---

### Format Patterns

**tRPC Response Format:**

- Return types directly — no response wrapper
- tRPC handles success/error at the protocol level
- Procedures return typed Drizzle results or void

✅ `return await db.query.features.findFirst({ where: eq(features.id, id) })`
❌ `return { data: feature, success: true, error: null }`

**Date & Time:**

- All dates stored as PostgreSQL `timestamp with time zone`
- All dates serialized as ISO 8601 strings in JSON — `"2026-03-14T10:00:00.000Z"`
- No Unix timestamps in API responses or JSONB content
- Drizzle `timestamp()` maps to JavaScript `Date`; tRPC serializes to ISO string

**Error Format (tRPC TRPCError):**

```typescript
throw new TRPCError({
  code: "FORBIDDEN",
  message: "Feature is frozen and cannot be modified",
});
```

- `NOT_FOUND` — resource doesn't exist
- `FORBIDDEN` — immutability violation or (post-MVP) insufficient role
- `BAD_REQUEST` — Zod validation failure (message contains field-level detail)
- `UNAUTHORIZED` — post-MVP only

---

### Communication Patterns

**RSC vs Client Component Decision Rule:**

- Default to RSC. Add `"use client"` only when the component needs:
  - Browser APIs (window, localStorage, document)
  - React hooks with client state (useState, useEffect, useReducer)
  - Zustand store access
  - Event handlers (onClick, onChange, onSubmit)
  - CodeMirror / react-arborist (they require browser APIs)
- Data fetching always happens in RSC — pass data down as props to Client Components

✅ Feature detail page = RSC fetching data, passing to `<FeatureDetail>` client component
❌ Client component fetching its own data via useEffect

**Zustand Store Pattern:**

- One store per domain — `WizardStore.ts`, `TreeStore.ts`
- Stores export: `useWizardStore` hook + `WizardState` type
- Use `subscribeWithSelector` middleware for performance
- Use `devtools` middleware in development
- Use `persist` middleware only where FR explicitly requires save/resume (wizard)
- No store-to-store imports — if two stores need shared state, lift to tRPC/RSC layer

**feature_events Write Pattern (every mutation):**

```typescript
// In every tRPC mutation that modifies feature state:
await db.insert(featureEvents).values({
  featureId: input.id,
  orgId: ctx.orgId,
  eventType: EventType.FEATURE_UPDATED,
  changedFields: { stage: input.stage },
  actor: ctx.user?.id ?? "system",
  createdAt: new Date(),
});
```

- Always written in the same transaction as the feature mutation
- Never omitted — if you modify a feature, you log the event

---

### Process Patterns

**Loading States:**

- Use TanStack Query's built-in state — `isPending`, `isLoading`, `isFetching`
- No custom loading state in Zustand for server data
- Use Next.js `loading.tsx` for RSC page-level loading
- Use shadcn/ui `Skeleton` for component-level loading UI
- Never block the entire page for a single component load

**Error Boundaries:**

- One `error.tsx` per route segment in Next.js App Router
- Client component errors: React Error Boundary wrapping interactive feature areas
  (wizard, json editor, tree)
- tRPC errors surfaced via TanStack Query's `error` state — display inline, not in boundary

**Validation Timing:**

- Zod validation runs: on tRPC input (server), on form submit (client), on JSON save (client)
- Never validate on every keystroke — only on blur or submit
- Client-side Zod errors shown inline per field
- Server-side tRPC errors shown as form-level or toast notification

**Immutability Check Pattern (every write procedure):**

```typescript
const feature = await db.query.features.findFirst({
  where: eq(features.id, id),
});
if (!feature)
  throw new TRPCError({ code: "NOT_FOUND", message: "Feature not found" });
if (feature.frozen)
  throw new TRPCError({ code: "FORBIDDEN", message: "Feature is frozen" });
// ... proceed with mutation
```

- Always check before any DB write — even though the DB trigger also enforces this
- Consistent pattern: check existence, check frozen, then mutate

---

### Enforcement Guidelines

**All AI Agents MUST:**

- Use PascalCase for React component files and Zustand store files
- Use camelCase for hook files; kebab-case for all other non-component files
- Use snake_case for all DB column and table names
- Use camelCase for all JSONB content field names
- Return direct types from tRPC procedures — never wrap in {data, error}
- Write to feature_events in the same transaction as every feature mutation
- Check frozen state in tRPC procedure before the DB trigger catches it
- Default to RSC; add "use client" only when the list above applies
- Co-locate tests with the file they test

**Pattern Enforcement:**

- TypeScript strict mode catches most naming inconsistencies at compile time
- Drizzle schema is the single source of truth for DB naming — never deviate
- packages/validators EventType enum is the single source of truth for event_type values
- CI (GitHub Actions) runs typecheck + lint on every PR — patterns enforced automatically

## Project Structure & Boundaries

### Requirements to Structure Mapping

| FR Category                            | Primary Location                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Feature Lifecycle Management (FR1–FR7) | `packages/api/src/routers/features.ts` + `apps/web/app/(features)/[featureId]/`                      |
| Immutability & Lineage (FR8–FR12)      | `packages/api/src/routers/features.ts` + `packages/db/src/triggers/`                                 |
| Feature Tree (FR13–FR16)               | `apps/web/components/features/FeatureTree.tsx` + `apps/web/stores/TreeStore.ts`                      |
| Wizard (FR17–FR21)                     | `apps/web/app/(features)/wizard/` + `apps/web/components/wizard/` + `apps/web/stores/WizardStore.ts` |
| Raw JSON Access (FR22–FR24)            | `apps/web/components/json-editor/JsonEditor.tsx`                                                     |
| Search & Discovery (FR25–FR28)         | `packages/api/src/routers/search.ts` + `apps/web/app/(features)/search/`                             |
| Schema Configuration (FR29–FR35)       | `packages/api/src/routers/admin.ts` + `apps/web/app/(features)/admin/`                               |
| Audit Trail (FR36–FR37)                | `packages/api/src/routers/events.ts` + `packages/db/src/schema/feature-events.ts`                    |
| Support & Annotations (FR38–FR40)      | `packages/api/src/routers/features.ts` + `apps/web/components/features/AnnotationList.tsx`           |
| Navigation & Overview (FR41–FR42)      | `apps/web/app/(features)/page.tsx` + `apps/web/components/admin/ExportPanel.tsx`                     |

### Complete Project Directory Structure

```
life-as-code/
├── .github/
│   └── workflows/
│       └── ci.yml                         ← lint, typecheck, vitest, playwright on PR
├── .env.example
├── .gitignore
├── package.json                           ← Turborepo root workspace
├── turbo.json                             ← Turborepo pipeline (build, dev, test, lint)
├── bun.lockb
├── README.md
│
├── apps/
│   └── web/                               ← Next.js 15 App Router
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── .env.local
│       ├── playwright.config.ts
│       ├── public/
│       ├── e2e/                           ← Playwright E2E tests
│       │   ├── wizard.spec.ts             ← FR17–FR21 flow completion
│       │   ├── feature-tree.spec.ts       ← FR13–FR16 navigation
│       │   └── search.spec.ts             ← FR25–FR28 search accuracy
│       └── src/
│           ├── app/
│           │   ├── layout.tsx             ← Root layout + tRPC provider
│           │   ├── page.tsx               ← Redirect to /features
│           │   ├── globals.css
│           │   ├── api/
│           │   │   └── trpc/
│           │   │       └── [trpc]/
│           │   │           └── route.ts   ← tRPC HTTP handler (fetch adapter)
│           │   └── (features)/
│           │       ├── layout.tsx         ← App shell (nav, sidebar)
│           │       ├── page.tsx           ← Home/overview + entry points (FR41)
│           │       ├── loading.tsx
│           │       ├── features/
│           │       │   ├── page.tsx       ← Feature list + tree view (FR13–FR16)
│           │       │   └── loading.tsx
│           │       ├── [featureId]/
│           │       │   ├── page.tsx       ← Feature detail + provenance chain (FR4a, FR4b)
│           │       │   ├── loading.tsx
│           │       │   └── error.tsx
│           │       ├── wizard/
│           │       │   ├── page.tsx       ← New feature wizard (FR17–FR21)
│           │       │   ├── loading.tsx
│           │       │   └── [featureId]/
│           │       │       └── page.tsx   ← Edit existing feature in wizard
│           │       ├── search/
│           │       │   ├── page.tsx       ← Search results (FR25–FR28)
│           │       │   └── loading.tsx
│           │       └── admin/
│           │           ├── page.tsx       ← Schema config + templates (FR29–FR35, FR42)
│           │           └── loading.tsx
│           ├── components/
│           │   ├── features/
│           │   │   ├── FeatureCard.tsx
│           │   │   ├── FeatureCard.test.tsx
│           │   │   ├── FeatureDetail.tsx      ← Provenance chain display (FR4a, FR4b)
│           │   │   ├── FeatureDetail.test.tsx
│           │   │   ├── FeatureTree.tsx        ← react-arborist tree (FR13–FR16)
│           │   │   ├── FeatureTree.test.tsx
│           │   │   ├── DecisionLog.tsx        ← Decision log entries (FR5)
│           │   │   ├── AnnotationList.tsx     ← Annotations + flags (FR38–FR40)
│           │   │   ├── AuditHistory.tsx       ← Change history from feature_events (FR37)
│           │   │   └── SpawnModal.tsx         ← Spawn child feature dialog (FR9)
│           │   ├── wizard/
│           │   │   ├── WizardShell.tsx        ← Step container + progress bar
│           │   │   ├── WizardShell.test.tsx
│           │   │   ├── WizardStep.tsx         ← Individual step wrapper + validation
│           │   │   ├── WizardNav.tsx          ← Prev / Next / Save controls
│           │   │   ├── WizardProgress.tsx     ← Stage completion indicator
│           │   │   └── steps/
│           │   │       ├── ProblemStep.tsx
│           │   │       ├── AnalysisStep.tsx   ← Edge case prompting (FR18)
│           │   │       ├── RequirementsStep.tsx
│           │   │       ├── DesignStep.tsx
│           │   │       ├── ImplementationStep.tsx
│           │   │       ├── ValidationStep.tsx
│           │   │       ├── DocumentationStep.tsx
│           │   │       ├── DeliveryStep.tsx
│           │   │       └── SupportStep.tsx
│           │   ├── json-editor/
│           │   │   ├── JsonEditor.tsx         ← CodeMirror 6 wrapper, "use client" + ssr:false (FR22–FR24)
│           │   │   └── JsonEditor.test.tsx
│           │   ├── search/
│           │   │   ├── SearchBar.tsx
│           │   │   ├── SearchFilters.tsx      ← Stage, tag, status, completion filters (FR26)
│           │   │   └── SearchResult.tsx       ← Result card with provenance context (FR27)
│           │   ├── admin/
│           │   │   ├── SchemaEditor.tsx       ← 3-layer schema config UI (FR29–FR31)
│           │   │   ├── TemplateManager.tsx    ← Feature templates (FR32)
│           │   │   └── ExportPanel.tsx        ← Full JSON bundle export (FR42)
│           │   └── ui/
│           │       └── index.ts               ← Re-exports from packages/ui
│           ├── stores/
│           │   ├── WizardStore.ts             ← Multi-step wizard state + persist middleware (FR20)
│           │   └── TreeStore.ts               ← Tree expand/collapse + selection state
│           └── lib/
│               ├── trpc.ts                    ← tRPC client setup + HydrateClient
│               └── utils.ts                   ← Shared utility functions
│
├── packages/
│   ├── api/                               ← tRPC router (logical backend boundary)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                   ← Exports appRouter + AppRouter type
│   │       ├── context.ts                 ← tRPC context: { db, user: {...} | null }
│   │       ├── trpc.ts                    ← Procedure tiers: publicProcedure / protectedProcedure / adminProcedure
│   │       ├── root.ts                    ← Root router composition
│   │       └── routers/
│   │           ├── features.ts            ← FR1–FR12, FR38–FR40 (CRUD, freeze, spawn, annotate)
│   │           ├── features.test.ts       ← Vitest: immutability, schema validation, lineage
│   │           ├── search.ts              ← FR25–FR28 (tsvector + pg_trgm full-text search)
│   │           ├── search.test.ts         ← Vitest: search accuracy, filter logic
│   │           ├── events.ts              ← FR36–FR37 (audit trail reads)
│   │           ├── events.test.ts
│   │           ├── admin.ts               ← FR29–FR35 (schema config, templates, export)
│   │           └── admin.test.ts
│   │
│   ├── db/                                ← Drizzle schema + migrations + DB client
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts                   ← Exports db + all schema tables
│   │       ├── client.ts                  ← Drizzle + Neon HTTP adapter connection
│   │       ├── schema/
│   │       │   ├── index.ts               ← Re-exports all tables
│   │       │   ├── features.ts            ← features table (JSONB content + relational metadata)
│   │       │   ├── feature-events.ts      ← feature_events audit table (append-only)
│   │       │   └── schema-configs.ts      ← schema_configs table (FR29–FR35)
│   │       ├── triggers/
│   │       │   └── immutability.sql       ← PostgreSQL trigger: blocks writes when frozen=true (NFR7)
│   │       └── migrations/                ← drizzle-kit generated SQL migration files
│   │
│   ├── validators/                        ← Zod schemas + TypeScript types + enums
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                   ← Re-exports all validators and types
│   │       ├── feature.ts                 ← FeatureSchema, CreateFeatureSchema, UpdateFeatureSchema
│   │       ├── lifecycle.ts               ← LifecycleStageSchema + all 9 stage field schemas
│   │       ├── search.ts                  ← SearchInputSchema, SearchFilterSchema
│   │       ├── event-types.ts             ← EventType const enum (FEATURE_CREATED, FEATURE_FROZEN…)
│   │       └── schema-config.ts           ← SchemaConfigSchema (required/standard/custom layers)
│   │
│   └── ui/                                ← shadcn/ui components + Tailwind CSS v4
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       └── src/
│           ├── index.ts
│           └── components/                ← shadcn/ui primitives (Button, Dialog, Input…)
```

### Architectural Boundaries

**API Boundary:**

- All data access flows through `packages/api` — `apps/web` never imports from `packages/db` directly
- tRPC is the only communication channel between `apps/web` and the data layer
- `packages/validators` is the shared contract — imported by both `packages/api` and `apps/web`

**Component Boundary:**

- RSC pages fetch data and pass as props to Client Components — no useEffect data fetching
- Client Components own interactivity — wizard steps, tree interactions, JSON editor
- Zustand stores are consumed only in Client Components (`"use client"`)

**Data Boundary:**

- `packages/db` is the only package that imports from Drizzle and connects to Neon
- All DB writes go through tRPC procedures in `packages/api` — no direct DB calls from `apps/web`
- `feature_events` writes are always in the same DB transaction as the feature mutation

### Integration Points

**Internal Data Flow:**

```
User interaction
  → Client Component (Zustand local state)
  → tRPC mutation (packages/api — Zod validation → frozen check → DB write + event log)
  → PostgreSQL / Neon (DB trigger as hard stop on frozen)
  → TanStack Query cache invalidation
  → RSC re-render with fresh data
```

**tRPC Procedure Entry Points:**

- `/api/trpc/features.*` — feature lifecycle operations
- `/api/trpc/search.*` — full-text search
- `/api/trpc/events.*` — audit trail reads
- `/api/trpc/admin.*` — schema configuration

**External Integrations (MVP — none):**

- Neon: database connection via `DATABASE_URL` env var
- Vercel: deployment via git push to main
- GitHub Actions: CI on PR

### Development Workflow

**Local development:**

```bash
bun dev          # turbo run dev — starts Next.js dev server
bun test         # turbo run test — vitest
bun lint         # turbo run lint — eslint + tsc
```

**Schema changes:**

```bash
bun db:generate  # drizzle-kit generate — creates migration SQL
bun db:migrate   # drizzle-kit migrate — applies to Neon dev branch
```

**Deployment:**

- Push to `main` → Vercel auto-deploys `apps/web`
- Neon production branch gets migration applied via CI step

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All technology choices are compatible. tRPC v11, Next.js 15,
Bun, Drizzle, Neon, Zustand, react-arborist, and CodeMirror 6 work together without
conflicts. RSC/Client Component boundary decisions and dynamic import requirements for
browser-only libraries are documented in patterns. RBAC procedure tiers are additive
— MVP uses publicProcedure only, post-MVP promotes routes without structural change.

**Pattern Consistency:** Naming conventions are consistent across DB (snake_case),
TypeScript (camelCase/PascalCase), JSONB content (camelCase), and file organization
(PascalCase for components/stores, camelCase for hooks). Implementation patterns
align with stack choices throughout.

**Structure Alignment:** Monorepo package boundaries enforce the architectural
separation — apps/web never touches packages/db directly. All 42 FRs map to
specific files and directories. Integration points are fully specified.

⚠️ **One flag carried forward:** Tailwind v4 + shadcn/ui compatibility — verify
component availability before assuming full shadcn/ui catalogue works on v4.

---

### Requirements Coverage Validation ✅

**All 42 FRs covered across 10 capability areas** — each has a mapped router
procedure, component file, and directory location.

**All 20 NFRs architecturally addressed:**

- Performance (NFR1–5): RSC prefetch, tsvector GIN, react-arborist virtualized, tRPC mutations
- Data Integrity (NFR6–9): Zod on all write paths, DB trigger, Drizzle transactions, export endpoint
- Code Quality (NFR10–13): TypeScript strict, package boundaries, Vitest + Playwright, CI pipeline
- LLM Readability (NFR14–15): camelCase JSONB fields, self-contained feature artifacts
- Scalability (NFR16–18): org_id on all tables, procedure tiers, Vercel + Neon
- Accessibility (NFR19–20): react-arborist keyboard nav, shadcn/ui accessible primitives

---

### Gap Analysis Results

**Notable gap resolved — Feature ID format (FR1):**
PRD examples used `feat-YYYY-NNN` format but architecture didn't define generation.
Resolved: dual-ID strategy:

- `id` column: ULID (via `ulidx`) — sortable, URL-safe, zero coordination, Bun-native
- `feature_key` column: human-readable `feat-YYYY-NNN` — generated at creation using
  a DB sequence per org_id. Display-facing identifier, matches PRD intent.
  Both columns are on the features table. Internal references use `id`; UI and
  provenance chain display uses `feature_key`.

**Minor gap resolved — Atomic transaction pattern:**
Added to enforcement guidelines: all mutations writing to both `features` and
`feature_events` MUST use a single Drizzle transaction. Partial writes that log
an event without updating the feature (or vice versa) are a data integrity violation.

**Minor gap — Dependency vulnerability scanning (NFR13):**
Add `bun audit` step to GitHub Actions CI workflow. Dependabot for automated
dependency update PRs. These are CI configuration details for the first story.

**Nice-to-have — Env var validation:**
`@t3-oss/env-nextjs` provides typed, Zod-validated environment variables at build
time — catches missing `DATABASE_URL` before deployment rather than at runtime.
Recommended addition during project initialization story.

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed (42 FRs, 20 NFRs)
- [x] Scale and complexity assessed (Medium, solo dev, no real-time MVP)
- [x] Technical constraints identified (Bun, PostgreSQL JSONB, LLM readability)
- [x] Cross-cutting concerns mapped (7 identified and addressed)

**✅ Architectural Decisions**

- [x] Critical decisions documented (starter, DB, search, immutability, audit trail)
- [x] Technology stack fully specified with versions verified
- [x] RBAC-ready procedure tiers defined (additive post-MVP)
- [x] Feature ID strategy defined (ULID internal + feature_key display)
- [x] Deferred decisions documented with clear post-MVP activation paths

**✅ Implementation Patterns**

- [x] Naming conventions established (DB, TypeScript, files, JSONB, event types)
- [x] Structure patterns defined (package boundaries, feature-based organization)
- [x] Communication patterns specified (RSC/Client split, Zustand domains, feature_events writes)
- [x] Process patterns documented (loading states, error handling, validation timing, immutability check)
- [x] Enforcement guidelines with ✅/❌ examples

**✅ Project Structure**

- [x] Complete directory structure defined (all packages + apps/web)
- [x] All 42 FRs mapped to specific files
- [x] Package boundaries and import rules established
- [x] Integration points and data flow documented
- [x] Development workflow commands defined

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**

- End-to-end type safety: Drizzle schema → Zod → tRPC → React with no manual contracts
- Immutability enforced at two layers — cannot be bypassed by any implementation path
- JSONB + tsvector GIN architecture purpose-built for the "why lookup in <30 seconds" NFR
- RBAC and multi-tenancy structurally prepared — post-MVP activation requires no refactoring
- Package boundary enforcement means AI agents cannot accidentally couple layers

**Areas for Future Enhancement:**

- Monitoring (Sentry) when moving beyond internal tool
- Server-side wizard draft persistence when multi-device use is needed
- Git sync / GitHub / Jira integrations (Phase 2–3 per PRD)
- AI-assisted field suggestions using LLM-readable feature artifact structure

---

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently — naming, structure, communication, process
- Respect package boundaries: apps/web → packages/api → packages/db (never skip layers)
- Every feature mutation writes to feature_events in the same transaction
- Every write procedure checks frozen state before touching the DB
- Default to RSC; add "use client" only per the documented decision rule
- Refer to this document for all architectural questions

**First Implementation Story:**

```bash
bun create yuki-stack
# Select: Next.js / tRPC / Drizzle / PostgreSQL
```

Then: configure Turborepo pipeline, connect Neon, run first migration with
features + feature_events + schema_configs tables, apply immutability trigger,
add bun audit to CI, add @t3-oss/env-nextjs for typed env vars.
