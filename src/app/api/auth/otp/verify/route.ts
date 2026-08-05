import { NextRequest, NextResponse } from 'next/server'
import { queryAll, queryOne } from '@/lib/supabase'
import { verifyOTP, getAllowedEmailRole } from '@/lib/otp'
import { signToken } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const trimmed = email.trim().toLowerCase()
    const trimmedCode = code.trim()

    // Verify OTP
    const { valid, error: verifyError } = await verifyOTP(trimmed, trimmedCode)
    if (!valid) {
      return NextResponse.json({ error: verifyError }, { status: 401 })
    }

    // Get role from allowed_emails
    const role = await getAllowedEmailRole(trimmed)

    // Find or create user
    let user = await queryOne<any>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [trimmed]
    )

    if (!user) {
      // Auto-create user on first OTP login
      const inserted = await queryAll<any>(
        `INSERT INTO users (email, role) VALUES ($1, $2) RETURNING *`,
        [trimmed, role || 'viewer']
      )
      user = inserted?.[0] ?? null
      if (!user) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
    }

    // Sign JWT
    const token = await signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      campaign_id: user.campaign_id,
      brand_name: user.brand_name,
    })

    const res = NextResponse.json({ ok: true, role: user.role })
    res.cookies.set('sov_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return res
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
