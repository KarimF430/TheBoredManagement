import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession, hashPassword } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'
import crypto from 'crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/campaigns/[id]/clients — List client users
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const client = getCPClient()

  try {
    const { data: clients, error } = await client
      .from('cp_client_users')
      .select('id, email, name, brand_name, is_active, invite_accepted_at, last_login_at, created_at')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ clients: clients || [] })
  } catch (err) {
    console.error('List clients error:', err)
    return NextResponse.json({ error: 'Failed to list clients' }, { status: 500 })
  }
}

// POST /api/campaigns/[id]/clients — Invite client user
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.role !== 'brand_solutions' && session.role !== 'campaign_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const client = getCPClient()

  const { email, name, brand_name, password } = body

  if (!email?.trim() || !name?.trim() || !brand_name?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  try {
    // Check if already exists
    const { data: existing } = await client
      .from('cp_client_users')
      .select('id')
      .eq('campaign_id', id)
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'User already invited' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password.trim())
    const inviteToken = crypto.randomBytes(32).toString('hex')

    const { data: clientUser, error } = await client
      .from('cp_client_users')
      .insert({
        campaign_id: id,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password_hash: passwordHash,
        brand_name: brand_name.trim(),
        invite_token: inviteToken,
        invite_sent_at: new Date().toISOString(),
        invite_accepted_at: new Date().toISOString(), // Auto-accept for now
      })
      .select('id, email, name, brand_name, is_active, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_user_id: session.id,
      actor_role: session.role,
      actor_name: session.name,
      action_type: 'created',
      entity_type: 'client_user',
      entity_id: clientUser.id,
      entity_name: name.trim(),
      details: { email: email.toLowerCase().trim(), brand_name },
    })

    return NextResponse.json({
      client: clientUser,
      invite_url: `/client/accept?token=${inviteToken}`,
    }, { status: 201 })
  } catch (err) {
    console.error('Invite client error:', err)
    return NextResponse.json({ error: 'Failed to invite client' }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id]/clients — Remove client user
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.role !== 'brand_solutions' && session.role !== 'campaign_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const client = getCPClient()
  const { client_id } = body

  if (!client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }

  try {
    const { error } = await client
      .from('cp_client_users')
      .delete()
      .eq('id', client_id)
      .eq('campaign_id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Remove client error:', err)
    return NextResponse.json({ error: 'Failed to remove client' }, { status: 500 })
  }
}
