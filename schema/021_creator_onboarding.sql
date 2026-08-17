-- ============================================================================
-- CREATOR ONBOARDING SYSTEM
-- Tinder/Bumble-style multi-step profile builder for creators
-- ============================================================================

-- Onboarding session tracking
CREATE TABLE IF NOT EXISTS creator_onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  creator_email TEXT NOT NULL,
  creator_name TEXT,
  outreach_creator_id UUID REFERENCES outreach_creators(id),
  pool_creator_id UUID REFERENCES cp_creator_pool(id),

  -- Progress tracking
  current_step INT DEFAULT 1,
  total_steps INT DEFAULT 6,
  completed_steps INT[] DEFAULT '{}',

  -- Auth
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_verified BOOLEAN DEFAULT false,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),

  -- Timestamps
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator profile drafts (multi-step form data)
CREATE TABLE IF NOT EXISTS creator_profile_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES creator_onboarding_sessions(id) ON DELETE CASCADE,

  -- Step 1: Basic Info
  name TEXT,
  phone TEXT,
  whatsapp TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  gender TEXT,
  age_range TEXT,
  languages TEXT[] DEFAULT '{}',

  -- Step 2: Niche Selection
  primary_niche TEXT,
  secondary_niches TEXT[] DEFAULT '{}',
  sub_niches TEXT[] DEFAULT '{}',
  content_types TEXT[] DEFAULT '{}',

  -- Step 3: Social Profiles
  youtube_url TEXT,
  youtube_handle TEXT,
  youtube_subscribers INTEGER DEFAULT 0,
  instagram_url TEXT,
  instagram_handle TEXT,
  instagram_followers INTEGER DEFAULT 0,
  tiktok_url TEXT,
  tiktok_followers INTEGER DEFAULT 0,
  twitter_url TEXT,
  twitter_handle TEXT,
  twitter_followers INTEGER DEFAULT 0,
  other_social JSONB DEFAULT '{}',

  -- Step 4: Audience Data
  avg_views INTEGER DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,
  avg_likes INTEGER DEFAULT 0,
  avg_comments INTEGER DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  audience_age_distribution JSONB DEFAULT '{}',
  audience_gender_distribution JSONB DEFAULT '{}',
  audience_location_distribution JSONB DEFAULT '{}',

  -- Step 5: Content Preferences
  content_style TEXT[] DEFAULT '{}',
  brand_collab_preferences TEXT[] DEFAULT '{}',
  content_frequency TEXT,
  preferred_platforms TEXT[] DEFAULT '{}',
  past_brand_collabs TEXT[] DEFAULT '{}',
  portfolio_url TEXT,

  -- Step 6: Pricing
  rate_card JSONB DEFAULT '{}',
  currency TEXT DEFAULT 'INR',
  negotiable BOOLEAN DEFAULT true,
  min_rate INTEGER,

  -- Raw step data for flexibility
  step_data JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Niche taxonomy (for dynamic filtering)
CREATE TABLE IF NOT EXISTS creator_niche_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_name TEXT NOT NULL UNIQUE,
  parent_niche TEXT,
  sub_niches TEXT[] DEFAULT '{}',
  content_types TEXT[] DEFAULT '{}',
  icon TEXT,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_token ON creator_onboarding_sessions(token);
CREATE INDEX IF NOT EXISTS idx_onboarding_email ON creator_onboarding_sessions(creator_email);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON creator_onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_draft_session ON creator_profile_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_niche_parent ON creator_niche_taxonomy(parent_niche);
CREATE INDEX IF NOT EXISTS idx_niche_active ON creator_niche_taxonomy(active);
