# Code Cleanup and Error Fix Plan

## Summary
Total TypeScript Errors: **569**

## Issues Identified

### 1. Database Type Issues (Primary Issue)
- Many files show `Property does not exist on type 'never'` errors
- This indicates the Supabase typed client is not properly inferring types
- **Root Cause**: Missing explicit type assertions or incorrect query patterns

### 2. Implicit 'any' Type Errors
- Multiple callback parameters lack type annotations
- Arrow functions in `.map()`, `.filter()`, `.forEach()` need explicit types

### 3. Missing Component Dependencies
- `GlassCard` component referenced but not defined
- `Sparkles` from lucide-react not imported
- Missing PNG image type declarations

### 4. Test Setup Issues
- `vi` from vitest not available globally
- `screen` import from testing-library/react version mismatch
- Test mocks need proper typing

### 5. Framer Motion Type Issues
- Variant type conflicts
- Mouse event handler signature mismatches

### 6. Next.js Configuration
- `ignoreBuildErrors: true` is masking issues
- Should be removed after fixes

## Fix Strategy

### Phase 1: Fix Core Type System (Priority: CRITICAL)
1. Add proper type assertions to database queries
2. Create type helper utilities for common patterns
3. Fix lib/supabase/server.ts cookie parameter types

### Phase 2: Fix Application Code (Priority: HIGH)
1. Add explicit types to all callback parameters
2. Fix database query type assertions
3. Add missing component imports

### Phase 3: Fix Test Code (Priority: MEDIUM)
1. Setup vitest globals properly
2. Fix testing-library imports
3. Add proper test type mocks

### Phase 4: Fix UI Components (Priority: MEDIUM)
1. Create missing components (GlassCard)
2. Fix framer-motion type issues
3. Add image type declarations

### Phase 5: Final Cleanup (Priority: LOW)
1. Remove `ignoreBuildErrors` from next.config.mjs
2. Remove `@ts-nocheck` from files
3. Run full type check and build

## Files Requiring Attention

### Immediate Fixes Required:
1. `lib/supabase/server.ts` - Cookie types
2. `app/actions/*.ts` - ~15 files with type errors
3. `components/**/*.tsx` - Multiple component files
4. `__tests__/setup.ts` - Global test configuration

### Can Be Deferred:
1. `lib/ai/examples.ts` - Has @ts-nocheck, is example code
2. Image type declarations - Low priority

## Next Steps
1. Start with Phase 1 - fix core type system
2. Create type utilities
3. Systematically fix each action file
4. Fix components
5. Fix tests
6. Final validation
