# AI SYSTEM

Multi-provider AI orchestration with automatic fallback and use-case based routing.

## OVERVIEW

Centralized AI management system supporting Gemini and OpenRouter with automatic provider fallback, cost tracking, and use-case based model selection.

## STRUCTURE

```
lib/ai/
├── manager.ts           # AIModelManager singleton (603L - dense)
├── model-configs.ts     # Model definitions and pricing (669L)
├── types.ts             # Zod schemas, domain errors
├── index.ts             # Public exports
├── providers/
│   ├── base.ts          # Abstract provider interface
│   ├── gemini.ts        # Google Gemini implementation
│   └── openrouter.ts    # OpenRouter implementation (543L)
├── tools/
│   ├── definitions.ts   # Tool schemas for function calling
│   ├── executors.ts     # Tool execution logic
│   └── index.ts
└── utils/
    ├── cost-tracker.ts  # AI usage cost monitoring
    ├── rate-limiter.ts  # Provider rate limiting
    ├── retry.ts         # Exponential backoff retry
    └── logger.ts        # AI-specific logging
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Initialize AI | `manager.ts` | Use `getAIManager()` singleton |
| Add new model | `model-configs.ts` | Define pricing + capabilities |
| Add provider | `providers/` | Extend `BaseAIProvider` |
| Define tools | `tools/definitions.ts` | Zod schemas for function calling |
| Track costs | `utils/cost-tracker.ts` | JSON-based cost logging |
| Custom errors | `types.ts` | `AIProviderError`, `RateLimitError` |

## CONVENTIONS

### Using the AI System

**Never call providers directly. Always use the manager:**

```typescript
import { getAIManager } from '@/lib/ai'

const ai = getAIManager()
const result = await ai.complete({
  messages: [{ role: 'user', content: 'Hello' }],
  useCase: 'chat', // Use-case routing
})
```

### Use Cases

System automatically selects optimal model based on use-case:

| Use Case | Model Priority | When to Use |
|----------|---------------|-------------|
| `chat` | Gemini 1.5 Flash | Interactive chat |
| `analysis` | Gemini 1.5 Pro | Code analysis, complex reasoning |
| `extraction` | Gemini 1.5 Flash | Structured data extraction |
| `fast-response` | Gemini 1.5 Flash | Quick replies |
| `high-quality` | Gemini 1.5 Pro | Best possible output |
| `cost-effective` | Gemini Flash models | Minimize API costs |

### Provider Fallback

Automatic cascade on failure:
1. **Gemini** (primary) - Fast, high quality
2. **OpenRouter** (fallback) - Multiple models

### Cost Tracking

Every completion logged to `data/ai-costs.json`:

```bash
pnpm costs          # View total costs
pnpm costs:clear    # Reset tracking
```

## ANTI-PATTERNS

**NEVER:**
- Import provider classes directly (`GeminiProvider`, `OpenRouterProvider`)
- Hardcode model names - Use `useCase` abstraction
- Skip error handling - AI calls can fail
- Ignore rate limits - Providers have strict limits

**ALWAYS:**
- Use `getAIManager()` singleton
- Specify `useCase` for optimal model selection
- Handle `AIProviderError` and `RateLimitError`
- Log AI interactions with `logger.ts`

## UNIQUE PATTERNS

### Health Monitoring

Manager continuously monitors provider health:
- Auto-disables failing providers
- Re-enables after cooldown period
- Logs health status to console

### Streaming Support

All providers support streaming responses:

```typescript
const stream = await ai.complete({
  messages: [...],
  useCase: 'chat',
  stream: true,
})

for await (const chunk of stream) {
  console.log(chunk.content)
}
```

### Tool Calling

Function calling support for all providers:

```typescript
import { getToolDefinitions } from '@/lib/ai/tools'

const result = await ai.complete({
  messages: [...],
  tools: getToolDefinitions(['discovery', 'network']),
  useCase: 'analysis',
})
```

## REFACTOR CANDIDATES

1. **manager.ts (603L)**: Extract health monitoring to `HealthMonitor` class
2. **model-configs.ts (669L)**: Split by provider into separate config files
3. **Provider initialization**: Move to factory pattern for cleaner setup
