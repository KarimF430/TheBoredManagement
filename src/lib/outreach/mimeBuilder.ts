/**
 * RFC 5322 MIME message builder with one-click unsubscribe headers.
 * Uses quoted-printable encoding for proper UTF-8 support.
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
  const msgId = options.rfcMessageId || generateMessageId(options.from)
  const date = new Date().toUTCString()
  const domain = extractDomain(options.from)

  const headers = [
    `From: ${formatAddress(options.fromName, options.from)}`,
    `To: <${options.to.toLowerCase()}>`,
    `Subject: ${encodeHeader(options.subject)}`,
    `Date: ${date}`,
    `Message-ID: <${msgId}@${domain}>`,
    `MIME-Version: 1.0`,
    `Return-Path: <${options.from}>`,
    `Reply-To: <${options.from}>`,
  ]

  if (options.unsubscribeUrl) {
    headers.push(
      `List-Unsubscribe: <${options.unsubscribeUrl}>, <mailto:unsub@${domain}?subject=unsubscribe>`
    )
    headers.push('List-Unsubscribe-Post: List-Unsubscribe=One-Click')
  }

  const boundary = `----=_Part_${crypto.randomBytes(8).toString('hex')}`
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)

  let body = headers.join('\r\n') + '\r\n\r\n'

  body += `--${boundary}\r\n`
  body += 'Content-Type: text/plain; charset=UTF-8\r\n'
  body += 'Content-Transfer-Encoding: quoted-printable\r\n\r\n'
  body += quotedPrintableEncode(options.bodyText) + '\r\n\r\n'

  if (options.bodyHtml) {
    body += `--${boundary}\r\n`
    body += 'Content-Type: text/html; charset=UTF-8\r\n'
    body += 'Content-Transfer-Encoding: quoted-printable\r\n\r\n'
    body += quotedPrintableEncode(options.bodyHtml) + '\r\n\r\n'
  }

  body += `--${boundary}--\r\n`

  return { raw: Buffer.from(body).toString('base64url'), rfcMessageId: msgId }
}

function quotedPrintableEncode(text: string): string {
  const lines = text.split(/\r?\n/)
  const encoded = lines.map(line => {
    // Encode line, soft-wrap at 76 chars
    const buf = Buffer.from(line, 'utf-8')
    let result = ''
    let pos = 0
    while (pos < buf.length) {
      const remaining = 76 - (pos === 0 ? 0 : 1) // account for =\r\n soft break
      const chunk = buf.subarray(pos, Math.min(pos + remaining, buf.length))
      const encoded = chunk.toString('latin1').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, c =>
        '=' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')
      )
      if (pos > 0) result += '=\r\n'
      result += encoded
      pos += chunk.length
    }
    return result
  })
  return encoded.join('\r\n')
}

/**
 * RFC 2047 encoded-word for headers with non-ASCII characters.
 */
function encodeHeader(value: string): string {
  // Only encode if non-ASCII characters present
  if (!/[^\x00-\x7F]/.test(value)) return value
  const encoded = Buffer.from(value, 'utf-8').toString('base64')
  return `=?UTF-8?B?${encoded}?=`
}

export function generateMessageId(senderEmail?: string): string {
  const ts = Date.now()
  const rand = crypto.randomBytes(8).toString('hex')
  const domain = senderEmail ? extractDomain(senderEmail) : 'gmail.com'
  return `${ts}.${rand}@${domain}`
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
