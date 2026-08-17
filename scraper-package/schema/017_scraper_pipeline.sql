-- ═══════════════════════════════════════════════════════════════════
-- Scraper Pipeline — Database Schema
-- Tables: cp_scrape_jobs, cp_raw_creators, cp_filtered_creators,
--         cp_scrape_errors, cp_session_cookies
-- ═══════════════════════════════════════════════════════════════════

-- ── Scrape Jobs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_handle TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 2,
  max_profiles INTEGER NOT NULL DEFAULT 5000,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','paused','completed','failed','cancelled')),
  progress INTEGER NOT NULL DEFAULT 0,
  profiles_found INTEGER NOT NULL DEFAULT 0,
  profiles_passed INTEGER NOT NULL DEFAULT 0,
  profiles_failed INTEGER NOT NULL DEFAULT 0,
  profiles_filtered INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  checkpoint JSONB,
  can_resume BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_checkpoint_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON cp_scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created ON cp_scrape_jobs(created_at DESC);

-- ── Raw Creators (all scraped profiles) ────────────────────────────
CREATE TABLE IF NOT EXISTS cp_raw_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL UNIQUE,
  full_name TEXT,
  bio TEXT,
  profile_pic_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_business BOOLEAN NOT NULL DEFAULT false,
  followers INTEGER NOT NULL DEFAULT 0,
  following INTEGER NOT NULL DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 0,
  avg_views NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_likes NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_comments NUMERIC(12,2) NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  email TEXT,
  phone TEXT,
  website TEXT,
  category TEXT,
  source TEXT NOT NULL DEFAULT 'scraper',
  source_job_id UUID REFERENCES cp_scrape_jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'raw' CHECK (status IN ('raw','filtered','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raw_creators_handle ON cp_raw_creators(handle);
CREATE INDEX IF NOT EXISTS idx_raw_creators_followers ON cp_raw_creators(followers DESC);
CREATE INDEX IF NOT EXISTS idx_raw_creators_status ON cp_raw_creators(status);
CREATE INDEX IF NOT EXISTS idx_raw_creators_source_job ON cp_raw_creators(source_job_id);

-- ── Filtered Creators (passed both filters) ───────────────────────
CREATE TABLE IF NOT EXISTS cp_filtered_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_creator_id UUID REFERENCES cp_raw_creators(id) ON DELETE SET NULL,
  handle TEXT NOT NULL UNIQUE,
  full_name TEXT,
  bio TEXT,
  profile_pic_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  email TEXT,
  phone TEXT,
  website TEXT,
  followers INTEGER NOT NULL DEFAULT 0,
  following INTEGER NOT NULL DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 0,
  avg_views NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_likes NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_comments NUMERIC(12,2) NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  views_to_followers_ratio NUMERIC(8,4) NOT NULL DEFAULT 0,
  category TEXT,
  tier TEXT CHECK (tier IN ('nano','micro','mid','macro','mega')),
  score_breakdown JSONB,
  score_passed BOOLEAN NOT NULL DEFAULT false,
  outreach_status TEXT NOT NULL DEFAULT 'not_contacted' CHECK (outreach_status IN ('not_contacted','contacted','interested','negotiating','booked','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_filtered_creators_handle ON cp_filtered_creators(handle);
CREATE INDEX IF NOT EXISTS idx_filtered_creators_followers ON cp_filtered_creators(followers DESC);
CREATE INDEX IF NOT EXISTS idx_filtered_creators_tier ON cp_filtered_creators(tier);
CREATE INDEX IF NOT EXISTS idx_filtered_creators_outreach ON cp_filtered_creators(outreach_status);

-- ─ Scrape Errors ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_scrape_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES cp_scrape_jobs(id) ON DELETE CASCADE,
  handle TEXT,
  error_type TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scrape_errors_job ON cp_scrape_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_scrape_errors_created ON cp_scrape_errors(created_at DESC);

-- ── Session Cookies (Instagram auth) ───────────────────────────────
CREATE TABLE IF NOT EXISTS cp_session_cookies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT,
  password TEXT,
  session_id TEXT NOT NULL,
  ds_user_id TEXT NOT NULL,
  csrftoken TEXT,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','disabled')),
  requests_count INTEGER NOT NULL DEFAULT 0,
  consecutive_errors INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_cookies_status ON cp_session_cookies(status);
CREATE INDEX IF NOT EXISTS idx_session_cookies_last_used ON cp_session_cookies(last_used_at ASC NULLS FIRST);

-- ─ Updated_at trigger for all tables ──────────────────────────────
CREATE OR REPLACE FUNCTION cp_scraper_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_scrape_jobs_updated BEFORE UPDATE ON cp_scrape_jobs
  FOR EACH ROW EXECUTE FUNCTION cp_scraper_updated_at();

CREATE TRIGGER trg_raw_creators_updated BEFORE UPDATE ON cp_raw_creators
  FOR EACH ROW EXECUTE FUNCTION cp_scraper_updated_at();

CREATE TRIGGER trg_filtered_creators_updated BEFORE UPDATE ON cp_filtered_creators
  FOR EACH ROW EXECUTE FUNCTION cp_scraper_updated_at();

CREATE TRIGGER trg_session_cookies_updated BEFORE UPDATE ON cp_session_cookies
  FOR EACH ROW EXECUTE FUNCTION cp_scraper_updated_at();
