/**
 * RFC 5322 MIME message builder with one-click unsubscribe headers.
 */

import crypto from 'crypto'

export interface MimeMessageOptions {
  from: string
  fromName?: string
  to: string
  subject: string
  bodyText: string
  bodyHtml?: string
  rfcMessageId?: string
  unsubscribeUrl?: string
}

export interface MimeMessageResult {
  raw: string
  rfcMessageId: string
}

export function buildMimeMessage(options: MimeMessageOptions): MimeMessageResult {
  const msgId = options.rfcMessageId || generateMessageId()
  const date = new Date().toUTCString()

  const headers = [
    `From: ${formatAddress(options.fromName, options.from)}`,
    `To: <${options.to.toLowerCase()}>`,
    `Subject: ${options.subject}`,
    `Date: ${date}`,
    `Message-ID: <${msgId}>`,
    `MIME-Version: 1.0`,
  ]

  if (options.unsubscribeUrl) {
    headers.push(
      `List-Unsubscribe: <${options.unsubscribeUrl}>, <mailto:unsub@${extractDomain(options.from)}?subject=unsubscribe>`
    )
    headers.push('List-Unsubscribe-Post: List-Unsubscribe=One-Click')
  }

  const boundary = `----=_Part_${crypto.randomBytes(8).toString('hex')}`
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)

  let body = headers.join('\r\n') + '\r\n\r\n'

  body += `--${boundary}\r\n`
  body += 'Content-Type: text/plain; charset=UTF-8\r\n'
  body += 'Content-Transfer-Encoding: 7bit\r\n\r\n'
  body += options.bodyText + '\r\n\r\n'

  if (options.bodyHtml) {
    body += `--${boundary}\r\n`
    body += 'Content-Type: text/html; charset=UTF-8\r\n'
    body += 'Content-Transfer-Encoding: 7bit\r\n\r\n'
    body += options.bodyHtml + '\r\n\r\n'
  }

  body += `--${boundary}--\r\n`

  return { raw: Buffer.from(body).toString('base64url'), rfcMessageId: msgId }
}

export function generateMessageId(): string {
  const ts = Date.now()
  const rand = crypto.randomBytes(8).toString('hex')
  return `${ts}.${rand}@outreach.local`
}

function formatAddress(name: string | undefined, email: string): string {
  if (name) {
    const escaped = name.replace(/"/g, '\\"')
    return `"${escaped}" <${email}>`
  }
  return `<${email}>`
}

function extractDomain(email: string): string {
  return email.split('@')[1] || ''
}

export function countLinks(text: string): number {
  if (!text) return 0
  const matches = text.match(/https?:\/\//gi)
  return matches ? matches.length : 0
}

export function enforceLinkLimit(
  bodyText: string,
  bodyHtml: string | undefined,
  maxLinks = 1
): void {
  const textLinks = countLinks(bodyText)
  const htmlLinks = countLinks(bodyHtml || '')
  if (textLinks > maxLinks || htmlLinks > maxLinks) {
    throw new Error(`Link limit exceeded: text=${textLinks}, html=${htmlLinks}, max=${maxLinks}`)
  }
}
