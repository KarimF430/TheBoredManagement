/**
 * Enqueue — the ONLY sanctioned entry to send_queue.
 *
 * Validates shape, checks suppression, validates email, computes dedupe_key,
 * inserts ON CONFLICT DO NOTHING. Returns counts.
 */

import crypto from 'crypto'
import { outreachSelect, outreachInsert, outreachCount } from '../db'
import { validateEmail } from '../emailValidator'

interface EnqueueItem {
  creator_id: string | null
  recipient_email: string
  tier: 'tier1' | 'tier2'
  stage: string
  template_id: string | null
  subject: string
  body_text: string
  body_html?: string | null
  priority?: number
  campaign_id?: string | null
}

interface EnqueueResult {
  queued: number
  skipped: number
  invalid: number
  suppressed: number
}

export async function enqueueRecipients(
  items: EnqueueItem[],
  opts?: { campaignDay?: string }
): Promise<EnqueueResult> {
  if (!Array.isArray(items) || items.length === 0) {
    return { queued: 0, skipped: 0, invalid: 0, suppressed: 0 }
  }

  const day = opts?.campaignDay || new Date().toISOString().slice(0, 10)
  let queued = 0
  let skipped = 0
  let invalid = 0
  let suppressed = 0

  const emails = items.map((i) => i.recipient_email.toLowerCase())
  const suppressedSet = await loadSuppressions(emails)

  for (const item of items) {
    try {
      const email = item.recipient_email.toLowerCase().trim()

      if (suppressedSet.has(email)) {
        suppressed++
        continue
      }

      const validation = await validateEmail(email)
      if (!validation.is_valid) {
        invalid++
        await suppressInvalid(email)
        continue
      }

      const dedupeKey = computeDedupeKey(email, item.stage, day)
      const priority = item.priority ?? 100000

      const existing = await outreachCount('outreach_send_queue', { dedupe_key: dedupeKey })
      if (existing > 0) {
        skipped++
        continue
      }

      await outreachInsert('outreach_send_queue', {
        dedupe_key: dedupeKey,
        creator_id: item.creator_id,
        recipient_email: email,
        tier: item.tier,
        stage: item.stage,
        template_id: item.template_id,
        subject: item.subject,
        body_text: item.body_text,
        body_html: item.body_html || null,
        priority,
        status: 'queued',
        scheduled_for: new Date().toISOString(),
        campaign_id: item.campaign_id || null,
      })

      queued++
    } catch {
      skipped++
    }
  }

  return { queued, skipped, invalid, suppressed }
}

export function computeDedupeKey(email: string, stage: string, campaignDay: string): string {
  const raw = `${email}:${stage}:${campaignDay}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

async function loadSuppressions(emails: string[]): Promise<Set<string>> {
  const unique = [...new Set(emails)]
  const set = new Set<string>()

  // Fetch all suppressions once, then filter in memory
  const allSuppressions = await outreachSelect<any>('outreach_suppressions', {
    filters: {},
  })

  const emailSet = new Set(unique)
  for (const row of allSuppressions) {
    if (emailSet.has(row.email)) {
      set.add(row.email)
    }
  }

  return set
}

async function suppressInvalid(email: string): Promise<void> {
  try {
    await outreachInsert('outreach_suppressions', {
      email,
      reason: 'invalid',
      source: 'enqueue_validator',
    })
  } catch {
    // Already suppressed
  }
}
