import { NextResponse } from 'next/server'
import { clearCampaignSession } from '@/lib/cp-auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  return clearCampaignSession(res)
}
