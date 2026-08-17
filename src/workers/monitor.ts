/**
 * Monitor — daily Postmaster pull, mailbox health rollup, threshold actions.
 *
 * Also runs:
 * - Periodic auth re-verification of active domains (every 6 hours)
 * - Materialized view refresh (CONCURRENTLY, so dashboard doesn't hang)
 */

import { outreachSelect, outreachInsert, outreachUpdate, outreachRawSQL } from '../lib/outreach/db'
import { outreachConfig } from '../lib/outreach/config'
import { alert } from '../lib/outreach/alerts'
import { reverifyAllActiveDomains } from '../lib/outreach/authVerifier'

export async function runDailyMonitor(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  const existing = await outreachSelect<any>('outreach_mailbox_health_daily', {
    filters: { stat_date: today },
    limit: 1,
  })

  if (existing.length > 0) {
    return
  }

  await computeMailboxHealth()
  await applyThresholdActions()
  await resetDailyCounters()
  await refreshDashboardViews()
  await periodicAuthReverify()
}

async function computeMailboxHealth(): Promise<void> {
  const mailboxes = await outreachSelect<any>('outreach_mailboxes', {
    filters: { status: 'active' },
  })

  for (const mb of mailboxes) {
    const log = await outreachSelect<any>('outreach_log', {
      filters: {},
    }).then((rows) =>
      rows.filter(
        (r: any) =>
          r.mailbox_id === mb.id &&
          r.sent_at &&
          new Date(r.sent_at).toDateString() === new Date().toDateString()
      )
    )

    const sent = log.length
    const bounces = log.filter((r: any) => r.bounced).length
    const complaints = log.filter((r: any) => r.complaint).length
    const replies = log.filter((r: any) => r.replied_at && !r.reply_is_auto).length

    const bounceRate = sent > 0 ? bounces / sent : 0
    const complaintRate = sent > 0 ? complaints / sent : 0
    const replyRate = sent > 0 ? replies / sent : 0
    const healthScore = computeHealthScore(bounceRate, complaintRate, replyRate)

    try {
      await outreachInsert('outreach_mailbox_health_daily', {
        mailbox_id: mb.id,
        stat_date: new Date().toISOString().slice(0, 10),
        sent_count: sent,
        bounce_count: bounces,
        complaint_count: complaints,
        reply_count: replies,
        bounce_rate: bounceRate,
        complaint_rate: complaintRate,
        reply_rate: replyRate,
        health_score: healthScore,
      })
    } catch {
      await outreachUpdate('outreach_mailbox_health_daily', 'mailbox_id', mb.id, {
        sent_count: sent,
        bounce_count: bounces,
        complaint_count: complaints,
        reply_count: replies,
        bounce_rate: bounceRate,
        complaint_rate: complaintRate,
        reply_rate: replyRate,
        health_score: healthScore,
      })
    }
  }
}

function computeHealthScore(bounceRate: number, complaintRate: number, replyRate: number): number {
  let score = 100
  score -= bounceRate * 1000
  score -= complaintRate * 5000
  score += replyRate * 200
  return Math.max(0, Math.min(100, score))
}

async function applyThresholdActions(): Promise<void> {
  const domains = await outreachSelect<any>('outreach_sending_domains', {
    filters: {},
  })

  for (const d of domains) {
    if (d.status === 'paused') continue

    const metrics = await outreachSelect<any>('outreach_postmaster_metrics', {
      filters: { domain_id: d.id },
      limit: 1,
    })

    if (metrics.length > 0 && metrics[0].spam_rate !== null) {
      const spamRate = metrics[0].spam_rate
      if (spamRate >= outreachConfig.thresholds.domainSpamRateHardPause) {
        await outreachUpdate('outreach_sending_domains', 'id', d.id, {
          status: 'paused',
          paused_reason: 'spam_rate_hard_pause',
          updated_at: new Date().toISOString(),
        })
        await alert({
          severity: 'critical',
          scope: 'domain',
          domainId: d.id,
          message: `Domain ${d.domain} spam rate ${spamRate} exceeds hard pause threshold`,
        })
      } else if (spamRate >= outreachConfig.thresholds.domainSpamRateThrottle) {
        await outreachUpdate('outreach_sending_domains', 'id', d.id, {
          status: 'throttled',
          updated_at: new Date().toISOString(),
        })
        await alert({
          severity: 'warning',
          scope: 'domain',
          domainId: d.id,
          message: `Domain ${d.domain} spam rate ${spamRate} exceeds throttle threshold`,
        })
      }
    }
  }

  const healthRows = await outreachSelect<any>('outreach_mailbox_health_daily', {
    filters: { stat_date: new Date().toISOString().slice(0, 10) },
  })

  for (const m of healthRows) {
    if (m.bounce_rate >= outreachConfig.thresholds.mailboxBounceRateHardPause) {
      await outreachUpdate('outreach_mailboxes', 'id', m.mailbox_id, {
        status: 'paused',
        paused_reason: 'bounce_rate_hard_pause',
        updated_at: new Date().toISOString(),
      })
      await alert({
        severity: 'critical',
        scope: 'mailbox',
        mailboxId: m.mailbox_id,
        message: `Mailbox bounce rate ${m.bounce_rate} exceeds hard pause threshold`,
      })
    } else if (m.complaint_rate >= outreachConfig.thresholds.mailboxComplaintProxyPause) {
      await outreachUpdate('outreach_mailboxes', 'id', m.mailbox_id, {
        status: 'paused',
        paused_reason: 'complaint_rate',
        updated_at: new Date().toISOString(),
      })
      await alert({
        severity: 'critical',
        scope: 'mailbox',
        mailboxId: m.mailbox_id,
        message: `Mailbox complaint rate ${m.complaint_rate} exceeds threshold`,
      })
    }
  }
}

async function resetDailyCounters(): Promise<void> {
  const mailboxes = await outreachSelect<any>('outreach_mailboxes', {
    filters: { status: 'active' },
  })

  for (const mb of mailboxes) {
    await outreachUpdate('outreach_mailboxes', 'id', mb.id, {
      sent_today: 0,
      last_reset_at: new Date().toISOString(),
    })
  }
}

/**
 * Refreshes all materialized views CONCURRENTLY.
 *
 * Uses CONCURRENTLY so the dashboard doesn't hang during refresh.
 * Requires unique indexes on each view (created in migration 019).
 */
async function refreshDashboardViews(): Promise<void> {
  try {
    await outreachRawSQL('SELECT refresh_outreach_dashboard_views()')
  } catch (err) {
    // If CONCURRENTLY fails (e.g., no unique index), fall back to plain refresh
    try {
      await outreachRawSQL('REFRESH MATERIALIZED VIEW mv_outreach_daily_funnel')
      await outreachRawSQL('REFRESH MATERIALIZED VIEW mv_outreach_classification_summary')
      await outreachRawSQL('REFRESH MATERIALIZED VIEW mv_outreach_mailbox_health')
      await outreachRawSQL('REFRESH MATERIALIZED VIEW mv_outreach_domain_health')
      await outreachRawSQL('REFRESH MATERIALIZED VIEW mv_outreach_queue_backlog')
      await outreachRawSQL('REFRESH MATERIALIZED VIEW mv_outreach_followup_performance')
    } catch (err2) {
      alert({
        severity: 'warning',
        scope: 'dashboard',
        message: `Materialized view refresh failed: ${(err2 as Error).message}`,
      })
    }
  }
}

/**
 * Periodic re-verification of all active domains.
 *
 * DNS changes — DMARC edits, DKIM key rotations, SPF updates — should
 * re-pause a domain that falls out of compliance. Runs every monitor cycle.
 */
async function periodicAuthReverify(): Promise<void> {
  try {
    const result = await reverifyAllActiveDomains()
    if (result.paused > 0) {
      alert({
        severity: 'critical',
        scope: 'auth-reverify',
        message: `${result.paused}/${result.verified} active domains failed auth re-verification and were paused. Check DNS records.`,
      })
    }
  } catch (err) {
    // Auth reverify failure should not block the monitor
    alert({
      severity: 'warning',
      scope: 'auth-reverify',
      message: `Auth re-verification failed: ${(err as Error).message}`,
    })
  }
}
