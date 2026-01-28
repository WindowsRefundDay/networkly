# Draft: Networkly Scraper-Frontend Integration

## Requirements (confirmed)
- User wants to "intertwine" the Networkly-scrape backend with the Networkly-Frontend
- All scraper endpoints should be usable from the UI
- Prepare for Google Cloud Run (scraper) + Vercel (frontend) deployment
- Ensure all user-facing features from the product spec are present in UI
- If features are missing or misrepresented, create new pages/elements

## Research Findings

### Scraper API Endpoints (Networkly-scrape)
| Endpoint | Method | Description | Current Frontend Integration |
|----------|--------|-------------|------------------------------|
| `/discover/stream` | GET | Real-time SSE discovery with layers | **INTEGRATED** via `app/api/discovery/stream/route.ts` |
| `/api/v1/search` (GET) | GET | Semantic DB search | **INTEGRATED** via `app/actions/discovery.ts` |
| `/api/v1/search` (POST) | POST | On-demand hybrid search | **INTEGRATED** via `app/actions/discovery.ts` |
| `/api/v1/mentors/search` | GET | Mentor/professor semantic search | **INTEGRATED** via `app/actions/mentors.ts` |
| `/api/v1/opportunities/{id}/similar` | GET | Similar opportunities | **NOT INTEGRATED** |
| `/api/v1/evaluate` | POST | URL relevance evaluation | **NOT INTEGRATED** |
| `/api/v1/jobs/daily-crawl` | POST | Trigger background crawl | **INTEGRATED** via `app/actions/discovery.ts` |
| `/health` | GET | Health check | **NOT INTEGRATED** |

### Frontend Pages Current State
| Page | Route | Features Present | Gaps |
|------|-------|------------------|------|
| Opportunities | `/opportunities` | Search, discovery trigger, cards, filters, tabs (All/Saved/Applied) | Missing: Similar opportunities, advanced filtering by category/type |
| Events | `/events` | Event list, registration, search | Missing: AI discovery for events, type filtering (online/in-person) |
| Mentors | `/mentors` | Search, save, suggested mentors | Missing: Institution filter, outreach templates |
| Projects | `/projects` | CRUD, discover, looking for help | Missing: Goal-aligned discovery integration |
| Dashboard | `/dashboard` | Stats, activity feed | Missing: Discovery shortcuts |
| Assistant | `/assistant` | AI chat | Missing: Inline opportunity cards in chat |

### Product Feature Audit

#### Discovery & Search
- [x] Natural-language search - PRESENT (via Gemini query generation)
- [x] Semantic search - PRESENT (pgvector)
- [x] Profile-aware results - PARTIAL (userProfileId passed but not all features use it)
- [x] Auto-discovery when nothing exists - PRESENT (SSE streaming)
- [x] Fast results (<30s) - PRESENT

#### Personalized Recommendations
- [x] Based on interests/goals - PARTIAL (backend supports, UI partially uses)
- [ ] Learning over time - NOT PRESENT (static per request)
- [x] Mix of local/online/national - PRESENT

#### Extracurricular Opportunities
- [x] Competitions, Clubs, Internships, etc. - PRESENT (OpportunityType enum)
- [x] Rich data extraction - PRESENT (OpportunityCard model)
- [ ] Scholarships - NOT EXPLICITLY PRESENT (may be "Other" type)
- [x] Shows: description, host, location, deadlines, source link, status - PRESENT

#### Events
- [x] In-person and online events - PRESENT in model (location_type)
- [x] Date-aware filtering - PARTIAL (backend has expiration, UI doesn't filter)
- [ ] Topic filter - NOT PRESENT in UI
- [ ] Time window filter - NOT PRESENT in UI

#### Projects & Goal-Based Discovery
- [x] Create project goals - PRESENT in Projects page
- [ ] Get aligned opportunities - NOT INTEGRATED (no link between projects and discovery)
- [ ] Suggested mentors for projects - NOT INTEGRATED

#### Research Mentor Finder
- [x] Find by topic - PRESENT
- [x] Institution matching - PRESENT in backend, NOT in UI filter
- [x] Links to profiles/labs - PRESENT
- [ ] Cold-email templates - NOT PRESENT

#### Categories & Organization
- [x] Categorized opportunities - PRESENT (types/categories)
- [ ] Semantic grouping - BACKEND supports (`/similar`), UI doesn't use
- [ ] Tag-based filtering - PARTIAL (backend has tags, UI filter incomplete)

#### Freshness & Accuracy
- [x] Auto-removes expired - PRESENT (daily crawl)
- [x] Updates deadlines - PRESENT (recheck logic)
- [x] Shows dates/relevance - PRESENT

#### Transparency & Trust
- [x] Links to original source - PRESENT
- [x] Shows host - PRESENT

#### Save & Track
- [x] Save opportunities - PRESENT
- [ ] Track application deadlines - NOT PRESENT
- [ ] Mark applied/interested/ignore - PARTIAL (only "saved")
- [ ] Personal roadmap - NOT PRESENT

### Technical Integration Status
- **Environment Variables**: `SCRAPER_API_URL`, `DISCOVERY_API_TOKEN` already configured
- **SSE Streaming**: Fully working via `use-discovery-layers.ts`
- **Event Types**: Frontend handles all backend event types
- **Legacy Python Spawning**: Still exists in `batch/route.ts` - NEEDS MIGRATION

### Deployment Configuration
- **Scraper**: Cloud Run at `https://networkly-scraper-267103342849.us-central1.run.app`
- **Frontend**: Vercel (needs `SCRAPER_API_URL` and `DISCOVERY_API_TOKEN` env vars)
- **SearXNG**: Deployed at `https://searxng-52ind3t2dq-uc.a.run.app`
- **Database**: Shared Supabase instance

## User Decisions (Confirmed)
1. **Events AI Discovery**: YES - Full discovery (same as Opportunities)
2. **Goal-Based Discovery**: YES - Add to Projects page ("Find opportunities for this project")
3. **Application Tracking**: Simple status (Applied/Interested/Dismissed)
4. **Mentor Features**: Filters + outreach help (institution filter + cold-email templates)
5. **Similar Opportunities**: YES - Show recommendations in expanded card view
6. **Legacy Code**: MIGRATE ALL - Convert spawn() to fetch() against Cloud Run

## Scope Boundaries
### INCLUDE (confirmed):
- Connect all scraper endpoints to UI
- Add `/similar` endpoint integration (for "You might also like")
- Add full AI Discovery to Events page (with online/in-person/topic/date filters)
- Add "Find opportunities for this project" button to Projects page
- Enhance mentor search with institution filter + AI cold-email drafts
- Add opportunity status tracking (Applied/Interested/Dismissed)
- Migrate legacy spawn() to fetch() against SCRAPER_API_URL
- Cloud Run + Vercel deployment config

### EXCLUDE (confirmed):
- Full CRM/application tracking system (simple status only)
- Learning/ML-based recommendation improvements
- Scholarship-specific features (use "Other" type)
- URL evaluation UI (backend only)
- Mobile-specific optimizations

## Technical Decisions
- Use `SCRAPER_API_URL` consistently across all integrations (already the pattern)
- Keep SSE streaming approach for real-time discovery (working well)
- Migrate batch routes from `spawn` to `fetch` against Cloud Run service

## Test Strategy Decision
- **Infrastructure exists**: YES (vitest)
- **User wants tests**: YES (after implementation)
- **Framework**: vitest
- **QA approach**: Tests after implementation + manual verification

## Additional Requirements
- Fix Python type errors in scraper codebase before deployment
- Include deployment guide for Vercel + Cloud Run
