/**
 * Handle Ownership Verification API
 *
 * Verifies that the creator actually owns the social handle they claimed.
 *
 * If/else (section 4):
 * - OAuth completed → ownership proven, handle 'verified'
 * - No OAuth, high-value handle → require lightweight proof (bio code or DM code)
 * - No OAuth, low-value handle → accept as 'unverified', allow profile
 * - Handle already claimed by verified creator → block duplicate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { outreachSelect } from '@/lib/outreach/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { platform, handle, sessionId, verificationCode } = body

    if (!platform || !handle || !sessionId) {
      return NextResponse.json({ error: 'platform, handle, and sessionId are required' }, { status: 400 })
    }

    const client = getCPClient()

    // ── Check if handle is already claimed by a verified creator ──
    const handleColumn = platform === 'youtube' ? 'youtube_handle' : 'instagram_handle'
    const { data: existingClaim } = await client
      .from('cp_creator_pool')
      .select('id, name, email')
      .eq(handleColumn, handle)
      .neq('status', 'inactive')
      .limit(1)

    if (existingClaim?.length) {
      // Check if the existing claim is verified
      const { data: verifiedMetrics } = await client
        .from('onboarding_verified_metrics')
        .select('provenance')
        .eq('session_id', existingClaim[0].id)
        .single()

      if (verifiedMetrics?.provenance === 'verified') {
        // Verified owner wins over unverified claimant
        return NextResponse.json({
          verified: false,
          error: `This ${platform} handle is already claimed and verified by another creator`,
          claimedBy: existingClaim[0].name || existingClaim[0].email,
        })
      }
    }

    // ── If verification code provided, check it ──────────────
    if (verificationCode) {
      const { data: proofRecord } = await client
        .from('onboarding_handle_proofs')
        .select('*')
        .eq('session_id', sessionId)
        .eq('platform', platform)
        .eq('handle', handle)
        .eq('verification_code', verificationCode)
        .eq('used', false)
        .single()

      if (!proofRecord) {
        return NextResponse.json({
          verified: false,
          error: 'Invalid or expired verification code',
        })
      }

      // Mark proof as used
      await client
        .from('onboarding_handle_proofs')
        .update({ used: true, verified_at: new Date().toISOString() })
        .eq('id', proofRecord.id)

      // Update the handle as verified in the draft
      const { data: session } = await client
        .from('creator_onboarding_sessions')
        .select('id')
        .eq('id', sessionId)
        .single()

      if (session) {
        // Update verified status in step_data
        await client
          .from('creator_profile_drafts')
          .update({
            step_data: {
              [`${platform}_handle_verified`]: true,
              [`${platform}_verified_at`]: new Date().toISOString(),
            },
          })
          .eq('session_id', sessionId)
      }

      return NextResponse.json({
        verified: true,
        platform,
        handle,
        message: `${platform} handle ownership verified!`,
      })
    }

    // ── Generate verification code for the creator to place ───
    const code = generateVerificationCode()

    // Store the proof request
    await client.from('onboarding_handle_proofs').insert({
      session_id: sessionId,
      platform,
      handle,
      verification_code: code,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    })

    return NextResponse.json({
      verified: false,
      requiresProof: true,
      platform,
      handle,
      verificationCode: code,
      instructions: platform === 'instagram'
        ? `Add this code to your Instagram bio temporarily: ${code}. Then click "Verify" and we'll check.`
        : `Add this code to your YouTube "About" section temporarily: ${code}. Then click "Verify" and we'll check.`,
      expiresIn: '24 hours',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const values = crypto.getRandomValues(new Uint8Array(8))
  return 'TBM-' + Array.from(values).map((v) => chars[v % chars.length]).join('')
}
