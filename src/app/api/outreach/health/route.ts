import { NextResponse } from 'next/server'
import { outreachSelect } from '@/lib/outreach/db'

export async function GET() {
  try {
    const mailboxes = await outreachSelect<any>('outreach_mailboxes', {})
    const domains = await outreachSelect<any>('outreach_sending_domains', {})

    const healthRows = await outreachSelect<any>('outreach_mailbox_health_daily', {})
    const latestHealth = new Map<string, any>()
    for (const h of healthRows) {
      const existing = latestHealth.get(h.mailbox_id)
      if (!existing || new Date(h.stat_date) > new Date(existing.stat_date)) {
        latestHealth.set(h.mailbox_id, h)
      }
    }

    const mailboxHealth = mailboxes.map((m: any) => ({
      ...m,
      ...(latestHealth.get(m.id) || {}),
    }))

    return NextResponse.json({
      mailboxes: mailboxHealth,
      domains,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
