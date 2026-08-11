import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'
import crypto from 'crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/campaigns/[id]/settings — Get campaign settings (team, SLA, clients)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const client = getCPClient()

  try {
    // Get campaign
    const { data: campaign } = await client
      .from('cp_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get team members (campaign_roles)
    const { data: roles } = await client
      .from('campaign_roles')
      .select(`
        *,
        user:users(id, email, name, role)
      `)
      .eq('campaign_id', id)

    // Get client users
    const { data: clientUsers } = await client
      .from('cp_client_users')
      .select('id, email, name, brand_name, is_active, invite_accepted_at, created_at')
      .eq('campaign_id', id)

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        brand: campaign.brand,
        status: campaign.status,
        sla_client_feedback_hours: campaign.sla_client_feedback_hours,
        sla_script_days: campaign.sla_script_days,
        sla_content_days: campaign.sla_content_days,
        sla_onboard_to_live_days: campaign.sla_onboard_to_live_days,
        poc_brand_solutions: campaign.poc_brand_solutions,
        poc_campaign_manager: campaign.poc_campaign_manager,
      },
      team: roles || [],
      clients: clientUsers || [],
    })
  } catch (err) {
    console.error('Get settings error:', err)
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

// PATCH /api/campaigns/[id]/settings — Update SLA or POC
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.role !== 'brand_solutions' && session.role !== 'campaign_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const client = getCPClient()

  try {
    const allowedFields = [
      'sla_client_feedback_hours', 'sla_script_days', 'sla_content_days',
      'sla_onboard_to_live_days', 'poc_brand_solutions', 'poc_campaign_manager',
    ]

    const updates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: updated, error } = await client
      .from('cp_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_user_id: session.id,
      actor_role: session.role,
      actor_name: session.name,
      action_type: 'status_changed',
      entity_type: 'campaign',
      entity_id: id,
      entity_name: updated.name,
      details: { field: 'settings', updated: Object.keys(updates) },
    })

    return NextResponse.json({ campaign: updated })
  } catch (err) {
    console.error('Update settings error:', err)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
