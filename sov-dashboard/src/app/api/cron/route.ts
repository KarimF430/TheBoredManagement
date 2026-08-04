import { NextRequest, NextResponse } from 'next/server'
import { supabase, queryAll, batchUpsert } from '@/lib/supabase'
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
    try { await setSystemMetadata(resumeKey, String(result.next_offset)) } catch {}
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

/**
 * Load only RANKED videos (from keyword_videos + keyword_shorts), not all pool videos.
 * This avoids wasting API quota on videos not currently in any keyword's top 10.
 */
async function loadAllCampaignVideos(campaignId?: string): Promise<CvRow[]> {
  const campaignFilter = campaignId ? `AND kv.campaign_id = $1` : ''
  const params = campaignId ? [campaignId] : []

  const rows = await queryAll<{ video_id: string; campaign_id: string; youtube_id: string | null; is_deleted: boolean }>(
    `SELECT DISTINCT kv.video_id, kv.campaign_id, v.youtube_id, v.is_deleted
     FROM (
       SELECT video_id, campaign_id FROM keyword_videos WHERE true ${campaignFilter}
       UNION
       SELECT video_id, campaign_id FROM keyword_shorts WHERE true ${campaignFilter}
     ) kv
     INNER JOIN videos v ON v.id = kv.video_id
     WHERE v.is_deleted = FALSE AND v.youtube_id IS NOT NULL`,
    params
  )

  return rows.map(r => ({
    video_id: r.video_id,
    campaign_id: r.campaign_id,
    videos: { id: r.video_id, youtube_id: r.youtube_id, is_deleted: r.is_deleted },
  }))
}

async function runDailyViewsAll(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaign_id') ?? undefined
  const startTime = Date.now()
  const today = new Date().toISOString().split('T')[0]

  try { await setSystemMetadata('daily_views_start', new Date().toISOString()) } catch {}

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

      // Batch update: mark deleted videos
      if (deletedIds.length > 0) {
        await queryAll(`UPDATE videos SET is_deleted = TRUE WHERE youtube_id = ANY($1)`, [deletedIds])
        deleted += deletedIds.length
      }

      // Batch update: set view counts with CASE/WHEN (single SQL statement)
      if (viewMap.size > 0) {
        const entries = Array.from(viewMap.entries())
        const sqlParams: (string | number)[] = []
        const cases = entries.map(([id, count], idx) => {
          sqlParams.push(id, count)
          return `WHEN youtube_id = $${idx * 2 + 1} THEN $${idx * 2 + 2}`
        }).join(' ')
        await queryAll(
          `UPDATE videos SET view_count = CASE ${cases} ELSE view_count END WHERE youtube_id = ANY($${sqlParams.length + 1})`,
          [...sqlParams, entries.map(e => e[0])]
        )
        updated += viewMap.size
      }

      // Batch upsert: view_snapshots (one row per video/campaign pair)
      const vsRows: Record<string, any>[] = []
      for (const ytId of batchYtIds) {
        const vc = viewMap.get(ytId)
        if (vc === undefined) continue
        for (const entry of ytIdMap.get(ytId) ?? []) {
          vsRows.push({ video_id: entry.video_id, campaign_id: entry.campaign_id, view_count: vc, snapshot_date: today })
        }
      }
      if (vsRows.length > 0) {
        await batchUpsert('view_snapshots', vsRows, 'video_id,campaign_id,snapshot_date')
      }

      processed += batchYtIds.length
    } catch (batchErr) {
      // One bad batch must not cost the whole day's refresh.
      failedBatches++
      processed += batchYtIds.length
      console.error(`Daily views batch at offset ${offset} failed:`, batchErr)
    }

    try { await setSystemMetadata('daily_views_resume_offset', String(offset + batchYtIds.length)) } catch {}
  }

  const nextOffset = Math.min(offset, uniqueYtIds.length)
  const completed = nextOffset >= uniqueYtIds.length

  if (completed) {
    await supabase.from('system_metadata').delete().eq('key', 'daily_views_resume_offset')
    try { await setSystemMetadata('last_views_refresh', new Date().toISOString()) } catch {}

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
