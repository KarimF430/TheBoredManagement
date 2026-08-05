import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCached, cacheKey, CACHE_TTL } from '@/lib/cache'

/**
 * PostgREST returns at most 1000 rows per request. Every table read here can
 * exceed that (200 keywords × 20 ranked videos = 4000 rows), so each one pages
 * until the source is exhausted — otherwise the dashboard silently reports the
 * first 1000 rows as if they were the whole campaign.
 */
const PAGE_SIZE = 1000

async function selectAll<T = any>(
  table: string,
  columns: string,
  apply: (q: any) => any
): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await apply(
      supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1)
    )
    if (error) {
      console.error(`Overview: failed to read ${table}:`, error.message)
      break
    }
    if (!data || data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < PAGE_SIZE) break
  }
  return all
}

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaign_id')
    const cid = campaignId || null
    if (!cid) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    const data = await getCached(cacheKey.overview(cid), () => fetchOverview(cid), CACHE_TTL.overview_kpis)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Overview API error:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function fetchOverview(cid: string) {
    const today = new Date().toISOString().split('T')[0]
    const d1 = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const d7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const d30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    const byCampaign = (q: any) => q.eq('campaign_id', cid)

    const [kwRows, cvRows, kvRows, ksRows, btRows, vsTodayRows, vs1dRows, vs7dRows, vs30dRows, sjRes, cvNewRows] = await Promise.all([
      selectAll<{ id: string }>('keywords', 'id', (q) => q.eq('campaign_id', cid).eq('status', 'active')),
      selectAll<{ video_id: string }>('campaign_videos', 'video_id', byCampaign),
      selectAll<{ video_id: string; rank: number }>('keyword_videos', 'video_id, rank', byCampaign),
      selectAll<{ video_id: string; rank: number }>('keyword_shorts', 'video_id, rank', byCampaign),
      selectAll<{ brand_name: string; video_id: string }>('brand_tags', 'brand_name, video_id', byCampaign),
      selectAll<{ view_count: number }>('view_snapshots', 'view_count', (q) => q.eq('snapshot_date', today).eq('campaign_id', cid)),
      selectAll<{ view_count: number }>('view_snapshots', 'view_count', (q) => q.eq('snapshot_date', d1).eq('campaign_id', cid)),
      selectAll<{ view_count: number }>('view_snapshots', 'view_count', (q) => q.eq('snapshot_date', d7).eq('campaign_id', cid)),
      selectAll<{ view_count: number }>('view_snapshots', 'view_count', (q) => q.eq('snapshot_date', d30).eq('campaign_id', cid)),
      supabase.from('scrape_jobs').select('id').in('status', ['running', 'pending']).limit(100),
      selectAll<{ video_id: string }>('campaign_videos', 'video_id', (q) =>
        q.eq('campaign_id', cid).gte('first_seen_at', new Date(Date.now() - 7 * 86400000).toISOString())),
    ])

    let lastViews: any = null
    let lastRanking: any = null
    try {
      const [lv, lr] = await Promise.all([
        supabase.from('system_metadata').select('value, updated_at').eq('key', 'last_views_refresh').single(),
        supabase.from('system_metadata').select('value, updated_at').eq('key', 'last_ranking_refresh').single(),
      ])
      lastViews = lv.data
      lastRanking = lr.data
    } catch {}

    const totalKeywords = kwRows.length
    const allCvVideoIds = [...new Set(cvRows.map((r) => r.video_id))]
    const totalVideos = allCvVideoIds.length
    const brandTags = btRows
    const newVidsLast7Days = cvNewRows.length

    // Ranking appearances across every keyword. A video that ranks on 40 keywords
    // contributes 40 appearances but is still ONE unique video.
    const rankingRows = [...kvRows, ...ksRows]
    const rankedVideos = rankingRows.length
    const uniqueRankedIds = new Set(rankingRows.map((r) => r.video_id))

    const sumRows = (rows: Array<{ view_count: number }>) =>
      rows.reduce((s, r) => s + (r.view_count || 0), 0)
    const vsToday = sumRows(vsTodayRows)
    const vs1d = sumRows(vs1dRows)
    const vs7d = sumRows(vs7dRows)
    const vs30d = sumRows(vs30dRows)

    const taggedIds = new Set(brandTags.map((bt: any) => bt.video_id))
    const untaggedVideos = allCvVideoIds.filter(id => !taggedIds.has(id)).length

    let videoRows: any[] = []
    const BATCH = 200
    const videoBatchPromises = []
    for (let i = 0; i < allCvVideoIds.length; i += BATCH) {
      videoBatchPromises.push(
        supabase.from('videos').select('id, view_count, channel_name, tags').in('id', allCvVideoIds.slice(i, i + BATCH))
      )
    }
    const videoBatchResults = await Promise.all(videoBatchPromises)
    for (const result of videoBatchResults) {
      videoRows.push(...(result.data || []))
    }

    const channelFreq = new Map<string, number>()
    const videoMap = new Map<string, any>()
    for (const v of videoRows) {
      if (v.channel_name) channelFreq.set(v.channel_name, (channelFreq.get(v.channel_name) || 0) + 1)
      videoMap.set(v.id, v)
    }
    const uniqueChannels = channelFreq.size

    // Unique viewership: each distinct ranked video counted exactly once.
    let uniqueViewership = 0
    for (const id of uniqueRankedIds) {
      uniqueViewership += videoMap.get(id)?.view_count || 0
    }

    // Total viewership: summed per keyword appearance, so a video ranking on
    // 40 keywords contributes its views 40 times. This is the number that
    // "total" is supposed to mean — it was previously identical to unique.
    let totalViewership = 0
    for (const row of rankingRows) {
      totalViewership += videoMap.get(row.video_id)?.view_count || 0
    }

    // Whole campaign pool (ranked or not) — kept for the pool-size KPI.
    let poolViewership = 0
    for (const v of videoRows) poolViewership += v.view_count || 0

    let topChannel = null
    let maxFreq = 0
    for (const [ch, freq] of channelFreq) {
      if (freq > maxFreq) { maxFreq = freq; topChannel = ch }
    }

    const brandStatsMap = new Map<string, { brand_views: number; video_count: number }>()
    for (const bt of brandTags) {
      if (!brandStatsMap.has(bt.brand_name)) brandStatsMap.set(bt.brand_name, { brand_views: 0, video_count: 0 })
      const m = brandStatsMap.get(bt.brand_name)!
      m.brand_views += videoMap.get(bt.video_id)?.view_count || 0
      m.video_count++
    }
    const brandStats = Array.from(brandStatsMap.entries())
      .map(([brand_name, m]) => ({ brand_name, ...m }))
      .sort((a: any, b: any) => b.brand_views - a.brand_views)

    const totalBrandViews = brandStats.reduce((sum: number, b: any) => sum + (b.brand_views || 0), 0) || 1
    const top5ByViewership = brandStats.slice(0, 5).map((b: any) => ({
      brand_name: b.brand_name,
      brand_total_views: b.brand_views || 0,
      sov_percent: Math.round(((b.brand_views || 0) / totalBrandViews) * 1000) / 10,
      video_count: b.video_count || 0,
    }))
    const totalBrandMentions = brandStats.reduce((sum: number, b: any) => sum + (b.video_count || 0), 0) || 1
    const top5ByFrequency = brandStats.slice(0, 5).map((b: any) => ({
      brand_name: b.brand_name,
      brand_total_freq: b.video_count || 0,
      freq_sov_percent: Math.round(((b.video_count || 0) / totalBrandMentions) * 1000) / 10,
      video_count: b.video_count || 0,
    }))

    let transcriptCoverage = 0
    try {
      const { data: transcriptData } = await supabase.from('video_transcripts').select('video_id').eq('fetch_status', 'success')
      transcriptCoverage = totalVideos > 0 ? Math.round(((transcriptData?.length || 0) / totalVideos) * 100) : 0
    } catch {}

    const [dailyViews, dailyNewVideos, dailyKeywords] = await Promise.all([
      getDailyData('view_snapshots', 'snapshot_date', 'view_count', cid, 'SUM'),
      getDailyData('campaign_videos', 'first_seen_at', 'video_id', cid, 'COUNT'),
      getDailyData('keywords', 'created_at', 'id', cid, 'COUNT'),
    ])

    return {
      lastUpdatedViews: lastViews,
      lastUpdatedRanking: lastRanking,
      totalKeywords,
      totalVideos: rankedVideos,
      rankedVideos,
      totalViewership,
      uniqueVideos: uniqueRankedIds.size,
      uniqueVideoViewership: uniqueViewership,
      poolVideos: videoRows.length,
      poolViewership,
      uniqueChannels,
      mostRankingChannel: topChannel ? { name: topChannel, totalFrequency: maxFreq } : null,
      newVideosLast7Days: newVidsLast7Days,
      untaggedVideos,
      top5ByViewership,
      top5ByFrequency,
      growth: {
        h24: pctChange(vsToday, vs1d),
        d7: pctChange(vsToday, vs7d),
        d30: pctChange(vsToday, vs30d),
      },
      activeScrapingJobs: (sjRes.data || []).length,
      transcriptCoverage,
      dailyViews,
      dailyNewVideos,
      dailyKeywordsAdded: dailyKeywords,
    }
}

async function getDailyData(
  table: string,
  dateCol: string,
  valueCol: string,
  campaignId: string | null,
  agg: 'SUM' | 'COUNT'
): Promise<{ date: string; views?: number; count?: number }[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  let q = supabase.from(table).select(`${dateCol}, ${valueCol}`)
  if (campaignId) q = q.eq('campaign_id', campaignId)
  q = q.gte(dateCol, thirtyDaysAgo).order(dateCol, { ascending: true })
  const { data } = await q
  if (!data || data.length === 0) return []

  const grouped = new Map<string, number[]>()
  for (const row of data as any[]) {
    const rawDate = row[dateCol]
    const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : String(rawDate)
    if (!grouped.has(dateStr)) grouped.set(dateStr, [])
    grouped.get(dateStr)!.push(agg === 'COUNT' ? 1 : (row[valueCol] || 0))
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, vals]) => ({
      date,
      ...(agg === 'SUM' ? { views: vals.reduce((s, v) => s + v, 0) } : { count: vals.length }),
    }))
}

function pctChange(now: number, prev: number) {
  return prev > 0 ? Math.round(((now - prev) / prev) * 1000) / 10 : null
}
