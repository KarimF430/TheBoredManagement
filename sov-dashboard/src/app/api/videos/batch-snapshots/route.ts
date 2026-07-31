import { NextRequest, NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { video_ids, campaign_id } = body

    if (!video_ids?.length || !campaign_id) {
      return NextResponse.json({ error: 'video_ids and campaign_id required' }, { status: 400 })
    }

    // Fetch last 2 snapshots for each video in the campaign
    // ANY($2) instead of .in() — the caller passes a full page of video ids,
    // which overflows the PostgREST URL once it exceeds ~300 entries.
    const snapshots = await queryAll<any>(
      `SELECT video_id, view_count, snapshot_date::text AS snapshot_date
       FROM view_snapshots
       WHERE campaign_id = $1 AND video_id = ANY($2)
       ORDER BY snapshot_date DESC
       LIMIT $3`,
      [campaign_id, video_ids, video_ids.length * 2]
    )

    // Group by video_id, take top 2 per video
    const byVideo: Record<string, { view_count: number; snapshot_date: string }[]> = {}
    for (const s of snapshots || []) {
      if (!byVideo[s.video_id]) byVideo[s.video_id] = []
      if (byVideo[s.video_id].length < 2) byVideo[s.video_id].push(s)
    }

    // Compute daily gain
    const result: Record<string, { daily_gain: number | null; latest_views: number; previous_views: number | null }> = {}
    for (const [vid, snaps] of Object.entries(byVideo)) {
      const latest = snaps[0]?.view_count ?? 0
      const previous = snaps[1]?.view_count ?? null
      result[vid] = {
        daily_gain: previous !== null ? latest - previous : null,
        latest_views: latest,
        previous_views: previous,
      }
    }

    return NextResponse.json({ data: result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
