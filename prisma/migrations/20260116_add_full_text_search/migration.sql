-- Enable PostgreSQL extensions for advanced search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================================
-- USER FULL-TEXT SEARCH
-- ============================================================================

-- Add search vector column (auto-updated via trigger or generated column)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(headline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bio, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(university, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(skills, ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(interests, ' ')), 'C')
  ) STORED;

-- GIN index for full-text search (fast tsvector matching)
CREATE INDEX IF NOT EXISTS idx_user_search_vector ON "User" USING GIN(search_vector);

-- Trigram index for fuzzy name matching (typo tolerance)
CREATE INDEX IF NOT EXISTS idx_user_name_trgm ON "User" USING gin (name gin_trgm_ops);

-- ============================================================================
-- PROJECT FULL-TEXT SEARCH
-- ============================================================================

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(tags, ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string("lookingFor", ' ')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_project_search_vector ON "Project" USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_project_title_trgm ON "Project" USING gin (title gin_trgm_ops);

-- ============================================================================
-- OPPORTUNITY FULL-TEXT SEARCH
-- ============================================================================

ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(company, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(type, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(skills, ' ')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_opportunity_search_vector ON "Opportunity" USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_opportunity_title_trgm ON "Opportunity" USING gin (title gin_trgm_ops);

-- ============================================================================
-- EVENT FULL-TEXT SEARCH
-- ============================================================================

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(type, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_event_search_vector ON "Event" USING GIN(search_vector);
