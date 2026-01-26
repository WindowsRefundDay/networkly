# Fix Gemini Authentication Error

## Context

### Original Request
Fix "[Chat Error] Authentication failed for gemini" error in the chat interface.

### Root Cause Analysis
The `@ai-sdk/google` SDK (v3.0.13) **ignores** the `apiKey` parameter passed to `google(modelId, { apiKey })` and **only** reads from the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable.

**Evidence:**
- Direct REST API test with the key WORKS (model: gemini-2.5-flash-lite)
- AI SDK test with `{ apiKey: process.env.GEMINI_API_KEY }` FAILS with "API key is missing"
- SDK source confirms: `environmentVariableName: 'GOOGLE_GENERATIVE_AI_API_KEY'`

Current `.env` has:
```
GEMINI_API_KEY=AIzaSyDDGaGA5UJrCzQ6F5tV0uo86mka2fFMzyU
```

SDK expects:
```
GOOGLE_GENERATIVE_AI_API_KEY=...
```

---

## Work Objectives

### Core Objective
Add the correct environment variable for @ai-sdk/google to read

### Concrete Deliverables
- Updated `.env` file with `GOOGLE_GENERATIVE_AI_API_KEY`

### Definition of Done
- [ ] Chat sends message successfully without "Authentication failed" error

### Must Have
- `GOOGLE_GENERATIVE_AI_API_KEY` env var set to the Gemini API key

### Must NOT Have (Guardrails)
- Do not modify SDK code
- Do not create workarounds - use the expected env var name

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (manual verification)
- **User wants tests**: Manual-only
- **Framework**: Browser + terminal

---

## TODOs

- [ ] 1. Add GOOGLE_GENERATIVE_AI_API_KEY to .env

  **What to do**:
  - Open `.env` file
  - Add the following line:
    ```
    # AI SDK Google Provider (required by @ai-sdk/google)
    GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDDGaGA5UJrCzQ6F5tV0uo86mka2fFMzyU
    ```

  **Must NOT do**:
  - Do not remove GEMINI_API_KEY (other code may use it)

  **Parallelizable**: NO

  **References**:
  - `.env` file - current env vars
  - `node_modules/@ai-sdk/google/src/google-provider.ts` - SDK source showing expected env var

  **Acceptance Criteria**:
  - [ ] Terminal: `grep GOOGLE_GENERATIVE_AI_API_KEY .env` returns the key
  - [ ] Restart dev server: `pnpm dev`
  - [ ] Browser: Open chat, send a message
  - [ ] Browser: Should get AI response without "Authentication failed" error

  **Commit**: YES
  - Message: `fix(ai): add GOOGLE_GENERATIVE_AI_API_KEY for @ai-sdk/google`
  - Files: `.env` (do NOT commit - it's in .gitignore)
  - Note: Update `.env.example` to document the new var

- [ ] 2. Update .env.example for documentation

  **What to do**:
  - Add `GOOGLE_GENERATIVE_AI_API_KEY` to `.env.example` with placeholder

  **Parallelizable**: YES (with step 1)

  **Acceptance Criteria**:
  - [ ] `.env.example` contains `GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"`

  **Commit**: YES
  - Message: `docs(env): add GOOGLE_GENERATIVE_AI_API_KEY to .env.example`
  - Files: `.env.example`

---

## Success Criteria

### Verification Commands
```bash
# Verify env var is set
grep GOOGLE_GENERATIVE_AI_API_KEY .env

# Restart dev server
pnpm dev

# In browser: open chat, send message, verify response
```

### Final Checklist
- [ ] Chat works without "Authentication failed for gemini" error
- [ ] `.env.example` updated for future developers
