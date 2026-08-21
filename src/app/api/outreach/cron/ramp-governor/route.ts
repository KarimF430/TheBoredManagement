import { NextResponse } from 'next/server'
import { evaluateAndAdvance } from '@/workers/rampGovernor'
import { verifyCronAuth } from '@/lib/outreach/cronAuth'

export async function GET(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  try {
    const result = await evaluateAndAdvance()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
