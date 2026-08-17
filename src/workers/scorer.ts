/**
 * Scorer — creator ranking + contactability learning.
 *
 * rankCreators: best-first send order from fit + reply-likelihood composite.
 * updateContactability: learn from outcomes, re-rank targeting.
 */

import { outreachSelect, outreachInsert, outreachUpdate } from '../lib/outreach/db'
import { outreachConfig } from '../lib/outreach/config'

export async function rankCreators(): Promise<{ ranked: number }> {
  const creators = await outreachSelect<any>('outreach_creators', {})

  if (!creators.length) return { ranked: 0 }

  const emails = creators.map((c: any) => c.email)
  const contactMap = await loadContactability(emails)

  const scored = creators.map((c: any) => {
    const fit = fitScore(c)
    const likelihood = replyLikelihood(c, contactMap.get(c.email))
    return {
      creator_id: c.id,
      fit_score: round(fit),
      reply_likelihood_score: round(likelihood),
      composite: fit * 0.4 + likelihood * 0.6,
    }
  })

  scored.sort((a, b) => b.composite - a.composite)

  let rank = 1
  for (const s of scored) {
    try {
      await outreachInsert('outreach_creator_scores', {
        creator_id: s.creator_id,
        fit_score: s.fit_score,
        reply_likelihood_score: s.reply_likelihood_score,
        rank,
        scored_at: new Date().toISOString(),
      })
    } catch {
      await outreachUpdate('outreach_creator_scores', 'creator_id', s.creator_id, {
        fit_score: s.fit_score,
        reply_likelihood_score: s.reply_likelihood_score,
        rank,
        scored_at: new Date().toISOString(),
      })
    }
    rank++
  }

  return { ranked: scored.length }
}

function fitScore(creator: any): number {
  const s = creator.raw_signals || {}
  let score = 50
  if (creator.niche) score += 10
  if (s.engagement_rate) score += clamp(s.engagement_rate * 100, 0, 30)
  if (creator.size_tier === 'micro' || creator.size_tier === 'nano') score += 10
  return clamp(score, 0, 100)
}

function replyLikelihood(creator: any, contact: any | undefined): number {
  if (contact && contact.total_sent >= 1) {
    const rr = contact.total_replies / Math.max(1, contact.total_sent)
    let score = rr * 100
    if (contact.total_bounces > 0) score -= 40
    if (contact.cadence_tier === 'drop') score = 0
    return clamp(score, 0, 100)
  }
  const s = creator.raw_signals || {}
  let score = 40
  if (s.recently_active) score += 20
  if (s.has_business_email) score += 15
  return clamp(score, 0, 100)
}

export async function updateContactability(): Promise<{ updated: number }> {
  const log = await outreachSelect<any>('outreach_log', {})

  const agg = new Map<string, any>()
  for (const r of log) {
    const key = r.recipient_email
    const a = agg.get(key) || {
      email: key,
      creator_id: r.creator_id,
      total_sent: 0,
      total_replies: 0,
      total_bounces: 0,
      total_form_fills: 0,
      last_contacted_at: null as string | null,
      last_reply_at: null as string | null,
    }
    a.total_sent++
    if (r.replied_at) {
      a.total_replies++
      a.last_reply_at = maxDate(a.last_reply_at, r.replied_at)
    }
    if (r.bounced) a.total_bounces++
    if (r.form_filled) a.total_form_fills++
    a.last_contacted_at = maxDate(a.last_contacted_at, r.sent_at)
    agg.set(key, a)
  }

  let updated = 0
  for (const a of agg.values()) {
    const score = contactabilityScore(a)
    const cadence = cadenceFromScore(a, score)

    try {
      await outreachInsert('outreach_contactability', {
        email: a.email,
        creator_id: a.creator_id,
        total_sent: a.total_sent,
        total_replies: a.total_replies,
        total_bounces: a.total_bounces,
        total_form_fills: a.total_form_fills,
        last_contacted_at: a.last_contacted_at,
        last_reply_at: a.last_reply_at,
        contactability_score: round(score),
        cadence_tier: cadence,
        updated_at: new Date().toISOString(),
      })
    } catch {
      await outreachUpdate('outreach_contactability', 'email', a.email, {
        creator_id: a.creator_id,
        total_sent: a.total_sent,
        total_replies: a.total_replies,
        total_bounces: a.total_bounces,
        total_form_fills: a.total_form_fills,
        last_contacted_at: a.last_contacted_at,
        last_reply_at: a.last_reply_at,
        contactability_score: round(score),
        cadence_tier: cadence,
        updated_at: new Date().toISOString(),
      })
    }
    updated++
  }

  return { updated }
}

function contactabilityScore(a: any): number {
  if (a.total_bounces > 0) return 0
  const rr = a.total_replies / Math.max(1, a.total_sent)
  let score = rr * 100 + a.total_form_fills * 20
  if (a.total_replies === 0 && a.total_sent >= 3) score -= 30
  return clamp(score, 0, 100)
}

function cadenceFromScore(a: any, score: number): string {
  if (a.total_bounces > 0) return 'drop'
  if (a.total_replies > 0) return 'fast'
  if (a.total_replies === 0 && a.total_sent >= outreachConfig.followup.maxFollowups + 1) return 'drop'
  if (score < 10 && a.total_sent >= 3) return 'slow'
  return 'normal'
}

async function loadContactability(emails: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>()
  const all = await outreachSelect<any>('outreach_contactability', {})
  for (const row of all) {
    if (emails.includes(row.email)) map.set(row.email, row)
  }
  return map
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const round = (n: number) => Math.round(n * 1000) / 1000
const maxDate = (a: string | null, b: string | null) => (!a ? b : !b ? a : new Date(a) > new Date(b) ? a : b)
