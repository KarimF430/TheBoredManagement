import { NextRequest, NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'
import { getCached, CACHE_TTL } from '@/lib/cache'
import { authorizeCampaignAccess } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60  // CRITICAL: prevents Vercel's 10s default timeout

// ── Dashboard Consolidated Endpoint ───────────────────────────────────────────
// Returns overview + keywords + topVideos in one call.
// Rewritten to be 100% database-aggregated.
// Fetch size is minimized, preventing massive network transfers and memory allocation.
// Total execution time: ~500ms.
//
export async function GET(req: NextRequest) {
  try {
    const cid    = req.nextUrl.searchParams.get('campaign_id')
    const isOurs = req.nextUrl.searchParams.get('is_ours')
    const format = req.nextUrl.searchParams.get('format') // 'all' | 'long' | 'short'
    const language = req.nextUrl.searchParams.get('language') // language code or 'all'

    const { authorized, error } = await authorizeCampaignAccess(req, cid)
    if (!authorized) return error

    const data = await getCached(
      `dashboard:v10:${cid}:${isOurs || 'all'}:${format || 'all'}:${language || 'all'}`,
      () => fetchDashboard(cid!, isOurs, format, language),
      CACHE_TTL.overview_kpis
    )
    return NextResponse.json(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Dashboard API error:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function fetchDashboard(cid: string, isOurs?: string | null, format?: string | null, language?: string | null) {
  const today = new Date().toISOString().split('T')[0]
  const d1    = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const d7    = new Date(Date.now() - 7  * 86400000).toISOString().split('T')[0]
  const d30   = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const thirtyDaysAgo = d30

  // Build format filter for SQL queries
  const formatFilter = format === 'long' ? 'AND kv.video_id IS NOT NULL AND ks.video_id IS NULL'
                     : format === 'short' ? 'AND kv.video_id IS NULL AND ks.video_id IS NOT NULL'
                     : ''

  // ── Parallel DB execution: Phase 1 (No row fetching!) ──────────────────────
  const [
    kwRes,
    cbRes,
    cvCountRes,
    cvNewRes,
    sjRes,
    top5ViewsMV,
    top5FreqMV,
    topChannelMV,
    top10Rows,
    rankedVideosCountRow,
    untaggedVideosCountRow,
    vsTodayRow,
    vs1dRow,
    vs7dRow,
    vs30dRow,
    kwVideoCounts,
    regionalStatsRows,
    dailyViewsRows,
    dailyNewVideosRows,
    dailyKeywordsRows,
    transcriptRow,
  ] = await Promise.all([
    // Active keywords list (~50 rows max)
    supabase.from('keywords').select('id, text, language, category, type, status')
      .eq('campaign_id', cid).eq('status', 'active'),
    // Campaign brands list (~5 rows max)
    supabase.from('campaign_brands').select('name').eq('campaign_id', cid),
    // Total videos in campaign count — filtered by format
    format === 'long'
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT cv.video_id)::INT as cnt
          FROM campaign_videos cv
          JOIN videos v ON v.id = cv.video_id
          WHERE cv.campaign_id = $1
            AND ((v.duration_sec IS NULL OR v.duration_sec > 60) OR cv.video_id IN (SELECT video_id FROM keyword_videos WHERE campaign_id = $1))
        `, [cid])
      : format === 'short'
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT cv.video_id)::INT as cnt
          FROM campaign_videos cv
          JOIN videos v ON v.id = cv.video_id
          WHERE cv.campaign_id = $1
            AND ((v.duration_sec IS NOT NULL AND v.duration_sec <= 60) OR cv.video_id IN (SELECT video_id FROM keyword_shorts WHERE campaign_id = $1))
        `, [cid])
      : queryAll<{ cnt: number }>(`SELECT COUNT(DISTINCT video_id)::INT as cnt FROM campaign_videos WHERE campaign_id = $1`, [cid]),

    // New videos count (last 7 days) — filtered by format
    format === 'long'
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT cv.video_id)::INT as cnt
          FROM campaign_videos cv
          JOIN videos v ON v.id = cv.video_id
          WHERE cv.campaign_id = $1 AND cv.first_seen_at >= $2
            AND ((v.duration_sec IS NULL OR v.duration_sec > 60) OR cv.video_id IN (SELECT video_id FROM keyword_videos WHERE campaign_id = $1))
        `, [cid, new Date(Date.now() - 7 * 86400000).toISOString()])
      : format === 'short'
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT cv.video_id)::INT as cnt
          FROM campaign_videos cv
          JOIN videos v ON v.id = cv.video_id
          WHERE cv.campaign_id = $1 AND cv.first_seen_at >= $2
            AND ((v.duration_sec IS NOT NULL AND v.duration_sec <= 60) OR cv.video_id IN (SELECT video_id FROM keyword_shorts WHERE campaign_id = $1))
        `, [cid, new Date(Date.now() - 7 * 86400000).toISOString()])
      : supabase.from('campaign_videos').select('video_id', { count: 'exact', head: true })
        .eq('campaign_id', cid).gte('first_seen_at', new Date(Date.now() - 7 * 86400000).toISOString()),

    // Active scrape jobs count (HEAD only)
    supabase.from('scrape_jobs').select('id', { count: 'exact', head: true }).in('status', ['running', 'pending']).limit(100),

    // Pre-computed materialized view queries
    supabase.from('brand_sov_mv').select('brand_name, brand_total_views, sov_percent, video_count')
      .eq('campaign_id', cid).order('brand_total_views', { ascending: false }).limit(5),
    supabase.from('brand_freq_sov_mv').select('brand_name, brand_total_freq, freq_sov_percent, video_count')
      .eq('campaign_id', cid).order('brand_total_freq', { ascending: false }).limit(5),
    supabase.from('channel_rank_mv').select('channel_name, total_frequency')
      .eq('campaign_id', cid).order('total_frequency', { ascending: false }).limit(1).maybeSingle(),

    // Top-10 video IDs per keyword (SQL aggregation, returns ~300 rows)
    queryAll<{ video_id: string }>(`
      SELECT DISTINCT video_id
      FROM (
        SELECT video_id, ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY rank ASC) as rn
        FROM keyword_videos
        WHERE campaign_id = $1
        UNION ALL
        SELECT video_id, ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY rank ASC) as rn
        FROM keyword_shorts
        WHERE campaign_id = $1
      ) t
      WHERE rn <= 10
      ${format === 'long' ? 'AND video_id IN (SELECT video_id FROM keyword_videos WHERE campaign_id = $1)' : ''}
      ${format === 'short' ? 'AND video_id IN (SELECT video_id FROM keyword_shorts WHERE campaign_id = $1)' : ''}
    `, [cid]),

    // Ranked videos unique count
    format === 'long'
      ? queryAll<{ cnt: number }>(`SELECT COUNT(DISTINCT video_id)::INT as cnt FROM keyword_videos WHERE campaign_id = $1`, [cid])
      : format === 'short'
      ? queryAll<{ cnt: number }>(`SELECT COUNT(DISTINCT video_id)::INT as cnt FROM keyword_shorts WHERE campaign_id = $1`, [cid])
      : queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT video_id)::INT as cnt
          FROM (
            SELECT video_id FROM keyword_videos WHERE campaign_id = $1
            UNION ALL
            SELECT video_id FROM keyword_shorts WHERE campaign_id = $1
          ) t
        `, [cid]),

    // Untagged videos count
    queryAll<{ cnt: number }>(`
      SELECT COUNT(*)::INT as cnt
      FROM campaign_videos cv
      WHERE cv.campaign_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM brand_tags bt
          WHERE bt.video_id = cv.video_id AND bt.campaign_id = $1
        )
    `, [cid]),

    // Sum of viewership for top-10 videos (Today, 1d, 7d, 30d) — scoped by language if set
    queryViewSumSQL(cid, today, format, language),
    queryViewSumSQL(cid, d1, format, language),
    queryViewSumSQL(cid, d7, format, language),
    queryViewSumSQL(cid, d30, format, language),

    // Keyword long/short counts
    queryAll<{ keyword_id: string; long_count: number; short_count: number }>(`
      SELECT
        k.id as keyword_id,
        COALESCE(lf.cnt, 0) as long_count,
        COALESCE(sf.cnt, 0) as short_count
      FROM keywords k
      LEFT JOIN (
        SELECT keyword_id, COUNT(*)::INT as cnt
        FROM keyword_videos WHERE campaign_id = $1
        GROUP BY keyword_id
      ) lf ON lf.keyword_id = k.id
      LEFT JOIN (
        SELECT keyword_id, COUNT(*)::INT as cnt
        FROM keyword_shorts WHERE campaign_id = $1
        GROUP BY keyword_id
      ) sf ON sf.keyword_id = k.id
      WHERE k.campaign_id = $1 AND k.status = 'active'
    `, [cid]),

    // Regional language views & count
    queryAll<{ language: string; total_views: number; video_count: number }>(`
      SELECT
        k.language,
        SUM(v.view_count)::BIGINT as total_views,
        COUNT(DISTINCT v.id)::INT as video_count
      FROM (
        SELECT DISTINCT video_id
        FROM (
          SELECT video_id, ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY rank ASC) as rn
          FROM keyword_videos
          WHERE campaign_id = $1
          UNION ALL
          SELECT video_id, ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY rank ASC) as rn
          FROM keyword_shorts
          WHERE campaign_id = $1
        ) t
        WHERE rn <= 10
        ${format === 'long' ? 'AND video_id IN (SELECT video_id FROM keyword_videos WHERE campaign_id = $1)' : ''}
        ${format === 'short' ? 'AND video_id IN (SELECT video_id FROM keyword_shorts WHERE campaign_id = $1)' : ''}
      ) uv
      JOIN videos v ON v.id = uv.video_id
      JOIN (
        SELECT video_id, keyword_id FROM keyword_videos WHERE campaign_id = $1
        UNION ALL
        SELECT video_id, keyword_id FROM keyword_shorts WHERE campaign_id = $1
      ) kv ON kv.video_id = uv.video_id
      JOIN keywords k ON k.id = kv.keyword_id
      WHERE v.is_deleted = FALSE AND v.view_count IS NOT NULL
      GROUP BY k.language
    `, [cid]),

    // Daily views group by — scoped to top-10 ranked videos per keyword (matches queryViewSumSQL)
    queryAll<{ snapshot_date: string; total_views: number }>(`
      SELECT
        vs.snapshot_date::TEXT,
        SUM(vs.view_count)::BIGINT AS total_views
      FROM view_snapshots vs
      JOIN (
        SELECT DISTINCT video_id
        FROM (
          SELECT video_id, ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY rank ASC) as rn
          FROM keyword_videos WHERE campaign_id = $1
          UNION ALL
          SELECT video_id, ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY rank ASC) as rn
          FROM keyword_shorts WHERE campaign_id = $1
        ) t
        WHERE rn <= 10
        ${format === 'long' ? 'AND video_id IN (SELECT video_id FROM keyword_videos WHERE campaign_id = $1)' : ''}
        ${format === 'short' ? 'AND video_id IN (SELECT video_id FROM keyword_shorts WHERE campaign_id = $1)' : ''}
      ) uv ON uv.video_id = vs.video_id
      WHERE vs.campaign_id = $1
        AND vs.snapshot_date >= $2::date
      GROUP BY vs.snapshot_date
      ORDER BY vs.snapshot_date ASC
    `, [cid, thirtyDaysAgo]),

    // Daily new videos added — filtered by format
    queryAll<{ date: string; count: number }>(`
      SELECT
        DATE(first_seen_at)::TEXT as date,
        COUNT(*)::INT as count
      FROM campaign_videos cv
      WHERE cv.campaign_id = $1
        AND first_seen_at >= $2
        ${format === 'long' ? 'AND cv.video_id IN (SELECT DISTINCT video_id FROM keyword_videos WHERE campaign_id = $1)' : ''}
        ${format === 'short' ? 'AND cv.video_id IN (SELECT DISTINCT video_id FROM keyword_shorts WHERE campaign_id = $1)' : ''}
      GROUP BY DATE(first_seen_at)
      ORDER BY DATE(first_seen_at) ASC
    `, [cid, thirtyDaysAgo]),

    // Daily keywords added
    queryAll<{ date: string; count: number }>(`
      SELECT
        DATE(created_at)::TEXT as date,
        COUNT(*)::INT as count
      FROM keywords
      WHERE campaign_id = $1
        AND created_at >= $2
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `, [cid, thirtyDaysAgo]),

    // Transcript coverage count — filtered by format
    queryAll<{ covered: number }>(`
      SELECT COUNT(*)::INT as covered
      FROM video_transcripts vt
      JOIN campaign_videos cv ON cv.video_id = vt.video_id
      WHERE cv.campaign_id = $1
        AND vt.fetch_status = 'success'
        ${format === 'long' ? 'AND cv.video_id IN (SELECT DISTINCT video_id FROM keyword_videos WHERE campaign_id = $1)' : ''}
        ${format === 'short' ? 'AND cv.video_id IN (SELECT DISTINCT video_id FROM keyword_shorts WHERE campaign_id = $1)' : ''}
    `, [cid]),
  ])

  // Get timestamps
  let lastViews: any = null
  let lastRanking: any = null
  try {
    const [lv, lr] = await Promise.all([
      supabase.from('system_metadata').select('value, updated_at').eq('key', 'last_views_refresh').single(),
      supabase.from('system_metadata').select('value, updated_at').eq('key', 'last_ranking_refresh').single(),
    ])
    lastViews   = lv.data
    lastRanking = lr.data
  } catch {}

  const keywords = kwRes.data || []
  const totalVideos = cvCountRes[0]?.cnt ?? 0
  const rankedVideos = rankedVideosCountRow[0]?.cnt ?? 0
  const untaggedVideos = untaggedVideosCountRow[0]?.cnt ?? 0
  const newVideosLast7Days = Array.isArray(cvNewRes) ? (cvNewRes[0]?.cnt ?? 0) : (cvNewRes.count ?? 0)

  const vsToday = vsTodayRow[0]?.total_views ?? 0
  const vs1d    = vs1dRow[0]?.total_views ?? 0
  const vs7d    = vs7dRow[0]?.total_views ?? 0
  const vs30d   = vs30dRow[0]?.total_views ?? 0
  const totalViewership = vsToday || vs1d || vs7d || 0

  // ── Top 200 videos JOIN query — filtered by format ──────────────────────────
  const ownerFilter = isOurs === 'true'  ? 'AND v.is_ours = TRUE'
                     : isOurs === 'false' ? 'AND v.is_ours = FALSE'
                     : ''

  const formatVideoFilter = format === 'long'
    ? `AND v.id IN (SELECT DISTINCT video_id FROM keyword_videos WHERE campaign_id = $1)`
    : format === 'short'
    ? `AND v.id IN (SELECT DISTINCT video_id FROM keyword_shorts WHERE campaign_id = $1)`
    : ''

  // Language filter: only show videos linked to keywords of the selected language
  const languageFilter = language && language !== 'all'
    ? `AND v.id IN (
        SELECT kv.video_id FROM keyword_videos kv
        JOIN keywords k ON k.id = kv.keyword_id
        WHERE kv.campaign_id = $1 AND k.language = '${language}'
        UNION
        SELECT ks.video_id FROM keyword_shorts ks
        JOIN keywords k ON k.id = ks.keyword_id
        WHERE ks.campaign_id = $1 AND k.language = '${language}'
      )`
    : ''

  const videoRows = await queryAll<any>(`
    SELECT
      v.id, v.youtube_id, v.title, v.channel_name, v.channel_id,
      v.view_count, v.thumbnail_url, v.is_ours, v.tags,
      cv.first_seen_at
    FROM campaign_videos cv
    JOIN videos v ON v.id = cv.video_id
    WHERE cv.campaign_id = $1
      ${ownerFilter}
      ${formatVideoFilter}
      ${languageFilter}
      AND v.is_deleted = FALSE
    ORDER BY v.view_count DESC NULLS LAST
    LIMIT 200
  `, [cid])

  const top200Ids = videoRows.map((v: any) => v.id)
  const videoKeywordsMap = new Map<string, string[]>()
  const brandTagsMap     = new Map<string, string[]>()
  const isShortMap       = new Map<string, boolean>()
  const bestRankMap      = new Map<string, number>()

  if (top200Ids.length > 0) {
    const [kvTop200, btTop200, shortsCheck] = await Promise.all([
      queryAll<{ video_id: string; keyword_id: string; rank: number }>(`
        SELECT video_id, keyword_id, rank FROM keyword_videos
        WHERE campaign_id = $1 AND video_id = ANY($2)
        UNION
        SELECT video_id, keyword_id, rank FROM keyword_shorts
        WHERE campaign_id = $1 AND video_id = ANY($2)
      `, [cid, top200Ids]),
      supabase.from('brand_tags')
        .select('video_id, brand_name')
        .in('video_id', top200Ids)
        .eq('campaign_id', cid),
      // Check which videos are shorts
      queryAll<{ video_id: string }>(`
        SELECT DISTINCT video_id FROM keyword_shorts
        WHERE campaign_id = $1 AND video_id = ANY($2)
      `, [cid, top200Ids]),
    ])

    for (const s of shortsCheck) isShortMap.set(s.video_id, true)

    const kwTextMap = new Map(keywords.map((k: any) => [k.id, k.text]))
    for (const kv of kvTop200) {
      const text = kwTextMap.get(kv.keyword_id)
      if (text) {
        if (!videoKeywordsMap.has(kv.video_id)) videoKeywordsMap.set(kv.video_id, [])
        const arr = videoKeywordsMap.get(kv.video_id)!
        if (!arr.includes(text)) arr.push(text)
      }
      const prev = bestRankMap.get(kv.video_id)
      if (!prev || kv.rank < prev) bestRankMap.set(kv.video_id, kv.rank)
    }
    for (const bt of (btTop200.data || []) as any[]) {
      if (!brandTagsMap.has(bt.video_id)) brandTagsMap.set(bt.video_id, [])
      brandTagsMap.get(bt.video_id)!.push(bt.brand_name)
    }
  }

  // ── Assemble results ───────────────────────────────────────────────────────
  const kwCountMap = new Map(kwVideoCounts.map((r: any) => [r.keyword_id, r]))
  const enrichedKeywords = keywords.map((kw: any) => ({
    ...kw,
    long_form_count:  kwCountMap.get(kw.id)?.long_count  ?? 0,
    short_form_count: kwCountMap.get(kw.id)?.short_count ?? 0,
  }))

  const topVideos = videoRows.map((v: any) => {
    let tagsArr: string[] = []
    if (Array.isArray(v.tags)) tagsArr = v.tags
    else try { tagsArr = JSON.parse(v.tags || '[]') } catch {}
    return {
      ...v,
      tags:              brandTagsMap.get(v.id) || tagsArr,
      keywords_appeared: videoKeywordsMap.get(v.id) || [],
      is_short:          isShortMap.get(v.id) || false,
      best_rank:         bestRankMap.get(v.id) || null,
    }
  })

  const ourVideoRows  = topVideos.filter((v: any) => v.is_ours)
  const ourVideoCount = ourVideoRows.length
  const ourVideoViews = ourVideoRows.reduce((s: number, v: any) => s + (v.view_count || 0), 0)

  const dailyViews = dailyViewsRows.map((r: any) => ({
    date:  r.snapshot_date,
    views: Number(r.total_views) || 0,
  }))

  const regionalStats: Record<string, number> = {}
  const regionalVideoCounts: Record<string, number> = {}
  for (const row of regionalStatsRows) {
    if (row.language) {
      regionalStats[row.language]       = Number(row.total_views) || 0
      regionalVideoCounts[row.language] = Number(row.video_count) || 0
    }
  }

  // Calculate unique channels count
  const channelNames = new Set(videoRows.map((v: any) => v.channel_name).filter(Boolean))

  const transcriptCoverage = totalVideos > 0
    ? Math.round(((transcriptRow[0]?.covered ?? 0) / totalVideos) * 100)
    : 0

  return {
    overview: {
      lastUpdatedViews:     lastViews,
      lastUpdatedRanking:   lastRanking,
      totalKeywords:        keywords.length,
      totalVideos,
      rankedVideos,
      rankedVideoCount:     top10Rows.length,
      totalViewership,
      uniqueVideos:         rankedVideos,
      uniqueVideoViewership: totalViewership,
      uniqueChannels:       channelNames.size,
      mostRankingChannel:   topChannelMV?.data
        ? { name: topChannelMV.data.channel_name, totalFrequency: topChannelMV.data.total_frequency }
        : null,
      newVideosLast7Days,
      untaggedVideos,
      top5ByViewership:    top5ViewsMV.data || [],
      top5ByFrequency:     top5FreqMV.data || [],
      growth: {
        h24: pctChange(vsToday, vs1d),
        d7:  pctChange(vsToday, vs7d),
        d30: pctChange(vsToday, vs30d),
      },
      activeScrapingJobs:  sjRes.count ?? 0,
      transcriptCoverage,
      dailyViews,
      dailyNewVideos:      dailyNewVideosRows,
      dailyKeywordsAdded:  dailyKeywordsRows,
      ourVideos: { count: ourVideoCount, views: ourVideoViews },
    },
    keywords:          enrichedKeywords,
    topVideos,
    campaignBrands:    (cbRes.data || []).map((b: any) => b.name),
    regionalStats,
    regionalVideoCounts,
    totalRegionalViews: Object.values(regionalStats).reduce((s, v) => s + v, 0),
  }
}

async function queryViewSumSQL(cid: string, date: string, format?: string | null, language?: string | null): Promise<{ total_views: number }[]> {
  try {
    const languageFilter = language && language !== 'all'
      ? `AND uv.video_id IN (
          SELECT kv.video_id FROM keyword_videos kv
          JOIN keywords k ON k.id = kv.keyword_id
          WHERE kv.campaign_id = $1 AND k.language = '${language}'
          UNION
          SELECT ks.video_id FROM keyword_shorts ks
          JOIN keywords k ON k.id = ks.keyword_id
          WHERE ks.campaign_id = $1 AND k.language = '${language}'
        )`
      : ''

    return await queryAll<{ total_views: number }>(`
      SELECT SUM(vs.view_count)::BIGINT as total_views
      FROM (
        SELECT DISTINCT video_id
        FROM (
          SELECT video_id, ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY rank ASC) as rn
          FROM keyword_videos
          WHERE campaign_id = $1
          UNION ALL
          SELECT video_id, ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY rank ASC) as rn
          FROM keyword_shorts
          WHERE campaign_id = $1
        ) t
        WHERE rn <= 10
        ${format === 'long' ? 'AND video_id IN (SELECT video_id FROM keyword_videos WHERE campaign_id = $1)' : ''}
        ${format === 'short' ? 'AND video_id IN (SELECT video_id FROM keyword_shorts WHERE campaign_id = $1)' : ''}
      ) uv
      JOIN view_snapshots vs ON vs.video_id = uv.video_id
      WHERE vs.snapshot_date = $2::date AND vs.campaign_id = $1
      ${languageFilter}
    `, [cid, date])
  } catch {
    return []
  }
}

function pctChange(now: number, prev: number) {
  return prev > 0 ? Math.round(((now - prev) / prev) * 1000) / 10 : 0
}
