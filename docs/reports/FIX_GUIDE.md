# Comprehensive Error Fix Guide

## Current Status
- **Total Errors**: 569 TypeScript errors
- **Dependencies**: ✅ Installed (using `npm install --legacy-peer-deps`)
- **Core Types**: ✅ Created (`lib/types.ts`)

## Completed Fixes
1. ✅ Installed dependencies with `--legacy-peer-deps`
2. ✅ Fixed `lib/supabase/server.ts` cookie parameter types
3. ✅ Created `lib/types.ts` with reusable database type exports
4. ✅ Started fixing `app/actions/connections.ts`

## Remaining Issues by Category

### Category 1: Database Type Assertions (70% of errors)
**Issue**: Supabase queries return `never` type due to complex join queries

**Solution**: Add type assertions to database queries

**Example**:
```typescript
// Before (causes errors)
const { data } = await supabase.from("users").select("*")
data.map((u) => u.name) // ERROR: Property 'name' does not exist on type 'never'

// After (fixed)
import type { User } from "@/lib/types"
const { data } = await supabase.from("users").select("*")
data.map((u: User) => u.name) // ✅ Works

// Or use type assertion on the whole result
const { data } = await supabase.from("users").select("*") as { data: User[] | null, error: any }
```

**Files Affected** (35 files):
- `app/actions/*.ts` (15 files)
- `app/api/**/*.ts` (8 files)
- `components/**/*.tsx` (12 files)

### Category 2: Implicit 'any' Types  (20% of errors)
**Issue**: Callback parameters without explicit types

**Solution**: Add explicit type annotations

**Example**:
```typescript
// Before
users.map((u) => u.name) // ERROR: Parameter 'u' implicitly has an 'any' type

// After
import type { User } from "@/lib/types"
users.map((u: User) => u.name) // ✅ Works
```

**Quick Fix Strategy**:
1. Import relevant types from `@/lib/types`
2. Add type annotation to each callback parameter
3. Common patterns:
   - `.map((item: Type) => ...)`
   - `.filter((item: Type) => ...)`
   - `.forEach((item: Type) => ...)`

### Category 3: Missing Test Setup (5% of errors)
**Issue**: Vitest globals (`vi`, `describe`, `it`, `expect`) not available

**Solution**: Already fixed in `__tests__/setup.ts`:
```typescript
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// Make vi globally available
globalThis.vi = vi
```

But also need to update `vitest.config.ts` to include globals:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Add this line
    environment: 'jsdom',
    setupFiles: './__tests__/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

### Category 4: Missing Components (3% of errors)
**Issues**:
- `GlassCard` component not defined
- `Sparkles` icon not imported from lucide-react
- PNG image types not declared

**Solutions**:

**4a. Add Sparkles import**:
```typescript
// In any component using Sparkles
import { Sparkles, ...otherIcons } from "lucide-react"
```

**4b. Create GlassCard component**:
```typescript
// components/ui/glass-card.tsx
import React from "react"
import { cn } from "@/lib/utils"

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-background/50 backdrop-blur-md border border-border/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

**4c. Add image type declarations**:
```typescript
// types/images.d.ts
declare module '*.png' {
  const value: string
  export default value
}

declare module '*.jpg' {
  const value: string
  export default value
}

declare module '*.jpeg' {
  const value: string
  export default value
}

declare module '*.svg' {
  const value: string
  export default value
}
```

### Category 5: Framer Motion Type Issues (2% of errors)
**Issue**: Variant type conflicts, mouse event handler signature mismatches

**Solutions**:

**5a. Fix Variants**:
```typescript
// Before
const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 30 },
  visible: (i: number) => ({ // ERROR: Function not assignable to Variant
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15, delay: i * 0.1 },
  }),
}

// After
const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0 },
}

// Use custom prop for index-based delay
<motion.div
  custom={index}
  variants={cardVariants}
  initial="hidden"
  animate="visible"
  transition={{ type: "spring", stiffness: 100, damping: 15, delay: index * 0.1 }}
>
```

**5b. Fix Event Handlers**:
```typescript
// Before
onClick={(id: string) => handleClick(id)} // ERROR: expected MouseEvent

// After
onClick={(e: React.MouseEvent) => handleClick(someId)} // Use captured variable, not parameter
// Or
onClick={() => handleClick(someId)} // Simpler
```

## Automated Fix Strategy

### Step 1: Run Type Check to see current state
```bash
npx tsc --noEmit 2>&1 | tee typescript-errors.log
```

### Step 2: Fix files in order of priority

**Priority 1 - Core Infrastructure**:
1. `lib/supabase/server.ts` ✅ DONE
2. `lib/types.ts` ✅ DONE  
3. `vitest.config.ts`
4. `types/images.d.ts`
5. `components/ui/glass-card.tsx`

**Priority 2 - Server Actions**:
Files in `app/actions/`:
- connections.ts (in progress)
- messages.ts
- opportunities.ts
- profile.ts
- search.ts
- user.ts
- events.ts
- analytics.ts
- applications.ts
- chat.ts
- dashboard.ts
- discovery.ts
- event-discovery.ts
- goal-discovery.ts
- goals.ts
- insights.ts
- mentor-email.ts
- mentors.ts
- onboarding.ts
- opportunity-status.ts
- preferences.ts
- profile-items.ts
- projects.ts
- recommendations.ts
- similar-opportunities.ts

**Priority 3 - API Routes**:
Files in `app/api/`:
- All route handlers

**Priority 4 - Components**:
Files in `components/`:
- All component files with errors

**Priority 5 - Tests**:
Files in `__tests__/`:
- All test files

### Step 3: Verify fixes
```bash
npx tsc --noEmit
```

### Step 4: Build test
```bash
npm run build
```

## Quick Wins

These changes will fix the most errors with minimal effort:

### 1. Update vitest.config.ts (Fixes ~30 test errors)
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,  // Add this line
    environment: 'jsdom',
    setupFiles: './__tests__/setup.ts',
  },
  //... rest of config
})
```

### 2. Create image type declarations (Fixes ~10 errors)
Create `types/images.d.ts` with the PNG/image module declarations above

### 3. Create missing GlassCard component (Fixes ~8 errors)
Use the GlassCard implementation above

### 4. Add Sparkles import (Fixes ~3 errors)
Import from lucide-react in relevant files

### 5. Fix common callback patterns (Template)
For any file with callback errors, add this import and use the pattern:
```typescript
import type { User, Opportunity, Connection, Message, Project, Event } from "@/lib/types"

// Then use in callbacks:
.map((user: User) => ...)
.map((opp: Opportunity) => ...)
.map((conn: Connection) => ...)
// etc.
```

## Final Steps

After fixing most errors:

1. **Remove build error ignoring**:
```javascript
// next.config.mjs
export default {
  typescript: {
    ignoreBuildErrors: false, // Change to false
  },
  // ...
}
```

2. **Remove @ts-nocheck**:
Remove from `lib/ai/examples.ts` if you fix the types there

3. **Run full check**:
```bash
npx tsc --noEmit && npm run build
```

## Estimated Time
- Quick wins: 15-30 minutes
- Priority 1 & 2: 2-3 hours
- Complete cleanup: 4-6 hours

## Tools That Can Help
- VS Code "Organize Imports" (Shift+Alt+O)
- Find and Replace with regex
- ESLint auto-fix: `npm run lint -- --fix`
