# AI Assistant Page UI/UX Polish

## TL;DR

> **Quick Summary**: Refactor the AI assistant page to match the polished, premium aesthetic of the rest of the Networkly app. Apply GlassCard styling, subtle framer-motion animations, and hero-style empty state while preserving all API/hook logic untouched.
> 
> **Deliverables**:
> - Polished ChatInterface with glass container and animated messages
> - Hero empty state with gradient background and staggered prompts
> - Glass-styled AI message bubbles with entrance animations
> - Animated OpportunityCardInline matching main opportunity cards
> - Premium loading states with pulse/glow effects
> - Refined AIToolsSidebar with GlassCard sections
> 
> **Estimated Effort**: Medium (8-12 focused tasks)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (shared animations) -> Tasks 2-6 (components) -> Tasks 7-8 (integration)

---

## Context

### Original Request
"Refactor the entire AI assistant page - make it more polished. Keep underlying APIs the same, don't touch them."

### Interview Summary
**Key Discussions**:
- Animation intensity: Subtle (4-8px offsets, 200-300ms durations)
- Message styling: User = solid primary, AI = glass effect with blur
- Empty state: Hero treatment with gradient mesh and staggered animations
- Test strategy: Manual QA + lsp_diagnostics (no Playwright automation)
- Mobile sidebar: Keep hidden (current behavior acceptable)

**Research Findings**:
- GlassCard component at `components/ui/glass-card.tsx` provides noise texture + blur variants
- OpportunityCard at `components/opportunities/opportunity-card.tsx` has reference animations
- Design tokens in globals.css: `--ease-premium`, `--glass-blur-*`, `--duration-*`
- Existing test for markdown-message.tsx must not break

### Metis Review (Gaps Addressed)
- **Reduced motion support**: Added `prefers-reduced-motion` consideration
- **Import order**: Ensured consistent import patterns per AGENTS.md
- **TypeScript safety**: All animation configs properly typed
- **Rollback strategy**: Checkpoint after each component group

---

## Work Objectives

### Core Objective
Transform the AI assistant page from functional-but-basic to premium-polished, matching the visual quality of the opportunities page and dashboard components.

### Concrete Deliverables
- `components/assistant/chat-interface.tsx` - Polished with GlassCard, animations
- `components/assistant/simple-loading.tsx` - Premium loading states
- `components/assistant/opportunity-card-inline.tsx` - Framer-motion animations
- `components/assistant/ai-tools-sidebar.tsx` - GlassCard sections, hover effects
- `components/assistant/action-buttons.tsx` - Glass styling, micro-interactions
- `components/assistant/markdown-message.tsx` - Minor polish (preserve tests)
- `app/assistant/page.tsx` - Layout refinements if needed

### Definition of Done
- [ ] All assistant components use consistent animation system
- [ ] AI messages have glass effect, user messages keep solid primary
- [ ] Empty state has hero treatment with staggered prompt reveal
- [ ] Loading states have premium pulse/glow effects
- [ ] `pnpm test` passes (markdown-message tests intact)
- [ ] `lsp_diagnostics` shows no new errors in assistant components
- [ ] Visual verification in browser at localhost:3000/assistant

### Must Have
- GlassCard integration for main containers
- Framer-motion entrance animations on messages
- Subtle hover effects on interactive elements
- Premium easing curve `[0.23, 1, 0.32, 1]`
- OKLCH colors from design system (no hardcoded hex)

### Must NOT Have (Guardrails)
- NO changes to API fetch logic, useInlineDiscovery hook internals, or server actions
- NO changes to message streaming logic or WebSocket handling
- NO changes to opportunity data structures or cache logic
- NO new npm dependencies (framer-motion already installed)
- NO mobile sidebar drawer (explicitly out of scope)
- NO breaking changes to markdown-message.tsx that fail existing tests
- NO `as any`, `@ts-ignore`, or `@ts-expect-error`

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **User wants tests**: Manual-only for UI, preserve existing tests
- **Framework**: vitest (already configured)

### Manual QA Verification Protocol

Each TODO includes detailed verification procedures. The executor MUST:

1. Run `lsp_diagnostics` on changed file after each edit
2. Start dev server: `pnpm dev`
3. Navigate to `http://localhost:3000/assistant`
4. Verify visual changes match acceptance criteria
5. Test interactions (hover, click, scroll)
6. Check dark mode toggle if applicable
7. Run `pnpm test` after markdown-message changes

**Evidence Required:**
- lsp_diagnostics output (zero new errors)
- Visual confirmation of styling changes
- Interaction verification (hover states work)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Create shared animation constants file
└── (blocking: provides animation configs for all other tasks)

Wave 2 (After Wave 1):
├── Task 2: Polish simple-loading.tsx (standalone)
├── Task 3: Polish action-buttons.tsx (standalone)  
├── Task 4: Polish opportunity-card-inline.tsx (standalone)
└── Task 5: Polish ai-tools-sidebar.tsx (standalone)

Wave 3 (After Wave 2):
├── Task 6: Major refactor chat-interface.tsx (depends on Task 1)
├── Task 7: Minor polish markdown-message.tsx (careful - has tests)
└── Task 8: Final integration in page.tsx + verification
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2,3,4,5,6 | None (must be first) |
| 2 | 1 | 8 | 3,4,5 |
| 3 | 1 | 8 | 2,4,5 |
| 4 | 1 | 8 | 2,3,5 |
| 5 | 1 | 8 | 2,3,4 |
| 6 | 1 | 8 | 7 (after Wave 2) |
| 7 | 1 | 8 | 6 (after Wave 2) |
| 8 | 2,3,4,5,6,7 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | `category="quick"`, `load_skills=["frontend-ui-ux"]` |
| 2 | 2,3,4,5 | `category="visual-engineering"`, `load_skills=["frontend-ui-ux"]`, `run_in_background=true` |
| 3 | 6,7,8 | `category="visual-engineering"`, `load_skills=["frontend-ui-ux"]` |

---

## TODOs

### ROLLBACK CHECKPOINT 0: Before any changes
```bash
git stash push -m "pre-assistant-polish-backup" || git add -A && git stash push -m "pre-assistant-polish-backup"
```

---

- [ ] 1. Create shared animation constants file

  **What to do**:
  - Create `components/assistant/animations.ts` with shared animation configs
  - Export reusable variants, spring configs, and transition presets
  - Use TypeScript types from framer-motion
  - Match patterns from `components/opportunities/opportunity-card.tsx`

  **Must NOT do**:
  - Don't add new dependencies
  - Don't use hardcoded timing values (use design tokens where possible)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused file creation with no complex logic
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Animation expertise, design system knowledge

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2, 3, 4, 5, 6
  - **Blocked By**: None (start immediately)

  **References**:
  
  **Pattern References**:
  - `components/opportunities/opportunity-card.tsx:58-71` - Animation variants pattern (itemVariants, cardSpring)
  - `components/ui/glass-card.tsx:43-44` - Premium easing and transition config
  
  **Design Token References**:
  - `app/globals.css:118-127` - Glass blur values and premium easing variables
  
  **Type References**:
  - Import `Variants`, `Transition` from `framer-motion`

  **Code to implement**:
  ```typescript
  // components/assistant/animations.ts
  import type { Variants, Transition } from 'framer-motion'

  // Premium easing matching design system
  export const premiumEase = [0.23, 1, 0.32, 1] as const

  // Spring config for natural motion
  export const subtleSpring: Transition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  }

  // Message entrance animation
  export const messageVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 8,
      scale: 0.98,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.25,
        ease: premiumEase,
      },
    },
  }

  // Stagger container for lists
  export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  }

  // Card hover effect (subtle)
  export const cardHover = {
    y: -4,
    transition: { duration: 0.2, ease: premiumEase },
  }

  // Pulse animation for loading states
  export const pulseVariants: Variants = {
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  }

  // Fade in for general content
  export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3, ease: premiumEase },
    },
  }
  ```

  **Acceptance Criteria**:
  - [ ] File exists at `components/assistant/animations.ts`
  - [ ] Exports: `premiumEase`, `subtleSpring`, `messageVariants`, `staggerContainer`, `cardHover`, `pulseVariants`, `fadeIn`
  - [ ] `lsp_diagnostics components/assistant/animations.ts` → 0 errors
  - [ ] TypeScript compiles: `npx tsc --noEmit` passes for this file

  **Commit**: YES
  - Message: `feat(assistant): add shared animation constants`
  - Files: `components/assistant/animations.ts`
  - Pre-commit: `npx tsc --noEmit`

---

### ROLLBACK CHECKPOINT 1: After Task 1
```bash
git add components/assistant/animations.ts && git stash push -m "checkpoint-1-animations"
```

---

- [ ] 2. Polish simple-loading.tsx with premium effects

  **What to do**:
  - Upgrade TypingIndicator with smoother pulse animation using framer-motion
  - Upgrade DiscoveryLoading with gradient glow effect
  - Add subtle scale animation to loading spinner
  - Use OKLCH colors from design system

  **Must NOT do**:
  - Don't change component props or function signatures
  - Don't break existing usage in chat-interface.tsx

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Focused UI polish work with animation implementation
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Animation expertise, loading state patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:
  
  **Pattern References**:
  - `components/assistant/animations.ts` - pulseVariants, premiumEase (from Task 1)
  - `components/assistant/simple-loading.tsx:62-69` - Current TypingIndicator implementation
  
  **Style References**:
  - `app/globals.css:14` - `--primary` OKLCH color
  - `components/ui/glass-card.tsx:30-32` - Glow shadow pattern

  **Code changes**:
  ```typescript
  // Add import at top
  import { motion } from 'framer-motion'
  import { pulseVariants, premiumEase } from './animations'

  // Replace TypingIndicator with:
  export function TypingIndicator({ className }: { className?: string }) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-primary/60"
            animate={{
              y: [0, -4, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: premiumEase,
            }}
          />
        ))}
      </div>
    )
  }

  // Upgrade DiscoveryLoading spinner section:
  <motion.div 
    className="relative"
    animate={{ rotate: 360 }}
    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
  >
    <Loader2 className="h-6 w-6 text-primary" />
    <motion.div 
      className="absolute inset-0 h-6 w-6 rounded-full bg-primary/20"
      variants={pulseVariants}
      animate="pulse"
    />
  </motion.div>
  ```

  **Acceptance Criteria**:
  - [ ] `lsp_diagnostics components/assistant/simple-loading.tsx` → 0 errors
  - [ ] TypingIndicator shows smooth wave animation (not CSS bounce)
  - [ ] DiscoveryLoading has rotating spinner with pulse glow
  - [ ] Dev server: Navigate to `/assistant`, trigger loading state, verify animation
  
  **Manual Verification**:
  - [ ] Start typing a message to trigger TypingIndicator
  - [ ] Initiate web discovery to see DiscoveryLoading
  - [ ] Confirm animations are smooth, not jarring

  **Commit**: NO (groups with Task 3)

---

- [ ] 3. Polish action-buttons.tsx with glass effect

  **What to do**:
  - Wrap confirmation cards in glass effect styling
  - Add entrance animation when cards appear
  - Add subtle hover scale on buttons
  - Improve visual hierarchy with better spacing

  **Must NOT do**:
  - Don't change callback signatures (onConfirm, onCancel)
  - Don't modify button disabled logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Focused UI polish with animation
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Glass effect implementation, micro-interactions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 5)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:
  
  **Pattern References**:
  - `components/assistant/animations.ts` - fadeIn, premiumEase (from Task 1)
  - `components/ui/glass-card.tsx:24-27` - Glass variant classes
  
  **Current Implementation**:
  - `components/assistant/action-buttons.tsx:31,75` - Current basic styling

  **Code changes**:
  ```typescript
  // Add import
  import { motion } from 'framer-motion'
  import { fadeIn, premiumEase } from './animations'

  // Replace container div in both components with:
  <motion.div 
    className={cn(
      'rounded-xl border border-border/50 p-4',
      'backdrop-blur-sm bg-card/80',
      'shadow-lg shadow-black/5',
      className
    )}
    variants={fadeIn}
    initial="hidden"
    animate="visible"
  >
    {/* content */}
  </motion.div>

  // Add to buttons:
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
    <Button ...>
  </motion.div>
  ```

  **Acceptance Criteria**:
  - [ ] `lsp_diagnostics components/assistant/action-buttons.tsx` → 0 errors
  - [ ] BookmarkConfirm has glass effect background
  - [ ] WebDiscoveryConfirm has glass effect background
  - [ ] Buttons have subtle scale on hover/tap
  - [ ] Cards fade in when appearing

  **Manual Verification**:
  - [ ] Trigger a bookmark action in chat
  - [ ] Trigger web discovery prompt
  - [ ] Verify glass blur visible behind cards
  - [ ] Verify button hover feels responsive

  **Commit**: YES
  - Message: `style(assistant): add glass effects to loading and action components`
  - Files: `components/assistant/simple-loading.tsx`, `components/assistant/action-buttons.tsx`
  - Pre-commit: `lsp_diagnostics` on both files

---

- [ ] 4. Polish opportunity-card-inline.tsx with animations

  **What to do**:
  - Add framer-motion entrance animation to card
  - Add hover lift effect matching main opportunity-card.tsx
  - Add stagger animation to OpportunityGrid
  - Upgrade UrgencyBadge with subtle pulse for "urgent"

  **Must NOT do**:
  - Don't change InlineOpportunity interface
  - Don't modify navigation or bookmark logic
  - Don't change the data displayed

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Animation-heavy UI work
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Card animation patterns, stagger effects

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 5)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:
  
  **Pattern References**:
  - `components/opportunities/opportunity-card.tsx:58-71,87-96` - Card animation pattern to match
  - `components/assistant/animations.ts` - messageVariants, staggerContainer, cardHover
  
  **Current Implementation**:
  - `components/assistant/opportunity-card-inline.tsx:97-235` - Card component
  - `components/assistant/opportunity-card-inline.tsx:248-268` - Grid component

  **Code changes**:
  ```typescript
  // Add import
  import { motion } from 'framer-motion'
  import { messageVariants, staggerContainer, cardHover, premiumEase } from './animations'

  // Wrap OpportunityCardInline main div:
  export function OpportunityCardInline({ ... }: OpportunityCardInlineProps) {
    return (
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        whileHover={cardHover}
        className={cn(
          'rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4',
          'shadow-sm hover:shadow-md hover:border-primary/30',
          'transition-shadow duration-200',
          className
        )}
      >
        {/* existing content */}
      </motion.div>
    )
  }

  // Upgrade OpportunityGrid with stagger:
  export function OpportunityGrid({ ... }: OpportunityGridProps) {
    if (opportunities.length === 0) return null

    return (
      <motion.div 
        className="grid gap-3 mt-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {opportunities.map((opp) => (
          <OpportunityCardInline key={opp.id} ... />
        ))}
      </motion.div>
    )
  }

  // Add pulse to urgent badge:
  {urgency === 'urgent' && (
    <motion.span 
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
      className={cn('flex items-center gap-1 ...', className)}
    >
      ...
    </motion.span>
  )}
  ```

  **Acceptance Criteria**:
  - [ ] `lsp_diagnostics components/assistant/opportunity-card-inline.tsx` → 0 errors
  - [ ] Cards animate in with fade+slide when appearing
  - [ ] Cards lift slightly on hover (y: -4)
  - [ ] Multiple cards stagger their entrance
  - [ ] Urgent badges have subtle pulse

  **Manual Verification**:
  - [ ] Ask assistant "find me internships" to get opportunity cards
  - [ ] Verify cards animate in sequentially (stagger visible)
  - [ ] Hover over cards, verify lift effect
  - [ ] Check urgent deadline badges pulse

  **Commit**: YES
  - Message: `style(assistant): add animations to inline opportunity cards`
  - Files: `components/assistant/opportunity-card-inline.tsx`
  - Pre-commit: `lsp_diagnostics`

---

- [ ] 5. Polish ai-tools-sidebar.tsx with GlassCard

  **What to do**:
  - Replace card containers with GlassCard component
  - Add hover glow effect on tool icons
  - Improve section headers with subtle styling
  - Add entrance animation to sections

  **Must NOT do**:
  - Don't change tool/data arrays content
  - Don't modify session loading logic
  - Don't change callback signatures

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: GlassCard integration and styling
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component composition, hover effects

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 4)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:
  
  **Pattern References**:
  - `components/ui/glass-card.tsx` - GlassCard component with variants
  - `components/dashboard/ai-assistant-preview.tsx:22` - GlassCard usage pattern
  - `components/assistant/animations.ts` - staggerContainer, fadeIn
  
  **Current Implementation**:
  - `components/assistant/ai-tools-sidebar.tsx:84-103` - Data tools section
  - `components/assistant/ai-tools-sidebar.tsx:163-184` - AI tools section

  **Code changes**:
  ```typescript
  // Add imports
  import { motion } from 'framer-motion'
  import { GlassCard } from '@/components/ui/glass-card'
  import { staggerContainer, fadeIn, premiumEase } from './animations'

  // Replace card containers with GlassCard:
  <GlassCard variant="sidebar" className="overflow-hidden">
    {dataTools.map((tool, index) => (
      // existing button content
    ))}
  </GlassCard>

  // Add hover glow to icon containers:
  <motion.div 
    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
    whileHover={{ 
      boxShadow: '0 0 20px rgba(var(--primary-rgb), 0.3)',
      scale: 1.05,
    }}
    transition={{ duration: 0.2, ease: premiumEase }}
  >
    <tool.icon className="h-6 w-6" />
  </motion.div>

  // Wrap entire sidebar in motion for entrance:
  <motion.div 
    className="flex flex-col h-full"
    variants={staggerContainer}
    initial="hidden"
    animate="visible"
  >
    {/* sections */}
  </motion.div>
  ```

  **Acceptance Criteria**:
  - [ ] `lsp_diagnostics components/assistant/ai-tools-sidebar.tsx` → 0 errors
  - [ ] Tool sections use GlassCard with blur effect
  - [ ] Tool icons glow on hover
  - [ ] Sections animate in on page load
  - [ ] Visual hierarchy is improved

  **Manual Verification**:
  - [ ] Navigate to `/assistant` on desktop (sidebar visible)
  - [ ] Verify glass blur effect on sections
  - [ ] Hover over tool icons, verify glow appears
  - [ ] Page load shows staggered section appearance

  **Commit**: YES
  - Message: `style(assistant): upgrade sidebar with GlassCard and animations`
  - Files: `components/assistant/ai-tools-sidebar.tsx`
  - Pre-commit: `lsp_diagnostics`

---

### ROLLBACK CHECKPOINT 2: After Wave 2 (Tasks 2-5)
```bash
git add components/assistant/*.tsx && git stash push -m "checkpoint-2-wave2-complete"
```

---

- [ ] 6. Major polish of chat-interface.tsx

  **What to do**:
  - Wrap main container in GlassCard
  - Add gradient background to empty state hero
  - Add staggered animation to quick prompts
  - Add entrance animation to messages
  - Apply glass effect to AI message bubbles (not user)
  - Polish input bar with floating glass effect
  - Improve avatar styling with ring effect

  **Must NOT do**:
  - Don't touch sendMessage function logic
  - Don't modify useInlineDiscovery hook usage
  - Don't change message streaming logic
  - Don't modify saveChatSession/getSavedChatSession calls
  - Don't change forwardRef/useImperativeHandle logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex UI refactoring with multiple animation systems
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Complex component styling, animation orchestration

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:
  
  **Pattern References**:
  - `components/opportunities/opportunity-card.tsx:87-96` - Motion wrapper pattern
  - `components/dashboard/ai-assistant-preview.tsx:22` - GlassCard with gradient
  - `components/assistant/animations.ts` - All animation variants
  - `components/ui/glass-card.tsx` - GlassCard component
  
  **Current Implementation**:
  - `components/assistant/chat-interface.tsx:518-672` - Main render JSX
  - `components/assistant/chat-interface.tsx:522-559` - Empty state
  - `components/assistant/chat-interface.tsx:560-654` - Message list
  - `components/assistant/chat-interface.tsx:658-671` - Input bar

  **Code changes - Empty State Hero**:
  ```typescript
  // Replace empty state section (lines 522-559):
  <motion.div 
    className="flex flex-col items-center justify-center h-full min-h-[400px] relative"
    variants={fadeIn}
    initial="hidden"
    animate="visible"
  >
    {/* Gradient mesh background */}
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
    </div>
    
    <div className="relative z-10 flex flex-col items-center">
      <motion.div 
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg mb-8"
        animate={{ 
          boxShadow: ['0 0 20px rgba(var(--primary-rgb), 0.3)', '0 0 40px rgba(var(--primary-rgb), 0.5)', '0 0 20px rgba(var(--primary-rgb), 0.3)']
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Sparkles className="h-10 w-10 text-primary-foreground" />
      </motion.div>
      {/* ... rest of hero content */}
      
      {/* Staggered quick prompts */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {quickPrompts.map((prompt) => (
          <motion.div key={prompt} variants={messageVariants}>
            <Button ...>{prompt}</Button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </motion.div>
  ```

  **Code changes - Message Bubbles**:
  ```typescript
  // Wrap each message in motion with glass for AI:
  <motion.div 
    key={message.id} 
    className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
    variants={messageVariants}
    initial="hidden"
    animate="visible"
  >
    {/* ... avatar */}
    <div className="max-w-[75%]">
      <div
        className={cn(
          'rounded-2xl px-5 py-4',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'backdrop-blur-sm bg-muted/80 text-foreground border border-border/50 shadow-sm'
        )}
      >
        {/* content */}
      </div>
    </div>
  </motion.div>
  ```

  **Code changes - Input Bar**:
  ```typescript
  // Upgrade input section (line 658):
  <div className="flex-none border-t border-border/50 p-5 backdrop-blur-md bg-card/80 rounded-b-2xl">
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Input
        placeholder="Ask me anything about your career..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isLoading || isDiscovering}
        className="flex-1 h-12 text-base bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50"
      />
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button type="submit" size="lg" ...>
          <Send className="h-5 w-5" />
        </Button>
      </motion.div>
    </form>
  </div>
  ```

  **Code changes - Main Container**:
  ```typescript
  // Replace outer div with GlassCard (line 519):
  <GlassCard 
    variant="default" 
    className="flex flex-col h-full overflow-hidden"
  >
    {/* existing content structure */}
  </GlassCard>
  ```

  **Acceptance Criteria**:
  - [ ] `lsp_diagnostics components/assistant/chat-interface.tsx` → 0 errors
  - [ ] Empty state has gradient mesh background with blur
  - [ ] Sparkles icon has subtle glow pulse
  - [ ] Quick prompts stagger in on load
  - [ ] Messages animate in when added
  - [ ] AI messages have glass blur effect
  - [ ] User messages keep solid primary style
  - [ ] Input bar has floating glass effect
  - [ ] Main container has GlassCard styling

  **Manual Verification**:
  - [ ] Load `/assistant` fresh - verify hero animation
  - [ ] Check gradient blobs visible behind content
  - [ ] Click a quick prompt - verify message animation
  - [ ] Send a message - verify AI response has glass effect
  - [ ] Verify input bar has subtle blur
  - [ ] Test dark mode - verify all effects work

  **Commit**: YES
  - Message: `style(assistant): major UI polish with glass effects and animations`
  - Files: `components/assistant/chat-interface.tsx`
  - Pre-commit: `lsp_diagnostics`

---

- [ ] 7. Minor polish of markdown-message.tsx (CAREFUL - has tests)

  **What to do**:
  - Add subtle entrance animation to embedded cards
  - Improve code block styling with better contrast
  - Add hover effect to links
  - Keep changes minimal to preserve test compatibility

  **Must NOT do**:
  - Don't change parseContentWithCards logic
  - Don't change component props interface
  - Don't modify memo comparison function
  - Don't change EmbeddedCard fetch logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Careful styling with test preservation
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Styling with constraints

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:
  
  **Pattern References**:
  - `components/assistant/animations.ts` - fadeIn variant
  
  **Test File**:
  - `__tests__/components/markdown-message.test.tsx` - MUST NOT BREAK
  
  **Current Implementation**:
  - `components/assistant/markdown-message.tsx:136-145` - EmbeddedCard render
  - `components/assistant/markdown-message.tsx:229-239` - Link component

  **Code changes (minimal)**:
  ```typescript
  // Add import
  import { motion } from 'framer-motion'
  import { fadeIn } from './animations'

  // Wrap EmbeddedCard render (line 137):
  return (
    <motion.div 
      className="my-3"
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      <OpportunityCardInline ... />
    </motion.div>
  )

  // Upgrade link hover (line 231-238):
  a: ({ href, children }) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-primary underline underline-offset-2 hover:text-primary/80 hover:no-underline transition-colors duration-200"
    >
      {children}
    </a>
  ),

  // Upgrade code blocks (line 260-264):
  pre: ({ children }) => (
    <pre className="bg-muted/80 backdrop-blur-sm p-3 rounded-lg overflow-x-auto my-2 text-sm border border-border/30">
      {children}
    </pre>
  ),
  ```

  **Acceptance Criteria**:
  - [ ] `lsp_diagnostics components/assistant/markdown-message.tsx` → 0 errors
  - [ ] `pnpm test __tests__/components/markdown-message.test.tsx` → PASS
  - [ ] Embedded cards fade in
  - [ ] Links have color transition on hover
  - [ ] Code blocks have slight blur effect

  **Manual Verification**:
  - [ ] Ask assistant to show code examples
  - [ ] Verify code blocks look refined
  - [ ] Click links, verify hover state
  - [ ] Run test suite: `pnpm test`

  **Commit**: YES
  - Message: `style(assistant): minor polish to markdown rendering`
  - Files: `components/assistant/markdown-message.tsx`
  - Pre-commit: `pnpm test __tests__/components/markdown-message.test.tsx`

---

- [ ] 8. Final integration verification and page.tsx adjustments

  **What to do**:
  - Verify all components work together harmoniously
  - Add subtle gap/spacing refinements to page.tsx if needed
  - Run full test suite
  - Run lsp_diagnostics on all changed files
  - Create final verification checklist

  **Must NOT do**:
  - Don't add new functionality
  - Don't change page structure significantly

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Final integration and verification
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Visual QA, integration testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 2, 3, 4, 5, 6, 7

  **References**:
  
  **Current Implementation**:
  - `app/assistant/page.tsx` - Page coordinator
  
  **All Changed Files**:
  - `components/assistant/animations.ts`
  - `components/assistant/simple-loading.tsx`
  - `components/assistant/action-buttons.tsx`
  - `components/assistant/opportunity-card-inline.tsx`
  - `components/assistant/ai-tools-sidebar.tsx`
  - `components/assistant/chat-interface.tsx`
  - `components/assistant/markdown-message.tsx`

  **Verification Script**:
  ```bash
  # Run all diagnostics
  for file in components/assistant/*.tsx components/assistant/*.ts; do
    echo "Checking $file..."
    # lsp_diagnostics equivalent check
  done

  # Run tests
  pnpm test

  # Build check
  pnpm build
  ```

  **Acceptance Criteria**:
  - [ ] `lsp_diagnostics` on all 7 files → 0 new errors
  - [ ] `pnpm test` → All tests pass
  - [ ] `pnpm build` → Builds successfully
  - [ ] Visual verification checklist (below) all pass

  **Final Visual Verification Checklist**:
  - [ ] Empty state: Hero with gradient background loads
  - [ ] Empty state: Quick prompts stagger in
  - [ ] Empty state: Sparkles icon has glow pulse
  - [ ] Messages: AI responses have glass blur
  - [ ] Messages: User messages keep solid primary
  - [ ] Messages: Entrance animation visible
  - [ ] Cards: Opportunity cards animate in
  - [ ] Cards: Hover lift effect works
  - [ ] Cards: Urgent badges pulse
  - [ ] Sidebar: GlassCard sections visible
  - [ ] Sidebar: Tool icons glow on hover
  - [ ] Loading: Typing indicator is smooth
  - [ ] Loading: Discovery progress has glow
  - [ ] Actions: Confirmation cards have glass effect
  - [ ] Input: Bar has floating glass style
  - [ ] Dark mode: All effects work correctly

  **Commit**: YES
  - Message: `style(assistant): complete UI/UX polish refactor`
  - Files: `app/assistant/page.tsx` (if changed)
  - Pre-commit: `pnpm test && pnpm build`

---

### ROLLBACK CHECKPOINT 3: After all tasks complete
```bash
git add -A && git stash push -m "checkpoint-3-all-complete"
```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(assistant): add shared animation constants` | animations.ts | tsc --noEmit |
| 3 | `style(assistant): add glass effects to loading and action components` | simple-loading.tsx, action-buttons.tsx | lsp_diagnostics |
| 4 | `style(assistant): add animations to inline opportunity cards` | opportunity-card-inline.tsx | lsp_diagnostics |
| 5 | `style(assistant): upgrade sidebar with GlassCard and animations` | ai-tools-sidebar.tsx | lsp_diagnostics |
| 6 | `style(assistant): major UI polish with glass effects and animations` | chat-interface.tsx | lsp_diagnostics |
| 7 | `style(assistant): minor polish to markdown rendering` | markdown-message.tsx | pnpm test |
| 8 | `style(assistant): complete UI/UX polish refactor` | page.tsx (if changed) | pnpm test && pnpm build |

---

## Success Criteria

### Verification Commands
```bash
# TypeScript check
npx tsc --noEmit

# Run tests
pnpm test

# Build verification
pnpm build

# Dev server
pnpm dev
# Then navigate to http://localhost:3000/assistant
```

### Final Checklist
- [ ] All "Must Have" items present (GlassCard, animations, glass bubbles, hero state)
- [ ] All "Must NOT Have" items absent (no API changes, no new deps, no test breaks)
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Visual QA checklist complete
- [ ] Dark mode verified
