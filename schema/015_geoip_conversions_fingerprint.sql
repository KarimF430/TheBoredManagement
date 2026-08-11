-- Migration: Add GeoIP columns to cp_link_clicks and create cp_link_conversions table
-- Run this to enable enhanced link tracking features

-- Add geo columns to cp_link_clicks
ALTER TABLE cp_link_clicks ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE cp_link_clicks ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE cp_link_clicks ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;
ALTER TABLE cp_link_clicks ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE cp_link_clicks ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE cp_link_clicks ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE cp_link_clicks ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE cp_link_clicks ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE cp_link_clicks ADD COLUMN IF NOT EXISTS isp TEXT;

-- Add current_location to cp_product_shipments
ALTER TABLE cp_product_shipments ADD COLUMN IF NOT EXISTS current_location TEXT;

-- Add comments_raw to cp_deliverables for sentiment analysis
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS comments_raw JSONB DEFAULT '[]';

-- Create conversion tracking table
CREATE TABLE IF NOT EXISTS cp_link_conversions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES cp_tracked_links(id) ON DELETE CASCADE,
  conversion_type TEXT NOT NULL DEFAULT 'purchase',
  value DOUBLE PRECISION,
  order_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_link_conversions_link_id ON cp_link_conversions(link_id);
CREATE INDEX IF NOT EXISTS idx_cp_link_conversions_created_at ON cp_link_conversions(created_at);

-- Add conversion fields to cp_tracked_links
ALTER TABLE cp_tracked_links ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0;
ALTER TABLE cp_tracked_links ADD COLUMN IF NOT EXISTS conversion_rate DOUBLE PRECISION DEFAULT 0;
