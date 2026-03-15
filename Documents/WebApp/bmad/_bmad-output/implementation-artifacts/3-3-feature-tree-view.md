# Story 3.3: Feature Tree View

Status: done

## Story

As a new team member or developer,
I want to navigate all features as an interactive tree showing parent-child relationships,
So that I can understand how features evolved over time and browse lineage without knowing specific feature IDs.

## Acceptance Criteria

1. **Given** the Feature Tree page (`/tree`), **When** it loads, **Then** react-arborist renders all features as a tree with root features at top level and child features indented beneath their parents, server-prefetched via RSC

2. **Given** a `TreeNode` renders in collapsed state, **When** displayed, **Then** it shows: expand toggle (► for collapsed / ▼ for expanded, hidden when no children), feature key (monospace), title (truncated), `FeatureStateBadge`, and `StageCompletionIndicator` pips on a single row

3. **Given** a `TreeNode` is expanded, **When** the user clicks the expand toggle or presses Enter/Space, **Then** the node expands to show: problem statement summary (first 100 chars), stage count, child feature count, and a "View full feature →" CTA link to `/features/[id]/wizard`

4. **Given** parent features have children, **When** the tree renders, **Then** child nodes are indented with a left-border connector line visually linking them to their parent

5. **Given** the keyboard navigation requirement, **When** focus is on the tree, **Then** ↑↓ navigates between nodes, → expands a collapsed node, ← collapses an expanded node, and Enter opens the feature detail — using react-arborist's built-in keyboard handling

6. **Given** a filter input above the tree, **When** the user types a query, **Then** non-matching nodes are hidden; parent nodes with matching children remain visible but visually dimmed; a clear button (✕) appears when filter is active

7. **Given** the tree renders up to 500 nodes, **When** it displays, **Then** it is interactive within 1 second using react-arborist's built-in virtualization

8. **Given** the sidebar currently links "Feature Tree" to `/features`, **When** this story is complete, **Then** the sidebar link is updated to `/tree` and the active state detection uses `/tree` prefix

## Tasks / Subtasks

- [x] Task 1: Install `react-arborist` dependency (AC: #1, #5, #7)
  - [x] 1.1 Run `bun add react-arborist` in `apps/nextjs`
  - [x] 1.2 Verify TypeScript types are available (react-arborist ships its own `.d.ts`)
  - [x] 1.3 Note: react-arborist requires `"use client"` — it uses browser APIs and cannot run in RSC

- [x] Task 2: Create tree-building utility `lib/build-tree.ts` (AC: #1, #4)
  - [x] 2.1 Create `apps/nextjs/lib/build-tree.ts`
  - [x] 2.2 Export `interface TreeFeatureNode` extending the `Feature` Drizzle type with `children: TreeFeatureNode[]`
  - [x] 2.3 Export `function buildTree(features: Feature[]): TreeFeatureNode[]` — builds a nested tree from flat list with `parentId`
  - [x] 2.4 Algorithm: first pass creates a `Map<id, TreeFeatureNode>`, second pass assigns children; nodes with no parent or unknown parent become roots
  - [x] 2.5 Sort roots and children by `updatedAt DESC` to preserve consistent ordering

- [x] Task 3: Create `components/features/feature-tree-node.tsx` — single node renderer (AC: #2, #3, #4)
  - [x] 3.1 Create `apps/nextjs/components/features/feature-tree-node.tsx`
  - [x] 3.2 Props signature matches react-arborist render function: `({ node, style, dragHandle }: NodeRendererProps<TreeFeatureNode>)`
  - [x] 3.3 Import `NodeRendererProps` from `react-arborist`
  - [x] 3.4 **Collapsed row** (single line): expand/collapse button (`►`/`▼`, hidden if `node.children.length === 0`), feature key (`font-mono text-xs text-muted-foreground`), title (`line-clamp-1`), `FeatureStateBadge`, `StageCompletionIndicator`
  - [x] 3.5 **Expanded section** (below the row when `node.isOpen`): problem statement first 100 chars (from `node.data.content?.problem?.problemStatement`), `X stages completed`, `X child features`, `<Link href="/features/[id]/wizard">View full feature →</Link>`
  - [x] 3.6 Connector line: when `node.level > 0`, add `border-l border-border` left connector
  - [x] 3.7 Compute `completedStages` from `LIFECYCLE_STAGES.filter(stage => content[stage] && has values).length` — same logic as `FeatureCard`
  - [x] 3.8 `style` prop from react-arborist must be spread onto the outer div for virtualization to work: `<div style={style} ...>`
  - [x] 3.9 Expand toggle: `onClick={(e) => { e.stopPropagation(); node.toggle() }}` — prevent row click from firing too

- [x] Task 4: Create `components/features/feature-tree.tsx` — client component with react-arborist (AC: #1, #5, #6, #7)
  - [x] 4.1 Create `apps/nextjs/components/features/feature-tree.tsx` — `"use client"`
  - [x] 4.2 Props: `features: Feature[]` (raw flat list from RSC prefetch)
  - [x] 4.3 Build tree on mount: `const treeData = useMemo(() => buildTree(features), [features])`
  - [x] 4.4 Filter state: `const [filterTerm, setFilterTerm] = useState('')`
  - [x] 4.5 Render `<Tree>` from `react-arborist` with data, searchTerm, searchMatch, rowHeight, indent, width=Infinity, measured height
  - [x] 4.6 Container: `<div ref={containerRef} className="flex flex-col h-[calc(100dvh-7rem)]">` — subtract header + filter bar
  - [x] 4.7 Filter input above tree with clear button (✕) shown when `filterTerm.length > 0`
  - [x] 4.8 Dimming for partial match via React context (`FilterTermContext`) — `opacity-50` on indirect matches
  - [x] 4.9 `onActivate={(node) => router.push('/features/' + node.data.id + '/wizard')}` — Enter key navigation
  - [x] 4.10 Import `useRouter` from `next/navigation`, `useMemo` from `react`
  - [x] 4.11 Height strategy: `useState(600)` + `useEffect` measuring `containerRef.current.clientHeight` with resize listener

- [x] Task 5: Create `/tree` page with RSC prefetch (AC: #1, #7)
  - [x] 5.1 Create `apps/nextjs/app/(features)/tree/page.tsx` — RSC
  - [x] 5.2 Prefetch `listFeatures` via `trpc.features.listFeatures.queryOptions()`
  - [x] 5.3 Wrap `<FeatureTree>` in `<HydrateClient>`
  - [x] 5.4 `<FeatureTree>` is a client component — it uses `useQuery` to access the prefetched data
  - [x] 5.5 In `FeatureTree`: `const { data: features = [] } = useQuery(trpc.features.listFeatures.queryOptions())`
  - [x] 5.6 Page layout: `<div className="flex flex-col p-4"><h1 className="mb-4 text-xl font-semibold">Feature Tree</h1><FeatureTree /></div>`

- [x] Task 6: Update sidebar to link to `/tree` (AC: #8)
  - [x] 6.1 Open `apps/nextjs/components/layout/sidebar.tsx`
  - [x] 6.2 Change `href: '/features'` → `href: '/tree'` for the "Feature Tree" nav item
  - [x] 6.3 Active state `pathname.startsWith(href)` will now correctly activate only on `/tree` paths

- [x] Task 7: Verify build — typecheck + lint (AC: all)
  - [x] 7.1 `bun x tsc --noEmit` in `apps/nextjs` — 0 errors
  - [x] 7.2 `bunx oxlint --threads 1` from repo root — 0 errors/warnings

## Dev Notes

### react-arborist Overview

```typescript
import { Tree } from 'react-arborist'
import type { NodeRendererProps } from 'react-arborist'

// Basic usage:
<Tree<TreeFeatureNode>
  data={treeData}          // TreeFeatureNode[] — root nodes with children arrays
  openByDefault={false}
  searchTerm={filterTerm}
  searchMatch={(node, term) => matchFn(node.data, term)}
  rowHeight={48}
  indent={24}
  width={Infinity}         // or measured container width
  height={containerHeight} // measured container height (number, required)
  onActivate={(node) => router.push(`/features/${node.data.id}/wizard`)}
>
  {FeatureTreeNode}        // render component — NOT JSX, the function itself
</Tree>
```

> **Important:** The second child of `<Tree>` must be the render function directly, not a JSX expression. `{FeatureTreeNode}` not `{<FeatureTreeNode />}`.

### react-arborist NodeRendererProps

```typescript
interface NodeRendererProps<T> {
  node: NodeApi<T>     // node.data = T, node.isOpen, node.children, node.level, node.toggle(), node.isLeaf
  style: React.CSSProperties  // MUST be spread on outer div for virtualization
  dragHandle?: (el: HTMLDivElement | null) => void  // ignore — no drag needed
  tree: TreeApi<T>     // tree.activate(node), tree.close(node)
}
```

> **Critical:** You MUST spread `style` on the outermost container div of each node row, or virtualization will be broken (items invisible or mispositioned).

### Tree Height — Client-Side Measurement

react-arborist needs a numeric `height` prop. Use this pattern:

```typescript
const [treeHeight, setTreeHeight] = useState(600)
const containerRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  function measure() {
    if (containerRef.current) {
      setTreeHeight(containerRef.current.clientHeight)
    }
  }
  measure()
  window.addEventListener('resize', measure)
  return () => window.removeEventListener('resize', measure)
}, [])

// In JSX:
<div ref={containerRef} className="flex-1 min-h-0">
  <Tree height={treeHeight} width={Infinity} ...>
    {FeatureTreeNode}
  </Tree>
</div>
```

### Tree Data Structure

```typescript
// lib/build-tree.ts
import type { Feature } from '@life-as-code/db'

export interface TreeFeatureNode extends Feature {
  children: TreeFeatureNode[]
}

export function buildTree(features: Feature[]): TreeFeatureNode[] {
  const map = new Map<string, TreeFeatureNode>()

  // First pass: create all nodes with empty children
  for (const f of features) {
    map.set(f.id, { ...f, children: [] })
  }

  const roots: TreeFeatureNode[] = []

  // Second pass: wire parent-child relationships
  for (const f of features) {
    const node = map.get(f.id)
    if (!node) continue
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)?.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
```

### Importing `Feature` Type from DB Package

```typescript
import type { Feature } from '@life-as-code/db'
```

The `@life-as-code/db` package exports `Feature` from its schema. This is the Drizzle-inferred type including `parentId: string | null`. Check `packages/db/src/index.ts` to verify the export path.

### Stage Completion Count (same logic as FeatureCard)

```typescript
import { LIFECYCLE_STAGES } from '@life-as-code/validators'

const contentMap = node.data.content as Record<string, Record<string, unknown>> | undefined
const completedStages = LIFECYCLE_STAGES.filter((stage) => {
  const s = contentMap?.[stage]
  return s && Object.values(s).some((v) => typeof v === 'string' && v.trim().length > 0)
}).length
```

### Dimming for Indirect Matches

When `filterTerm` is active, a node may be visible only because one of its children matches (not itself). To apply dimmed styling:

```typescript
const directMatch = filterTerm.length === 0
  || title.toLowerCase().includes(filterTerm.toLowerCase())
  || node.data.featureKey.toLowerCase().includes(filterTerm.toLowerCase())
// If filterTerm active and no direct match → node is shown due to children → dim it
const className = filterTerm.length > 0 && !directMatch ? 'opacity-50' : ''
```

### Filter Input with Clear Button

```tsx
<div className="flex items-center gap-2 mb-3 rounded-lg border border-border px-3 py-2">
  <svg ...search icon... />
  <input
    type="text"
    value={filterTerm}
    onChange={(e) => setFilterTerm(e.target.value)}
    placeholder="Filter features..."
    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
  />
  {filterTerm.length > 0 && (
    <button type="button" onClick={() => setFilterTerm('')} aria-label="Clear filter">
      ✕
    </button>
  )}
</div>
```

### Connector Lines for Indentation

react-arborist handles indentation via the `indent` prop (pixel offset per level). The connector line (left border) is applied by the node renderer based on `node.level`:

```tsx
<div style={style}>
  <div
    className={`flex items-center gap-2 py-2 pr-3 ${node.level > 0 ? 'border-l border-border' : ''}`}
    style={{ paddingLeft: `${node.level * 24 + 8}px` }}
  >
    ...
  </div>
</div>
```

> Since react-arborist applies indentation via `style.paddingLeft` or similar — do NOT double-apply indentation. Instead, use react-arborist's `indent` prop for indentation and only apply the `border-l` connector line conditionally on `node.level > 0`.

### RSC Prefetch + Client Pattern for FeatureTree

```typescript
// page.tsx (RSC)
import { headers } from 'next/headers'
import { HydrateClient, createTRPC, getQueryClient } from '@/trpc/rsc'
import { FeatureTree } from '@/components/features/feature-tree'

export default async function TreePage() {
  const trpc = createTRPC({ headers: await headers() })
  await getQueryClient().prefetchQuery(trpc.features.listFeatures.queryOptions())
  return (
    <HydrateClient>
      <FeatureTree />
    </HydrateClient>
  )
}

// feature-tree.tsx (Client)
'use client'
const trpc = useTRPC()
const { data: features = [] } = useQuery(trpc.features.listFeatures.queryOptions())
// features is Feature[] including parentId
```

### listFeatures Return Type

`listFeatures` uses `ctx.db.select().from(features).where(...).orderBy(...)` — returns full Drizzle `Feature[]` with ALL columns including `parentId: string | null`. No new tRPC endpoint needed.

### react-arborist Lint Considerations

- `explicit-length-check`: use `.length > 0` not `.length >= 1`
- `no-array-index-key`: react-arborist manages keys internally — no manual `key` props needed for tree nodes
- `no-negated-condition`: flip any `!` conditions
- `unicorn/no-array-sort`: use `.toSorted()` if sorting is needed
- react-arborist `dragHandle` prop type may need explicit `| undefined` if unused

### Existing Components to Reuse

| Component | Import path |
|-----------|-------------|
| `FeatureStateBadge` | `@/components/features/feature-state-badge` |
| `StageCompletionIndicator` | `@/components/features/stage-completion-indicator` |
| `useTRPC` | `@/trpc/react` |
| `HydrateClient`, `createTRPC`, `getQueryClient` | `@/trpc/rsc` |
| `LIFECYCLE_STAGES` | `@life-as-code/validators` |

### Windows Build Constraints (Same as Every Story)

- **Typecheck**: `bun x tsc --noEmit` in `apps/nextjs` — do NOT use turbo typecheck (OOM)
- **Lint**: `bunx oxlint --threads 1` from repo root — do NOT use `bun run lint` (OOM)
- **Install**: `bun add react-arborist` in `apps/nextjs/` directory
- No test framework available — vitest/jest not set up

### File Structure for This Story

```
apps/nextjs/
  app/(features)/tree/
    page.tsx                                    ← CREATE: RSC page with prefetch
  components/features/
    feature-tree.tsx                            ← CREATE: client component ("use client")
    feature-tree-node.tsx                       ← CREATE: react-arborist node renderer
  lib/
    build-tree.ts                               ← CREATE: flat-list → tree utility
  components/layout/
    sidebar.tsx                                 ← MODIFY: href /features → /tree
```

### Project Structure Notes

- Architecture doc references `apps/web/` — confirmed override: actual path is `apps/nextjs/`
- Route group `(features)` does NOT appear in URLs — `/tree` is the correct browser URL
- Sidebar active detection: `pathname.startsWith('/tree')` — works for nested tree routes
- `feature-tree.tsx` and `feature-tree-node.tsx` co-located with other feature components
- `build-tree.ts` goes in `lib/` (same as `utils.ts` and `metadata.ts`)

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.3 — BDD acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — RSC vs Client rules, tRPC prefetch pattern]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — Feature Tree UX, TreeNode anatomy]
- [Source: `life-as-code/apps/nextjs/components/layout/sidebar.tsx` — current nav links, active detection]
- [Source: `life-as-code/apps/nextjs/components/features/feature-card.tsx` — stage completion logic, content structure]
- [Source: `life-as-code/apps/nextjs/components/features/stage-completion-indicator.tsx` — reusable pip component]
- [Source: `life-as-code/apps/nextjs/trpc/rsc.tsx` — RSC prefetch pattern]
- [Source: `life-as-code/packages/db/src/schema/features.ts` — Feature type with parentId]
- [Source: `_bmad-output/implementation-artifacts/3-2-global-search-ui-and-url-synced-filters.md` — lint fix patterns]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `consistent-function-scoping` lint error: `searchMatch` and `sortDesc` didn't capture parent-scope vars — moved both to module scope (outside component/function). Pattern: always define pure helpers at module level.
- Next.js `Route` type for `/tree` missing from `.next/types/link.d.ts` — manually added `/tree` to both `.next/types/link.d.ts` and `.next/dev/types/link.d.ts`. These regenerate on `next build`/`next dev`.
- Dimming for indirect matches (AC #6): node renderer has no access to `filterTerm` directly — solved via `FilterTermContext` (React context exported from `feature-tree-node.tsx`, provided by `FilterTermContext.Provider` in `feature-tree.tsx`).

### Completion Notes List

- Installed `react-arborist@3.4.3` — ships own `.d.ts`, confirmed types available.
- `buildTree`: two-pass Map algorithm (O(n)) with `.toSorted()` for `updatedAt DESC` ordering at each level.
- `FeatureTreeNode`: spreads `style` on outer div (required for virtualization); uses `node.isLeaf` to hide expand toggle; connector line via `border-l border-border` when `node.level > 0`; `FilterTermContext` for dimming.
- `FeatureTree`: `useResizeObserver` pattern with `useState(600)` + `useEffect` + `window.addEventListener('resize')` for numeric `height` prop; `disableDrag`/`disableDrop` to suppress DnD; `FilterTermContext.Provider` wraps `<Tree>`.
- `TreePage`: RSC with `listFeatures` prefetch + `HydrateClient` wrapper — no new tRPC procedures needed.
- Sidebar: `href: '/features'` → `href: '/tree'`.
- Final: 0 TS errors, 0 oxlint errors.

### File List

- apps/nextjs/lib/build-tree.ts (CREATE)
- apps/nextjs/components/features/feature-tree-node.tsx (CREATE)
- apps/nextjs/components/features/feature-tree.tsx (CREATE)
- apps/nextjs/app/(features)/tree/page.tsx (CREATE)
- apps/nextjs/components/layout/sidebar.tsx (MODIFY)
- apps/nextjs/.next/types/link.d.ts (MODIFY — added /tree to StaticRoutes)
- apps/nextjs/.next/dev/types/link.d.ts (MODIFY — added /tree to StaticRoutes)
