# UI COMPONENTS

shadcn/ui primitives + custom Glassmorphism components.

## OVERVIEW

Reusable UI components based on Radix UI primitives with Tailwind CSS 4 styling and OKLCH colors.

## STRUCTURE

```
components/ui/
├── glass-card.tsx       # Custom glassmorphism card
├── button.tsx           # shadcn button
├── card.tsx             # shadcn card
├── dialog.tsx           # shadcn dialog
├── input.tsx            # shadcn input
├── (20+ more)/          # Full shadcn/ui library
```

## CONVENTIONS

### Using UI Components

```typescript
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { cn } from '@/lib/utils'

export function Example() {
  return (
    <GlassCard className={cn('p-6', 'hover:scale-105')}>
      <Button variant="default" size="lg">
        Click Me
      </Button>
    </GlassCard>
  )
}
```

### Glassmorphism Pattern

Project uses custom glass effect throughout:

```typescript
// GlassCard variants
<GlassCard variant="default" />  // Standard glass
<GlassCard variant="premium" />  // Enhanced blur
<GlassCard variant="subtle" />   // Light glass
```

### OKLCH Colors

All colors use OKLCH (perceptually uniform):

```css
/* In globals.css */
--primary: oklch(0.55 0.2 250);
--secondary: oklch(0.45 0.15 270);
```

**Never hardcode Tailwind colors** — Use CSS variables.

### Component Customization

Always use `cn()` for className merging:

```typescript
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export function Component({ className }: Props) {
  return (
    <div className={cn('base-classes', className)} />
  )
}
```

## ANTI-PATTERNS

**NEVER:**
- Hardcode colors (use OKLCH variables)
- Skip `cn()` for conditional classes
- Mix glass effects with standard cards
- Override Radix data attributes

**ALWAYS:**
- Import from `@/components/ui/*`
- Use `variant` and `size` props where available
- Preserve accessibility (ARIA attributes)
- Test with reduced motion enabled

## NOTES

- **Source** — Generated via `npx shadcn@latest add <component>`
- **Config** — `components.json` defines paths and style
- **Theme** — Tailwind 4 with `@theme inline` in `globals.css`
- **Animation** — Uses `tailwindcss-animate` plugin
