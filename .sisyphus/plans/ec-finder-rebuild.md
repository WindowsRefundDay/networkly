# EC Finder AI Assistant Integration Rebuild

## Context

### Original Request
Fix the broken EC Finder integration in the AI Assistant. The code exists but nothing works - tool calling doesn't fire, cards don't render, discovery popup never appears. When asking "Find me robotics opportunities", the AI responds but no tool calls happen.

### Interview Summary
**Key Discussions**:
- User wants complete rebuild/fix (not just patches)
- Current behavior: AI responds but no tool calls fire
- Root cause: Missing wiring + Supabase type errors (discovered during LSP analysis)
- Scope: Full integration - tools + cards + discovery popup + discovery display
- Testing: Manual verification in browser with local dev server

**Critical Discovery During Planning**:
LSP diagnostics revealed **massive TypeScript errors** across the codebase:
- `lib/ai/tools/executors.ts`: 68+ errors - "Property does not exist on type 'never'"
- `app/actions/opportunities.ts`: 95+ errors - same pattern
- `app/actions/profile-items.ts`: multiple type assignment errors

This indicates **Supabase types are out of sync with database schema**, causing runtime failures.

### Research Findings
**Existing Infrastructure (all implemented but broken)**:
| Component | Path | Lines | Status |
|-----------|------|-------|--------|
| Tool definitions | `lib/ai/tools/definitions.ts` | 268 | 10 tools defined |
| Tool executors | `lib/ai/tools/executors.ts` | 797 | TYPE ERRORS |
| Chat API route | `app/api/chat/route.ts` | 470 | Has tool loop |
| Chat interface | `components/assistant/chat-interface.tsx` | 708 | Processes SSE |
| Opportunity cards | `components/assistant/opportunity-card-inline.tsx` | 270 | Ready |
| Discovery hook | `hooks/use-inline-discovery.ts` | 255 | SSE client |
| Discovery confirm | `components/assistant/action-buttons.tsx` | 106 | WebDiscoveryConfirm |
| System prompt | `app/api/chat/route.ts:20-95` | - | Comprehensive |

---

## Work Objectives

### Core Objective
Rebuild the EC Finder integration so that asking the AI Assistant about opportunities triggers the correct tools, renders opportunity cards in chat, offers web discovery when needed, and navigates to the Opportunities page correctly.

### Concrete Deliverables
1. Working tool calling when user asks for opportunities
2. Opportunity cards rendered in chat messages
3. WebDiscoveryConfirm popup appearing when no DB results found
4. Discovered opportunities displayed with real-time progress
5. "Details" button navigating to `/opportunities?highlight=ID`

### Definition of Done
- [ ] `pnpm dev` && navigate to AI Assistant
- [ ] Ask "Find me robotics opportunities" → tool status appears → cards render
- [ ] Ask for something not in DB → WebDiscoveryConfirm popup appears
- [ ] Confirm discovery → progress shows → cards appear as found
- [ ] Click "Details" on any card → navigates to `/opportunities?highlight=ID`

### Must Have
- Supabase types regenerated and matching database
- Tool calling firing correctly for opportunity-related queries
- OpportunityCardInline rendering with all buttons working
- Discovery popup appearing when appropriate
- End-to-end flow verified manually

### Must NOT Have (Guardrails)
- No modifications to Python scraper (`ec-scraper/`)
- No database schema changes
- No new tool creation (use existing 10 tools)
- No UI redesign (use existing components)
- No adding `@ts-ignore` or `as any` to suppress type errors
- No disabling ESLint rules

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Vitest configured)
- **User wants tests**: Manual-only
- **Framework**: N/A for this work

### Manual QA Only

Each TODO includes detailed verification procedures using browser testing.

**By Deliverable Type:**
| Type | Verification Tool | Procedure |
|------|------------------|-----------|
| **API Route** | Browser DevTools | Network tab → check request/response |
| **SSE Stream** | Browser DevTools | EventStream viewer |
| **Frontend/UI** | Browser | Navigate, interact, verify visually |
| **Type Fixes** | Terminal | `npx tsc --noEmit` |

---

## Task Flow

```
Task 0 (Fix types) → Task 1 (Verify AI manager) → Task 2 (Debug tool loop)
                                                          ↓
Task 3 (Fix card rendering) ← Task 2 success
                                                          ↓
Task 4 (Fix discovery popup) ← Task 3 success
                                                          ↓
Task 5 (Fix discovery display) ← Task 4 success
                                                          ↓
Task 6 (End-to-end verification) ← All prior complete
```

## Parallelization

| Task | Depends On | Reason |
|------|------------|--------|
| 0 | None | Must fix types before any other work |
| 1 | 0 | Needs working types to verify AI manager |
| 2 | 1 | Needs working AI manager |
| 3 | 2 | Needs tool results to render |
| 4 | 3 | Discovery only needed if search returns empty |
| 5 | 4 | Discovery display needs working popup |
| 6 | All | Final verification |

---

## TODOs

### Phase 1: Foundation Fixes

- [ ] 0. Regenerate Supabase Types to Fix 'never' Errors

  **What to do**:
  - Run `npx supabase gen types typescript --project-id PROJECT_ID > lib/database.types.ts`
  - OR manually verify and fix type definitions in `lib/database.types.ts`
  - Ensure all table types (opportunities, user_opportunities, users, extracurriculars) are correctly defined
  - Run `npx tsc --noEmit` to verify errors are resolved

  **Must NOT do**:
  - Do not use `as any` or `@ts-ignore` to suppress errors
  - Do not modify the database schema

  **Parallelizable**: NO (foundation for all other tasks)

  **References**:
  - `lib/database.types.ts` - Current (broken) type definitions
  - `lib/supabase/server.ts` - How Supabase client is created
  - Supabase dashboard - Get actual table schemas for reference
  - `lib/ai/tools/executors.ts:20-60` - See which properties are expected on user/profile

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Terminal: `npx tsc --noEmit`
    - Expected: No errors in `lib/ai/tools/executors.ts`
    - Expected: No errors in `app/actions/opportunities.ts`
    - Expected: No errors in `app/actions/profile-items.ts`
  - [ ] File check: `lib/database.types.ts` contains proper table definitions for:
    - `opportunities` table with all fields (id, title, company, location, etc.)
    - `users` table with skills, interests, location
    - `user_profiles` table with career_goals, grade_level, etc.
    - `extracurriculars` table with title, organization, type, etc.

  **Commit**: YES
  - Message: `fix(types): regenerate Supabase types to match database schema`
  - Files: `lib/database.types.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 1. Verify AI Manager Initialization and Tool Passing

  **What to do**:
  - Add console.log statements to `app/api/chat/route.ts` to debug:
    1. Line ~164: Log `ai` object after `getAIManager()`
    2. Line ~219: Log `AI_TOOLS` being passed to `ai.complete()`
    3. Line ~229: Log `result` to see if `toolCalls` is present
  - Check that `getAIManager()` returns a valid manager with working providers
  - Verify `AI_TOOLS` import resolves correctly and contains 10 tools
  - Run dev server and trigger a chat to see console output

  **Must NOT do**:
  - Do not modify the AI manager core logic yet
  - Do not change tool definitions

  **Parallelizable**: NO (depends on Task 0)

  **References**:
  - `app/api/chat/route.ts:164-230` - Where AI manager is used and tools are passed
  - `lib/ai/index.ts` - Exports `getAIManager`
  - `lib/ai/manager.ts` - AIModelManager singleton implementation
  - `lib/ai/tools/index.ts` - Exports `AI_TOOLS`
  - `lib/ai/tools/definitions.ts` - Tool schemas

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Run `pnpm dev`, open browser DevTools console (server logs)
  - [ ] Ask "Find me robotics opportunities" in AI Assistant
  - [ ] Server logs show:
    - `[DEBUG] AI Manager initialized: { providers: [...], healthy: true }`
    - `[DEBUG] Tools passed: 10 tools`
    - Either `[DEBUG] Result toolCalls: [...]` OR `[DEBUG] Result toolCalls: undefined`
  - [ ] Based on output, identify where the breakdown occurs

  **Commit**: NO (debugging only)

---

- [ ] 2. Fix Tool Calling Loop in Chat API

  **What to do**:
  - Based on Task 1 findings, fix the tool calling issue
  - Common fixes:
    1. If `AI_TOOLS` is undefined: Fix import path
    2. If `toolCalls` always undefined: Check if `toolChoice: 'auto'` is being passed
    3. If AI not recognizing opportunity queries: Enhance system prompt
  - Ensure the tool loop (lines 215-320) executes correctly:
    - Tool call detected → `executeTool()` called → result added to messages → loop continues
  - Add proper error handling and logging

  **Must NOT do**:
  - Do not create new tools (use existing 10)
  - Do not change the overall streaming architecture

  **Parallelizable**: NO (depends on Task 1)

  **References**:
  - `app/api/chat/route.ts:215-320` - Tool calling loop
  - `app/api/chat/route.ts:20-95` - System prompt (may need enhancement)
  - `lib/ai/tools/executors.ts:747-795` - `executeTool()` switch statement
  - `lib/ai/types.ts:90-91` - Tool-related type definitions

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Run `pnpm dev`, open AI Assistant
  - [ ] Ask "Find me robotics opportunities"
  - [ ] Browser DevTools Network tab shows:
    - POST to `/api/chat`
    - Response stream contains `tool-status` event (e.g., "Finding personalized opportunities...")
  - [ ] Server logs show:
    - Tool call detected: `smart_search_opportunities`
    - Tool executed successfully with results
  - [ ] If no results in DB, logs show `trigger_discovery` event being sent

  **Commit**: YES
  - Message: `fix(chat): enable tool calling loop for opportunity queries`
  - Files: `app/api/chat/route.ts`
  - Pre-commit: Test with manual browser verification

---

### Phase 2: Frontend Integration

- [ ] 3. Fix Opportunity Card Rendering in Chat

  **What to do**:
  - Verify `chat-interface.tsx` correctly processes `opportunities` SSE events
  - Check that `OpportunityGrid` receives and renders opportunities
  - Ensure `MarkdownMessage` correctly handles `{{card:id}}` syntax
  - Debug the flow:
    1. SSE event with `type: 'opportunities'` received
    2. `accumulatedOpportunities` updated
    3. Message state updated with `opportunities` array
    4. `OpportunityGrid` renders cards
  - Fix any issues in event processing or state updates

  **Must NOT do**:
  - Do not redesign the card component
  - Do not change the `{{card:id}}` syntax

  **Parallelizable**: NO (depends on Task 2)

  **References**:
  - `components/assistant/chat-interface.tsx:269-281` - Opportunities event handling
  - `components/assistant/chat-interface.tsx:612-621` - OpportunityGrid rendering
  - `components/assistant/opportunity-card-inline.tsx:74-236` - Card component
  - `components/assistant/opportunity-card-inline.tsx:248-269` - Grid component
  - `components/assistant/markdown-message.tsx:107` - Inline card rendering

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Run `pnpm dev`, open AI Assistant
  - [ ] Ask "Find me robotics opportunities" (assuming DB has results after Task 2)
  - [ ] Observe:
    - Loading status appears ("Finding personalized opportunities...")
    - AI responds with text message
    - Below the message bubble, opportunity cards appear in a grid
    - Each card shows: title, organization, location, type badge
    - "Apply Now" button visible (if opportunity has URL)
    - "Bookmark" button visible and clickable
    - "Details" button visible
  - [ ] Click "Bookmark" on a card
    - Button changes to "Saved" state
    - Confirmation message appears

  **Commit**: YES
  - Message: `fix(chat): wire opportunity card rendering from SSE events`
  - Files: `components/assistant/chat-interface.tsx`
  - Pre-commit: Manual browser verification

---

- [ ] 4. Fix WebDiscoveryConfirm Popup

  **What to do**:
  - Trace the discovery trigger flow:
    1. AI calls `personalized_web_discovery` or `trigger_web_discovery` tool
    2. Tool returns `{ triggerDiscovery: true, query: "..." }`
    3. API sends `trigger_discovery` SSE event
    4. Frontend sets `pendingDiscoveryQuery` state
    5. `WebDiscoveryConfirm` renders
  - Debug each step to find where the breakdown occurs
  - Ensure the popup appears when:
    - Database search returns 0 results AND
    - AI decides to suggest web discovery

  **Must NOT do**:
  - Do not auto-trigger discovery without user consent
  - Do not change the popup design

  **Parallelizable**: NO (depends on Task 3)

  **References**:
  - `app/api/chat/route.ts:252-263` - trigger_discovery event emission
  - `components/assistant/chat-interface.tsx:284-289` - trigger_discovery handling
  - `components/assistant/chat-interface.tsx:643-655` - WebDiscoveryConfirm rendering
  - `components/assistant/action-buttons.tsx:60-105` - WebDiscoveryConfirm component
  - `lib/ai/tools/executors.ts:580-678` - personalizedWebDiscovery executor

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Run `pnpm dev`, open AI Assistant
  - [ ] Ask "Find me underwater basket weaving opportunities" (unlikely to have DB results)
  - [ ] Observe:
    - AI searches database first
    - AI says something like "I couldn't find any opportunities..."
    - WebDiscoveryConfirm popup appears with:
      - Query text displayed
      - "Yes, look on the web" button
      - "No thanks" button
  - [ ] Click "No thanks"
    - Popup disappears
    - AI acknowledges cancellation
  - [ ] Try again and click "Yes, look on the web"
    - Popup disappears
    - Discovery progress UI appears (Task 5 verifies this works)

  **Commit**: YES
  - Message: `fix(chat): enable web discovery confirmation popup`
  - Files: `components/assistant/chat-interface.tsx`, possibly `app/api/chat/route.ts`
  - Pre-commit: Manual browser verification

---

- [ ] 5. Fix Discovery Progress and Results Display

  **What to do**:
  - Verify `useInlineDiscovery` hook works correctly:
    1. `startDiscovery(query)` opens EventSource to `/api/discovery/stream`
    2. SSE events update `progress` state
    3. `onOpportunityFound` callback fires as opportunities arrive
    4. `onComplete` callback fires when done
  - Ensure discovery progress UI shows:
    - Progress bar
    - "Found X opportunities" counter
    - "Stop" button
  - Verify discovered opportunities render as cards

  **Must NOT do**:
  - Do not modify the Python scraper
  - Do not change the SSE event format

  **Parallelizable**: NO (depends on Task 4)

  **References**:
  - `hooks/use-inline-discovery.ts` - Discovery hook (255 lines)
  - `components/assistant/chat-interface.tsx:105-166` - Hook usage and callbacks
  - `components/assistant/chat-interface.tsx:657-684` - Discovery progress UI
  - `app/api/discovery/stream/route.ts` - SSE endpoint that spawns Python
  - `components/assistant/simple-loading.tsx` - DiscoveryLoading component

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Run `pnpm dev`, open AI Assistant
  - [ ] Trigger discovery (from Task 4 flow)
  - [ ] Observe:
    - Progress bar appears with animation
    - Status text updates ("Generating search queries...", "Searching the web...", etc.)
    - "Found X opportunities" counter increments
    - "Stop" button is clickable
  - [ ] Wait for discovery to complete (30-60 seconds)
  - [ ] Observe:
    - Final message: "Found X opportunities for you"
    - Opportunity cards appear below the message
    - Cards have same functionality as DB results (Apply, Bookmark, Details)
  - [ ] Click "Stop" mid-discovery
    - Discovery stops
    - Already-found opportunities still displayed

  **Commit**: YES
  - Message: `fix(chat): wire inline discovery progress and results display`
  - Files: `components/assistant/chat-interface.tsx`, possibly `hooks/use-inline-discovery.ts`
  - Pre-commit: Manual browser verification

---

### Phase 3: Polish and Integration

- [ ] 6. Improve System Prompt for Reliable Tool Triggering

  **What to do**:
  - Review current system prompt in `app/api/chat/route.ts:20-95`
  - Enhance to ensure AI consistently:
    1. Recognizes opportunity-related queries
    2. Calls `smart_search_opportunities` first (not basic search)
    3. Uses `filter_by_deadline` for deadline queries
    4. Offers web discovery only when DB returns empty
    5. Embeds `{{card:id}}` syntax for top recommendations
  - Add explicit examples of when to call each tool
  - Test with various query types

  **Must NOT do**:
  - Do not remove existing capabilities from prompt
  - Do not expose technical details to users

  **Parallelizable**: YES (can be done after Task 2, parallel with 3-5)

  **References**:
  - `app/api/chat/route.ts:20-95` - Current system prompt
  - `lib/ai/tools/definitions.ts` - Tool descriptions (AI sees these)
  - `components/assistant/markdown-message.tsx` - How `{{card:id}}` is parsed

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Test these queries and verify correct tool is called:
    | Query | Expected Tool |
    |-------|---------------|
    | "Find me robotics opportunities" | smart_search_opportunities |
    | "What's due this week?" | filter_by_deadline (days=7) |
    | "Show me my saved opportunities" | get_saved_opportunities |
    | "What opportunities match my skills?" | smart_search_opportunities (empty query) |
    | "Tell me about my profile" | get_user_profile |
  - [ ] Server logs confirm correct tool called each time
  - [ ] AI response includes inline card for top recommendation: `{{card:...}}`

  **Commit**: YES
  - Message: `improve(chat): enhance system prompt for reliable tool selection`
  - Files: `app/api/chat/route.ts`
  - Pre-commit: Manual browser verification with query matrix

---

- [ ] 7. End-to-End Integration Verification

  **What to do**:
  - Complete walkthrough of entire flow:
    1. User asks for opportunities → tools fire → cards render
    2. User asks for something not in DB → discovery popup → confirm → progress → cards
    3. User clicks "Details" → navigates to `/opportunities?highlight=ID`
    4. User clicks "Bookmark" → opportunity saved → confirmation shown
    5. User clicks "Apply Now" → external URL opens
  - Document any remaining issues
  - Fix any edge cases discovered

  **Must NOT do**:
  - Do not skip any verification step
  - Do not mark complete if any step fails

  **Parallelizable**: NO (depends on all prior tasks)

  **References**:
  - All files from Tasks 0-6
  - `app/opportunities/page.tsx` - Opportunities page with `?highlight=` support
  - `components/opportunities/expanded-opportunity-card.tsx` - Detail view

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Full Flow Test A (Database Results):
    1. Open AI Assistant
    2. Ask "Find me STEM opportunities"
    3. See loading status, then cards
    4. Click "Bookmark" on one → confirmation appears
    5. Click "Details" on another → navigates to `/opportunities?highlight=ID`
    6. Verify the opportunity expands/highlights on the page

  - [ ] Full Flow Test B (Web Discovery):
    1. Open AI Assistant
    2. Ask "Find me marine biology research opportunities" (unlikely in DB)
    3. See "I couldn't find..." message
    4. See WebDiscoveryConfirm popup
    5. Click "Yes, look on the web"
    6. See progress bar and counter
    7. Wait for completion → cards appear
    8. Click "Details" → navigates correctly

  - [ ] Full Flow Test C (Edge Cases):
    1. Ask "What are my goals?" → get_goals tool fires, no opportunity cards
    2. Ask "Deadlines this week" → filter_by_deadline tool fires, deadline-sorted cards
    3. Stop discovery mid-progress → gracefully stops, shows found cards

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 0 | `fix(types): regenerate Supabase types to match database schema` | `lib/database.types.ts` | `npx tsc --noEmit` |
| 2 | `fix(chat): enable tool calling loop for opportunity queries` | `app/api/chat/route.ts` | Manual browser test |
| 3 | `fix(chat): wire opportunity card rendering from SSE events` | `components/assistant/chat-interface.tsx` | Manual browser test |
| 4 | `fix(chat): enable web discovery confirmation popup` | Multiple files | Manual browser test |
| 5 | `fix(chat): wire inline discovery progress and results display` | Multiple files | Manual browser test |
| 6 | `improve(chat): enhance system prompt for reliable tool selection` | `app/api/chat/route.ts` | Query matrix test |

---

## Success Criteria

### Verification Commands
```bash
# Type check (after Task 0)
npx tsc --noEmit

# Dev server
pnpm dev

# Open in browser
open http://localhost:3000
# Navigate to AI Assistant
```

### Final Checklist
- [ ] All "Must Have" present:
  - [ ] Supabase types fixed (no 'never' errors)
  - [ ] Tool calling works for opportunity queries
  - [ ] Cards render in chat
  - [ ] Discovery popup appears when needed
  - [ ] Discovery progress and results display
  - [ ] Navigation to Opportunities page works
- [ ] All "Must NOT Have" absent:
  - [ ] No `@ts-ignore` or `as any` added
  - [ ] No Python scraper modifications
  - [ ] No database schema changes
  - [ ] No new tools created
- [ ] All manual tests pass
