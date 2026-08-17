/**
 * Funnel Analytics API
 *
 * Computes the three headline numbers:
 * 1. Reply rate = real replies (non-auto) / creators emailed
 * 2. Completion rate = onboarding profiles finished / creators who opened link
 * 3. Data trust = % of finished profiles with verified metrics
 *
 * Plus per-step drop-off, OAuth vs manual split, niche conversion.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { outreachSelect } from '@/lib/outreach/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const batch = searchParams.get('batch') || 'default'
    const days = parseInt(searchParams.get('days') || '30')

    const client = getCPClient()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // ── Headline Number 1: Reply Rate ────────────────────────
    // Real replies (non-auto) / creators emailed
    const { data: outreachLog } = await client
      .from('outreach_log')
      .select('creator_id, replied_at, reply_is_auto, bounced')
      .gte('sent_at', since)

    const creatorsEmailed = new Set(
      (outreachLog || [])
        .filter((r) => !r.bounced)
        .map((r) => r.creator_id)
    ).size

    const realReplies = (outreachLog || []).filter(
      (r) => r.replied_at && !r.reply_is_auto && !r.bounced
    ).length

    const replyRate = creatorsEmailed > 0 ? realReplies / creatorsEmailed : 0

    // ── Headline Number 2: Completion Rate ───────────────────
    // Profiles finished / creators who opened link (started = have started_at)
    const { data: sessions } = await client
      .from('creator_onboarding_sessions')
      .select('id, status, started_at, completed_at, current_step, completed_steps')
      .gte('created_at', since)

    const openedSessions = (sessions || []).filter((s) => s.started_at)
    const completedSessions = (sessions || []).filter((s) => s.status === 'completed')
    const completionRate = openedSessions.length > 0
      ? completedSessions.length / openedSessions.length
      : 0

    // ── Headline Number 3: Data Trust ────────────────────────
    // % of finished profiles with verified metrics
    const completedIds = completedSessions.map((s) => s.id)

    let verifiedCount = 0
    if (completedIds.length > 0) {
      const { data: verifiedMetrics } = await client
        .from('onboarding_verified_metrics')
        .select('session_id, provenance')
        .in('session_id', completedIds)

      verifiedCount = (verifiedMetrics || []).filter(
        (m) => m.provenance === 'verified'
      ).length
    }

    const dataTrustRate = completedSessions.length > 0
      ? verifiedCount / completedSessions.length
      : 0

    // ── Per-Step Drop-off ────────────────────────────────────
    const stepDropoff = Array.from({ length: 6 }, (_, i) => {
      const step = i + 1
      const completedStep = (sessions || []).filter(
        (s) => (s.completed_steps || []).includes(step)
      ).length
      return { step, completed: completedStep }
    })

    // ── OAuth vs Manual Split ────────────────────────────────
    const withYoutube = completedSessions.filter((s) => {
      const steps = s.completed_steps || []
      return steps.includes(3) // Step 3 = social profiles
    }).length

    // ── Niche Conversion ─────────────────────────────────────
    const { data: drafts } = await client
      .from('creator_profile_drafts')
      .select('session_id, primary_niche')
      .in('session_id', completedIds)

    const nicheConversion: Record<string, { completed: number; total: number }> = {}
    for (const draft of drafts || []) {
      const niche = draft.primary_niche || 'Unknown'
      if (!nicheConversion[niche]) {
        nicheConversion[niche] = { completed: 0, total: 0 }
      }
      nicheConversion[niche].completed++
    }

    // Count all sessions per niche
    const allDrafts = await client
      .from('creator_profile_drafts')
      .select('session_id, primary_niche')

    for (const draft of allDrafts.data || []) {
      const niche = draft.primary_niche || 'Unknown'
      if (!nicheConversion[niche]) {
        nicheConversion[niche] = { completed: 0, total: 0 }
      }
      nicheConversion[niche].total++
    }

    // ── No-Go Gate Check ─────────────────────────────────────
    const NOGO = {
      replyRateFloor: 0.01,      // 1%
      replyRateStop: 0.005,      // 0.5% → stop
      completionRateFloor: 0.15, // 15%
      completionRateStop: 0.10,  // 10% → stop
    }

    let goNogo = 'go'
    let goNogoReason = ''

    if (replyRate < NOGO.replyRateStop && creatorsEmailed >= 50) {
      goNogo = 'no_go'
      goNogoReason = `Reply rate ${(replyRate * 100).toFixed(2)}% is below stop threshold ${NOGO.replyRateStop * 100}%`
    } else if (completionRate < NOGO.completionRateStop && openedSessions.length >= 20) {
      goNogo = 'no_go'
      goNogoReason = `Completion rate ${(completionRate * 100).toFixed(2)}% is below stop threshold ${NOGO.completionRateStop * 100}%`
    } else if (replyRate < NOGO.replyRateFloor && creatorsEmailed >= 50) {
      goNogo = 'hold'
      goNogoReason = `Reply rate ${(replyRate * 100).toFixed(2)}% is below floor — investigate before scaling`
    } else if (completionRate < NOGO.completionRateFloor && openedSessions.length >= 20) {
      goNogo = 'hold'
      goNogoReason = `Completion rate ${(completionRate * 100).toFixed(2)}% is below floor — investigate form`
    }

    return NextResponse.json({
      headline: {
        replyRate: Math.round(replyRate * 10000) / 10000,
        replyRateFormatted: `${(replyRate * 100).toFixed(2)}%`,
        creatorsEmailed,
        realReplies,

        completionRate: Math.round(completionRate * 10000) / 10000,
        completionRateFormatted: `${(completionRate * 100).toFixed(2)}%`,
        openedSessions: openedSessions.length,
        completedSessions: completedSessions.length,

        dataTrustRate: Math.round(dataTrustRate * 10000) / 10000,
        dataTrustRateFormatted: `${(dataTrustRate * 100).toFixed(2)}%`,
        verifiedProfiles: verifiedCount,
      },
      stepDropoff,
      nicheConversion,
      goNogo: {
        status: goNogo,
        reason: goNogoReason || 'All metrics within acceptable range',
        thresholds: NOGO,
      },
      period: { days, since },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
