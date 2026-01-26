# Fix Gemini Provider Tool Calling

## Context

### Original Request
The AI assistant is broken - it's not making tool calls, not searching the database for ECs (opportunities), and not triggering the quick discovery flow. Instead, it's "making up" ECs.

### Interview Summary
**Key Discussions**:
- Confirmed the AI is using Gemini as primary provider for 'chat' use case
- User wants to fix Gemini provider only (OpenRouter not in scope)
- The fix should enable database search and web discovery trigger

**Research Findings**:
- Root cause identified: `GeminiProvider.complete()` and `GeminiProvider.stream()` do NOT pass `tools` or `toolChoice` to the AI SDK
- The AI SDK uses a different tool format than OpenAI (uses `inputSchema` with Zod, not `parameters` with JSON Schema)
- Need to convert OpenAI-style tool definitions to AI SDK format
- The `generateText` result includes `toolCalls` property which needs to be mapped to `CompletionResult.toolCalls`

### Metis Review
**Identified Gaps** (addressed):
- Tool format conversion: Need to convert OpenAI JSON Schema to AI SDK Zod-like format
- Result mapping: Need to extract `toolCalls` from AI SDK result
- Streaming tool calls: streamText may emit tool calls differently

---

## Work Objectives

### Core Objective
Enable the Gemini provider to pass tools to the AI SDK and return tool calls in the response, so the AI assistant can search the database and trigger web discovery.

### Concrete Deliverables
- Updated `lib/ai/providers/gemini.ts` with tool support in `complete()` method
- Updated `lib/ai/providers/gemini.ts` with tool support in `stream()` method  
- Tool conversion utility function to transform OpenAI tools to AI SDK format

### Definition of Done
- [ ] AI assistant can call `smart_search_opportunities` tool
- [ ] AI assistant can call `personalized_web_discovery` tool
- [ ] Tool calls show up in the chat interface (tool-status indicator)
- [ ] Opportunity cards render after database search
- [ ] Quick discovery confirmation appears when AI triggers it

### Must Have
- Tool definitions passed to `generateText()` and `streamText()`
- Tool calls extracted from AI SDK response and returned in `CompletionResult`
- Support for all 11 existing tools defined in `lib/ai/tools/definitions.ts`

### Must NOT Have (Guardrails)
- DO NOT modify the tool definitions format in `lib/ai/tools/definitions.ts`
- DO NOT modify the chat API route or tool executors
- DO NOT add Zod as a new dependency (already installed)
- DO NOT change OpenRouter provider
- DO NOT refactor beyond the minimal fix needed

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Vitest + React Testing Library)
- **User wants tests**: Manual verification for this fix
- **Framework**: Vitest

### Manual QA Verification

Each TODO includes detailed verification procedures for the AI chat flow.

**Primary Verification Method:**
1. Start dev server: `bun dev`
2. Open browser to `http://localhost:3000`
3. Navigate to AI Assistant page
4. Send test messages and verify tool calls happen

---

## Task Flow

```
Task 1 (Add tool conversion utility)
    ↓
Task 2 (Update complete() method)
    ↓
Task 3 (Update stream() method)
    ↓
Task 4 (End-to-end verification)
```

## Parallelization

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | None | Utility function first |
| 2 | 1 | Needs conversion utility |
| 3 | 2 | Same pattern as complete() |
| 4 | 3 | Full integration test |

---

## TODOs

- [ ] 1. Add tool conversion utility function

  **What to do**:
  - Create a `convertToolsToAISDK` function in `lib/ai/providers/gemini.ts`
  - Convert OpenAI-style tool definitions (`type: 'function', function: { name, description, parameters }`) to AI SDK format
  - The AI SDK expects tools as an object with tool names as keys, each having `description` and `parameters` (JSON Schema format works)
  - Use jsonSchema helper from 'ai' package to wrap the parameters

  **Must NOT do**:
  - Don't modify the source `AI_TOOLS` array
  - Don't add Zod schemas (use JSON Schema as-is with jsonSchema helper)

  **Parallelizable**: NO (foundation for other tasks)

  **References**:
  - `lib/ai/tools/definitions.ts:25-252` - Source tool definitions in OpenAI format
  - `lib/ai/types.ts:94-101` - ToolDefinition interface
  - AI SDK docs: Tools accept `description` and `parameters` (JSON Schema) without execute function for "manual tool calling"
  - AI SDK import: `import { jsonSchema } from 'ai'` to wrap JSON Schema

  **Acceptance Criteria**:
  - [ ] Function created: `convertToolsToAISDK(tools: ToolDefinition[]): Record<string, { description: string; parameters: ... }>`
  - [ ] Converts all 11 tools without errors
  - [ ] TypeScript compiles: `npx tsc --noEmit` in lib/ai/providers/gemini.ts → no new errors

  **Commit**: NO (groups with 2, 3)

---

- [ ] 2. Update `complete()` method to pass tools and return tool calls

  **What to do**:
  - In `complete()` method, check if `options.tools` is provided
  - Convert tools using `convertToolsToAISDK()`
  - Pass `tools` to `generateText()` call
  - Pass `toolChoice` (convert 'auto' | 'none' | specific to AI SDK format)
  - Extract `toolCalls` from result and include in `CompletionResult`
  - Set `finishReason: 'tool_calls'` when tool calls are present

  **Must NOT do**:
  - Don't change the function signature
  - Don't break existing functionality when no tools are provided

  **Parallelizable**: NO (depends on 1)

  **References**:
  - `lib/ai/providers/gemini.ts:198-272` - Current `complete()` implementation
  - `lib/ai/types.ts:103-128` - CompletionResult interface with toolCalls field
  - AI SDK generateText returns: `{ text, toolCalls, toolResults, finishReason, usage }`
  - AI SDK toolCalls format: `[{ toolCallId, toolName, args }]`

  **Acceptance Criteria**:
  - [ ] `generateText()` call includes `tools` parameter when provided
  - [ ] `result.toolCalls` is extracted and converted to OpenAI format
  - [ ] `CompletionResult.toolCalls` populated with: `{ id, type: 'function', function: { name, arguments } }`
  - [ ] `finishReason` set to `'tool_calls'` when tool calls present
  - [ ] TypeScript compiles: `npx tsc --noEmit` → no new errors in gemini.ts

  **Commit**: NO (groups with 1, 3)

---

- [ ] 3. Update `stream()` method to pass tools and handle tool calls

  **What to do**:
  - Similar to `complete()`, check if `options.tools` is provided
  - Convert tools using `convertToolsToAISDK()`
  - Pass `tools` to `streamText()` call
  - For streaming: tool calls may come before text content
  - After stream completes, check `result.toolCalls` promise
  - If tool calls present, yield them as a special chunk or set finishReason

  **Must NOT do**:
  - Don't change the generator function signature
  - Don't break existing streaming functionality

  **Parallelizable**: NO (depends on 2)

  **References**:
  - `lib/ai/providers/gemini.ts:277-348` - Current `stream()` implementation  
  - `lib/ai/types.ts:130-136` - StreamChunk interface
  - AI SDK streamText: `result.toolCalls` is a promise that resolves after stream
  - The chat route handles toolCalls in CompletionResult, not StreamChunk

  **Technical Note**:
  - The chat API route uses `ai.complete()` not `ai.stream()` for the tool loop
  - Streaming is done AFTER tool loop completes (for final response)
  - So stream() may not need full tool handling - verify in app/api/chat/route.ts

  **Acceptance Criteria**:
  - [ ] `streamText()` call includes `tools` parameter when provided
  - [ ] Stream continues to work correctly for text responses
  - [ ] TypeScript compiles: `npx tsc --noEmit` → no new errors

  **Commit**: YES
  - Message: `fix(ai): enable tool calling in Gemini provider`
  - Files: `lib/ai/providers/gemini.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 4. End-to-end verification in browser

  **What to do**:
  - Start development server
  - Test the AI assistant with various prompts
  - Verify tool calls are happening
  - Verify database search returns real opportunities
  - Verify quick discovery flow works

  **Parallelizable**: NO (final verification)

  **References**:
  - `app/(features)/assistant/page.tsx` - AI Assistant page
  - `components/assistant/chat-interface.tsx` - Chat interface handling

  **Manual Execution Verification:**
  
  **Test 1: Database Search**
  - [ ] Navigate to: `http://localhost:3000/assistant`
  - [ ] Send message: "Find me STEM internships"
  - [ ] Verify: Tool status shows "Finding personalized opportunities for you..."
  - [ ] Verify: Opportunity cards appear in response
  - [ ] Verify: Opportunities have real titles (not made up)

  **Test 2: Quick Discovery Flow**
  - [ ] Send message: "Find me quantum computing research programs"
  - [ ] If no results: Verify AI asks "Would you like me to look across the web?"
  - [ ] Verify: Web discovery confirmation UI appears
  
  **Test 3: Profile-Aware Search**
  - [ ] Send message: "What opportunities match my interests?"
  - [ ] Verify: Tool status shows activity
  - [ ] Verify: Response mentions user's actual interests/skills

  **Evidence Required:**
  - [ ] Screenshot of tool status indicator appearing
  - [ ] Screenshot of opportunity cards rendering
  - [ ] Console log showing no errors

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 3 | `fix(ai): enable tool calling in Gemini provider` | `lib/ai/providers/gemini.ts` | `npx tsc --noEmit` |

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit  # TypeScript compiles without errors
bun dev           # Development server starts
```

### Final Checklist
- [ ] Tool calls happen when AI needs to search (visible in tool-status)
- [ ] Database opportunities render in chat (not made-up data)
- [ ] Quick discovery prompt appears when no results found
- [ ] No TypeScript errors introduced
- [ ] Existing chat functionality still works

---

## Technical Implementation Notes

### AI SDK Tool Format

The AI SDK expects tools in this format:
```typescript
const tools = {
  toolName: {
    description: 'What the tool does',
    parameters: jsonSchema({
      type: 'object',
      properties: { ... },
      required: [...],
    }),
    // NO execute function - we handle execution in chat route
  }
}
```

### Converting OpenAI Tools to AI SDK

```typescript
import { jsonSchema } from 'ai'

function convertToolsToAISDK(tools: ToolDefinition[]) {
  const result: Record<string, { description: string; parameters: any }> = {}
  for (const tool of tools) {
    result[tool.function.name] = {
      description: tool.function.description,
      parameters: jsonSchema(tool.function.parameters),
    }
  }
  return result
}
```

### Extracting Tool Calls from AI SDK Result

```typescript
// AI SDK returns:
result.toolCalls = [
  { toolCallId: 'xxx', toolName: 'smart_search', args: { query: '...' } }
]

// Convert to OpenAI format:
const toolCalls = result.toolCalls?.map(tc => ({
  id: tc.toolCallId,
  type: 'function' as const,
  function: {
    name: tc.toolName,
    arguments: JSON.stringify(tc.args),
  }
}))
```
