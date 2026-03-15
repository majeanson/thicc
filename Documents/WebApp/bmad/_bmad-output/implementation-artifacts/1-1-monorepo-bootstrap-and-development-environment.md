# Story 1.1: Monorepo Bootstrap & Development Environment

Status: ready-for-dev

## Story

As a developer,
I want a working monorepo project structure with all required packages configured,
so that the team has a consistent, reproducible development environment to build life-as-code on.

## Acceptance Criteria

1. **Given** the Create-Yuki-Stack CLI is available, **When** `bun create yuki-stack` is run with Next.js + tRPC + Drizzle + PostgreSQL selections, **Then** the monorepo is initialized with `apps/web`, `packages/api`, `packages/db`, `packages/ui`, `packages/validators` packages all present and correctly linked via Turborepo.

2. **Given** the monorepo is initialized, **When** `bun dev` is run from the root, **Then** the Next.js dev server starts and the app loads at `localhost:3000` without errors.

3. **Given** the packages are configured, **When** TypeScript strict mode is enabled across all packages with project references, **Then** `bun typecheck` passes across all packages without errors.

4. **Given** the project needs environment validation, **When** `@t3-oss/env-nextjs` is configured requiring `DATABASE_URL`, **Then** attempting to start or build the app with a missing `DATABASE_URL` fails with a descriptive error at **startup** — not at runtime.

5. **Given** the project needs CI/CD, **When** a GitHub Actions workflow is configured for PR checks (lint, typecheck, `bun audit`), **Then** all CI steps pass on the initial codebase and the workflow is visible in the repository.

## Tasks / Subtasks

- [ ] Task 1: Initialize monorepo via Yuki-Stack CLI (AC: #1)
  - [ ] 1.1 Run `bun create yuki-stack` and select: Framework=Next.js, API=tRPC, ORM=Drizzle, Database=PostgreSQL
  - [ ] 1.2 Verify all five packages exist: `apps/web`, `packages/api`, `packages/db`, `packages/ui`, `packages/validators`
  - [ ] 1.3 Verify `turbo.json` is present at root with `build`, `dev`, `test`, `lint` pipelines defined
  - [ ] 1.4 Verify `bun.lockb` is present (not `package-lock.json` or `yarn.lock`)
  - [ ] 1.5 Verify Turborepo workspace configuration links all packages correctly in root `package.json`

- [ ] Task 2: Configure TypeScript strict mode with project references (AC: #3)
  - [ ] 2.1 Enable `"strict": true` in every `tsconfig.json` across all packages (`apps/web`, `packages/api`, `packages/db`, `packages/ui`, `packages/validators`)
  - [ ] 2.2 Add TypeScript project references in each package's `tsconfig.json` so cross-package type resolution works without rebuilds
  - [ ] 2.3 Ensure root-level `tsconfig.json` references all package configs
  - [ ] 2.4 Run `bun typecheck` (turbo run typecheck) and confirm it passes with zero errors

- [ ] Task 3: Configure `@t3-oss/env-nextjs` environment validation (AC: #4)
  - [ ] 3.1 Install `@t3-oss/env-nextjs` in `apps/web`
  - [ ] 3.2 Create `apps/web/src/env.ts` (or `env.js`) defining `server: { DATABASE_URL: z.string().url() }` using `createEnv`
  - [ ] 3.3 Import the env module at the top of `apps/web/next.config.ts` so validation runs at build/startup
  - [ ] 3.4 Create `apps/web/.env.example` with `DATABASE_URL=postgresql://user:password@host/db`
  - [ ] 3.5 Create `apps/web/.env.local` with a real Neon dev branch `DATABASE_URL` for local development
  - [ ] 3.6 Add `.env.local` to `.gitignore` (verify it is already there from Yuki-Stack)
  - [ ] 3.7 Verify: start dev server without `DATABASE_URL` → descriptive error message appears at startup

- [ ] Task 4: Verify `bun dev` works end-to-end (AC: #2)
  - [ ] 4.1 Run `bun dev` from repo root
  - [ ] 4.2 Confirm Next.js dev server starts with Turborepo
  - [ ] 4.3 Open `http://localhost:3000` and confirm the app loads without console errors or 500s

- [ ] Task 5: Set up GitHub Actions CI workflow (AC: #5)
  - [ ] 5.1 Create `.github/workflows/ci.yml` if not already present from Yuki-Stack
  - [ ] 5.2 Configure workflow to trigger on `pull_request` targeting `main`
  - [ ] 5.3 Add job steps: `bun install`, `bun lint` (turbo run lint), `bun typecheck` (turbo run typecheck), `bun audit`
  - [ ] 5.4 Ensure Bun is set up correctly in CI using `oven-sh/setup-bun` action (latest version)
  - [ ] 5.5 Add `DATABASE_URL` as a GitHub Actions secret (dummy value is fine for lint/typecheck steps)
  - [ ] 5.6 Push branch, open a draft PR, verify all CI steps appear and pass in the GitHub Actions tab

- [ ] Task 6: Create `.env.example` and root README scaffold (AC: supporting)
  - [ ] 6.1 Root `.env.example` listing all required environment variables with descriptions
  - [ ] 6.2 Minimal `README.md` with: project name, tech stack, quickstart (`bun install && bun dev`), env setup steps

## Dev Notes

### Initialization Command — CRITICAL

The project is bootstrapped via:

```bash
bun create yuki-stack
```

Select **exactly** these options when prompted:

- Framework: **Next.js**
- API layer: **tRPC**
- ORM: **Drizzle**
- Database: **PostgreSQL**

Do NOT use `npx create-t3-app` or any other scaffolder. Yuki-Stack is the chosen starter because it ships tRPC v11 + Bun-native + Drizzle together with Turborepo out of the box. Any other scaffolder would require significant manual reconfiguration and is NOT the intended path.

[Source: `_bmad-output/planning-artifacts/architecture.md` — Starter Template Evaluation]

### Package Manager — Bun ONLY

**Use Bun throughout.** Do not run `npm install`, `yarn`, or `pnpm` at any point. The lockfile is `bun.lockb`.

```bash
bun install           # Install deps
bun dev               # Start dev server via turbo
bun typecheck         # TypeScript check across all packages
bun lint              # ESLint across all packages
bun test              # Vitest across all packages
bun audit             # Security audit
```

[Source: `_bmad-output/planning-artifacts/architecture.md` — Development Experience]

### Expected Monorepo Structure After Init

After `bun create yuki-stack`, the repo should look like:

```
life-as-code/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── .gitignore
├── package.json            ← Turborepo root workspace
├── turbo.json              ← Turborepo pipeline (build, dev, test, lint)
├── bun.lockb
├── README.md
├── apps/
│   └── web/                ← Next.js 15 App Router
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── .env.local       ← NOT committed (gitignored)
│       ├── .env.example     ← Committed, placeholder values
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx
│           │   ├── globals.css
│           │   └── api/
│           │       └── trpc/
│           │           └── [trpc]/
│           │               └── route.ts
│           └── lib/
│               └── trpc.ts
└── packages/
    ├── api/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       ├── context.ts
    │       ├── trpc.ts
    │       └── root.ts
    ├── db/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── drizzle.config.ts
    │   └── src/
    │       ├── index.ts
    │       ├── client.ts
    │       └── schema/
    │           └── index.ts
    ├── validators/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       └── index.ts
    └── ui/
        ├── package.json
        ├── tsconfig.json
        ├── tailwind.config.ts
        └── src/
            └── index.ts
```

[Source: `_bmad-output/planning-artifacts/architecture.md` — Complete Project Directory Structure]

### Package Responsibilities — Strict Boundaries

Do NOT violate these boundaries:

| Package               | Allowed Imports                      | Forbidden                               |
| --------------------- | ------------------------------------ | --------------------------------------- |
| `packages/db`         | External DB libs only                | No business logic, no api imports       |
| `packages/api`        | `packages/db`, `packages/validators` | No ui, no apps/web                      |
| `packages/validators` | External libs (Zod) only             | No imports from other internal packages |
| `packages/ui`         | Tailwind, shadcn primitives          | No business logic, no api/db imports    |
| `apps/web`            | All packages                         | Never imports across other apps         |

[Source: `_bmad-output/planning-artifacts/architecture.md` — Monorepo Package Responsibilities]

### TypeScript Configuration — Key Settings

Every package `tsconfig.json` MUST have:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

TypeScript project references must be configured so `packages/api` can import `packages/db` types without separate compilation. The Yuki-Stack scaffolder likely sets this up — verify it is correct after init.

[Source: `_bmad-output/planning-artifacts/architecture.md` — Language & Runtime]

### Environment Validation with @t3-oss/env-nextjs

Create `apps/web/src/env.ts`:

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
});
```

Import in `apps/web/next.config.ts`:

```typescript
import "./src/env"; // Triggers validation at build/startup
```

This ensures a missing `DATABASE_URL` produces a clear error message at application startup — not a cryptic runtime crash when the DB is first accessed.

[Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.1 AC #4]

### GitHub Actions CI Workflow

If Yuki-Stack does not scaffold `.github/workflows/ci.yml`, create it:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ci:
    name: Lint, Typecheck & Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint
        run: bun lint
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost/placeholder' }}

      - name: Typecheck
        run: bun typecheck
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost/placeholder' }}

      - name: Security audit
        run: bun audit
```

Note: `DATABASE_URL` is needed at typecheck time because `@t3-oss/env-nextjs` runs at module load. Use a dummy value if the real secret isn't available — the format just needs to pass Zod's `z.string().url()` check.

[Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.1 AC #5]

### Naming Conventions — Establish from Day 1

The naming conventions below MUST be followed throughout the project. This story sets the precedent:

| Pattern               | Convention                      | Examples                                            |
| --------------------- | ------------------------------- | --------------------------------------------------- |
| Variables & functions | camelCase                       | `featureId`, `getFeature`, `isFrozen`               |
| Types & interfaces    | PascalCase                      | `Feature`, `FeatureEvent`, `LifecycleStage`         |
| Zod schemas           | PascalCase + Schema suffix      | `FeatureSchema`, `CreateFeatureSchema`              |
| Zustand stores        | PascalCase + Store suffix       | `WizardStore`, `TreeStore`                          |
| Constants             | SCREAMING_SNAKE_CASE            | `MAX_TREE_DEPTH`, `LIFECYCLE_STAGES`                |
| React components      | PascalCase                      | `FeatureTree`, `WizardStep`                         |
| Hooks                 | camelCase                       | `useFeature.ts`, `useFreezeFeature.ts`              |
| Non-component files   | kebab-case                      | `trpc.ts`, `utils.ts`, `event-types.ts`             |
| Test files            | co-located `.test.ts/.test.tsx` | `FeatureDetail.test.tsx` beside `FeatureDetail.tsx` |
| DB tables             | plural snake_case               | `features`, `feature_events`                        |
| DB columns            | snake_case                      | `feature_id`, `org_id`, `created_at`                |

**No `__tests__` directories** — tests co-locate next to the file they test.

[Source: `_bmad-output/planning-artifacts/architecture.md` — Naming Patterns]

### Tech Stack Summary (Versions)

| Technology            | Role                      | Notes                                           |
| --------------------- | ------------------------- | ----------------------------------------------- |
| **Bun**               | Runtime + package manager | Replace Node/npm entirely                       |
| **Next.js 15**        | Frontend + API routes     | App Router + RSC by default                     |
| **tRPC v11**          | Type-safe API             | Served via Next.js API route `/api/trpc/[trpc]` |
| **Drizzle ORM**       | Database ORM + migrations | Pure TypeScript, no native binary               |
| **PostgreSQL (Neon)** | Database                  | Managed, DB branching for dev branches          |
| **Tailwind CSS v4**   | Styling                   | Mobile-first, 8px base grid                     |
| **shadcn/ui**         | Component library         | Radix UI primitives, no default theme           |
| **Zod**               | Validation                | Single validation engine across entire stack    |
| **Zustand**           | Client UI state           | Wizard state, tree state, UI preferences        |
| **TanStack Query**    | Server state (via tRPC)   | Prefetch in RSC, hydrate on client              |
| **Vitest**            | Unit + integration tests  | Co-located `.test.ts` files                     |
| **Playwright**        | E2E tests                 | `apps/web/e2e/` directory                       |
| **Turborepo**         | Monorepo task runner      | Caching, pipeline orchestration                 |

⚠️ **Compatibility note:** Verify shadcn/ui component availability on Tailwind CSS v4 before assuming full catalogue availability — some components may require manual adaptation.

[Source: `_bmad-output/planning-artifacts/architecture.md` — Technology Stack]

### What This Story Does NOT Include

Story 1.1 only covers the development environment bootstrap. The following are explicitly out of scope and belong to later stories:

- **Database schema creation** → Story 1.2
- **Vercel deployment** → Story 1.3
- **App shell UI (header, sidebar)** → Story 1.4
- **Design tokens, themes, shadcn/ui component library** → Story 1.5
- **Any tRPC procedures** → Epic 2+
- **Playwright E2E tests** → later stories (no app UI yet)

For this story, Vitest is installed but no tests are written — the test infrastructure just needs to be present and `bun test` must not fail.

### Project Structure Notes

- Alignment: this story establishes the canonical structure defined in the architecture document
- The full `apps/web/src/` feature-based directory structure (components, stores, lib) will be scaffolded by later stories — do not pre-create empty directories
- `packages/db/src/schema/` can be minimal (just `index.ts` re-export) — actual schema goes in Story 1.2
- `packages/api/src/routers/` can be empty for now — procedures come in Epic 2

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.1 — Full BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Starter Template Evaluation, Monorepo structure, Tech stack, Naming conventions, Directory structure]
- [Source: `_bmad-output/planning-artifacts/prd.md` — NFR10-NFR13, Technical constraints, SaaS B2B spec]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — Tailwind CSS v4 + shadcn/ui compatibility note]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
