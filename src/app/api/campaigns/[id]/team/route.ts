import { NextRequest, NextResponse } from 'next/server'
import { getCPClient, cpSelect, cpInsert, cpUpdate, cpDelete } from '@/lib/cp-db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const client = getCPClient()

    const { data: assignments, error } = await client
      .from('cp_team_assignments')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('assigned_at', { ascending: false })

    if (error) throw error

    const memberIds = [...new Set((assignments || []).map((a: Record<string, unknown>) => a.user_id).filter(Boolean))]

    let members: Record<string, unknown>[] = []
    if (memberIds.length > 0) {
      const { data } = await client
        .from('cp_team_members')
        .select('*')
        .in('id', memberIds)
      members = data || []
    }

    const enriched = (assignments || []).map((a: Record<string, unknown>) => ({
      ...a,
      member: members.find((m: Record<string, unknown>) => m.id === a.user_id) || null,
    }))

    return NextResponse.json({ assignments: enriched })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body = await req.json()
    const { user_id, role, sections } = body

    if (!user_id || !role) {
      return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 })
    }

    const assignment = await cpInsert('cp_team_assignments', {
      campaign_id: campaignId,
      user_id,
      role,
      sections: sections || [],
      assigned_at: new Date().toISOString(),
    })

    return NextResponse.json({ assignment })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body = await req.json()
    const { assignment_id, role, sections } = body

    if (!assignment_id) {
      return NextResponse.json({ error: 'assignment_id is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (role !== undefined) updates.role = role
    if (sections !== undefined) updates.sections = sections
    updates.updated_at = new Date().toISOString()

    const assignment = await cpUpdate('cp_team_assignments', assignment_id, updates)

    return NextResponse.json({ assignment })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { searchParams } = new URL(req.url)
    const assignmentId = searchParams.get('assignment_id')

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignment_id is required' }, { status: 400 })
    }

    await cpDelete('cp_team_assignments', assignmentId)

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
