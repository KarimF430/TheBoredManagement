-- ============================================================
-- Migration 010: LLM Usage Tracking (per-video + per-project)
-- PASTE THIS INTO SUPABASE SQL EDITOR AND RUN IT
-- ============================================================

-- 1. llm_usage: every LLM API call logged
CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- What was called
  call_type TEXT NOT NULL,           -- 'brand_analysis' | 'irrelevance_detection' | 'metadata_analysis'
  model TEXT NOT NULL,               -- 'openai/gpt-4o-mini'
  provider TEXT NOT NULL DEFAULT 'openrouter',  -- 'openrouter' | 'openai_direct'

  -- Token counts
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,

  -- Cost (calculated at insert time from known rates)
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,

  -- Performance
  latency_ms INTEGER NOT NULL DEFAULT 0,

  -- Context
  transcript_length INTEGER DEFAULT 0,
  candidate_count INTEGER DEFAULT 0,
  brands_detected INTEGER DEFAULT 0,

  -- Metadata
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for cost queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_llm_video_id
  ON llm_usage (video_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_llm_campaign_id
  ON llm_usage (campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_llm_created_at
  ON llm_usage (created_at DESC);

-- 3. Composite index for campaign cost summaries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_llm_campaign_date
  ON llm_usage (campaign_id, created_at DESC)
  WHERE campaign_id IS NOT NULL;

-- 4. llm_usage_summary: materialized view for fast campaign-level queries
CREATE MATERIALIZED VIEW IF NOT EXISTS llm_usage_summary AS
SELECT
  campaign_id,
  DATE(created_at) AS usage_date,
  call_type,
  model,
  COUNT(*) AS call_count,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(cached_tokens) AS total_cached_tokens,
  SUM(total_tokens) AS total_tokens,
  SUM(cost_usd) AS total_cost_usd,
  AVG(latency_ms) AS avg_latency_ms,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) AS success_count,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS error_count
FROM llm_usage
WHERE campaign_id IS NOT NULL
GROUP BY campaign_id, DATE(created_at), call_type, model;

CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_summary_unique
  ON llm_usage_summary (campaign_id, usage_date, call_type, model);

-- 5. View: total cost per campaign (all time)
CREATE OR REPLACE VIEW llm_campaign_costs AS
SELECT
  campaign_id,
  COUNT(*) AS total_calls,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(cost_usd) AS total_cost_usd,
  AVG(latency_ms) AS avg_latency_ms,
  MIN(created_at) AS first_call,
  MAX(created_at) AS last_call
FROM llm_usage
WHERE campaign_id IS NOT NULL
GROUP BY campaign_id;

-- 6. View: cost per video
CREATE OR REPLACE VIEW llm_video_costs AS
SELECT
  video_id,
  campaign_id,
  SUM(cost_usd) AS total_cost_usd,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  COUNT(*) AS call_count,
  AVG(latency_ms) AS avg_latency_ms
FROM llm_usage
GROUP BY video_id, campaign_id;

-- 7. View: daily cost trend
CREATE OR REPLACE VIEW llm_daily_costs AS
SELECT
  DATE(created_at) AS usage_date,
  call_type,
  COUNT(*) AS calls,
  SUM(cost_usd) AS cost_usd,
  SUM(input_tokens) AS input_tokens,
  SUM(output_tokens) AS output_tokens,
  AVG(latency_ms) AS avg_latency_ms
FROM llm_usage
GROUP BY DATE(created_at), call_type
ORDER BY usage_date DESC;

-- 8. Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_llm_usage_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY llm_usage_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFY
-- ============================================================
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'llm_usage'
ORDER BY indexname;

SELECT viewname FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'llm_%';
