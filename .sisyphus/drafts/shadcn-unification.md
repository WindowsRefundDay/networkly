# Draft: Shadcn Conversion + UI/UX Unification

## Requirements (confirmed)
- **Visual Style**: Glassmorphism everywhere - premium, modern feel
- **Animation Strategy**: Rich animations - keep framer-motion, use opportunity page animations as the gold standard
- **Timeline**: Quality First - 4-6 weeks
- **Documentation**: Markdown docs in docs/ folder

## Technical Decisions
- **Design System Base**: GlassCard component with variants (default, hero, sidebar, compact)
- **Animation Standard**: Spring animations with stiffness: 260, damping: 30 (from OpportunityCard)
- **Entry Animation**: opacity: 0, y: 24 → opacity: 1, y: 0 with staggerChildren: 0.05
- **Hover States**: whileHover={{ scale: 1.01, y: -2 }} with ease: [0.23, 1, 0.32, 1]
- **Color System**: OKLCH variables only - no hardcoded colors

## Research Findings

### Current State
- 23 shadcn components exist in components/ui/
- 68 feature components (12,037 LOC total)
- 13 pages (2,908 LOC total)
- 27 Radix primitives installed but only 23 implemented
- 46 files use framer-motion animations

### Key Inconsistencies Found
1. **Card Usage Split**: GlassCard used in Profile/Search, but regular Card everywhere else
2. **BentoGrid Drift**: Manually re-implements glass styles instead of using GlassCard
3. **Loading States**: 3+ different patterns (Skeleton, custom animate-bounce, Loader2 spinner)
4. **Button Styling**: Inconsistent use of bg-transparent in outline variants
5. **Badge Colors**: Mix of semantic colors (emerald, amber) vs theme colors
6. **Spacing**: Inconsistent (p-4 vs p-5 vs p-6 for similar cards)

### Animation Gold Standard (from opportunity-card.tsx)
```typescript
const cardSpring = {
  type: "spring",
  stiffness: 260,
  damping: 30,
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: cardSpring,
  },
}
```

### GlassCard Variants Available
- default: backdrop-blur-md bg-background/40 border-border/20
- hero: backdrop-blur-lg bg-background/30 border-border/10
- sidebar: backdrop-blur-xl bg-background/60 border-border/25
- compact: backdrop-blur-sm bg-background/50 border-border/30

## Scope Boundaries

### INCLUDE
- Convert all Card to GlassCard where appropriate
- Standardize animation patterns across all components
- Create missing shadcn components (Accordion, RadioGroup, etc.)
- Refactor admin page to use shadcn
- Create design system documentation
- Unify spacing, typography, colors
- Create reusable animation variants

### EXCLUDE
- Backend/API changes
- Database schema changes
- Authentication flow changes
- New features (only unify existing)
- Performance optimization (separate effort)

## Open Questions
- [RESOLVED] Animation standard: Use opportunity page patterns
- [RESOLVED] Glass vs Solid: Glassmorphism everywhere
