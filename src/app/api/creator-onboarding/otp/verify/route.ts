/**
 * Creator Onboarding — Verify OTP
 *
 * Anti-abuse guards:
 * - Max 5 verification attempts per OTP
 * - Constant-time comparison (XOR-based)
 * - Emit funnel event on success
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOnboardingSession, updateOnboardingSession } from '@/lib/creator-onboarding'
import { emitFunnelEvent } from '@/lib/creator-onboarding-integration'

const MAX_VERIFY_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, email, code } = body

    if (!token || !email || !code) {
      return NextResponse.json({ error: 'Token, email, and code are required' }, { status: 400 })
    }

    // ── Input validation ─────────────────────────────────────
    if (typeof code !== 'string' || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 })
    }

    // ── Get session ──────────────────────────────────────────
    const session = await getOnboardingSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify email matches
    if (session.creator_email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 403 })
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link has expired. Request a new link.' }, { status: 410 })
    }

    // Check OTP exists
    if (!session.otp_code || !session.otp_expires_at) {
      return NextResponse.json({ error: 'No OTP found. Please request a new code.' }, { status: 400 })
    }

    // Check OTP expiry
    if (new Date(session.otp_expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP expired. Please request a new code.' }, { status: 400 })
    }

    // ── Rate limit: max attempts check ───────────────────────
    const client = (await import('@/lib/cp-db')).getCPClient()
    const { data: otpAttempts } = await client
      .from('onboarding_events')
      .select('id')
      .eq('session_id', session.id)
      .eq('event', 'otp_verify_failed')

    if ((otpAttempts?.length || 0) >= MAX_VERIFY_ATTEMPTS) {
      // Mark OTP as used to prevent further attempts
      await updateOnboardingSession(session.id, {
        otp_code: null,
        otp_expires_at: null,
      })
      return NextResponse.json({
        error: 'Too many failed attempts. Please request a new code.',
      }, { status: 429 })
    }

    // ── Constant-time comparison (XOR-based) ─────────────────
    if (session.otp_code.length !== code.length) {
      await emitFunnelEvent(session.id, 'otp_requested', { error: 'invalid_code' })
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    let diff = 0
    for (let i = 0; i < session.otp_code.length; i++) {
      diff |= session.otp_code.charCodeAt(i) ^ code.charCodeAt(i)
    }
    if (diff !== 0) {
      // Log failed attempt
      await emitFunnelEvent(session.id, 'otp_requested', { error: 'invalid_code', attempt: (otpAttempts?.length || 0) + 1 })
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // ── OTP verified — update session ────────────────────────
    const updated = await updateOnboardingSession(session.id, {
      otp_verified: true,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      otp_code: null,
      otp_expires_at: null,
    })

    // ── Emit funnel event ────────────────────────────────────
    await emitFunnelEvent(session.id, 'otp_verified')

    return NextResponse.json({ ok: true, session: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
