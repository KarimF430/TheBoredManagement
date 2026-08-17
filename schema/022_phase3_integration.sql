-- ============================================================================
-- PHASE 3: Integration, Instrumentation, Consent
-- ============================================================================

-- Funnel event log (every stage gets a timestamped event)
CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES creator_onboarding_sessions(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consent tracking (DPDP compliance)
CREATE TABLE IF NOT EXISTS onboarding_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES creator_onboarding_sessions(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(session_id)
);

-- Verified metrics cache (avoid re-fetching)
CREATE TABLE IF NOT EXISTS onboarding_verified_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES creator_onboarding_sessions(id) ON DELETE CASCADE,
  youtube_channel_id TEXT,
  youtube_subscribers INTEGER DEFAULT 0,
  youtube_views BIGINT DEFAULT 0,
  youtube_videos INTEGER DEFAULT 0,
  youtube_country TEXT,
  youtube_recent_titles TEXT[] DEFAULT '{}',
  youtube_avg_views INTEGER DEFAULT 0,
  youtube_engagement_rate DECIMAL(5,4) DEFAULT 0,
  youtube_verified_at TIMESTAMPTZ,
  instagram_verified BOOLEAN DEFAULT false,
  instagram_followers INTEGER DEFAULT 0,
  instagram_engagement_rate DECIMAL(5,4) DEFAULT 0,
  instagram_verified_at TIMESTAMPTZ,
  total_followers INTEGER DEFAULT 0,
  provenance TEXT DEFAULT 'self_reported' CHECK (provenance IN ('verified', 'self_reported', 'enriched', 'unknown')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

-- Pilot tracking (for the 500-creator pilot)
CREATE TABLE IF NOT EXISTS onboarding_pilot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES creator_onboarding_sessions(id) ON DELETE CASCADE,
  pilot_batch TEXT NOT NULL DEFAULT 'default',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  link_clicked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reply_received_at TIMESTAMPTZ,
  reply_category TEXT,
  go_nogo_status TEXT DEFAULT 'pending' CHECK (go_nogo_status IN ('pending', 'go', 'no_go', 'hold')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

-- Handle ownership proofs (section 4)
CREATE TABLE IF NOT EXISTS onboarding_handle_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES creator_onboarding_sessions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'twitter', 'tiktok')),
  handle TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  used BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_session ON onboarding_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_event ON onboarding_events(event);
CREATE INDEX IF NOT EXISTS idx_events_created ON onboarding_events(created_at);
CREATE INDEX IF NOT EXISTS idx_consent_session ON onboarding_consent(session_id);
CREATE INDEX IF NOT EXISTS idx_verified_metrics_session ON onboarding_verified_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_pilot_batch ON onboarding_pilot(pilot_batch);
CREATE INDEX IF NOT EXISTS idx_pilot_status ON onboarding_pilot(go_nogo_status);
