import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string; creatorId: string }>
}

// PATCH — Update onboarding status for a creator
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id, creatorId } = await params
  const client = getCPClient()
  const body = await req.json()

  try {
    const updates: Record<string, unknown> = {}

    if (body.onboarded_at) updates.onboarded_at = body.onboarded_at
    if (body.go_live_deadline) updates.go_live_deadline = body.go_live_deadline
    if (body.go_live_deadline_extended !== undefined) updates.go_live_deadline_extended = body.go_live_deadline_extended
    if (body.extension_reason) updates.extension_reason = body.extension_reason
    if (body.extension_approved_by) updates.extension_approved_by = body.extension_approved_by
    if (body.client_action) updates.client_action = body.client_action
    if (body.client_remark) updates.client_remark = body.client_remark
    if (body.client_action_at) updates.client_action_at = body.client_action_at

    const { data: creator, error } = await client
      .from('cp_creators')
      .update(updates)
      .eq('id', creatorId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log activity
    const action = body.onboarded_at ? 'creator_onboarded' : body.client_action ? `creator_${body.client_action}` : 'creator_onboarding_updated'
    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_id: session.id || null,
      actor_name: session.name || 'Unknown',
      action,
      entity_type: 'creator',
      entity_id: creatorId,
      metadata: { ...body, channel_name: creator.channel_name },
    })

    return NextResponse.json({ creator })
  } catch (err) {
    console.error('Update onboarding error:', err)
    return NextResponse.json({ error: 'Failed to update onboarding' }, { status: 500 })
  }
}
