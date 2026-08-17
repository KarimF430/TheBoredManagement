import { NextRequest, NextResponse } from 'next/server'
import { generateGmailAuthUrl } from '@/lib/outreach/gmail-oauth'

/**
 * GET /api/auth/gmail
 *
 * Initiates Gmail OAuth flow for a sending mailbox.
 * Query params:
 *   mailbox_id — the outreach_mailboxes row to authorize
 *   action=status — check if mailbox has valid tokens (no redirect)
 */
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  const mailboxId = req.nextUrl.searchParams.get('mailbox_id')

  if (action === 'status' && mailboxId) {
    return checkMailboxStatus(mailboxId)
  }

  if (!mailboxId) {
    return NextResponse.json({ error: 'mailbox_id is required' }, { status: 400 })
  }

  const authUrl = generateGmailAuthUrl(mailboxId)

  return NextResponse.redirect(authUrl)
}

async function checkMailboxStatus(mailboxId: string) {
  const { outreachSelect } = await import('@/lib/outreach/db')
  const rows = await outreachSelect<any>('outreach_mailboxes', {
    filters: { id: mailboxId },
    limit: 1,
  })

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 })
  }

  const mb = rows[0]
  let hasTokens = false
  let isExpired = false

  if (mb.oauth_token_ref) {
    try {
      const parsed = JSON.parse(mb.oauth_token_ref)
      hasTokens = !!parsed.access_token
      isExpired = parsed.expiry_date ? parsed.expiry_date < Date.now() : true
    } catch {
      // Legacy raw token string
      hasTokens = true
    }
  }

  return NextResponse.json({
    mailbox_id: mb.id,
    email: mb.email,
    connected: hasTokens,
    expired: isExpired,
  })
}
