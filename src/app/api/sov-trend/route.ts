import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCached, cacheKey, CACHE_TTL } from '@/lib/cache'
import { authorizeCampaignAccess } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaign_id')
    const days = parseInt(req.nextUrl.searchParams.get('days') ?? '30')
    const isOurs = req.nextUrl.searchParams.get('is_ours')
    const format = req.nextUrl.searchParams.get('format') // 'all' | 'long' | 'short'
    const dateFrom = req.nextUrl.searchParams.get('date_from')
    const dateTo = req.nextUrl.searchParams.get('date_to')
    const language = req.nextUrl.searchParams.get('language') // 'all' | 'ja' | 'en' | etc.

    const { authorized, error } = await authorizeCampaignAccess(req, campaignId)
    if (!authorized) return error
    if (!campaignId) return NextResponse.json({ data: [], brands: [], has_scrape_data: false })

    const key = `${cacheKey.sovTrend(campaignId, 'all', String(days))}:${isOurs || 'all'}:${format || 'all'}:${dateFrom || ''}:${dateTo || ''}:${language || 'all'}`
    const data = await getCached(key, () => fetchSovTrend(campaignId, days, isOurs, format, dateFrom, dateTo, language), CACHE_TTL.sov_trend)
    return NextResponse.json(data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('SOV trend API error:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function fetchSovTrend(
  campaignId: string,
  days: number,
  isOurs?: string | null,
  format?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null,
  language?: string | null
) {
  // If language is specified, get keyword IDs for that language
  let languageVideoIds: Set<string> | null = null
  if (language && language !== 'all') {
    const { data: langKws } = await supabase.from('keywords').select('id').eq('campaign_id', campaignId).eq('language', language)
    const kwIds = (langKws || []).map((k: any) => k.id)
    if (kwIds.length === 0) {
      return { data: [], brands: [], has_scrape_data: false }
    }
    const BATCH = 1000
    languageVideoIds = new Set<string>()
    for (let i = 0; i < kwIds.length; i += BATCH) {
      const [kvRes, ksRes] = await Promise.all([
        supabase.from('keyword_videos').select('video_id').in('keyword_id', kwIds.slice(i, i + BATCH)),
        supabase.from('keyword_shorts').select('video_id').in('keyword_id', kwIds.slice(i, i + BATCH)),
      ])
      for (const r of kvRes.data || []) languageVideoIds.add(r.video_id)
      for (const r of ksRes.data || []) languageVideoIds.add(r.video_id)
    }
  }

  // Parallel: get brand names from campaign_brands AND brand_tags simultaneously
  const [cbRes, btRes] = await Promise.all([
    supabase.from('campaign_brands').select('name').eq('campaign_id', campaignId),
    supabase.from('brand_tags').select('brand_name, video_id').eq('campaign_id', campaignId),
  ])

  let brandNames: string[] = (cbRes.data || []).map((b: any) => b.name)
  if (brandNames.length === 0) {
    brandNames = [...new Set((btRes.data || []).map((bt: any) => bt.brand_name))].sort()
  }

  if (brandNames.length === 0) {
    return { data: [], brands: [], has_scrape_data: false }
  }

  let brandTags = btRes.data || []

  // Filter by format if specified
  if (brandTags.length > 0 && (format === 'long' || format === 'short')) {
    const table = format === 'long' ? 'keyword_videos' : 'keyword_shorts'
    const { data: kvRows } = await supabase.from(table).select('video_id').eq('campaign_id', campaignId)
    const validVideoIds = new Set((kvRows || []).map((r: any) => r.video_id))
    brandTags = brandTags.filter((bt: any) => validVideoIds.has(bt.video_id))
  }

  // Filter by language if specified
  if (brandTags.length > 0 && languageVideoIds) {
    brandTags = brandTags.filter((bt: any) => languageVideoIds!.has(bt.video_id))
  }

  if (brandTags.length === 0) {
    return { data: [], brands: brandNames, has_scrape_data: false }
  }

  // Build maps in a single pass
  const videoBrandMap = new Map<string, string[]>()
  for (const bt of brandTags) {
    if (!videoBrandMap.has(bt.video_id)) videoBrandMap.set(bt.video_id, [])
    videoBrandMap.get(bt.video_id)!.push(bt.brand_name)
  }

  const allVideoIds = [...videoBrandMap.keys()]

  // Fetch is_ours for filtering
  let filteredVideoIds = allVideoIds
  if (isOurs && allVideoIds.length > 0) {
    const BATCH = 500
    const vidBatchPromises = []
    for (let i = 0; i < allVideoIds.length; i += BATCH) {
      vidBatchPromises.push(
        supabase.from('videos').select('id, is_ours').in('id', allVideoIds.slice(i, i + BATCH))
      )
    }
    const vidBatchResults = await Promise.all(vidBatchPromises)
    const vidsSet = new Set<string>()
    for (const r of vidBatchResults) {
      for (const v of (r.data || []) as any[]) {
        if (isOurs === 'true' && v.is_ours) vidsSet.add(v.id)
        if (isOurs === 'false' && !v.is_ours) vidsSet.add(v.id)
      }
    }
    filteredVideoIds = allVideoIds.filter(id => vidsSet.has(id))
  }

  // Build time-series date list
  const dates: string[] = []
  if (dateFrom && dateTo) {
    const start = new Date(dateFrom)
    const end = new Date(dateTo)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0])
    }
  } else {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      dates.push(d.toISOString().split('T')[0])
    }
  }

  if (dates.length === 0) {
    return { data: [], brands: brandNames, has_scrape_data: false }
  }

  // Fetch snapshot data
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  let query = supabase
    .from('view_snapshots')
    .select('video_id, view_count, snapshot_date')
    .eq('campaign_id', campaignId)
    .gte('snapshot_date', startDate)

  if (dateFrom && dateTo) {
    query = query.lte('snapshot_date', endDate)
  }

  const { data: snapshots } = await query.in('video_id', filteredVideoIds.length > 0 ? filteredVideoIds : ['__none__'])

  const hasSnapshots = (snapshots || []).length > 0

  // Build date → brand → views map in a single pass
  const dateBrandViews = new Map<string, Map<string, number>>()
  for (const snap of (snapshots || []) as any[]) {
    const dateStr = typeof snap.snapshot_date === 'string' ? snap.snapshot_date.split('T')[0] : String(snap.snapshot_date)
    if (!dateBrandViews.has(dateStr)) dateBrandViews.set(dateStr, new Map())

    const brandsForVideo = videoBrandMap.get(snap.video_id)
    if (brandsForVideo) {
      const brandMap = dateBrandViews.get(dateStr)!
      for (const brandName of brandsForVideo) {
        brandMap.set(brandName, (brandMap.get(brandName) || 0) + (snap.view_count || 0))
      }
    }
  }

  const trendData = dates
    .map((date, idx) => {
      const row: Record<string, string | number> = {
        date: new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }),
      }
      const brandMap = dateBrandViews.get(date)
      let total = 0
      if (brandMap) { for (const views of brandMap.values()) total += views }
      for (const brandName of brandNames) {
        const views = brandMap?.get(brandName) || 0
        row[brandName] = total > 0 ? Math.round((views / total) * 1000) / 10 : 0
      }
      return { row, hasData: total > 0, idx }
    })
    .filter(({ hasData, idx }) => hasData || idx === dates.length - 1)
    .map(({ row }) => row)

  return { data: trendData, brands: brandNames, has_scrape_data: hasSnapshots }
}
