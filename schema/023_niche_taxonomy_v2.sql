-- ============================================================================
-- NICHE TAXONOMY v2: Add category column for hierarchical tree
-- Run this migration to enable category-based niche selection
-- ============================================================================

-- Add category column
ALTER TABLE creator_niche_taxonomy
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';

-- Add index for category-based queries
CREATE INDEX IF NOT EXISTS idx_niche_category ON creator_niche_taxonomy(category);

-- Update existing niches with proper categories
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
