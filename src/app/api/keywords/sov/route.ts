import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCached, cacheKey, CACHE_TTL } from '@/lib/cache'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaign_id')
  const language = req.nextUrl.searchParams.get('language') ?? 'all'
  const type = req.nextUrl.searchParams.get('type') ?? 'all'
  const isOurs = req.nextUrl.searchParams.get('is_ours')

  if (!campaignId) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

  try {
    const key = `${cacheKey.keywordsSov(campaignId, language, type)}:${isOurs || 'all'}`
    const data = await getCached(key, () => fetchKeywordSov(campaignId!, language, type, isOurs), CACHE_TTL.keywords_sov)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Keyword SOV API error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function fetchKeywordSov(campaignId: string, language: string, type: string, isOurs?: string | null) {
  const [cbRes, btRes, kwQuery] = await Promise.all([
    supabase.from('campaign_brands').select('name').eq('campaign_id', campaignId),
    supabase.from('brand_tags').select('brand_name').eq('campaign_id', campaignId),
    (() => {
      let q = supabase.from('keywords').select('id, text, type, language, status').eq('campaign_id', campaignId).order('created_at', { ascending: false })
      if (language !== 'all') q = q.eq('language', language)
      if (type !== 'all') q = q.eq('category', type)
      return q
    })(),
  ])

  let brandNames = (cbRes.data || []).map((b: any) => b.name)
  if (brandNames.length === 0) {
    brandNames = [...new Set((btRes.data || []).map((bt: any) => bt.brand_name))].sort()
  }

  const keywords = kwQuery.data
  if (!keywords || keywords.length === 0) {
    return { data: [], brandNames }
  }

  const kwIds = keywords.map((k: any) => k.id)

  const [kvRes, ksRes] = await Promise.all([
    supabase.from('keyword_videos').select('keyword_id, video_id').in('keyword_id', kwIds),
    supabase.from('keyword_shorts').select('keyword_id, video_id').in('keyword_id', kwIds),
  ])

  const kwVideoMap = new Map<string, Set<string>>()
  for (const kv of kvRes.data || []) {
    if (!kwVideoMap.has(kv.keyword_id)) kwVideoMap.set(kv.keyword_id, new Set())
    kwVideoMap.get(kv.keyword_id)!.add(kv.video_id)
  }
  for (const ks of ksRes.data || []) {
    if (!kwVideoMap.has(ks.keyword_id)) kwVideoMap.set(ks.keyword_id, new Set())
    kwVideoMap.get(ks.keyword_id)!.add(ks.video_id)
  }

  const allVideoIds = [...new Set([...(kvRes.data || []).map((r: any) => r.video_id), ...(ksRes.data || []).map((r: any) => r.video_id)])]

  const BATCH = 500
  const videoBatchPromises = []
  for (let i = 0; i < allVideoIds.length; i += BATCH) {
    videoBatchPromises.push(
      supabase.from('videos').select('id, view_count, title, channel_name, tags, is_ours').in('id', allVideoIds.slice(i, i + BATCH))
    )
  }
  const videoBatchResults = await Promise.all(videoBatchPromises)

  const videoMap = new Map<string, any>()
  for (const result of videoBatchResults) {
    for (const v of (result.data || []) as any[]) videoMap.set(v.id, v)
  }

  if (isOurs) {
    for (const [id, v] of videoMap) {
      if (isOurs === 'true' && !v.is_ours) videoMap.delete(id)
      if (isOurs === 'false' && v.is_ours) videoMap.delete(id)
    }
  }

  const parsedTagsMap = new Map<string, string[]>()
  for (const [id, v] of videoMap) {
    let tagsArr: string[] = []
    if (Array.isArray(v.tags)) tagsArr = v.tags
    else try { tagsArr = JSON.parse(v.tags || '[]') } catch {}
    parsedTagsMap.set(id, tagsArr)
  }

  const brandLowerMap = new Map<string, string>()
  for (const b of brandNames) brandLowerMap.set(b.toLowerCase(), b)

  const enrichedData = keywords.map((kw: any) => {
    const videoIds = kwVideoMap.get(kw.id) || new Set()
    const videos = [...videoIds].map(id => videoMap.get(id)).filter(Boolean)

    const totalViews = videos.reduce((acc: number, v: any) => acc + (v.view_count || 0), 0)

    const entry: Record<string, string | number> = {
      keyword: kw.text, total_videos: videos.length,
    }

    /* ── Fixed attribution: allocate each video to exactly one brand ── */
    const brandViewAlloc: Record<string, number> = {}
    let otherViews = 0

    for (const v of videos) {
      const viewCount = v.view_count || 0
      const tagsArr = parsedTagsMap.get(v.id) || []
      const title = (v.title || '').toLowerCase()
      const channel = (v.channel_name || '').toLowerCase()

      const matchingBrands = brandNames.filter((bName: string) => {
        const bLower = bName.toLowerCase()
        return tagsArr.some((t: string) => t.toLowerCase() === bLower) ||
          title.includes(bLower) ||
          channel.includes(bLower)
      })

      if (matchingBrands.length === 0) {
        otherViews += viewCount
      } else {
        const share = viewCount / matchingBrands.length
        for (const b of matchingBrands) {
          brandViewAlloc[b] = (brandViewAlloc[b] || 0) + share
        }
      }
    }

    const total = Object.values(brandViewAlloc).reduce((s, v) => s + v, 0) + otherViews || 1
    for (const bName of brandNames) {
      entry[bName] = parseFloat(((brandViewAlloc[bName] || 0) / total * 100).toFixed(1))
    }
    entry['Other'] = parseFloat((otherViews / total * 100).toFixed(1))

    return entry
  })

  return { data: enrichedData, brandNames }
}
