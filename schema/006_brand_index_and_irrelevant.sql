-- ============================================================
-- Migration 006: Brand Analysis Index + Irrelevant Video System
-- PASTE THIS INTO SUPABASE SQL EDITOR AND RUN IT
-- ============================================================

-- 1. CRITICAL: index on brand_analysis.video_id
--    Without this, every "show brands for video X" query full-scans the table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ba_video_id
  ON brand_analysis (video_id)
  INCLUDE (brand_name, confidence, mention_type);

-- 2. Add irrelevant video columns to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_irrelevant BOOLEAN DEFAULT FALSE;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS irrelevant_reason TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS irrelevant_score REAL DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS irrelevant_detected_at TIMESTAMPTZ;

-- 3. Index for filtering out irrelevant videos during scraping
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vid_irrelevant
  ON videos (is_irrelevant)
  WHERE is_irrelevant = TRUE;

-- 4. Index for youtube_id lookups during scraping (if not exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vid_youtube_id
  ON videos (youtube_id);

-- 5. video_blacklist: permanent blocklist of youtube_ids to never process
--    This survives even if the videos table is cleaned up
CREATE TABLE IF NOT EXISTS video_blacklist (
  youtube_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'irrelevant',
  category TEXT,
  detected_by TEXT DEFAULT 'ai',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL
);

-- 6. Index for blacklist lookups during scraping
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vb_category
  ON video_blacklist (category);

-- 7. brand_analysis: composite index for campaign-wide brand queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ba_brand_video
  ON brand_analysis (brand_name, video_id)
  INCLUDE (confidence, mention_type);

-- ============================================================
-- VERIFY
-- ============================================================
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('brand_analysis', 'videos', 'video_blacklist')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
