import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/campaigns/[id]/deliverables — List deliverables with creator info
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const client = getCPClient()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const platform = url.searchParams.get('platform')

  try {
    let query = client
      .from('cp_deliverables')
      .select(`
        *,
        creator:cp_creators(id, channel_name, channel_url, platform, profile_image_url)
      `)
      .eq('campaign_id', id)

    if (status) {
      query = query.eq('status', status)
    }
    if (platform) {
      query = query.eq('platform', platform)
    }

    query = query.order('created_at', { ascending: false })

    const { data: deliverables, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ deliverables: deliverables || [] })
  } catch (err) {
    console.error('List deliverables error:', err)
    return NextResponse.json({ error: 'Failed to list deliverables' }, { status: 500 })
  }
}

// PATCH /api/campaigns/[id]/deliverables — Update deliverable status/metrics
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const client = getCPClient()
  const { deliverable_id, ...updates } = body

  if (!deliverable_id) {
    return NextResponse.json({ error: 'deliverable_id is required' }, { status: 400 })
  }

  try {
    // Get current deliverable
    const { data: current } = await client
      .from('cp_deliverables')
      .select('*')
      .eq('id', deliverable_id)
      .eq('campaign_id', id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: updated, error } = await client
      .from('cp_deliverables')
      .update(updates)
      .eq('id', deliverable_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log status changes
    if (updates.status && updates.status !== current.status) {
      await client.from('cp_activity_feed').insert({
        campaign_id: id,
        actor_user_id: session.id,
        actor_role: session.role,
        actor_name: session.name,
        action_type: 'status_changed',
        entity_type: 'deliverable',
        entity_id: deliverable_id,
        entity_name: `${current.platform} deliverable`,
        details: { field: 'status', from: current.status, to: updates.status },
      })
    }

    return NextResponse.json({ deliverable: updated })
  } catch (err) {
    console.error('Update deliverable error:', err)
    return NextResponse.json({ error: 'Failed to update deliverable' }, { status: 500 })
  }
}
