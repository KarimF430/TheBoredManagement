/**
 * Creator Onboarding — Send OTP
 *
 * Anti-abuse guards (section 5):
 * - Rate limit: max 3 OTP requests per email per 10 minutes
 * - Check for duplicate sessions from same IP
 * - Emit funnel event
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { getOnboardingSession, updateOnboardingSession } from '@/lib/creator-onboarding'
import { generateOTP } from '@/lib/otp'
import { emitFunnelEvent, checkOtpRateLimit } from '@/lib/creator-onboarding-integration'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, email } = body

    if (!token || !email) {
      return NextResponse.json({ error: 'Token and email are required' }, { status: 400 })
    }

    // ── Rate limit check (section 5) ─────────────────────────
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
    const rateLimitError = await checkOtpRateLimit(email, ip)
    if (rateLimitError) {
      return NextResponse.json({ error: rateLimitError }, { status: 429 })
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

    // ── Generate OTP ─────────────────────────────────────────
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // Save OTP
    await updateOnboardingSession(session.id, {
      otp_code: otp,
      otp_expires_at: expiresAt,
    })

    // ── Emit funnel event ────────────────────────────────────
    await emitFunnelEvent(session.id, 'otp_requested')

    // ── Send OTP email via Resend ────────────────────────────
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'TheBoredMonkey <auth@theboredmonkey.com>',
      to: email,
      subject: 'Your Creator Profile Login Code',
      html: otpEmailTemplate(otp),
    })

    return NextResponse.json({ ok: true, expiresIn: 300 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function otpEmailTemplate(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F4F7FC;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:36px 40px 20px;">
              <div style="font-size:13px;font-weight:800;letter-spacing:1.2px;color:#F58220;text-transform:uppercase;margin-bottom:12px;">
                TheBoredMonkey
              </div>
              <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;letter-spacing:-0.5px;">
                Your login code
              </h1>
              <p style="font-size:14px;color:#64748B;margin:0 0 28px;line-height:1.6;">
                Enter this 6-digit code to complete your creator profile. It expires in 5 minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 32px;">
              <div style="
                display:inline-block;
                font-size:32px;
                font-weight:800;
                letter-spacing:8px;
                color:#0F172A;
                background:#F4F7FC;
                border:2px dashed rgba(37,99,235,0.2);
                border-radius:12px;
                padding:16px 28px;
              ">
                ${code}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 36px;">
              <p style="font-size:12px;color:#94A3B8;margin:0;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px;background:#F8FAFC;border-top:1px solid rgba(37,99,235,0.06);">
              <p style="font-size:11px;color:#94A3B8;margin:0;text-align:center;">
                Powered by <strong style="color:#F58220;">TheBoredMonkey</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
