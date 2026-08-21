-- 024: Multi-Axis Creator Profile
-- Adds per-axis structured fields to creator_profile_drafts
-- Each axis is independent, with its own provenance tracking.

-- ── Niche axis (replaces flat primary_niche/secondary_niches) ──────
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS cluster TEXT,
  ADD COLUMN IF NOT EXISTS niche_provenance TEXT DEFAULT 'self_reported';

-- ── Language axis (predictive multi-select) ────────────────────────
-- languages already exists as TEXT[]; add preselection metadata
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS languages_preselected BOOLEAN DEFAULT false;

-- ── Creator type axis (single-select) ──────────────────────────────
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS creator_type TEXT;

-- ── Content format axis (multi-select) ─────────────────────────────
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS content_formats TEXT[] DEFAULT '{}';

-- ── Brand history axis (light entry + enrichment) ──────────────────
-- past_brand_collabs exists; add structured version with provenance
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS brands_worked JSONB DEFAULT '[]';
-- Each entry: { name: string, provenance: 'self_reported'|'verified'|'enriched' }

-- ── Brand categories wanted (deferred to shortlist) ────────────────
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS brand_categories_wanted TEXT[] DEFAULT '{}';

-- ── Metrics provenance ─────────────────────────────────────────────
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS metrics_provenance TEXT DEFAULT 'unknown';
-- Values: 'verified' | 'self_reported' | 'enriched' | 'unknown'

-- ── Consent tracking (per-axis) ────────────────────────────────────
ALTER TABLE creator_profile_drafts
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;

-- ── Indexes for deferred-axis queries ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drafts_creator_type
  ON creator_profile_drafts(creator_type)
  WHERE creator_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_drafts_content_formats
  ON creator_profile_drafts USING GIN(content_formats)
  WHERE array_length(content_formats, 1) > 0;

-- ── Verify ─────────────────────────────────────────────────────────
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'creator_profile_drafts'
-- ORDER BY ordinal_position;
