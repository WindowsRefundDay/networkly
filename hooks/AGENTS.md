# CUSTOM HOOKS

React hooks for AI chat, discovery, and shared logic.

## OVERVIEW

6 custom hooks providing cross-feature capabilities: AI integration, real-time discovery, and UI utilities.

## STRUCTURE

```
hooks/
├── use-ai-chat.ts            # AI chat integration hook
├── use-discovery-layers.ts   # Real-time discovery state machine (550L - complex)
├── use-has-mounted.ts        # Hydration safety
├── use-inline-discovery.ts   # Inline discovery overlay
├── use-media-query.ts        # Responsive breakpoints
└── use-reduced-motion.ts     # Accessibility (prefers-reduced-motion)
```

## WHERE TO LOOK

| Task | Hook | Notes |
|------|------|-------|
| AI chat | `use-ai-chat.ts` | Streaming responses, tool calls |
| Discovery | `use-discovery-layers.ts` | 550L state machine - SSE events |
| Inline search | `use-inline-discovery.ts` | Overlay UI for discovery |
| Hydration | `use-has-mounted.ts` | Prevent SSR/client mismatch |
| Responsive | `use-media-query.ts` | Match breakpoints |
| A11y motion | `use-reduced-motion.ts` | Respect user preferences |

## CONVENTIONS

### AI Chat Hook

```typescript
import { useAIChat } from '@/hooks/use-ai-chat'

export function ChatComponent() {
  const { messages, sendMessage, isLoading } = useAIChat({
    initialMessages: [],
    useCase: 'chat',
  })

  return (
    <div>
      {messages.map(msg => <div key={msg.id}>{msg.content}</div>)}
      <button onClick={() => sendMessage('Hello')} disabled={isLoading}>
        Send
      </button>
    </div>
  )
}
```

### Discovery Layers Hook

**Complex state machine for multi-layer discovery:**

```typescript
import { useDiscoveryLayers } from '@/hooks/use-discovery-layers'

export function DiscoveryUI() {
  const { 
    layers, 
    isProcessing, 
    startDiscovery,
    currentLayer 
  } = useDiscoveryLayers()

  return (
    <div>
      <button onClick={() => startDiscovery('AI Engineer')}>
        Discover
      </button>
      {layers.map(layer => (
        <LayerProgress key={layer.id} {...layer} />
      ))}
    </div>
  )
}
```

**Layers sequence:**
1. Query Generation
2. Web Search
3. Semantic Filter
4. AI Ranking
5. Results

### Hydration Safety

```typescript
import { useHasMounted } from '@/hooks/use-has-mounted'

export function ClientOnlyComponent() {
  const mounted = useHasMounted()
  
  if (!mounted) return null // Prevent hydration mismatch
  
  return <div>{window.location.href}</div>
}
```

### Responsive Breakpoints

```typescript
import { useMediaQuery } from '@/hooks/use-media-query'

export function ResponsiveComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  return isMobile ? <MobileView /> : <DesktopView />
}
```

## ANTI-PATTERNS

**NEVER:**
- Call AI providers directly from hooks - Use `useAIChat`
- Mutate discovery state externally - Hook manages internally
- Skip hydration checks for browser APIs
- Hardcode breakpoints - Use `useMediaQuery`

**ALWAYS:**
- Use `useHasMounted` before accessing `window`, `document`
- Use `useReducedMotion` before animating
- Handle loading/error states from `useAIChat`
- Respect `isProcessing` from `useDiscoveryLayers`

## COMPLEXITY HOTSPOTS

**use-discovery-layers.ts (550L)**
- Massive `processEvent` switch-case (lines 138-465)
- Complex SSE event handling
- Multi-layer state synchronization
- **Refactor**: Extract layer reducers to separate functions

## NOTES

- **Naming** — All hooks use `use-kebab-case.ts`
- **Testing** — Global navigation mocks in `__tests__/setup.ts`
- **Real-time** — Discovery hooks use SSE from `/api/discovery/stream`
