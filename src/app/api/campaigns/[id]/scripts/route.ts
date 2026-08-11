import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/campaigns/[id]/scripts — List script versions for a deliverable
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const client = getCPClient()
  const url = new URL(req.url)
  const deliverableId = url.searchParams.get('deliverable_id')

  try {
    let query = client
      .from('cp_script_versions')
      .select('*')
      .eq('campaign_id', id)

    if (deliverableId) {
      query = query.eq('deliverable_id', deliverableId)
    }

    query = query.order('version_number', { ascending: false })

    const { data: scripts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ scripts: scripts || [] })
  } catch (err) {
    console.error('List scripts error:', err)
    return NextResponse.json({ error: 'Failed to list scripts' }, { status: 500 })
  }
}

// POST /api/campaigns/[id]/scripts — Create new script version
export async function POST(req: NextRequest, { params }: RouteParams) {
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

  const { deliverable_id, content_text, content_url } = body

  if (!deliverable_id) {
    return NextResponse.json({ error: 'deliverable_id is required' }, { status: 400 })
  }

  try {
    // Get current version number
    const { data: existing } = await client
      .from('cp_script_versions')
      .select('version_number')
      .eq('deliverable_id', deliverable_id)
      .order('version_number', { ascending: false })
      .limit(1)

    const nextVersion = (existing?.[0]?.version_number || 0) + 1

    const { data: script, error } = await client
      .from('cp_script_versions')
      .insert({
        deliverable_id,
        campaign_id: id,
        version_number: nextVersion,
        content_text: content_text || '',
        content_url: content_url || '',
        status: 'draft',
        created_by: session.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update deliverable's current version
    await client
      .from('cp_deliverables')
      .update({ script_current_version: nextVersion, updated_at: new Date().toISOString() })
      .eq('id', deliverable_id)

    // Log activity
    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_user_id: session.id,
      actor_role: session.role,
      actor_name: session.name,
      action_type: 'created',
      entity_type: 'script',
      entity_id: script.id,
      entity_name: `Script v${nextVersion}`,
      details: { deliverable_id, version: nextVersion },
    })

    return NextResponse.json({ script }, { status: 201 })
  } catch (err) {
    console.error('Create script error:', err)
    return NextResponse.json({ error: 'Failed to create script' }, { status: 500 })
  }
}

// PATCH /api/campaigns/[id]/scripts — Approve/reject script
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
  const { script_id, status, feedback_remark } = body

  if (!script_id || !status) {
    return NextResponse.json({ error: 'script_id and status are required' }, { status: 400 })
  }

  try {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'approved') {
      updates.approved_at = new Date().toISOString()
      updates.approved_by = session.id
      updates.is_approved_snapshot = true
    }

    if (feedback_remark) {
      updates.feedback_remark = feedback_remark
    }

    const { data: script, error } = await client
      .from('cp_script_versions')
      .update(updates)
      .eq('id', script_id)
      .eq('campaign_id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If approved, update deliverable
    if (status === 'approved') {
      await client
        .from('cp_deliverables')
        .update({
          script_approved_at: new Date().toISOString(),
          script_approved_by: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', script.deliverable_id)
    }

    // Log activity
    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_user_id: session.id,
      actor_role: session.role,
      actor_name: session.name,
      action_type: status === 'approved' ? 'approved' : 'remarked',
      entity_type: 'script',
      entity_id: script_id,
      entity_name: `Script v${script.version_number}`,
      details: { status, feedback_remark },
    })

    return NextResponse.json({ script })
  } catch (err) {
    console.error('Update script error:', err)
    return NextResponse.json({ error: 'Failed to update script' }, { status: 500 })
  }
}
