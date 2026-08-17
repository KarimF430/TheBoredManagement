import { NextResponse } from 'next/server'
import { outreachSelect, outreachCount } from '@/lib/outreach/db'

export async function GET() {
  try {
    const ramp = await outreachSelect<any>('outreach_ramp_state', { limit: 1 })

    // FAST PATH for Command Center "right now" tiles.
    // Reads a small, indexed slice directly — not stale from materialized views.
    // Uses date index on sent_at for efficient filtering.
    const today = new Date().toISOString().slice(0, 10)
    const todayLog = await outreachSelect<any>('outreach_log', {})
      .then((rows) => rows.filter(
        (r: any) => r.sent_at && new Date(r.sent_at).toISOString().slice(0, 10) === today
      ))

    const sent = todayLog.length
    const delivered = todayLog.filter((r: any) => r.delivered_at).length
    const bounced = todayLog.filter((r: any) => r.bounced).length
    const replied = todayLog.filter((r: any) => r.replied_at && !r.reply_is_auto).length

    // Queue backlog — reads from materialized view (trend data, not time-critical)
    const backlogRows = await outreachSelect<any>('mv_outreach_queue_backlog', {})
    const queued = backlogRows
      .filter((r: any) => r.status === 'queued')
      .reduce((sum: number, r: any) => sum + (r.count || 0), 0)

    // Alerts — reads directly (time-critical)
    const alerts = await outreachSelect<any>('outreach_alerts', {
      order: { column: 'created_at', ascending: false },
      limit: 20,
    }).then((rows) => rows.filter((r: any) => !r.acknowledged))

    return NextResponse.json({
      ramp: ramp[0] || { current_step: 0, current_daily_budget: 200, sent_today_global: 0 },
      today: { sent, delivered, bounced, replied },
      backlog: queued,
      alerts: alerts.slice(0, 5),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
