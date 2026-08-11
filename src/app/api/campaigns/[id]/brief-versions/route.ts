import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/campaigns/[id]/brief-versions — List brief versions
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const client = getCPClient()

  try {
    const { data: versions, error } = await client
      .from('cp_brief_versions')
      .select('*')
      .eq('campaign_id', id)
      .order('version_number', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ versions: versions || [] })
  } catch (err) {
    console.error('List brief versions error:', err)
    return NextResponse.json({ error: 'Failed to list versions' }, { status: 500 })
  }
}

// POST /api/campaigns/[id]/brief-versions — Create new brief version
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const client = getCPClient()
  const body = await req.json()

  try {
    // Get current max version
    const { data: existing } = await client
      .from('cp_brief_versions')
      .select('version_number')
      .eq('campaign_id', id)
      .order('version_number', { ascending: false })
      .limit(1)

    const nextVersion = (existing?.[0]?.version_number || 0) + 1

    const { data: version, error } = await client
      .from('cp_brief_versions')
      .insert({
        campaign_id: id,
        version_number: nextVersion,
        objective: body.objective || '',
        mandatories: body.mandatories || '',
        platform_mix: body.platform_mix || [],
        deliverable_types: body.deliverable_types || [],
        budget: body.budget || 0,
        go_live_date: body.go_live_date || null,
        notes: body.notes || '',
        changed_by: session.id || null,
        changed_by_name: session.name || 'Unknown',
        change_reason: body.change_reason || '',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log activity
    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_id: session.id || null,
      actor_name: session.name || 'Unknown',
      action: 'brief_version_created',
      entity_type: 'brief_version',
      entity_id: version.id,
      metadata: { version_number: nextVersion, change_reason: body.change_reason || '' },
    })

    return NextResponse.json({ version }, { status: 201 })
  } catch (err) {
    console.error('Create brief version error:', err)
    return NextResponse.json({ error: 'Failed to create version' }, { status: 500 })
  }
}
