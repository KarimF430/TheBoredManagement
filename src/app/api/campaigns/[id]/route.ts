import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/campaigns/[id] — Get campaign detail with KPIs
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const client = getCPClient()

  try {
    // Get campaign
    const { data: campaign, error: campErr } = await client
      .from('cp_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check access
    if (session.role === 'client' && !session.campaign_ids.includes(id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get creators count by status
    const { data: creators } = await client
      .from('cp_creators')
      .select('id, status, internal_cost, quoted_cost, subscribers, avg_views')
      .eq('campaign_id', id)

    // Get deliverables count by status
    const { data: deliverables } = await client
      .from('cp_deliverables')
      .select('id, status, platform, views, likes, comments, tracking_started_at')
      .eq('campaign_id', id)

    // Compute KPIs
    const totalCreators = creators?.length || 0
    const totalDeliverables = deliverables?.length || 0
    const liveDeliverables = deliverables?.filter(d => d.tracking_started_at) || []
    const totalViews = liveDeliverables.reduce((sum, d) => sum + (d.views || 0), 0)
    const totalLikes = liveDeliverables.reduce((sum, d) => sum + (d.likes || 0), 0)
    const totalComments = liveDeliverables.reduce((sum, d) => sum + (d.comments || 0), 0)
    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100) : 0

    // Spend (quoted cost for client, internal for internal roles)
    const totalSpend = creators?.reduce((sum, c) => sum + (c.quoted_cost || 0), 0) || 0
    const internalSpend = session.role !== 'client'
      ? creators?.reduce((sum, c) => sum + (c.internal_cost || 0), 0) || 0
      : null
    const margin = internalSpend !== null ? totalSpend - internalSpend : null
    const marginPct = internalSpend && internalSpend > 0 ? (margin! / totalSpend * 100) : null

    // Blended CPV
    const blendedCPV = totalViews > 0 ? totalSpend / totalViews : 0

    // Posts by format
    const postsByFormat = {
      youtube_long: deliverables?.filter(d => d.platform === 'youtube_long').length || 0,
      youtube_shorts: deliverables?.filter(d => d.platform === 'youtube_shorts').length || 0,
      instagram_reels: deliverables?.filter(d => d.platform === 'instagram_reels').length || 0,
    }

    // Status breakdown
    const creatorsByStatus = {
      shortlisted: creators?.filter(c => c.status === 'shortlisted').length || 0,
      client_review: creators?.filter(c => c.status === 'client_review').length || 0,
      negotiating: creators?.filter(c => c.status === 'negotiating').length || 0,
      onboarded: creators?.filter(c => c.status === 'onboarded').length || 0,
      active: creators?.filter(c => c.status === 'active').length || 0,
      completed: creators?.filter(c => c.status === 'completed').length || 0,
      rejected: creators?.filter(c => c.status === 'rejected').length || 0,
    }

    // Days remaining
    const goLiveDate = new Date(campaign.go_live_date)
    const today = new Date()
    const daysRemaining = Math.ceil((goLiveDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      campaign,
      kpis: {
        totalCreators,
        totalDeliverables,
        totalViews,
        engagementRate: Math.round(engagementRate * 100) / 100,
        totalSpend,
        internalSpend,
        margin,
        marginPct: marginPct ? Math.round(marginPct * 100) / 100 : null,
        blendedCPV: Math.round(blendedCPV * 10000) / 10000,
        postsByFormat,
        creatorsByStatus,
        daysRemaining,
      },
    })
  } catch (err) {
    console.error('Get campaign error:', err)
    return NextResponse.json({ error: 'Failed to get campaign' }, { status: 500 })
  }
}

// PATCH /api/campaigns/[id] — Update campaign
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const client = getCPClient()

  try {
    // Get current campaign
    const { data: current } = await client
      .from('cp_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check access
    if (session.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only BS and CM can update most fields
    if (session.role !== 'brand_solutions' && session.role !== 'campaign_manager') {
      // IR roles can only update limited fields
      const allowedFields = ['brief_mandatories']
      const keys = Object.keys(body)
      const disallowed = keys.filter(k => !allowedFields.includes(k))
      if (disallowed.length > 0) {
        return NextResponse.json({ error: `Cannot update: ${disallowed.join(', ')}` }, { status: 403 })
      }
    }

    // Track brief edits
    if (body.brief_mandatories !== undefined && body.brief_mandatories !== current.brief_mandatories) {
      body.brief_last_edited_by = session.id
      body.brief_last_edited_at = new Date().toISOString()
    }

    body.updated_at = new Date().toISOString()

    const { data: updated, error } = await client
      .from('cp_campaigns')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity for status changes
    if (body.status && body.status !== current.status) {
      await client.from('cp_activity_feed').insert({
        campaign_id: id,
        actor_user_id: session.id,
        actor_role: session.role,
        actor_name: session.name,
        action_type: 'status_changed',
        entity_type: 'campaign',
        entity_id: id,
        entity_name: current.name,
        details: { field: 'status', from: current.status, to: body.status },
      })
    }

    return NextResponse.json({ campaign: updated })
  } catch (err) {
    console.error('Update campaign error:', err)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}
