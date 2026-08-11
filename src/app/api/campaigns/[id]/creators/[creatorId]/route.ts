import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string; creatorId: string }>
}

// PATCH /api/campaigns/[id]/creators/[creatorId] — Update creator status/cost
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, creatorId } = await params
  const body = await req.json()
  const client = getCPClient()

  try {
    // Get current creator
    const { data: current } = await client
      .from('cp_creators')
      .select('*')
      .eq('id', creatorId)
      .eq('campaign_id', id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await client
      .from('cp_creators')
      .update(updates)
      .eq('id', creatorId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log status changes
    if (body.status && body.status !== current.status) {
      await client.from('cp_activity_feed').insert({
        campaign_id: id,
        actor_user_id: session.id,
        actor_role: session.role,
        actor_name: session.name,
        action_type: 'status_changed',
        entity_type: 'creator',
        entity_id: creatorId,
        entity_name: current.channel_name,
        details: { field: 'status', from: current.status, to: body.status },
      })

      // Create status history
      await client.from('cp_status_history').insert({
        entity_type: 'creator',
        entity_id: creatorId,
        campaign_id: id,
        old_status: current.status,
        new_status: body.status,
        changed_by: session.id,
        remarks: body.remarks || '',
      })
    }

    return NextResponse.json({ creator: updated })
  } catch (err) {
    console.error('Update creator error:', err)
    return NextResponse.json({ error: 'Failed to update creator' }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id]/creators/[creatorId] — Remove creator
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.role !== 'brand_solutions' && session.role !== 'campaign_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, creatorId } = await params
  const client = getCPClient()

  try {
    const { data: creator } = await client
      .from('cp_creators')
      .select('channel_name')
      .eq('id', creatorId)
      .eq('campaign_id', id)
      .single()

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    // Delete deliverables first
    await client.from('cp_deliverables').delete().eq('creator_id', creatorId)

    // Delete creator
    const { error } = await client
      .from('cp_creators')
      .delete()
      .eq('id', creatorId)
      .eq('campaign_id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_user_id: session.id,
      actor_role: session.role,
      actor_name: session.name,
      action_type: 'rejected',
      entity_type: 'creator',
      entity_id: creatorId,
      entity_name: creator.channel_name,
      details: { action: 'removed' },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Delete creator error:', err)
    return NextResponse.json({ error: 'Failed to delete creator' }, { status: 500 })
  }
}
