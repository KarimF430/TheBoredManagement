import { NextRequest, NextResponse } from 'next/server'
import { cpInsertMany } from '@/lib/cp-db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body = await req.json()
    const { creators } = body

    if (!creators || !Array.isArray(creators) || creators.length === 0) {
      return NextResponse.json({ error: 'creators array is required' }, { status: 400 })
    }

    const rows = creators.map((c: Record<string, unknown>) => ({
      campaign_id: campaignId,
      channel_name: c.channel_name || '',
      channel_url: c.channel_url || '',
      platform: c.platform || 'youtube_long',
      status: 'pending',
      followers: c.followers || 0,
      engagement_rate: c.engagement_rate || 0,
      category: c.category || '',
      notes: c.notes || '',
      created_at: new Date().toISOString(),
    }))

    const inserted = await cpInsertMany('cp_creators', rows)

    return NextResponse.json({
      inserted: inserted.length,
      creators: inserted,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
