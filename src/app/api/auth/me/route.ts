import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'

export async function GET(req: NextRequest) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ user: null })
  }
  return NextResponse.json({
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      campaign_ids: session.campaign_ids,
      brand_name: session.brand_name,
    },
  })
}
