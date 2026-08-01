import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCached, cacheKey, CACHE_TTL } from '@/lib/cache'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaign_id')
    const metric = req.nextUrl.searchParams.get('metric') ?? 'views'
    const period = req.nextUrl.searchParams.get('period') ?? '7d'
    const isOurs = req.nextUrl.searchParams.get('is_ours')
    const format = req.nextUrl.searchParams.get('format') // 'all' | 'long' | 'short'
    const dateFrom = req.nextUrl.searchParams.get('date_from')
    const dateTo = req.nextUrl.searchParams.get('date_to')
    const language = req.nextUrl.searchParams.get('language')

    if (!campaignId) return NextResponse.json({ data: [], period, has_scrape_data: false })

    const key = `${cacheKey.brandGrowth(campaignId, metric, period)}:${isOurs || 'all'}:${format || 'all'}:${dateFrom || ''}:${dateTo || ''}:${language || 'all'}`
    const data = await getCached(key, () => fetchGrowth(campaignId!, metric, period, isOurs, format, dateFrom, dateTo, language), CACHE_TTL.brand_growth)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Brand growth API error:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function fetchGrowth(
  campaignId: string,
  metric: string,
  period: string,
  isOurs?: string | null,
  format?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null,
  language?: string | null
) {
  let periodDays = period === '24h' ? 1 : period === '30d' ? 30 : 7
  let periodStart = new Date(Date.now() - periodDays * 86400000).toISOString().split('T')[0]
  let prevStart = new Date(Date.now() - periodDays * 2 * 86400000).toISOString().split('T')[0]

  if (dateFrom && dateTo) {
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    const diffMs = to.getTime() - from.getTime()
    periodDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1)
    periodStart = dateFrom
    prevStart = new Date(from.getTime() - periodDays * 86400000).toISOString().split('T')[0]
  }

  // Fetch brand_tags directly (count:'exact',head:true returns null on some tables)
  let { data: brandTags } = await supabase
    .from('brand_tags')
    .select('brand_name, video_id')
    .eq('campaign_id', campaignId)

  // Filter by format if specified
  if (brandTags && brandTags.length > 0 && (format === 'long' || format === 'short')) {
    const table = format === 'long' ? 'keyword_videos' : 'keyword_shorts'
    const { data: kvRows } = await supabase.from(table).select('video_id').eq('campaign_id', campaignId)
    const validVideoIds = new Set((kvRows || []).map((r: any) => r.video_id))
    brandTags = brandTags.filter((bt: any) => validVideoIds.has(bt.video_id))
  }

  // Filter by language if specified
  if (brandTags && brandTags.length > 0 && language && language !== 'all') {
    const { data: langKws } = await supabase.from('keywords').select('id').eq('campaign_id', campaignId).eq('language', language)
    const kwIds = (langKws || []).map((k: any) => k.id)
    if (kwIds.length === 0) {
      brandTags = []
    } else {
      const BATCH = 1000
      const langVideoIds = new Set<string>()
      for (let i = 0; i < kwIds.length; i += BATCH) {
        const [kvRes, ksRes] = await Promise.all([
          supabase.from('keyword_videos').select('video_id').in('keyword_id', kwIds.slice(i, i + BATCH)),
          supabase.from('keyword_shorts').select('video_id').in('keyword_id', kwIds.slice(i, i + BATCH)),
        ])
        for (const r of kvRes.data || []) langVideoIds.add(r.video_id)
        for (const r of ksRes.data || []) langVideoIds.add(r.video_id)
      }
      brandTags = brandTags.filter((bt: any) => langVideoIds.has(bt.video_id))
    }
  }

  if (!brandTags || brandTags.length === 0) {
    // Fallback to campaign_brands
    const { data: registered } = await supabase.from('campaign_brands').select('name as brand_name').eq('campaign_id', campaignId)
    const brands = registered || []
    if (brands.length === 0) return { data: [], period, has_scrape_data: false }
    return {
      data: brands.map((b: any, i: number) => ({
        brand_name: b.brand_name, currentValue: 0, previousValue: 0,
        growthPercent: 0, rankMovement: 0, currentRank: i + 1,
        sparklineData: new Array(periodDays).fill(0), video_count: 0, has_data: false,
      })),
      period, has_scrape_data: false,
    }
  }

  // Build brand aggregation in single pass
  const brandAgg = new Map<string, { videoIds: Set<string>; views: number }>()
  for (const bt of (brandTags || []) as any[]) {
    if (!brandAgg.has(bt.brand_name)) brandAgg.set(bt.brand_name, { videoIds: new Set(), views: 0 })
    brandAgg.get(bt.brand_name)!.videoIds.add(bt.video_id)
  }

  const allVids = [...new Set((brandTags || []).map((bt: any) => bt.video_id))]

  // Parallel: fetch video views + snapshot data
  const BATCH = 200
  const videoBatchPromises = []
  for (let i = 0; i < allVids.length; i += BATCH) {
    videoBatchPromises.push(
      supabase.from('videos').select('id, view_count, is_ours').in('id', allVids.slice(i, i + BATCH))
    )
  }

  const [videoBatchResults, { data: allSnaps }] = await Promise.all([
    Promise.all(videoBatchPromises),
    supabase.from('view_snapshots')
      .select('video_id, view_count, snapshot_date')
      .eq('campaign_id', campaignId)
      .gte('snapshot_date', prevStart),
  ])

  // Merge video views
  const videoViews = new Map<string, number>()
  const videoIsOurs = new Map<string, boolean>()
  for (const result of videoBatchResults) {
    for (const v of (result.data || []) as any[]) {
      videoViews.set(v.id, v.view_count || 0)
      videoIsOurs.set(v.id, v.is_ours || false)
    }
  }

  // Filter by is_ours if specified
  const filteredVids = isOurs === 'true'
    ? allVids.filter(id => videoIsOurs.get(id) === true)
    : isOurs === 'false'
    ? allVids.filter(id => videoIsOurs.get(id) !== true)
    : allVids
  const filteredVidSet = new Set(filteredVids)

  for (const [, agg] of brandAgg) {
    agg.videoIds.forEach(id => { if (filteredVidSet.has(id)) agg.views += videoViews.get(id) || 0 })
  }

  // Build snapshot map in single pass
  const snapByDateBrand = new Map<string, Map<string, number>>()
  for (const snap of (allSnaps || []) as any[]) {
    const d = typeof snap.snapshot_date === 'string' ? snap.snapshot_date.split('T')[0] : String(snap.snapshot_date)
    if (!snapByDateBrand.has(d)) snapByDateBrand.set(d, new Map())
    for (const [brand, agg] of brandAgg) {
      if (agg.videoIds.has(snap.video_id)) {
        const bm = snapByDateBrand.get(d)!
        bm.set(brand, (bm.get(brand) || 0) + (snap.view_count || 0))
      }
    }
  }

  const sortedBrands = Array.from(brandAgg.entries())
    .map(([name, agg]) => ({ brand_name: name, current_views: agg.views, video_count: agg.videoIds.size }))
    .sort((a, b) => metric === 'views' ? b.current_views - a.current_views : b.video_count - a.video_count)

  const enriched = sortedBrands.map((b, currentRank) => {
    // Find all available snapshot dates for this brand (sorted ascending)
    const availableDates: string[] = []
    for (const [date, bm] of snapByDateBrand) {
      if (bm.has(b.brand_name)) availableDates.push(date)
    }
    availableDates.sort()

    // Compare latest snapshot vs earliest snapshot (or previous period)
    let recentVal = 0, previousVal = 0
    if (availableDates.length >= 2) {
      // Latest date value
      const latestDate = availableDates[availableDates.length - 1]
      recentVal = snapByDateBrand.get(latestDate)?.get(b.brand_name) || 0
      // Previous date value
      const prevDate = availableDates[availableDates.length - 2]
      previousVal = snapByDateBrand.get(prevDate)?.get(b.brand_name) || 0
    } else if (availableDates.length === 1) {
      // Only one snapshot — compare with current videos.view_count
      recentVal = b.current_views
      previousVal = 0
    }

    const growthPercent = previousVal > 0 ? parseFloat((((recentVal - previousVal) / previousVal) * 100).toFixed(1)) : (recentVal > 0 ? 100 : 0)

    // Sparkline from all available dates
    const sparklineData: number[] = availableDates.map(d => snapByDateBrand.get(d)?.get(b.brand_name) || 0)

    return {
      brand_name: b.brand_name,
      currentValue: metric === 'views' ? b.current_views : b.video_count,
      previousValue: previousVal, growthPercent, rankMovement: 0, currentRank: currentRank + 1,
      sparklineData, video_count: b.video_count, has_data: availableDates.length > 0,
    }
  })

  const prevOrder = [...enriched].sort((a, b) => b.previousValue - a.previousValue)
  const prevRankMap = new Map(prevOrder.map((b, i) => [b.brand_name, i + 1]))
  enriched.forEach((b) => { b.rankMovement = (prevRankMap.get(b.brand_name) ?? b.currentRank) - b.currentRank })

  return { data: enriched, period, has_scrape_data: true }
}
