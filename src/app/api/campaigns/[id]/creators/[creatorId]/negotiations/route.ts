import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string; creatorId: string }>
}

// GET — List negotiation rounds for a creator
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id, creatorId } = await params
  const client = getCPClient()

  try {
    const { data: rounds, error } = await client
      .from('cp_negotiation_log')
      .select('*')
      .eq('campaign_id', id)
      .eq('creator_id', creatorId)
      .order('round_number', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rounds: rounds || [] })
  } catch (err) {
    console.error('List negotiations error:', err)
    return NextResponse.json({ error: 'Failed to list negotiations' }, { status: 500 })
  }
}

// POST — Create new negotiation round
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id, creatorId } = await params
  const client = getCPClient()
  const body = await req.json()

  try {
    const { data: existing } = await client
      .from('cp_negotiation_log')
      .select('round_number')
      .eq('campaign_id', id)
      .eq('creator_id', creatorId)
      .order('round_number', { ascending: false })
      .limit(1)

    const nextRound = (existing?.[0]?.round_number || 0) + 1

    const { data: round, error } = await client
      .from('cp_negotiation_log')
      .insert({
        campaign_id: id,
        creator_id: creatorId,
        round_number: nextRound,
        offered_amount: body.offered_amount,
        counter_amount: body.counter_amount || null,
        final_amount: body.final_amount || null,
        status: body.status || 'pending',
        internal_remark: body.internal_remark || '',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_id: session.id || null,
      actor_name: session.name || 'Unknown',
      action: 'negotiation_round_added',
      entity_type: 'negotiation',
      entity_id: round.id,
      metadata: { round_number: nextRound, offered_amount: body.offered_amount, creator_id: creatorId },
    })

    return NextResponse.json({ round }, { status: 201 })
  } catch (err) {
    console.error('Create negotiation error:', err)
    return NextResponse.json({ error: 'Failed to create negotiation' }, { status: 500 })
  }
}

// PATCH — Update a negotiation round (accept/reject/counter)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id, creatorId } = await params
  const client = getCPClient()
  const body = await req.json()

  try {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.status) updates.status = body.status
    if (body.counter_amount !== undefined) updates.counter_amount = body.counter_amount
    if (body.final_amount !== undefined) updates.final_amount = body.final_amount
    if (body.internal_remark) updates.internal_remark = body.internal_remark

    const { data: round, error } = await client
      .from('cp_negotiation_log')
      .update(updates)
      .eq('id', body.round_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If accepted, update creator's quoted_cost
    if (body.status === 'accepted' && (body.final_amount || body.counter_amount)) {
      await client
        .from('cp_creators')
        .update({ quoted_cost: body.final_amount || body.counter_amount })
        .eq('id', creatorId)
    }

    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_id: session.id || null,
      actor_name: session.name || 'Unknown',
      action: `negotiation_${body.status}`,
      entity_type: 'negotiation',
      entity_id: body.round_id,
      metadata: { round_id: body.round_id, status: body.status, creator_id: creatorId },
    })

    return NextResponse.json({ round })
  } catch (err) {
    console.error('Update negotiation error:', err)
    return NextResponse.json({ error: 'Failed to update negotiation' }, { status: 500 })
  }
}
