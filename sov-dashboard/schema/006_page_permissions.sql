-- Add per-member page permissions override.
-- NULL = use role defaults (no custom override).
-- JSONB stores { "feature_key": true/false } for features the member
-- can/cannot access, overriding the role-based defaults in permissions.ts.
ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS page_permissions JSONB;
