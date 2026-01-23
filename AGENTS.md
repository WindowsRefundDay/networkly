# NETWORKLY KNOWLEDGE BASE

**Generated:** 2026-01-16T01:42:00Z  
**Commit:** a46f470  
**Branch:** networkly-main

## OVERVIEW

AI-powered professional networking platform. Next.js 16 + Prisma + multi-provider AI (Groq/Gemini/OpenRouter) + embedded Python scraper.

## STRUCTURE

```
app/
├── actions/          # Server Actions (see app/actions/AGENTS.md)
├── api/              # API routes (chat, discovery, AI management)
├── (features)/       # Pages: dashboard, profile, network, opportunities, etc.
components/
├── ui/               # shadcn/ui primitives (see components/ui/AGENTS.md)
├── assistant/        # Chat interface (633L complexity hotspot)
├── discovery/        # Real-time opportunity discovery UI
├── (features)/       # Feature-specific components
hooks/                # Custom hooks (see hooks/AGENTS.md)
lib/
├── ai/               # Multi-provider AI system (see lib/ai/AGENTS.md)
├── prisma.ts         # DB singleton
├── utils.ts          # cn() utility
ec-scraper/           # Python discovery engine (polyglot repo)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| AI completions/chat | `lib/ai/` | Use `getAIManager()` singleton |
| Server-side mutations | `app/actions/` | Clerk auth + Zod validation |
| API routes | `app/api/` | Chat, discovery streaming (SSE) |
| Real-time discovery | `hooks/use-discovery-layers.ts` | 550L state machine |
| Chat UI | `components/assistant/chat-interface.tsx` | 633L - refactor candidate |
| UI primitives | `components/ui/` | shadcn/ui + GlassCard |
| Auth proxy | `proxy.ts` | **Next.js 16**: Correct naming (was `middleware.ts` in v15) |
| Database schema | `prisma/schema.prisma` | PostgreSQL ORM |
| Mock data | `lib/mock-data.ts` | 673L - split recommended |

## CRITICAL DEVIATIONS

| Issue | Current | Standard (Next.js 16) | Fix |
|-------|---------|----------|-----|
| **CORRECT** ✓ | `proxy.ts` | `proxy.ts` (v16+) | Already using correct naming |
| Actions location | `app/actions/` | `actions/` (root) | Acceptable but non-standard |
| Build errors | `ignoreBuildErrors: true` | `false` | Allows type errors in prod |
| Polyglot repo | Python in `ec-scraper/` | Separate repo/monorepo | Document or extract |
| Package managers | `bun.lock` + `pnpm-lock.yaml` | Single manager | Remove one |

## CONVENTIONS

### Import Order
1. React/Next.js (`react`, `next/*`)
2. External (`@clerk/*`, `@radix-ui/*`, `zod`)
3. Internal (`@/lib/*`, `@/components/*`, `@/hooks/*`)
4. Relative (`./`, `../`)

### Naming
- Files (components): `kebab-case.tsx`
- Files (hooks): `use-kebab-case.ts`
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE`

### AI System
- **Never call providers directly** — Use `getAIManager()`
- **Use-case routing** — Pass `useCase: 'chat' | 'analysis' | 'fast-response'` etc.
- **Cost tracking** — Built-in, view with `pnpm costs`

### Styling
- **Tailwind CSS 4** with `@theme inline` in `globals.css`
- **OKLCH colors** — Not hex/rgb (perceptually uniform)
- **Glassmorphism** — Use `GlassCard` from `components/ui`
- **cn()** — Always use for conditional classes

### Database
- **Singleton only** — `import { prisma } from '@/lib/prisma'`
- **Server Actions** — Preferred over direct API routes for mutations
- **Transactions** — Multi-step ops use `prisma.$transaction`

### Testing
- **Vitest + React Testing Library** — Tests in `__tests__/`
- **Per-file Prisma mocks** — No global mock
- **Integration tests** — `__tests__/(feature)/integration/`

## ANTI-PATTERNS (THIS PROJECT)

**NEVER:**
- Call AI providers directly (Groq/Gemini/OpenRouter SDKs) — Use `getAIManager()`
- Use `as any`, `@ts-ignore`, `@ts-expect-error` — Type errors are allowed in build but should be fixed
- Import Prisma from anywhere except `@/lib/prisma`
- Hardcode colors — Use OKLCH variables from `globals.css`
- Mix package managers — Stick to `pnpm`

**ALWAYS:**
- Use `cn()` for class merging
- Validate server action input with Zod
- Check `auth()` in server actions before DB ops
- Use `'use client'` only when needed (hooks, browser APIs)

## UNIQUE STYLES

### Hybrid Next.js/Python Architecture
- **API spawns Python** — `app/api/discovery/stream/route.ts` uses `child_process.spawn`
- **Shared DB** — Python scraper writes to same PostgreSQL via `DATABASE_URL`
- **Environment bridging** — API passes env vars from both root + `ec-scraper/.env`

### Real-Time Discovery (SSE)
- **Multi-layer streaming** — Query gen → web search → semantic filter → ranking
- **State machine** — `useDiscoveryLayers` manages complex event flow (550L)
- **Progress UI** — Components in `discovery/` show live updates

### AI Model Management
- **Use-case based** — System selects model based on task type, not manual choice
- **Auto-fallback** — Groq fails → OpenRouter → Gemini
- **Cost monitoring** — Every completion tracked in `data/ai-costs.json`

## COMMANDS

```bash
# Development
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build (ignores TS errors!)
pnpm lint             # ESLint check

# Type Checking
npx tsc --noEmit      # Verify TypeScript compiles

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio

# Testing
pnpm test             # Run Vitest in watch mode
pnpm test:run         # Single test run
pnpm test:coverage    # Coverage report

# AI Costs
pnpm costs            # Calculate AI API expenditures
pnpm costs:clear      # Reset cost tracking data

# Python Scraper (from ec-scraper/)
cd ec-scraper && hatch run discover <query>
```

## COMPLEXITY HOTSPOTS

**Refactor Candidates (>500L):**
1. `components/assistant/chat-interface.tsx` (633L) — Split into smaller components + hook
2. `hooks/use-discovery-layers.ts` (550L) — Extract `processEvent` reducer logic
3. `app/settings/page.tsx` (594L) — Move each section to own component
4. `lib/mock-data.ts` (673L) — Split into `mock/` directory by entity
5. `lib/ai/manager.ts` (603L) — Extract health monitor + factory pattern

## NOTES

- **Proxy naming** — `proxy.ts` is CORRECT for Next.js 16 (replaces `middleware.ts` from v15)
- **Build allows errors** — `next.config.mjs` has `ignoreBuildErrors: true`
- **Doc mismatch** — Structure uses flat dirs, not `(feature)/` route groups
- **Lock file conflict** — Both `bun.lock` and `pnpm-lock.yaml` present
- **Python integration** — Not microservice, runs as child process from API routes
