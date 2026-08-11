import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/campaigns/[id]/activity — Get activity feed
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const client = getCPClient()
  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const offset = parseInt(url.searchParams.get('offset') || '0')

  try {
    const { data: activities, error } = await client
      .from('cp_activity_feed')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activities: activities || [] })
  } catch (err) {
    console.error('Get activity error:', err)
    return NextResponse.json({ error: 'Failed to get activity' }, { status: 500 })
  }
}
