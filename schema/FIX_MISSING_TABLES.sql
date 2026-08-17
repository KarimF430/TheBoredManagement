-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX MISSING TABLES — Creator Onboarding + exec_sql function
-- Run in Supabase SQL Editor BEFORE DEMO_DATA.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- 0. Create exec_sql function (required for future SQL operations)
CREATE OR REPLACE FUNCTION exec_sql(_sql TEXT)
RETURNS SETOF JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE _sql;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;

-- 1. Creator Onboarding Sessions
CREATE TABLE IF NOT EXISTS creator_onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  creator_email TEXT NOT NULL,
  creator_name TEXT,
  outreach_creator_id UUID,
  pool_creator_id UUID REFERENCES cp_creator_pool(id) ON DELETE SET NULL,
  current_step INT DEFAULT 1,
  total_steps INT DEFAULT 5,
  completed_steps INT[] DEFAULT '{}',
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_verified BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_token ON creator_onboarding_sessions(token);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_email ON creator_onboarding_sessions(creator_email);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON creator_onboarding_sessions(status);

ALTER TABLE creator_onboarding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON creator_onboarding_sessions FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- 2. Creator Profile Drafts (multi-step onboarding form data)
CREATE TABLE IF NOT EXISTS creator_profile_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES creator_onboarding_sessions(id) ON DELETE CASCADE,

  name TEXT,
  phone TEXT,
  whatsapp TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  gender TEXT,
  age_range TEXT,
  languages TEXT[] DEFAULT '{}',
  primary_niche TEXT,
  secondary_niches TEXT[] DEFAULT '{}',
  sub_niches TEXT[] DEFAULT '{}',
  content_types TEXT[] DEFAULT '{}',

  youtube_url TEXT,
  youtube_handle TEXT,
  youtube_subscribers INT DEFAULT 0,
  instagram_url TEXT,
  instagram_handle TEXT,
  instagram_followers INT DEFAULT 0,
  tiktok_url TEXT,
  tiktok_followers INT DEFAULT 0,
  twitter_url TEXT,
  twitter_handle TEXT,
  twitter_followers INT DEFAULT 0,
  other_social JSONB DEFAULT '{}',

  avg_views INT DEFAULT 0,
  avg_engagement DECIMAL(5,2) DEFAULT 0,
  avg_likes INT DEFAULT 0,
  avg_comments INT DEFAULT 0,
  total_videos INT DEFAULT 0,
  total_views BIGINT DEFAULT 0,

  audience_age_distribution JSONB DEFAULT '{}',
  audience_gender_distribution JSONB DEFAULT '{}',
  audience_location_distribution JSONB DEFAULT '{}',

  content_style TEXT[] DEFAULT '{}',
  brand_collab_preferences TEXT[] DEFAULT '{}',
  content_frequency TEXT,
  preferred_platforms TEXT[] DEFAULT '{}',
  past_brand_collabs TEXT[] DEFAULT '{}',

  portfolio_url TEXT,
  rate_card JSONB DEFAULT '{}',
  currency TEXT DEFAULT 'INR',
  negotiable BOOLEAN DEFAULT TRUE,
  min_rate INT,

  step_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drafts_session ON creator_profile_drafts(session_id);

ALTER TABLE creator_profile_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON creator_profile_drafts FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- 3. Niche Taxonomy
CREATE TABLE IF NOT EXISTS creator_niche_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_name TEXT UNIQUE NOT NULL,
  parent_niche TEXT,
  sub_niches TEXT[] DEFAULT '{}',
  content_types TEXT[] DEFAULT '{}',
  icon TEXT,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE creator_niche_taxonomy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON creator_niche_taxonomy FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Seed niche taxonomy
INSERT INTO creator_niche_taxonomy (niche_name, sub_niches, content_types, icon, display_order) VALUES
('Technology', ARRAY['smartphones','laptops','gadgets','software','AI','gaming_hardware']::TEXT[], ARRAY['review','unboxing','tutorial','comparison']::TEXT[], 'laptop', 1),
('Beauty & Fashion', ARRAY['skincare','makeup','haircare','fashion','nail_art','fragrance']::TEXT[], ARRAY['tutorial','review','haul','get_ready_with_me']::TEXT[], 'sparkles', 2),
('Food & Cooking', ARRAY['street_food','restaurant_reviews','recipes','baking','vegan','food_vlogs']::TEXT[], ARRAY['review','vlog','recipe','mukbang']::TEXT[], 'utensils', 3),
('Fitness & Health', ARRAY['workout','nutrition','yoga','mental_health','supplements','weight_loss']::TEXT[], ARRAY['tutorial','vlog','challenge','transformation']::TEXT[], 'dumbbell', 4),
('Travel', ARRAY['solo_travel','budget_travel','luxury_travel','adventure','hostel_reviews']::TEXT[], ARRAY['vlog','guide','review','day_in_my_life']::TEXT[], 'plane', 5),
('Lifestyle', ARRAY['daily_vlogs','morning_routines','home_decor','minimalism','productivity']::TEXT[], ARRAY['vlog','tutorial','day_in_my_life','room_tour']::TEXT[], 'home', 6),
('Entertainment', ARRAY['comedy','sketches','roasts','reactions','storytime','challenges']::TEXT[], ARRAY['sketch','roast','reaction','challenge']::TEXT[], 'film', 7),
('Gaming', ARRAY['mobile_gaming','pc_gaming','esports','game_reviews','streaming']::TEXT[], ARRAY['gameplay','review','tutorial','stream']::TEXT[], 'gamepad', 8),
('Automotive', ARRAY['cars','bikes','electric_vehicles','car_reviews','motovlogs']::TEXT[], ARRAY['review','vlog','comparison','motovlog']::TEXT[], 'car', 9),
('Education', ARRAY['science','math','language_learning','study_tips','career']::TEXT[], ARRAY['tutorial','explainer','study_with_me','tips']::TEXT[], 'book-open', 10),
('Finance', ARRAY['investing','crypto','personal_finance','budgeting','stocks']::TEXT[], ARRAY['explainer','tutorial','analysis','tips']::TEXT[], 'trending-up', 11),
('Music', ARRAY['singing','instruments','music_production','covers','original']::TEXT[], ARRAY['cover','tutorial','session','original']::TEXT[], 'music', 12),
('Art & Design', ARRAY['digital_art','painting','graphic_design','photography','tattoos']::TEXT[], ARRAY['tutorial','speed_paint','process','tutorial']::TEXT[], 'palette', 13),
('Parenting', ARRAY['baby_care','kids_activities','pregnancy','education','family_vlogs']::TEXT[], ARRAY['vlog','tips','routine','haul']::TEXT[], 'baby', 14),
('Pet & Animals', ARRAY['dog_care','cat_care','pet_training','aquarium','exotic_pets']::TEXT[], ARRAY['vlog','tutorial','day_in_my_life','tips']::TEXT[], 'paw-print', 15)
ON CONFLICT (niche_name) DO NOTHING;

-- 4. Add updated_at triggers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_creator_onboarding_sessions_updated_at') THEN
    CREATE TRIGGER trg_creator_onboarding_sessions_updated_at BEFORE UPDATE ON creator_onboarding_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_creator_profile_drafts_updated_at') THEN
    CREATE TRIGGER trg_creator_profile_drafts_updated_at BEFORE UPDATE ON creator_profile_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
