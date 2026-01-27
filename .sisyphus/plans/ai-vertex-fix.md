# Fix AI Assistant - Configure Vertex AI with Service Account

## TL;DR

> **Quick Summary**: Configure Vertex AI using existing service account, fix fallback chain to include OpenRouter as backup, and verify the AI assistant works.
> 
> **Deliverables**:
> - Updated `.env.local` with Vertex AI credentials
> - Fixed `model-configs.ts` with OpenRouter fallback chain
> - Working AI assistant using Vertex AI (Gemini models)
> 
> **Estimated Effort**: Quick (10-15 minutes)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 -> Task 3 -> Task 4

---

## Context

### Original Request
AI assistant completely broken due to leaked/blocked Gemini API key. User has a Vertex AI service account that can bypass this issue.

### Interview Summary
**Key Discussions**:
- User found existing service account JSON: `networkly-484301-8a19b7e7692d.json`
- Project ID: `networkly-484301`
- Service account: `webvercel@networkly-484301.iam.gserviceaccount.com`
- Local development only
- Manual verification via browser

**Research Findings**:
- `GeminiProvider` already supports Vertex AI via `@ai-sdk/google-vertex`
- `GOOGLE_APPLICATION_CREDENTIALS` env var is read in `gemini.ts:228`
- `DEFAULT_USE_CASE_MODELS` bug prevents OpenRouter fallback
- Manager initialization already handles Vertex AI mode

---

## Work Objectives

### Core Objective
Make AI assistant functional using Vertex AI with existing service account, with OpenRouter as fallback.

### Concrete Deliverables
- `.env.local` configured with Vertex AI credentials
- `lib/ai/model-configs.ts` with OpenRouter fallback models
- Working chat interface at `/assistant`

### Definition of Done
- [ ] Console shows: `[AIManager] Initialized with Gemini (Vertex AI)`
- [ ] AI assistant responds to messages without 403 errors
- [ ] Chat streams responses properly

### Must Have
- Vertex AI as primary provider (Gemini models)
- OpenRouter models as fallback (if Vertex fails)
- Service account authentication working

### Must NOT Have (Guardrails)
- DO NOT commit service account JSON to git (already in .gitignore)
- DO NOT remove existing Gemini model configurations
- DO NOT modify the AI Manager singleton pattern
- DO NOT change the chat API route logic

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO
- **User wants tests**: NO - Manual verification only
- **Framework**: N/A
- **QA approach**: Manual verification in browser + console logs

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Configure .env.local with Vertex AI credentials
└── Task 2: Add OpenRouter fallback to model-configs.ts

Wave 2 (After Wave 1):
└── Task 3: Restart dev server and verify initialization

Wave 3 (After Wave 2):
└── Task 4: Test chat interface in browser
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | 4 | None |
| 4 | 3 | None | None (final) |

---

## TODOs

- [ ] 1. Configure .env.local with Vertex AI credentials

  **What to do**:
  - Open or create `.env.local` file
  - Add the following environment variables:
    ```bash
    # Vertex AI Configuration
    USE_VERTEX_AI=true
    GOOGLE_VERTEX_PROJECT=networkly-484301
    GOOGLE_VERTEX_LOCATION=us-central1
    GOOGLE_APPLICATION_CREDENTIALS=/Users/joelmanuel/Downloads/Networkly-Frontend/networkly-484301-8a19b7e7692d.json
    ```
  - Ensure the blocked Gemini API key is NOT being used (comment out or remove `GOOGLE_GENERATIVE_AI_API_KEY` if present)

  **Must NOT do**:
  - Do not move or rename the service account JSON file
  - Do not commit the JSON file to git
  - Do not set `USE_VERTEX_AI=false`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file editing, no complex logic
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `lib/ai/providers/gemini.ts:196-230` - How Vertex AI credentials are loaded
  - `lib/ai/manager.ts:208-229` - How Vertex AI mode is detected and initialized
  - `.env.vertex.example` - Example Vertex AI configuration

  **Documentation References**:
  - `docs/VERTEX_AI_SETUP_FRONTEND.md:86-93` - Local development env vars

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] File `.env.local` exists with Vertex AI variables
  - [ ] Verify: `grep "GOOGLE_VERTEX_PROJECT" .env.local` -> shows `networkly-484301`
  - [ ] Verify: `grep "USE_VERTEX_AI" .env.local` -> shows `true`
  - [ ] Verify service account file exists: `ls -la networkly-484301-8a19b7e7692d.json`

  **Commit**: NO (environment files should not be committed)

---

- [ ] 2. Add OpenRouter fallback models to model-configs.ts

  **What to do**:
  - Add `OPENROUTER_USE_CASES` constant after `GEMINI_USE_CASES` (around line 182)
  - Create hybrid `DEFAULT_USE_CASE_MODELS` that uses Gemini primary with OpenRouter fallbacks
  - Update the export at line 344 to use the new hybrid configuration

  **Code to add** (after line 182, before line 183):
  ```typescript
  // ============================================================================
  // OpenRouter Fallback Configuration
  // ============================================================================

  export const OPENROUTER_MODELS_FOR_FALLBACK = {
    'openai/gpt-4o': 'openai/gpt-4o',
    'openai/gpt-4o-mini': 'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  }

  export const OPENROUTER_USE_CASES: Record<UseCase, UseCaseModelMapping> = {
    chat: {
      primary: 'openrouter:openai/gpt-4o-mini',
      fallbacks: ['openrouter:openai/gpt-4o', 'openrouter:anthropic/claude-3.5-sonnet'],
      temperature: 0.7,
      maxTokens: 2048,
    },
    analysis: {
      primary: 'openrouter:openai/gpt-4o',
      fallbacks: ['openrouter:anthropic/claude-3.5-sonnet', 'openrouter:openai/gpt-4o-mini'],
      temperature: 0.3,
      maxTokens: 4096,
    },
    'code-generation': {
      primary: 'openrouter:openai/gpt-4o',
      fallbacks: ['openrouter:anthropic/claude-3.5-sonnet', 'openrouter:openai/gpt-4o-mini'],
      temperature: 0.2,
      maxTokens: 8192,
    },
    summarization: {
      primary: 'openrouter:openai/gpt-4o-mini',
      fallbacks: ['openrouter:openai/gpt-4o', 'openrouter:anthropic/claude-3.5-sonnet'],
      temperature: 0.3,
      maxTokens: 1024,
    },
    extraction: {
      primary: 'openrouter:openai/gpt-4o-mini',
      fallbacks: ['openrouter:openai/gpt-4o', 'openrouter:anthropic/claude-3.5-sonnet'],
      temperature: 0,
      maxTokens: 2048,
    },
    vision: {
      primary: 'openrouter:openai/gpt-4o',
      fallbacks: ['openrouter:anthropic/claude-3.5-sonnet', 'openrouter:openai/gpt-4o-mini'],
      temperature: 0.5,
      maxTokens: 2048,
    },
    'fast-response': {
      primary: 'openrouter:openai/gpt-4o-mini',
      fallbacks: ['openrouter:openai/gpt-4o', 'openrouter:anthropic/claude-3.5-sonnet'],
      temperature: 0.5,
      maxTokens: 512,
    },
    'high-quality': {
      primary: 'openrouter:openai/gpt-4o',
      fallbacks: ['openrouter:anthropic/claude-3.5-sonnet', 'openrouter:openai/gpt-4o-mini'],
      temperature: 0.7,
      maxTokens: 4096,
    },
    'cost-effective': {
      primary: 'openrouter:openai/gpt-4o-mini',
      fallbacks: ['openrouter:openai/gpt-4o', 'openrouter:anthropic/claude-3.5-sonnet'],
      temperature: 0.7,
      maxTokens: 1024,
    },
  }

  // ============================================================================
  // Hybrid Configuration: Gemini Primary + OpenRouter Fallback
  // ============================================================================

  export const HYBRID_USE_CASE_MODELS: Record<UseCase, UseCaseModelMapping> = {
    chat: {
      primary: 'gemini-2.5-flash-lite',
      fallbacks: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'openrouter:openai/gpt-4o-mini', 'openrouter:openai/gpt-4o'],
      temperature: 0.7,
      maxTokens: 2048,
    },
    analysis: {
      primary: 'gemini-3-flash-preview',
      fallbacks: ['gemini-2.5-flash', 'gemini-2.5-pro', 'openrouter:openai/gpt-4o', 'openrouter:anthropic/claude-3.5-sonnet'],
      temperature: 0.3,
      maxTokens: 4096,
    },
    'code-generation': {
      primary: 'gemini-3-flash-preview',
      fallbacks: ['gemini-2.5-flash', 'gemini-2.5-pro', 'openrouter:openai/gpt-4o', 'openrouter:anthropic/claude-3.5-sonnet'],
      temperature: 0.2,
      maxTokens: 8192,
    },
    summarization: {
      primary: 'gemini-2.5-flash-lite',
      fallbacks: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'openrouter:openai/gpt-4o-mini'],
      temperature: 0.3,
      maxTokens: 1024,
    },
    extraction: {
      primary: 'gemini-2.5-flash-lite',
      fallbacks: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'openrouter:openai/gpt-4o-mini'],
      temperature: 0,
      maxTokens: 2048,
    },
    vision: {
      primary: 'gemini-2.5-flash-lite',
      fallbacks: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'openrouter:openai/gpt-4o'],
      temperature: 0.5,
      maxTokens: 2048,
    },
    'fast-response': {
      primary: 'gemini-2.5-flash-lite',
      fallbacks: ['gemini-2.5-flash', 'gemini-2.0-flash', 'openrouter:openai/gpt-4o-mini'],
      temperature: 0.5,
      maxTokens: 512,
    },
    'high-quality': {
      primary: 'gemini-3-flash-preview',
      fallbacks: ['gemini-3-pro-preview', 'gemini-2.5-pro', 'openrouter:openai/gpt-4o', 'openrouter:anthropic/claude-3.5-sonnet'],
      temperature: 0.7,
      maxTokens: 4096,
    },
    'cost-effective': {
      primary: 'gemini-2.5-flash-lite',
      fallbacks: ['gemini-2.5-flash', 'gemini-2.0-flash', 'openrouter:openai/gpt-4o-mini'],
      temperature: 0.7,
      maxTokens: 1024,
    },
  }
  ```

  **Then update line 344** from:
  ```typescript
  export const DEFAULT_USE_CASE_MODELS = GEMINI_USE_CASES
  ```
  to:
  ```typescript
  export const DEFAULT_USE_CASE_MODELS = HYBRID_USE_CASE_MODELS
  ```

  **Must NOT do**:
  - Do not remove `GEMINI_USE_CASES` or `GEMINI_CONFIG`
  - Do not modify existing model definitions
  - Do not change the type definitions

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Code addition following existing patterns
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `lib/ai/model-configs.ts:127-182` - GEMINI_USE_CASES structure to follow exactly
  - `lib/ai/model-configs.ts:32-43` - UseCaseModelMapping interface
  - `lib/ai/providers/openrouter.ts:107-250` - Available OpenRouter model IDs

  **Type References**:
  - `lib/ai/types.ts:22-31` - UseCase type definition

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] File saves without TypeScript errors
  - [ ] `grep "HYBRID_USE_CASE_MODELS" lib/ai/model-configs.ts` -> shows the new config
  - [ ] `grep "DEFAULT_USE_CASE_MODELS = HYBRID" lib/ai/model-configs.ts` -> shows updated export
  - [ ] Run `npx tsc --noEmit lib/ai/model-configs.ts` -> no errors

  **Commit**: YES
  - Message: `fix(ai): add hybrid model config with OpenRouter fallback for Vertex AI`
  - Files: `lib/ai/model-configs.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 3. Restart dev server and verify Vertex AI initialization

  **What to do**:
  - Stop any running dev server (Ctrl+C)
  - Start fresh: `bun dev`
  - Watch console for initialization messages
  - Verify Vertex AI mode is detected

  **Must NOT do**:
  - Do not modify any code in this task
  - Do not skip checking the console output

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Command execution and log verification
  - **Skills**: None required

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential)
  - **Blocks**: Task 4
  - **Blocked By**: Tasks 1 and 2

  **References**:

  **Pattern References**:
  - `lib/ai/manager.ts:229` - Expected log message format

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Run: `bun dev`
  - [ ] Console shows: `[AIManager] Initialized with Gemini (Vertex AI) - Project: networkly-484301`
  - [ ] No errors about missing credentials
  - [ ] No 403 "API key leaked" errors
  - [ ] Server starts successfully on port 3000

  **Commit**: NO (verification only)

---

- [ ] 4. Test chat interface in browser

  **What to do**:
  - Open browser to `http://localhost:3000/assistant`
  - Send a test message: "Hello, can you help me?"
  - Verify streaming response works
  - Check browser console for any errors

  **Must NOT do**:
  - Do not modify any code in this task
  - Do not skip the streaming verification

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Manual browser verification
  - **Skills**: [`playwright`] (optional)
    - `playwright`: Can automate browser testing if preferred

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Documentation References**:
  - `docs/VERTEX_AI_SETUP_FRONTEND.md:164-179` - Testing procedure

  **Acceptance Criteria**:

  **Manual Execution Verification (Browser):**
  - [ ] Navigate to: `http://localhost:3000/assistant`
  - [ ] Page loads without errors
  - [ ] Send message: "Hello, can you help me?"
  - [ ] Verify: Response streams in (text appears incrementally)
  - [ ] Verify: No errors in browser console (F12 -> Console tab)
  - [ ] Verify: No "API key was reported as leaked" errors
  - [ ] Verify: Response completes successfully

  **Evidence Required:**
  - [ ] Screenshot of working chat response
  - [ ] Console showing Vertex AI initialization

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `fix(ai): add hybrid model config with OpenRouter fallback for Vertex AI` | `lib/ai/model-configs.ts` | `npx tsc --noEmit` |

---

## Success Criteria

### Verification Commands
```bash
# Check environment is configured
grep "GOOGLE_VERTEX_PROJECT" .env.local
# Expected: GOOGLE_VERTEX_PROJECT=networkly-484301

# Start server
bun dev
# Expected: "[AIManager] Initialized with Gemini (Vertex AI) - Project: networkly-484301"

# Then in browser at http://localhost:3000/assistant
# Send message: "Hello!"
# Expected: AI responds with streaming text, no errors
```

### Final Checklist
- [ ] `.env.local` has Vertex AI credentials
- [ ] Console shows Vertex AI initialization with project ID
- [ ] AI assistant responds to messages
- [ ] No 403/authentication errors
- [ ] Streaming works (text appears incrementally)
- [ ] OpenRouter fallbacks are configured for resilience

---

## Troubleshooting

### If you see "Permission denied" or "API not enabled"
The Vertex AI API may not be enabled on your GCP project. Run:
```bash
gcloud services enable aiplatform.googleapis.com --project=networkly-484301
```

### If you see "Could not load credentials"
Verify the JSON file path is correct and the file exists:
```bash
ls -la /Users/joelmanuel/Downloads/Networkly-Frontend/networkly-484301-8a19b7e7692d.json
```

### If you see "Invalid grant" errors
The service account may not have the required permissions. Verify in GCP Console that the service account has `roles/aiplatform.user` role.
