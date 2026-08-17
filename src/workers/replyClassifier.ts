/**
 * Reply classifier — GPT-4o mini + safety-first routing.
 *
 * Only high-confidence classifications trigger irreversible action.
 */

import { classifyJson, safeParse } from '../lib/outreach/llm'
import { outreachSelect, outreachInsert, outreachUpdate } from '../lib/outreach/db'
import { outreachConfig } from '../lib/outreach/config'

const SYSTEM_PROMPT = `You classify a single inbound email reply to a cold outreach message sent to a content creator.
Return ONLY a JSON object, no prose, no markdown, matching exactly:
{
  "category": "interested" | "not_interested" | "wrong_person" | "unsubscribe" | "out_of_office" | "question" | "other",
  "confidence": <number 0..1>,
  "extracted_intent": "<one short sentence, your own words>",
  "suggested_action": "<one short next step>",
  "ooo_return_date": "<YYYY-MM-DD or null>"
}
Rules:
- An out-of-office or automatic reply is "out_of_office", never "interested".
- Any request to stop, remove, opt out, or unsubscribe is "unsubscribe", even if polite.
- "You have the wrong person / not me / I don't do this" is "wrong_person".
- A genuine question about the offer is "question".
- If you are unsure, use "other" with low confidence. Do NOT guess "interested".
- Classify the NEW message text, not any quoted original beneath it.`

export async function classifyPending(limit = 50): Promise<{ classified: number }> {
  const pending = await outreachSelect<any>('outreach_replies', {
    filters: { classified: false },
    order: { column: 'received_at', ascending: true },
    limit,
  })

  if (!pending.length) return { classified: 0 }

  let done = 0
  for (const reply of pending) {
    try {
      await classifyOne(reply)
      done++
    } catch {
      // Skip failed classifications
    }
  }

  return { classified: done }
}

async function classifyOne(reply: any): Promise<void> {
  if (reply.is_auto) {
    await writeClassification(reply, {
      category: 'out_of_office',
      confidence: 1,
      extracted_intent: 'Automatic / out-of-office reply.',
      suggested_action: 'Delay follow-up.',
      ooo_return_date: null,
    }, { needs_review: false, raw: { source: 'auto_detect' } })
    await route(reply, 'out_of_office', 1, null)
    return
  }

  const user = `Subject: ${reply.subject || '(none)'}\n\nReply body:\n${(reply.body_text || '').slice(0, 4000)}`
  const result = await classifyJson(SYSTEM_PROMPT, user)

  if (!result.ok) {
    await writeClassification(reply, {
      category: 'other', confidence: 0,
      extracted_intent: 'Model classification failed.',
      suggested_action: 'Human review.',
      ooo_return_date: null,
    }, { needs_review: true, raw: { error: result.error, raw: result.raw } })
    return
  }

  const c = normalize(result.data)
  const lowConfidence = c.confidence < outreachConfig.llm.minConfidenceToAct
  const needsReview = lowConfidence || c.category === 'other'

  await writeClassification(reply, c, { needs_review: needsReview, raw: result.raw })

  if (!needsReview) {
    await route(reply, c.category, c.confidence, c.ooo_return_date)
  }
}

async function route(reply: any, category: string, _confidence: number, oooDate: string | null): Promise<void> {
  const email = reply.from_email
  const creatorId = reply.creator_id

  if (category === 'unsubscribe') {
    try {
      await outreachInsert('outreach_suppressions', {
        email,
        reason: 'unsubscribe',
        source: 'reply_classifier',
      })
    } catch {
      // Already suppressed
    }
    await setFollowup(creatorId, { status: 'suppressed' })
    return
  }

  if (category === 'not_interested') {
    await setFollowup(creatorId, { status: 'exhausted' })
    await setCadence(email, 'drop')
    return
  }

  if (category === 'wrong_person') {
    await setFollowup(creatorId, { status: 'exhausted' })
    await setCadence(email, 'drop')
    return
  }

  if (category === 'out_of_office') {
    const due = oooDate
      ? new Date(new Date(oooDate).getTime() + 86400000).toISOString()
      : new Date(Date.now() + outreachConfig.followup.gapDaysBetween * 86400000).toISOString()
    await setFollowup(creatorId, { status: 'followup_scheduled', next_followup_due: due })
    return
  }

  if (category === 'interested' || category === 'question') {
    await setFollowup(creatorId, { status: 'responded' })
    await setCadence(email, 'fast')
    return
  }
}

async function writeClassification(
  reply: any,
  c: { category: string; confidence: number; extracted_intent: string; suggested_action: string; ooo_return_date: string | null },
  meta: { needs_review: boolean; raw: unknown }
): Promise<void> {
  try {
    await outreachInsert('outreach_reply_classifications', {
      reply_id: reply.id,
      category: c.category,
      confidence: c.confidence,
      extracted_intent: c.extracted_intent,
      suggested_action: c.suggested_action,
      ooo_return_date: c.ooo_return_date || null,
      needs_review: meta.needs_review,
      model: outreachConfig.llm.model,
      raw_model_output: meta.raw ? JSON.stringify(meta.raw) : null,
    })
  } catch {
    // Update if already exists
    await outreachUpdate('outreach_reply_classifications', 'reply_id', reply.id, {
      category: c.category,
      confidence: c.confidence,
      extracted_intent: c.extracted_intent,
      suggested_action: c.suggested_action,
      ooo_return_date: c.ooo_return_date || null,
      needs_review: meta.needs_review,
      model: outreachConfig.llm.model,
      raw_model_output: meta.raw ? JSON.stringify(meta.raw) : null,
    })
  }

  await outreachUpdate('outreach_replies', 'id', reply.id, { classified: true })
}

function normalize(d: Record<string, unknown>) {
  const allowed = ['interested', 'not_interested', 'wrong_person', 'unsubscribe', 'out_of_office', 'question', 'other']
  const category = allowed.includes(d.category as string) ? d.category : 'other'
  let confidence = Number(d.confidence)
  if (!Number.isFinite(confidence)) confidence = 0
  confidence = Math.max(0, Math.min(1, confidence))
  let ooo: string | null = null
  if (d.ooo_return_date && /^\d{4}-\d{2}-\d{2}$/.test(d.ooo_return_date as string)) ooo = d.ooo_return_date as string
  return {
    category: category as string,
    confidence,
    extracted_intent: String(d.extracted_intent || '').slice(0, 500),
    suggested_action: String(d.suggested_action || '').slice(0, 500),
    ooo_return_date: ooo,
  }
}

async function setFollowup(creatorId: string | null, patch: { status?: string; next_followup_due?: string }): Promise<void> {
  if (!creatorId) return
  await outreachUpdate('outreach_followup_state', 'creator_id', creatorId, {
    status: patch.status,
    next_followup_due: patch.next_followup_due || null,
    updated_at: new Date().toISOString(),
  })
}

async function setCadence(email: string, tier: string): Promise<void> {
  await outreachUpdate('outreach_contactability', 'email', email, {
    cadence_tier: tier,
    updated_at: new Date().toISOString(),
  })
}
