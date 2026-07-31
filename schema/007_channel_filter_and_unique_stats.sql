-- ============================================================
-- Migration 007 — repair + channel filtering + honest stats
-- PASTE THIS INTO THE SUPABASE SQL EDITOR AND RUN IT (safe to re-run)
--
-- An audit of the live database found that migrations 003 and 006 were never
-- applied, so this migration is self-contained and repairs those gaps too:
--
--   * video_blacklist and videos.is_irrelevant* are MISSING → brand analysis
--     errors out on every run
--   * brand_sov_mv / brand_freq_sov_mv / channel_rank_mv are MISSING → the
--     dashboard's brand SOV and "most ranking channel" panels read nothing, and
--     refreshMaterializedViews() throws after every cron
--   * channel_rank_mv had no UNIQUE index, so REFRESH ... CONCURRENTLY could
--     never have succeeded even once the view existed
--   * get_video_stats reported total == unique and mis-summed unique views
-- ============================================================

-- ------------------------------------------------------------
-- 1. Irrelevant-video system (from migration 006, never applied)
-- ------------------------------------------------------------
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_irrelevant BOOLEAN DEFAULT FALSE;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS irrelevant_reason TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS irrelevant_score REAL DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS irrelevant_category TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS irrelevant_detected_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS video_blacklist (
  youtube_id  TEXT PRIMARY KEY,
  reason      TEXT NOT NULL DEFAULT 'irrelevant',
  category    TEXT,
  detected_by TEXT DEFAULT 'ai',
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vid_irrelevant ON videos (is_irrelevant) WHERE is_irrelevant = TRUE;
CREATE INDEX IF NOT EXISTS idx_vb_category    ON video_blacklist (category);
CREATE INDEX IF NOT EXISTS idx_ba_video_id    ON brand_analysis (video_id);

-- ------------------------------------------------------------
-- 2. channel_profiles — cache of YouTube channel metadata.
--    The scraper needs each channel's declared country to keep the dataset
--    Indian. channels.list costs quota, so results are cached and refreshed at
--    most every 30 days.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_profiles (
  channel_id       TEXT PRIMARY KEY,
  channel_name     TEXT,
  country          TEXT,            -- ISO code; NULL = channel declares nothing
  is_brand_channel BOOLEAN DEFAULT FALSE,
  checked_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_profiles_checked_at ON channel_profiles (checked_at);
CREATE INDEX IF NOT EXISTS idx_channel_profiles_country    ON channel_profiles (country);

-- ------------------------------------------------------------
-- 3. serp_position — the video's real position in YouTube's results.
--    `rank` is the 1..10 slot within its format; serp_position records where the
--    video actually sat, so a slot-3 video found at result 17 is stored honestly.
-- ------------------------------------------------------------
ALTER TABLE keyword_videos       ADD COLUMN IF NOT EXISTS serp_position INTEGER;
ALTER TABLE keyword_shorts       ADD COLUMN IF NOT EXISTS serp_position INTEGER;
ALTER TABLE keyword_rank_history ADD COLUMN IF NOT EXISTS serp_position INTEGER;

-- ------------------------------------------------------------
-- 4. Missing hot-path indexes found by the audit
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_kw_campaign_status ON keywords (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_vs_campaign_date   ON view_snapshots (campaign_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id  ON videos (channel_id);
CREATE INDEX IF NOT EXISTS idx_ks_keyword         ON keyword_shorts (keyword_id);
CREATE INDEX IF NOT EXISTS idx_krh_keyword_week   ON keyword_rank_history (keyword_id, week_start);

-- ------------------------------------------------------------
-- 5. get_video_stats — fixed total vs unique.
--
--    The previous version was wrong twice over: it UNION-ed (deduplicated) the
--    ranking rows and then called the result "total", so total_videos always
--    equalled unique_videos; and it used SUM(DISTINCT view_count), which
--    collapses two different videos that happen to share a view count.
--
--    Correct semantics:
--      total_*  = one entry per keyword appearance (a video ranking on 40
--                 keywords counts 40 times)
--      unique_* = one entry per distinct video
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_video_stats(p_campaign_id UUID)
RETURNS TABLE(
  total_videos BIGINT,
  total_views BIGINT,
  unique_videos BIGINT,
  unique_views BIGINT,
  unique_channels BIGINT,
  transcript_coverage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH appearances AS (
    SELECT kv.video_id FROM keyword_videos kv WHERE kv.campaign_id = p_campaign_id
    UNION ALL
    SELECT ks.video_id FROM keyword_shorts ks WHERE ks.campaign_id = p_campaign_id
  ),
  appearance_stats AS (
    SELECT
      COUNT(*)::BIGINT AS total_videos,
      COALESCE(SUM(v.view_count), 0)::BIGINT AS total_views
    FROM appearances a
    JOIN videos v ON v.id = a.video_id
    WHERE v.is_deleted = FALSE
  ),
  distinct_videos AS (
    SELECT DISTINCT a.video_id FROM appearances a
  ),
  unique_stats AS (
    SELECT
      COUNT(*)::BIGINT AS unique_videos,
      COALESCE(SUM(v.view_count), 0)::BIGINT AS unique_views,
      COUNT(DISTINCT COALESCE(v.channel_id, v.channel_name))::BIGINT AS unique_channels
    FROM distinct_videos d
    JOIN videos v ON v.id = d.video_id
    WHERE v.is_deleted = FALSE
  ),
  transcript_stats AS (
    SELECT COUNT(DISTINCT vt.video_id)::BIGINT AS with_transcripts
    FROM video_transcripts vt
    JOIN distinct_videos d ON d.video_id = vt.video_id
    WHERE vt.fetch_status = 'success'
  )
  SELECT
    aps.total_videos, aps.total_views,
    us.unique_videos, us.unique_views, us.unique_channels,
    CASE WHEN us.unique_videos > 0
      THEN ROUND(100.0 * ts.with_transcripts / us.unique_videos, 1)
      ELSE 0 END
  FROM appearance_stats aps, unique_stats us, transcript_stats ts;
END;
$$;

-- ------------------------------------------------------------
-- 6. Keyword format coverage — makes 10+10 shortfalls visible
--    instead of silent.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_keyword_format_coverage(p_campaign_id UUID)
RETURNS TABLE(
  keyword_id UUID,
  keyword_text TEXT,
  long_form_count BIGINT,
  short_form_count BIGINT,
  last_scraped_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT
    k.id, k.text,
    COALESCE((SELECT COUNT(*) FROM keyword_videos kv WHERE kv.keyword_id = k.id), 0),
    COALESCE((SELECT COUNT(*) FROM keyword_shorts ks WHERE ks.keyword_id = k.id), 0),
    k.last_scraped_at
  FROM keywords k
  WHERE k.campaign_id = p_campaign_id AND k.status = 'active'
  ORDER BY
    COALESCE((SELECT COUNT(*) FROM keyword_videos kv WHERE kv.keyword_id = k.id), 0)
    + COALESCE((SELECT COUNT(*) FROM keyword_shorts ks WHERE ks.keyword_id = k.id), 0) ASC;
$$;

-- ------------------------------------------------------------
-- 7. Materialized views (from migration 003, never applied).
--    /api/dashboard and /api/dashboard/kpis read these three; without them the
--    brand SOV and channel panels are empty.
-- ------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS brand_sov_mv AS
WITH latest_snapshots AS (
  SELECT DISTINCT ON (video_id) video_id, view_count, snapshot_date
  FROM view_snapshots
  ORDER BY video_id, snapshot_date DESC
),
video_brand_views AS (
  SELECT bt.campaign_id, bt.brand_name, ls.view_count
  FROM brand_tags bt
  JOIN videos v ON v.id = bt.video_id
  JOIN latest_snapshots ls ON ls.video_id = bt.video_id
  WHERE v.is_deleted = FALSE
)
SELECT
  campaign_id,
  brand_name,
  SUM(view_count) AS brand_total_views,
  SUM(SUM(view_count)) OVER (PARTITION BY campaign_id) AS campaign_total_views,
  ROUND(100.0 * SUM(view_count) /
    NULLIF(SUM(SUM(view_count)) OVER (PARTITION BY campaign_id), 0), 2) AS sov_percent,
  COUNT(*) AS video_count,
  NOW() AS computed_at
FROM video_brand_views
GROUP BY campaign_id, brand_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_sov_mv ON brand_sov_mv (campaign_id, brand_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS brand_freq_sov_mv AS
WITH video_brand_freq AS (
  SELECT kv.campaign_id, bt.brand_name, COALESCE(kv.search_appearance_count, 1) AS search_appearance_count
  FROM keyword_videos kv
  JOIN videos v ON v.id = kv.video_id
  JOIN brand_tags bt ON bt.video_id = kv.video_id AND bt.campaign_id = kv.campaign_id
  WHERE v.is_deleted = FALSE
)
SELECT
  campaign_id,
  brand_name,
  SUM(search_appearance_count) AS brand_total_freq,
  SUM(SUM(search_appearance_count)) OVER (PARTITION BY campaign_id) AS campaign_total_freq,
  ROUND(100.0 * SUM(search_appearance_count) /
    NULLIF(SUM(SUM(search_appearance_count)) OVER (PARTITION BY campaign_id), 0), 2) AS freq_sov_percent,
  COUNT(*) AS video_count,
  NOW() AS computed_at
FROM video_brand_freq
GROUP BY campaign_id, brand_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_freq_sov_mv ON brand_freq_sov_mv (campaign_id, brand_name);

-- channel_name / channel_id are COALESCEd so the unique index below can exist:
-- REFRESH ... CONCURRENTLY requires one, and the original definition had none.
CREATE MATERIALIZED VIEW IF NOT EXISTS channel_rank_mv AS
SELECT
  v.campaign_id,
  COALESCE(vid.channel_name, '') AS channel_name,
  COALESCE(vid.channel_id, '')   AS channel_id,
  COUNT(DISTINCT vid.id) AS video_count,
  SUM(COALESCE(v.search_appearance_count, 1)) AS total_frequency,
  MAX(ls.view_count) AS max_video_views,
  SUM(ls.view_count) AS total_views,
  NOW() AS computed_at
FROM (
  SELECT campaign_id, video_id, search_appearance_count FROM keyword_videos
  UNION ALL
  SELECT campaign_id, video_id, search_appearance_count FROM keyword_shorts
) v
JOIN videos vid ON vid.id = v.video_id
LEFT JOIN LATERAL (
  SELECT view_count FROM view_snapshots
  WHERE video_id = v.video_id ORDER BY snapshot_date DESC LIMIT 1
) ls ON TRUE
WHERE vid.is_deleted = FALSE
GROUP BY v.campaign_id, COALESCE(vid.channel_name, ''), COALESCE(vid.channel_id, '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_rank_mv_uniq
  ON channel_rank_mv (campaign_id, channel_name, channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_rank_mv
  ON channel_rank_mv (campaign_id, total_frequency DESC);

-- ------------------------------------------------------------
-- 8. Data repair: channel names polluted by an older scraping path
--    (values like 'Venki Technology • 100k views • 1 hour ago\n\n\n…').
--    Keeps everything before the first newline or bullet separator.
-- ------------------------------------------------------------
UPDATE videos
SET channel_name = NULLIF(BTRIM(SPLIT_PART(SPLIT_PART(channel_name, E'\n', 1), '•', 1)), '')
WHERE channel_name LIKE E'%\n%' OR channel_name LIKE '%•%';

-- ------------------------------------------------------------
-- 9. Populate the views once so the dashboard has data immediately.
-- ------------------------------------------------------------
REFRESH MATERIALIZED VIEW brand_sov_mv;
REFRESH MATERIALIZED VIEW brand_freq_sov_mv;
REFRESH MATERIALIZED VIEW channel_rank_mv;
