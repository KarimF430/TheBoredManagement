-- ═══════════════════════════════════════════════════════════════════
-- Migration 014: Product Tracking, Brief Versioning, Onboarding Lock
-- Adds missing columns and tables from the build brief
-- ═══════════════════════════════════════════════════════════════════

-- ── Product tracking columns on deliverables ──
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT '';
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS product_status TEXT DEFAULT 'not_required';
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS product_ordered_at TIMESTAMPTZ;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS product_shipped_at TIMESTAMPTZ;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS product_delivered_at TIMESTAMPTZ;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS product_tracking_number TEXT;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS product_carrier TEXT;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS shoot_scheduled_at TIMESTAMPTZ;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS shoot_completed_at TIMESTAMPTZ;
ALTER TABLE cp_deliverables ADD COLUMN IF NOT EXISTS brief_approved_at TIMESTAMPTZ;

-- ── Onboarding columns on creators ──
ALTER TABLE cp_creators ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
ALTER TABLE cp_creators ADD COLUMN IF NOT EXISTS go_live_deadline DATE;
ALTER TABLE cp_creators ADD COLUMN IF NOT EXISTS go_live_deadline_extended BOOLEAN DEFAULT FALSE;
ALTER TABLE cp_creators ADD COLUMN IF NOT EXISTS extension_reason TEXT;
ALTER TABLE cp_creators ADD COLUMN IF NOT EXISTS extension_approved_by UUID;

-- ── Brief Versioning ──
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

-- ── Client Review Actions ──
ALTER TABLE cp_creators ADD COLUMN IF NOT EXISTS client_action TEXT;
ALTER TABLE cp_creators ADD COLUMN IF NOT EXISTS client_remark TEXT;
ALTER TABLE cp_creators ADD COLUMN IF NOT EXISTS client_action_at TIMESTAMPTZ;

-- ── Populate product tracking from existing shipments ──
UPDATE cp_deliverables d SET
  product_shipped_at = s.shipped_at,
  product_delivered_at = s.delivered_at,
  product_tracking_number = s.tracking_number,
  product_carrier = s.carrier,
  product_status = CASE
    WHEN s.status = 'delivered' THEN 'delivered'
    WHEN s.status = 'in_transit' THEN 'shipped'
    WHEN s.status = 'shipped' THEN 'ordered'
    ELSE d.product_status
  END
FROM cp_product_shipments s
WHERE s.campaign_id = d.campaign_id
  AND d.product_status = 'not_required'
  AND s.shipped_at IS NOT NULL;
