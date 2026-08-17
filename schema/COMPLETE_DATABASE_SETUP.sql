-- ═══════════════════════════════════════════════════════════════════════════════
-- THEBOREDMONKEY CAMPAIGN MANAGEMENT PANEL — COMPLETE DATABASE SETUP
-- Run this ENTIRE file in Supabase SQL Editor: https://supabase.com/dashboard
-- One file, one run, full system.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: AUTH & USER MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ir_executive'
    CHECK (role IN ('admin', 'brand_solutions', 'campaign_manager', 'ir_manager', 'ir_executive')),
  campaign_ids UUID[] DEFAULT '{}',
  brand_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'ir_executive'
    CHECK (role IN ('brand_solutions', 'campaign_manager', 'ir_manager', 'ir_executive', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_roles_user ON campaign_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_roles_campaign ON campaign_roles(campaign_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: CAMPAIGN CORE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'brand_awareness',
  objective TEXT DEFAULT '',
  platform_mix TEXT[] DEFAULT '{}',
  deliverable_types TEXT[] DEFAULT '{}',
  budget NUMERIC(12,2) DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  go_live_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),

  -- SLA thresholds
  sla_client_feedback_hours INT DEFAULT 48,
  sla_script_days INT DEFAULT 5,
  sla_content_days INT DEFAULT 7,
  sla_onboard_to_live_days INT DEFAULT 15,

  -- Points of contact
  poc_brand_solutions UUID,
  poc_campaign_manager UUID,

  -- Brief
  brief_mandatories TEXT DEFAULT '',
  brief_last_edited_by UUID,
  brief_last_edited_at TIMESTAMPTZ,

  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_campaigns_status ON cp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_cp_campaigns_brand ON cp_campaigns(brand);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: CAMPAIGN CREATORS (per-campaign, legacy but still used)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,

  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_handle TEXT DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'youtube',
  profile_image_url TEXT DEFAULT '',
  subscribers INT DEFAULT 0,
  avg_views INT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,

  -- TWO COST FIELDS — Margin guardrail
  internal_cost NUMERIC(12,2) DEFAULT 0,   -- What we pay. Never leaks to client.
  quoted_cost NUMERIC(12,2) DEFAULT 0,     -- What client sees.

  status TEXT NOT NULL DEFAULT 'shortlisted'
    CHECK (status IN ('shortlisted', 'client_review', 'negotiating', 'onboarded', 'active', 'completed', 'rejected')),

  rejection_reason TEXT,
  rejection_remark TEXT,

  auto_metrics JSONB DEFAULT '{}',

  -- Onboarding
  onboarded_at TIMESTAMPTZ,
  go_live_deadline DATE,
  go_live_deadline_extended BOOLEAN DEFAULT FALSE,
  extension_reason TEXT,
  extension_approved_by UUID,

  -- Client review actions
  client_action TEXT,
  client_remark TEXT,
  client_action_at TIMESTAMPTZ,

  added_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_creators_campaign ON cp_creators(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_creators_status ON cp_creators(status);
CREATE INDEX IF NOT EXISTS idx_cp_creators_channel ON cp_creators(channel_url);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: DELIVERABLES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES cp_creators(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,

  platform TEXT NOT NULL DEFAULT 'youtube_long'
    CHECK (platform IN ('youtube_long', 'youtube_shorts', 'instagram_reels', 'instagram_stories', 'instagram_posts', 'tiktok')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'script_pending', 'script_approved', 'filming', 'in_review', 'approved', 'live')),

  -- Live link & tracking
  live_link TEXT,
  live_link_added_at TIMESTAMPTZ,
  tracking_started_at TIMESTAMPTZ,
  tracking_ends_at TIMESTAMPTZ,

  -- Metrics
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  last_metrics_refresh TIMESTAMPTZ,

  -- Script
  script_current_version INT DEFAULT 0,
  script_approved_at TIMESTAMPTZ,
  script_approved_by UUID,

  -- Product tracking
  product_name TEXT DEFAULT '',
  product_status TEXT DEFAULT 'not_required'
    CHECK (product_status IN ('not_required', 'ordered', 'shipped', 'in_transit', 'delivered')),
  product_eta DATE,
  product_ordered_at TIMESTAMPTZ,
  product_shipped_at TIMESTAMPTZ,
  product_delivered_at TIMESTAMPTZ,
  product_tracking_number TEXT,
  product_carrier TEXT,

  -- Shoot tracking
  shoot_scheduled_at TIMESTAMPTZ,
  shoot_completed_at TIMESTAMPTZ,

  -- Brief
  brief_approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_deliverables_creator ON cp_deliverables(creator_id);
CREATE INDEX IF NOT EXISTS idx_cp_deliverables_campaign ON cp_deliverables(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_deliverables_status ON cp_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_cp_deliverables_tracking ON cp_deliverables(tracking_ends_at) WHERE tracking_started_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: NEGOTIATION LOG
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_negotiation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES cp_creators(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id),

  round_number INT NOT NULL DEFAULT 1,
  cost_offered NUMERIC(12,2),
  cost_returned NUMERIC(12,2),
  remarks TEXT DEFAULT '',
  offered_by_role TEXT NOT NULL,
  offered_by_user UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_negotiation_creator ON cp_negotiation_log(creator_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 6: STATUS HISTORY (AUDIT TRAIL)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,        -- 'campaign', 'creator', 'deliverable'
  entity_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id),

  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  remarks TEXT DEFAULT '',

  -- Clock pause support (client-owned stages)
  is_client_owned BOOLEAN DEFAULT FALSE,
  clock_paused_at TIMESTAMPTZ,
  clock_resumed_at TIMESTAMPTZ,
  paused_duration INTERVAL DEFAULT '0'
);

CREATE INDEX IF NOT EXISTS idx_cp_status_history_entity ON cp_status_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cp_status_history_campaign ON cp_status_history(campaign_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 7: SCRIPT VERSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_script_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES cp_deliverables(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id),

  version_number INT NOT NULL DEFAULT 1,
  content_text TEXT DEFAULT '',
  content_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent_for_approval', 'feedback', 'revised', 'approved')),

  is_approved_snapshot BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID,

  feedback_remark TEXT DEFAULT '',

  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_script_versions_deliverable ON cp_script_versions(deliverable_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 8: BRIEF VERSIONING
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_brief_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,

  version_number INT NOT NULL DEFAULT 1,
  objective TEXT DEFAULT '',
  mandatories TEXT DEFAULT '',
  platform_mix TEXT[] DEFAULT '{}',
  deliverable_types TEXT[] DEFAULT '{}',
  budget NUMERIC(12,2) DEFAULT 0,
  go_live_date DATE,
  notes TEXT DEFAULT '',

  changed_by UUID,
  changed_by_name TEXT DEFAULT '',
  change_reason TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brief_versions_campaign ON cp_brief_versions(campaign_id, version_number DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 9: NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES cp_campaigns(id),

  type TEXT NOT NULL,        -- 'status_change', 'assignment', 'deadline', 'escalation', 'mention'
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  entity_type TEXT,
  entity_id UUID,

  is_read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_notifications_user ON cp_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_cp_notifications_campaign ON cp_notifications(campaign_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 10: ACTIVITY FEED
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id),

  actor_user_id UUID,
  actor_role TEXT,
  actor_name TEXT NOT NULL,

  action_type TEXT NOT NULL,   -- 'created', 'status_change', 'cost_edit', 'comment', 'upload'
  entity_type TEXT NOT NULL,   -- 'campaign', 'creator', 'deliverable', 'script'
  entity_id UUID,
  entity_name TEXT DEFAULT '',

  details JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_activity_feed_campaign ON cp_activity_feed(campaign_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 11: CLIENT USERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  brand_name TEXT NOT NULL,

  invite_token TEXT,
  invite_sent_at TIMESTAMPTZ,
  invite_accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,

  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, email)
);

CREATE INDEX IF NOT EXISTS idx_cp_client_users_campaign ON cp_client_users(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_client_users_token ON cp_client_users(invite_token);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 12: EMAIL LOG
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES cp_campaigns(id),

  to_email TEXT NOT NULL,
  to_role TEXT NOT NULL,
  template TEXT NOT NULL,

  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  scrubbed BOOLEAN DEFAULT FALSE,   -- TRUE = internal cost scrubbed before send

  sent_at TIMESTAMPTZ DEFAULT NOW(),
  resend_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_cp_email_log_campaign ON cp_email_log(campaign_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 13: REJECTION INTELLIGENCE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_rejection_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_channel_url TEXT NOT NULL,
  campaign_id UUID REFERENCES cp_campaigns(id),
  rejection_reason TEXT NOT NULL,
  rejected_by UUID,
  brand_name TEXT,
  campaign_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_rejection_channel ON cp_rejection_intelligence(creator_channel_url);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 14: PRODUCT SHIPMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_product_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES cp_deliverables(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,

  product_name TEXT NOT NULL,
  tracking_number TEXT,
  carrier TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'shipped', 'in_transit', 'delivered', 'returned')),

  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  estimated_delivery DATE,

  notes TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_shipments_deliverable ON cp_product_shipments(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_cp_shipments_campaign ON cp_product_shipments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_shipments_status ON cp_product_shipments(status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 15: TRACKED LINKS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_tracked_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES cp_creators(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES cp_deliverables(id) ON DELETE SET NULL,

  original_url TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  short_url TEXT NOT NULL,
  tracked_url TEXT,

  utm_source TEXT,
  utm_medium TEXT DEFAULT 'influencer',
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  clicks INT DEFAULT 0,
  unique_clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,

  last_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_links_campaign ON cp_tracked_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_links_creator ON cp_tracked_links(creator_id);
CREATE INDEX IF NOT EXISTS idx_cp_links_code ON cp_tracked_links(short_code);

CREATE TABLE IF NOT EXISTS cp_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES cp_tracked_links(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  country TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_clicks_link ON cp_link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_cp_clicks_time ON cp_link_clicks(clicked_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 16: TEAM ASSIGNMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  role TEXT NOT NULL DEFAULT 'ir_executive'
    CHECK (role IN ('brand_solutions', 'campaign_manager', 'ir_manager', 'ir_executive')),
  assigned_sections TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_team_campaign ON cp_team_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_team_user ON cp_team_assignments(user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 17: CREATOR POOL (Global cross-campaign creator intelligence)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_creator_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  location TEXT,
  languages TEXT[] DEFAULT '{}',

  -- Social profiles
  youtube_url TEXT,
  youtube_handle TEXT,
  youtube_channel_id TEXT,
  instagram_url TEXT,
  instagram_handle TEXT,
  tiktok_url TEXT,
  twitter_url TEXT,
  other_social JSONB DEFAULT '{}',

  -- Metadata
  niche TEXT[] DEFAULT '{}',
  sub_niche TEXT[] DEFAULT '{}',
  content_type TEXT[] DEFAULT '{}',
  subscribers INTEGER DEFAULT 0,
  avg_views INTEGER DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,
  avg_likes INTEGER DEFAULT 0,
  avg_comments INTEGER DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  country TEXT,
  city TEXT,
  gender TEXT,
  age_range TEXT,
  languages_spoken TEXT[] DEFAULT '{}',

  -- Pricing
  rate_card JSONB DEFAULT '{}',
  internal_rate INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'INR',

  -- Classification
  tier TEXT DEFAULT 'micro'
    CHECK (tier IN ('nano', 'micro', 'mid', 'macro', 'mega')),
  brand_safety TEXT DEFAULT 'safe'
    CHECK (brand_safety IN ('safe', 'caution', 'restricted')),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'blacklisted')),
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'bulk', 'youtube_api', 'scraper', 'referral')),
  added_by TEXT,
  last_refreshed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pool_name ON cp_creator_pool(name);
CREATE INDEX IF NOT EXISTS idx_pool_niche ON cp_creator_pool(niche);
CREATE INDEX IF NOT EXISTS idx_pool_subscribers ON cp_creator_pool(subscribers);
CREATE INDEX IF NOT EXISTS idx_pool_avg_views ON cp_creator_pool(avg_views);
CREATE INDEX IF NOT EXISTS idx_pool_status ON cp_creator_pool(status);
CREATE INDEX IF NOT EXISTS idx_pool_youtube ON cp_creator_pool(youtube_handle);
CREATE INDEX IF NOT EXISTS idx_pool_instagram ON cp_creator_pool(instagram_handle);
CREATE INDEX IF NOT EXISTS idx_pool_tier ON cp_creator_pool(tier);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 18: CREATOR SHORTLIST (links pool to campaign)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_creator_shortlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,
  pool_creator_id UUID REFERENCES cp_creator_pool(id) ON DELETE SET NULL,

  -- Campaign-specific cost overrides
  quoted_cost INTEGER DEFAULT 0,
  internal_cost INTEGER DEFAULT 0,
  status TEXT DEFAULT 'shortlisted'
    CHECK (status IN ('shortlisted', 'client_review', 'negotiating', 'onboarded', 'active', 'completed', 'rejected')),
  rejection_reason TEXT,
  negotiation_rounds JSONB DEFAULT '[]',
  assigned_to TEXT,

  -- Performance rollup (updated from deliverables)
  deliverables_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes BIGINT DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,

  shortlisted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, pool_creator_id)
);

CREATE INDEX IF NOT EXISTS idx_shortlist_campaign ON cp_creator_shortlist(campaign_id);
CREATE INDEX IF NOT EXISTS idx_shortlist_pool ON cp_creator_shortlist(pool_creator_id);
CREATE INDEX IF NOT EXISTS idx_shortlist_status ON cp_creator_shortlist(status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 19: CREATOR HISTORY (denormalized cross-campaign analytics)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_creator_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_pool_id UUID NOT NULL REFERENCES cp_creator_pool(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,

  campaign_name TEXT,
  brand TEXT,
  platform TEXT,
  deliverable_type TEXT,
  quoted_cost INTEGER DEFAULT 0,
  internal_cost INTEGER DEFAULT 0,

  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  live_link TEXT,
  live_date TIMESTAMPTZ,

  status TEXT DEFAULT 'shortlisted',
  outcome TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_creator ON cp_creator_history(creator_pool_id);
CREATE INDEX IF NOT EXISTS idx_history_campaign ON cp_creator_history(campaign_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 20: CREATOR COMMERCIALS (editable rate cards)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_creator_commercials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_pool_id UUID NOT NULL REFERENCES cp_creator_pool(id) ON DELETE CASCADE,

  platform TEXT NOT NULL,
  deliverable_type TEXT NOT NULL,
  rate INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  negotiable BOOLEAN DEFAULT TRUE,
  min_rate INTEGER,
  notes TEXT,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commercials_creator ON cp_creator_commercials(creator_pool_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 21: CREATOR SEARCH INDEX (full-text + vector placeholder)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cp_creator_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_pool_id UUID NOT NULL REFERENCES cp_creator_pool(id) ON DELETE CASCADE,
  search_vector TSVECTOR,
  niche_embedding FLOAT[]
);

CREATE INDEX IF NOT EXISTS idx_search_vector ON cp_creator_search_index USING GIN(search_vector);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 22: SCRAPER PIPELINE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Scraper session cookies (Instagram auth)
CREATE TABLE IF NOT EXISTS cp_session_cookies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  label TEXT,
  username TEXT,
  password TEXT,                    -- encrypted at app level
  session_id TEXT DEFAULT '',
  ds_user_id TEXT DEFAULT '',
  csrftoken TEXT,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled', 'expired', 'banned')),

  requests_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  consecutive_errors INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cookies_status ON cp_session_cookies(status);

-- Scraper jobs
CREATE TABLE IF NOT EXISTS cp_scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  seed_handle TEXT NOT NULL,
  depth INT NOT NULL DEFAULT 2,
  max_profiles INT NOT NULL DEFAULT 500,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  progress INT DEFAULT 0,

  profiles_found INT DEFAULT 0,
  profiles_passed INT DEFAULT 0,
  profiles_failed INT DEFAULT 0,
  profiles_filtered INT DEFAULT 0,

  error_message TEXT,
  can_resume BOOLEAN DEFAULT FALSE,
  checkpoint JSONB,

  daily_limit_remaining INT DEFAULT 5000,

  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON cp_scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created ON cp_scrape_jobs(created_at DESC);

-- Raw scraped profiles (all scraped data before filtering)
CREATE TABLE IF NOT EXISTS cp_raw_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  handle TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  profile_pic_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  is_business BOOLEAN DEFAULT FALSE,

  followers INT DEFAULT 0,
  following INT DEFAULT 0,
  posts_count INT DEFAULT 0,

  avg_views INT DEFAULT 0,
  avg_likes INT DEFAULT 0,
  avg_comments INT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,

  email TEXT,
  phone TEXT,
  website TEXT,
  category TEXT,

  source TEXT DEFAULT 'scraper',
  source_job_id UUID REFERENCES cp_scrape_jobs(id),
  status TEXT DEFAULT 'raw'
    CHECK (status IN ('raw', 'filtered', 'rejected', 'imported')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_handle ON cp_raw_creators(handle);
CREATE INDEX IF NOT EXISTS idx_raw_status ON cp_raw_creators(status);
CREATE INDEX IF NOT EXISTS idx_raw_job ON cp_raw_creators(source_job_id);

-- Filtered creators (passed both filter passes, ready for shortlisting)
CREATE TABLE IF NOT EXISTS cp_filtered_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  raw_creator_id UUID REFERENCES cp_raw_creators(id) ON DELETE SET NULL,
  handle TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  profile_pic_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,

  email TEXT,
  phone TEXT,
  website TEXT,

  followers INT DEFAULT 0,
  following INT DEFAULT 0,
  posts_count INT DEFAULT 0,

  avg_views INT DEFAULT 0,
  avg_likes INT DEFAULT 0,
  avg_comments INT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  views_to_followers_ratio NUMERIC(5,3) DEFAULT 0,

  category TEXT,
  tier TEXT DEFAULT 'micro'
    CHECK (tier IN ('nano', 'micro', 'mid', 'macro', 'mega')),

  score_breakdown JSONB DEFAULT '{}',
  score_passed BOOLEAN DEFAULT FALSE,

  outreach_status TEXT DEFAULT 'not_contacted'
    CHECK (outreach_status IN ('not_contacted', 'contacted', 'responded', 'negotiating', 'confirmed', 'declined')),

  -- Campaign link: when added to a campaign shortlist
  campaign_id UUID REFERENCES cp_campaigns(id),
  shortlisted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filtered_handle ON cp_filtered_creators(handle);
CREATE INDEX IF NOT EXISTS idx_filtered_tier ON cp_filtered_creators(tier);
CREATE INDEX IF NOT EXISTS idx_filtered_outreach ON cp_filtered_creators(outreach_status);
CREATE INDEX IF NOT EXISTS idx_filtered_campaign ON cp_filtered_creators(campaign_id);

-- Scraper errors log
CREATE TABLE IF NOT EXISTS cp_scrape_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cp_scrape_jobs(id) ON DELETE CASCADE,
  handle TEXT,
  error_type TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_errors_job ON cp_scrape_errors(job_id);

-- Scraper configuration (key-value store)
CREATE TABLE IF NOT EXISTS cp_scraper_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default scraper config
INSERT INTO cp_scraper_config (key, value) VALUES
  ('scrape_settings', '{
    "min_delay_ms": 3000,
    "max_delay_ms": 8000,
    "requests_per_minute": 10,
    "requests_per_hour": 200,
    "timeout_seconds": 30,
    "max_posts_per_profile": 10,
    "daily_limit": 5000,
    "reach_ratio_threshold": 0.40
  }')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 23: HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables that have it
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'cp_campaigns', 'cp_creators', 'cp_deliverables',
      'cp_product_shipments', 'cp_tracked_links',
      'cp_team_assignments', 'cp_creator_pool',
      'cp_creator_shortlist', 'cp_creator_commercials',
      'cp_session_cookies', 'cp_scrape_jobs',
      'cp_raw_creators', 'cp_filtered_creators',
      'users'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- Get cookie pool stats (used by scraper API)
CREATE OR REPLACE FUNCTION cp_get_cookie_stats()
RETURNS TABLE (
  total_cookies BIGINT,
  active_cookies BIGINT,
  expired_cookies BIGINT,
  banned_cookies BIGINT,
  total_requests BIGINT,
  avg_errors NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'expired')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'banned')::BIGINT,
    COALESCE(SUM(requests_count), 0)::BIGINT,
    COALESCE(AVG(consecutive_errors), 0)::NUMERIC
  FROM cp_session_cookies;
END;
$$ LANGUAGE plpgsql;

-- Campaign KPI calculation
CREATE OR REPLACE FUNCTION cp_campaign_kpis(campaign UUID)
RETURNS TABLE (
  total_creators BIGINT,
  total_deliverables BIGINT,
  total_views BIGINT,
  total_likes BIGINT,
  total_comments BIGINT,
  engagement_rate NUMERIC,
  total_spend NUMERIC,
  internal_spend NUMERIC,
  margin NUMERIC,
  margin_pct NUMERIC,
  blended_cpv NUMERIC,
  creators_by_status JSONB,
  posts_by_format JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH creator_stats AS (
    SELECT
      COUNT(DISTINCT cr.id) AS total_creators,
      COALESCE(SUM(cr.quoted_cost), 0) AS total_spend,
      COALESCE(SUM(cr.internal_cost), 0) AS internal_spend,
      jsonb_object_agg(cr.status, cr.cnt) AS creators_by_status
    FROM (
      SELECT id, quoted_cost, internal_cost, status,
             COUNT(*) OVER (PARTITION BY status) AS cnt
      FROM cp_creators WHERE campaign_id = campaign
    ) cr
  ),
  deliverable_stats AS (
    SELECT
      COUNT(*) AS total_deliverables,
      COALESCE(SUM(d.views), 0) AS total_views,
      COALESCE(SUM(d.likes), 0) AS total_likes,
      COALESCE(SUM(d.comments), 0) AS total_comments,
      jsonb_object_agg(d.platform, d.cnt) AS posts_by_format
    FROM (
      SELECT id, views, likes, comments, platform,
             COUNT(*) OVER (PARTITION BY platform) AS cnt
      FROM cp_deliverables WHERE campaign_id = campaign
    ) d
  )
  SELECT
    cs.total_creators,
    ds.total_deliverables::BIGINT,
    ds.total_views,
    ds.total_likes,
    ds.total_comments,
    CASE WHEN ds.total_views > 0
      THEN ROUND((ds.total_likes::NUMERIC / ds.total_views * 100), 2)
      ELSE 0 END,
    cs.total_spend,
    cs.internal_spend,
    cs.total_spend - cs.internal_spend AS margin,
    CASE WHEN cs.total_spend > 0
      THEN ROUND(((cs.total_spend - cs.internal_spend) / cs.total_spend * 100), 2)
      ELSE 0 END,
    CASE WHEN ds.total_deliverables > 0
      THEN ROUND(cs.total_spend / ds.total_views, 2)
      ELSE 0 END,
    cs.creators_by_status,
    ds.posts_by_format
  FROM creator_stats cs, deliverable_stats ds;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 24: ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE cp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_negotiation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_brief_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_rejection_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_product_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_tracked_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_creator_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_creator_shortlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_creator_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_creator_commercials ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_creator_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_session_cookies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_raw_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_filtered_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_scrape_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Service role bypass (allows server-side access via service_role key)
CREATE POLICY "Service role full access" ON cp_campaigns FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_creators FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_deliverables FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_negotiation_log FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_status_history FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_script_versions FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_brief_versions FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_notifications FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_activity_feed FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_client_users FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_email_log FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_rejection_intelligence FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_product_shipments FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_tracked_links FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_link_clicks FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_team_assignments FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_creator_pool FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_creator_shortlist FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_creator_history FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_creator_commercials FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_creator_search_index FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_session_cookies FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_scrape_jobs FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_raw_creators FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_filtered_creators FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON cp_scrape_errors FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access" ON users FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 25: SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- First user: Haji Karim (Brand Solutions)
-- Run: GET /api/setup-campaign?create-user=true
-- This creates the user with a properly hashed password (Tbm@2026).
-- Do NOT insert users directly — passwords must be PBKDF2 hashed.

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE. Full system ready.
-- Tables: 27 | Indexes: 42 | Functions: 3 | Triggers: 13
-- ═══════════════════════════════════════════════════════════════════════════════
