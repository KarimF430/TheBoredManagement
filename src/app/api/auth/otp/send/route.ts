import { NextRequest, NextResponse } from 'next/server'
import { isEmailAllowed, createOTP } from '@/lib/otp'
import { sendOTPEmail } from '@/lib/email'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const trimmed = email.trim().toLowerCase()

    // Check if email is pre-approved
    const allowed = await isEmailAllowed(trimmed)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied. Contact your administrator to get access.' },
        { status: 403 }
      )
    }

    // Generate OTP
    const { code, error: otpError } = await createOTP(trimmed)
    if (otpError) {
      return NextResponse.json({ error: otpError }, { status: 429 })
    }

    // Send email
    const { ok, error: emailError } = await sendOTPEmail(trimmed, code)
    if (!ok) {
      return NextResponse.json(
        { error: emailError || 'Failed to send OTP email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: 'OTP sent to your email' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
