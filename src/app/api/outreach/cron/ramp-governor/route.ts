import { NextResponse } from 'next/server'
import { evaluateAndAdvance, resetDailyGlobal } from '@/workers/rampGovernor'

export async function GET() {
  try {
    const result = await evaluateAndAdvance()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST() {
  try {
    await resetDailyGlobal()
    return NextResponse.json({ ok: true, message: 'Daily global counter reset' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
