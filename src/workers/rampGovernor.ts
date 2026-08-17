/**
 * Ramp governor — self-governing volume ramp.
 *
 * Starts at 200/day, climbs only on green health signals over trailing window.
 */

import { outreachSelect, outreachUpdate } from '../lib/outreach/db'
import { outreachConfig } from '../lib/outreach/config'

export async function evaluateAndAdvance(): Promise<{ advanced: boolean; reason?: string; newBudget?: number }> {
  const ramp = await getRampState()
  const health = await getTrailingHealth(outreachConfig.ramp.trailingWindowDays)

  const gateResult = evaluateHealth(health)

  await outreachUpdate('outreach_ramp_state', 'id', ramp.id, {
    last_gate_result: JSON.stringify(gateResult),
    updated_at: new Date().toISOString(),
  })

  if (!gateResult.allGreen) {
    if (gateResult.shouldCut) {
      await cutBudget(ramp)
    }
    return { advanced: false, reason: gateResult.reason || undefined }
  }

  const canAdvance = ramp.last_advanced_at
    ? daysSince(ramp.last_advanced_at) >= outreachConfig.ramp.minDaysBetweenAdvances
    : true

  if (!canAdvance) {
    return { advanced: false, reason: 'min_days_not_met' }
  }

  const nextStep = ramp.current_step + 1
  if (nextStep >= outreachConfig.ramp.budgetLadder.length) {
    return { advanced: false, reason: 'at_max_budget' }
  }

  const newBudget = outreachConfig.ramp.budgetLadder[nextStep]
  await outreachUpdate('outreach_ramp_state', 'id', ramp.id, {
    current_step: nextStep,
    current_daily_budget: newBudget,
    last_advanced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return { advanced: true, newBudget }
}

function evaluateHealth(health: { domains: any[]; mailboxes: any[]; replyRate: number | null }): {
  allGreen: boolean
  reason: string | null
  shouldCut: boolean
} {
  if (!health.domains.length) {
    return { allGreen: false, reason: 'no_domain_data', shouldCut: false }
  }

  for (const d of health.domains) {
    if (d.spam_rate !== null && d.spam_rate >= outreachConfig.thresholds.domainSpamRateHardPause) {
      return { allGreen: false, reason: `domain spam ${d.spam_rate} >= hard pause`, shouldCut: true }
    }
    if (d.spam_rate !== null && d.spam_rate >= outreachConfig.thresholds.domainSpamRateThrottle) {
      return { allGreen: false, reason: `domain spam ${d.spam_rate} >= throttle`, shouldCut: true }
    }
  }

  for (const m of health.mailboxes) {
    if (m.bounce_rate >= outreachConfig.thresholds.mailboxBounceRateHardPause) {
      return { allGreen: false, reason: `mailbox bounce ${m.bounce_rate}`, shouldCut: true }
    }
    if (m.complaint_rate >= outreachConfig.thresholds.mailboxComplaintProxyPause) {
      return { allGreen: false, reason: `mailbox complaint ${m.complaint_rate}`, shouldCut: true }
    }
  }

  if (health.replyRate !== null && health.replyRate < outreachConfig.thresholds.replyRateFloor) {
    return { allGreen: false, reason: `reply rate ${health.replyRate} below floor`, shouldCut: true }
  }

  return { allGreen: true, reason: null, shouldCut: false }
}

async function cutBudget(ramp: any): Promise<void> {
  const currentStep = Math.max(0, ramp.current_step - 1)
  const newBudget = outreachConfig.ramp.budgetLadder[currentStep]
  await outreachUpdate('outreach_ramp_state', 'id', ramp.id, {
    current_step: currentStep,
    current_daily_budget: newBudget,
    last_advanced_at: null,
    updated_at: new Date().toISOString(),
  })
}

async function getRampState(): Promise<any> {
  const rows = await outreachSelect<any>('outreach_ramp_state', { limit: 1 })
  return rows[0] || { id: null, current_step: 0, current_daily_budget: 200, sent_today_global: 0, last_advanced_at: null }
}

async function getTrailingHealth(days: number): Promise<{ domains: any[]; mailboxes: any[]; replyRate: number | null }> {
  const domains = await outreachSelect<any>('outreach_sending_domains', {
    filters: { status: 'active' },
  })

  const domainMetrics: any[] = []
  for (const d of domains) {
    const metrics = await outreachSelect<any>('outreach_postmaster_metrics', {
      filters: { domain_id: d.id },
    })
    const recent = metrics.filter((m: any) => {
      const d = new Date(m.metric_date)
      return (Date.now() - d.getTime()) / 86400000 <= days
    })
    if (recent.length > 0) {
      const avgSpam = recent.reduce((sum: number, m: any) => sum + (m.spam_rate || 0), 0) / recent.length
      domainMetrics.push({ domain: d.domain, spam_rate: avgSpam })
    }
  }

  const mailboxes = await outreachSelect<any>('outreach_mailboxes', {
    filters: { status: 'active' },
  })

  const mailboxMetrics: any[] = []
  for (const m of mailboxes) {
    const health = await outreachSelect<any>('outreach_mailbox_health_daily', {
      filters: { mailbox_id: m.id },
    })
    const recent = health.filter((h: any) => {
      const d = new Date(h.stat_date)
      return (Date.now() - d.getTime()) / 86400000 <= days
    })
    if (recent.length > 0) {
      const avgBounce = recent.reduce((sum: number, h: any) => sum + (h.bounce_rate || 0), 0) / recent.length
      const avgComplaint = recent.reduce((sum: number, h: any) => sum + (h.complaint_rate || 0), 0) / recent.length
      mailboxMetrics.push({ email: m.email, bounce_rate: avgBounce, complaint_rate: avgComplaint })
    }
  }

  const allLog = await outreachSelect<any>('outreach_log', {})
  const recentLog = allLog.filter((r: any) => {
    const d = new Date(r.sent_at)
    return (Date.now() - d.getTime()) / 86400000 <= days
  })

  const replies = recentLog.filter((r: any) => r.replied_at && !r.reply_is_auto).length
  const total = recentLog.length
  const replyRate = total > 0 ? replies / total : null

  return { domains: domainMetrics, mailboxes: mailboxMetrics, replyRate }
}

function daysSince(date: string | null): number {
  if (!date) return Infinity
  const d = new Date(date)
  return (Date.now() - d.getTime()) / 86400000
}

export async function resetDailyGlobal(): Promise<void> {
  const ramp = await getRampState()
  if (ramp.id) {
    await outreachUpdate('outreach_ramp_state', 'id', ramp.id, {
      sent_today_global: 0,
      updated_at: new Date().toISOString(),
    })
  }
}
