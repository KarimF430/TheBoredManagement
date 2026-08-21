import { NextResponse } from 'next/server'
import { runDailyMonitor } from '@/workers/monitor'
import { verifyCronAuth } from '@/lib/outreach/cronAuth'

export async function GET(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  try {
    await runDailyMonitor()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
