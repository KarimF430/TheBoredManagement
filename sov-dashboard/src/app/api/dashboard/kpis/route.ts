import { NextRequest, NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'
import { getCached, CACHE_TTL, cacheKey } from '@/lib/cache'
import { authorizeCampaignAccess } from '@/lib/auth'
import { parseLanguageParam } from '@/lib/keyword-utils'

export const runtime = 'nodejs'
export const maxDuration = 30

// ── Fast KPI endpoint: returns critical numbers in ~200–400ms ──────────────────
// Uses only COUNT queries + materialized views (no full table scans).
// The client calls this FIRST so KPI cards are visible almost instantly,
// then separately calls /api/dashboard for the full charts + video list.

export async function GET(req: NextRequest) {
  try {
    const cid    = req.nextUrl.searchParams.get('campaign_id')
    const format = req.nextUrl.searchParams.get('format') // 'all' | 'long' | 'short'
    const language = parseLanguageParam(req.nextUrl.searchParams.get('language'))
    if (!cid) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })
    const { authorized, error: authError } = await authorizeCampaignAccess(req, cid)
    if (!authorized) return authError!

    const key = cacheKey.kpis(cid) + `:${format || 'all'}:${language || 'all'}`
    const data = await getCached(key, () => fetchKpis(cid, format, language), CACHE_TTL.overview_kpis)

    return NextResponse.json(data, {
      headers: {
        // Edge-cached for 2 minutes, stale OK for 10 minutes while revalidating
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('KPIs API error:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function fetchKpis(cid: string, format?: string | null, language?: string | null) {
  const today = new Date().toISOString().split('T')[0]
  const d1 = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const d7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  // Format filter for video counts
  const formatVideoSubquery = format === 'long'
    ? `AND cv.video_id IN (SELECT DISTINCT video_id FROM keyword_videos WHERE campaign_id = $1)`
    : format === 'short'
    ? `AND cv.video_id IN (SELECT DISTINCT video_id FROM keyword_shorts WHERE campaign_id = $1)`
    : ''

  // Build the format-filtered video ID subquery for view snapshots
  const formatVideoIdsSubquery = format === 'long' || format === 'short'
    ? `AND vs.video_id IN (SELECT DISTINCT video_id FROM ${
        format === 'long' ? 'keyword_videos' : 'keyword_shorts'
      } WHERE campaign_id = $1)`
    : ''

  // Restrict to videos reached by keywords in the selected language. `language`
  // is validated by parseLanguageParam before it gets here.
  const langVideoIds = (col: string) => language
    ? `AND ${col} IN (
        SELECT kv.video_id FROM keyword_videos kv
        JOIN keywords k ON k.id = kv.keyword_id
        WHERE kv.campaign_id = $1 AND k.language = '${language}'
        UNION
        SELECT ks.video_id FROM keyword_shorts ks
        JOIN keywords k ON k.id = ks.keyword_id
        WHERE ks.campaign_id = $1 AND k.language = '${language}'
      )`
    : ''
  const langCvFilter = langVideoIds('cv.video_id')
  const langVsFilter = langVideoIds('vs.video_id')

  // All queries run in parallel — each is a COUNT or materialized view read.
  const [
    kwRes,        // keyword count
    cvRes,        // total video count (format-filtered)
    uvRes,        // unique video count (format-filtered)
    cvNewRes,     // new videos (7 days, format-filtered)
    btRes,        // tagged video count
    top5Views,    // brand SOV by views (materialized view)
    top5Freq,     // brand SOV by freq (materialized view)
    topChannel,   // most ranking channel (materialized view)
    sjRes,        // active scrape jobs count
    metaRes,      // last refresh timestamps
    vsTodayRes,   // today's view snapshot total (format-filtered)
    vs1dRes,      // yesterday's view snapshot total (format-filtered)
    vs7dRes,      // 7-day-ago view snapshot total (format-filtered)
  ] = await Promise.all([
    (() => {
      let q = supabase.from('keywords')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', cid).eq('status', 'active')
      if (language) q = q.eq('language', language)
      return q
    })(),

    // Format-filtered total ranking positions count
    format === 'long'
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(*)::INT as cnt
          FROM keyword_videos
          WHERE campaign_id = $1 ${langKeywordFilter}
        `, [cid])
      : format === 'short'
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(*)::INT as cnt
          FROM keyword_shorts
          WHERE campaign_id = $1 ${langKeywordFilter}
        `, [cid])
      : queryAll<{ cnt: number }>(`
          SELECT COUNT(*)::INT as cnt
          FROM (
            SELECT video_id FROM keyword_videos WHERE campaign_id = $1 ${langKeywordFilter}
            UNION ALL
            SELECT video_id FROM keyword_shorts WHERE campaign_id = $1 ${langKeywordFilter}
          ) t
        `, [cid]),

    // Format-filtered unique videos count
    format === 'long'
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT video_id)::INT as cnt
          FROM keyword_videos
          WHERE campaign_id = $1 ${langKeywordFilter}
        `, [cid])
      : format === 'short'
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT video_id)::INT as cnt
          FROM keyword_shorts
          WHERE campaign_id = $1 ${langKeywordFilter}
        `, [cid])
      : queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT video_id)::INT as cnt
          FROM (
            SELECT video_id FROM keyword_videos WHERE campaign_id = $1 ${langKeywordFilter}
            UNION ALL
            SELECT video_id FROM keyword_shorts WHERE campaign_id = $1 ${langKeywordFilter}
          ) t
        `, [cid]),

    // Format-filtered new videos (7 days)
    format === 'long'
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT cv.video_id)::INT as cnt
          FROM campaign_videos cv
          JOIN videos v ON v.id = cv.video_id
          WHERE cv.campaign_id = $1 AND cv.first_seen_at >= $2
            AND ((v.duration_sec IS NULL OR v.duration_sec > 60) OR cv.video_id IN (SELECT video_id FROM keyword_videos WHERE campaign_id = $1))
            ${langCvFilter}
        `, [cid, new Date(Date.now() - 7 * 86400000).toISOString()])
      : format === 'short'
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT cv.video_id)::INT as cnt
          FROM campaign_videos cv
          JOIN videos v ON v.id = cv.video_id
          WHERE cv.campaign_id = $1 AND cv.first_seen_at >= $2
            AND ((v.duration_sec IS NOT NULL AND v.duration_sec <= 60) OR cv.video_id IN (SELECT video_id FROM keyword_shorts WHERE campaign_id = $1))
            ${langCvFilter}
        `, [cid, new Date(Date.now() - 7 * 86400000).toISOString()])
      : language
      ? queryAll<{ cnt: number }>(`
          SELECT COUNT(DISTINCT cv.video_id)::INT as cnt
          FROM campaign_videos cv
          WHERE cv.campaign_id = $1 AND cv.first_seen_at >= $2 ${langCvFilter}
        `, [cid, new Date(Date.now() - 7 * 86400000).toISOString()])
      : supabase.from('campaign_videos')
          .select('video_id', { count: 'exact', head: true })
          .eq('campaign_id', cid)
          .gte('first_seen_at', new Date(Date.now() - 7 * 86400000).toISOString()),

    supabase.from('brand_tags')
      .select('video_id', { count: 'exact', head: true })
      .eq('campaign_id', cid),

    // Materialized views: pre-computed, instant
    supabase.from('brand_sov_mv')
      .select('brand_name, brand_total_views, sov_percent, video_count')
      .eq('campaign_id', cid)
      .order('brand_total_views', { ascending: false })
      .limit(5),

    supabase.from('brand_freq_sov_mv')
      .select('brand_name, brand_total_freq, freq_sov_percent, video_count')
      .eq('campaign_id', cid)
      .order('brand_total_freq', { ascending: false })
      .limit(5),

    supabase.from('channel_rank_mv')
      .select('channel_name, total_frequency')
      .eq('campaign_id', cid)
      .order('total_frequency', { ascending: false })
      .limit(1)
      .maybeSingle() as any,

    supabase.from('scrape_jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['running', 'pending']),

    supabase.from('system_metadata')
      .select('key, value, updated_at')
      .in('key', ['last_views_refresh', 'last_ranking_refresh']),

    // View snapshot sums — filtered by format using SQL
    queryAll<{ total_views: number }>(`
      SELECT COALESCE(SUM(vs.view_count), 0)::BIGINT as total_views
      FROM view_snapshots vs
      WHERE vs.campaign_id = $1 AND vs.snapshot_date = $2::date
      ${formatVideoIdsSubquery}
      ${langVsFilter}
    `, [cid, today]),
    queryAll<{ total_views: number }>(`
      SELECT COALESCE(SUM(vs.view_count), 0)::BIGINT as total_views
      FROM view_snapshots vs
      WHERE vs.campaign_id = $1 AND vs.snapshot_date = $2::date
      ${formatVideoIdsSubquery}
      ${langVsFilter}
    `, [cid, d1]),
    queryAll<{ total_views: number }>(`
      SELECT COALESCE(SUM(vs.view_count), 0)::BIGINT as total_views
      FROM view_snapshots vs
      WHERE vs.campaign_id = $1 AND vs.snapshot_date = $2::date
      ${formatVideoIdsSubquery}
      ${langVsFilter}
    `, [cid, d7]),
  ])

  // Extract counts — handle both Supabase head query and raw SQL result shapes
  const totalVideos = Array.isArray(cvRes) ? (cvRes[0]?.cnt ?? 0) : (cvRes.count ?? 0)
  const newVideosLast7Days = Array.isArray(cvNewRes) ? (cvNewRes[0]?.cnt ?? 0) : (cvNewRes.count ?? 0)

  const vsToday = vsTodayRes[0]?.total_views ?? 0
  const vs1d    = vs1dRes[0]?.total_views ?? 0
  const vs7d    = vs7dRes[0]?.total_views ?? 0

  const meta: Record<string, { value: string; updated_at: string }> = {}
  ;(metaRes.data || []).forEach((m: any) => {
    meta[m.key] = { value: m.value, updated_at: m.updated_at }
  })

  const taggedCount = btRes.count ?? 0

  return {
    lastUpdatedViews:   meta['last_views_refresh']   ?? null,
    lastUpdatedRanking: meta['last_ranking_refresh'] ?? null,
    totalKeywords:       kwRes.count ?? 0,
    totalVideos,
    rankedVideos:        0,
    rankedVideoCount:    0,
    totalViewership:     vsToday || vs1d || 0,
    uniqueVideos:        uvRes[0]?.cnt ?? 0,
    uniqueVideoViewership: vsToday || vs1d || 0,
    uniqueChannels:      0,
    mostRankingChannel:  topChannel?.data
      ? { name: topChannel.data.channel_name, totalFrequency: topChannel.data.total_frequency }
      : null,
    newVideosLast7Days,
    untaggedVideos:      Math.max(0, totalVideos - taggedCount),
    top5ByViewership:    top5Views.data ?? [],
    top5ByFrequency:     top5Freq.data ?? [],
    growth: {
      h24: pctChange(vsToday, vs1d),
      d7:  pctChange(vsToday, vs7d),
      d30: 0,
    },
    activeScrapingJobs:  sjRes.count ?? 0,
    transcriptCoverage:  0,
    dailyViews:          [],
    dailyNewVideos:      [],
    dailyKeywordsAdded:  [],
    ourVideos:           { count: 0, views: 0 },
    _isKpisOnly:         true,
  }
}

function pctChange(now: number, prev: number) {
  return prev > 0 ? Math.round(((now - prev) / prev) * 1000) / 10 : null
}
