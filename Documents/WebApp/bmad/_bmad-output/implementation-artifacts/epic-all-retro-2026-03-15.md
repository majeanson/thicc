# Project Retrospective — Epics 1–7: life-as-code

**Date:** 2026-03-15
**Scope:** Full project retrospective covering all 7 epics
**Facilitator:** Bob (Scrum Master)
**Participants:** Alice (Product Owner), Charlie (Senior Dev), Dana (QA Engineer), Elena (Junior Dev), Marc_ (Project Lead)
**Previous Retrospectives:** None (this is the first retrospective)

---

## Epic Summary & Metrics

| Epic | Title | Stories Done | Status |
|------|-------|-------------|--------|
| 1 | Foundation & Infrastructure Setup | 4/5 | ⚠️ In-progress (1.3 backlog) |
| 2 | Feature Creation & Lifecycle Management via Wizard | 5/5 | ✅ Done |
| 3 | Feature Discovery — Search, Tree & Provenance | 5/5 | ✅ Done |
| 4 | Feature Immutability & Lineage | 4/4 | ✅ Done |
| 5 | Raw JSON Access & Dual-Mode Editing | 3/3 | ✅ Done |
| 6 | Admin — Schema Configuration & Templates | 4/4 | ✅ Done |
| 7 | Annotations, Audit Trail & Export | 4/4 | ✅ Done |

**Total:** 29/30 stories delivered. Code quality: 0 TypeScript errors, 0 oxlint errors at completion of every story.

---

## Successes & Strengths

### 1. DB-Level Immutability Architecture
The PostgreSQL trigger (`prevent_frozen_feature_mutation`) established in Story 1.2 and verified with integration tests in Story 4.1 guaranteed frozen feature immutability at the database level — no application-layer bypass possible. This architectural decision held robustly throughout all 7 epics.

### 2. Consistent Code Quality Discipline
Every story ended with `tsc --noEmit` → 0 errors and `bunx oxlint --threads 1` → 0 warnings/errors. This discipline was maintained across all 30 stories despite a strict oxlint configuration with 40+ rules.

### 3. Accessibility First
WCAG 2.1 AA accessibility was implemented from Epic 1 Story 1.4 onward: skip links, semantic HTML, ARIA roles, keyboard navigation, focus management, and `prefers-reduced-motion` support. This was not retrofitted — it was built in from the start.

### 4. Velocity Improvement Over Time
- Epic 2 Story 2.1: 4 debug log entries
- Epic 2 Story 2.3: Zero debug log entries (first clean story)
- Epics 6–7: Nearly all stories clean on first implementation

### 5. Integration Testing Foundation
Vitest integration tests introduced in Epic 4 Story 4.1 grew to 13 passing tests by Epic 5. Real DB tests provided genuine verification of immutability enforcement.

### 6. Breadth of Delivery
Full-stack delivery from DB schema through tRPC API to React UI, covering: lifecycle wizard (Focus + Fast mode), global search, tree view, provenance chain, immutability + lineage, JSON editor, schema admin, feature templates, annotations, audit trail, and full project export.

---

## Challenges & Growth Areas

### 1. Stale Dist Issue (Recurring — 7+ stories across Epics 2–7)
**What happened:** After adding validators or tRPC procedures in one story, the next story's TypeScript check failed because `packages/validators/dist` or `packages/api/dist` was stale. The developer had to manually `bun run build` before proceeding.

**Affected stories:** 2.1, 3.2, 4.3, 5.1, 6.2, 7.2 (and others)

**Root cause:** No mandatory "rebuild packages" step in the story start workflow.

**Impact:** Context-switching overhead on nearly one story per epic throughout the project.

### 2. Oxlint Rework (Recurring — ~12 stories across all epics)
**Recurring violations discovered reactively rather than proactively:**
- `no-map-spread` → use `Object.assign` (Epics 3, 6, 7)
- `no-array-sort` → use `.toSorted()` (Epics 3, 7)
- `require-await` → remove `async` from non-awaiting functions (Epics 2, 6)
- `no-non-null-assertion` → use optional chaining (Epics 2, 3)
- `no-await-in-loop` → collect `Promise.all` (Epic 6)
- `no-accumulating-spread` → `Object.assign` accumulator (Epic 6)
- `unicorn/filename-case` → kebab-case enforced (discovered Epic 1, caused issues in Epic 2)
- `prefer-tag-over-role` → use semantic elements (Epic 5)
- `no-negated-condition` → flip ternary (Epics 2, 5)

**Root cause:** No consolidated oxlint rule reference at project start.

### 3. Windows Dev Environment Friction (Epics 1, 2, 3, 5)
Three separate Windows-specific issues requiring workarounds:
1. `bun run lint` → OOM panic → workaround: `bunx oxlint --threads 1`
2. `bun typecheck` (turbo) → OOM flakiness → workaround: `bun x tsc --noEmit` directly
3. `bun run build` → Bun segfault on Windows (known Bun/Windows bug) — never resolved

These workarounds were documented progressively in story Dev Notes but never consolidated into a single setup guide.

### 4. Story 1.3 (Vercel Deployment) Never Started *(Critical Gap)*
Story 1.3 remained in `backlog` status through all 7 epics. The app delivered 29 features with zero production deployments. Every epic built on an undeployed foundation.

### 5. Testing Coverage Gap
| Layer | Test Coverage |
|-------|-------------|
| `packages/db` — DB integration | 13 tests ✅ |
| `packages/api` — tRPC procedures | 0 tests ❌ |
| `apps/nextjs` — Components | 0 tests ❌ |
| E2E (Playwright) | Installed, never configured ❌ |

Vitest was installed in `packages/api` and `apps/nextjs` as placeholders but no tests were written.

### 6. Architecture Doc Drift
`_bmad-output/planning-artifacts/architecture.md` drifted from reality as early as Epic 1:
- Documented `apps/web` → actual path: `apps/nextjs`
- Documented `shadcn/ui` → actual library: `@base-ui/react`
- Documented PascalCase filenames → enforced kebab-case by oxlint

These corrections were documented in individual story Dev Notes but the source document was never updated, causing re-discovery overhead per epic.

---

## Key Insights & Lessons Learned

1. **Build package dists before typechecking** — this must be a first-class step in the workflow, not a reactive discovery
2. **Know your linter's rules before writing code** — the oxlint rule set is strict and should be understood upfront
3. **Keep architecture docs in sync with reality** — drift from day one compounds every sprint
4. **Deploy early, even to a staging environment** — Story 1.3 should have blocked Epic 2
5. **Testing cannot be perpetually deferred** — by Epic 7, the untested surface area is significant
6. **Windows dev environment needs a dedicated setup doc** — these workarounds affect every session

---

## Action Items

### Process Improvements

| # | Action | Owner | Success Criteria |
|---|--------|-------|-----------------|
| P1 | Create "Story Start Checklist" with mandatory rebuild steps, Windows commands, and lint/typecheck approach | Charlie (Senior Dev) | Story template includes checklist |
| P2 | Create `docs/oxlint-rules-reference.md` — top 10 recurring violations with correct patterns | Charlie (Senior Dev) | Doc present in project, linked from story template |
| P3 | Update `architecture.md` to reflect actual codebase: `apps/nextjs`, `@base-ui/react`, kebab-case, Windows workarounds | Marc_ (Project Lead) | Architecture.md matches codebase reality |

### Technical Debt

| # | Action | Priority | Owner | Success Criteria |
|---|--------|----------|-------|-----------------|
| T1 | **Complete Story 1.3 — Vercel Deployment Pipeline** | 🔴 CRITICAL | Marc_ + Charlie | App deployed, CI pipeline green, production URL accessible |
| T2 | Set up Vitest in `packages/api` with integration tests for core procedures | 🟠 High | Dana (QA Engineer) | `create`, `freeze`, `spawn`, `updateSchema` tested |
| T3 | Set up Vitest in `apps/nextjs` for key components | 🟡 Medium | Dana (QA Engineer) | Wizard state logic, search overlay, freeze/spawn covered |
| T4 | Configure Playwright E2E tests (axe-core already installed) | 🟡 Medium | Dana (QA Engineer) | Happy-path: feature creation, search, freeze+spawn |

### Documentation

| # | Action | Owner | Success Criteria |
|---|--------|-------|-----------------|
| D1 | Create `docs/dev-environment-setup.md` with Windows workarounds | Elena (Junior Dev) | New developer can set up without hitting known issues |

---

## Team Agreements

1. Every story must rebuild affected package dists (`bun run build` in validators/api) before marking `review`
2. Oxlint must pass with 0 errors before a story is marked `review`
3. `architecture.md` is the living source of truth — update it when reality diverges
4. Every new tRPC procedure must have at least one integration test

---

## Critical Path (Before Next Feature Work)

| # | Item | Urgency |
|---|------|---------|
| CP1 | **Story 1.3 — Vercel Deployment Pipeline** | 🔴 Must do first — 29 features undeployed |
| CP2 | **Update architecture.md** | 🟠 Do before next epic — prevents continued confusion |

---

## Next Steps

1. Complete Critical Path item CP1 (Story 1.3 — Vercel deployment)
2. Update architecture.md (CP2)
3. Execute process improvement actions (P1–P3) — can be done in parallel
4. Begin test coverage work (T2–T4) — can run alongside new feature development

---

## Readiness Assessment

| Dimension | Status | Notes |
|-----------|--------|-------|
| Code Quality | ✅ Strong | 0 TS errors, 0 lint errors throughout |
| Testing | ⚠️ Gap | DB tests only; API/UI/E2E untested |
| Deployment | ❌ Not deployed | Story 1.3 never completed |
| Architecture Docs | ⚠️ Outdated | Drifted from reality in Epic 1, never corrected |
| Technical Debt | 🟡 Manageable | Identified and prioritized above |

**Overall:** The codebase is architecturally sound with strong code quality discipline. The primary gaps are deployment readiness and test coverage. These are addressable before the next feature epic.

---

## Celebration

The team delivered a complete feature management system in 7 epics:
- A 9-stage lifecycle wizard (Focus + Fast mode)
- Full-text search + tree view + provenance chains
- DB-level immutability with lineage tracking
- JSON dual-mode editing with live validation
- Admin schema configuration with automatic propagation
- Feature templates with picker UX
- Annotations with flagging
- Full audit trail with pagination
- Project-wide JSON export with filters

**29 stories. 0 TS errors. 0 lint errors. That's real work.**
