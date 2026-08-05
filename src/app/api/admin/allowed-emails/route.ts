import { NextRequest, NextResponse } from 'next/server'
import { queryAll, queryOne } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

// GET — list allowed emails
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rows = await queryAll(`
      SELECT ae.email, ae.role, ae.campaign_id, ae.invited_by, ae.created_at,
             c.name as campaign_name
      FROM allowed_emails ae
      LEFT JOIN campaigns c ON c.id = ae.campaign_id
      ORDER BY ae.created_at DESC
    `)
    return NextResponse.json({ emails: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — add email to allowlist
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { email, role, campaign_id } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const trimmed = email.trim().toLowerCase()
    const validRoles = ['admin', 'editor', 'viewer']
    const userRole = validRoles.includes(role) ? role : 'viewer'

    await queryOne(
      `INSERT INTO allowed_emails (email, role, campaign_id, invited_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET role = $2, campaign_id = $3`,
      [trimmed, userRole, campaign_id || null, session.id]
    )

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — remove email from allowlist
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const email = req.nextUrl.searchParams.get('email')
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    await queryOne(
      'DELETE FROM allowed_emails WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    )

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
