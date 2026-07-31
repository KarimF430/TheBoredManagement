import { NextRequest, NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'
import { getCached, CACHE_TTL } from '@/lib/cache'
import { authorizeCampaignAccess } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const campaignId = req.nextUrl.searchParams.get('campaign_id')

    const { authorized, error } = await authorizeCampaignAccess(req, campaignId)
    if (!authorized) return error
    const sort = req.nextUrl.searchParams.get('sort') ?? 'views'
    const tab = req.nextUrl.searchParams.get('tab') ?? 'long'
    const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20')
    const brandName = req.nextUrl.searchParams.get('brand_name')
    const keywordId = req.nextUrl.searchParams.get('keyword_id')
    const channelName = req.nextUrl.searchParams.get('channel_name')
    const search = req.nextUrl.searchParams.get('q')
    const isOurs = req.nextUrl.searchParams.get('is_ours')

    if (!campaignId) return NextResponse.json({ data: [], total: 0, channels: [] })

    const cacheFilters = [campaignId, sort, page, tab, keywordId || '', brandName || '', channelName || '', search || '', isOurs || ''].join(':')
    const data = await getCached(
      `lb:${cacheFilters}`,
      () => fetchLeaderboard(campaignId!, { brandName, keywordId, channelName, search, tab, sort, page, limit, isOurs }),
      CACHE_TTL.video_leaderboard
    )
    return NextResponse.json(data)
  } catch (e: any) {
    console.error('Leaderboard API error:', e)
    return NextResponse.json({ error: e.message, data: [], total: 0, channels: [] }, { status: 500 })
  }
}

async function fetchLeaderboard(campaignId: string, filters: { brandName: string | null; keywordId: string | null; channelName: string | null; search: string | null; tab: string; sort: string; page: number; limit: number; isOurs: string | null }) {
  const { brandName, keywordId, channelName, search, tab, sort, page, limit, isOurs } = filters
  const offset = (page - 1) * limit

  const shortVideoIds = new Set<string>()
  let rankedVideos: any[] = []

  if (tab === 'all') {
    if (keywordId) {
      const [longRows, shortRows] = await Promise.all([
        queryAll<any>(`SELECT video_id, keyword_id, rank, discovered_at::text as discovered_at, last_seen_at::text as last_seen_at FROM keyword_videos WHERE campaign_id = $1 AND keyword_id = $2`, [campaignId, keywordId]),
        queryAll<any>(`SELECT video_id, keyword_id, rank, discovered_at::text as discovered_at, last_seen_at::text as last_seen_at FROM keyword_shorts WHERE campaign_id = $1 AND keyword_id = $2`, [campaignId, keywordId]),
      ])
      for (const r of shortRows) shortVideoIds.add(r.video_id)
      rankedVideos = [...longRows, ...shortRows]
    } else {
      // No keyword filter: aggregate in SQL to avoid fetching all rows
      const rows = await queryAll<any>(`
        SELECT video_id, keyword_id, rank, discovered_at::text as discovered_at, last_seen_at::text as last_seen_at, 'long' as source
        FROM keyword_videos WHERE campaign_id = $1
        UNION ALL
        SELECT video_id, keyword_id, rank, discovered_at::text as discovered_at, last_seen_at::text as last_seen_at, 'short' as source
        FROM keyword_shorts WHERE campaign_id = $1
      `, [campaignId])
      for (const r of rows) {
        if (r.source === 'short') shortVideoIds.add(r.video_id)
      }
      rankedVideos = rows
    }
  } else {
    const kvTable = tab === 'short' ? 'keyword_shorts' : 'keyword_videos'
    rankedVideos = await queryAll<any>(
      `SELECT video_id, keyword_id, rank, discovered_at::text as discovered_at, last_seen_at::text as last_seen_at FROM ${kvTable} WHERE campaign_id = $1${keywordId ? ' AND keyword_id = $2' : ''}`,
      keywordId ? [campaignId, keywordId] : [campaignId]
    )
  }

  if (rankedVideos.length === 0) {
    return { data: [], total: 0, channels: [] }
  }

  const videoIdSet = new Set(rankedVideos.map(r => r.video_id))
  const videoIds = Array.from(videoIdSet)
  const keywordIdSet = new Set(rankedVideos.map(r => r.keyword_id))
  const keywordIds = Array.from(keywordIdSet)

  // These use `= ANY($1)` rather than PostgREST's .in(), which serialises every
  // id into the URL query string. At ~37 chars per UUID a few hundred ids blow
  // past the max URI length and the request fails outright ("TypeError: fetch
  // failed"), silently yielding an empty leaderboard. A bound array parameter
  // has no such limit and needs no batching.
  const [allVideos, keywordRows, brandRows] = await Promise.all([
    queryAll<any>(
      `SELECT id, youtube_id, title, channel_name, channel_id, tags, view_count,
              duration, duration_sec, thumbnail_url, published_at, is_ours
       FROM videos WHERE id = ANY($1)`,
      [videoIds]
    ),
    queryAll<any>(`SELECT id, text FROM keywords WHERE id = ANY($1)`, [keywordIds]),
    queryAll<any>(
      `SELECT video_id, brand_name FROM brand_tags WHERE video_id = ANY($1) AND campaign_id = $2`,
      [videoIds, campaignId]
    ),
  ])

  const keywordTextMap = new Map((keywordRows || []).map((k: any) => [k.id, k.text]))
  const videoKeywordMap = new Map<string, { keyword_text: string; rank: number; discovered_at: string; last_seen_at: string }[]>()
  for (const r of rankedVideos) {
    const kwText = keywordTextMap.get(r.keyword_id) || r.keyword_id
    if (!videoKeywordMap.has(r.video_id)) videoKeywordMap.set(r.video_id, [])
    videoKeywordMap.get(r.video_id)!.push({ keyword_text: kwText, rank: r.rank, discovered_at: r.discovered_at, last_seen_at: r.last_seen_at })
  }

  const videoStatsMap = new Map<string, { best_rank: number; keyword_count: number; discovered_at: string; last_seen_at: string }>()
  for (const [vid, ranks] of videoKeywordMap) {
    const bestRank = Math.min(...ranks.map(r => r.rank))
    const discovered = ranks.reduce((min, r) => !min || r.discovered_at < min ? r.discovered_at : min, '')
    const lastSeen = ranks.reduce((max, r) => !max || r.last_seen_at > max ? r.last_seen_at : max, '')
    videoStatsMap.set(vid, { best_rank: bestRank, keyword_count: ranks.length, discovered_at: discovered, last_seen_at: lastSeen })
  }

  const videoMap = new Map(allVideos.map((v: any) => [v.id, v]))
  const brandMap = new Map<string, string[]>()
  for (const br of (brandRows || []) as any[]) {
    if (!brandMap.has(br.video_id)) brandMap.set(br.video_id, [])
    brandMap.get(br.video_id)!.push(br.brand_name)
  }

  let enriched = videoIds.map(vid => {
    const v = videoMap.get(vid)
    if (!v) return null
    const stats = videoStatsMap.get(vid)
    let tagsArr: string[] = []
    if (Array.isArray(v.tags)) tagsArr = v.tags
    else try { tagsArr = JSON.parse(v.tags || '[]') } catch {}

    return {
      id: v.id, youtube_id: v.youtube_id, title: v.title, channel_name: v.channel_name,
      channel_id: v.channel_id || '', view_count: v.view_count || 0,
      duration: v.duration || '', duration_sec: v.duration_sec || 0,
      thumbnail_url: v.thumbnail_url || '', published_at: v.published_at || '',
      tags: tagsArr, is_short: tab === 'all' ? shortVideoIds.has(vid) : tab === 'short', is_ours: v.is_ours || false,
      is_new: stats?.discovered_at ? new Date(stats.discovered_at) > new Date(Date.now() - 7 * 86400000) : false,
      best_rank: stats?.best_rank || 0, keyword_count: stats?.keyword_count || 0,
      discovered_at: stats?.discovered_at || '', last_seen_at: stats?.last_seen_at || '',
      keywords_appeared: (videoKeywordMap.get(vid) || []).map(r => r.keyword_text),
      keyword_ranks: videoKeywordMap.get(vid) || [],
      brands: brandMap.get(vid) || [],
    }
  }).filter(Boolean) as any[]

  if (brandName) enriched = enriched.filter(v => v.brands.includes(brandName))
  if (channelName) enriched = enriched.filter(v => v.channel_name === channelName)
  if (isOurs === 'true') enriched = enriched.filter(v => v.is_ours)
  if (isOurs === 'false') enriched = enriched.filter(v => !v.is_ours)
  if (tab === 'long') enriched = enriched.filter(v => !(v.duration_sec > 0 && v.duration_sec <= 60))
  if (tab === 'short') enriched = enriched.filter(v => (v.duration_sec > 0 && v.duration_sec <= 60) || shortVideoIds.has(v.id))
  if (search) {
    const q = search.toLowerCase()
    enriched = enriched.filter(v => (v.title || '').toLowerCase().includes(q) || (v.channel_name || '').toLowerCase().includes(q))
  }

  enriched.sort(sort === 'rank' ? (a: any, b: any) => a.best_rank - b.best_rank : sort === 'views' ? (a: any, b: any) => b.view_count - a.view_count : (a: any, b: any) => b.keyword_count - a.keyword_count)

  const total = enriched.length
  const paginated = enriched.slice(offset, offset + limit)
  const channels = [...new Set(enriched.map(v => v.channel_name).filter(Boolean))].sort()

  return { data: paginated, total, channels }
}
