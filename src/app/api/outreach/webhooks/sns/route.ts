import { NextResponse } from 'next/server'
import { outreachSelect, outreachUpdate, outreachInsert } from '@/lib/outreach/db'
import { alert } from '@/lib/outreach/alerts'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (body.Type === 'SubscriptionConfirmation') {
      if (body.SubscribeURL) {
        await fetch(body.SubscribeURL)
      }
      return new Response('Subscribed')
    }

    if (body.Type === 'Notification') {
      const message = typeof body.Message === 'string' ? JSON.parse(body.Message) : body.Message
      await handleSesEvent(message)
      return new Response('OK')
    }

    return new Response('Ignored')
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

async function handleSesEvent(message: any): Promise<void> {
  const eventType = message.eventType || message.notificationType
  const mail = message.mail || {}
  const messageId = mail.messageId

  if (!messageId) return

  const log = await outreachSelect<any>('outreach_log', {
    filters: { provider_message_id: messageId },
    limit: 1,
  })

  if (!log.length) return

  const logRow = log[0]

  if (eventType === 'Bounce') {
    const bounce = message.bounce || {}
    const bounceType = bounce.bounceType || 'Unknown'
    const isHard = bounceType === 'Permanent'
    const bouncedRecipients = bounce.bouncedRecipients || []

    for (const recipient of bouncedRecipients) {
      const email = (recipient.emailAddress || '').toLowerCase()
      await outreachUpdate('outreach_log', 'id', logRow.id, {
        bounced: true,
        bounce_type: bounceType,
        bounce_reason: JSON.stringify(recipient),
      })

      if (isHard) {
        try {
          await outreachInsert('outreach_suppressions', {
            email,
            reason: 'hard_bounce',
            source: 'ses_bounce',
          })
        } catch {
          // Already suppressed
        }
      }
    }

    // Update campaign bounced count
    if (logRow.campaign_id) {
      await incrementCampaignCounter(logRow.campaign_id, 'bounced_count')
    }
  }

  if (eventType === 'Complaint') {
    const complaint = message.complaint || {}
    const complainedRecipients = complaint.complainedRecipients || []

    for (const recipient of complainedRecipients) {
      const email = (recipient.emailAddress || '').toLowerCase()
      await outreachUpdate('outreach_log', 'id', logRow.id, { complaint: true })

      try {
        await outreachInsert('outreach_suppressions', {
          email,
          reason: 'complaint',
          source: 'ses_complaint',
        })
      } catch {
        // Already suppressed
      }

      await alert({
        severity: 'critical',
        scope: 'complaint',
        mailboxId: logRow.mailbox_id,
        message: `Complaint received for ${email}`,
      })
    }
  }

  if (eventType === 'Delivery') {
    await outreachUpdate('outreach_log', 'id', logRow.id, {
      delivered_at: new Date().toISOString(),
    })

    // Update campaign delivered count
    if (logRow.campaign_id) {
      await incrementCampaignCounter(logRow.campaign_id, 'delivered_count')
    }
  }
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
    // Counter failure should not block event processing
  }
}
