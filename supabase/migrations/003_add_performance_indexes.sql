-- Performance indexes for opportunities table (4000+ rows)
-- These speed up the most common query patterns used by the app.

-- Composite index for the default page load query:
--   SELECT * FROM opportunities WHERE is_active = true ORDER BY deadline ASC
CREATE INDEX IF NOT EXISTS idx_opportunities_active_deadline
  ON opportunities (is_active, deadline ASC)
  WHERE is_active = true;

-- Composite index for type filtering:
--   .eq("is_active", true).eq("type", ...)
CREATE INDEX IF NOT EXISTS idx_opportunities_active_type
  ON opportunities (is_active, type)
  WHERE is_active = true;

-- Composite index for category filtering:
--   .eq("is_active", true).eq("category", ...)
CREATE INDEX IF NOT EXISTS idx_opportunities_active_category
  ON opportunities (is_active, category)
  WHERE is_active = true;

-- Trigram indexes for ilike text search (requires pg_trgm extension)
-- Used by searchOpportunities() and discovery search route
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_opportunities_title_trgm
  ON opportunities USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_opportunities_company_trgm
  ON opportunities USING gin (company gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_opportunities_category_trgm
  ON opportunities USING gin (category gin_trgm_ops);
