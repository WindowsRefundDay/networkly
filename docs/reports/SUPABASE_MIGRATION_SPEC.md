# SUPABASE MIGRATION SPECIFICATION

**Project:** Networkly Frontend  
**Created:** 2026-01-19  
**Updated:** 2026-01-23  
**Status:** APPROVED - Ready for Implementation  
**Priority:** Medium (Not Urgent)  

---

## SUPABASE PROJECT CREDENTIALS

> **IMPORTANT**: These are the ACTUAL credentials for this project.
> When implementing, use these exact values.

| Credential | Value |
|------------|-------|
| **Project URL** | `https://syfukclbwllqfdhhabey.supabase.co` |
| **Publishable Key** | `sb_publishable_SVkutI5FkQXWHgtoQYSgJQ_rcN7LbLU` |
| **Secret Key** | `sb_secret_BMdCEvXA0wLVNlHRGtyhMA_b8CM1GvI` |
| **Project Ref** | `syfukclbwllqfdhhabey` |

### API Key Format (2025-2026 - NEW FORMAT)

Supabase has transitioned to a **new API key format** as of 2025:

| Old Format (Legacy) | New Format (Current) | Purpose |
|---------------------|----------------------|---------|
| `eyJhbGciOiJIUzI1...` (anon) | `sb_publishable_...` | Client-side, safe to expose |
| `eyJhbGciOiJIUzI1...` (service_role) | `sb_secret_...` | Server-side only, bypasses RLS |

**Key Differences:**
- **Publishable keys** (`sb_publishable_`): Low privileges, safe for browsers/mobile apps
- **Secret keys** (`sb_secret_`): Elevated privileges, backend only, instantly revocable
- Secret keys return HTTP 401 if accidentally used in a browser
- Legacy JWT keys (`eyJ...`) still work during transition but will be deprecated late 2026

**Usage is identical** - just pass the new format keys to `createClient()`:

```typescript
// Works exactly the same with new key format
const supabase = createClient(
  'https://syfukclbwllqfdhhabey.supabase.co',
  'sb_publishable_SVkutI5FkQXWHgtoQYSgJQ_rcN7LbLU'  // New format
)
```

---

## EXECUTIVE SUMMARY

Full migration from Prisma + Clerk to Supabase (Database + Auth + Real-time).
Fresh start - no data migration required.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | Supabase PostgreSQL | Unified platform |
| Auth | Supabase Auth | Native RLS integration, future subscriptions |
| ORM | Supabase JS Client | No Prisma dependency |
| Real-time | Supabase Realtime | Live updates for opportunities |
| Vector Search | Supabase pgvector | Replace ChromaDB |
| Rate Limiting | Keep Upstash Redis | Already works well |
| Python Scraper DB | Supabase PostgreSQL | Same connection |
| Python Local Cache | Migrate to Supabase | Consolidate SQLite queues |

### Estimated Effort

| Phase | Days | Description |
|-------|------|-------------|
| 1. Setup | 1 | Project creation, env config |
| 2. Schema | 2 | SQL migrations, RLS policies |
| 3. Auth | 2 | Replace Clerk with Supabase Auth |
| 4. Client Layer | 1 | Supabase client utilities |
| 5. Server Actions | 4 | Rewrite 19 action files |
| 6. API Routes | 3 | Rewrite 19 API routes |
| 7. Python Scraper | 2 | Update DB access, migrate to pgvector |
| 8. Testing | 2 | Verify all functionality |
| 9. Cleanup | 1 | Remove Prisma/Clerk, update docs |
| **Total** | **18 days** | ~3.5 weeks |

---

## PHASE 1: PROJECT SETUP

### 1.1 Supabase Project (ALREADY CREATED)

Project is already created at: https://supabase.com/dashboard/project/syfukclbwllqfdhhabey

### 1.2 Environment Variables

**File:** `.env.local` (create new)

```env
# Supabase (NEW KEY FORMAT - 2025+)
NEXT_PUBLIC_SUPABASE_URL=https://syfukclbwllqfdhhabey.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SVkutI5FkQXWHgtoQYSgJQ_rcN7LbLU
SUPABASE_SECRET_KEY=sb_secret_BMdCEvXA0wLVNlHRGtyhMA_b8CM1GvI

# Database Connection String (get from Supabase Dashboard -> Settings -> Database)
# Format: postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
DATABASE_URL=postgres://postgres.syfukclbwllqfdhhabey:[YOUR_DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Keep existing
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# AI providers (unchanged)
GROQ_API_KEY=...
GOOGLE_AI_API_KEY=...
OPENROUTER_API_KEY=...
```

> **Note**: Get the DATABASE_URL from Supabase Dashboard -> Settings -> Database -> Connection string (with password)

### 1.3 Dependencies

**Add:**
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

**Remove (after migration complete):**
```bash
pnpm remove @clerk/nextjs @prisma/client prisma
```

---

## PHASE 2: DATABASE SCHEMA

### 2.1 Schema Migration Strategy

Convert Prisma schema to SQL migrations. Tables maintain same structure
but with Supabase conventions.

### 2.2 SQL Schema

**File:** `supabase/migrations/001_initial_schema.sql`

```sql
-- ============================================================================
-- USERS & AUTH
-- ============================================================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  headline TEXT,
  bio TEXT,
  location TEXT,
  university TEXT,
  graduation_year INTEGER,
  skills TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  connections INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  search_appearances INTEGER DEFAULT 0,
  completed_projects INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'connections')),
  is_profile_complete BOOLEAN DEFAULT false,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  last_viewed_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_updated_by TEXT,
  profile_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link to Supabase Auth
ALTER TABLE public.users 
  ADD CONSTRAINT users_auth_fk 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_visibility ON public.users(visibility);

-- ============================================================================
-- OPPORTUNITIES (Primary entity for discovery)
-- ============================================================================

CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Main content (from ec-scraper OpportunityCard)
  title TEXT NOT NULL,
  description TEXT NOT NULL,  -- Maps to ec-scraper's 'summary'
  company TEXT NOT NULL,      -- Maps to ec-scraper's 'organization'
  location TEXT NOT NULL,
  
  -- Classification
  type TEXT NOT NULL,         -- Maps to ec-scraper's 'opportunity_type' enum
  category TEXT DEFAULT 'Other',
  suggested_category TEXT,    -- AI-suggested category when 'Other' is used
  skills TEXT[] DEFAULT '{}', -- Maps to ec-scraper's 'tags'
  
  -- Eligibility (from ec-scraper)
  grade_levels INTEGER[] DEFAULT '{}',  -- Eligible grades (9-12)
  location_type TEXT DEFAULT 'Online',  -- 'In-Person', 'Online', 'Hybrid'
  
  -- Dates & Logistics
  deadline TIMESTAMPTZ,
  posted_date TIMESTAMPTZ DEFAULT now(),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- Additional Details (from ec-scraper)
  cost TEXT,                  -- e.g., 'Free', '$500'
  time_commitment TEXT,       -- e.g., '10 hrs/week'
  prizes TEXT,                -- Awards or prizes offered
  contact_email TEXT,         -- Contact email
  application_url TEXT,       -- Direct application URL
  
  -- Display
  logo TEXT,
  salary TEXT,
  duration TEXT,
  remote BOOLEAN DEFAULT false,
  applicants INTEGER DEFAULT 0,
  requirements TEXT,
  
  -- Source Tracking
  source_url TEXT,            -- URL where this was discovered
  url TEXT,                   -- Direct page URL
  
  -- AI & Metadata
  extraction_confidence FLOAT DEFAULT 0.0,
  is_active BOOLEAN DEFAULT true,
  is_expired BOOLEAN DEFAULT false,
  timing_type TEXT DEFAULT 'one-time',  -- 'one-time', 'annual', 'recurring', 'rolling', 'ongoing', 'seasonal'
  last_verified TIMESTAMPTZ,
  recheck_at TIMESTAMPTZ,
  next_cycle_expected TIMESTAMPTZ,
  date_discovered TIMESTAMPTZ DEFAULT now(),  -- When first found by scraper
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_opportunities_category ON public.opportunities(category);
CREATE INDEX idx_opportunities_type ON public.opportunities(type);
CREATE INDEX idx_opportunities_active ON public.opportunities(is_active);
CREATE INDEX idx_opportunities_deadline ON public.opportunities(deadline);
CREATE INDEX idx_opportunities_recheck ON public.opportunities(recheck_at) WHERE is_active = true;

-- ============================================================================
-- USER-OPPORTUNITY RELATIONSHIP
-- ============================================================================

CREATE TABLE public.user_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  match_score INTEGER DEFAULT 0,
  match_reasons JSONB DEFAULT '[]',
  status TEXT DEFAULT 'curated' CHECK (status IN ('curated', 'saved', 'applied', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX idx_user_opps_user ON public.user_opportunities(user_id);
CREATE INDEX idx_user_opps_status ON public.user_opportunities(status);

-- ============================================================================
-- CONNECTIONS / NETWORK
-- ============================================================================

CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  mutual_connections INTEGER DEFAULT 0,
  match_reason TEXT,
  connected_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);

CREATE INDEX idx_connections_requester ON public.connections(requester_id);
CREATE INDEX idx_connections_receiver ON public.connections(receiver_id);
CREATE INDEX idx_connections_status ON public.connections(status);

-- ============================================================================
-- MESSAGES
-- ============================================================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  preview TEXT,
  unread BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_unread ON public.messages(unread);

-- ============================================================================
-- PROJECTS
-- ============================================================================

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT,
  category TEXT DEFAULT 'Other',
  status TEXT DEFAULT 'Planning',
  visibility TEXT DEFAULT 'public',
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  progress INTEGER DEFAULT 0,
  links JSONB DEFAULT '[]',
  looking_for TEXT[] DEFAULT '{}',
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_projects_category ON public.projects(category);
CREATE INDEX idx_projects_visibility ON public.projects(visibility);

CREATE TABLE public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Collaborator',
  UNIQUE(project_id, user_id)
);

CREATE TABLE public.project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ACHIEVEMENTS & EXTRACURRICULARS
-- ============================================================================

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Academic',
  description TEXT,
  date TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_achievements_user ON public.achievements(user_id);
CREATE INDEX idx_achievements_user_category ON public.achievements(user_id, category);

CREATE TABLE public.extracurriculars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_extracurriculars_user ON public.extracurriculars(user_id);

-- ============================================================================
-- USER GOALS
-- ============================================================================

CREATE TABLE public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_text TEXT NOT NULL,
  roadmap JSONB DEFAULT '[]',
  filters JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.profile_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profile_goals_user_status ON public.profile_goals(user_id, status);

-- ============================================================================
-- EVENTS
-- ============================================================================

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  attendees INTEGER DEFAULT 0,
  image TEXT,
  description TEXT,
  match_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- ============================================================================
-- RECOMMENDATIONS & ENDORSEMENTS
-- ============================================================================

CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  author_avatar TEXT,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.skill_endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill TEXT NOT NULL,
  endorser_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endorsee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(endorser_id, endorsee_id, skill)
);

CREATE INDEX idx_endorsements_endorsee ON public.skill_endorsements(endorsee_id);

-- ============================================================================
-- SOCIAL LINKS
-- ============================================================================

CREATE TABLE public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_social_links_platform ON public.social_links(platform);

-- ============================================================================
-- ANALYTICS & ACTIVITY
-- ============================================================================

CREATE TABLE public.analytics_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_views JSONB DEFAULT '[]',
  network_growth JSONB DEFAULT '[]',
  skill_endorsements JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  metadata JSONB,
  date TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activities_user_date ON public.user_activities(user_id, date);

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================

CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notify_opportunities BOOLEAN DEFAULT true,
  notify_connections BOOLEAN DEFAULT true,
  notify_messages BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT false,
  public_profile BOOLEAN DEFAULT true,
  show_activity_status BOOLEAN DEFAULT false,
  show_profile_views BOOLEAN DEFAULT true,
  ai_suggestions BOOLEAN DEFAULT true,
  auto_icebreakers BOOLEAN DEFAULT true,
  career_nudges BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- USER PROFILE (Extended for high school students)
-- ============================================================================

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  interests TEXT[] DEFAULT '{}',
  location TEXT,
  school TEXT,
  grade_level INTEGER,
  career_goals TEXT,
  preferred_opportunity_types TEXT[] DEFAULT '{}',
  academic_strengths TEXT[] DEFAULT '{}',
  availability TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- CHAT / AI SESSIONS
-- ============================================================================

CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- APPLICATIONS (Job tracking)
-- ============================================================================

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  status TEXT DEFAULT 'Applied',
  applied_date TIMESTAMPTZ DEFAULT now(),
  next_step TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PYTHON SCRAPER TABLES (Migrated from SQLite)
-- ============================================================================

CREATE TABLE public.pending_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  source TEXT,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_pending_urls_status ON public.pending_urls(status, priority);

-- URL Cache table (replaces ec-scraper's url_cache.db SQLite)
-- Used for deduplication and scheduled rechecks
CREATE TABLE public.url_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'success', 'failed', 'blocked', 'invalid'
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_recheck TIMESTAMPTZ,
  check_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  notes TEXT
);

CREATE INDEX idx_url_cache_domain ON public.url_cache(domain);
CREATE INDEX idx_url_cache_status ON public.url_cache(status);
CREATE INDEX idx_url_cache_next_recheck ON public.url_cache(next_recheck)
  WHERE next_recheck IS NOT NULL;

-- ============================================================================
-- VECTOR SEARCH (Replace ChromaDB with pgvector)
-- ============================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.opportunity_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  embedding vector(768),  -- Gemini embedding dimension
  content TEXT,  -- Original text for reference
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(opportunity_id)
);

-- Create HNSW index for fast similarity search
CREATE INDEX idx_opportunity_embeddings ON public.opportunity_embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- SUBSCRIPTIONS (Future - for subscription model)
-- ============================================================================

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_opportunities_updated_at BEFORE UPDATE ON public.user_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profile_goals_updated_at BEFORE UPDATE ON public.profile_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_event_registrations_updated_at BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON public.recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_social_links_updated_at BEFORE UPDATE ON public.social_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_analytics_data_updated_at BEFORE UPDATE ON public.analytics_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2.3 Row Level Security Policies

**File:** `supabase/migrations/002_rls_policies.sql`

```sql
-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracurriculars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

-- Users can read public profiles
CREATE POLICY "Public profiles are viewable"
  ON public.users FOR SELECT
  USING (visibility = 'public' OR id = (SELECT auth.uid()));

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = (SELECT auth.uid()));

-- Users can insert own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- OPPORTUNITIES POLICIES
-- ============================================================================

-- Anyone can read active opportunities
CREATE POLICY "Active opportunities are public"
  ON public.opportunities FOR SELECT
  USING (is_active = true);

-- Service role can insert/update (for Python scraper)
CREATE POLICY "Service role can manage opportunities"
  ON public.opportunities FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- USER-OPPORTUNITIES POLICIES
-- ============================================================================

-- Users can manage their own opportunity relationships
CREATE POLICY "Users manage own opportunity status"
  ON public.user_opportunities FOR ALL
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- CONNECTIONS POLICIES
-- ============================================================================

-- Users can see connections they're part of
CREATE POLICY "Users see own connections"
  ON public.connections FOR SELECT
  USING (requester_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));

-- Users can create connection requests
CREATE POLICY "Users can send connection requests"
  ON public.connections FOR INSERT
  WITH CHECK (requester_id = (SELECT auth.uid()));

-- Users can update connections they're involved in
CREATE POLICY "Users can respond to connections"
  ON public.connections FOR UPDATE
  USING (requester_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));

-- Users can delete their own connection requests
CREATE POLICY "Users can remove connections"
  ON public.connections FOR DELETE
  USING (requester_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can read messages they sent or received
CREATE POLICY "Users read own messages"
  ON public.messages FOR SELECT
  USING (sender_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = (SELECT auth.uid()));

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================

-- Public projects are viewable by all
CREATE POLICY "Public projects are viewable"
  ON public.projects FOR SELECT
  USING (visibility = 'public' OR owner_id = (SELECT auth.uid()));

-- Owners can manage their projects
CREATE POLICY "Owners manage projects"
  ON public.projects FOR ALL
  USING (owner_id = (SELECT auth.uid()));

-- Collaborators are viewable by project owners or the collaborator
CREATE POLICY "Project collaborators viewable"
  ON public.project_collaborators FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = (SELECT auth.uid())
    )
  );

-- Project owners manage collaborators
CREATE POLICY "Project owners manage collaborators"
  ON public.project_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = (SELECT auth.uid())
    )
  );

-- Project updates are readable for public projects or owners
CREATE POLICY "Project updates viewable"
  ON public.project_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.visibility = 'public' OR p.owner_id = (SELECT auth.uid()))
    )
  );

-- Project owners manage updates
CREATE POLICY "Project owners manage updates"
  ON public.project_updates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- PERSONAL DATA POLICIES (user-owned tables)
-- ============================================================================

-- Pattern: User can only access their own data
CREATE POLICY "Users manage own achievements"
  ON public.achievements FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own extracurriculars"
  ON public.extracurriculars FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own goals"
  ON public.user_goals FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own profile_goals"
  ON public.profile_goals FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own event_registrations"
  ON public.event_registrations FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own social_links"
  ON public.social_links FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own analytics"
  ON public.analytics_data FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own activities"
  ON public.user_activities FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own preferences"
  ON public.user_preferences FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own profile"
  ON public.user_profiles FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own chat"
  ON public.chat_sessions FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own chat_logs"
  ON public.chat_logs FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own applications"
  ON public.applications FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users manage own subscription"
  ON public.subscriptions FOR SELECT USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- EVENTS POLICIES
-- ============================================================================

-- Events are publicly readable
CREATE POLICY "Events are public"
  ON public.events FOR SELECT USING (true);

-- ============================================================================
-- RECOMMENDATIONS & ENDORSEMENTS
-- ============================================================================

-- Recommendations: receiver and author can see
CREATE POLICY "View recommendations"
  ON public.recommendations FOR SELECT
  USING (author_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));

-- Anyone can give recommendations
CREATE POLICY "Give recommendations"
  ON public.recommendations FOR INSERT
  WITH CHECK (author_id = (SELECT auth.uid()));

-- Endorsements follow same pattern
CREATE POLICY "View endorsements"
  ON public.skill_endorsements FOR SELECT
  USING (endorser_id = (SELECT auth.uid()) OR endorsee_id = (SELECT auth.uid()));

CREATE POLICY "Give endorsements"
  ON public.skill_endorsements FOR INSERT
  WITH CHECK (endorser_id = (SELECT auth.uid()));

-- ============================================================================
-- SCRAPER TABLES (Service role only)
-- ============================================================================

CREATE POLICY "Service role manages pending_urls"
  ON public.pending_urls FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages url_cache"
  ON public.url_cache FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages embeddings"
  ON public.opportunity_embeddings FOR ALL
  USING (auth.role() = 'service_role');

-- Read embeddings for search
CREATE POLICY "Authenticated users can search embeddings"
  ON public.opportunity_embeddings FOR SELECT
  USING (auth.role() = 'authenticated');
```

---

## PHASE 3: AUTHENTICATION MIGRATION

### 3.0 OAuth Providers & Authentication Overview

Supabase Auth fully supports **all major OAuth providers** that Clerk offers:

| Provider | Supported | Notes |
|----------|-----------|-------|
| ✅ Google | Yes | OAuth 2.0, One-Tap Sign-in |
| ✅ GitHub | Yes | OAuth 2.0 |
| ✅ Apple | Yes | Sign in with Apple |
| ✅ Microsoft | Yes | Azure AD / Microsoft accounts |
| ✅ Twitter/X | Yes | OAuth 2.0 |
| ✅ Discord | Yes | OAuth 2.0 |
| ✅ Facebook | Yes | OAuth 2.0 |
| ✅ LinkedIn | Yes | OAuth 2.0 |
| ✅ Spotify | Yes | OAuth 2.0 |
| ✅ Slack | Yes | OAuth 2.0 |
| ✅ Twitch | Yes | OAuth 2.0 |
| ✅ SAML 2.0 | Yes (Pro) | Enterprise SSO |

#### Clerk vs Supabase Auth Comparison

| Feature | Clerk | Supabase Auth |
|---------|-------|---------------|
| **Pre-built UI** | ✅ Beautiful drop-in components | ❌ Build your own (full control) |
| **Pricing** | Free tier then paid per MAU | Free with Supabase project |
| **Database integration** | External, requires Webhooks | Built-in with native RLS |
| **Session management** | Automatic via SDK | Cookie-based via middleware |
| **Customization** | Limited (themes only) | Full control over UI/UX |
| **OAuth Providers** | Many supported | Many supported |
| **MFA/2FA** | ✅ Built-in | ✅ Built-in (TOTP, SMS) |
| **Magic Links** | ✅ Supported | ✅ Supported |
| **User Metadata** | ✅ Custom fields | ✅ Stored in `auth.users` |
| **Webhooks** | ✅ For syncing | Not needed (same DB) |
| **Rate Limiting** | Built-in | Configure via Edge Functions |

#### Benefits of Switching to Supabase Auth

1. **Single Platform** - Auth, database, storage, real-time all in one project
2. **Row Level Security** - Auth user ID tied directly to database permissions (no webhook sync)
3. **No Vendor Lock-in** - You own your user data in `auth.users` table
4. **Cost** - Included free with Supabase (no per-MAU charges)
5. **Simplified Architecture** - No need to sync Clerk users to database via webhooks
6. **Future Subscriptions** - Stripe integration works directly with `auth.users`

### 3.1 Remove Clerk

**Files to delete:**
- `.clerk/` directory
- All Clerk imports and components
- `app/login/sso-callback/` (Clerk-only callback page)
- `app/signup/sso-callback/` (Clerk-only callback page)

**Files to modify:**

| File | Change |
|------|--------|
| `app/layout.tsx` | Remove `ClerkProvider`, add Supabase provider |
| `proxy.ts` | Replace Clerk middleware with Supabase session |
| `app/login/[[...sign-in]]/page.tsx` | Replace with Supabase auth form |
| `app/signup/[[...sign-up]]/page.tsx` | Replace with Supabase auth form |
| All 19 server actions | Replace `auth()` with Supabase `getUser()` |

### 3.2 Supabase Auth Setup

**File:** `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,  // New format: sb_publishable_...
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}

// Helper to get current user
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper to require auth (throws if not authenticated)
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
```

**File:** `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!  // New format: sb_publishable_...
  )
}
```

**File:** `lib/supabase/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,  // New format: sb_publishable_...
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
```

**File:** `proxy.ts` (updated)

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/api/health',
]

export default async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  // Add security headers
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  const path = request.nextUrl.pathname
  const isPublic = publicRoutes.some(route => 
    path === route || path.startsWith(`${route}/`)
  )

  // Redirect to login if not authenticated on protected route
  if (!isPublic && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if authenticated on auth pages
  if (user && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### 3.3 Auth UI Components

**File:** `app/login/[[...sign-in]]/page.tsx` (and `app/signup/[[...sign-up]]/page.tsx`)

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      },
    })
  }

  return (
    // Your login UI here - use existing styling from Clerk pages
  )
}
```

**File:** `app/auth/callback/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Create user profile if doesn't exist
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existingUser) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata.full_name || data.user.email!.split('@')[0],
          avatar: data.user.user_metadata.avatar_url,
        })
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

### 3.4 Google OAuth Setup (Supabase Dashboard)

**Step 1: Create Google OAuth Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**
5. Set up consent screen first (External, app name, email, logo)
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `Networkly Supabase Auth`
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - `https://your-domain.com` (production)
   - Authorized redirect URIs:
     - `https://syfukclbwllqfdhhabey.supabase.co/auth/v1/callback`

**Step 2: Configure in Supabase Dashboard**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/syfukclbwllqfdhhabey/auth/providers)
2. Navigate to **Authentication** → **Providers**
3. Enable **Google**
4. Enter your Client ID and Client Secret from Google Cloud Console
5. Save

**Environment Variables for OAuth:**

```env
# Add to .env.local for Google One-Tap (optional enhancement)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3.5 Google One-Tap Sign-In (Optional Enhancement)

For a seamless sign-in experience, implement Google One-Tap:

**File:** `components/auth/google-one-tap.tsx`

```typescript
'use client'

import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import type { CredentialResponse } from 'google-one-tap'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          cancel: () => void
        }
      }
    }
  }
}

// Generate nonce for secure ID token sign-in
const generateNonce = async (): Promise<[string, string]> => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const encoder = new TextEncoder()
  const encodedNonce = encoder.encode(nonce)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return [nonce, hashedNonce]
}

export function GoogleOneTap() {
  const supabase = createClient()
  const router = useRouter()
  const [nonce, setNonce] = useState<string | null>(null)

  useEffect(() => {
    const initializeOneTap = async () => {
      // Check for existing session first
      const { data: { session } } = await supabase.auth.getSession()
      if (session) return

      const [rawNonce, hashedNonce] = await generateNonce()
      setNonce(rawNonce)

      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
        })
        window.google.accounts.id.prompt()
      }
    }

    const handleCredentialResponse = async (response: CredentialResponse) => {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
        nonce: nonce!,
      })

      if (!error && data.user) {
        router.push('/dashboard')
        router.refresh()
      }
    }

    initializeOneTap()
  }, [nonce, router, supabase.auth])

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={() => {
        // Re-trigger after script loads
        const event = new Event('google-loaded')
        window.dispatchEvent(event)
      }}
    />
  )
}
```

**Usage in layout or login page:**

```tsx
// app/layout.tsx or app/login/[[...sign-in]]/page.tsx
import { GoogleOneTap } from '@/components/auth/google-one-tap'

// Add to your component:
<GoogleOneTap />
```

### 3.6 Other OAuth Providers

To add additional OAuth providers, follow the same pattern:

**File:** `components/auth/social-login-buttons.tsx`

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'

export function SocialLoginButtons() {
  const supabase = createClient()

  const handleOAuthLogin = async (provider: 'google' | 'github' | 'discord' | 'apple') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleOAuthLogin('google')}
      >
        <Icons.google className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleOAuthLogin('github')}
      >
        <Icons.github className="mr-2 h-4 w-4" />
        Continue with GitHub
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleOAuthLogin('discord')}
      >
        <Icons.discord className="mr-2 h-4 w-4" />
        Continue with Discord
      </Button>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleOAuthLogin('apple')}
      >
        <Icons.apple className="mr-2 h-4 w-4" />
        Continue with Apple
      </Button>
    </div>
  )
}
```

**Provider Setup Checklist:**

| Provider | Dashboard Location | Redirect URI |
|----------|-------------------|--------------|
| Google | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | `https://syfukclbwllqfdhhabey.supabase.co/auth/v1/callback` |
| GitHub | [GitHub Developer Settings](https://github.com/settings/developers) | `https://syfukclbwllqfdhhabey.supabase.co/auth/v1/callback` |
| Discord | [Discord Developer Portal](https://discord.com/developers/applications) | `https://syfukclbwllqfdhhabey.supabase.co/auth/v1/callback` |
| Apple | [Apple Developer](https://developer.apple.com/account/resources/identifiers/list/serviceId) | `https://syfukclbwllqfdhhabey.supabase.co/auth/v1/callback` |

> **Note**: All OAuth providers use the same Supabase callback URL format:  
> `https://<project-ref>.supabase.co/auth/v1/callback`

---

## PHASE 4: CLIENT LAYER

### 4.1 File Structure

```
lib/
├── supabase/
│   ├── client.ts       # Browser client
│   ├── server.ts       # Server component client
│   ├── middleware.ts   # Session refresh
│   ├── admin.ts        # Service role client (for Python)
│   └── types.ts        # Re-export database types
├── database.types.ts   # Generated types (supabase gen types)
└── utils.ts            # Keep cn() utility
```

### 4.2 Admin Client (for server-side operations)

**File:** `lib/supabase/admin.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

// Service role client - bypasses RLS
// Only use server-side, never expose to client
// Uses new secret key format: sb_secret_...
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,  // New format: sb_secret_...
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

### 4.3 Type Generation

```bash
# Add to package.json scripts
# Project ID is: syfukclbwllqfdhhabey
"db:types": "supabase gen types typescript --project-id syfukclbwllqfdhhabey > lib/database.types.ts"
```

Or run directly:
```bash
npx supabase gen types typescript --project-id syfukclbwllqfdhhabey > lib/database.types.ts
```

---

## PHASE 5: SERVER ACTIONS MIGRATION

### 5.1 Migration Pattern

**Before (Prisma + Clerk):**
```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

export async function updateProfile(data: UpdateProfileInput) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const user = await prisma.user.update({
    where: { clerkId: userId },
    data,
  })

  return user
}
```

**After (Supabase):**
```typescript
'use server'

import { createClient, requireAuth } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(data: UpdateProfileInput) {
  const authUser = await requireAuth()
  const supabase = await createClient()

  const { data: user, error } = await supabase
    .from('users')
    .update(data)
    .eq('id', authUser.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/profile')
  return user
}
```

### 5.2 Files to Migrate

| File | Priority | Complexity | Notes |
|------|----------|------------|-------|
| `app/actions/user.ts` | High | Medium | Core user operations |
| `app/actions/profile.ts` | High | Medium | Profile CRUD |
| `app/actions/connections.ts` | High | Medium | Network features |
| `app/actions/opportunities.ts` | High | Medium | Discovery core |
| `app/actions/chat.ts` | High | High | AI chat sessions |
| `app/actions/projects.ts` | Medium | High | 506L - complex |
| `app/actions/goals.ts` | Medium | Low | Simple CRUD |
| `app/actions/preferences.ts` | Medium | Low | Settings |
| `app/actions/profile-items.ts` | Medium | Medium | Nested data |
| `app/actions/analytics.ts` | Medium | Low | Read-heavy |
| `app/actions/dashboard.ts` | Medium | Low | Aggregations |
| `app/actions/messages.ts` | Medium | Medium | Real-time candidate |
| `app/actions/events.ts` | Low | Low | Event CRUD |
| `app/actions/recommendations.ts` | Low | Low | Simple CRUD |
| `app/actions/endorsements.ts` | Low | Low | Simple CRUD |
| `app/actions/applications.ts` | Low | Low | Job tracking |
| `app/actions/activity.ts` | Low | Low | Activity feed |
| `app/actions/discovery.ts` | Low | Medium | Discovery triggers |
| `app/actions/insights.ts` | Low | Medium | Analytics |
| `app/actions/search.ts` | Low | Low | Search functionality |

---

## PHASE 6: API ROUTES MIGRATION

### 6.1 Files to Migrate

| File | Complexity | Notes |
|------|------------|-------|
| `app/api/chat/route.ts` | High | AI streaming, session management |
| `app/api/discovery/stream/route.ts` | High | SSE, Python integration |
| `app/api/discovery/batch/route.ts` | Medium | Batch processing |
| `app/api/discovery/cache-stats/route.ts` | Low | Stats endpoint |
| `app/api/profile/[id]/route.ts` | Low | Profile fetch |
| `app/api/opportunities/[id]/route.ts` | Low | Opportunity detail |
| `app/api/ai/*.ts` | Medium | AI endpoints |
| `app/api/admin/*.ts` | Medium | Admin endpoints |
| `app/api/health/*.ts` | Low | Health checks |

---

## PHASE 7: PYTHON SCRAPER MIGRATION

### 7.1 Overview

The ec-scraper uses several local databases that need to migrate to Supabase:

| Current | Supabase Replacement | Purpose |
|---------|---------------------|---------|
| `sqlite_db.py` (opportunities) | `opportunities` table | Store extracted opportunities |
| `sqlite_db.py` (pending_urls) | `pending_urls` table | URL processing queue |
| `url_cache.py` (url_cache.db) | `url_cache` table | Deduplication & recheck scheduling |
| `vector_db.py` (ChromaDB) | `opportunity_embeddings` table | Semantic search with pgvector |

### 7.2 Environment Setup

**File:** `ec-scraper/.env`

```env
# Supabase Connection (use the secret key for service role access)
DATABASE_URL=postgres://postgres.syfukclbwllqfdhhabey:[YOUR_DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://syfukclbwllqfdhhabey.supabase.co
SUPABASE_SECRET_KEY=sb_secret_BMdCEvXA0wLVNlHRGtyhMA_b8CM1GvI

# Keep existing
GROQ_API_KEY=...
GOOGLE_AI_API_KEY=...
```

### 7.3 Update postgres_sync.py (Critical Changes)

**File:** `ec-scraper/src/api/postgres_sync.py`

```python
"""PostgreSQL sync for Supabase integration."""

import os
import sys
from typing import List, Optional
from datetime import datetime, timedelta

import asyncpg

from ..db.models import OpportunityCard, OpportunityTiming


class PostgresSync:
    """Sync opportunities to Supabase PostgreSQL database."""
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        self._pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> None:
        """Establish connection pool with Supabase."""
        if self._pool is None:
            # Supabase requires ssl='require' (not custom ssl_context)
            self._pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=5,
                ssl='require',  # CHANGED: Supabase uses 'require' not custom context
                command_timeout=30,
            )
    
    async def close(self) -> None:
        """Close connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
    
    async def upsert_opportunity(self, opportunity_card: OpportunityCard) -> str:
        """Insert or update an opportunity from an OpportunityCard."""
        await self.connect()
        
        async with self._pool.acquire() as conn:
            # Check if URL already exists (snake_case table name)
            existing = await conn.fetchrow(
                'SELECT id FROM opportunities WHERE url = $1',  # Changed from "Opportunity"
                opportunity_card.url
            )
            
            # Map ec-scraper fields to Supabase schema
            recheck_days = getattr(opportunity_card, 'recheck_days', 14)
            recheck_at = datetime.utcnow() + timedelta(days=recheck_days)
            
            if existing:
                # Update existing record (snake_case columns)
                await conn.execute('''
                    UPDATE opportunities SET
                        title = $2,
                        company = $3,
                        description = $4,
                        location = $5,
                        location_type = $6,
                        type = $7,
                        category = $8,
                        suggested_category = $9,
                        deadline = $10,
                        start_date = $11,
                        end_date = $12,
                        skills = $13,
                        grade_levels = $14,
                        cost = $15,
                        time_commitment = $16,
                        prizes = $17,
                        contact_email = $18,
                        application_url = $19,
                        requirements = $20,
                        source_url = $21,
                        extraction_confidence = $22,
                        updated_at = $23,
                        timing_type = $24,
                        is_expired = $25,
                        next_cycle_expected = $26,
                        recheck_at = $27,
                        last_verified = $28
                    WHERE id = $1
                ''',
                    existing['id'],
                    opportunity_card.title,
                    opportunity_card.organization or 'Unknown',
                    opportunity_card.summary,  # Maps to description
                    opportunity_card.location or 'Remote',
                    opportunity_card.location_type.value,
                    opportunity_card.opportunity_type.value,
                    opportunity_card.category.value,
                    opportunity_card.suggested_category,
                    opportunity_card.deadline,
                    opportunity_card.start_date,
                    opportunity_card.end_date,
                    opportunity_card.tags,  # Maps to skills[]
                    opportunity_card.grade_levels,
                    opportunity_card.cost,
                    opportunity_card.time_commitment,
                    opportunity_card.prizes,
                    opportunity_card.contact_email,
                    opportunity_card.application_url,
                    opportunity_card.requirements,
                    opportunity_card.source_url,
                    opportunity_card.extraction_confidence,
                    datetime.utcnow(),
                    opportunity_card.timing_type.value,
                    opportunity_card.is_expired,
                    opportunity_card.next_cycle_expected,
                    recheck_at,
                    datetime.utcnow(),
                )
                return existing['id']
            else:
                # Insert new record
                import uuid
                new_id = str(uuid.uuid4())
                
                await conn.execute('''
                    INSERT INTO opportunities (
                        id, url, title, company, description, location, location_type,
                        type, category, suggested_category, deadline, start_date, end_date,
                        posted_date, skills, grade_levels, cost, time_commitment, prizes,
                        contact_email, application_url, requirements, source_url,
                        extraction_confidence, is_active, remote, applicants,
                        recheck_at, last_verified, date_discovered, created_at, updated_at,
                        timing_type, is_expired, next_cycle_expected
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
                        $27, $28, $29, $30, $31, $32, $33, $34, $35
                    )
                ''',
                    new_id,
                    opportunity_card.url,
                    opportunity_card.title,
                    opportunity_card.organization or 'Unknown',
                    opportunity_card.summary,
                    opportunity_card.location or 'Remote',
                    opportunity_card.location_type.value,
                    opportunity_card.opportunity_type.value,
                    opportunity_card.category.value,
                    opportunity_card.suggested_category,
                    opportunity_card.deadline,
                    opportunity_card.start_date,
                    opportunity_card.end_date,
                    datetime.utcnow(),  # posted_date
                    opportunity_card.tags,
                    opportunity_card.grade_levels,
                    opportunity_card.cost,
                    opportunity_card.time_commitment,
                    opportunity_card.prizes,
                    opportunity_card.contact_email,
                    opportunity_card.application_url,
                    opportunity_card.requirements,
                    opportunity_card.source_url,
                    opportunity_card.extraction_confidence,
                    True,  # is_active
                    opportunity_card.location_type.value == 'Online',  # remote
                    0,  # applicants
                    recheck_at,
                    datetime.utcnow(),  # last_verified
                    datetime.utcnow(),  # date_discovered
                    datetime.utcnow(),  # created_at
                    datetime.utcnow(),  # updated_at
                    opportunity_card.timing_type.value,
                    opportunity_card.is_expired,
                    opportunity_card.next_cycle_expected,
                )
                return new_id
    
    async def sync_batch(self, opportunity_cards: List[OpportunityCard]) -> List[str]:
        """Sync multiple OpportunityCards to PostgreSQL."""
        ids = []
        for card in opportunity_cards:
            try:
                opp_id = await self.upsert_opportunity(card)
                ids.append(opp_id)
                sys.stderr.write(f"✓ Synced: {card.title}\n")
            except Exception as e:
                sys.stderr.write(f"✗ Failed to sync {card.title}: {e}\n")
        return ids
    
    async def archive_expired(self) -> int:
        """Archive opportunities past their deadline."""
        await self.connect()
        
        async with self._pool.acquire() as conn:
            # Only archive expired one-time opportunities
            result = await conn.execute('''
                UPDATE opportunities
                SET is_active = false, updated_at = $1
                WHERE deadline < $1 
                  AND is_active = true
                  AND (timing_type = 'one-time' OR timing_type IS NULL)
            ''', datetime.utcnow())
            
            # Mark recurring/annual opportunities as expired but keep active
            await conn.execute('''
                UPDATE opportunities
                SET is_expired = true, updated_at = $1
                WHERE deadline < $1 
                  AND is_active = true
                  AND timing_type IN ('annual', 'recurring', 'seasonal')
                  AND is_expired = false
            ''', datetime.utcnow())
            
            count = int(result.split()[-1]) if result else 0
            return count


# Singleton
_sync_instance: Optional[PostgresSync] = None


def get_postgres_sync() -> PostgresSync:
    """Get the PostgreSQL sync singleton."""
    global _sync_instance
    if _sync_instance is None:
        _sync_instance = PostgresSync()
    return _sync_instance
```

### 7.4 Create supabase_queue.py (Replace SQLite pending_urls)

**File:** `ec-scraper/src/db/supabase_queue.py` (new)

```python
"""Supabase-based URL queue for distributed scraper support."""

import os
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

import asyncpg

from .models import PendingURL


class SupabaseQueue:
    """Supabase PostgreSQL queue manager for pending URLs."""
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL required")
        self._pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> None:
        """Establish connection pool."""
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=3,
                ssl='require',
                command_timeout=30,
            )
    
    async def close(self) -> None:
        """Close connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
    
    async def add_pending_url(self, pending: PendingURL) -> bool:
        """Add a URL to the pending queue."""
        await self.connect()
        
        async with self._pool.acquire() as conn:
            try:
                await conn.execute('''
                    INSERT INTO pending_urls (id, url, source, discovered_at, priority, attempts, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (url) DO NOTHING
                ''',
                    pending.id,
                    pending.url,
                    pending.source,
                    pending.discovered_at,
                    pending.priority,
                    pending.attempts,
                    pending.status,
                )
                return True
            except Exception:
                return False
    
    async def get_pending_urls(self, limit: int = 10) -> List[PendingURL]:
        """Get pending URLs ordered by priority."""
        await self.connect()
        
        async with self._pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT id, url, source, discovered_at, priority, attempts, last_attempt, status
                FROM pending_urls
                WHERE status = 'pending'
                ORDER BY priority DESC, discovered_at ASC
                LIMIT $1
            ''', limit)
            
            return [
                PendingURL(
                    id=row['id'],
                    url=row['url'],
                    source=row['source'],
                    discovered_at=row['discovered_at'],
                    priority=row['priority'],
                    attempts=row['attempts'],
                    last_attempt=row['last_attempt'],
                    status=row['status'],
                )
                for row in rows
            ]
    
    async def update_pending_status(self, url: str, status: str) -> None:
        """Update the status of a pending URL."""
        await self.connect()
        
        async with self._pool.acquire() as conn:
            await conn.execute('''
                UPDATE pending_urls
                SET status = $1, last_attempt = $2, attempts = attempts + 1
                WHERE url = $3
            ''', status, datetime.utcnow(), url)


# Singleton
_queue_instance: Optional[SupabaseQueue] = None


async def get_supabase_queue() -> SupabaseQueue:
    """Get the Supabase queue singleton."""
    global _queue_instance
    if _queue_instance is None:
        _queue_instance = SupabaseQueue()
        await _queue_instance.connect()
    return _queue_instance
```

### 7.5 Create supabase_url_cache.py (Replace SQLite url_cache)

**File:** `ec-scraper/src/db/supabase_url_cache.py` (new)

```python
"""Supabase-based URL cache for deduplication and scheduled rechecks."""

import os
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from urllib.parse import urlparse

import asyncpg


class SupabaseURLCache:
    """Supabase PostgreSQL URL cache for deduplication."""
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL required")
        self._pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> None:
        """Establish connection pool."""
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=3,
                ssl='require',
                command_timeout=30,
            )
    
    async def close(self) -> None:
        """Close connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
    
    def _get_domain(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except Exception:
            return "unknown"
    
    async def is_seen(self, url: str, within_days: Optional[int] = None) -> bool:
        """Check if a URL has been seen before."""
        await self.connect()
        
        async with self._pool.acquire() as conn:
            if within_days is None:
                result = await conn.fetchrow(
                    "SELECT 1 FROM url_cache WHERE url = $1",
                    url
                )
            else:
                cutoff = datetime.utcnow() - timedelta(days=within_days)
                result = await conn.fetchrow(
                    "SELECT 1 FROM url_cache WHERE url = $1 AND last_checked >= $2",
                    url, cutoff
                )
            return result is not None
    
    async def mark_seen(
        self,
        url: str,
        status: str,
        expires_days: int = 30,
        notes: Optional[str] = None
    ) -> None:
        """Mark a URL as seen with a given status."""
        await self.connect()
        
        domain = self._get_domain(url)
        now = datetime.utcnow()
        next_recheck = now + timedelta(days=expires_days)
        
        async with self._pool.acquire() as conn:
            # Check if exists
            existing = await conn.fetchrow(
                "SELECT check_count, success_count FROM url_cache WHERE url = $1",
                url
            )
            
            if existing:
                check_count = existing['check_count'] + 1
                success_count = existing['success_count'] + (1 if status == "success" else 0)
                
                await conn.execute('''
                    UPDATE url_cache
                    SET status = $1, last_checked = $2, next_recheck = $3,
                        check_count = $4, success_count = $5, notes = $6
                    WHERE url = $7
                ''', status, now, next_recheck, check_count, success_count, notes, url)
            else:
                success_count = 1 if status == "success" else 0
                await conn.execute('''
                    INSERT INTO url_cache
                    (url, domain, status, first_seen, last_checked, next_recheck, check_count, success_count, notes)
                    VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)
                ''', url, domain, status, now, now, next_recheck, success_count, notes)
    
    async def get_pending_rechecks(self, limit: int = 100) -> List[Tuple[str, str]]:
        """Get URLs that are due for rechecking."""
        await self.connect()
        now = datetime.utcnow()
        
        async with self._pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT url, status
                FROM url_cache
                WHERE next_recheck IS NOT NULL
                  AND next_recheck <= $1
                  AND status IN ('success', 'failed')
                ORDER BY next_recheck ASC
                LIMIT $2
            ''', now, limit)
            
            return [(row['url'], row['status']) for row in rows]
    
    async def filter_unseen(self, urls: List[str], within_days: Optional[int] = None) -> List[str]:
        """Filter a list of URLs to only include unseen ones."""
        if not urls:
            return []
        
        unseen = []
        for url in urls:
            if not await self.is_seen(url, within_days):
                unseen.append(url)
        
        return unseen


# Singleton
_cache_instance: Optional[SupabaseURLCache] = None


async def get_supabase_url_cache() -> SupabaseURLCache:
    """Get the Supabase URL cache singleton."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = SupabaseURLCache()
        await _cache_instance.connect()
    return _cache_instance
```

### 7.6 Create supabase_vector.py (Replace ChromaDB)

**File:** `ec-scraper/src/db/supabase_vector.py` (new)

```python
"""Supabase pgvector for semantic search (replaces ChromaDB)."""

import os
from typing import List, Optional, Tuple

import asyncpg

from .models import OpportunityCard


class SupabaseVector:
    """Supabase pgvector manager for similarity search."""
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL required")
        self._pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> None:
        """Establish connection pool."""
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=3,
                ssl='require',
                command_timeout=30,
            )
    
    async def close(self) -> None:
        """Close connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
    
    async def add_embedding(
        self,
        opportunity_id: str,
        embedding: List[float],
        content: Optional[str] = None,
    ) -> None:
        """Add or update an embedding for an opportunity."""
        await self.connect()
        
        async with self._pool.acquire() as conn:
            # Convert list to pgvector format
            embedding_str = f"[{','.join(str(x) for x in embedding)}]"
            
            await conn.execute('''
                INSERT INTO opportunity_embeddings (opportunity_id, embedding, content)
                VALUES ($1, $2::vector, $3)
                ON CONFLICT (opportunity_id) DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    content = EXCLUDED.content,
                    created_at = now()
            ''', opportunity_id, embedding_str, content)
    
    async def add_opportunity_with_embedding(
        self,
        opportunity: OpportunityCard,
        embedding: List[float],
    ) -> None:
        """Add an opportunity card with its embedding."""
        content = opportunity.to_embedding_text()
        await self.add_embedding(opportunity.id, embedding, content)
    
    async def search_similar(
        self,
        query_embedding: List[float],
        limit: int = 10,
        category_filter: Optional[str] = None,
    ) -> List[Tuple[str, float, dict]]:
        """Search for similar opportunities by embedding."""
        await self.connect()
        
        embedding_str = f"[{','.join(str(x) for x in query_embedding)}]"
        
        async with self._pool.acquire() as conn:
            if category_filter:
                rows = await conn.fetch('''
                    SELECT 
                        e.opportunity_id,
                        1 - (e.embedding <=> $1::vector) as similarity,
                        o.title,
                        o.category,
                        o.type as opportunity_type,
                        o.url
                    FROM opportunity_embeddings e
                    JOIN opportunities o ON e.opportunity_id = o.id
                    WHERE o.category = $3 AND o.is_active = true
                    ORDER BY e.embedding <=> $1::vector
                    LIMIT $2
                ''', embedding_str, limit, category_filter)
            else:
                rows = await conn.fetch('''
                    SELECT 
                        e.opportunity_id,
                        1 - (e.embedding <=> $1::vector) as similarity,
                        o.title,
                        o.category,
                        o.type as opportunity_type,
                        o.url
                    FROM opportunity_embeddings e
                    JOIN opportunities o ON e.opportunity_id = o.id
                    WHERE o.is_active = true
                    ORDER BY e.embedding <=> $1::vector
                    LIMIT $2
                ''', embedding_str, limit)
            
            return [
                (
                    row['opportunity_id'],
                    float(row['similarity']),
                    {
                        'title': row['title'],
                        'category': row['category'],
                        'opportunity_type': row['opportunity_type'],
                        'url': row['url'],
                    }
                )
                for row in rows
            ]
    
    async def delete_by_id(self, opportunity_id: str) -> None:
        """Delete an embedding by opportunity ID."""
        await self.connect()
        
        async with self._pool.acquire() as conn:
            await conn.execute(
                'DELETE FROM opportunity_embeddings WHERE opportunity_id = $1',
                opportunity_id
            )
    
    async def count(self) -> int:
        """Count total embeddings."""
        await self.connect()
        
        async with self._pool.acquire() as conn:
            result = await conn.fetchval('SELECT COUNT(*) FROM opportunity_embeddings')
            return result or 0


# Singleton
_vector_instance: Optional[SupabaseVector] = None


async def get_supabase_vector() -> SupabaseVector:
    """Get the Supabase vector singleton."""
    global _vector_instance
    if _vector_instance is None:
        _vector_instance = SupabaseVector()
        await _vector_instance.connect()
    return _vector_instance
```

### 7.7 Update db/__init__.py

**File:** `ec-scraper/src/db/__init__.py` (update)

```python
"""Database module - Supabase integration."""

# Legacy SQLite imports (keep for backwards compatibility during migration)
from .sqlite_db import SQLiteDB, get_sqlite_db
from .url_cache import URLCache, get_url_cache
from .vector_db import VectorDB, get_vector_db

# New Supabase imports
from .supabase_queue import SupabaseQueue, get_supabase_queue
from .supabase_url_cache import SupabaseURLCache, get_supabase_url_cache
from .supabase_vector import SupabaseVector, get_supabase_vector

# Models
from .models import (
    OpportunityCard,
    OpportunityCategory,
    OpportunityType,
    OpportunityTiming,
    LocationType,
    PendingURL,
    ExtractionResult,
    ExtractionResponse,
)

# Default to Supabase for new code
# Set USE_SUPABASE=true in env to enable
import os
USE_SUPABASE = os.getenv('USE_SUPABASE', 'false').lower() == 'true'
```

### 7.8 Python Dependencies

**File:** `ec-scraper/pyproject.toml` (update dependencies)

```toml
[project]
dependencies = [
    # ... existing deps
    "asyncpg>=0.29.0",  # PostgreSQL async driver for Supabase
    # Remove or keep as optional:
    # "chromadb>=0.4.0",  # Only needed if keeping local vector DB as fallback
]
```

### 7.9 Migration Checklist for Python Scraper

- [ ] Update `ec-scraper/.env` with Supabase credentials
- [ ] Create `supabase_queue.py` (replaces SQLite pending_urls)
- [ ] Create `supabase_url_cache.py` (replaces SQLite url_cache)
- [ ] Create `supabase_vector.py` (replaces ChromaDB)
- [ ] Update `postgres_sync.py` with snake_case columns
- [ ] Update `db/__init__.py` with new imports
- [ ] Add `asyncpg` to dependencies
- [ ] Set `USE_SUPABASE=true` in environment
- [ ] Test scraper end-to-end with Supabase
- [ ] Verify opportunities sync correctly
- [ ] Verify embeddings work with pgvector

---

## PHASE 8: REAL-TIME FEATURES

### 8.1 Opportunity Updates

**File:** `hooks/use-realtime-opportunities.ts`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

type Opportunity = Database['public']['Tables']['opportunities']['Row']

export function useRealtimeOpportunities(category?: string) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    const fetchOpportunities = async () => {
      let query = supabase
        .from('opportunities')
        .select('*')
        .eq('is_active', true)
        .order('posted_date', { ascending: false })
        .limit(50)

      if (category) {
        query = query.eq('category', category)
      }

      const { data } = await query
      if (data) setOpportunities(data)
    }

    fetchOpportunities()

    // Subscribe to changes
    const channel = supabase
      .channel('opportunities-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'opportunities',
          filter: category ? `category=eq.${category}` : undefined,
        },
        (payload) => {
          setOpportunities((prev) => [payload.new as Opportunity, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'opportunities',
        },
        (payload) => {
          setOpportunities((prev) =>
            prev.map((opp) =>
              opp.id === payload.new.id ? (payload.new as Opportunity) : opp
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [category])

  return opportunities
}
```

### 8.2 Real-time Notifications

**File:** `hooks/use-notifications.ts`

Subscribe to messages and connection requests for live notifications.

### 8.3 Supabase Storage (Planned)

Storage is not implemented yet, but the schema uses URL fields (`users.avatar`, `projects.image`, `events.image`). Add buckets and policies now to standardize uploads when implementation begins.

**Buckets:**

| Bucket | Public | Purpose | Path Convention |
|--------|--------|---------|----------------|
| `avatars` | ✅ | User profile photos | `avatars/{user_id}/{file}` |
| `project-images` | ✅ | Project thumbnails | `project-images/{project_id}/{file}` |
| `documents` | ❌ | Future resumes/attachments | `documents/{user_id}/{file}` |

**Storage policies (SQL):**
```sql
-- Public read for avatars and project images
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Public read project images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

-- Authenticated users can manage their own uploads
CREATE POLICY "Users manage own avatars"
  ON storage.objects FOR ALL
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage own documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);
```

**Frontend mapping (when implemented):**
- `users.avatar` → public URL in `avatars` bucket
- `projects.image` → public URL in `project-images` bucket
- `events.image` → public URL in `project-images` bucket

---

## PHASE 9: TESTING STRATEGY

### 9.1 Test File Updates

| File | Changes |
|------|---------|
| `__tests__/profile/actions/*.test.ts` | Replace Prisma mocks with Supabase mocks |
| `vitest.config.ts` | Add Supabase mock setup |

### 9.2 Supabase Test Utils

**File:** `__tests__/utils/supabase-mock.ts`

Create mock utilities for testing Supabase operations.

---

## PHASE 10: CLEANUP

### 10.1 Files to Delete

```
prisma/
├── schema.prisma
├── seed.ts
└── migrations/

lib/prisma.ts
.clerk/

app/login/[[...sign-in]]/
app/signup/[[...sign-up]]/
app/login/sso-callback/
app/signup/sso-callback/
```

### 10.2 Dependencies to Remove

```bash
pnpm remove @clerk/nextjs @prisma/client prisma
```

### 10.3 Package.json Script Updates

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "db:types": "supabase gen types typescript --project-id syfukclbwllqfdhhabey > lib/database.types.ts",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset",
    "db:studio": "supabase studio"
  }
}
```

### 10.4 Documentation Updates

- Update `README.md` with Supabase setup instructions
- Update `AGENTS.md` to reflect new architecture
- Create `SUPABASE.md` with operational guide

---

## FUTURE: SUBSCRIPTION MODEL

### Stripe + Supabase Integration

**Already prepared:**
- `subscriptions` table in schema
- RLS policies for subscription data

**To implement when ready:**
1. Add Stripe webhook endpoint
2. Create subscription management UI
3. Add plan-based feature gating

```typescript
// Example: Check subscription status
export async function requirePro() {
  const user = await requireAuth()
  const supabase = await createClient()
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .single()
  
  if (subscription?.plan !== 'pro' || subscription?.status !== 'active') {
    throw new Error('Pro subscription required')
  }
  
  return user
}
```

---

## OPUS HANDOFF CHECKLIST (CODEBASE-SPECIFIC)

Use this checklist to ensure all Clerk/Prisma usage is fully replaced before final merge.

### Auth & Middleware
- Replace `ClerkProvider` in `app/layout.tsx` with Supabase session provider.
- Replace `proxy.ts` Clerk middleware with Supabase session refresh.
- Remove `app/login/sso-callback/` and `app/signup/sso-callback/` in favor of `app/auth/callback/route.ts`.

### Client Components (Clerk hooks)
- `components/header.tsx`
- `components/sidebar.tsx`
- `components/assistant/chat-interface.tsx`
- `components/profile/profile-header.tsx`

### Server Actions (Prisma + Clerk)
- All files in `app/actions/` (20 files listed in Phase 5)

### API Routes (Prisma + Clerk)
- All files in `app/api/` (19 routes listed in Phase 6)

### Tests
- Update Prisma mocks in `__tests__/profile/actions/*.test.ts`
- Add Supabase test utilities in `__tests__/utils/supabase-mock.ts`

---

## IMPLEMENTATION CHECKLIST

### Pre-Migration
- [x] User creates Supabase project ✅ DONE
- [x] User provides credentials (URL, publishable key, secret key) ✅ DONE
- [ ] Backup any data if needed (fresh start, so optional)

### Phase 1: Setup
- [ ] Add dependencies (@supabase/supabase-js, @supabase/ssr)
- [ ] Configure environment variables
- [ ] Generate database types

### Phase 2: Schema
- [ ] Run initial migration (001_initial_schema.sql)
- [ ] Apply RLS policies (002_rls_policies.sql)
- [ ] Verify tables in Supabase dashboard
- [ ] Enable pgvector extension

### Phase 3: Auth
- [ ] Create lib/supabase/ directory structure
- [ ] Implement browser client (client.ts)
- [ ] Implement server client (server.ts)
- [ ] Implement middleware helper (middleware.ts)
- [ ] Update proxy.ts
- [ ] Create login page
- [ ] Create signup page
- [ ] Create auth callback route
- [ ] Test auth flow end-to-end

### Phase 4: Client Layer
- [ ] Create admin client (admin.ts)
- [ ] Set up type generation script
- [ ] Generate initial types

### Phase 5: Server Actions
- [ ] Migrate app/actions/user.ts
- [ ] Migrate app/actions/profile.ts
- [ ] Migrate app/actions/connections.ts
- [ ] Migrate app/actions/opportunities.ts
- [ ] Migrate app/actions/chat.ts
- [ ] Migrate app/actions/projects.ts
- [ ] Migrate app/actions/goals.ts
- [ ] Migrate app/actions/preferences.ts
- [ ] Migrate app/actions/profile-items.ts
- [ ] Migrate app/actions/analytics.ts
- [ ] Migrate app/actions/dashboard.ts
- [ ] Migrate app/actions/messages.ts
- [ ] Migrate app/actions/events.ts
- [ ] Migrate app/actions/recommendations.ts
- [ ] Migrate app/actions/endorsements.ts
- [ ] Migrate app/actions/applications.ts
- [ ] Migrate app/actions/activity.ts
- [ ] Migrate app/actions/discovery.ts
- [ ] Migrate app/actions/insights.ts
- [ ] Migrate app/actions/search.ts

### Phase 6: API Routes
- [ ] Migrate app/api/chat/route.ts
- [ ] Migrate app/api/discovery/stream/route.ts
- [ ] Migrate app/api/discovery/batch/route.ts
- [ ] Migrate app/api/discovery/cache-stats/route.ts
- [ ] Migrate app/api/profile/[id]/route.ts
- [ ] Migrate app/api/opportunities/[id]/route.ts
- [ ] Migrate app/api/ai/*.ts
- [ ] Migrate app/api/admin/*.ts
- [ ] Migrate app/api/health/*.ts

### Phase 7: Python Scraper
- [ ] Update ec-scraper/.env with Supabase DATABASE_URL and SUPABASE_SECRET_KEY
- [ ] Update postgres_sync.py for Supabase (snake_case, ssl='require')
- [ ] Create supabase_queue.py (replaces SQLite pending_urls)
- [ ] Create supabase_url_cache.py (replaces SQLite url_cache)
- [ ] Create supabase_vector.py (replaces ChromaDB with pgvector)
- [ ] Update db/__init__.py with new imports
- [ ] Add asyncpg to pyproject.toml dependencies
- [ ] Set USE_SUPABASE=true in environment
- [ ] Test scraper end-to-end with Supabase
- [ ] Verify opportunities sync correctly to Supabase
- [ ] Verify embeddings work with pgvector

### Phase 8: Real-time Features
- [ ] Create use-realtime-opportunities.ts hook
- [ ] Create use-notifications.ts hook
- [ ] Integrate into opportunity discovery UI
- [ ] Test real-time updates
- [ ] Create Storage buckets (avatars, project-images, documents)
- [ ] Apply Storage RLS policies

### Phase 9: Testing
- [ ] Create Supabase mock utilities
- [ ] Update existing tests to use new mocks
- [ ] Run full test suite
- [ ] Manual E2E testing of all features

### Phase 10: Cleanup
- [ ] Delete prisma/ directory
- [ ] Delete lib/prisma.ts
- [ ] Delete .clerk/ directory
- [ ] Delete Clerk auth pages
- [ ] Remove Clerk and Prisma dependencies
- [ ] Update package.json scripts
- [ ] Update README.md
- [ ] Update AGENTS.md
- [ ] Final code review

---

## NOTES

- **Column naming**: Supabase uses snake_case; schema reflects this change from Prisma's camelCase
- **Python SSL**: Changed from CERT_NONE to `ssl='require'` for Supabase security
- **Secret key**: Used for Python scraper to bypass RLS (new format: `sb_secret_...`)
- **Real-time**: Enabled by default in Supabase for all tables
- **Subscriptions table**: Pre-created for future Stripe integration
- **RLS Performance**: All policies use `(SELECT auth.uid())` pattern for caching
- **New Key Format**: Using 2025+ format (`sb_publishable_`, `sb_secret_`) instead of legacy JWT keys

---

## QUICK REFERENCE

### Environment Variable Names (Copy-Paste Ready)

```env
NEXT_PUBLIC_SUPABASE_URL=https://syfukclbwllqfdhhabey.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SVkutI5FkQXWHgtoQYSgJQ_rcN7LbLU
SUPABASE_SECRET_KEY=sb_secret_BMdCEvXA0wLVNlHRGtyhMA_b8CM1GvI
```

### Key Files to Create

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser client (publishable key) |
| `lib/supabase/server.ts` | Server component client (publishable key) |
| `lib/supabase/middleware.ts` | Session refresh helper |
| `lib/supabase/admin.ts` | Service role client (secret key) |
| `lib/database.types.ts` | Generated TypeScript types |

### Commands

```bash
# Install dependencies
pnpm add @supabase/supabase-js @supabase/ssr

# Generate types
npx supabase gen types typescript --project-id syfukclbwllqfdhhabey > lib/database.types.ts

# Open Supabase Dashboard
open https://supabase.com/dashboard/project/syfukclbwllqfdhhabey

# SQL Editor (run migrations here)
open https://supabase.com/dashboard/project/syfukclbwllqfdhhabey/sql/new
```

### Migration Pattern (Prisma → Supabase)

**Before:**
```typescript
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

const { userId } = await auth()
const user = await prisma.user.findUnique({ where: { clerkId: userId } })
```

**After:**
```typescript
import { createClient, requireAuth } from '@/lib/supabase/server'

const authUser = await requireAuth()
const supabase = await createClient()
const { data: user } = await supabase.from('users').select('*').eq('id', authUser.id).single()
```

---

## CHANGELOG

### Version 1.3 (2026-01-23)
- **Added**: Missing fields and constraints aligned with Prisma schema
  - `users.last_updated_by`
  - `profile_goals.status` CHECK constraint
- **Added**: Missing indexes
  - `achievements(user_id, category)`
  - `profile_goals(user_id, status)`
  - `social_links(platform)`
- **Added**: RLS policies for `project_collaborators`, `project_updates`, `chat_logs`
- **Added**: Supabase Storage plan (buckets + policies)
- **Added**: Opus handoff checklist with codebase-specific targets

### Version 1.2 (2026-01-23)
- **Added**: Complete ec-scraper migration with code examples
  - `supabase_queue.py` (replaces SQLite pending_urls)
  - `supabase_url_cache.py` (replaces SQLite url_cache)
  - `supabase_vector.py` (replaces ChromaDB with pgvector)
  - Updated `postgres_sync.py` with snake_case columns
- **Added**: `url_cache` table in Supabase schema
- **Added**: Missing columns in `opportunities` table:
  - `suggested_category`, `grade_levels[]`, `location_type`
  - `start_date`, `end_date`, `cost`, `time_commitment`
  - `prizes`, `contact_email`, `application_url`
  - `date_discovered`
- **Added**: `last_attempt` column to `pending_urls` table
- **Added**: Partial index on `recheck_at` for active opportunities
- **Added**: RLS policy for `url_cache` table
- **Fixed**: Field mapping between ec-scraper OpportunityCard and Supabase schema
- **Fixed**: SSL connection for Supabase (use `ssl='require'` not custom context)

### Version 1.1 (2026-01-23)
- Initial spec with Supabase migration plan
- Auth migration from Clerk to Supabase Auth
- Phase-by-phase implementation guide

---

*Spec Version: 1.3*  
*Last Updated: 2026-01-23*  
*Author: AI Assistant (Antigravity)*
