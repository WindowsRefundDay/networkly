# SERVER ACTIONS

Centralized server-side mutations with Clerk auth and Zod validation.

## OVERVIEW

Server Actions for all data mutations across User, Profile, Projects, Goals, Activities, and Network features. Located in `app/actions/` (non-standard location).

## STRUCTURE

```
app/actions/
├── activity.ts       # Activity feed CRUD
├── connections.ts    # Network connection management
├── goals.ts          # User goals CRUD
├── onboarding.ts     # User onboarding flow
├── profile.ts        # Profile updates (main)
├── profile-items.ts  # Skills, projects, education, experience
├── projects.ts       # Project CRUD (506L - bloated)
├── user.ts           # User account management
└── (others)/         # Feature-specific actions
```

## CONVENTIONS

### Standard Action Pattern

All actions follow this template:

```typescript
'use server'

import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

const schema = z.object({
  field: z.string().min(1),
})

export async function updateThing(input: z.infer<typeof schema>) {
  // 1. Auth check
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // 2. Rate limit
  await checkRateLimit(userId, 'thing-update')

  // 3. Validation
  const data = schema.parse(input)

  // 4. DB operation
  const result = await prisma.thing.update({
    where: { userId },
    data,
  })

  // 5. Return
  return { success: true, data: result }
}
```

### Error Handling

```typescript
try {
  await riskyOperation()
  return { success: true }
} catch (error) {
  console.error('[ActionName]', error)
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  }
}
```

### Rate Limiting

Actions use Redis-backed rate limiting:

```typescript
import { checkRateLimit } from '@/lib/rate-limit'

// 10 requests per minute
await checkRateLimit(userId, 'profile-update', { max: 10, window: 60 })
```

## ANTI-PATTERNS

**NEVER:**
- Skip `auth()` check at action start
- Return raw Prisma errors to client
- Mix validation libraries (Zod only)
- Perform unvalidated DB operations

**ALWAYS:**
- Mark file with `'use server'` directive
- Use Zod schemas for input validation
- Import Prisma from `@/lib/prisma` singleton
- Return `{ success, data?, error? }` shape

## WHERE TO LOOK

| Entity | File | Notes |
|--------|------|-------|
| User profile | `profile.ts` | Main profile fields |
| Skills/Projects | `profile-items.ts` | Nested profile data |
| Projects | `projects.ts` | 506L - needs split |
| Goals | `goals.ts` | User goal tracking |
| Network | `connections.ts` | Connection requests |
| Activity | `activity.ts` | Feed mutations |

## NOTES

- **Location** — Actions in `app/actions/` not root `actions/` (non-standard but functional)
- **Testing** — Tested in `__tests__/profile/actions/` with per-file Prisma mocks
- **Rate limits** — Defined per-action, check `lib/rate-limit.ts` for limits
