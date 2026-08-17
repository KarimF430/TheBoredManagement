/**
 * Follow-up engine — 3-5 cap, new angle each, hard stops.
 *
 * Only follows up non-responders. Stops instantly on reply/bounce/complaint/unsubscribe.
 */

import { outreachSelect, outreachUpdate } from '../lib/outreach/db'
import { outreachConfig } from '../lib/outreach/config'
import { enqueueRecipients } from '../lib/outreach/queue/enqueue'

export async function runFollowups(limit = 500): Promise<{ scheduled: number; exhausted: number }> {
  const nowIso = new Date().toISOString()

  const due = await outreachSelect<any>('outreach_followup_state', {
    filters: {},
    order: { column: 'next_followup_due', ascending: true },
    limit,
  }).then((rows) =>
    rows.filter(
      (r: any) =>
        (r.status === 'awaiting_reply' || r.status === 'followup_scheduled') &&
        r.next_followup_due &&
        r.next_followup_due <= nowIso
    )
  )

  if (!due.length) return { scheduled: 0, exhausted: 0 }

  let scheduled = 0
  let exhausted = 0

  for (const state of due) {
    const shouldStop = await checkShouldStop(state)
    if (shouldStop) {
      await markExhausted(state.id)
      exhausted++
      continue
    }

    if (state.followups_sent >= outreachConfig.followup.maxFollowups) {
      await markExhausted(state.id)
      await dropCadence(state.email)
      exhausted++
      continue
    }

    const nextStage = `followup_${state.followups_sent + 1}`
    const template = await pickTemplate(nextStage)
    if (!template) {
      await markExhausted(state.id)
      exhausted++
      continue
    }

    const creator = await getCreator(state.creator_id)
    if (!creator) {
      await markExhausted(state.id)
      exhausted++
      continue
    }

    const rank = await getRank(state.creator_id)

    const summary = await enqueueRecipients([{
      creator_id: state.creator_id,
      recipient_email: state.email,
      tier: template.tier,
      stage: nextStage,
      template_id: template.id,
      subject: template.subject,
      body_text: template.body_text,
      body_html: template.body_html || null,
      priority: (rank ?? 100000) + outreachConfig.followup.priorityPenalty,
    }])

    if (summary.queued > 0) {
      const nextDue = new Date(Date.now() + outreachConfig.followup.gapDaysBetween * 86400000).toISOString()
      await outreachUpdate('outreach_followup_state', 'id', state.id, {
        followups_sent: state.followups_sent + 1,
        status: 'awaiting_reply',
        next_followup_due: nextDue,
        updated_at: new Date().toISOString(),
      })
      scheduled++
    } else {
      await markExhausted(state.id)
      exhausted++
    }
  }

  return { scheduled, exhausted }
}

async function checkShouldStop(state: any): Promise<boolean> {
  if (['responded', 'suppressed', 'exhausted'].includes(state.status)) return true

  const sup = await outreachSelect<any>('outreach_suppressions', {
    filters: { email: state.email },
    limit: 1,
  })
  if (sup.length > 0) return true

  const log = await outreachSelect<any>('outreach_log', {
    filters: { recipient_email: state.email },
    order: { column: 'sent_at', ascending: false },
    limit: 5,
  })

  for (const row of log) {
    if (row.replied_at || row.bounced || row.complaint || row.unsubscribed) return true
  }
  return false
}

async function pickTemplate(stage: string): Promise<any | null> {
  const rows = await outreachSelect<any>('outreach_templates', {
    filters: { stage, active: true },
    limit: 1,
  })
  return rows[0] || null
}

async function getCreator(creatorId: string): Promise<any | null> {
  if (!creatorId) return null
  const rows = await outreachSelect<any>('outreach_creators', {
    filters: { id: creatorId },
    limit: 1,
  })
  return rows[0] || null
}

async function getRank(creatorId: string): Promise<number | null> {
  if (!creatorId) return null
  const rows = await outreachSelect<any>('outreach_creator_scores', {
    filters: { creator_id: creatorId },
    limit: 1,
  })
  return rows[0]?.rank ?? null
}

async function markExhausted(stateId: string): Promise<void> {
  await outreachUpdate('outreach_followup_state', 'id', stateId, {
    status: 'exhausted',
    next_followup_due: null,
    updated_at: new Date().toISOString(),
  })
}

async function dropCadence(email: string): Promise<void> {
  await outreachUpdate('outreach_contactability', 'email', email, {
    cadence_tier: 'drop',
    updated_at: new Date().toISOString(),
  })
}
