# Fix AI Assistant Search Result Duplication

## TL;DR

> **Quick Summary**: Fix React key conflicts and eliminate duplicate rendering of search results in the AI assistant chat interface
> 
> **Deliverables**: 
> - Unique message IDs to prevent React rendering conflicts
> - Deduplicated search result display (remove redundant grid)
> - Fixed discovery system state management
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential fixes required
> **Critical Path**: Message ID fix → Display deduplication → State cleanup

---

## Context

### Original Request
User reported "the AI assistant is adding random stuff underneath the ones that it chose out" and console errors about duplicate React keys.

### Current Issues Identified
1. **React Key Conflict**: Messages share duplicate `discovery-results` keys causing rendering issues
2. **Double Rendering**: Search results appear twice - embedded in chat text AND in grid below
3. **State Duplication**: Discovery system appends results without deduplication

### Error Analysis
```
Console Error: Encountered two children with the same key, `discovery-results`
Location: components/assistant/chat-interface.tsx:589
```

---

## Work Objectives

### Core Objective
Fix the AI assistant's search result display to show only the curated results without duplication or rendering conflicts.

### Concrete Deliverables
- Unique message IDs in ChatInterface
- Single rendering of search results (remove redundant OpportunityGrid)
- Deduplication in discovery state management
- Clean separation of AI-selected results vs raw tool results

### Definition of Done
- [ ] No React key conflicts in console
- [ ] Search results appear only once per assistant message
- [ ] No "random" results appearing below curated selections
- [ ] Discovery system maintains unique result IDs

### Must Have
- Preserve AI's curated result selection in chat text
- Maintain real-time discovery functionality
- Keep existing UI styling and interactions

### Must NOT Have (Guardrails)
- Remove AI's ability to select best results
- Break existing bookmark/apply functionality
- Modify discovery backend logic

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: YES (Tests-after)
- **Framework**: Vitest + React Testing Library

### Manual QA Required
- **Browser verification**: Chat interface rendering tests
- **Console monitoring**: No React warnings/errors
- **Search result validation**: Single display confirmed

---

## Execution Strategy

### Sequential Execution Waves

```
Wave 1: Fix React Key Conflicts
├── Task 1: Implement unique message ID generation

Wave 2: Remove Duplicate Display
├── Task 2: Filter embedded cards from OpportunityGrid
├── Task 3: Update markdown-message parsing

Wave 3: Fix Discovery State
├── Task 4: Add deduplication to discovery hook
├── Task 5: Test complete fix

Critical Path: 1 → 2 → 3 → 4 → 5
```

---

## TODOs

- [ ] 1. Fix React Key Conflicts in ChatInterface

  **What to do**:
  - Implement proper unique ID generation for messages in ChatInterface
  - Fix the `message.id` assignment to guarantee uniqueness
  - Remove hardcoded `discovery-results` keys

  **Must NOT do**:
  - Remove existing message structure
  - Change the message object interface

  **Recommended Agent Profile**:
  > **Category**: `quick`
    - Reason: Single component fix with clear scope
  > **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: React component state and rendering optimization
  > **Skills Evaluated but Omitted**:
    - `git-master`: Not needed for this code change

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2, 3, 4, 5
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `components/assistant/chat-interface.tsx:588-590` - Current message mapping with key assignment
  - `lib/utils.ts:cn()` - Utility for conditional classes (follow existing patterns)

  **API/Type References** (contracts to implement against):
  - Look for Message type definition in types/ or interfaces in the file
  - Check if message.id already exists in the type system

  **Test References** (testing patterns to follow):
  - `__tests__/components/` - Look for existing ChatInterface tests
  - Follow existing test structure for React components

  **Documentation References** (specs and requirements):
  - `AGENTS.md` - Component conventions and patterns
  - React documentation for key prop uniqueness requirements

  **External References** (libraries and frameworks):
  - React docs: `https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key` - Key uniqueness rules

  **WHY Each Reference Matters** (explain the relevance):
  - `chat-interface.tsx:588-590`: Current implementation shows the problematic key assignment that needs fixing
  - React key documentation: Provides the canonical requirements for unique keys in lists

  **Acceptance Criteria**:

  **If TDD (tests enabled):**
  - [ ] Test file created: `__tests__/components/chat-interface.test.tsx`
  - [ ] Test covers: Message key uniqueness and proper rendering
  - [ ] `pnpm test chat-interface` → PASS

  **Manual Execution Verification** (ALWAYS include, even with tests):

  **For Frontend/UI changes:**
  - [ ] Using playwright browser automation:
    - Navigate to: `http://localhost:3000`
    - Action: Send multiple chat messages to trigger search
    - Verify: No React console warnings about duplicate keys
    - Verify: Each message renders properly without conflicts
    - Screenshot: Save evidence to `.sisyphus/evidence/fix-keys-rendering.png`

  **Evidence Required**:
  - [ ] Console output showing no React warnings
  - [ ] Screenshot of clean chat interface rendering
  - [ ] Multiple message interaction test results

  **Commit**: YES
  - Message: `fix(assistant): resolve React key conflicts in ChatInterface`
  - Files: `components/assistant/chat-interface.tsx`
  - Pre-commit: `pnpm test`

- [ ] 2. Remove Duplicate Search Result Display

  **What to do**:
  - Filter out embedded cards from the OpportunityGrid to prevent double display
  - Parse message.content to find {{card:ID}} patterns and exclude those from grid
  - Ensure only non-embedded results show in the OpportunityGrid

  **Must NOT do**:
  - Remove AI's ability to embed cards in chat text
  - Change the card embedding syntax {{card:ID}}

  **Recommended Agent Profile**:
  > **Category**: `unspecified-low`
    - Reason: Medium complexity state management fix
  > **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: State management and conditional rendering logic
  > **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for implementation, only verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `components/assistant/chat-interface.tsx:603-623` - Current dual rendering logic
  - `components/assistant/markdown-message.tsx` - Card parsing and rendering logic
  - `hooks/use-inline-discovery.ts:172` - Discovery state management

  **API/Type References** (contracts to implement against):
  - Opportunity type interface and ID properties
  - Message interface with content and opportunities arrays

  **Test References** (testing patterns to follow):
  - `__tests__/components/markdown-message.test.tsx` - Card parsing test patterns

  **Documentation References** (specs and requirements):
  - `AGENTS.md` - Discovery system conventions

  **External References** (libraries and frameworks):
  - JavaScript regex docs: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions` - For parsing {{card:ID}} patterns

  **WHY Each Reference Matters** (explain the relevance):
  - `chat-interface.tsx:603-623`: Shows the exact location where duplicate rendering occurs
  - `markdown-message.tsx`: Contains the logic for finding and rendering embedded cards that we need to exclude from the grid

  **Acceptance Criteria**:

  **If TDD (tests enabled):**
  - [ ] Test file created: `__tests__/components/chat-interface-dedup.test.tsx`
  - [ ] Test covers: Card filtering logic and single display verification
  - [ ] `pnpm test chat-interface-dedup` → PASS

  **Manual Execution Verification** (ALWAYS include, even with tests):

  **For Frontend/UI changes:**
  - [ ] Using playwright browser automation:
    - Navigate to: `http://localhost:3000`
    - Action: Send search query that returns multiple results
    - Verify: Each search result appears only once (no duplicates)
    - Verify: AI-selected results show in chat text
    - Verify: Additional results (if any) show only in grid below
    - Screenshot: Save evidence to `.sisyphus/evidence/no-duplicates-search.png`

  **Evidence Required**:
  - [ ] Screenshot showing single instance of each search result
  - [ ] Console output confirming no rendering conflicts
  - [ ] Test execution with embedded vs grid results comparison

  **Commit**: YES | NO (groups with 2)
  - Message: `fix(assistant): deduplicate search result display`
  - Files: `components/assistant/chat-interface.tsx`
  - Pre-commit: `pnpm test`

- [ ] 3. Fix Discovery State Deduplication

  **What to do**:
  - Implement ID-based deduplication in use-inline-discovery.ts
  - Replace simple array.push with Map-based or Set-based deduplication
  - Ensure discovery events with duplicate IDs don't create multiple entries

  **Must NOT do**:
  - Remove existing discovery functionality
  - Change the opportunity ID structure

  **Recommended Agent Profile**:
  > **Category**: `quick`
    - Reason: Simple state management fix
  > **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: React hooks and state management patterns
  > **Skills Evaluated but Omitted**:
    - Not requiring additional specialized skills

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `hooks/use-inline-discovery.ts:172` - Current duplication issue location
  - Other hooks in the directory for deduplication patterns

  **API/Type References** (contracts to implement against):
  - Opportunity interface with unique ID property

  **Test References** (testing patterns to follow):
  - `__tests__/hooks/` - Existing hook test patterns

  **WHY Each Reference Matters** (explain the relevance):
  - `use-inline-discovery.ts:172`: Exact location of the duplication bug that needs fixing

  **Acceptance Criteria**:

  **If TDD (tests enabled):**
  - [ ] Test file created: `__tests__/hooks/use-inline-discovery-dedup.test.ts`
  - [ ] Test covers: Duplicate event handling and unique ID maintenance
  - [ ] `pnpm test use-inline-discovery-dedup` → PASS

  **Manual Execution Verification** (ALWAYS include, even with tests):

  **For Hook/State changes:**
  - [ ] REPL verification:
    ```
    > Import useInlineDiscovery and simulate duplicate events
    > Verify opportunity array contains unique IDs only
    Expected: No duplicate entries in the opportunities array
    ```

  **Evidence Required**:
  - [ ] Test output showing deduplication working
  - [ ] Manual verification of unique opportunity IDs

  **Commit**: YES | NO (groups with 2)
  - Message: `fix(discovery): add deduplication to opportunity state`
  - Files: `hooks/use-inline-discovery.ts`
  - Pre-commit: `pnpm test`

- [ ] 4. Complete Integration Testing

  **What to do**:
  - Verify end-to-end functionality with real search queries
  - Test multiple rapid searches to ensure no state conflicts
  - Validate all three fixes work together properly
  - Check performance impact of filtering logic

  **Must NOT do**:
  - Modify backend search functionality
  - Change search result ranking/selection logic

  **Recommended Agent Profile**:
  > **Category**: `unspecified-low`
    - Reason: Integration testing and verification
  > **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Comprehensive UI testing and validation
  > **Skills Evaluated but Omitted**:
    - Not requiring backend changes

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None (final verification)
  - **Blocked By**: Task 1, 2, 3

  **Acceptance Criteria**:

  **Manual Execution Verification** (ALWAYS include, even with tests):

  **For Frontend/UI changes:**
  - [ ] Using playwright browser automation:
    - Navigate to: `http://localhost:3000`
    - Action: Send 5-10 different search queries rapidly
    - Verify: No React console warnings
    - Verify: Each search shows results only once
    - Verify: No performance degradation
    - Verify: Discovery state remains clean
    - Screenshot: Save final state evidence to `.sisyphus/evidence/final-integration-test.png`

  **Evidence Required**:
  - [ ] Complete test session console output
  - [ ] Performance metrics (if any)
  - [ ] Screenshots of successful searches
  - [ ] Verification of all three fixes working together

  **Commit**: YES | NO (groups with 2)
  - Message: `test(assistant): complete integration verification`
  - Files: (no code changes, test verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(assistant): resolve React key conflicts in ChatInterface` | components/assistant/chat-interface.tsx | pnpm test |
| 2 | `fix(assistant): deduplicate search result display` | components/assistant/chat-interface.tsx | pnpm test |
| 3 | `fix(discovery): add deduplication to opportunity state` | hooks/use-inline-discovery.ts | pnpm test |
| 4 | `test(assistant): complete integration verification` | (no changes) | pnpm test |

---

## Success Criteria

### Verification Commands
```bash
pnpm test                    # All tests pass
pnpm dev                     # Dev server starts without warnings
npx tsc --noEmit            # No TypeScript errors
```

### Final Checklist
- [ ] No React key conflict warnings in console
- [ ] Search results appear only once per query
- [ ] Discovery state maintains unique entries
- [ ] All existing functionality preserved
- [ ] Performance remains acceptable