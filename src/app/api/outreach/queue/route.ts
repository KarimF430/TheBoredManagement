import { NextResponse } from 'next/server'
import { outreachSelect, outreachCount } from '@/lib/outreach/db'

export async function GET() {
  try {
    const queue = await outreachSelect<any>('outreach_send_queue', {})

    const backlog: Record<string, Record<string, number>> = {}
    for (const item of queue) {
      if (!backlog[item.status]) backlog[item.status] = {}
      backlog[item.status][item.tier] = (backlog[item.status][item.tier] || 0) + 1
    }

    const stuck = queue.filter((r: any) => {
      if (r.status !== 'claimed' && r.status !== 'sending') return false
      if (!r.claimed_at) return false
      return new Date(r.claimed_at) < new Date(Date.now() - 5 * 60 * 1000)
    })

    return NextResponse.json({
      backlog,
      stuck: stuck.map((s: any) => ({
        id: s.id,
        status: s.status,
        claimed_at: s.claimed_at,
        claimed_by: s.claimed_by,
        last_error: s.last_error,
      })),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
