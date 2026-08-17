import { NextResponse } from 'next/server'
import { outreachSelect } from '@/lib/outreach/db'

export async function GET() {
  try {
    const classifications = await outreachSelect<any>('outreach_reply_classifications', {})

    const breakdown: Record<string, number> = {}
    for (const c of classifications) {
      breakdown[c.category] = (breakdown[c.category] || 0) + 1
    }

    const log = await outreachSelect<any>('outreach_log', {})
    const sent = log.length
    const delivered = log.filter((r: any) => r.delivered_at).length
    const replied = log.filter((r: any) => r.replied_at && !r.reply_is_auto).length

    return NextResponse.json({
      classifications: Object.entries(breakdown).map(([category, count]) => ({ category, count })),
      funnel: { sent, delivered, replied },
      replyRate: sent > 0 ? ((replied / sent) * 100).toFixed(2) : '0',
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
