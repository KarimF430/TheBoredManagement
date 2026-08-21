/**
 * Gmail sender (tier1 only).
 *
 * Plain text, one link, heavy personalization. Reply is the point.
 * OAuth tokens auto-refresh via getValidMailboxToken.
 */

import { google } from 'googleapis'
import { buildMimeMessage, enforceLinkLimit } from '../mimeBuilder'
import { outreachConfig } from '../config'
import { getValidMailboxToken } from '../gmail-oauth'

interface SendResult {
  providerMessageId: string
  rfcMessageId: string
  threadId?: string
}

interface Mailbox {
  id: string
  email: string
  display_name?: string
  oauth_token_ref: string
}

/**
 * Build a Gmail client from raw token string (legacy / read-only use).
 * For sending, prefer sendGmail() which auto-refreshes tokens.
 */
export function getGmailClient(mailbox: Mailbox) {
  const oauth2Client = new google.auth.OAuth2(
    outreachConfig.gmail.clientId,
    outreachConfig.gmail.clientSecret,
    outreachConfig.gmail.redirectUri,
  )

  // Try to parse as JSON token set, fall back to raw string
  let accessToken = mailbox.oauth_token_ref
  try {
    const parsed = JSON.parse(mailbox.oauth_token_ref)
    accessToken = parsed.access_token || mailbox.oauth_token_ref
  } catch {
    // Legacy raw token
  }

  oauth2Client.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth: oauth2Client })
}

export async function sendGmail(
  mailbox: Mailbox,
  to: string,
  subject: string,
  bodyText: string,
  bodyHtml?: string,
  rfcMessageId?: string
): Promise<SendResult> {
  // No link limit for Gmail - we don't include links in personal-style emails
  // enforceLinkLimit(bodyText, bodyHtml, 1)

  const { accessToken } = await getValidMailboxToken(mailbox.id)

  const oauth2Client = new google.auth.OAuth2(
    outreachConfig.gmail.clientId,
    outreachConfig.gmail.clientSecret,
    outreachConfig.gmail.redirectUri,
  )
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const { raw, rfcMessageId: msgId } = buildMimeMessage({
    from: mailbox.email,
    fromName: mailbox.display_name || mailbox.email.split('@')[0],
    to,
    subject,
    bodyText,
    bodyHtml,
    rfcMessageId,
    // No List-Unsubscribe for Gmail - it signals marketing to Gmail's classifier
  })

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    })

    return {
      providerMessageId: res.data.id || '',
      rfcMessageId: msgId,
      threadId: res.data.threadId || undefined,
    }
  } catch (err) {
    const error = err as { code?: number; status?: number; message?: string }
    if (error.code === 429 || (error.status && error.status >= 500)) {
      throw Object.assign(new Error(`Gmail transient: ${error.message}`), {
        retryable: true,
        code: error.code || error.status,
      })
    }

    if (error.message?.includes('invalid_grant') || error.status === 401) {
      throw Object.assign(new Error(`Gmail OAuth revoked for ${mailbox.email}`), {
        retryable: false,
        oauthRevoked: true,
      })
    }

    throw Object.assign(new Error(`Gmail send failed: ${error.message}`), {
      retryable: false,
    })
  }
}
