-- ============================================================
-- Migration 008 — honest position labeling for supplemented Shorts
-- PASTE THIS INTO THE SUPABASE SQL EDITOR AND RUN IT (safe to re-run)
--
-- Long-form results always come from an unfiltered search page, so their
-- serp_position is the video's true universal YouTube search rank.
--
-- When a keyword's Shorts don't fill to 10 from that page, one extra
-- videoDuration=short call tops up the remaining slots. Those hits are
-- ranked within a Shorts-only result set, not the true unified SERP —
-- a slot-3 Short there could sit anywhere in the real top 50.
--
-- position_type records which kind of number serp_position actually is,
-- so nothing downstream (UI, exports, clients) presents a filtered-set
-- rank — or a cached-pool estimate — as if it were a true search position.
--
--   true_serp       — video's real position in an unfiltered YouTube search
--   shorts_filtered — position within a videoDuration=short-only result set
--   pool_fallback    — API was unreachable; position is a relevance guess
--                      over previously-cached videos, not from a live search
-- ============================================================

ALTER TABLE keyword_videos       ADD COLUMN IF NOT EXISTS position_type TEXT NOT NULL DEFAULT 'true_serp';
ALTER TABLE keyword_shorts       ADD COLUMN IF NOT EXISTS position_type TEXT NOT NULL DEFAULT 'true_serp';
ALTER TABLE keyword_rank_history ADD COLUMN IF NOT EXISTS position_type TEXT NOT NULL DEFAULT 'true_serp';

ALTER TABLE keyword_videos       DROP CONSTRAINT IF EXISTS keyword_videos_position_type_check;
ALTER TABLE keyword_shorts       DROP CONSTRAINT IF EXISTS keyword_shorts_position_type_check;
ALTER TABLE keyword_rank_history DROP CONSTRAINT IF EXISTS keyword_rank_history_position_type_check;

ALTER TABLE keyword_videos
  ADD CONSTRAINT keyword_videos_position_type_check CHECK (position_type IN ('true_serp', 'shorts_filtered', 'pool_fallback'));
ALTER TABLE keyword_shorts
  ADD CONSTRAINT keyword_shorts_position_type_check CHECK (position_type IN ('true_serp', 'shorts_filtered', 'pool_fallback'));
ALTER TABLE keyword_rank_history
  ADD CONSTRAINT keyword_rank_history_position_type_check CHECK (position_type IN ('true_serp', 'shorts_filtered', 'pool_fallback'));
