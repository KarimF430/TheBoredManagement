import { NextResponse } from 'next/server'
import { reconcile } from '@/workers/reconciler'
import { verifyCronAuth } from '@/lib/outreach/cronAuth'

export async function GET(req: Request) {
  const authError = verifyCronAuth(req)
  if (authError) return authError

  try {
    const result = await reconcile()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
