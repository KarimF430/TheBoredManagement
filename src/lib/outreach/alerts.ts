/**
 * Alert table + WhatsApp best-effort for warning/critical.
 */

import { outreachInsert } from './db'
import { outreachConfig } from './config'

interface AlertOptions {
  severity: 'info' | 'warning' | 'critical'
  scope: string
  mailboxId?: string
  domainId?: string
  message: string
}

export async function alert(options: AlertOptions): Promise<void> {
  try {
    await outreachInsert('outreach_alerts', {
      severity: options.severity,
      scope: options.scope,
      mailbox_id: options.mailboxId || null,
      domain_id: options.domainId || null,
      message: options.message,
      sent_via_whatsapp: false,
      acknowledged: false,
    })
  } catch (err) {
    console.error('[outreach-alert] db write failed:', (err as Error).message)
  }

  if (options.severity === 'warning' || options.severity === 'critical') {
    await sendWhatsApp(options.severity, options.scope, options.message)
  }
}

async function sendWhatsApp(
  severity: string,
  scope: string,
  message: string
): Promise<void> {
  if (!outreachConfig.alerts.whatsappUrl) return

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    await fetch(outreachConfig.alerts.whatsappUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ severity, scope, message }),
      signal: controller.signal,
    })
    clearTimeout(timer)
  } catch {
    // WhatsApp failure is best-effort — don't block
  }
}
