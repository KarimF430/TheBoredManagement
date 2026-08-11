import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/campaigns/[id]/creators — List creators for campaign
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const client = getCPClient()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const sort = url.searchParams.get('sort') || 'created_at'
  const order = url.searchParams.get('order') || 'desc'

  try {
    let query = client
      .from('cp_creators')
      .select('*')
      .eq('campaign_id', id)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order(sort, { ascending: order === 'asc' })

    const { data: creators, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If client role, hide internal cost
    const result = (creators || []).map(c => {
      if (session.role === 'client') {
        return { ...c, internal_cost: null }
      }
      return c
    })

    return NextResponse.json({ creators: result })
  } catch (err) {
    console.error('List creators error:', err)
    return NextResponse.json({ error: 'Failed to list creators' }, { status: 500 })
  }
}

// POST /api/campaigns/[id]/creators — Add creator to shortlist
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Only internal roles can add creators
  if (session.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const client = getCPClient()

  const {
    channel_name, channel_url, channel_handle,
    platform, subscribers, avg_views, engagement_rate,
    internal_cost, quoted_cost, deliverable_platforms,
  } = body

  if (!channel_name?.trim() || !channel_url?.trim()) {
    return NextResponse.json({ error: 'Channel name and URL are required' }, { status: 400 })
  }

  try {
    // Create creator
    const { data: creator, error: creatorErr } = await client
      .from('cp_creators')
      .insert({
        campaign_id: id,
        channel_name: channel_name.trim(),
        channel_url: channel_url.trim(),
        channel_handle: channel_handle || '',
        platform: platform || 'youtube',
        subscribers: subscribers || 0,
        avg_views: avg_views || 0,
        engagement_rate: engagement_rate || 0,
        internal_cost: internal_cost || 0,
        quoted_cost: quoted_cost || 0,
        status: 'shortlisted',
        added_by: session.id,
        auto_metrics: {
          subscribers: subscribers || 0,
          avg_views: avg_views || 0,
          engagement_rate: engagement_rate || 0,
          fetched_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (creatorErr) {
      return NextResponse.json({ error: creatorErr.message }, { status: 500 })
    }

    // Create deliverables for each selected platform
    if (deliverable_platforms && deliverable_platforms.length > 0) {
      const deliverableRows = deliverable_platforms.map((platform: string) => ({
        creator_id: creator.id,
        campaign_id: id,
        platform,
        status: 'pending',
      }))

      await client.from('cp_deliverables').insert(deliverableRows)
    }

    // Log activity
    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_user_id: session.id,
      actor_role: session.role,
      actor_name: session.name,
      action_type: 'shortlisted',
      entity_type: 'creator',
      entity_id: creator.id,
      entity_name: channel_name.trim(),
      details: {
        platform,
        subscribers,
        avg_views,
        quoted_cost,
      },
    })

    return NextResponse.json({ creator }, { status: 201 })
  } catch (err) {
    console.error('Add creator error:', err)
    return NextResponse.json({ error: 'Failed to add creator' }, { status: 500 })
  }
}
