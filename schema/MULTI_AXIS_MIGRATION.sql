-- ═══════════════════════════════════════════════════════════════════
-- MULTI-AXIS CREATOR PROFILE — Combined Migration
-- Run this ONCE in Supabase SQL Editor
-- Safe to re-run (all statements use IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════════

-- ── PART 1: Niche Taxonomy v2 — Add category column ──────────────
-- (from 023_niche_taxonomy_v2.sql)

ALTER TABLE creator_niche_taxonomy
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';

CREATE INDEX IF NOT EXISTS idx_niche_category ON creator_niche_taxonomy(category);

UPDATE creator_niche_taxonomy SET category = 'Technology & Digital' WHERE niche_name IN (
  'Technology', 'Gaming', 'Science & Technology', 'Education Tech'
);
UPDATE creator_niche_taxonomy SET category = 'Fashion & Beauty' WHERE niche_name IN (
  'Fashion', 'Beauty'
);
UPDATE creator_niche_taxonomy SET category = 'Fitness & Health' WHERE niche_name IN (
  'Fitness', 'Health & Wellness'
);
UPDATE creator_niche_taxonomy SET category = 'Food & Travel' WHERE niche_name IN (
  'Food & Cooking', 'Travel'
);
UPDATE creator_niche_taxonomy SET category = 'Entertainment' WHERE niche_name IN (
  'Comedy', 'Music', 'Dance', 'Film & Cinematography', 'Vlogs'
);
UPDATE creator_niche_taxonomy SET category = 'Creative' WHERE niche_name IN (
  'Art & Craft', 'Photography'
);
UPDATE creator_niche_taxonomy SET category = 'Education & Business' WHERE niche_name IN (
  'Education', 'Business & Entrepreneurship', 'Finance & Investment', 'Motivational'
);
UPDATE creator_niche_taxonomy SET category = 'Lifestyle' WHERE niche_name IN (
  'Lifestyle', 'Relationships', 'Parenting', 'Spirituality'
);
UPDATE creator_niche_taxonomy SET category = 'Automotive & Property' WHERE niche_name IN (
  'Automobiles', 'Real Estate', 'Home & Garden'
);
UPDATE creator_niche_taxonomy SET category = 'Sports & Outdoors' WHERE niche_name IN (
  'Sports', 'Pets & Animals', 'Agriculture'
);
UPDATE creator_niche_taxonomy SET category = 'News & Politics' WHERE niche_name IN (
  'News & Politics'
);
UPDATE creator_niche_taxonomy SET category = 'Regional' WHERE niche_name IN (
  'Hindi Content', 'Tamil Content', 'Telugu Content', 'Bengali Content',
  'Marathi Content', 'Kannada Content', 'Malayalam Content', 'Punjabi Content'
);


-- ── PART 2: Multi-Axis Profile — New columns ─────────────────────
-- (from 024_multi_axis_profile.sql)

-- Niche axis
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS cluster TEXT,
  ADD COLUMN IF NOT EXISTS niche_provenance TEXT DEFAULT 'self_reported';

-- Language axis
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS languages_preselected BOOLEAN DEFAULT false;

-- Creator type axis
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS creator_type TEXT;

-- Content format axis
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS content_formats TEXT[] DEFAULT '{}';

-- Brand history axis (structured with provenance)
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS brands_worked JSONB DEFAULT '[]';

-- Brand categories wanted (deferred to shortlist)
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS brand_categories_wanted TEXT[] DEFAULT '{}';

-- Metrics provenance
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS metrics_provenance TEXT DEFAULT 'unknown';

-- Consent tracking
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drafts_creator_type
  ON creator_profile_drafts(creator_type)
  WHERE creator_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_drafts_content_formats
  ON creator_profile_drafts USING GIN(content_formats)
  WHERE array_length(content_formats, 1) > 0;


-- ── PART 3: Verify everything applied ────────────────────────────

-- Check new columns on creator_profile_drafts
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'creator_profile_drafts'
  AND column_name IN (
    'cluster', 'niche_provenance', 'languages_preselected',
    'creator_type', 'content_formats', 'brands_worked',
    'brand_categories_wanted', 'metrics_provenance', 'consent_given'
  )
ORDER BY ordinal_position;

-- Check category column on creator_niche_taxonomy
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'creator_niche_taxonomy'
  AND column_name = 'category';
