/**
 * Processor — atomic claim, mailbox cap, global budget, send dispatch.
 *
 * The ONLY path from queue to sending. Two workers → disjoint claims via Supabase.
 */

import { outreachSelect, outreachInsert, outreachUpdate, outreachUpdateWhere, outreachCount } from '../lib/outreach/db'
import { sendGmail } from '../lib/outreach/senders/gmailSender'
import { sendSES } from '../lib/outreach/senders/sesSender'
import { outreachConfig } from '../lib/outreach/config'
import { resolveTemplatePlaceholders } from '../lib/outreach/templateResolver'

const workerId = `worker-${process.pid}-${Date.now()}`

export async function processBatch(batchSize = 50): Promise<{ processed: number; reason?: string }> {
  const ramp = await getRampState()
  const remainingBudget = ramp.current_daily_budget - ramp.sent_today_global

  if (remainingBudget <= 0) {
    return { processed: 0, reason: 'budget_exhausted' }
  }

  const toProcess = Math.min(batchSize, remainingBudget)
  const claimed = await atomicClaim(toProcess)

  if (claimed.length === 0) {
    return { processed: 0, reason: 'no_eligible_work' }
  }

  const mailboxes = await loadEligibleMailboxes()
  if (mailboxes.length === 0) {
    await requeueUnclaimed(claimed)
    return { processed: 0, reason: 'no_mailboxes' }
  }

  let processed = 0
  let mbIndex = 0

  for (let i = 0; i < claimed.length; i++) {
    const item = claimed[i]
    console.log(`[processor] Processing ${i+1}/${claimed.length}: ${item.recipient_email} stage=${item.stage}`)

    // Random delay between sends (30-120 seconds) to mimic human behavior
    if (i > 0) {
      const delay = 30000 + Math.random() * 90000
      console.log(`[processor] Waiting ${Math.round(delay/1000)}s before next send...`)
      await new Promise(r => setTimeout(r, delay))
    }

    try {
      const suppressed = await isSuppressed(item.recipient_email)
      if (suppressed) {
        console.log(`[processor] ${item.recipient_email} is SUPPRESSED, skipping`)
        await markSuppressed(item.id)
        continue
      }

      const mailbox = mailboxes[mbIndex % mailboxes.length]
      mbIndex++

      const capOk = await tryIncrementMailboxCap(mailbox.id)
      if (!capOk) {
        await requeueItem(item.id, 'mailbox_at_cap')
        continue
      }

      await markSending(item.id, mailbox.id)
      console.log(`[processor] Sending via ${mailbox.provider} from ${mailbox.email} to ${item.recipient_email}`)

      try {
        const result = await dispatchSend(item, mailbox)
        console.log(`[processor] SEND OK: messageId=${result.providerMessageId}`)
        await markSent(item.id, mailbox.id, result)
        processed++
      } catch (err: any) {
        if (err.oauthRevoked) {
          await pauseMailbox(mailbox.id, mailbox.email, 'oauth_revoked')
          await requeueItem(item.id, 'oauth_revoked')
        } else if (err.retryable) {
          await requeueItem(item.id, err.message)
        } else {
          await markFailed(item.id, err.message)
        }
      }
    } catch (err: any) {
      await requeueItem(item.id, err.message)
    }
  }

  await incrementGlobalSent(processed)

  // Check if any campaigns should be marked completed
  await checkCampaignCompletion()

  return { processed }
}

async function atomicClaim(limit: number): Promise<any[]> {
  const queued = await outreachSelect<any>('outreach_send_queue', {
    filters: { status: 'queued' },
    order: { column: 'priority', ascending: true },
    limit,
  })

  if (queued.length === 0) return []

  const now = new Date().toISOString()
  const ids = queued.map((q: any) => q.id)

  // Claim all items one by one (Supabase doesn't support SKIP LOCKED)
  for (let i = 0; i < ids.length; i++) {
    try {
      await outreachUpdateWhere(
        'outreach_send_queue',
        { id: ids[i], status: 'queued' },
        { status: 'claimed', claimed_at: now, claimed_by: workerId }
      )
    } catch {
      // Already claimed by another worker
    }
  }

  // Re-fetch claimed rows
  const claimed = await outreachSelect<any>('outreach_send_queue', {
    filters: { claimed_by: workerId, status: 'claimed' },
  })

  return claimed.slice(0, limit)
}

async function loadEligibleMailboxes(): Promise<any[]> {
  return await outreachSelect<any>('outreach_mailboxes', {
    filters: { status: 'active' },
  }).then((rows) => rows.filter((r: any) => r.sent_today < r.daily_cap))
}

async function tryIncrementMailboxCap(mailboxId: string): Promise<boolean> {
  const rows = await outreachSelect<any>('outreach_mailboxes', {
    filters: { id: mailboxId },
    limit: 1,
  })

  if (rows.length === 0) return false
  const mb = rows[0]

  if (mb.sent_today >= mb.daily_cap) return false

  await outreachUpdate('outreach_mailboxes', 'id', mailboxId, {
    sent_today: mb.sent_today + 1,
    updated_at: new Date().toISOString(),
  })

  return true
}

async function markSending(queueId: string, mailboxId: string): Promise<void> {
  await outreachUpdate('outreach_send_queue', 'id', queueId, {
    status: 'sending',
    mailbox_id: mailboxId,
    updated_at: new Date().toISOString(),
  })
}

async function dispatchSend(item: any, mailbox: any): Promise<any> {
  // Resolve template placeholders (e.g. {{onboarding_link}})
  // On failure, send with raw placeholder text rather than failing the send
  let resolved: { subject: string; body_text: string; body_html: string | undefined }
  try {
    resolved = await resolveTemplatePlaceholders(
      item.subject,
      item.body_text,
      item.body_html,
      item.creator_id || null,
      item.recipient_email,
    )
  } catch (err) {
    console.error(`Template resolution failed for queue ${item.id}:`, err)
    resolved = {
      subject: item.subject,
      body_text: item.body_text,
      body_html: item.body_html || undefined,
    }
  }

  if (mailbox.provider === 'gmail') {
    return await sendGmail(
      { id: mailbox.id, email: mailbox.email, display_name: mailbox.display_name, oauth_token_ref: mailbox.oauth_token_ref },
      item.recipient_email,
      resolved.subject,
      resolved.body_text,
      resolved.body_html,
      item.id
    )
  } else {
    return await sendSES(
      { id: mailbox.id, email: mailbox.email, display_name: mailbox.display_name },
      item.recipient_email,
      resolved.subject,
      resolved.body_text,
      resolved.body_html,
      item.id
    )
  }
}

async function markSent(queueId: string, mailboxId: string, result: any): Promise<void> {
  const item = await outreachSelect<any>('outreach_send_queue', {
    filters: { id: queueId },
    limit: 1,
  })

  if (item.length === 0) return

  const mbRows = await outreachSelect<any>('outreach_mailboxes', {
    filters: { id: mailboxId },
    limit: 1,
  })
  const provider = mbRows[0]?.provider || 'ses'

  await outreachUpdate('outreach_send_queue', 'id', queueId, {
    status: 'sent',
    updated_at: new Date().toISOString(),
  })

  await outreachInsert('outreach_log', {
    queue_id: queueId,
    mailbox_id: mailboxId,
    tier: item[0].tier,
    stage: item[0].stage,
    provider,
    creator_id: item[0].creator_id,
    recipient_email: item[0].recipient_email,
    subject: item[0].subject,
    provider_message_id: result.providerMessageId || null,
    rfc_message_id: result.rfcMessageId || null,
    thread_id: result.threadId || null,
    sent_at: new Date().toISOString(),
  })

  if (item[0].campaign_id) {
    await incrementCampaignCounter(item[0].campaign_id, 'sent_count')
  }
}

async function markFailed(queueId: string, error: string): Promise<void> {
  const rows = await outreachSelect<any>('outreach_send_queue', {
    filters: { id: queueId },
    limit: 1,
  })

  await outreachUpdate('outreach_send_queue', 'id', queueId, {
    status: 'failed',
    attempts: (rows[0]?.attempts || 0) + 1,
    last_error: error,
    updated_at: new Date().toISOString(),
  })

  if (rows[0]?.campaign_id) {
    await incrementCampaignCounter(rows[0].campaign_id, 'failed_count')
  }
}

async function requeueItem(queueId: string, reason: string): Promise<void> {
  await outreachUpdate('outreach_send_queue', 'id', queueId, {
    status: 'queued',
    claimed_at: null,
    claimed_by: null,
    attempts: await getCurrentAttempts(queueId) + 1,
    last_error: reason,
    updated_at: new Date().toISOString(),
  })
}

async function requeueUnclaimed(items: any[]): Promise<void> {
  for (const item of items) {
    await requeueItem(item.id, 'requeue_unclaimed')
  }
}

async function isSuppressed(email: string): Promise<boolean> {
  const rows = await outreachSelect<any>('outreach_suppressions', {
    filters: { email: email.toLowerCase() },
    limit: 1,
  })
  return rows.length > 0
}

async function markSuppressed(queueId: string): Promise<void> {
  await outreachUpdate('outreach_send_queue', 'id', queueId, {
    status: 'suppressed',
    updated_at: new Date().toISOString(),
  })
}

async function pauseMailbox(mailboxId: string, email: string, reason: string): Promise<void> {
  await outreachUpdate('outreach_mailboxes', 'id', mailboxId, {
    status: 'paused',
    paused_reason: reason,
    updated_at: new Date().toISOString(),
  })
}

async function getRampState(): Promise<any> {
  const rows = await outreachSelect<any>('outreach_ramp_state', { limit: 1 })
  return rows[0] || { current_daily_budget: 200, sent_today_global: 0 }
}

async function incrementGlobalSent(count: number): Promise<void> {
  if (count <= 0) return
  const ramp = await getRampState()
  await outreachUpdate('outreach_ramp_state', 'id', ramp.id, {
    sent_today_global: ramp.sent_today_global + count,
    updated_at: new Date().toISOString(),
  })
}

async function getCurrentAttempts(queueId: string): Promise<number> {
  const rows = await outreachSelect<any>('outreach_send_queue', {
    filters: { id: queueId },
    limit: 1,
  })
  return rows[0]?.attempts || 0
}

async function incrementCampaignCounter(campaignId: string, column: string): Promise<void> {
  try {
    const rows = await outreachSelect<any>('outreach_campaigns', {
      filters: { id: campaignId },
      limit: 1,
    })
    if (rows.length === 0) return
    const current = rows[0][column] || 0
    await outreachUpdate('outreach_campaigns', 'id', campaignId, {
      [column]: current + 1,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // Counter failure should not block sends
  }
}

async function checkCampaignCompletion(): Promise<void> {
  try {
    // Find campaigns in 'sending' status
    const sending = await outreachSelect<any>('outreach_campaigns', {
      filters: { status: 'sending' },
    })

    for (const campaign of sending) {
      // Count remaining queued/claimed/sending items for this campaign
      const remaining = await outreachCount('outreach_send_queue', {
        campaign_id: campaign.id,
      })

      // Count items still in pipeline (not yet sent/failed/suppressed/invalid)
      const inPipeline = await outreachSelect<any>('outreach_send_queue', {
        filters: { campaign_id: campaign.id },
        select: 'status',
      })

      const activeStatuses = new Set(['queued', 'claimed', 'sending'])
      const hasActiveItems = inPipeline.some((row: any) => activeStatuses.has(row.status))

      if (!hasActiveItems && inPipeline.length > 0) {
        await outreachUpdate('outreach_campaigns', 'id', campaign.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }
  } catch {
    // Completion check failure should not block processing
  }
}
