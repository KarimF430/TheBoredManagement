import { NextRequest, NextResponse } from 'next/server'
import { queryAll } from '@/lib/supabase'

export const runtime = 'nodejs'

/**
 * Unique videos in a campaign that still need AI brand analysis.
 *
 * Returns the queue (`videos`) plus the totals the progress UI needs to say
 * "12 of 340 unique videos" honestly: `totalUnique` is every distinct video in
 * the campaign for the chosen format, `alreadyAnalyzed` is how many of those
 * already have rows in brand_analysis, and `total` is what is left to do.
 */
export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaign_id')
    const format = req.nextUrl.searchParams.get('format') ?? 'all'

    if (!campaignId) {
      return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })
    }

    type VideoRow = { id: string; youtube_id: string; title: string; channel_name: string; description: string }
    let allVideoRows: VideoRow[] = []

    if (format === 'all') {
      const rows = await queryAll<{ video_id: string }>(
        `SELECT DISTINCT video_id FROM keyword_videos WHERE campaign_id = $1
         UNION
         SELECT DISTINCT video_id FROM keyword_shorts WHERE campaign_id = $1`,
        [campaignId]
      )
      const ids = rows.map(r => r.video_id)
      if (ids.length > 0) {
        allVideoRows = await queryAll<VideoRow>(
          `SELECT v.id, v.youtube_id, v.title, v.channel_name, v.description FROM videos v
           WHERE v.id = ANY($1) AND v.is_deleted = FALSE`,
          [ids]
        )
      }
    } else if (format === 'short') {
      allVideoRows = await queryAll<VideoRow>(
        `SELECT DISTINCT v.id, v.youtube_id, v.title, v.channel_name, v.description FROM videos v
         INNER JOIN keyword_shorts ks ON ks.video_id = v.id
         WHERE ks.campaign_id = $1 AND v.is_deleted = FALSE`,
        [campaignId]
      )
    } else {
      allVideoRows = await queryAll<VideoRow>(
        `SELECT DISTINCT v.id, v.youtube_id, v.title, v.channel_name, v.description FROM videos v
         INNER JOIN keyword_videos kv ON kv.video_id = v.id
         WHERE kv.campaign_id = $1 AND v.is_deleted = FALSE`,
        [campaignId]
      )
    }

    if (allVideoRows.length === 0) {
      return NextResponse.json({ total: 0, totalUnique: 0, alreadyAnalyzed: 0, videos: [] })
    }

    // Any row in brand_analysis counts as done.
    const allIds = allVideoRows.map(v => v.id)
    const analyzedRows = await queryAll<{ video_id: string }>(
      `SELECT DISTINCT video_id FROM brand_analysis WHERE video_id = ANY($1)`,
      [allIds]
    )
    const analyzedSet = new Set(analyzedRows.map(r => r.video_id))
    const unanalyzed = allVideoRows.filter(v => !analyzedSet.has(v.id))

    return NextResponse.json({
      total: unanalyzed.length,
      totalUnique: allVideoRows.length,
      alreadyAnalyzed: analyzedSet.size,
      videos: unanalyzed,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Video IDs fetch error:', e)
    return NextResponse.json({ error: msg, total: 0, totalUnique: 0, alreadyAnalyzed: 0, videos: [] }, { status: 500 })
  }
}
