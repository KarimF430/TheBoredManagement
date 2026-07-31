import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { refreshMaterializedViews, setSystemMetadata, getSystemMetadata } from '@/lib/migrations'
import { getViewCountsOAuth } from '@/lib/youtube-oauth'
import { verifyToken } from '@/lib/auth'
import { invalidateL1 } from '@/lib/cache'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Leave room to finish DB writes and respond before the platform kills us. */
const TIME_BUDGET_MS = 45_000

export async function GET(req: NextRequest) {
  return handleCron(req)
}
export async function POST(req: NextRequest) {
  return handleCron(req)
}

async function handleCron(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-vercel-cron-secret')
  const expected = process.env.CRON_SECRET

  if (expected) {
    const secretMatch = secret === expected
    if (!secretMatch) {
      const token = req.cookies.get('sov_session')?.value
      const session = token ? await verifyToken(token) : null
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
  }

  const job = req.nextUrl.searchParams.get('job') ?? 'daily_views'
  const campaignId = req.nextUrl.searchParams.get('campaign_id') ?? undefined

  try {
    if (job === 'daily_views' || job === 'auto') {
      return await runDailyViewsAll(req)
    }

    if (job === 'weekly_refresh') {
      return await runWeeklyRefresh(req, campaignId)
    }

    if (job === 'refresh_views') {
      const result = await refreshMaterializedViews()
      invalidateL1()
      return NextResponse.json({
        ok: result.failed.length === 0,
        message: `Refreshed ${result.refreshed.length} materialized view(s)`,
        ...result,
      })
    }

    if (job === 'sheets_sync') {
      const { syncAllDataToSheets } = await import('@/lib/google-sheets')
      const result = await syncAllDataToSheets()
      return NextResponse.json({ ok: true, ...result })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error(`Cron job "${job}" failed:`, e)
    return NextResponse.json({ ok: false, job, error: msg }, { status: 500 })
  }

  return NextResponse.json({ error: `Unknown job: ${job}` }, { status: 400 })
}

// ── Weekly ranking refresh ────────────────────────────────────────────────
/**
 * Re-runs the complete keyword fetch for every active keyword — of one campaign
 * when `campaign_id` is given, otherwise of every project on the system.
 *
 * Chunked: the caller passes `offset` (and optionally `limit`) and repeats using
 * the returned `next_offset` until `completed` is true. Progress is also stored in
 * system_metadata so an interrupted run can resume without the caller's help.
 */
async function runWeeklyRefresh(req: NextRequest, campaignId?: string) {
  const { runWeeklyKeywordRefreshPg } = await import('@/lib/scrape-pipeline-pg')

  const params = req.nextUrl.searchParams
  const limitRaw = parseInt(params.get('limit') ?? '', 10)
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 5

  const resumeKey = campaignId ? `weekly_refresh_offset:${campaignId}` : 'weekly_refresh_offset'
  let offset = parseInt(params.get('offset') ?? '', 10)
  if (!Number.isFinite(offset) || offset < 0) {
    const stored = await getSystemMetadata(resumeKey)
    offset = stored ? parseInt(stored, 10) || 0 : 0
  }

  const result = await runWeeklyKeywordRefreshPg(campaignId, {
    offset,
    limit,
    timeBudgetMs: TIME_BUDGET_MS,
  })

  if (result.completed) {
    await supabase.from('system_metadata').delete().eq('key', resumeKey)
    try {
      await refreshMaterializedViews()
      await setSystemMetadata('last_ranking_refresh', new Date().toISOString())
    } catch (err) {
      console.error('Materialized view refresh after weekly refresh failed:', err)
    }
    invalidateL1()
  } else {
    await setSystemMetadata(resumeKey, String(result.next_offset))
  }

  return NextResponse.json({ ok: true, job: 'weekly_refresh', ...result })
}

// ── Daily view refresh ────────────────────────────────────────────────────

interface CvRow {
  video_id: string
  campaign_id: string
  videos: {
    id: string
    youtube_id: string | null
    is_deleted: boolean
  } | null
}

/** PostgREST caps a select at 1000 rows — page through the whole table. */
async function loadAllCampaignVideos(campaignId?: string): Promise<CvRow[]> {
  const PAGE = 1000
  const all: CvRow[] = []

  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from('campaign_videos')
      .select('video_id, campaign_id, videos(id, youtube_id, is_deleted)')
      .order('video_id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (campaignId) q = q.eq('campaign_id', campaignId)

    const { data, error } = await q
    if (error) throw new Error(`Failed to load campaign_videos: ${error.message}`)
    if (!data || data.length === 0) break

    all.push(...(data as unknown as CvRow[]))
    if (data.length < PAGE) break
  }

  return all
}

async function runDailyViewsAll(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaign_id') ?? undefined
  const startTime = Date.now()
  const today = new Date().toISOString().split('T')[0]

  await setSystemMetadata('daily_views_start', new Date().toISOString())

  const cvRows = await loadAllCampaignVideos(campaignId)

  if (cvRows.length === 0) {
    return NextResponse.json({
      ok: true, processed: 0, total: 0, total_unique: 0, total_entries: 0,
      completed: true, remaining: 0, elapsed_ms: Date.now() - startTime,
    })
  }

  // One YouTube video may be tracked by several campaigns. It is polled ONCE
  // (unique) and the resulting count is written to every campaign (total).
  const ytIdMap = new Map<string, Array<{ video_id: string; campaign_id: string }>>()
  for (const r of cvRows) {
    if (!r.videos || r.videos.is_deleted || !r.videos.youtube_id) continue
    const key = r.videos.youtube_id
    const entry = { video_id: r.videos.id, campaign_id: r.campaign_id }
    const existing = ytIdMap.get(key)
    if (existing) existing.push(entry)
    else ytIdMap.set(key, [entry])
  }

  const uniqueYtIds = Array.from(ytIdMap.keys())
  const totalEntries = Array.from(ytIdMap.values()).reduce((s, a) => s + a.length, 0)

  // Explicit offset wins; otherwise resume where a previous run stopped.
  const offsetParam = parseInt(req.nextUrl.searchParams.get('offset') ?? '', 10)
  let startOffset = 0
  if (Number.isFinite(offsetParam) && offsetParam >= 0) {
    startOffset = offsetParam
  } else {
    const resumeRaw = await getSystemMetadata('daily_views_resume_offset')
    startOffset = resumeRaw ? parseInt(resumeRaw, 10) || 0 : 0
  }

  // Optional ceiling on how many unique videos this call handles, so the caller
  // can tune chunk size. The time budget still applies on top of it.
  const limitRaw = parseInt(req.nextUrl.searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : Number.MAX_SAFE_INTEGER
  const stopAt = Math.min(uniqueYtIds.length, startOffset + limit)

  const BATCH_SIZE = 50
  let updated = 0
  let deleted = 0
  let processed = 0
  let failedBatches = 0
  let offset = startOffset
  let timedOut = false

  for (; offset < stopAt; offset += BATCH_SIZE) {
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      timedOut = true
      break
    }

    const batchYtIds = uniqueYtIds.slice(offset, offset + BATCH_SIZE)

    try {
      const stats = await getViewCountsOAuth(batchYtIds)

      const viewMap = new Map<string, number>()
      const deletedIds: string[] = []
      for (const stat of stats) {
        if (stat.is_deleted) deletedIds.push(stat.youtube_id)
        else viewMap.set(stat.youtube_id, stat.view_count)
      }

      if (deletedIds.length > 0) {
        await supabase.from('videos').update({ is_deleted: true }).in('youtube_id', deletedIds)
        deleted += deletedIds.length
      }

      for (const [ytId, vc] of viewMap) {
        const { error } = await supabase.from('videos').update({ view_count: vc }).eq('youtube_id', ytId)
        if (!error) updated++
      }

      const vsRows: Array<{
        video_id: string
        campaign_id: string
        view_count: number
        snapshot_date: string
      }> = []
      for (const ytId of batchYtIds) {
        const vc = viewMap.get(ytId)
        if (vc === undefined) continue
        for (const entry of ytIdMap.get(ytId) ?? []) {
          vsRows.push({ video_id: entry.video_id, campaign_id: entry.campaign_id, view_count: vc, snapshot_date: today })
        }
      }

      if (vsRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from('view_snapshots')
          .upsert(vsRows, { onConflict: 'video_id,campaign_id,snapshot_date', ignoreDuplicates: false })
        if (upsertErr) {
          // Older databases have a PK without campaign_id.
          const { error: fallbackErr } = await supabase
            .from('view_snapshots')
            .upsert(vsRows, { onConflict: 'video_id,snapshot_date', ignoreDuplicates: false })
          if (fallbackErr) throw fallbackErr
        }
      }

      processed += batchYtIds.length
    } catch (batchErr) {
      // One bad batch must not cost the whole day's refresh.
      failedBatches++
      processed += batchYtIds.length
      console.error(`Daily views batch at offset ${offset} failed:`, batchErr)
    }

    await setSystemMetadata('daily_views_resume_offset', String(offset + batchYtIds.length))
  }

  const nextOffset = Math.min(offset, uniqueYtIds.length)
  const completed = nextOffset >= uniqueYtIds.length

  if (completed) {
    await supabase.from('system_metadata').delete().eq('key', 'daily_views_resume_offset')
    await setSystemMetadata('last_views_refresh', new Date().toISOString())

    try {
      await refreshMaterializedViews()
    } catch (err) {
      console.error('Materialized view refresh failed:', err)
    }
    invalidateL1()
  }

  return NextResponse.json({
    ok: true,
    processed,
    updated,
    deleted,
    failed_batches: failedBatches,
    total: uniqueYtIds.length,
    total_unique: uniqueYtIds.length,
    total_entries: totalEntries,
    offset: startOffset,
    next_offset: nextOffset,
    remaining: Math.max(0, uniqueYtIds.length - nextOffset),
    completed,
    timed_out: timedOut,
    elapsed_ms: Date.now() - startTime,
  })
}
