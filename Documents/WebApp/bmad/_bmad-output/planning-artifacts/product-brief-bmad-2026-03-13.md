---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-03-13-2038.md']
date: 2026-03-13
author: Marc_
---

# Product Brief: bmad

## Executive Summary

Software teams consistently build features that miss their mark — not because of bad engineers or lazy PMs, but because the information architecture of software development is structurally broken. The "why" behind a feature — the original human problem, the decisions made during the build, the rationale for every trade-off — gets scattered across Jira tickets, Slack threads, docx files, code comments, and tribal knowledge. By the time a feature ships, nobody can reconstruct the full chain from human need to working code.

This product is a **provenance layer for software intent** — a Code-as-X lifecycle system where every feature becomes a single, structured, AI-readable JSON artifact tracing the complete chain from problem identification through analysis, design decisions, implementation, validation, documentation, delivery, and support. One model. Many views. Every role sees what they need. The "why" never gets lost.

The feature JSON is not just documentation — it's a **thinking tool** and the **single source of truth**. Every empty field is a question someone hasn't asked yet. The schema functions as a decision protocol — cognitive checkpoints that force teams to think before they build. Developers make a habit of keeping the truth in the JSON; the code implements it, but the rationale lives in the feature file.

It doesn't replace existing tools. It sits alongside them as an additive overlay — try it on one feature, and if it doesn't help, delete it. Nothing else changed.

---

## Core Vision

### Problem Statement

Every software team experiences the same failure mode: features get built that people don't use. The root cause is not communication, process, or talent — it's structural. The software development lifecycle has no unified, traceable link between "a human has a problem" and "code was shipped to solve it." Information is fragmented across 5+ tools (requirements docs, tickets, planning spreadsheets, code, help files), and no single artifact carries the full context of why a feature exists, what decisions shaped it, and how it should be used and maintained.

This is universally misdiagnosed as a communication problem. It is an information architecture problem.

### Problem Impact

- **Rework costs:** Features that pass all acceptance criteria but fail real users require expensive rebuilds
- **Onboarding drag:** New team members spend weeks asking "why does this exist?" because the answer lives in someone's head
- **Support blindness:** Support teams can't answer "why does this work this way?" without escalating to the dev who built it
- **Dead complexity:** Configurations and features get built for hypothetical use cases that clients accept but never use (the Phantom Configuration)
- **Lost voice:** Developers closest to the implementation have insights about user needs but the process strips their input out — the say is lost
- **Knowledge decay:** When people leave, the "why" behind features leaves with them permanently
- **Unasked questions:** Without a structure that forces deliberate thought, critical questions about edge cases, user behavior, and real-world usage go unasked until it's too late

### Why Existing Solutions Fall Short

Current tools address fragments of this problem but none solve it structurally:

- **Jira / Linear / Asana:** Track *work* (tickets, sprints, assignments) but not *intent* (why this work matters, what human need it traces to)
- **Confluence / Notion / wikis:** Store *documents* but have no structural link to code, no enforced completeness, and no role-based views of the same data
- **GitHub / GitLab:** Track *code changes* but code carries no provenance — you can't ask "why does this function exist?" and get an answer
- **Productboard / Aha!:** Track *product strategy* but disconnect from implementation — the chain breaks at the handoff to engineering

All existing solutions share three deficiencies: they lack **simplicity** (too complex to maintain), **flexibility** (rigid workflows that don't match how teams actually work), and **convenience** (information scattered across multiple tools instead of unified in one place).

### Proposed Solution

A Code-as-X lifecycle system built on a JSONB database with git sync, where every feature is a structured artifact containing:

- **Root Node:** A single, human-readable problem statement that everything traces back to
- **Decision Trail:** Every choice recorded with rationale, linked to the root — including informal decisions from Slack and standups
- **9-Stage Lifecycle:** Problem → Analysis → Requirements → Design → Implementation → Validation → Documentation → Delivery → Support — stages are categories (tags), not rigid gates
- **Feature Tree:** Completed features are immutable. Evolution spawns new linked features, creating a traversable product history
- **Dual Interface:** Web app wizard for PMs/managers ("click next step"), raw JSON in git repo for devs — same data, same validation, two experiences
- **AI-Native:** Structure is natively parseable by LLMs. The feature file is AI memory — enabling instant context for copilots, auto-generated docs, and drift detection
- **Progressive Completion:** Quick capture (2 min) → Standard (guided) → Deep (full + extensions). Nudges toward completeness, never forces it upfront
- **Thinking Tool:** The wizard isn't a form — it's a guided conversation. Each stage forces the questions that teams typically skip. Empty fields are unasked questions, not missing data.

**Architecture:** JSONB in database as primary source of truth (queryable, collaborative, AI-native). JSON files exported/synced to git repo as archive (devs read in IDE, CI/CD validates, zero lock-in — if the tool dies, your data survives as files).

### Key Differentiators

1. **Provenance Layer, Not a PM Tool:** This is a new category — not project management, not documentation, not code hosting. It's the connective tissue between all three.
2. **Decision Protocol, Not Documentation:** The schema is a thinking tool. It forces cognitive checkpoints — the right questions at the right time. The structure makes you think before you build.
3. **Single Source of Truth:** The feature JSON is where truth lives. Developers make a habit of keeping it there. Code implements the truth; the JSON records it.
4. **Structural Enforceability:** The "why" can't get lost because the system won't accept disconnected work. Like a compiler rejecting bad syntax, not a manager asking for better docs.
5. **Zero-Risk Adoption with Built-In Exit Strategy:** Additive overlay on existing workflows. Nothing to replace, nothing to migrate. If the product disappears, your JSON files survive in the repo. Trust is built into the architecture.
6. **One Model, Many Views:** PM sees problem + criteria. Dev sees spec + code links. Support sees runbook + edge cases. User sees "what this does." Same data. One product with role-based entry points, not three separate tools.
7. **AI-First Design:** The feature file IS the AI context. Not documentation that needs RAG pipelines — natively structured for LLM consumption. The primary consumer may be AI, with humans benefiting through better AI assistance.
8. **Built for Small Teams:** Designed for a 2-person startup. Expandable to 200. The atoms are the same — the ceremony scales.

## Target Users

### Primary Users

**1. The Developer — "Alex"**
Senior developer, 4 years at the company. Builds features daily, writes tests, reviews PRs. Alex understands the user's problem better than anyone because they're the one translating it into code — but the process never asks for their input on the "why." They receive tickets that say "build a dietary filter component" without context on why filtering was chosen over blocking, what edge cases matter, or what the patient actually needs. When something breaks six months later, Alex is the only person who remembers why the code works the way it does — and if Alex leaves, that knowledge is gone.

- **Current pain:** Builds to spec without questioning because the process doesn't invite it. Gets blamed when features miss the mark despite building exactly what was asked.
- **Workaround:** Personal notes, code comments, sometimes a README. None of it is connected to the original requirement.
- **What success looks like:** Opens a feature file, sees the human problem, the decisions made, the edge cases identified. Writes code knowing *why* it matters. Their insights about implementation get captured and persist. The truth lives in the JSON — they make a habit of keeping it there.
- **Adoption trigger:** Joins a team that uses the tool and can answer "why does this code exist?" in 30 seconds instead of asking three people.

**2. The Product Manager — "Jordan"**
PM with 5 years experience, manages 3-4 active features at any time. Jordan writes PRDs, defines requirements, makes trade-off decisions in standups and Slack threads. The problem: Jordan's decisions get scattered — the PRD is in Confluence, the trade-off was decided in a Slack thread that nobody can find, the scope change happened in a call that wasn't documented. When the feature ships wrong, Jordan can't even prove what was originally intended.

- **Current pain:** Writes requirements that get misinterpreted. Makes decisions that get lost. Gets asked "why did we build it this way?" and can't reconstruct the answer.
- **Workaround:** Long PRDs nobody reads, Slack bookmarks, personal notes.
- **What success looks like:** One place where the problem statement, every decision, and every trade-off lives. The wizard asks the right questions and forces deliberate thought. When the feature ships, the full "why" chain is intact and searchable.
- **Adoption trigger:** Sees the wizard as a thinking partner, not a form. Realizes it prevents the "that's not what we asked for" conversation.

**3. The Support / QA Engineer — "Casey"**
Support engineer or QA who handles production issues and user questions. Casey needs to understand why features work the way they do, what edge cases were considered, and what the known limitations are. Currently, Casey's only option is to escalate to the developer who built it — and if that dev is busy, on vacation, or gone, the ticket stalls.

- **Current pain:** Can't answer "why does this work this way?" without escalating. No access to decision context, edge case documentation, or the original problem statement.
- **Workaround:** Asks the dev directly. Maintains a personal FAQ doc. Guesses based on experience.
- **What success looks like:** Searches "dietary restriction filtering" and gets back the original problem, the decisions made, the known edge cases, and the support runbook — all in one view, in 30 seconds.
- **Adoption trigger:** First time they resolve a ticket without escalating because the feature file had the answer.

**4. The New Hire — "Sam"**
Developer or PM who just joined the team. Sam has zero context on why any feature exists, what decisions shaped the codebase, or where the bodies are buried. Currently, onboarding is 3+ weeks of asking "who built this?" and "why does this work this way?" — questions that interrupt senior team members and still don't give the full picture.

- **Current pain:** Drowning in tribal knowledge they can't access. Afraid to change code because they don't know what it's for or what depends on it.
- **Workaround:** Shadow senior devs, ask lots of questions, read scattered docs that may be outdated.
- **What success looks like:** Reads the feature tree and understands the product's evolution — every feature, why it was built, what decisions shaped it. Onboarding goes from weeks to days.
- **Adoption trigger:** The feature tree is the onboarding guide. No more "go ask Sarah."

### Secondary Users

**5. The Client / Stakeholder**
The person who originally reports the problem or requests a feature. Not a direct user of the tool in most cases, but their voice — the original human need — is the root node that everything traces back to. In some configurations, they might have read-only access to see feature status and understand what's being built for them.

**6. The VP of Engineering / Engineering Manager — Buyer Persona**
Not a daily user. Buys the tool because they feel the cost of rework, onboarding drag, and knowledge decay at the organizational level. Likely discovers the product because a developer on their team advocates for it. Evaluates based on: does it reduce rework? Does it speed up onboarding? Does it survive when people leave? The zero-risk adoption and built-in exit strategy are key trust signals for this persona.

### User Journey

**Discovery:** A developer (Alex) tries the tool on a personal project or hears about it from a peer. They see the value of having a structured feature file with full provenance.

**Advocacy:** Alex introduces it to their team: "Let's try this on one feature." Zero-risk adoption means nobody has to approve a migration or change existing tools.

**Team Adoption:** The team uses it on one feature. The PM (Jordan) discovers the wizard forces good thinking. The support engineer (Casey) resolves a ticket without escalating for the first time. The new hire (Sam) onboards on that feature in minutes instead of days.

**Purchase Trigger:** The VP of Engineering notices the team using it, sees the reduction in "that's not what we asked for" moments, and authorizes team-wide adoption.

**Expansion:** The tool spreads to other teams. The feature tree becomes the organizational memory of why the product exists the way it does.

**Long-term Value:** Two years later, nobody on the original team is still there. But every feature still explains itself. The truth survived because it lived in the JSON, not in people's heads.

## Success Metrics

### User Success Metrics

**Developer (Alex):**
- Feature context retrieval: can answer "why does this code exist?" in under 60 seconds using the feature file
- Feature files are kept current — devs update the JSON as part of their workflow, not as an afterthought
- Reduction in "ask the person who built it" interruptions

**Product Manager (Jordan):**
- Decisions stop getting lost — every trade-off and scope change is captured in the feature file's decision trail
- The wizard surfaces unasked questions that would have been missed in the old process
- Zero features ship where the team later says "that's not what we asked for"

**Support / QA (Casey):**
- Tickets resolved without escalation to the original developer
- Time-to-resolution drops because the feature file provides the context that used to require a person

**New Hire (Sam):**
- Onboarding time to productivity reduced — new team member can understand any feature's purpose, decisions, and structure by reading the feature tree instead of shadowing for weeks

### Business Objectives

**3-Month Target (Internal Dogfooding):**
- Marc_'s team actively uses the tool on all new features — it's part of the workflow, not bolted on
- At least 10 feature files created with full provenance chains
- No drift — feature files are maintained and current, not write-once artifacts
- Each user type (dev, PM, support) has used the tool in their role at least once and found value

**12-Month Target (Product Viability):**
- Tool has been used across multiple projects or teams beyond Marc_'s own
- Feature tree provides real onboarding value — measurable through new hire feedback
- The methodology is proven: teams using it ship fewer misaligned features than teams without it
- Product is stable enough to consider external adoption or productization

### Key Performance Indicators

| KPI | Measurement | Target |
|-----|------------|--------|
| **Adoption Rate** | % of new features that get a feature file | 100% for team features |
| **No Drift** | % of feature files updated when code changes | >80% within same sprint |
| **Drift Detection** | Automated: CI/CD or PR checks flag when code touching a feature's linked files changes but the feature JSON hasn't been updated in the same PR. Structural enforcement, not honor system. | Every PR that touches feature-linked code triggers a check |
| **Completeness** | Average stage completion across feature files | >70% of stages filled with quality content |
| **Context Retrieval** | Time to answer "why does this exist?" | <60 seconds with feature file |
| **Escalation Reduction** | Support tickets resolved without dev escalation | Measurable decrease quarter-over-quarter |
| **Onboarding Speed** | Time for new hire to be productive on a feature | Measurable improvement vs. pre-tool baseline |
| **Decision Capture** | % of significant decisions recorded in feature files | >90% — including informal decisions |
| **Overhead per Feature** | Time added to workflow by creating and maintaining a feature file vs. time saved in rework, escalations, onboarding, and context retrieval. Tracked per feature to build the ROI case. | Net positive — time saved > time invested |
| **User Satisfaction** | Qualitative feedback from each role | Each persona type reports the tool adds value, not overhead |

## MVP Scope

### Core Features

**1. JSONB Database + JSON Schema**
The foundation. A database storing feature artifacts as JSONB with a defined schema that enforces the provenance chain.
- Feature ID, linked_from, spawn_reason as required fields
- 9-stage lifecycle structure (Problem, Analysis, Requirements, Design, Implementation, Validation, Documentation, Delivery, Support)
- Three schema layers: Required (enforced) → Standard (guided) → Custom (flexible)
- Version history on every change
- Basic API for CRUD operations on feature artifacts

**2. Web App Wizard (Guided Feature Creation)**
The primary interface. A step-by-step guided experience for creating and editing feature files.
- "Click next step" flow through lifecycle stages
- Required field validation — can't skip stages that need content
- Progressive completion: start with Quick Capture (root node + problem statement), flesh out over time
- Each stage surfaces guiding questions — the wizard is a thinking partner, not a form
- Basic editing of existing feature files
- Simple search across feature files by keyword and tags

**3. Feature Tree (Linking Features to Parents)**
The structure that makes this a provenance system, not just a document store.
- Visual tree view showing feature lineage — which features spawned from which
- Spawn new feature linked to parent with reason ("born from Feature X because...")
- Completed features are frozen/immutable — evolution creates new children
- Navigate the tree to understand product evolution
- Basic tree view — not a full dashboard, just enough to see the lineage

### Out of Scope for MVP

| Feature | Why It Waits | When It Matters |
|---------|-------------|-----------------|
| **Git sync / export** | Core value is provable without repo integration. Add when devs want JSON in their IDE. | v2 — after wizard proves the concept |
| **Role-based views** | MVP has one view (the wizard). Role-specific projections come after validating that multiple roles actually use it. | v2 — after multi-role adoption |
| **AI integration** | The JSON structure is AI-ready by design. AI features are an accelerator, not a requirement for core value. | v2 — high impact but not MVP-critical |
| **Drift detection (CI/CD)** | Needs git sync first. Structural enforcement comes after the data layer proves itself. | v3 — after git sync |
| **Slack / IDE integrations** | "Surface where people are" is important but not before "the thing itself works." | v3 — adoption acceleration |
| **Progressive completion modes** | MVP has basic progressive completion in the wizard. Full Quick Capture / Standard / Deep modes can be refined. | v2 — UX refinement |
| **Informal decision capture** | Slack integration required. For MVP, decisions are captured manually in the wizard. | v3 — with Slack integration |
| **Living dashboards** | Coverage dashboards, drift detectors, product maps. Powerful but not needed to prove core value. | v2-v3 — after enough data exists |
| **Expert mode (raw JSON editing)** | Devs can query the database directly in MVP. A polished JSON editing UI comes later. | v2 — with git sync |

### MVP Success Criteria

The MVP succeeds if:

1. **It gets used.** Marc_'s team creates feature files for new features as part of their actual workflow — not as a demo or experiment.
2. **The thinking tool works.** The wizard surfaces questions that would have been missed without it. At least one "good thing we caught that" moment per feature.
3. **The tree tells a story.** Someone can look at the feature tree and understand why the product is shaped the way it is — without asking anyone.
4. **It doesn't feel like overhead.** Creating a feature file takes less than 15 minutes for a standard feature. The time invested feels justified by the clarity gained.
5. **Someone besides Marc_ finds value.** At least one PM, support person, or new hire says "this helped me."

### Future Vision

**v2 — Integration Layer (Post-MVP validation):**
- Git sync: JSON files exported to repo, devs read in IDE
- Role-based views: PM view, dev view, support view of same data
- AI layer: AI reads feature files, answers "why does this exist?", suggests content, detects drift
- Refined progressive completion: Quick Capture / Standard / Deep modes polished
- Expert mode: Raw JSON editing interface for power users

**v3 — Ecosystem (Post-adoption validation):**
- Drift detection: CI/CD checks that flag code changes without feature file updates
- Slack integration: Tag messages with feature IDs, quick decision capture
- IDE extension: Hover over code, see the feature's problem statement and decisions
- Living dashboards: Product maps, coverage metrics, onboarding guides
- PR auto-fill: PR template pulls from linked feature file automatically

**v4 — Productization (Post-methodology validation):**
- Multi-tenant SaaS: Other teams and companies can use the platform
- Team management: Permissions, collaboration, notifications
- Analytics: Usage patterns, adoption metrics, ROI tracking
- Marketplace: Custom stage profiles, industry-specific templates
- API platform: Third-party integrations, webhook automation
