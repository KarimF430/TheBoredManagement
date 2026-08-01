-- ============================================================
-- Migration 009 — distinguish "never analyzed" from "analyzed, no brands"
-- PASTE THIS INTO THE SUPABASE SQL EDITOR AND RUN IT (safe to re-run)
--
-- /api/brands/analyze used COUNT(*) on brand_analysis to decide whether a
-- video had already been checked. A video with zero detected brands writes
-- zero rows, so it was indistinguishable from "never analyzed" and got
-- reprocessed — with a real LLM call — on every single re-run. This silently
-- multiplied cost and defeated the resumable "call again with the same
-- video_ids" design, since most videos in a diverse pool genuinely have no
-- brand mentions.
-- ============================================================

ALTER TABLE videos ADD COLUMN IF NOT EXISTS brand_analysis_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_videos_brand_analysis_checked_at
  ON videos (brand_analysis_checked_at) WHERE brand_analysis_checked_at IS NULL;
