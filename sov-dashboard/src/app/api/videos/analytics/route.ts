import { NextRequest, NextResponse } from 'next/server'
import { queryAll } from '@/lib/supabase'
import { getCached, CACHE_TTL } from '@/lib/cache'
import { authorizeCampaignAccess } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const cid    = req.nextUrl.searchParams.get('campaign_id')
    const format = req.nextUrl.searchParams.get('format') // 'all' | 'long' | 'short'
    const isOurs = req.nextUrl.searchParams.get('is_ours') // 'true' | 'false'
    const limit  = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10)

    const { authorized, error } = await authorizeCampaignAccess(req, cid)
    if (!authorized) return error

    const data = await getCached(
      `videos:analytics:v1:${cid}:${format || 'all'}:${isOurs || 'all'}:${limit}`,
      () => fetchVideoAnalytics(cid!, format, isOurs, limit),
      CACHE_TTL.overview_kpis
    )
    return NextResponse.json(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Video Analytics API error:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function fetchVideoAnalytics(cid: string, format: string | null, isOurs: string | null, limit: number) {
  const today     = new Date().toISOString().split('T')[0]
  const d1        = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const d7        = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const twelveWks = new Date(Date.now() - 84 * 86400000).toISOString().split('T')[0]

  const formatFilter = format === 'long'
    ? 'AND kv.video_id IS NOT NULL AND ks.video_id IS NULL'
    : format === 'short'
    ? 'AND kv.video_id IS NULL AND ks.video_id IS NOT NULL'
    : ''

  const ownerFilter = isOurs === 'true' ? 'AND v.is_ours = TRUE'
    : isOurs === 'false' ? 'AND v.is_ours = FALSE'
    : ''

  // ── Phase 1: Parallel queries ──────────────────────────────────────────────
  const [
    allVideosRes,
    transcriptRes,
    multiKeywordRes,
    taggedRes,
    channelTopRes,
    newVideosRes,
    discoveryTimelineRes,
    summaryStatsRes,
  ] = await Promise.all([
    // All videos in campaign with full details
    queryAll<any>(`
      SELECT
        v.id, v.youtube_id, v.title, v.channel_name, v.channel_id,
        v.view_count, v.like_count, v.comment_count, v.tags,
        v.published_at, v.duration, v.duration_sec, v.thumbnail_url,
        v.is_ours, v.is_deleted, v.search_appearance_count, v.created_at,
        cv.first_seen_at as cv_first_seen_at
      FROM campaign_videos cv
      JOIN videos v ON v.id = cv.video_id
      WHERE cv.campaign_id = $1
        AND v.is_deleted = FALSE
        ${ownerFilter}
        ${format === 'long' ? `AND (v.duration_sec IS NULL OR v.duration_sec > 60 OR v.id IN (SELECT DISTINCT video_id FROM keyword_videos WHERE campaign_id = $1))` : ''}
        ${format === 'short' ? `AND ((v.duration_sec IS NOT NULL AND v.duration_sec <= 60) OR v.id IN (SELECT DISTINCT video_id FROM keyword_shorts WHERE campaign_id = $1))` : ''}
      ORDER BY v.view_count DESC NULLS LAST
    `, [cid]),

    // Transcript coverage
    queryAll<{ covered: number }>(`
      SELECT COUNT(*)::INT as covered
      FROM video_transcripts vt
      JOIN campaign_videos cv ON cv.video_id = vt.video_id
      WHERE cv.campaign_id = $1 AND vt.fetch_status = 'success'
    `, [cid]),

    // Multi-keyword video count (2+ keywords)
    queryAll<{ cnt: number }>(`
      SELECT COUNT(DISTINCT video_id)::INT as cnt
      FROM (
        SELECT video_id, COUNT(DISTINCT keyword_id) as kw_cnt
        FROM keyword_videos WHERE campaign_id = $1
        GROUP BY video_id
        HAVING COUNT(DISTINCT keyword_id) >= 2
      ) t
    `, [cid]),

    // Tagged video count
    queryAll<{ cnt: number }>(`
      SELECT COUNT(DISTINCT video_id)::INT as cnt
      FROM brand_tags WHERE campaign_id = $1
    `, [cid]),

    // Top 10 channels by video count
    queryAll<{ channel: string; video_count: number; total_views: number; avg_views: number }>(`
      SELECT
        v.channel_name as channel,
        COUNT(DISTINCT v.id)::INT as video_count,
        COALESCE(SUM(v.view_count), 0)::BIGINT as total_views,
        COALESCE(ROUND(AVG(v.view_count)), 0)::BIGINT as avg_views
      FROM campaign_videos cv
      JOIN videos v ON v.id = cv.video_id
      WHERE cv.campaign_id = $1
        AND v.is_deleted = FALSE
        AND v.channel_name IS NOT NULL
        ${ownerFilter}
        ${format === 'long' ? `AND (v.duration_sec IS NULL OR v.duration_sec > 60 OR v.id IN (SELECT DISTINCT video_id FROM keyword_videos WHERE campaign_id = $1))` : ''}
        ${format === 'short' ? `AND ((v.duration_sec IS NOT NULL AND v.duration_sec <= 60) OR v.id IN (SELECT DISTINCT video_id FROM keyword_shorts WHERE campaign_id = $1))` : ''}
      GROUP BY v.channel_name
      ORDER BY video_count DESC
      LIMIT 10
    `, [cid]),

    // New videos discovered in last 7 days
    queryAll<{ cnt: number }>(`
      SELECT COUNT(DISTINCT cv.video_id)::INT as cnt
      FROM campaign_videos cv
      WHERE cv.campaign_id = $1 AND cv.first_seen_at >= $2
    `, [cid, new Date(Date.now() - 7 * 86400000).toISOString()]),

    // Discovery timeline: videos discovered per week for last 12 weeks
    queryAll<{ week: string; count: number }>(`
      SELECT
        DATE_TRUNC('week', first_seen_at)::TEXT as week,
        COUNT(DISTINCT video_id)::INT as count
      FROM campaign_videos
      WHERE campaign_id = $1 AND first_seen_at >= $2
      GROUP BY DATE_TRUNC('week', first_seen_at)
      ORDER BY DATE_TRUNC('week', first_seen_at) ASC
    `, [cid, twelveWks]),

    // Aggregate summary stats in a single query
    queryAll<any>(`
      SELECT
        COUNT(*)::INT as total_videos,
        COALESCE(SUM(view_count), 0)::BIGINT as total_views,
        COALESCE(ROUND(AVG(view_count)), 0)::BIGINT as avg_views,
        COALESCE(SUM(like_count), 0)::BIGINT as total_likes,
        COALESCE(SUM(comment_count), 0)::BIGINT as total_comments,
        COALESCE(ROUND(AVG(duration_sec)), 0)::INT as avg_duration_sec,
        SUM(CASE WHEN is_ours = TRUE THEN 1 ELSE 0 END)::INT as our_videos_count,
        SUM(CASE WHEN duration_sec IS NOT NULL AND duration_sec <= 60 THEN 1 ELSE 0 END)::INT as short_form_count,
        SUM(CASE WHEN duration_sec IS NULL OR duration_sec > 60 THEN 1 ELSE 0 END)::INT as long_form_count
      FROM campaign_videos cv
      JOIN videos v ON v.id = cv.video_id
      WHERE cv.campaign_id = $1
        AND v.is_deleted = FALSE
        ${ownerFilter}
        ${format === 'long' ? `AND (v.duration_sec IS NULL OR v.duration_sec > 60 OR v.id IN (SELECT DISTINCT video_id FROM keyword_videos WHERE campaign_id = $1))` : ''}
        ${format === 'short' ? `AND ((v.duration_sec IS NOT NULL AND v.duration_sec <= 60) OR v.id IN (SELECT DISTINCT video_id FROM keyword_shorts WHERE campaign_id = $1))` : ''}
    `, [cid]),
  ])

  // ── Phase 2: Enrich top videos with keyword, rank, brand, snapshot, transcript data ──
  const videoIds = allVideosRes.map((v: any) => v.id)

  let kvAll: any[] = []
  let btAll: any[] = []
  let shortsAll: any[] = []
  let snapshotToday: any[] = []
  let snapshotYesterday: any[] = []
  let transcriptAll: any[] = []

  if (videoIds.length > 0) {
    const [kvRows, btRows, ksRows, vsTodayRows, vsYestRows, vtRows] = await Promise.all([
      queryAll<{ video_id: string; keyword_id: string; rank: number; keyword_count: number }>(`
        SELECT video_id, keyword_id, rank, keyword_count
        FROM keyword_videos
        WHERE campaign_id = $1 AND video_id = ANY($2)
      `, [cid, videoIds]),
      queryAll<{ video_id: string; brand_name: string }>(`
        SELECT video_id, brand_name
        FROM brand_tags
        WHERE campaign_id = $1 AND video_id = ANY($2)
      `, [cid, videoIds]),
      queryAll<{ video_id: string }>(`
        SELECT DISTINCT video_id
        FROM keyword_shorts
        WHERE campaign_id = $1 AND video_id = ANY($2)
      `, [cid, videoIds]),
      queryAll<{ video_id: string; view_count: number; daily_delta: number }>(`
        SELECT video_id, view_count, daily_delta
        FROM view_snapshots
        WHERE campaign_id = $1 AND snapshot_date = $2::date
          AND video_id = ANY($3)
      `, [cid, today, videoIds]),
      queryAll<{ video_id: string; view_count: number }>(`
        SELECT video_id, view_count
        FROM view_snapshots
        WHERE campaign_id = $1 AND snapshot_date = $2::date
          AND video_id = ANY($3)
      `, [cid, d1, videoIds]),
      queryAll<{ video_id: string; fetch_status: string }>(`
        SELECT video_id, fetch_status
        FROM video_transcripts
        WHERE video_id = ANY($1)
      `, [videoIds]),
    ])

    kvAll = kvRows
    btAll = btRows
    shortsAll = ksRows
    snapshotToday = vsTodayRows
    snapshotYesterday = vsYestRows
    transcriptAll = vtRows
  }

  // Build maps for fast lookup
  const shortSet = new Set(shortsAll.map((s: any) => s.video_id))
  const brandMap = new Map<string, string[]>()
  for (const b of btAll) {
    if (!brandMap.has(b.video_id)) brandMap.set(b.video_id, [])
    brandMap.get(b.video_id)!.push(b.brand_name)
  }
  const kwCountMap = new Map<string, number>()
  const bestRankMap = new Map<string, number>()
  const kwTextMap = new Map<string, string[]>()
  for (const kv of kvAll) {
    kwCountMap.set(kv.video_id, (kwCountMap.get(kv.video_id) || 0) + 1)
    const prev = bestRankMap.get(kv.video_id)
    if (!prev || kv.rank < prev) bestRankMap.set(kv.video_id, kv.rank)
    if (!kwTextMap.has(kv.video_id)) kwTextMap.set(kv.video_id, [])
    kwTextMap.get(kv.video_id)!.push(kv.keyword_id)
  }
  const todayMap = new Map(snapshotToday.map((s: any) => [s.video_id, s]))
  const yestMap  = new Map(snapshotYesterday.map((s: any) => [s.video_id, s]))
  const transcriptMap = new Map(transcriptAll.map((t: any) => [t.video_id, t.fetch_status]))

  // ── Compute distributions ────────────────────────────────────────────────────
  const videos = allVideosRes
  const totalVideos = videos.length

  // Views distribution
  const viewsRanges = ['0-1K', '1K-10K', '10K-50K', '50K-100K', '100K-500K', '500K-1M', '1M+']
  const viewsCounts = [0, 0, 0, 0, 0, 0, 0]
  for (const v of videos) {
    const vc = v.view_count || 0
    if (vc < 1000)             viewsCounts[0]++
    else if (vc < 10000)       viewsCounts[1]++
    else if (vc < 50000)       viewsCounts[2]++
    else if (vc < 100000)      viewsCounts[3]++
    else if (vc < 500000)      viewsCounts[4]++
    else if (vc < 1000000)     viewsCounts[5]++
    else                       viewsCounts[6]++
  }
  const views_distribution = viewsRanges.map((range, i) => ({ range, count: viewsCounts[i] }))

  // Duration distribution
  const durRanges = ['0-1min', '1-3min', '3-5min', '5-10min', '10-20min', '20min+']
  const durCounts = [0, 0, 0, 0, 0, 0]
  for (const v of videos) {
    const ds = v.duration_sec || 0
    if (ds <= 60)              durCounts[0]++
    else if (ds <= 180)        durCounts[1]++
    else if (ds <= 300)        durCounts[2]++
    else if (ds <= 600)        durCounts[3]++
    else if (ds <= 1200)       durCounts[4]++
    else                       durCounts[5]++
  }
  const duration_distribution = durRanges.map((range, i) => ({ range, count: durCounts[i] }))

  // Engagement distribution (likes + comments) / views * 100
  const engRanges = ['0%', '0-0.1%', '0.1-0.5%', '0.5-1%', '1-2%', '2-5%', '5%+']
  const engCounts = [0, 0, 0, 0, 0, 0, 0]
  let totalEngRate = 0
  let engRatedVideos = 0
  for (const v of videos) {
    const views = v.view_count || 0
    const likes = v.like_count || 0
    const comments = v.comment_count || 0
    const rate = views > 0 ? ((likes + comments) / views) * 100 : 0
    if (views > 0) {
      totalEngRate += rate
      engRatedVideos++
    }
    if (rate === 0)              engCounts[0]++
    else if (rate < 0.1)        engCounts[1]++
    else if (rate < 0.5)        engCounts[2]++
    else if (rate < 1)          engCounts[3]++
    else if (rate < 2)          engCounts[4]++
    else if (rate < 5)          engCounts[5]++
    else                        engCounts[6]++
  }
  const engagement_distribution = engRanges.map((range, i) => ({ range, count: engCounts[i] }))

  // ── Build top videos ────────────────────────────────────────────────────────
  const topVideos = videos.slice(0, limit).map((v: any) => {
    const views = v.view_count || 0
    const likes = v.like_count || 0
    const comments = v.comment_count || 0
    const engRate = views > 0 ? (((likes + comments) / views) * 100) : 0

    const todaySnap  = todayMap.get(v.id)
    const yestSnap   = yestMap.get(v.id)
    const dailyDelta = todaySnap && yestSnap ? todaySnap.view_count - yestSnap.view_count : (todaySnap?.daily_delta ?? null)

    return {
      id:              v.id,
      youtube_id:      v.youtube_id,
      title:           v.title,
      channel_name:    v.channel_name,
      channel_id:      v.channel_id,
      view_count:      v.view_count,
      like_count:      v.like_count,
      comment_count:   v.comment_count,
      tags:            v.tags,
      published_at:    v.published_at,
      duration:        v.duration,
      duration_sec:    v.duration_sec,
      thumbnail_url:   v.thumbnail_url,
      is_ours:         v.is_ours,
      is_deleted:      v.is_deleted,
      created_at:      v.created_at,
      engagement_rate: Math.round(engRate * 100) / 100,
      keyword_count:   kwCountMap.get(v.id) || 0,
      brands:          brandMap.get(v.id) || [],
      best_rank:       bestRankMap.get(v.id) || null,
      is_short:        shortSet.has(v.id) || (v.duration_sec != null && v.duration_sec <= 60),
      daily_delta:     dailyDelta,
      transcript_status: transcriptMap.get(v.id) || null,
    }
  })

  // ── Summary ─────────────────────────────────────────────────────────────────
  const stats       = summaryStatsRes[0] || {}
  const totalViews  = Number(stats.total_views) || 0
  const totalLikes  = Number(stats.total_likes) || 0
  const totalComments = Number(stats.total_comments) || 0
  const avgViews    = Number(stats.avg_views) || 0
  const avgDurSec   = Number(stats.avg_duration_sec) || 0
  const ourCount    = Number(stats.our_videos_count) || 0
  const shortCount  = Number(stats.short_form_count) || 0
  const longCount   = Number(stats.long_form_count) || 0

  // Median views
  const sortedViews = videos.map((v: any) => v.view_count || 0).sort((a: number, b: number) => a - b)
  const medianViews = sortedViews.length > 0
    ? sortedViews.length % 2 === 0
      ? Math.round((sortedViews[sortedViews.length / 2 - 1] + sortedViews[sortedViews.length / 2]) / 2)
      : sortedViews[Math.floor(sortedViews.length / 2)]
    : 0

  // Engagement rate
  const avgEngagementRate = engRatedVideos > 0 ? Math.round((totalEngRate / engRatedVideos) * 100) / 100 : 0

  // Transcript coverage
  const transcriptCovPct = totalVideos > 0
    ? Math.round(((transcriptRes[0]?.covered ?? 0) / totalVideos) * 100)
    : 0

  // Brand coverage
  const taggedCount = multiKeywordRes[0]?.cnt ?? 0 // reused var for tagged from phase 1
  const taggedFromPhase1 = taggedRes[0]?.cnt ?? 0
  const untaggedCount = totalVideos - taggedFromPhase1

  // Top channel
  const topChannel = channelTopRes.length > 0
    ? { name: channelTopRes[0].channel, video_count: channelTopRes[0].video_count }
    : { name: '', video_count: 0 }

  return {
    summary: {
      total_videos:           totalVideos,
      total_views:            totalViews,
      avg_views:              avgViews,
      median_views:           medianViews,
      total_likes:            totalLikes,
      total_comments:         totalComments,
      avg_engagement_rate:    avgEngagementRate,
      avg_duration_sec:       avgDurSec,
      transcript_coverage_pct: transcriptCovPct,
      multi_keyword_count:    multiKeywordRes[0]?.cnt ?? 0,
      tagged_count:           taggedFromPhase1,
      untagged_count:         untaggedCount,
      long_form_count:        longCount,
      short_form_count:       shortCount,
      our_videos_count:       ourCount,
      top_channel:            topChannel,
      new_videos_7d:          newVideosRes[0]?.cnt ?? 0,
    },
    views_distribution,
    duration_distribution,
    engagement_distribution,
    channel_top10: channelTopRes,
    brand_coverage: {
      tagged:   taggedFromPhase1,
      untagged: untaggedCount,
    },
    discovery_timeline: discoveryTimelineRes.map((r: any) => ({
      week:  r.week,
      count: r.count,
    })),
    top_videos: topVideos,
  }
}
