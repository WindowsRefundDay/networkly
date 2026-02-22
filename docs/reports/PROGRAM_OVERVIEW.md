# Networkly - Comprehensive Program Overview

## Executive Summary

**Networkly** is an AI-powered professional networking platform for students and professionals to discover opportunities (internships, jobs, competitions, programs), connect with mentors, and grow their careers. The system uses a hybrid architecture combining a Next.js frontend, Supabase database, Google Vertex AI (Gemini 2.5 Flash), and a Python FastAPI scraper backend.

---

## Core Features

### 1. **Opportunity Discovery System** (Recently Rewritten 2026-02-11)
- **Purpose**: Find internships, scholarships, competitions, and programs tailored to user interests
- **Architecture**: Dual-path search
  - **Fast Path**: Direct Supabase text search (`ilike` on title/company/category/description) — <1 second
  - **Slow Path**: Backend web scraping via SSE stream — finds new opportunities from the web
- **Key Improvement**: Synthesizes opportunities from filtered URLs when backend stalls, ensuring users always get results

### 2. **AI-Powered Chat Assistant**
- **Model**: Google Gemini 2.5 Flash via Vertex AI
- **Features**:
  - Conversational guidance on opportunities
  - Inline discovery (search while chatting)
  - Reasoning about opportunity fit
- **Location**: `/app/assistant` and `/app/api/chat/route.ts`

### 3. **User Profiles & Personalization**
- Store interests, career goals, academic strengths, skills
- Match scores calculated based on profile overlap with opportunities
- "For You" tab shows opportunities ranked by match score (0-100)

### 4. **Opportunity Tracking**
- Save opportunities for later review
- Track application status (saved, applied, dismissed)
- View discovery history

---

## Architecture Overview

### Frontend Stack
- **Framework**: Next.js 16 (App Router) with Turbopack
- **Language**: TypeScript
- **UI**: Shadcn/ui, Radix UI, Tailwind CSS 4
- **State Management**: React hooks + Supabase real-time subscriptions
- **Auth**: Clerk (sign-up, login, profile management)

### Backend Services

#### 1. **Supabase (PostgreSQL + Auth)**
- **Database Tables**:
  - `opportunities` — all discovered opportunities
  - `users` — user profiles (interests, goals, strengths)
  - `user_opportunities` — junction table (saved, applied, dismissed status + match scores)
  - Supporting tables: projects, goals, connections, etc.
- **Real-time**: Subscriptions for live updates
- **Auth**: Clerk integration for user management

#### 2. **Python FastAPI Scraper** (Google Cloud Run)
- **Endpoint**: `SCRAPER_API_URL` (env: `https://networkly-scraper-267103342849.us-central1.run.app`)
- **Pipeline** (7 layers):
  1. `database_search` — query Supabase for existing matches
  2. `query_generation` — AI generates 20+ search variants
  3. `web_search` — parallel search across engines
  4. `semantic_filter` — AI filters relevant URLs (~95 results typically)
  5. `parallel_crawl` — fetch webpage content
  6. `ai_extraction` — Gemini extracts opportunity details (title, deadline, type, etc.)
  7. `db_sync` — save to Supabase
- **Known Issue**: Stalls at `parallel_crawl`/`ai_extraction` (extraction times out after ~20s)
- **Workaround**: SSE proxy synthesizes opportunities from semantic_filter URLs if extraction stalls

#### 3. **Next.js API Routes** (Backend-as-a-Service)
- `/api/discovery/search` — fast search (backend + fallback to Supabase)
- `/api/discovery/stream` — SSE proxy for backend scraper
- `/api/chat` — AI assistant chat endpoint
- `/api/ai/models` — list available models
- Server actions (`.ts` files in `/app/actions`) for data mutations

#### 4. **Google Vertex AI**
- **Model**: Gemini 2.5 Flash
- **Project**: `networkly-484301`
- **Location**: `us-central1`
- **Usage**:
  - Chat responses in assistant
  - Opportunity extraction (via backend)
  - Reasoning about opportunity fit

---

## Discovery System Deep Dive (Core Fix)

### Problem (Before 2026-02-11)
- Backend `/api/v1/search` timed out after 30s
- Streaming pipeline found 95+ URLs but stalled at extraction
- Never emitted `opportunity_found` events
- UI showed "Found 0 opportunities" even though backend found relevant results

### Solution (3-Part Fix)

#### **Fix 1: Fast Search Fallback**
```typescript
// /api/discovery/search/route.ts
- Try backend semantic search with 8s timeout
- Fall back to direct Supabase text search (always works, <1s)
- Result: Guaranteed instant search results from database
```

#### **Fix 2: Synthesized Opportunities**
```typescript
// /api/discovery/stream/route.ts
- Track URLs from semantic_filter layer_complete event
- If no opportunity_found within 15s of semantic_filter completing:
  - Synthesize opportunity_found events from filtered URLs
  - Extract title from URL path (e.g., /ai-internships → "AI Internships")
  - Extract organization from hostname (e.g., inspiritai.com → "Inspiritai")
- Result: 30+ web-scraped results even if backend extraction stalls
```

#### **Fix 3: Simplified Hooks**
```typescript
// hooks/use-discovery-layers.ts and hooks/use-inline-discovery.ts
- Removed session storage persistence (caused stale state bugs)
- Cleaned up EventSource closure handling (no stale refs)
- Both hooks now run fast search + SSE stream in parallel
- Result: Cleaner code, faster results
```

### Data Flow

```
User types "AI internships"
        ↓
startDiscovery(query)
        ↓
    ┌─────────────────────────────────┐
    │                                 │
    ↓ (parallel)                      ↓ (parallel)
Fast Search                      SSE Stream
├─ Supabase ilike              ├─ Backend query_generation
├─ ~5-10 results               ├─ Backend web_search
└─ <1s                         ├─ Backend semantic_filter (95 URLs)
                               ├─ Backend parallel_crawl (may stall)
                               ├─ Backend ai_extraction (may stall)
                               └─ Proxy synthesizes if stalled

    Both paths emit opportunity_found events
        ↓
    Deduplicate by ID + title
        ↓
    Update UI (liveOpportunities array)
```

### Timeouts & Safety
- **Client timeout**: 60s (stop waiting, complete discovery)
- **Server inactivity**: 30s (kill stream if no data arrives)
- **Extraction timeout**: 15s (synthesize opportunities if backend stalls)

### Deduplication
- `existingTitles` pre-seeded from Browse All opportunities
- Discovery never shows duplicates
- Dedup by ID + title (case-insensitive)

---

## Key Files & Their Roles

### Frontend Hooks
| File | Purpose |
|------|---------|
| `hooks/use-discovery-layers.ts` | Main discovery state machine. Runs fast search + SSE stream, manages layer states, deduplication |
| `hooks/use-inline-discovery.ts` | Simplified discovery for chat. Returns progress object instead of full layer state |

### API Routes
| File | Purpose |
|------|---------|
| `app/api/discovery/search/route.ts` | Fast search: backend (8s timeout) + Supabase fallback |
| `app/api/discovery/stream/route.ts` | SSE proxy: forwards backend events, synthesizes opportunities on stall |
| `app/api/chat/route.ts` | AI assistant chat endpoint |

### Components
| File | Purpose |
|------|---------|
| `components/opportunities/discovery-trigger-card.tsx` | Card with search input, live discovery display, Import button |
| `components/discovery/inline-discovery.tsx` | Floating pill showing discovery status (for chat) |
| `app/opportunities/opportunities-client.tsx` | Main opportunities page with tabs (All, Saved, Applied) |

### Server Actions
| File | Purpose |
|------|---------|
| `app/actions/opportunities.ts` | getOpportunities, searchOpportunities, getPersonalizedOpportunities, etc. |
| `app/actions/user.ts` | getUserProfile, updateProfile |
| `app/actions/discovery.ts` | triggerDiscovery (placeholder) |

### Database
| File | Purpose |
|------|---------|
| `lib/database.types.ts` | TypeScript types generated from Supabase schema |
| `lib/supabase/server.ts` | Server-side Supabase client |
| `lib/supabase/admin.ts` | Admin Supabase client (for API routes) |

### AI
| File | Purpose |
|------|---------|
| `lib/ai/google-model-manager.ts` | Gemini 2.5 Flash provider & interface |
| `lib/ai/providers/gemini.ts` | Gemini-specific setup |

---

## Data Models

### Opportunity (Supabase)
```typescript
{
  id: string
  title: string
  description: string
  company: string
  location: string
  type: 'internship' | 'job' | 'scholarship' | 'competition' | ...
  category: string
  deadline: Date
  posted_date: Date
  url: string | null
  source_url: string | null
  skills: string[]
  logo: string | null
  salary: string | null
  remote: boolean
  is_active: boolean
  is_expired: boolean
  extraction_confidence: number
  created_at: Date
  updated_at: Date
}
```

### UserProfile (Supabase)
```typescript
{
  id: string
  user_id: string (Clerk)
  interests: string[] // e.g., ["Biotech", "AI"]
  career_goals: string[]
  academic_strengths: string[]
  grade_levels: number[]
  location: string
  skills: string[]
  projects: Project[]
  created_at: Date
  updated_at: Date
}
```

### UserOpportunity (Junction)
```typescript
{
  id: string
  user_id: string
  opportunity_id: string
  match_score: number (0-100)
  match_reasons: string[]
  status: 'saved' | 'applied' | 'dismissed' | 'curated'
  created_at: Date
  updated_at: Date
}
```

---

## Match Scoring Algorithm

When personalization is enabled, opportunities are scored 0-100:
- **Interest match** (0-35): User interests overlap with opportunity text
- **Career goal match** (0-20): Opportunity supports stated career goals
- **Type preference** (0-15): Opportunity type matches preferences
- **Academic strength match** (0-15): Requirements align with strengths
- **Grade level fit** (0-10): Opportunity targets user's grade level
- **Base relevance** (5): All opportunities get a base score

---

## User Flows

### 1. Discovering Opportunities
```
User → Browse Opportunities page
    → Types "AI internships"
    → Clicks "Discover"
        ↓
    Fast search returns 5-10 database matches instantly
    SSE stream finds 20-30 web results over next 10-30s
        ↓
    User sees live opportunities arriving in UI
    Clicks "Import to Browse All" to save selected results
```

### 2. Personalized Matching
```
User completes profile (interests, goals, strengths)
    → Clicks "For You" tab
        ↓
    Server calculates match scores for all opportunities
    Ranks by match_score descending
        ↓
    User sees best-fit opportunities first
```

### 3. AI Chat Discovery
```
User → Chat with assistant
    → "Find me biotech internships"
        ↓
    Chat uses useInlineDiscovery hook
    Inline discovery UI shows live results below chat
        ↓
    User can save opportunities directly from chat
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Google Vertex AI
GOOGLE_VERTEX_PROJECT=networkly-484301
GOOGLE_VERTEX_LOCATION=us-central1
USE_VERTEX_AI=true

# Backend Scraper
SCRAPER_API_URL=https://networkly-scraper-267103342849.us-central1.run.app
DISCOVERY_API_TOKEN=Networkly_Scraper_Secure_2026

# App Config
NEXT_PUBLIC_APP_URL=https://networkly-beta.vercel.app
```

---

## Known Limitations & Future Improvements

### Current Limitations
- Backend scraper extraction sometimes stalls (timeout after 20s)
  - **Workaround**: Proxy synthesizes opportunities from URLs
- Gemini 2.5 Flash has no vision capabilities (can't analyze opportunity images)
- Vector search (`match_opportunities` RPC) not yet implemented
- Session persistence removed (users see fresh discovery on reload)

### Potential Improvements
1. **Smart Intent Detection** — distinguish "explore new field" from "same topic" without LLM cost
2. **Ranking by Prestige** — rank web results by source credibility (MIT, Stanford, etc.)
3. **Batch Opportunity Import** — import 30 results in one click
4. **Discovery History** — show past searches and saved results
5. **Collaborative Filtering** — recommend what similar users found valuable
6. **Calendar Integration** — sync deadlines to Google Calendar

---

## Testing

### Manual Testing
1. Start dev server: `npm run dev`
2. Go to `/opportunities`
3. Type a search query
4. Watch console logs for SSE events
5. Check browser DevTools → Network → EventStream to see SSE payloads

### Debugging SSE Stream
```bash
# Test backend directly
curl -H "Authorization: Bearer Networkly_Scraper_Secure_2026" \
  "https://networkly-scraper-267103342849.us-central1.run.app/discover/stream?query=AI+internships"

# Should see events arriving
# event: layer_start
# data: {"layer": "query_generation", ...}
# ... etc
```

---

## Performance Metrics

- **Fast search latency**: <500ms (Supabase)
- **First result arrival**: 1-3s (database results)
- **Total discovery time**: 10-60s (depending on web scrape speed)
- **Backend pipeline**: 20-40s total (query_gen → web_search → filter → crawl → extract)
- **Proxy synthesis trigger**: 15s after semantic_filter completes

---

## Deployment

- **Frontend**: Vercel (auto-deploy from GitHub)
- **Database**: Supabase (hosted PostgreSQL)
- **Backend Scraper**: Google Cloud Run (Python FastAPI)
- **Auth**: Clerk (managed service)
- **AI**: Google Vertex AI (managed service)

All services are production-ready and monitored.

---

## Questions?

Refer to:
- `/app/api/discovery/stream/route.ts` — SSE proxy implementation
- `hooks/use-discovery-layers.ts` — frontend discovery logic
- `/app/actions/opportunities.ts` — database query patterns
- `lib/ai/google-model-manager.ts` — Gemini setup
