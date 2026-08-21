/**
 * SES sender (tier2 bulk).
 *
 * Dedicated domain with native bounce/complaint webhooks.
 */

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { buildMimeMessage, enforceLinkLimit } from '../mimeBuilder'
import { outreachConfig } from '../config'

interface SendResult {
  providerMessageId: string
  rfcMessageId: string
  threadId?: string
}

interface Mailbox {
  id: string
  email: string
  display_name?: string
}

let sesClient: SESv2Client | null = null

function getSESClient(): SESv2Client {
  if (!sesClient) {
    sesClient = new SESv2Client({
      region: outreachConfig.ses.region,
      credentials: {
        accessKeyId: outreachConfig.ses.accessKeyId!,
        secretAccessKey: outreachConfig.ses.secretAccessKey!,
      },
    })
  }
  return sesClient
}

export async function sendSES(
  mailbox: Mailbox,
  to: string,
  subject: string,
  bodyText: string,
  bodyHtml?: string,
  rfcMessageId?: string
): Promise<SendResult> {
  enforceLinkLimit(bodyText, bodyHtml, 1)

  const client = getSESClient()
  const { raw, rfcMessageId: msgId } = buildMimeMessage({
    from: mailbox.email,
    fromName: mailbox.display_name || mailbox.email.split('@')[0],
    to,
    subject,
    bodyText,
    bodyHtml,
    rfcMessageId,
    unsubscribeUrl: `https://${mailbox.email.split('@')[1]}/unsubscribe?email=${encodeURIComponent(to)}`,
  })

  try {
    const command = new SendEmailCommand({
      FromEmailAddress: `${mailbox.display_name || mailbox.email.split('@')[0]} <${mailbox.email}>`,
      Destination: { ToAddresses: [to] },
      Content: {
        Raw: { Data: Buffer.from(raw, 'base64url') },
      },
      ConfigurationSetName: mailbox.email.split('@')[1],
    })

    const res = await client.send(command)
    return {
      providerMessageId: res.MessageId || '',
      rfcMessageId: msgId,
    }
  } catch (err) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number }; message?: string }
    if (
      error.name === 'ThrottlingException' ||
      error.$metadata?.httpStatusCode === 429 ||
      (error.$metadata?.httpStatusCode && error.$metadata.httpStatusCode >= 500)
    ) {
      throw Object.assign(new Error(`SES transient: ${error.message}`), {
        retryable: true,
        code: error.$metadata?.httpStatusCode || 429,
      })
    }

    if (error.name === 'MessageRejected') {
      throw Object.assign(new Error(`SES rejected: ${error.message}`), { retryable: false })
    }

    throw Object.assign(new Error(`SES send failed: ${error.message}`), { retryable: false })
  }
}
