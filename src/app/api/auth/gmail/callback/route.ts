import { NextRequest, NextResponse } from 'next/server'
import { exchangeGmailCode } from '@/lib/outreach/gmail-oauth'
import { outreachUpdate } from '@/lib/outreach/db'

/**
 * GET /api/auth/gmail/callback
 *
 * Handles the Gmail OAuth callback. The `state` param carries the mailbox_id.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')
  const state = req.nextUrl.searchParams.get('state') // mailbox_id

  if (error) {
    const redirectUrl = new URL('/campaigns', req.url)
    redirectUrl.searchParams.set('gmail_error', error)
    return NextResponse.redirect(redirectUrl)
  }

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
  }

  try {
    const tokenSet = await exchangeGmailCode(code)

    await outreachUpdate('outreach_mailboxes', 'id', state, {
      oauth_token_ref: JSON.stringify(tokenSet),
      status: 'active',
      paused_reason: null,
      updated_at: new Date().toISOString(),
    })

    const redirectUrl = new URL('/campaigns', req.url)
    redirectUrl.searchParams.set('gmail', 'connected')
    redirectUrl.searchParams.set('mailbox', state)
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('[gmail-oauth] callback failed:', (err as Error).message)
    const redirectUrl = new URL('/campaigns', req.url)
    redirectUrl.searchParams.set('gmail_error', 'exchange_failed')
    return NextResponse.redirect(redirectUrl)
  }
}
