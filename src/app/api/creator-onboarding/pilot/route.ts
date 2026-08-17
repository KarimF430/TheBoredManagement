/**
 * Pilot Harness API
 *
 * Selects top-500 ranked creators, runs the full loop,
 * tracks per-creator progress, enforces go/no-go gate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { outreachSelect, outreachInsert, outreachUpdate } from '@/lib/outreach/db'
import { emitFunnelEvent } from '@/lib/creator-onboarding-integration'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, batchName, creatorIds } = body

    const client = getCPClient()

    if (action === 'select') {
      // ── Select top-500 ranked creators for pilot ───────────
      const { data: topCreators } = await client
        .from('outreach_creator_scores')
        .select('creator_id, fit_score, reply_likelihood_score, rank')
        .order('rank', { ascending: true })
        .limit(500)

      if (!topCreators?.length) {
        return NextResponse.json({ error: 'No ranked creators found. Run scorer first.' }, { status: 400 })
      }

      // Get full creator data
      const creatorIds = topCreators.map((c) => c.creator_id)
      const { data: creators } = await client
        .from('outreach_creators')
        .select('*')
        .in('id', creatorIds)

      // Create pilot tracker entries
      const pilotEntries = (creators || []).map((creator) => ({
        session_id: creator.id, // Will be linked when session is created
        pilot_batch: batchName || 'pilot-500',
        invited_at: new Date().toISOString(),
      }))

      // Filter out already-tracked creators
      const existingPilot = await client
        .from('onboarding_pilot')
        .select('session_id')
        .eq('pilot_batch', batchName || 'pilot-500')

      const existingIds = new Set((existingPilot.data || []).map((p) => p.session_id))
      const newEntries = pilotEntries.filter((e) => !existingIds.has(e.session_id))

      if (newEntries.length > 0) {
        await client.from('onboarding_pilot').insert(newEntries)
      }

      return NextResponse.json({
        ok: true,
        selected: newEntries.length,
        alreadyTracked: existingIds.size,
        batch: batchName || 'pilot-500',
        creators: (creators || []).slice(0, 10).map((c) => ({
          id: c.id,
          name: c.name,
          niche: c.niche,
          size_tier: c.size_tier,
        })),
      })
    }

    if (action === 'start_send') {
      // ── Mark pilot as email sent ───────────────────────────
      const { data: pilots } = await client
        .from('onboarding_pilot')
        .select('id')
        .eq('pilot_batch', batchName)
        .is('email_sent_at', null)
        .limit(500)

      if (pilots?.length) {
        await client
          .from('onboarding_pilot')
          .update({ email_sent_at: new Date().toISOString() })
          .in('id', pilots.map((p) => p.id))
      }

      return NextResponse.json({ ok: true, marked: pilots?.length || 0 })
    }

    if (action === 'status') {
      // ── Get pilot status ───────────────────────────────────
      const { data: pilots } = await client
        .from('onboarding_pilot')
        .select('*')
        .eq('pilot_batch', batchName)

      if (!pilots?.length) {
        return NextResponse.json({ error: 'No pilots found for batch' }, { status: 404 })
      }

      const stats = {
        total: pilots.length,
        invited: pilots.filter((p) => p.invited_at).length,
        emailSent: pilots.filter((p) => p.email_sent_at).length,
        completed: pilots.filter((p) => p.completed_at).length,
        replied: pilots.filter((p) => p.reply_received_at).length,
        goNogo: {
          go: pilots.filter((p) => p.go_nogo_status === 'go').length,
          noGo: pilots.filter((p) => p.go_nogo_status === 'no_go').length,
          hold: pilots.filter((p) => p.go_nogo_status === 'hold').length,
          pending: pilots.filter((p) => p.go_nogo_status === 'pending').length,
        },
      }

      return NextResponse.json({
        ok: true,
        batch: batchName,
        stats,
        completionRate: stats.completed / Math.max(1, stats.emailSent),
        replyRate: stats.replied / Math.max(1, stats.emailSent),
      })
    }

    if (action === 'gate_check') {
      // ── Evaluate go/no-go gate ─────────────────────────────
      const { data: pilots } = await client
        .from('onboarding_pilot')
        .select('*')
        .eq('pilot_batch', batchName)

      if (!pilots?.length) {
        return NextResponse.json({ error: 'No pilots found' }, { status: 404 })
      }

      const emailSent = pilots.filter((p) => p.email_sent_at).length
      const completed = pilots.filter((p) => p.completed_at).length
      const replied = pilots.filter((p) => p.reply_received_at).length

      const completionRate = emailSent > 0 ? completed / emailSent : 0
      const replyRate = emailSent > 0 ? replied / emailSent : 0

      const thresholds = {
        replyRateFloor: 0.02,
        replyRateStop: 0.01,
        completionRateFloor: 0.30,
        completionRateStop: 0.15,
      }

      let status = 'go'
      let reason = 'All metrics healthy'

      if (replyRate < thresholds.replyRateStop && emailSent >= 50) {
        status = 'no_go'
        reason = `Reply rate ${(replyRate * 100).toFixed(1)}% < ${(thresholds.replyRateStop * 100)}% STOP`
      } else if (completionRate < thresholds.completionRateStop && emailSent >= 20) {
        status = 'no_go'
        reason = `Completion rate ${(completionRate * 100).toFixed(1)}% < ${(thresholds.completionRateStop * 100)}% STOP`
      } else if (replyRate < thresholds.replyRateFloor && emailSent >= 50) {
        status = 'hold'
        reason = `Reply rate ${(replyRate * 100).toFixed(1)}% < ${(thresholds.replyRateFloor * 100)}% — investigate`
      } else if (completionRate < thresholds.completionRateFloor && emailSent >= 20) {
        status = 'hold'
        reason = `Completion rate ${(completionRate * 100).toFixed(1)}% < ${(thresholds.completionRateFloor * 100)}% — fix form`
      }

      // Update pilot statuses
      await client
        .from('onboarding_pilot')
        .update({ go_nogo_status: status })
        .eq('pilot_batch', batchName)

      return NextResponse.json({
        ok: true,
        status,
        reason,
        metrics: {
          replyRate: `${(replyRate * 100).toFixed(2)}%`,
          completionRate: `${(completionRate * 100).toFixed(2)}%`,
          emailSent,
          completed,
          replied,
        },
        thresholds,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
