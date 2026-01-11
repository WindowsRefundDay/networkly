# Networkly Frontend - Technical Documentation

**Last Updated:** January 11, 2026

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [AI Model Management System](#ai-model-management-system)
3. [Authentication Setup](#authentication-setup)
4. [Database Schema](#database-schema)
5. [Server Actions (APIs)](#server-actions-apis)
6. [Feature Implementation Status](#feature-implementation-status)
7. [Environment Variables](#environment-variables)

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.0.10 (App Router, Turbopack) |
| **Language** | TypeScript 5.x (strict mode) |
| **Styling** | TailwindCSS 4 + shadcn/ui components |
| **Authentication** | Clerk (with Prisma sync) |
| **Database** | PostgreSQL via Prisma ORM 5.22.0 |
| **AI Chat** | Multi-provider (Groq, OpenRouter) via custom AI SDK |
| **Package Manager** | pnpm |

---

## AI Model Management System

### Overview

The AI Model Management System (`lib/ai/`) provides a robust, modular architecture for integrating multiple AI providers with automatic fallback, rate limiting, health monitoring, and use-case based model selection.

### Architecture

```
lib/ai/
├── index.ts              # Main exports & singleton
├── types.ts              # TypeScript types & Zod schemas
├── manager.ts            # AIModelManager orchestration class
├── model-configs.ts      # Provider configurations (Groq/Gemini)
├── examples.ts           # Usage examples
├── providers/
│   ├── base.ts           # Abstract base provider class
│   ├── openrouter.ts     # OpenRouter provider
│   └── groq.ts           # Groq provider
└── utils/
    ├── logger.ts         # Structured logging
    ├── rate-limiter.ts   # Token bucket rate limiting
    └── retry.ts          # Exponential backoff & circuit breaker
```

### Main Exports

```typescript
// Manager
import { getAIManager, createAIManager, AIModelManager } from '@/lib/ai'

// Model Configuration
import {
  GROQ_CONFIG, GEMINI_CONFIG, MODEL_CONFIGS,
  GROQ_MODELS, GEMINI_MODELS,
  GROQ_USE_CASES, GEMINI_USE_CASES,
  AGENT_MODEL_RECOMMENDATIONS,
  getActiveConfig, setActiveConfig,
  getModelForUseCase, getAvailableModels,
  getModelsByQuality, getModelsBySpeed, getFreeModels,
} from '@/lib/ai'

// Types
import type {
  ProviderName, ModelInfo, UseCase, Message,
  CompletionOptions, CompletionResult, StreamChunk,
} from '@/lib/ai'

// Errors
import { AIProviderError, RateLimitError, ModelNotFoundError } from '@/lib/ai'
```

### AIModelManager Methods

| Method | Description |
|--------|-------------|
| `complete(options)` | Execute completion with automatic fallback |
| `stream(options)` | Stream completion with automatic fallback |
| `getAllModels()` | Get all models across all providers |
| `getProviderModels(name)` | Get models from specific provider |
| `getModel(fullModelId)` | Get model by full ID (provider:model) |
| `configureUseCase(config)` | Configure specific use case |
| `runHealthChecks()` | Run health checks on all providers |
| `getProviderStatuses()` | Get all provider statuses |
| `isProviderHealthy(name)` | Check if provider is healthy |
| `getHealthyProviders()` | Get list of healthy provider names |
| `shutdown()` | Stop health checks and cleanup |

### Groq Models (All FREE)

#### Tier 1: Top Performers (Production Ready)

| Model | Best For | Context | Speed |
|-------|----------|---------|-------|
| `openai/gpt-oss-120b` | Best overall (90% MMLU) | 131K | 500 t/s |
| `llama-3.3-70b-versatile` | Best production (86% MMLU) | 131K | 280 t/s |

#### Tier 2: Strong Mid-Range (Production Ready)

| Model | Best For | Context | Speed |
|-------|----------|---------|-------|
| `llama-3.1-8b-instant` | Fastest/Value (560 t/s) | 131K | 560 t/s |
| `openai/gpt-oss-20b` | Smaller GPT | 131K | 1000 t/s |

#### Tier 3: Preview Models (May Be Discontinued)

| Model | Best For | Context | Speed |
|-------|----------|---------|-------|
| `meta-llama/llama-4-maverick-17b-128e-instruct` | Creative content | 131K | 600 t/s |
| `meta-llama/llama-4-scout-17b-16e-instruct` | Quality/speed balance | 131K | 750 t/s |
| `qwen/qwen3-32b` | Code generation | 131K | 400 t/s |
| `moonshotai/kimi-k2-instruct-0905` | Long context (262K) | 262K | 200 t/s |

#### Tier 4: Specialized Models

| Model | Purpose |
|-------|---------|
| `groq/compound` | Agentic tool use (450 t/s) |
| `meta-llama/llama-guard-4-12b` | Content safety (1200 t/s) |
| `whisper-large-v3` | Speech-to-text |
| `whisper-large-v3-turbo` | Fast speech-to-text |

### Use Case Model Mapping

| Use Case | Primary Model | Fallbacks |
|----------|---------------|-----------|
| `chat` | openai/gpt-oss-120b | llama-3.3-70b, 8b-instant |
| `analysis` | kimi-k2-instruct-0905 | qwen3-32b, gpt-oss-120b |
| `code-generation` | qwen/qwen3-32b | gpt-oss-120b, llama-3.3 |
| `summarization` | llama-3.1-8b-instant | gpt-oss-20b, llama-4-scout |
| `extraction` | groq/compound | llama-3.3, qwen3-32b |
| `fast-response` | llama-3.1-8b-instant | gpt-oss-20b, compound |
| `high-quality` | llama-4-maverick | gpt-oss-120b, kimi-k2 |
| `cost-effective` | llama-3.1-8b-instant | gpt-oss-20b, llama-3.3 |

### Agent Model Recommendations

| Agent Role | Model | Reason |
|------------|-------|--------|
| **Planner** | `openai/gpt-oss-120b` | Best reasoning (90% MMLU) |
| **Coder** | `qwen/qwen3-32b` | Strong coding performance |
| **Researcher** | `moonshotai/kimi-k2-instruct-0905` | 262K context for long docs |
| **Router** | `llama-3.1-8b-instant` | Fastest (560 t/s) |
| **Tool User** | `groq/compound` | Built for agentic tool use |
| **Writer** | `meta-llama/llama-4-maverick-17b` | Creative excellence |
| **Extractor** | `groq/compound` | Structured extraction |
| **Summarizer** | `llama-3.1-8b-instant` | Fast and effective |
| **Moderator** | `meta-llama/llama-guard-4-12b` | Content safety |

### Usage Examples

#### Basic Completion

```typescript
import { getAIManager } from '@/lib/ai'

const ai = getAIManager()
const result = await ai.complete({
  messages: [{ role: 'user', content: 'Hello!' }],
  useCase: 'chat',
})
console.log(result.content)
```

#### Streaming Response

```typescript
for await (const chunk of ai.stream({
  messages: [{ role: 'user', content: 'Tell me a story' }],
  useCase: 'chat',
})) {
  process.stdout.write(chunk.content)
}
```

#### Switch Provider Config

```typescript
import { setActiveConfig, getActiveConfig } from '@/lib/ai'

setActiveConfig('groq')   // Use Groq (free)
setActiveConfig('gemini') // Use Gemini

const config = getActiveConfig()
console.log(config.displayName) // "Groq (Free)"
```

#### Error Handling

```typescript
import { RateLimitError, AIProviderError } from '@/lib/ai'

try {
  const result = await ai.complete({ messages, useCase: 'chat' })
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`)
  } else if (error instanceof AIProviderError) {
    console.log(`Provider error: ${error.message}`)
  }
}
```

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Chat completion with streaming |
| `/api/chat` | GET | Health check for providers |
| `/api/ai/complete` | POST | Generic completion endpoint |
| `/api/ai/models` | GET | List available models |
| `/api/ai/health` | GET | Detailed health checks |

### React Hooks

```typescript
import { useAIChat, useAICompletion } from '@/hooks/use-ai-chat'

// Chat hook
const { messages, input, setInput, sendMessage, isLoading, stop, clear, reload } = useAIChat({
  useCase: 'chat',
})

// Completion hook
const { complete, isLoading, result, error } = useAICompletion({
  useCase: 'code-generation',
})
```

---

## Authentication Setup

### Clerk Configuration

**ClerkProvider Props** (in `app/layout.tsx`):
```tsx
<ClerkProvider
  signInUrl="/login"
  signUpUrl="/signup"
  signInFallbackRedirectUrl="/dashboard"
  signUpFallbackRedirectUrl="/dashboard"
>
```

**Route Structure:**
- `/login/[[...sign-in]]/page.tsx` - Catch-all route for Clerk SignIn
- `/signup/[[...sign-up]]/page.tsx` - Catch-all route for Clerk SignUp

**Middleware** (`middleware.ts`):
```typescript
const isPublicRoute = createRouteMatcher([
    "/",
    "/login(.*)",
    "/signup(.*)",
    "/api/webhooks(.*)",
])

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect()
    }
})
```

**Auto-Sync:** When a user authenticates with Clerk but doesn't exist in the database, they are automatically synced via `syncUserFromClerk()` in the dashboard page.

---

## Database Schema

### Core Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| **User** | User profiles linked to Clerk | `clerkId`, `email`, `name`, `skills[]`, `interests[]` |
| **Opportunity** | Job/internship/fellowship listings | `title`, `company`, `deadline`, `skills[]`, `category` |
| **UserOpportunity** | User-opportunity relationship | `matchScore`, `matchReasons`, `status` |
| **UserGoal** | User career goals | `goalText`, `roadmap`, `filters` |
| **Project** | User project showcase | `title`, `status`, `visibility`, `tags[]` |
| **Connection** | Network connections | `requesterId`, `receiverId`, `status` |
| **Message** | Direct messages | `senderId`, `receiverId`, `content`, `unread` |
| **Application** | Job application tracker | `company`, `position`, `status` |

### Supporting Models

| Model | Purpose |
|-------|---------|
| **ProjectCollaborator** | Many-to-many: Users ↔ Projects |
| **ProjectUpdate** | Activity feed for projects |
| **Achievement** | User profile achievements |
| **Extracurricular** | User activities/roles |
| **Recommendation** | User recommendations |
| **AnalyticsData** | Profile views, network growth |
| **Event** | Networking events |
| **ChatLog** | AI assistant history |

---

## Server Actions (APIs)

All server actions are located in `/app/actions/` and use the `"use server"` directive.

### User Actions (`user.ts`)

| Function | Description |
|----------|-------------|
| `getCurrentUser()` | Get authenticated user's profile |
| `getUserAnalytics()` | Get profile views, network growth |
| `updateUserProfile(data)` | Update user profile fields |
| `syncUserFromClerk(clerkUser)` | Upsert user from Clerk |

### Connections Actions (`connections.ts`)

| Function | Description |
|----------|-------------|
| `getConnections()` | Get all user connections |
| `getSuggestedConnections()` | Get AI-suggested connections |
| `sendConnectionRequest(receiverId)` | Send a connection request |
| `acceptConnectionRequest(id)` | Accept a pending request |
| `removeConnection(id)` | Remove an existing connection |

### Messages Actions (`messages.ts`)

| Function | Description |
|----------|-------------|
| `getMessages()` | Get all messages (inbox preview) |
| `getConversation(otherUserId)` | Get full conversation thread |
| `sendMessage(receiverId, content)` | Send a new message |

### Opportunities Actions (`opportunities.ts`)

| Function | Description |
|----------|-------------|
| `getOpportunities()` | Get all opportunities |
| `getOpportunitiesWithSaved()` | Get with user's saved status |
| `toggleSaveOpportunity(id)` | Save/unsave an opportunity |

### Projects Actions (`projects.ts`)

| Function | Description |
|----------|-------------|
| `getProjects()` | Get all projects |
| `createProject(data)` | Create new project |
| `updateProject(id, data)` | Update project |
| `deleteProject(id)` | Delete project |

---

## Feature Implementation Status

### ✅ Fully Implemented

| Feature | Location |
|---------|----------|
| User Authentication | Clerk + auto-sync |
| Dashboard | `/dashboard` |
| Profile Management | `/profile` |
| Network/Connections | `/network` |
| Messaging | `/network` (Messages panel) |
| Opportunities Discovery | `/opportunities` |
| Project Showcase | `/projects` |
| AI Assistant Chat | `/assistant` |
| Analytics Dashboard | `/analytics` |
| Settings | `/settings` |
| Events Calendar | `/events` |

### 🔄 Partially Implemented

| Feature | What's Missing |
|---------|----------------|
| AI Match Scoring | Real AI-based matching algorithm |
| Mutual Connections | Actual calculation |
| Notification System | Push/in-app notifications |

### ❌ Not Yet Implemented

| Feature | Description |
|---------|-------------|
| Real-time Messaging | WebSocket/SSE for live chat |
| File Uploads | Project images, resumes |
| OAuth Connections | LinkedIn, GitHub integration |
| Calendar Sync | Google/Outlook integration |

---

## Environment Variables

Required in `.env` or `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# AI Providers (at least one required)
GROQ_API_KEY="gsk_..."              # Free tier - recommended
OPENROUTER_API_KEY="sk-or-..."      # Optional - for premium models

# AI Settings (optional)
AI_TIMEOUT=30000                     # Request timeout (ms)
AI_MAX_RETRIES=3                     # Max retry attempts
AI_HEALTH_CHECKS=true                # Enable health monitoring
AI_HEALTH_CHECK_INTERVAL=60000       # Health check interval (ms)
AI_LOGGING=true                      # Enable logging
AI_LOG_LEVEL=info                    # debug, info, warn, error

# Provider-specific (optional)
GROQ_DEFAULT_MODEL=llama-3.3-70b-versatile
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## File Structure

```
app/
├── actions/              # Server actions
├── api/
│   ├── chat/             # AI chat endpoint
│   └── ai/               # AI management endpoints
├── dashboard/
├── login/[[...sign-in]]/
├── signup/[[...sign-up]]/
├── network/
├── opportunities/
├── projects/
├── profile/
├── analytics/
├── assistant/
├── events/
└── settings/

components/
├── dashboard/
├── network/
├── opportunities/
├── projects/
├── profile/
├── analytics/
├── assistant/
├── discovery/
├── layout/
└── ui/                   # shadcn/ui components

hooks/
├── use-ai-chat.ts        # AI chat hooks
└── use-media-query.ts

lib/
├── ai/                   # AI Model Management System
│   ├── index.ts
│   ├── types.ts
│   ├── manager.ts
│   ├── model-configs.ts
│   ├── providers/
│   └── utils/
├── prisma.ts             # Prisma client singleton
└── utils.ts              # General utilities (cn, etc.)

prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Database seeding
```
