-- ═══════════════════════════════════════════════════════════════════
-- Creator Pool — Global Creator Database
-- Centralized, reusable, cross-campaign creator intelligence
-- ═══════════════════════════════════════════════════════════════════

-- Core creator pool table
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

  -- Metadata (auto-fetched or manual)
  niche TEXT[] DEFAULT '{}',
  sub_niche TEXT[] DEFAULT '{}',
  content_type TEXT[] DEFAULT '{}',  -- review, tutorial, vlog, shorts, etc.
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
  rate_card JSONB DEFAULT '{}',  -- { youtube_long: 50000, youtube_shorts: 25000, instagram_reels: 30000 }
  internal_rate INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'INR',

  -- Classification
  tier TEXT DEFAULT 'micro',  -- nano, micro, mid, macro, mega
  brand_safety TEXT DEFAULT 'safe',  -- safe, caution, restricted
  notes TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'active',  -- active, inactive, blacklisted
  source TEXT DEFAULT 'manual',  -- manual, bulk, youtube_api, referral
  added_by TEXT,
  last_refreshed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign-specific creator shortlist (links pool to campaign)
CREATE TABLE IF NOT EXISTS cp_creator_shortlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,
  pool_creator_id UUID REFERENCES cp_creator_pool(id) ON DELETE SET NULL,

  -- Campaign-specific overrides
  quoted_cost INTEGER DEFAULT 0,
  internal_cost INTEGER DEFAULT 0,
  status TEXT DEFAULT 'shortlisted',
  rejection_reason TEXT,
  negotiation_rounds JSONB DEFAULT '[]',
  assigned_to TEXT,

  -- Performance (updated from deliverables)
  deliverables_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes BIGINT DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,

  -- Timestamps
  shortlisted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, pool_creator_id)
);

-- Creator campaign history (denormalized for fast portal queries)
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

  -- Performance
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  live_link TEXT,
  live_date TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'shortlisted',
  outcome TEXT,  -- completed, dropped, rejected, renegotiated

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator commercials (editable rates and details)
CREATE TABLE IF NOT EXISTS cp_creator_commercials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_pool_id UUID NOT NULL REFERENCES cp_creator_pool(id) ON DELETE CASCADE,

  platform TEXT NOT NULL,
  deliverable_type TEXT NOT NULL,
  rate INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  negotiable BOOLEAN DEFAULT true,
  min_rate INTEGER,
  notes TEXT,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator search index (for AI matching)
CREATE TABLE IF NOT EXISTS cp_creator_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_pool_id UUID NOT NULL REFERENCES cp_creator_pool(id) ON DELETE CASCADE,

  search_vector TSVECTOR,
  niche_embedding FLOAT[]  -- For vector similarity search (placeholder for future pgvector)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pool_name ON cp_creator_pool(name);
CREATE INDEX IF NOT EXISTS idx_pool_niche ON cp_creator_pool(niche);
CREATE INDEX IF NOT EXISTS idx_pool_subscribers ON cp_creator_pool(subscribers);
CREATE INDEX IF NOT EXISTS idx_pool_avg_views ON cp_creator_pool(avg_views);
CREATE INDEX IF NOT EXISTS idx_pool_status ON cp_creator_pool(status);
CREATE INDEX IF NOT EXISTS idx_pool_youtube ON cp_creator_pool(youtube_handle);
CREATE INDEX IF NOT EXISTS idx_pool_instagram ON cp_creator_pool(instagram_handle);

CREATE INDEX IF NOT EXISTS idx_shortlist_campaign ON cp_creator_shortlist(campaign_id);
CREATE INDEX IF NOT EXISTS idx_shortlist_pool ON cp_creator_shortlist(pool_creator_id);
CREATE INDEX IF NOT EXISTS idx_shortlist_status ON cp_creator_shortlist(status);

CREATE INDEX IF NOT EXISTS idx_history_creator ON cp_creator_history(creator_pool_id);
CREATE INDEX IF NOT EXISTS idx_history_campaign ON cp_creator_history(campaign_id);

CREATE INDEX IF NOT EXISTS idx_commercials_creator ON cp_creator_commercials(creator_pool_id);
