import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { hashPassword } from '@/lib/cp-auth'

const SEED_SQL = `-- Paste this in Supabase SQL Editor: https://supabase.com/dashboard
-- Then visit /api/setup-campaign?create-user=true to create the first user

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ir_executive',
  campaign_ids UUID[] DEFAULT '{}',
  brand_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'ir_executive',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, campaign_id)
);

CREATE TABLE IF NOT EXISTS cp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'brand_awareness',
  objective TEXT DEFAULT '',
  platform_mix TEXT[] DEFAULT '{}',
  deliverable_types TEXT[] DEFAULT '{}',
  budget NUMERIC(12,2) DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  go_live_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  sla_client_feedback_hours INT DEFAULT 48,
  sla_script_days INT DEFAULT 5,
  sla_content_days INT DEFAULT 7,
  sla_onboard_to_live_days INT DEFAULT 15,
  poc_brand_solutions UUID,
  poc_campaign_manager UUID,
  brief_mandatories TEXT DEFAULT '',
  brief_last_edited_by UUID,
  brief_last_edited_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_handle TEXT DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'youtube',
  profile_image_url TEXT DEFAULT '',
  subscribers INT DEFAULT 0,
  avg_views INT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  internal_cost NUMERIC(12,2) DEFAULT 0,
  quoted_cost NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'shortlisted',
  rejection_reason TEXT,
  rejection_remark TEXT,
  auto_metrics JSONB DEFAULT '{}',
  onboarded_at TIMESTAMPTZ,
  go_live_deadline DATE,
  go_live_deadline_extended BOOLEAN DEFAULT FALSE,
  extension_reason TEXT,
  extension_approved_by UUID,
  added_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES cp_creators(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'youtube_long',
  status TEXT NOT NULL DEFAULT 'pending',
  live_link TEXT,
  live_link_added_at TIMESTAMPTZ,
  tracking_started_at TIMESTAMPTZ,
  tracking_ends_at TIMESTAMPTZ,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  last_metrics_refresh TIMESTAMPTZ,
  script_current_version INT DEFAULT 0,
  script_approved_at TIMESTAMPTZ,
  script_approved_by UUID,
  product_eta DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_negotiation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES cp_creators(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id),
  round_number INT NOT NULL DEFAULT 1,
  cost_offered NUMERIC(12,2),
  cost_returned NUMERIC(12,2),
  remarks TEXT DEFAULT '',
  offered_by_role TEXT NOT NULL,
  offered_by_user UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT now(),
  remarks TEXT DEFAULT '',
  is_client_owned BOOLEAN DEFAULT FALSE,
  clock_paused_at TIMESTAMPTZ,
  clock_resumed_at TIMESTAMPTZ,
  paused_duration INTERVAL DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS cp_script_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES cp_deliverables(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id),
  version_number INT NOT NULL DEFAULT 1,
  content_text TEXT DEFAULT '',
  content_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  is_approved_snapshot BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  feedback_remark TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES cp_campaigns(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id),
  actor_user_id UUID,
  actor_role TEXT,
  actor_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT DEFAULT '',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES cp_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  invite_token TEXT,
  invite_sent_at TIMESTAMPTZ,
  invite_accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, email)
);

CREATE TABLE IF NOT EXISTS cp_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES cp_campaigns(id),
  to_email TEXT NOT NULL,
  to_role TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  scrubbed BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  resend_id TEXT
);

CREATE TABLE IF NOT EXISTS cp_rejection_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_channel_url TEXT NOT NULL,
  campaign_id UUID REFERENCES cp_campaigns(id),
  rejection_reason TEXT NOT NULL,
  rejected_by UUID,
  brand_name TEXT,
  campaign_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_campaigns_status ON cp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_cp_creators_campaign ON cp_creators(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_creators_status ON cp_creators(status);
CREATE INDEX IF NOT EXISTS idx_cp_deliverables_creator ON cp_deliverables(creator_id);
CREATE INDEX IF NOT EXISTS idx_cp_deliverables_campaign ON cp_deliverables(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_deliverables_tracking ON cp_deliverables(tracking_ends_at) WHERE tracking_started_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cp_negotiation_creator ON cp_negotiation_log(creator_id);
CREATE INDEX IF NOT EXISTS idx_cp_status_history_entity ON cp_status_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cp_status_history_campaign ON cp_status_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_script_versions_deliverable ON cp_script_versions(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_cp_notifications_user ON cp_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_cp_notifications_campaign ON cp_notifications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_activity_feed_campaign ON cp_activity_feed(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cp_client_users_campaign ON cp_client_users(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_client_users_token ON cp_client_users(invite_token);
CREATE INDEX IF NOT EXISTS idx_cp_rejection_channel ON cp_rejection_intelligence(creator_channel_url);`

// GET /api/setup-campaign — returns setup instructions
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const createUser = searchParams.get('create-user') === 'true'
  const showSql = searchParams.get('show-sql') === 'true'

  if (showSql) {
    return new NextResponse(SEED_SQL, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }

  if (createUser) {
    return await handleCreateUser()
  }

  // Check if tables exist
  const client = getCPClient()
  let tablesExist = false
  try {
    const { error } = await client.from('users').select('id').limit(1)
    tablesExist = !error
  } catch {
    tablesExist = false
  }

  return NextResponse.json({
    tables_exist: tablesExist,
    instructions: tablesExist
      ? 'Tables exist. Visit /api/setup-campaign?create-user=true to create the first user.'
      : 'Tables not found. Visit /api/setup-campaign?show-sql=true to get the SQL, then paste it in Supabase SQL Editor.'
  })
}

async function handleCreateUser() {
  try {
    const client = getCPClient()

    // Check if user exists
    const { data: existing } = await client
      .from('users')
      .select('id, email')
      .eq('email', 'haji.karim@theboredmonkey.com')
      .single()

    const passwordHash = await hashPassword('Tbm@2026')

    if (existing) {
      // Check if the existing user has a valid password hash (must contain ':' for PBKDF2 format)
      const { data: fullUser } = await client
        .from('users')
        .select('id, password_hash')
        .eq('email', 'haji.karim@theboredmonkey.com')
        .single()

      const hasValidHash = fullUser?.password_hash?.includes(':')

      if (hasValidHash) {
        return NextResponse.json({
          ok: true,
          message: `User already exists with valid password: ${existing.email}`
        })
      }

      // Update the placeholder hash with a real one
      const { error: updateError } = await client
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('email', 'haji.karim@theboredmonkey.com')

      if (updateError) {
        return NextResponse.json({
          ok: false,
          error: updateError.message,
          hint: 'Failed to update password hash.'
        }, { status: 400 })
      }

      return NextResponse.json({
        ok: true,
        message: 'User password hash updated successfully',
        credentials: {
          email: 'haji.karim@theboredmonkey.com',
          password: 'Tbm@2026',
          role: 'brand_solutions'
        },
        login_url: '/login'
      })
    }

    // Create first user
    const { data: user, error } = await client
      .from('users')
      .insert({
        email: 'haji.karim@theboredmonkey.com',
        name: 'Haji Karim',
        password_hash: passwordHash,
        role: 'brand_solutions',
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({
        ok: false,
        error: error.message,
        hint: 'Tables may not exist yet. Visit /api/setup-campaign?show-sql=true first.'
      }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'First user created successfully',
      credentials: {
        email: 'haji.karim@theboredmonkey.com',
        password: 'Tbm@2026',
        role: 'brand_solutions'
      },
      login_url: '/login'
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
