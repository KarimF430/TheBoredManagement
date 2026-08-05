import { NextRequest, NextResponse } from 'next/server'
import { queryAll, queryOne } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const users = await queryAll(`
      SELECT u.id, u.email, u.role, u.brand_name, c.name as campaign_name
      FROM users u
      LEFT JOIN campaigns c ON c.id = u.campaign_id
      ORDER BY u.created_at DESC
    `)
    return NextResponse.json({ users })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { email, role, campaign_id, brand_name } = await req.json()
    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    await queryOne(`
      INSERT INTO users (email, role, campaign_id, brand_name)
      VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING
    `, [email, role, campaign_id || null, brand_name || null])

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await queryOne('DELETE FROM users WHERE id = $1', [id])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
