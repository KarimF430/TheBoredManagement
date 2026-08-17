/**
 * Gmail OAuth — per-mailbox token management.
 *
 * Tokens are stored as JSON in outreach_mailboxes.oauth_token_ref.
 * Each mailbox has its own refresh cycle.
 */

import { google } from 'googleapis'
import { outreachConfig } from './config'
import { outreachSelect, outreachUpdate } from './db'

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
]

interface GmailTokenSet {
  access_token: string
  refresh_token?: string
  expiry_date: number
  token_type: string
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    outreachConfig.gmail.clientId,
    outreachConfig.gmail.clientSecret,
    outreachConfig.gmail.redirectUri,
  )
}

export function generateGmailAuthUrl(state: string): string {
  const oauth2 = getOAuth2Client()
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent',
    state,
  })
}

export async function exchangeGmailCode(code: string): Promise<GmailTokenSet> {
  const oauth2 = getOAuth2Client()
  const { tokens } = await oauth2.getToken(code)
  oauth2.setCredentials(tokens)

  return {
    access_token: tokens.access_token || '',
    refresh_token: tokens.refresh_token || undefined,
    expiry_date: tokens.expiry_date || Date.now(),
    token_type: tokens.token_type || 'Bearer',
  }
}

/**
 * Load a mailbox's token set from the DB and auto-refresh if expired.
 * Returns a valid access token + the full token set.
 */
export async function getValidMailboxToken(mailboxId: string): Promise<{
  accessToken: string
  tokenSet: GmailTokenSet
}> {
  const rows = await outreachSelect<any>('outreach_mailboxes', {
    filters: { id: mailboxId },
    limit: 1,
  })

  if (rows.length === 0) throw new Error(`Mailbox ${mailboxId} not found`)

  const mailbox = rows[0]
  const tokenSet = parseTokenSet(mailbox.oauth_token_ref)

  if (!tokenSet) {
    throw new Error(`No OAuth tokens for mailbox ${mailbox.email}. Re-authorize at /api/auth/gmail`)
  }

  const buffer = 5 * 60 * 1000 // refresh 5 min before expiry
  if (tokenSet.expiry_date < Date.now() + buffer && tokenSet.refresh_token) {
    const refreshed = await refreshMailboxToken(mailboxId, tokenSet)
    return { accessToken: refreshed.access_token, tokenSet: refreshed }
  }

  return { accessToken: tokenSet.access_token, tokenSet }
}

async function refreshMailboxToken(
  mailboxId: string,
  tokenSet: GmailTokenSet,
): Promise<GmailTokenSet> {
  if (!tokenSet.refresh_token) {
    throw new Error('No refresh token — re-authorize via Gmail OAuth flow')
  }

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({
    access_token: tokenSet.access_token,
    refresh_token: tokenSet.refresh_token,
  })

  const { credentials } = await oauth2.refreshAccessToken()

  const refreshed: GmailTokenSet = {
    access_token: credentials.access_token || '',
    refresh_token: credentials.refresh_token || tokenSet.refresh_token,
    expiry_date: credentials.expiry_date || Date.now() + 3600_000,
    token_type: credentials.token_type || 'Bearer',
  }

  await outreachUpdate('outreach_mailboxes', 'id', mailboxId, {
    oauth_token_ref: JSON.stringify(refreshed),
    updated_at: new Date().toISOString(),
  })

  return refreshed
}

function parseTokenSet(raw: string | null): GmailTokenSet | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed.access_token) return parsed
    return null
  } catch {
    return null
  }
}
