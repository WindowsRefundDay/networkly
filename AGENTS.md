# AGENTS.md - Agentic Coding Guidelines

> Instructions for AI coding agents operating in this Next.js + Prisma codebase.

## Quick Reference

```bash
# Development
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build
pnpm lint             # ESLint check

# Type Checking
npx tsc --noEmit      # Verify TypeScript compiles

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio
```

## Project Structure

```
app/                  # Next.js App Router pages and API routes
  api/                # API routes (route.ts files)
  (feature)/          # Feature pages (page.tsx, layout.tsx, loading.tsx)
components/
  ui/                 # Reusable UI primitives (shadcn/ui)
  (feature)/          # Feature-specific components
hooks/                # React hooks (use-*.ts)
lib/
  ai/                 # AI model management system
  prisma.ts           # Prisma client singleton
  utils.ts            # Utility functions (cn, etc.)
prisma/
  schema.prisma       # Database schema
  seed.ts             # Database seeding
```

## Code Style Guidelines

### Imports

Order imports in this sequence with blank lines between groups:
1. React/Next.js core (`react`, `next/*`)
2. External packages (`@clerk/*`, `@radix-ui/*`, `zod`, etc.)
3. Internal aliases (`@/lib/*`, `@/components/*`, `@/hooks/*`)
4. Relative imports (`./`, `../`)

```typescript
import { useState, useCallback } from 'react'
import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

import { localHelper } from './helpers'
```

### TypeScript

- **Strict mode enabled** - No implicit any, strict null checks
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer explicit return types on exported functions
- Use Zod for runtime validation (schemas in `lib/ai/types.ts`)

```typescript
// Interfaces for objects
interface UserProfile {
  id: string
  name: string
  email: string
}

// Types for unions
type Status = 'pending' | 'active' | 'completed'

// Explicit return types
export function getUser(id: string): Promise<UserProfile | null> {
  // ...
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (components) | kebab-case | `opportunity-card.tsx` |
| Files (hooks) | use-kebab-case | `use-ai-chat.ts` |
| Components | PascalCase | `OpportunityCard` |
| Functions/hooks | camelCase | `useAIChat`, `getUser` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `UserProfile`, `CompletionOptions` |

### React Components

- Use function components with TypeScript props
- Use `'use client'` directive only when needed (hooks, browser APIs)
- Destructure props in function signature
- Use `cn()` from `@/lib/utils` for conditional classes

```typescript
'use client'

import { cn } from '@/lib/utils'

interface CardProps {
  title: string
  className?: string
  children: React.ReactNode
}

export function Card({ title, className, children }: CardProps) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h2>{title}</h2>
      {children}
    </div>
  )
}
```

### API Routes

- Use Next.js App Router conventions (`route.ts`)
- Return `NextResponse.json()` for all responses
- Validate input with Zod schemas
- Use try/catch with proper error responses

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Validate and process...
    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### Error Handling

- Use custom error classes for domain errors (see `lib/ai/types.ts`)
- Always catch and handle errors appropriately
- Log errors with context: `console.error('[Context]', error)`
- Return user-friendly messages, log detailed errors

```typescript
try {
  await riskyOperation()
} catch (error) {
  console.error('[FeatureName]', error)
  throw new Error('Operation failed')
}
```

### Database (Prisma)

- Import client from `@/lib/prisma` (singleton pattern)
- Use transactions for multi-step operations
- Always include `onDelete: Cascade` on relations where appropriate

```typescript
import { prisma } from '@/lib/prisma'

const user = await prisma.user.findUnique({
  where: { clerkId },
  include: { projects: true },
})
```

## Key Technologies

| Technology | Purpose |
|------------|---------|
| Next.js 16 | App Router, React Server Components |
| React 19 | UI library |
| TypeScript 5 | Type safety |
| Prisma 5 | Database ORM (PostgreSQL) |
| Clerk | Authentication |
| Tailwind CSS 4 | Styling |
| shadcn/ui | UI component library |
| Zod | Schema validation |
| AI SDK | AI model integration |

## AI System (`lib/ai/`)

Multi-provider AI management with Groq (primary) and OpenRouter (fallback).

```typescript
import { getAIManager } from '@/lib/ai'

const ai = getAIManager()
const result = await ai.complete({
  messages: [{ role: 'user', content: 'Hello' }],
  useCase: 'chat',
})
```

Use cases: `chat`, `analysis`, `code-generation`, `summarization`, `extraction`, `vision`, `fast-response`, `high-quality`, `cost-effective`

## Verification Checklist

Before committing changes, verify:

1. `npx tsc --noEmit` - No TypeScript errors
2. `pnpm lint` - No ESLint errors  
3. `pnpm build` - Production build succeeds
4. Test affected functionality manually
