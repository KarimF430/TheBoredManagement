import { NextResponse } from 'next/server'
import { runDailyMonitor } from '@/workers/monitor'

export async function GET() {
  try {
    await runDailyMonitor()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
