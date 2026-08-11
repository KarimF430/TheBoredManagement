import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

// GET /api/campaigns — List all campaigns the user has access to
export async function GET(req: NextRequest) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const client = getCPClient()

  try {
    let query = client
      .from('cp_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    // Client: only their assigned campaign
    if (session.role === 'client') {
      query = query.in('id', session.campaign_ids)
    }
    // ir_manager, ir_executive: only assigned campaigns
    else if (session.role === 'ir_manager' || session.role === 'ir_executive') {
      if (session.campaign_ids.length > 0) {
        query = query.in('id', session.campaign_ids)
      } else {
        // No campaigns assigned
        return NextResponse.json({ campaigns: [] })
      }
    }
    // brand_solutions, campaign_manager: all campaigns

    const { data: campaigns, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (err) {
    console.error('List campaigns error:', err)
    return NextResponse.json({ error: 'Failed to list campaigns' }, { status: 500 })
  }
}

// POST /api/campaigns — Create a new campaign
export async function POST(req: NextRequest) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Only brand_solutions and campaign_manager can create
  if (session.role !== 'brand_solutions' && session.role !== 'campaign_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    name, brand, campaign_type, objective,
    platform_mix, deliverable_types, budget,
    start_date, go_live_date,
  } = body

  if (!name?.trim() || !brand?.trim()) {
    return NextResponse.json({ error: 'Campaign name and brand are required' }, { status: 400 })
  }

  const client = getCPClient()

  try {
    const { data: campaign, error } = await client
      .from('cp_campaigns')
      .insert({
        name: name.trim(),
        brand: brand.trim(),
        campaign_type: campaign_type || 'brand_awareness',
        objective: objective || '',
        platform_mix: platform_mix || [],
        deliverable_types: deliverable_types || [],
        budget: budget || 0,
        start_date: start_date || new Date().toISOString().split('T')[0],
        go_live_date: go_live_date || new Date().toISOString().split('T')[0],
        status: 'draft',
        created_by: session.id,
        brief_last_edited_by: session.id,
        brief_last_edited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await client.from('cp_activity_feed').insert({
      campaign_id: campaign.id,
      actor_user_id: session.id,
      actor_role: session.role,
      actor_name: session.name,
      action_type: 'created',
      entity_type: 'campaign',
      entity_id: campaign.id,
      entity_name: campaign.name,
      details: { brand: campaign.brand },
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (err) {
    console.error('Create campaign error:', err)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
