import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { fetchVideoMetrics } from '@/lib/youtube-api'
import { extractVideoId } from '@/lib/youtube-api'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const client = getCPClient()

    const { data: deliverables, error: delError } = await client
      .from('cp_deliverables')
      .select('id, live_link, platform, views, likes, comments')
      .eq('campaign_id', campaignId)
      .not('live_link', 'is', null)

    if (delError) throw delError
    if (!deliverables?.length) {
      return NextResponse.json({ refreshed: 0, message: 'No live deliverables to refresh' })
    }

    let refreshed = 0
    const updates: Array<{ id: string; views: number; likes: number; comments: number }> = []

    for (const d of deliverables) {
      const videoId = extractVideoId(d.live_link || '')
      if (!videoId) continue

      const metrics = await fetchVideoMetrics(videoId)
      if (metrics) {
        updates.push({
          id: d.id,
          views: metrics.views,
          likes: metrics.likes,
          comments: metrics.comments,
        })
        refreshed++
      }
    }

    if (updates.length > 0) {
      for (const u of updates) {
        await client
          .from('cp_deliverables')
          .update({
            views: u.views,
            likes: u.likes,
            comments: u.comments,
            last_metrics_refresh: new Date().toISOString(),
          })
          .eq('id', u.id)
      }
    }

    return NextResponse.json({
      refreshed,
      total: deliverables.length,
      message: `Refreshed ${refreshed} of ${deliverables.length} deliverables`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
