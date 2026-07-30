import { NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'
import { invalidateCampaign } from '@/lib/cache'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { campaign_id } = body
    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const todayStr = nowIso.split('T')[0]

    // 1. Update system metadata timestamp for last_views_refresh
    await supabase.from('system_metadata').upsert({
      key: 'last_views_refresh',
      value: nowIso,
      updated_at: nowIso,
    })

    // 2. Fetch distinct videos for this campaign to update view snapshots
    const rankedVideos = await queryAll<{ video_id: string }>(`
      SELECT DISTINCT video_id FROM (
        SELECT video_id FROM keyword_videos WHERE campaign_id = $1
        UNION ALL
        SELECT video_id FROM keyword_shorts WHERE campaign_id = $1
      ) t
    `, [campaign_id])

    const videoIds = rankedVideos.map(v => v.video_id)

    if (videoIds.length > 0) {
      // Fetch latest view_count from videos table
      const { data: videosData } = await supabase
        .from('videos')
        .select('id, view_count')
        .in('id', videoIds.slice(0, 1000))

      if (videosData && videosData.length > 0) {
        const snapshots = videosData.map((v: any) => ({
          campaign_id,
          video_id: v.id,
          snapshot_date: todayStr,
          view_count: v.view_count || 0,
        }))

        // Upsert snapshots into view_snapshots table
        await supabase
          .from('view_snapshots')
          .upsert(snapshots, { onConflict: 'campaign_id,video_id,snapshot_date' })
      }
    }

    await invalidateCampaign(campaign_id)

    return NextResponse.json({
      success: true,
      timestamp: nowIso,
      updated_count: videoIds.length,
    })
  } catch (err: any) {
    console.error('Error refreshing views:', err)
    return NextResponse.json({ error: err.message || 'Failed to refresh views' }, { status: 500 })
  }
}
