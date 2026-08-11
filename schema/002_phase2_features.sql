-- ═══════════════════════════════════════════════════════════════════
-- Campaign Panel — Phase 2 Schema
-- Product Tracking, Link Tracking, Team Assignments
-- ═══════════════════════════════════════════════════════════════════

-- ── Product Shipments ──────────────────────────────────────────────
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

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_shipments_deliverable ON cp_product_shipments(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_cp_shipments_campaign ON cp_product_shipments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_shipments_status ON cp_product_shipments(status);

-- ── Tracked Links ──────────────────────────────────────────────────
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
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_links_campaign ON cp_tracked_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_links_creator ON cp_tracked_links(creator_id);
CREATE INDEX IF NOT EXISTS idx_cp_links_code ON cp_tracked_links(short_code);

-- ── Link Clicks ────────────────────────────────────────────────────
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

  clicked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_clicks_link ON cp_link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_cp_clicks_time ON cp_link_clicks(clicked_at);

-- ── Team Assignments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  role TEXT NOT NULL DEFAULT 'ir_executive',
  assigned_sections TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_team_campaign ON cp_team_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_team_user ON cp_team_assignments(user_id);

-- ── Deliverable Product Tracking Columns ───────────────────────────
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS product_shipped_at TIMESTAMPTZ;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS product_delivered_at TIMESTAMPTZ;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS shoot_scheduled_at TIMESTAMPTZ;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS shoot_completed_at TIMESTAMPTZ;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS carrier TEXT;
