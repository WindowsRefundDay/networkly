# Shadcn Conversion + UI/UX Unification

## Context

### Original Request
Convert everything to shadcn across the entire website and unify the UI/UX to look consistent with glassmorphism design and rich animations like the opportunity page.

### Interview Summary
**Key Discussions**:
- **Visual Style**: Glassmorphism everywhere - premium, modern feel using GlassCard component
- **Animation Strategy**: Rich animations using framer-motion, opportunity-card.tsx as the gold standard
- **Timeline**: Quality First - 4-6 weeks for thorough implementation
- **Documentation**: Markdown docs in docs/ folder for design system guidelines

**Research Findings**:
- 23 shadcn components exist in `components/ui/`, 27 Radix primitives installed
- 68 feature components (12,037 LOC) + 13 pages (2,908 LOC) need review
- 46 files already use framer-motion animations
- Key inconsistencies: Card vs GlassCard split, BentoGrid duplicates glass styles, 3+ loading patterns
- Animation standard: Spring stiffness 260, damping 30, entry opacity: 0, y: 24 → visible

### Self-Review (Metis Unavailable)
**Gap Analysis Applied**:
- Mobile responsiveness testing requirements added
- Dark mode verification for all glass effects added
- Accessibility (reduced motion) considerations included
- TypeScript strict mode compliance noted

---

## Work Objectives

### Core Objective
Transform Networkly into a visually consistent, premium glassmorphism design system with unified animations, spacing, and component patterns across all 81 component files and 13 pages.

### Concrete Deliverables
1. All components using GlassCard variants instead of raw Card
2. Standardized animation system with reusable variants
3. Complete shadcn component library (9 new components)
4. Unified design tokens (spacing, typography, colors)
5. Design system documentation in `docs/design-system.md`
6. Refactored admin page using shadcn components

### Definition of Done
- [ ] All 68 feature components use GlassCard or GlassContainer
- [ ] Animation variants exported from single `lib/animations.ts` file
- [ ] Zero hardcoded colors (all OKLCH variables)
- [ ] Consistent spacing (p-5/p-6 for cards, gap-4/gap-6 for grids)
- [ ] All pages visually consistent in both light and dark modes
- [ ] `bun run build` passes without new errors
- [ ] Manual visual QA on all 13 pages

### Must Have
- GlassCard usage across all feature areas
- Consistent entry/exit animations
- Unified loading state patterns
- OKLCH color system enforcement
- Design system documentation

### Must NOT Have (Guardrails)
- NO hardcoded hex/rgb colors (use OKLCH variables only)
- NO custom Card re-implementations (use GlassCard variants)
- NO inline animation definitions (use shared variants)
- NO new dependencies (use existing framer-motion, tailwindcss-animate)
- NO backend/API changes
- NO new features - only unification of existing UI
- NO removing existing functionality while refactoring

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest + React Testing Library)
- **User wants tests**: Manual QA primarily (visual consistency focus)
- **Framework**: Vitest for component smoke tests

### Manual QA Protocol
Each task includes visual verification:
1. **Light Mode Check**: Screenshot comparison
2. **Dark Mode Check**: Glass blur and opacity verification
3. **Responsive Check**: Mobile (375px), Tablet (768px), Desktop (1280px)
4. **Reduced Motion**: Verify animations respect `prefers-reduced-motion`
5. **Interaction States**: Hover, focus, active, disabled

---

## Task Flow

```
Phase 1: Foundation
  ├── 1.1 Design Tokens → 1.2 Animation System → 1.3 GlassCard Variants
  └── 1.4 Missing shadcn Components (parallel)

Phase 2: Core Components
  ├── 2.1 Card Components → 2.2 Form Components
  ├── 2.3 Navigation Components
  └── 2.4 Feedback Components (loading, badges)

Phase 3: Feature Areas
  ├── 3.1 Dashboard (parallel) ─┐
  ├── 3.2 Opportunities        ├→ 3.7 Final Integration
  ├── 3.3 Profile              │
  ├── 3.4 Projects             │
  ├── 3.5 Network              │
  └── 3.6 Admin (complex) ─────┘

Phase 4: Polish & Documentation
  ├── 4.1 Cross-cutting Consistency Pass
  ├── 4.2 Design System Docs
  └── 4.3 Final QA
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1.4, 1.1-1.3 | Missing components independent of design tokens |
| B | 3.1, 3.2, 3.3, 3.4, 3.5 | Feature areas can be refactored in parallel |
| C | 4.1, 4.2 | Consistency pass and docs can overlap |

---

## TODOs

### Phase 1: Foundation (Week 1)

- [ ] 1.1. Create Unified Design Tokens File

  **What to do**:
  - Create `lib/design-tokens.ts` with all spacing, typography, and color constants
  - Export SPACING (xs: 2, sm: 4, md: 6, lg: 8, xl: 12)
  - Export TYPOGRAPHY (heading sizes, body sizes, font weights)
  - Export COLOR_SEMANTICS mapping (success, warning, error to OKLCH)

  **Must NOT do**:
  - Don't create new colors - reference existing OKLCH variables
  - Don't override Tailwind defaults - extend them

  **Parallelizable**: YES (with 1.4)

  **References**:
  - `app/globals.css:1-138` - Existing OKLCH color definitions and glass variables
  - `lib/utils.ts` - cn() utility pattern to follow
  - `components/ui/button.tsx:20-45` - CVA pattern for variants

  **Acceptance Criteria**:
  - [ ] File created at `lib/design-tokens.ts`
  - [ ] All constants exported and typed
  - [ ] `bun run build` passes
  - [ ] Import works: `import { SPACING } from '@/lib/design-tokens'`

  **Commit**: YES
  - Message: `feat(design): add unified design tokens`
  - Files: `lib/design-tokens.ts`

---

- [ ] 1.2. Create Shared Animation Variants Library

  **What to do**:
  - Create `lib/animations.ts` exporting all reusable framer-motion variants
  - Extract patterns from `components/opportunities/opportunity-card.tsx:30-43`
  - Include: `cardSpring`, `itemVariants`, `containerVariants`, `staggerChildren`
  - Add `fadeIn`, `slideUp`, `scaleIn` utility variants

  **Must NOT do**:
  - Don't change existing opportunity animations - they are the gold standard
  - Don't add new animation patterns not already used in codebase

  **Parallelizable**: YES (with 1.4)

  **References**:
  - `components/opportunities/opportunity-card.tsx:30-43` - Gold standard spring animation
  - `components/opportunities/opportunity-list.tsx:23-45` - Container/stagger variants
  - `components/ui/glass-card.tsx:43-44` - Hover animation pattern

  **Acceptance Criteria**:
  - [ ] `lib/animations.ts` created with all variants
  - [ ] TypeScript types for all variant objects
  - [ ] Test import: `import { cardSpring, itemVariants } from '@/lib/animations'`
  - [ ] `bun run build` passes

  **Commit**: YES
  - Message: `feat(animations): create shared animation variants library`
  - Files: `lib/animations.ts`

---

- [ ] 1.3. Extend GlassCard with Additional Variants

  **What to do**:
  - Add new variants to `components/ui/glass-card.tsx`: `card` (for data display), `panel` (for side panels)
  - Add size variants: `sm`, `md`, `lg` (affecting padding)
  - Ensure all variants work with `glow` and `hover` props

  **Must NOT do**:
  - Don't remove existing variants (default, hero, sidebar, compact)
  - Don't change the noise filter or blur implementation

  **Parallelizable**: YES (with 1.4)

  **References**:
  - `components/ui/glass-card.tsx:1-66` - Current implementation
  - `components/ui/card.tsx:1-92` - Standard card structure to match
  - `components/dashboard/new/bento-grid.tsx:45-60` - Glass styles to consolidate

  **Acceptance Criteria**:
  - [ ] `card` and `panel` variants added
  - [ ] Size variants (`sm`, `md`, `lg`) working
  - [ ] All variants render correctly in light and dark mode
  - [ ] Hover animations work on all variants

  **Commit**: YES
  - Message: `feat(ui): extend GlassCard with card/panel variants and sizes`
  - Files: `components/ui/glass-card.tsx`

---

- [ ] 1.4. Add Missing shadcn Components

  **What to do**:
  - Run `bunx shadcn@latest add accordion radio-group collapsible toggle toggle-group hover-card aspect-ratio`
  - Verify each component renders correctly
  - Apply consistent styling with existing components

  **Must NOT do**:
  - Don't add navigation-menu or menubar yet (high complexity, not immediately needed)
  - Don't modify auto-generated code beyond necessary styling

  **Parallelizable**: YES (with 1.1, 1.2, 1.3)

  **References**:
  - `components.json` - shadcn configuration
  - `components/ui/dialog.tsx` - Example of existing shadcn component styling
  - `package.json:22-48` - Radix dependencies already installed

  **Acceptance Criteria**:
  - [ ] Command: `bunx shadcn@latest add accordion` - 7 components added
  - [ ] Each component file exists in `components/ui/`
  - [ ] `bun run build` passes
  - [ ] Basic render test for each component

  **Commit**: YES
  - Message: `feat(ui): add missing shadcn components (accordion, radio-group, etc.)`
  - Files: `components/ui/accordion.tsx`, `components/ui/radio-group.tsx`, etc.

---

### Phase 2: Core Component Unification (Week 2)

- [ ] 2.1. Convert Dashboard Cards to GlassCard

  **What to do**:
  - Update `components/dashboard/stats-cards.tsx` to use GlassCard
  - Update `components/dashboard/opportunity-card.tsx` to use GlassCard
  - Update `components/dashboard/suggested-connections.tsx` to use GlassCard
  - Update `components/dashboard/application-tracker.tsx` to use GlassCard
  - Update `components/dashboard/ai-assistant-preview.tsx` to use GlassCard
  - Update `components/dashboard/curated-opportunities-widget.tsx` to use GlassCard

  **Must NOT do**:
  - Don't change component logic or functionality
  - Don't modify props interfaces (backward compatible)

  **Parallelizable**: YES (with 2.2, 2.3, 2.4)

  **References**:
  - `components/ui/glass-card.tsx` - GlassCard component to use
  - `components/dashboard/*.tsx` - Files to update (6 files)
  - `components/opportunities/opportunity-card.tsx` - Animation pattern to follow

  **Acceptance Criteria**:
  - [ ] All 6 dashboard card components use GlassCard
  - [ ] Visual comparison: Cards have glass blur effect
  - [ ] Dark mode: Glass effect visible and correct
  - [ ] Hover states work correctly
  - [ ] `bun run build` passes

  **Commit**: YES
  - Message: `refactor(dashboard): convert cards to GlassCard`
  - Files: `components/dashboard/*.tsx`

---

- [ ] 2.2. Unify BentoGrid with GlassCard

  **What to do**:
  - Refactor `components/dashboard/new/bento-grid.tsx` to use GlassCard internally
  - Remove duplicate glass styles (backdrop-blur-md bg-background/40)
  - Use GlassCard variant="card" for BentoItem
  - Preserve the grid layout logic

  **Must NOT do**:
  - Don't change the responsive grid breakpoints
  - Don't modify the span/size calculations

  **Parallelizable**: YES (with 2.1, 2.3, 2.4)

  **References**:
  - `components/dashboard/new/bento-grid.tsx:1-101` - Current implementation
  - `components/ui/glass-card.tsx` - Component to integrate

  **Acceptance Criteria**:
  - [ ] BentoItem uses GlassCard internally
  - [ ] No duplicate glass CSS classes
  - [ ] Grid layout unchanged
  - [ ] Dashboard page renders correctly

  **Commit**: YES
  - Message: `refactor(dashboard): unify BentoGrid with GlassCard`
  - Files: `components/dashboard/new/bento-grid.tsx`

---

- [ ] 2.3. Standardize Loading States

  **What to do**:
  - Create `components/ui/loading.tsx` with unified loading components
  - Export: `Spinner` (Loader2 based), `CardSkeleton`, `PageSkeleton`, `TypingDots`
  - Update `components/assistant/simple-loading.tsx` to use new components
  - Find and replace all ad-hoc loading patterns

  **Must NOT do**:
  - Don't remove Loader2 usage entirely - standardize it
  - Don't change loading timing/behavior

  **Parallelizable**: YES (with 2.1, 2.2, 2.4)

  **References**:
  - `components/assistant/simple-loading.tsx:1-71` - Current custom loading
  - `components/ui/skeleton.tsx` - Existing skeleton component
  - Search: `animate-spin` and `animate-bounce` patterns across codebase

  **Acceptance Criteria**:
  - [ ] `components/ui/loading.tsx` created with 4 exports
  - [ ] All Loader2 usages consistent (size, color)
  - [ ] Custom bounce/pulse replaced with standard patterns
  - [ ] `bun run build` passes

  **Commit**: YES
  - Message: `feat(ui): create unified loading state components`
  - Files: `components/ui/loading.tsx`, updates to files using loading

---

- [ ] 2.4. Unify Badge Variants and Colors

  **What to do**:
  - Audit all Badge usage for color consistency
  - Add semantic variants to `components/ui/badge.tsx`: `success`, `warning`, `info`
  - Replace hardcoded colors (emerald-500, amber-500) with semantic variants
  - Ensure all badges use OKLCH-compatible colors

  **Must NOT do**:
  - Don't change Badge sizes (already consistent)
  - Don't remove existing variants (default, secondary, destructive, outline)

  **Parallelizable**: YES (with 2.1, 2.2, 2.3)

  **References**:
  - `components/ui/badge.tsx:1-46` - Current badge implementation
  - `components/opportunities/opportunity-card.tsx:94-105` - Badge usage patterns
  - Search: `Badge className=` for all usages

  **Acceptance Criteria**:
  - [ ] `success`, `warning`, `info` variants added to badge.tsx
  - [ ] All emerald-500/amber-500 usages replaced with semantic variants
  - [ ] TypeScript: BadgeVariants type updated
  - [ ] Visual: All badges consistent across features

  **Commit**: YES
  - Message: `feat(ui): add semantic badge variants (success, warning, info)`
  - Files: `components/ui/badge.tsx`, updates to badge usages

---

### Phase 3: Feature Area Conversion (Weeks 2-4)

- [ ] 3.1. Convert Analytics Components

  **What to do**:
  - Update all 7 files in `components/analytics/` to use GlassCard
  - Apply consistent card header styling
  - Ensure chart components work within glass containers

  **Must NOT do**:
  - Don't modify Recharts configurations
  - Don't change data fetching logic

  **Parallelizable**: YES (with 3.2, 3.3, 3.4, 3.5)

  **References**:
  - `components/analytics/*.tsx` - 7 files to update
  - `components/ui/glass-card.tsx` - Component to use

  **Acceptance Criteria**:
  - [ ] All 7 analytics components use GlassCard
  - [ ] Charts render correctly within glass containers
  - [ ] Dark mode: Charts visible and readable
  - [ ] Hover states consistent

  **Commit**: YES
  - Message: `refactor(analytics): convert to GlassCard`
  - Files: `components/analytics/*.tsx`

---

- [ ] 3.2. Convert Profile Components

  **What to do**:
  - Update all 8 files in `components/profile/` to use GlassCard
  - Update all 6 dialog files in `components/profile/dialogs/`
  - Apply consistent section spacing (space-y-6)
  - Ensure profile header gradient works with glass

  **Must NOT do**:
  - Don't change profile data structure
  - Don't modify dialog behavior

  **Parallelizable**: YES (with 3.1, 3.3, 3.4, 3.5)

  **References**:
  - `components/profile/*.tsx` - 8 section files
  - `components/profile/dialogs/*.tsx` - 6 dialog files
  - `components/profile/profile-header.tsx:125-130` - Gradient header pattern

  **Acceptance Criteria**:
  - [ ] All 14 profile components use GlassCard where applicable
  - [ ] Dialogs use consistent styling
  - [ ] Profile page visually consistent
  - [ ] Edit flows unchanged

  **Commit**: YES
  - Message: `refactor(profile): convert to GlassCard`
  - Files: `components/profile/**/*.tsx`

---

- [ ] 3.3. Convert Network Components

  **What to do**:
  - Update `components/network/connection-card.tsx` to use GlassCard
  - Update `components/network/messages-panel.tsx` to use GlassCard
  - Update `components/network/network-stats.tsx` to use GlassCard
  - Apply consistent card animations

  **Must NOT do**:
  - Don't change connection logic
  - Don't modify message handling

  **Parallelizable**: YES (with 3.1, 3.2, 3.4, 3.5)

  **References**:
  - `components/network/*.tsx` - 3 files to update

  **Acceptance Criteria**:
  - [ ] All 3 network components use GlassCard
  - [ ] Connection cards have consistent hover states
  - [ ] Message panel scrolling works correctly

  **Commit**: YES
  - Message: `refactor(network): convert to GlassCard`
  - Files: `components/network/*.tsx`

---

- [ ] 3.4. Convert Project Components

  **What to do**:
  - Update all 5 files in `components/projects/` to use GlassCard
  - Ensure project modals use consistent Dialog + GlassCard styling
  - Apply consistent button placement in cards

  **Must NOT do**:
  - Don't change project CRUD logic
  - Don't modify modal state management

  **Parallelizable**: YES (with 3.1, 3.2, 3.3, 3.5)

  **References**:
  - `components/projects/*.tsx` - 5 files to update

  **Acceptance Criteria**:
  - [ ] All 5 project components use GlassCard
  - [ ] Create/Edit modals consistent with profile dialogs
  - [ ] Project cards have consistent animations

  **Commit**: YES
  - Message: `refactor(projects): convert to GlassCard`
  - Files: `components/projects/*.tsx`

---

- [ ] 3.5. Convert Discovery Components

  **What to do**:
  - Update all 6 files in `components/discovery/` to use GlassCard where appropriate
  - Preserve complex animation sequences (these are intentional)
  - Refactor `layer-accordion.tsx` to use new shadcn Accordion component
  - Ensure discovery overlays use consistent glass styling

  **Must NOT do**:
  - Don't change SSE/streaming logic
  - Don't modify layer state machine
  - Don't remove custom animations (they're intentional for real-time UX)

  **Parallelizable**: YES (with 3.1, 3.2, 3.3, 3.4)

  **References**:
  - `components/discovery/*.tsx` - 6 files to update
  - `components/ui/accordion.tsx` - New accordion component (from 1.4)
  - `components/discovery/layer-accordion.tsx:1-328` - Complex refactor

  **Acceptance Criteria**:
  - [ ] LayerAccordion uses shadcn Accordion base
  - [ ] Discovery overlays use GlassCard variant="hero"
  - [ ] Real-time animations preserved
  - [ ] All discovery flows functional

  **Commit**: YES
  - Message: `refactor(discovery): convert to GlassCard and shadcn Accordion`
  - Files: `components/discovery/*.tsx`

---

- [ ] 3.6. Complete Admin Page Rewrite

  **What to do**:
  - Completely rewrite `app/admin/page.tsx` (430 lines) using shadcn components
  - Replace raw `<table>` with shadcn Table component (add if needed)
  - Replace raw `<button>` with shadcn Button
  - Replace inline `style={{}}` with Tailwind classes
  - Use GlassCard for all sections
  - Apply consistent form patterns

  **Must NOT do**:
  - Don't change admin functionality
  - Don't modify admin-only access control

  **Parallelizable**: NO (depends on 1.1-1.4, can start after Phase 1)

  **References**:
  - `app/admin/page.tsx:1-430` - Current implementation (complete rewrite)
  - `app/settings/page.tsx` - Example of good shadcn usage pattern
  - `bunx shadcn@latest add table` - May need to add table component

  **Acceptance Criteria**:
  - [ ] Zero raw HTML elements (`<table>`, `<button>`, `<input>`)
  - [ ] Zero inline style={{}} objects
  - [ ] All sections use GlassCard
  - [ ] Admin functionality preserved
  - [ ] Responsive layout works

  **Commit**: YES
  - Message: `refactor(admin): complete rewrite with shadcn components`
  - Files: `app/admin/page.tsx`

---

- [ ] 3.7. Update Page-Level Layouts

  **What to do**:
  - Update `app/opportunities/page.tsx` with consistent animations (already good, minor tweaks)
  - Update `app/settings/page.tsx` to use GlassCard for sections
  - Update `app/projects/page.tsx` with consistent patterns
  - Update `app/network/page.tsx` with consistent patterns
  - Update `app/page.tsx` (landing) with GlassCard and proper typography

  **Must NOT do**:
  - Don't change page routing
  - Don't modify data fetching patterns

  **Parallelizable**: NO (should be done after component updates)

  **References**:
  - `app/*/page.tsx` - All page files
  - `app/opportunities/page.tsx` - Reference for animation patterns

  **Acceptance Criteria**:
  - [ ] All pages use consistent section spacing
  - [ ] All pages have entry animations
  - [ ] Landing page uses GlassCard prominently
  - [ ] Settings sections use GlassCard

  **Commit**: YES
  - Message: `refactor(pages): unify page layouts with GlassCard`
  - Files: `app/*/page.tsx`

---

### Phase 4: Polish & Documentation (Week 5-6)

- [ ] 4.1. Cross-Cutting Consistency Pass

  **What to do**:
  - Audit all 81 component files for remaining inconsistencies
  - Fix spacing inconsistencies (standardize to p-5/p-6 for cards)
  - Fix typography inconsistencies (heading hierarchies)
  - Ensure all buttons use consistent sizing patterns
  - Remove any remaining hardcoded colors

  **Must NOT do**:
  - Don't introduce new patterns not established in earlier phases
  - Don't change functionality

  **Parallelizable**: YES (with 4.2)

  **References**:
  - All component files
  - `lib/design-tokens.ts` - Token standards from 1.1

  **Acceptance Criteria**:
  - [ ] Grep for hardcoded colors returns zero results
  - [ ] All cards use consistent padding
  - [ ] Typography hierarchy consistent across features

  **Commit**: YES
  - Message: `style: cross-cutting consistency pass`
  - Files: Various

---

- [ ] 4.2. Create Design System Documentation

  **What to do**:
  - Create `docs/design-system.md` with complete design system guide
  - Document: Color system, Typography, Spacing, Components, Animations
  - Include code examples for each pattern
  - Add decision rationale (why glassmorphism, why these animations)

  **Must NOT do**:
  - Don't create Storybook (explicitly deferred)
  - Don't document components not in use

  **Parallelizable**: YES (with 4.1)

  **References**:
  - `app/globals.css` - Color variables
  - `lib/design-tokens.ts` - Token definitions
  - `lib/animations.ts` - Animation variants
  - `components/ui/glass-card.tsx` - GlassCard variants

  **Acceptance Criteria**:
  - [ ] `docs/design-system.md` created (500+ lines)
  - [ ] All color variables documented with use cases
  - [ ] All GlassCard variants with examples
  - [ ] Animation patterns with code snippets
  - [ ] "Do" and "Don't" examples included

  **Commit**: YES
  - Message: `docs: create design system documentation`
  - Files: `docs/design-system.md`

---

- [ ] 4.3. Final Visual QA Pass

  **What to do**:
  - Test all 13 pages in light mode
  - Test all 13 pages in dark mode
  - Test responsive layouts (375px, 768px, 1280px)
  - Test with prefers-reduced-motion enabled
  - Document any remaining issues

  **Must NOT do**:
  - Don't add new features during QA
  - Don't change animations based on personal preference (follow established patterns)

  **Parallelizable**: NO (final step)

  **References**:
  - All app pages
  - Browser DevTools for responsive testing

  **Acceptance Criteria**:
  - [ ] All pages render correctly in light mode
  - [ ] All pages render correctly in dark mode (glass visible)
  - [ ] All pages responsive at 3 breakpoints
  - [ ] Animations respect reduced-motion
  - [ ] No visual regressions documented
  - [ ] `bun run build` passes

  **Commit**: YES (if fixes needed)
  - Message: `fix: visual QA fixes`
  - Files: Various

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1.1 | `feat(design): add unified design tokens` | lib/design-tokens.ts | bun run build |
| 1.2 | `feat(animations): create shared animation variants` | lib/animations.ts | bun run build |
| 1.3 | `feat(ui): extend GlassCard variants` | components/ui/glass-card.tsx | bun run build |
| 1.4 | `feat(ui): add missing shadcn components` | components/ui/*.tsx | bun run build |
| 2.1-2.4 | `refactor(ui): unify core components` | components/*.tsx | bun run build |
| 3.1-3.5 | `refactor(feature): convert to GlassCard` | Per feature | bun run build |
| 3.6 | `refactor(admin): complete rewrite` | app/admin/page.tsx | bun run build |
| 3.7 | `refactor(pages): unify layouts` | app/*/page.tsx | bun run build |
| 4.1 | `style: consistency pass` | Various | bun run build |
| 4.2 | `docs: design system` | docs/design-system.md | N/A |
| 4.3 | `fix: visual QA` | Various | bun run build |

---

## Success Criteria

### Verification Commands
```bash
# Build passes
bun run build  # Expected: Build successful

# No hardcoded colors
grep -r "bg-\(red\|blue\|green\|emerald\|amber\)-[0-9]" components/  # Expected: No matches

# GlassCard usage
grep -r "GlassCard" components/ | wc -l  # Expected: 50+ usages
```

### Final Checklist
- [ ] All "Must Have" present (GlassCard everywhere, unified animations, OKLCH colors)
- [ ] All "Must NOT Have" absent (no hardcoded colors, no duplicate glass styles)
- [ ] All 13 pages visually consistent
- [ ] Dark mode fully functional
- [ ] Documentation complete
- [ ] Build passes without new errors

---

## Time Estimates

| Phase | Tasks | Estimated Hours |
|-------|-------|-----------------|
| Phase 1: Foundation | 1.1-1.4 | 12-16 |
| Phase 2: Core Components | 2.1-2.4 | 16-20 |
| Phase 3: Feature Areas | 3.1-3.7 | 60-80 |
| Phase 4: Polish & Docs | 4.1-4.3 | 20-25 |
| **Total** | **17 tasks** | **108-141 hours** |

**Timeline**: 4-6 weeks at ~25 hours/week
