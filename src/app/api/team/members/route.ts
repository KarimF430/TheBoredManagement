import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaign_id')

    const client = getCPClient()

    let query = client
      .from('cp_team_members')
      .select('*')
      .order('name', { ascending: true })

    const { data: members, error } = await query
    if (error) throw error

    let enriched = members || []

    if (campaignId) {
      const { data: assignments } = await client
        .from('cp_team_assignments')
        .select('*')
        .eq('campaign_id', campaignId)

      enriched = enriched.map((m: Record<string, unknown>) => ({
        ...m,
        assignment: (assignments || []).find((a: Record<string, unknown>) => a.user_id === m.id) || null,
      }))
    }

    return NextResponse.json({ members: enriched })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, role } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    const client = getCPClient()

    const { data: existing } = await client
      .from('cp_team_members')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json({ member: existing, message: 'Member already exists' })
    }

    const { data: member, error } = await client
      .from('cp_team_members')
      .insert({
        name,
        email,
        role: role || 'ir_executive',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ member })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
