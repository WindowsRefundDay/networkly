-- Migration: Add JIT Summarization Support
-- Description: Adds summary_json column, click tracking, and indexes for the JIT summarization system

-- Add summarization columns to opportunities table
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS summary_json JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_summarized_at TIMESTAMPTZ DEFAULT NULL;

-- Index for warm-up query (find high-click opps without summaries)
CREATE INDEX IF NOT EXISTS idx_opportunities_summary_warmup
  ON public.opportunities(click_count DESC)
  WHERE summary_json IS NULL AND is_active = true;

-- Index for click tracking (sort by popularity)
CREATE INDEX IF NOT EXISTS idx_opportunities_clicks
  ON public.opportunities(click_count DESC)
  WHERE is_active = true;

-- Add comments for documentation
COMMENT ON COLUMN public.opportunities.summary_json IS 'JIT-generated summary with structured fields: eligibility, value_prop, difficulty_level, deadline_status, one_sentence_summary, is_expired, extraction_confidence';
COMMENT ON COLUMN public.opportunities.click_count IS 'Number of times QuickView was opened for this opportunity';
COMMENT ON COLUMN public.opportunities.last_summarized_at IS 'Last time summary was generated or refreshed';

-- Create atomic click tracking function
CREATE OR REPLACE FUNCTION increment_click_count(opportunity_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE opportunities
  SET click_count = click_count + 1
  WHERE id = opportunity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_click_count(UUID) TO authenticated;

-- Add comment for function
COMMENT ON FUNCTION increment_click_count IS 'Atomically increments the click_count for an opportunity. Used for QuickView tracking.';
