import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getViewCountsOAuth } from '@/lib/youtube-oauth'
import { setSystemMetadata, getSystemMetadata } from '@/lib/migrations'
import { authorizeCampaignAccess } from '@/lib/auth'
import { invalidateCampaign } from '@/lib/cache'

export const runtime = 'nodejs'
export const maxDuration = 60

const BATCH_SIZE = 50          // YouTube videos.list accepts 50 ids per call
const TIME_BUDGET_MS = 45_000  // leave headroom under maxDuration

interface CvRow {
  campaign_id: string
  videos: { id: string; youtube_id: string | null; is_deleted: boolean } | null
}

/**
 * User-triggered "Views Update".
 *
 * Performs the same YouTube-backed refresh as the daily cron, scoped to one
 * campaign and time-boxed so it can return within the function limit.
 *
 * Resumable: unlike an earlier version of this route, progress is persisted
 * per campaign (system_metadata key views_refresh_offset:<campaign_id>), and
 * the video list is explicitly ordered. Without this, a campaign whose pool
 * didn't fit in one time budget would restart from video #1 on every call —
 * the tail of the list was permanently unreachable no matter how many times
 * the button was clicked. Pass `reset: true` to force starting over.
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  try {
    const { campaign_id, reset = false } = await req.json()
    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
    }

    const { authorized, error: authError } = await authorizeCampaignAccess(req, campaign_id)
    if (!authorized) return authError

    const today = new Date().toISOString().split('T')[0]
    const resumeKey = `views_refresh_offset:${campaign_id}`

    const { data: cvRows, error: cvErr } = await supabase
      .from('campaign_videos')
      .select('campaign_id, videos(id, youtube_id, is_deleted)')
      .eq('campaign_id', campaign_id)
      .order('video_id', { ascending: true })

    if (cvErr) throw new Error(cvErr.message)

    // youtube_id → the campaign rows that reference it
    const ytIdMap = new Map<string, Array<{ video_id: string }>>()
    for (const raw of cvRows ?? []) {
      const r = raw as unknown as CvRow
      if (!r.videos || r.videos.is_deleted || !r.videos.youtube_id) continue
      const key = r.videos.youtube_id
      if (!ytIdMap.has(key)) ytIdMap.set(key, [])
      ytIdMap.get(key)!.push({ video_id: r.videos.id })
    }

    // Stable order (insertion order of a Map built from an ordered query) so
    // an offset means the same thing across separate calls.
    const uniqueYtIds = Array.from(ytIdMap.keys())
    if (uniqueYtIds.length === 0) {
      return NextResponse.json({ success: true, updated: 0, processed: 0, remaining: 0, total: 0, completed: true })
    }

    let startOffset = 0
    if (!reset) {
      const stored = await getSystemMetadata(resumeKey)
      startOffset = stored ? parseInt(stored, 10) || 0 : 0
    }
    if (startOffset >= uniqueYtIds.length) startOffset = 0 // stale offset from a shrunk pool

    let updated = 0
    let deleted = 0
    let processed = 0
    let offset = startOffset

    for (; offset < uniqueYtIds.length; offset += BATCH_SIZE) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break

      const batch = uniqueYtIds.slice(offset, offset + BATCH_SIZE)
      const stats = await getViewCountsOAuth(batch)

      const viewMap = new Map<string, number>()
      const deletedIds: string[] = []
      for (const s of stats) {
        if (s.is_deleted) deletedIds.push(s.youtube_id)
        else viewMap.set(s.youtube_id, s.view_count)
      }

      if (deletedIds.length > 0) {
        await supabase.from('videos').update({ is_deleted: true }).in('youtube_id', deletedIds)
        deleted += deletedIds.length
      }

      // Write the fresh counts back, then snapshot them under today's date.
      const snapshots: Array<{ video_id: string; campaign_id: string; view_count: number; snapshot_date: string }> = []
      for (const [ytId, vc] of viewMap) {
        await supabase.from('videos').update({ view_count: vc }).eq('youtube_id', ytId)
        for (const entry of ytIdMap.get(ytId) ?? []) {
          snapshots.push({ video_id: entry.video_id, campaign_id, view_count: vc, snapshot_date: today })
        }
      }
      updated += viewMap.size

      if (snapshots.length > 0) {
        const { error: upsertErr } = await supabase
          .from('view_snapshots')
          .upsert(snapshots, { onConflict: 'video_id,campaign_id,snapshot_date', ignoreDuplicates: false })
        if (upsertErr) {
          // Older deployments have a PK without campaign_id
          const { error: fallbackErr } = await supabase
            .from('view_snapshots')
            .upsert(snapshots, { onConflict: 'video_id,snapshot_date', ignoreDuplicates: false })
          if (fallbackErr) throw new Error(fallbackErr.message)
        }
      }

      processed += batch.length
      await setSystemMetadata(resumeKey, String(offset + batch.length))
    }

    const nextOffset = Math.min(offset, uniqueYtIds.length)
    const completed = nextOffset >= uniqueYtIds.length

    const nowIso = new Date().toISOString()
    if (completed) {
      await supabase.from('system_metadata').delete().eq('key', resumeKey)
      await setSystemMetadata('last_views_refresh', nowIso)
    }
    await invalidateCampaign(campaign_id)

    return NextResponse.json({
      success: true,
      timestamp: nowIso,
      total: uniqueYtIds.length,
      offset: startOffset,
      next_offset: nextOffset,
      processed,
      updated,
      deleted,
      remaining: Math.max(0, uniqueYtIds.length - nextOffset),
      partial: !completed,
      completed,
      elapsed_ms: Date.now() - startedAt,
    })
  } catch (err: any) {
    console.error('Error refreshing views:', err)
    return NextResponse.json({ error: err.message || 'Failed to refresh views' }, { status: 500 })
  }
}
