/**
 * Reply capture via Gmail History API.
 *
 * Filters auto-replies, correlates to sends, stores full reply body.
 */

import { google } from 'googleapis'
import { getValidMailboxToken } from '../lib/outreach/gmail-oauth'
import { outreachSelect, outreachInsert, outreachUpdate } from '../lib/outreach/db'
import { outreachConfig } from '../lib/outreach/config'

export async function captureAllReplies(): Promise<{ captured: number }> {
  const mailboxes = await outreachSelect<any>('outreach_mailboxes', {
    filters: { provider: 'gmail' },
  }).then((rows) => rows.filter((r: any) => r.status !== 'paused'))

  let captured = 0

  for (const mailbox of mailboxes) {
    try {
      const count = await captureForMailbox(mailbox)
      captured += count
    } catch (err) {
      console.error(`[reply-capture] failed for ${mailbox.email}:`, (err as Error).message)
    }
  }

  return { captured }
}

async function captureForMailbox(mailbox: any): Promise<number> {
  const { accessToken } = await getValidMailboxToken(mailbox.id)

  const oauth2Client = new google.auth.OAuth2(
    outreachConfig.gmail.clientId,
    outreachConfig.gmail.clientSecret,
    outreachConfig.gmail.redirectUri,
  )
  oauth2Client.setCredentials({ access_token: accessToken })
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  if (!mailbox.gmail_history_id) {
    const profile = await gmail.users.getProfile({ userId: 'me' })
    await outreachUpdate('outreach_mailboxes', 'id', mailbox.id, {
      gmail_history_id: String(profile.data.historyId),
    })
    return 0
  }

  let historyRes
  try {
    historyRes = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: mailbox.gmail_history_id,
      historyTypes: ['messageAdded'],
    })
  } catch (err: any) {
    if (err.code === 404) {
      const profile = await gmail.users.getProfile({ userId: 'me' })
      await outreachUpdate('outreach_mailboxes', 'id', mailbox.id, {
        gmail_history_id: String(profile.data.historyId),
      })
      return 0
    }
    throw err
  }

  const ids = new Set<string>()
  for (const h of historyRes.data.history || []) {
    for (const a of h.messagesAdded || []) {
      if (a.message?.id) ids.add(a.message.id)
    }
  }

  let captured = 0
  for (const messageId of ids) {
    try {
      const ok = await ingestMessage(gmail, mailbox, messageId)
      if (ok) captured++
    } catch {
      // Skip failed ingests
    }
  }

  const latest = historyRes.data.historyId
  if (latest) {
    await outreachUpdate('outreach_mailboxes', 'id', mailbox.id, {
      gmail_history_id: String(latest),
    })
  }

  return captured
}

async function ingestMessage(gmail: any, mailbox: any, messageId: string): Promise<boolean> {
  const existing = await outreachSelect<any>('outreach_replies', {
    filters: { provider_msg_id: messageId },
    limit: 1,
  })
  if (existing.length > 0) return false

  const msg = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
    metadataHeaders: ['In-Reply-To', 'References', 'From', 'Subject', 'Auto-Submitted', 'Precedence'],
  })

  const headers = msg.data.payload?.headers || []
  const get = (n: string) => headers.find((h: any) => h.name.toLowerCase() === n.toLowerCase())?.value

  const fromHeader = get('From') || ''
  if (fromHeader.toLowerCase().includes(mailbox.email.toLowerCase())) return false

  const inReplyTo = get('In-Reply-To')
  const references = get('References')
  const candidates = extractMessageIds([inReplyTo, references].filter(Boolean).join(' '))
  if (candidates.length === 0) return false

  let logRow: any = null
  for (const cand of candidates) {
    const rows = await outreachSelect<any>('outreach_log', {
      filters: { rfc_message_id: cand },
      limit: 1,
    })
    if (rows.length > 0) {
      logRow = rows[0]
      break
    }
  }
  if (!logRow) return false

  const isAuto = detectAutoReply({
    autoSubmitted: get('Auto-Submitted'),
    precedence: get('Precedence'),
    subject: get('Subject') || '',
  })

  const bodyText = extractPlainText(msg.data.payload) || ''
  const fromEmail = parseEmail(fromHeader)

  await outreachInsert('outreach_replies', {
    outreach_log_id: logRow.id,
    creator_id: logRow.creator_id,
    from_email: fromEmail,
    subject: get('Subject') || null,
    body_text: bodyText.slice(0, 8000),
    rfc_in_reply_to: inReplyTo || null,
    provider_msg_id: messageId,
    raw_headers: JSON.stringify(Object.fromEntries(headers.map((h: any) => [h.name, h.value]))),
    is_auto: isAuto,
    classified: false,
  })

  if (!isAuto && !logRow.replied_at) {
    await outreachUpdate('outreach_log', 'id', logRow.id, {
      replied_at: new Date().toISOString(),
      reply_is_auto: false,
    })

    if (logRow.creator_id) {
      await outreachUpdate('outreach_followup_state', 'creator_id', logRow.creator_id, {
        status: 'responded',
        updated_at: new Date().toISOString(),
      })
    }

    // Update campaign replied count
    if (logRow.campaign_id) {
      await incrementCampaignCounter(logRow.campaign_id)
    }
  }

  return true
}

function detectAutoReply({ autoSubmitted, precedence, subject }: { autoSubmitted?: string; precedence?: string; subject: string }): boolean {
  if (autoSubmitted && autoSubmitted.toLowerCase() !== 'no') return true
  if (precedence && ['auto_reply', 'bulk', 'junk'].includes(precedence.toLowerCase())) return true
  const s = subject.toLowerCase()
  return ['out of office', 'auto-reply', 'automatic reply', 'ooo', 'on leave', 'vacation'].some((k) => s.includes(k))
}

function extractPlainText(payload: any): string {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8')
  }
  for (const part of payload.parts || []) {
    const t = extractPlainText(part)
    if (t) return t
  }
  return ''
}

function extractMessageIds(headerValue: string): string[] {
  return headerValue.match(/<[^>]+>/g) || []
}

function parseEmail(fromHeader: string): string {
  const m = fromHeader.match(/<([^>]+)>/)
  return (m ? m[1] : fromHeader).trim().toLowerCase()
}

async function incrementCampaignCounter(campaignId: string): Promise<void> {
  try {
    const rows = await outreachSelect<any>('outreach_campaigns', {
      filters: { id: campaignId },
      limit: 1,
    })
    if (rows.length === 0) return
    const current = rows[0].replied_count || 0
    await outreachUpdate('outreach_campaigns', 'id', campaignId, {
      replied_count: current + 1,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // Counter failure should not block reply capture
  }
}
