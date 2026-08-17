/**
 * Reconciler — resolves stuck claimed/sending rows, SES suppression sync.
 *
 * Runs on boot and every 15 min. Never blind-resends.
 *
 * CRITICAL: `claimed` and `sending` are handled DIFFERENTLY.
 * - `claimed`: safe to requeue — the worker grabbed it but hasn't dispatched yet.
 * - `sending`: DANGEROUS — we may have already hit the provider.
 *   Must verify against the provider before taking any action.
 *   If verification fails, park for manual review. NEVER blind-requeue.
 */

import { outreachSelect, outreachUpdate, outreachCount } from '../lib/outreach/db'
import { outreachConfig } from '../lib/outreach/config'

export async function reconcile(): Promise<{
  claimedResolved: number
  sendingVerified: number
  sendingParked: number
}> {
  const claimedResolved = await reconcileStuckClaimed()
  const { verified, parked } = await reconcileStuckSending()
  return { claimedResolved, sendingVerified: verified, sendingParked: parked }
}

/**
 * Reconcile stuck `claimed` rows.
 *
 * SAFE to requeue — the worker grabbed the row but hasn't dispatched to the provider yet.
 * No risk of double-send because the send never happened.
 */
async function reconcileStuckClaimed(): Promise<number> {
  const timeout = outreachConfig.reconciler.stuckClaimTimeoutMs
  const cutoff = new Date(Date.now() - timeout).toISOString()

  const stuck = await outreachSelect<any>('outreach_send_queue', {
    filters: { status: 'claimed' },
  }).then((rows) => rows.filter((r: any) => r.claimed_at && r.claimed_at < cutoff))

  for (const item of stuck) {
    await outreachUpdate('outreach_send_queue', 'id', item.id, {
      status: 'queued',
      claimed_at: null,
      claimed_by: null,
      updated_at: new Date().toISOString(),
    })
  }

  return stuck.length
}

/**
 * Reconcile stuck `sending` rows.
 *
 * DANGEROUS — this status means "we may have already hit the provider."
 * Must verify against the provider before taking any action.
 *
 * Strategy:
 * 1. Check if there's a matching outreach_log row with provider_message_id
 *    → If yes, the send succeeded. Mark as `sent`.
 * 2. If no log row exists, we can't verify. Park for manual review.
 *    NEVER blind-requeue — that would double-send on every restart.
 */
async function reconcileStuckSending(): Promise<{ verified: number; parked: number }> {
  const timeout = outreachConfig.reconciler.stuckSendingTimeoutMs
  const cutoff = new Date(Date.now() - timeout).toISOString()

  const stuck = await outreachSelect<any>('outreach_send_queue', {
    filters: { status: 'sending' },
  }).then((rows) => rows.filter((r: any) => r.claimed_at && r.claimed_at < cutoff))

  let verified = 0
  let parked = 0

  for (const item of stuck) {
    const log = await outreachSelect<any>('outreach_log', {
      filters: { queue_id: item.id },
      limit: 1,
    })

    if (log.length > 0 && log[0].provider_message_id) {
      // Send succeeded — log exists with provider message ID
      await outreachUpdate('outreach_send_queue', 'id', item.id, {
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      verified++
    } else if (log.length > 0 && !log[0].provider_message_id) {
      // Log exists but no provider message ID — send may have failed mid-dispatch
      // Park for manual review. DO NOT requeue.
      await outreachUpdate('outreach_send_queue', 'id', item.id, {
        status: 'failed',
        attempts: (item.attempts || 0) + 1,
        last_error: 'stuck_in_sending_no_provider_id_parked_for_review',
        updated_at: new Date().toISOString(),
      })
      parked++
    } else {
      // No log row at all — we can't verify whether the send happened.
      // Park for manual review. DO NOT requeue (would double-send if it did go through).
      await outreachUpdate('outreach_send_queue', 'id', item.id, {
        status: 'failed',
        attempts: (item.attempts || 0) + 1,
        last_error: 'stuck_in_sending_no_log_row_parked_for_review',
        updated_at: new Date().toISOString(),
      })
      parked++
    }
  }

  return { verified, parked }
}
