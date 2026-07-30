import { NextRequest, NextResponse } from 'next/server'
import { queryAll } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaign_id')
    const format = req.nextUrl.searchParams.get('format') ?? 'all'

    if (!campaignId) {
      return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })
    }

    let allVideoRows: { id: string; youtube_id: string; title: string; channel_name: string; description: string }[] = []

    if (format === 'all') {
      const rows = await queryAll<{ video_id: string }>(
        `SELECT DISTINCT video_id FROM keyword_videos WHERE campaign_id = $1
         UNION
         SELECT DISTINCT video_id FROM keyword_shorts WHERE campaign_id = $1`,
        [campaignId]
      )
      const ids = rows.map(r => r.video_id)
      if (ids.length > 0) {
        allVideoRows = await queryAll<{ id: string; youtube_id: string; title: string; channel_name: string; description: string }>(
          `SELECT v.id, v.youtube_id, v.title, v.channel_name, v.description FROM videos v
           WHERE v.id = ANY($1) AND v.is_deleted = FALSE`,
          [ids]
        )
      }
    } else if (format === 'short') {
      allVideoRows = await queryAll<{ id: string; youtube_id: string; title: string; channel_name: string; description: string }>(
        `SELECT DISTINCT v.id, v.youtube_id, v.title, v.channel_name, v.description FROM videos v
         INNER JOIN keyword_shorts ks ON ks.video_id = v.id
         WHERE ks.campaign_id = $1 AND v.is_deleted = FALSE`,
        [campaignId]
      )
    } else {
      allVideoRows = await queryAll<{ id: string; youtube_id: string; title: string; channel_name: string; description: string }>(
        `SELECT DISTINCT v.id, v.youtube_id, v.title, v.channel_name, v.description FROM videos v
         INNER JOIN keyword_videos kv ON kv.video_id = v.id
         WHERE kv.campaign_id = $1 AND v.is_deleted = FALSE`,
        [campaignId]
      )
    }

    if (allVideoRows.length === 0) {
      return NextResponse.json({ total: 0, videos: [] })
    }

    // Filter out already-analyzed videos (any row in brand_analysis = done)
    const allIds = allVideoRows.map(v => v.id)
    const analyzedRows = await queryAll<{ video_id: string }>(
      `SELECT DISTINCT video_id FROM brand_analysis WHERE video_id = ANY($1)`,
      [allIds]
    )
    const analyzedSet = new Set(analyzedRows.map(r => r.video_id))
    const unanalyzed = allVideoRows.filter(v => !analyzedSet.has(v.id))

    console.log(`[VideoIDs] Total: ${allVideoRows.length}, Already analyzed: ${analyzedSet.size}, Unanalyzed: ${unanalyzed.length}`)

    return NextResponse.json({
      total: unanalyzed.length,
      videos: unanalyzed,
    })
  } catch (e: any) {
    console.error('Video IDs fetch error:', e)
    return NextResponse.json({ error: e.message, total: 0, videos: [] }, { status: 500 })
  }
}
