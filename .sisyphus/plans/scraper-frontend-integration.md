# Networkly Scraper-Frontend Full Integration

## TL;DR

> **Quick Summary**: Fully integrate the Networkly-scrape Python backend (Cloud Run) with the Next.js frontend (Vercel), adding AI discovery to Events, goal-based discovery to Projects, enhanced mentor features, similar opportunities, application tracking, and migrating legacy spawn code to Cloud Run API calls.
> 
> **Deliverables**:
> - Events page with full AI discovery (SSE streaming + filters)
> - Projects page with "Find opportunities for this goal" button
> - Mentor search with institution filter + cold-email AI drafts
> - Similar opportunities in expanded opportunity cards
> - Application status tracking (Applied/Interested/Dismissed)
> - Legacy spawn() code migrated to fetch() calls
> - Python type errors fixed in scraper
> - Deployment configuration documented
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Scraper Fixes → Core UI Features → Tests → Deployment

---

## Context

### Original Request
Intertwine the Networkly-scrape backend with the frontend. Ensure all scraper endpoints can be used within the UI. Prepare for Google Cloud Run (scraper) + Vercel (frontend) deployment. Incorporate all product features (Discovery, Events, Research, Mentors, etc.) into the interface.

### Interview Summary
**Key Discussions**:
- Events need full AI Discovery (same SSE streaming as Opportunities)
- Projects should have goal-aligned discovery button
- Application tracking: simple status (Applied/Interested/Dismissed)
- Mentors: institution filter + AI cold-email templates
- Similar opportunities: show in expanded cards using `/similar` endpoint
- Legacy spawn() code must be migrated to Cloud Run API calls
- Python type errors in scraper need fixing
- Include deployment guide

**Research Findings**:
- Significant integration already exists (discovery SSE, mentor search, opportunities)
- `use-discovery-layers.ts` hook handles all SSE event types
- Legacy `child_process.spawn` in batch/daily routes needs migration
- Scraper deployed at `https://networkly-scraper-267103342849.us-central1.run.app`
- Python type errors detected in config.py, embeddings.py, supabase.py, vertex_ai.py

### Self-Analysis (Gap Check)
**Guardrails Applied**:
- Do NOT add full CRM features (simple status tracking only)
- Do NOT add ML-based learning improvements
- Do NOT modify auth flow or database schema significantly
- Keep existing UI patterns (GlassCard, SSE, server actions)
- Use existing `SCRAPER_API_URL` env var pattern consistently

---

## Work Objectives

### Core Objective
Connect all Networkly-scrape endpoints to the frontend UI, ensuring all product features are accessible, and prepare both services for production deployment.

### Concrete Deliverables
1. Events page with AI discovery + advanced filters
2. Projects page with goal-based opportunity discovery
3. Enhanced mentor search with filters + outreach features
4. Similar opportunities displayed in opportunity detail view
5. Application status tracking on opportunities
6. All legacy spawn() code migrated to fetch()
7. Python scraper type errors fixed
8. Deployment documentation for Vercel + Cloud Run

### Definition of Done
- [ ] All scraper endpoints callable from frontend UI or actions
- [ ] `pnpm build` completes without type errors
- [ ] All features manually tested in browser
- [ ] Vitest tests written for new server actions
- [ ] Environment variables documented and set on Vercel/Cloud Run

### Must Have
- SSE streaming works for Events discovery (same as Opportunities)
- Goal-discovery button triggers discovery with project context
- Mentor cold-email uses AI to generate personalized templates
- Similar opportunities shown when viewing opportunity details
- Status can be set to Applied/Interested/Dismissed on any opportunity
- No spawn() calls remain in production API routes
- Scraper runs without Python type errors

### Must NOT Have (Guardrails)
- Full CRM/applicant tracking with reminders and calendars
- ML model training or recommendation weight adjustments
- New database tables (use existing schema)
- Breaking changes to existing working features
- Mobile-specific layouts or PWA features
- URL evaluation UI (keep backend-only)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (vitest + @testing-library/react)
- **User wants tests**: YES (after implementation)
- **Framework**: vitest
- **QA approach**: Tests after implementation + manual browser verification

### Manual Execution Verification
Each TODO includes specific manual verification steps using browser automation or terminal commands.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately) - Foundation:
├── Task 1: Fix Python type errors in scraper
├── Task 2: Create EventDiscovery server action
└── Task 3: Create project-goal discovery server action

Wave 2 (After Wave 1) - Core UI:
├── Task 4: Add AI Discovery to Events page
├── Task 5: Add goal-discovery to Projects page
├── Task 6: Add Similar Opportunities component
└── Task 7: Add application status tracking

Wave 3 (After Wave 2) - Enhanced Features:
├── Task 8: Enhance Mentor search with filters
├── Task 9: Add mentor cold-email template feature
└── Task 10: Migrate legacy spawn() to fetch()

Wave 4 (After Wave 3) - Quality & Deploy:
├── Task 11: Write tests for new features
├── Task 12: Create deployment documentation
└── Task 13: Final integration testing
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 5 | 2, 3 |
| 2 | None | 4 | 1, 3 |
| 3 | None | 5 | 1, 2 |
| 4 | 1, 2 | 11 | 5, 6, 7 |
| 5 | 1, 3 | 11 | 4, 6, 7 |
| 6 | None | 11 | 4, 5, 7 |
| 7 | None | 11 | 4, 5, 6 |
| 8 | None | 9, 11 | 9 |
| 9 | 8 | 11 | 10 |
| 10 | None | 12 | 8, 9 |
| 11 | 4, 5, 6, 7, 9 | 13 | 12 |
| 12 | 10 | 13 | 11 |
| 13 | 11, 12 | None | None (final) |

---

## TODOs

### Wave 1: Foundation

- [x] 1. Fix Python type errors in scraper

  **What to do**:
  - Fix `config.py` missing argument errors (lines ~33)
  - Fix `embeddings.py` type mismatch with TextEmbeddingInput (lines ~52-53)
  - Fix `supabase.py` subscript errors on None/bool types (lines ~113, 131, 140)
  - Fix `vertex_ai.py` None attribute access and GenerationConfig errors (lines ~49, 103, 141-155)
  - Run `pytest` to ensure no regressions

  **Must NOT do**:
  - Change business logic
  - Modify API response formats
  - Add new dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type fixes are localized, single-file changes
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for scraper fixes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5 (need working scraper)
  - **Blocked By**: None

  **References**:
  - `Networkly-scrape/app/config.py:33` - Settings class initialization
  - `Networkly-scrape/app/services/embeddings.py:52-53` - TextEmbeddingInput type
  - `Networkly-scrape/app/services/supabase.py:113-140` - Response handling
  - `Networkly-scrape/app/services/vertex_ai.py:49-155` - Gemini client initialization

  **Acceptance Criteria**:
  - [ ] `cd Networkly-scrape && python -c "from app.main import app"` → no import errors
  - [ ] `cd Networkly-scrape && pytest tests/ -x` → all tests pass
  - [ ] LSP diagnostics show 0 errors in modified files

  **Commit**: YES
  - Message: `fix(scraper): resolve Python type errors in services`
  - Files: `app/config.py`, `app/services/*.py`
  - Pre-commit: `pytest tests/ -x`

---

- [x] 2. Create EventDiscovery server action

  **What to do**:
  - Create `app/actions/event-discovery.ts`
  - Implement `discoverEvents(query: string, filters: EventFilters)` action
  - Implement `searchEvents(query: string)` using `/api/v1/search` with event category filter
  - Define `EventFilters` type: `{ locationType: 'online' | 'in-person' | 'all', topic?: string, dateRange?: { start: Date, end: Date } }`
  - Follow existing pattern from `app/actions/discovery.ts`

  **Must NOT do**:
  - Modify existing events.ts action
  - Add new database tables
  - Change Event type definition

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Following established patterns, moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:
  - `app/actions/discovery.ts` - Pattern for calling SCRAPER_API_URL
  - `app/actions/events.ts` - Existing event types and actions
  - `Networkly-scrape/app/routers/search.py:26-138` - Search endpoint implementation

  **Acceptance Criteria**:
  - [ ] `discoverEvents('AI conferences')` returns results or triggers discovery
  - [ ] `searchEvents('hackathon', { locationType: 'online' })` filters correctly
  - [ ] TypeScript compiles without errors: `npx tsc --noEmit`

  **Commit**: YES
  - Message: `feat(events): add event discovery server action`
  - Files: `app/actions/event-discovery.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 3. Create project-goal discovery server action

  **What to do**:
  - Create `app/actions/goal-discovery.ts`
  - Implement `discoverOpportunitiesForProject(projectId: string)` action
  - Fetch project details (title, description, tags, category)
  - Generate discovery query from project context
  - Call `/discover/stream` or `/api/v1/search` with project context
  - Return opportunities aligned to project goal

  **Must NOT do**:
  - Modify project schema
  - Add project-opportunity relationship table
  - Change project CRUD actions

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Following patterns, single action file
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `app/actions/projects.ts` - Project CRUD and types
  - `app/actions/discovery.ts:26-81` - triggerDiscovery pattern
  - `lib/projects.ts` - Project type definition

  **Acceptance Criteria**:
  - [ ] `discoverOpportunitiesForProject(projectId)` returns relevant opportunities
  - [ ] Query generation uses project title, description, and tags
  - [ ] TypeScript compiles: `npx tsc --noEmit`

  **Commit**: YES
  - Message: `feat(projects): add goal-based discovery action`
  - Files: `app/actions/goal-discovery.ts`
  - Pre-commit: `npx tsc --noEmit`

---

### Wave 2: Core UI Features

- [x] 4. Add AI Discovery to Events page

  **What to do**:
  - Update `app/events/page.tsx` to use client component pattern
  - Create `app/events/events-client.tsx` (follow opportunities-client pattern)
  - Add `DiscoveryTriggerCard` component for event discovery
  - Add filter bar: location type (Online/In-Person/All), topic dropdown, date range picker
  - Wire up `useDiscoveryLayers` hook for SSE events
  - Show discovered events in real-time feed

- [x] 5. Add goal-discovery to Projects page

  **What to do**:
  - Add "Find Opportunities" button to `ProjectCard` component
  - Create `ProjectDiscoveryModal` component for showing results
  - Wire button to `discoverOpportunitiesForProject` action
  - Show loading state during discovery
  - Display matching opportunities in modal with links

  **Must NOT do**:
  - Add SSE streaming (use simple fetch for MVP)
  - Persist project-opportunity relationships
  - Modify project card layout significantly

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: New modal UI with opportunity display
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Modal design and state management

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 1, 3

  **References**:
  - `components/projects/project-card.tsx` - Where to add button
  - `components/projects/project-detail-modal.tsx` - Modal pattern
  - `app/actions/goal-discovery.ts` - Action to call

  **Acceptance Criteria**:
  - [ ] "Find Opportunities" button visible on project cards
  - [ ] Clicking button shows loading state
  - [ ] Modal shows relevant opportunities for project
  - [ ] Opportunities link to opportunity detail or external URL
  - [ ] Using browser: Navigate to `/projects`, click button on a project, verify results

  **Commit**: YES
  - Message: `feat(projects): add goal-based opportunity discovery`
  - Files: `components/projects/project-card.tsx`, `components/projects/project-discovery-modal.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 6. Add Similar Opportunities component

  **What to do**:
  - Create `components/opportunities/similar-opportunities.tsx`
  - Create `app/actions/similar-opportunities.ts` server action
  - Call `/api/v1/opportunities/{id}/similar` endpoint
  - Add to `ExpandedOpportunityCard` component
  - Display 3-5 similar opportunities as small cards

  **Must NOT do**:
  - Fetch on every card render (only when expanded)
  - Show full opportunity cards (keep compact)
  - Add to opportunity list view

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward API integration + component
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Task 11
  - **Blocked By**: None

  **References**:
  - `Networkly-scrape/app/routers/api.py:30-39` - Similar opportunities endpoint
  - `components/opportunities/expanded-opportunity-card.tsx` - Where to add
  - `components/opportunities/opportunity-card.tsx` - Card design reference

  **Acceptance Criteria**:
  - [ ] `/api/v1/opportunities/{id}/similar` called when card expanded
  - [ ] 3-5 similar opportunities shown in "You might also like" section
  - [ ] Clicking similar opportunity opens its detail view
  - [ ] Graceful handling when no similar opportunities found
  - [ ] Using browser: Expand an opportunity, verify similar section appears

  **Commit**: YES
  - Message: `feat(opportunities): add similar opportunities section`
  - Files: `components/opportunities/similar-opportunities.tsx`, `app/actions/similar-opportunities.ts`, `components/opportunities/expanded-opportunity-card.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 7. Add application status tracking

  **What to do**:
  - Add `status` field to opportunity local state: `'none' | 'interested' | 'applied' | 'dismissed'`
  - Create status dropdown/buttons in `OpportunityCard` and `ExpandedOpportunityCard`
  - Create `app/actions/opportunity-status.ts` for persisting status
  - Store status in `user_activities` table (type: 'opportunity_status')
  - Add status filter to opportunities page

  **Must NOT do**:
  - Add new database table
  - Add dates/notes/reminders (simple status only)
  - Change opportunity data model from scraper

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: DB interaction + UI updates, moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Task 11
  - **Blocked By**: None

  **References**:
  - `app/actions/mentors.ts:117-142` - saveMentor pattern for user_activities
  - `components/opportunities/opportunity-card.tsx` - Where to add UI
  - `app/opportunities/opportunities-client.tsx` - State management

  **Acceptance Criteria**:
  - [ ] Status buttons visible on opportunity cards
  - [ ] Status persists across page refreshes
  - [ ] Status filter works on opportunities page
  - [ ] Using browser: Set status on opportunity, refresh, verify persisted

  **Commit**: YES
  - Message: `feat(opportunities): add application status tracking`
  - Files: `app/actions/opportunity-status.ts`, `components/opportunities/opportunity-card.tsx`, `components/opportunities/expanded-opportunity-card.tsx`, `app/opportunities/opportunities-client.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

### Wave 3: Enhanced Features

- [x] 8. Enhance Mentor search with filters

  **What to do**:
  - Add institution filter dropdown to `/mentors` page
  - Fetch unique institutions from mentor search results or hardcode top universities
  - Update `searchMentors` action to accept institution filter
  - Add filter state to `MentorsPage` component

  **Must NOT do**:
  - Create new mentor table
  - Modify scraper mentor extraction
  - Add complex multi-select filters

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small UI addition + action update
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 9)
  - **Blocks**: Task 9, 11
  - **Blocked By**: None

  **References**:
  - `app/mentors/page.tsx` - Current implementation
  - `app/actions/mentors.ts:26-84` - searchMentors action
  - `Networkly-scrape/app/routers/api.py:42-57` - Mentors endpoint

  **Acceptance Criteria**:
  - [ ] Institution filter dropdown visible on mentors page
  - [ ] Selecting institution filters results
  - [ ] "All Institutions" option clears filter
  - [ ] Using browser: Navigate to `/mentors`, select institution, verify filtered results

  **Commit**: YES
  - Message: `feat(mentors): add institution filter`
  - Files: `app/mentors/page.tsx`, `app/actions/mentors.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 9. Add mentor cold-email template feature

  **What to do**:
  - Create `components/mentors/email-template-modal.tsx`
  - Add "Generate Email" button to `MentorCard`
  - Create `app/actions/mentor-email.ts` server action
  - Use AI (getAIManager) to generate personalized cold email
  - Include mentor's research areas, user's interests, and suggested collaboration points
  - Show generated email in modal with copy button

  **Must NOT do**:
  - Send emails directly
  - Store email drafts in database
  - Use external email service APIs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: AI integration + modal UI + prompt engineering
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 10)
  - **Blocks**: Task 11
  - **Blocked By**: Task 8

  **References**:
  - `lib/ai/manager.ts` - getAIManager pattern
  - `components/mentors/mentor-card.tsx` - Where to add button
  - `app/actions/mentors.ts` - Mentor type definition

  **Acceptance Criteria**:
  - [ ] "Generate Email" button on mentor cards
  - [ ] Modal shows AI-generated email template
  - [ ] Email includes mentor's research areas
  - [ ] Email includes user's relevant interests/goals
  - [ ] Copy button works
  - [ ] Using browser: Click "Generate Email", verify personalized content

  **Commit**: YES
  - Message: `feat(mentors): add AI cold-email template generation`
  - Files: `components/mentors/email-template-modal.tsx`, `app/actions/mentor-email.ts`, `components/mentors/mentor-card.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [x] 10. Migrate legacy spawn() to fetch()

  **What to do**:
  - Update `app/api/discovery/batch/route.ts` to use fetch() to SCRAPER_API_URL
  - Update `app/api/discovery/daily/route.ts` to call `/api/v1/jobs/daily-crawl`
  - Remove child_process imports from these files
  - Update any cache-stats routes if they use spawn
  - Delete or deprecate `ec-scraper/scripts/batch_discovery.py` references

  **Must NOT do**:
  - Remove ec-scraper directory entirely (may have other uses)
  - Change API response format
  - Break existing SSE streaming

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward refactor, pattern established
  - **Skills**: [`git-master`]
    - `git-master`: Clean atomic commit for migration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9)
  - **Blocks**: Task 12
  - **Blocked By**: None

  **References**:
  - `app/api/discovery/stream/route.ts` - Pattern to follow (uses fetch)
  - `app/api/discovery/batch/route.ts` - To migrate
  - `app/api/discovery/daily/route.ts` - To migrate
  - `Networkly-scrape/ENDPOINTS.md` - API endpoints to use

  **Acceptance Criteria**:
  - [ ] No `child_process` imports in api/discovery routes
  - [ ] No `spawn()` calls in production code
  - [ ] `grep -r "child_process" app/api/discovery/` → no results
  - [ ] Batch discovery still works via SCRAPER_API_URL
  - [ ] Daily crawl trigger works

  **Commit**: YES
  - Message: `refactor(api): migrate spawn() to fetch() for Cloud Run`
  - Files: `app/api/discovery/batch/route.ts`, `app/api/discovery/daily/route.ts`
  - Pre-commit: `npx tsc --noEmit`

---

### Wave 4: Quality & Deploy

- [x] 11. Write tests for new features

  **What to do**:
  - Create test files for new server actions
  - Test `event-discovery.ts` actions
  - Test `goal-discovery.ts` actions
  - Test `similar-opportunities.ts` actions
  - Test `opportunity-status.ts` actions
  - Test `mentor-email.ts` actions
  - Mock SCRAPER_API_URL calls with msw or vitest mocks

  **Must NOT do**:
  - Write E2E tests (manual verification sufficient)
  - Test existing features (only new code)
  - Add new test dependencies

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Following established test patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 12)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 4, 5, 6, 7, 9

  **References**:
  - `__tests__/` - Existing test patterns
  - `vitest.config.ts` - Test configuration
  - `app/actions/` - Actions to test

  **Acceptance Criteria**:
  - [ ] `pnpm test:run` → all new tests pass
  - [ ] Coverage for critical paths in new actions
  - [ ] Mocked external calls (no real API calls in tests)

  **Commit**: YES
  - Message: `test: add tests for new discovery and tracking features`
  - Files: `__tests__/actions/*.test.ts`
  - Pre-commit: `pnpm test:run`

---

- [x] 12. Create deployment documentation

  **What to do**:
  - Create `docs/DEPLOYMENT.md` with:
    - Vercel environment variables list
    - Cloud Run configuration requirements
    - Step-by-step deployment guide
    - Health check verification steps
    - Troubleshooting common issues
  - Update `.env.example` with all required variables
  - Add deployment checklist

  **Must NOT do**:
  - Include actual secrets/tokens
  - Automate deployment (documentation only)
  - Modify infrastructure

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Technical documentation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 11)
  - **Blocks**: Task 13
  - **Blocked By**: Task 10

  **References**:
  - `Networkly-scrape/DEPLOYMENT.md` - Scraper deployment docs
  - `Networkly-scrape/FRONTEND_INTEGRATION.md` - Existing integration docs
  - `.env.example` - Current env vars

  **Acceptance Criteria**:
  - [ ] `docs/DEPLOYMENT.md` exists with complete guide
  - [ ] All environment variables documented
  - [ ] Deployment steps are clear and sequential
  - [ ] Troubleshooting section covers common errors

  **Commit**: YES
  - Message: `docs: add production deployment guide`
  - Files: `docs/DEPLOYMENT.md`, `.env.example`
  - Pre-commit: None

---

- [x] 13. Final integration testing

  **What to do**:
  - Start local scraper and frontend
  - Test complete user flow:
    1. Search for opportunities → discovery works
    2. View opportunity → similar opportunities appear
    3. Set status on opportunity → persists
    4. Search events → discovery works with filters
    5. Create project → find opportunities button works
    6. Search mentors → filter works
    7. Generate email → AI template appears
  - Fix any integration issues discovered

  **Must NOT do**:
  - Add new features
  - Change verified working features
  - Skip any test scenario

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Manual verification, minimal code changes
  - **Skills**: [`playwright`]
    - `playwright`: Browser automation for verification

  **Parallelization**:
  - **Can Run In Parallel**: NO - Final sequential task
  - **Parallel Group**: None (sequential)
  - **Blocks**: None (completion)
  - **Blocked By**: Tasks 11, 12

  **References**:
  - All modified files from previous tasks
  - `Networkly-scrape/TEST_RESULTS.md` - Scraper test results

  **Acceptance Criteria**:
  - [ ] All 7 user flows complete successfully
  - [ ] No console errors during testing
  - [ ] `pnpm build` completes successfully
  - [ ] Application runs without crashes

  **Commit**: YES (if fixes needed)
  - Message: `fix: integration testing fixes`
  - Files: Any files requiring fixes
  - Pre-commit: `pnpm build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(scraper): resolve Python type errors` | `app/config.py`, `app/services/*.py` | `pytest` |
| 2 | `feat(events): add event discovery action` | `app/actions/event-discovery.ts` | `tsc` |
| 3 | `feat(projects): add goal discovery action` | `app/actions/goal-discovery.ts` | `tsc` |
| 4 | `feat(events): add AI discovery with filters` | `app/events/*` | `tsc` |
| 5 | `feat(projects): add goal-based discovery` | `components/projects/*` | `tsc` |
| 6 | `feat(opportunities): add similar opportunities` | `components/opportunities/*` | `tsc` |
| 7 | `feat(opportunities): add status tracking` | `app/actions/*`, `components/*` | `tsc` |
| 8 | `feat(mentors): add institution filter` | `app/mentors/*` | `tsc` |
| 9 | `feat(mentors): add email templates` | `components/mentors/*` | `tsc` |
| 10 | `refactor(api): migrate spawn to fetch` | `app/api/discovery/*` | `tsc` |
| 11 | `test: add tests for new features` | `__tests__/*` | `pnpm test` |
| 12 | `docs: add deployment guide` | `docs/*` | None |
| 13 | `fix: integration fixes` | Various | `pnpm build` |

---

## Success Criteria

### Verification Commands
```bash
# TypeScript compiles
npx tsc --noEmit

# Build succeeds
pnpm build

# Tests pass
pnpm test:run

# Python scraper works
cd Networkly-scrape && pytest tests/ -x

# No spawn calls in production
grep -r "child_process" app/api/discovery/  # Should return nothing
```

### Final Checklist
- [ ] All scraper endpoints accessible from UI
- [ ] Events page has AI discovery with filters
- [ ] Projects page has goal-based discovery
- [ ] Opportunities show similar recommendations
- [ ] Application status can be set and persists
- [ ] Mentor search has institution filter
- [ ] Mentor email generation works
- [ ] No spawn() calls in API routes
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Deployment docs complete
