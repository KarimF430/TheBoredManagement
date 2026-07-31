import { NextRequest, NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: creatorId } = await params
    const campaignId = req.nextUrl.searchParams.get('campaign_id')
    const format = req.nextUrl.searchParams.get('format') || 'all'

    const decodedId = decodeURIComponent(creatorId)

    const formatFilter = format === 'long'
      ? `AND v.id IN (SELECT video_id FROM keyword_videos WHERE campaign_id = $2)`
      : format === 'short'
      ? `AND v.id IN (SELECT video_id FROM keyword_shorts WHERE campaign_id = $2)`
      : ''

    const videosRows = await queryAll<any>(`
      SELECT DISTINCT
        v.id, v.channel_id, v.channel_name, v.view_count, v.tags, v.youtube_id,
        v.title, v.thumbnail_url, v.published_at
      FROM (
        SELECT video_id FROM keyword_videos WHERE campaign_id = $1
        UNION ALL
        SELECT video_id FROM keyword_shorts WHERE campaign_id = $1
      ) cv
      JOIN videos v ON v.id = cv.video_id
      WHERE (v.channel_id = $3 OR v.channel_name = $3)
      ${formatFilter.replace('cv.', '')}
    `, campaignId ? [campaignId, campaignId, decodedId] : [campaignId, decodedId, decodedId])

    if (videosRows.length === 0) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const videoIds = videosRows.map((v: any) => v.id)

    const kwRows = await queryAll<any>(`
      SELECT kv.video_id, k.text as keyword_text, k.id as keyword_id, kv.rank, false as is_short
      FROM keyword_videos kv
      JOIN keywords k ON k.id = kv.keyword_id
      WHERE kv.campaign_id = $1 AND kv.video_id = ANY($2)
      UNION ALL
      SELECT ks.video_id, k.text as keyword_text, k.id as keyword_id, ks.rank, true as is_short
      FROM keyword_shorts ks
      JOIN keywords k ON k.id = ks.keyword_id
      WHERE ks.campaign_id = $1 AND ks.video_id = ANY($2)
    `, [campaignId, videoIds])

    // ANY($2) instead of .in() — see creators/route.ts; .in() serialises ids
    // into the URL and fails past ~300 of them.
    const btRows = await queryAll<any>(
      `SELECT video_id, brand_name FROM brand_tags WHERE campaign_id = $1 AND video_id = ANY($2)`,
      [campaignId, videoIds]
    )

    const videoMap = new Map<string, any>()
    videosRows.forEach((v: any) => {
      let parsedTags: string[] = []
      try { parsedTags = typeof v.tags === 'string' ? JSON.parse(v.tags || '[]') : (v.tags || []) } catch {}
      videoMap.set(v.id, {
        id: v.id,
        channel_id: v.channel_id,
        channel_name: v.channel_name,
        youtube_id: v.youtube_id,
        title: v.title,
        view_count: v.view_count || 0,
        thumbnail_url: v.thumbnail_url,
        published_at: v.published_at,
        is_short: false,
        keywords: [] as any[],
        brands: new Set<string>(parsedTags),
        best_rank: 999,
        top5_hits: 0,
        top10_hits: 0
      })
    })

    kwRows.forEach((row: any) => {
      const v = videoMap.get(row.video_id)
      if (v) {
        v.keywords.push({ text: row.keyword_text, keyword_id: row.keyword_id, rank: row.rank })
        if (row.is_short) v.is_short = true
        if (row.rank < v.best_rank) v.best_rank = row.rank
        if (row.rank <= 5) v.top5_hits++
        if (row.rank <= 10) v.top10_hits++
      }
    })

    ;(btRows || []).forEach((r: any) => {
      const v = videoMap.get(r.video_id)
      if (v) v.brands.add(r.brand_name)
    })

    const allVideos = Array.from(videoMap.values()).sort((a: any, b: any) => b.view_count - a.view_count)

    const totalViews = allVideos.reduce((s: number, v: any) => s + v.view_count, 0)
    const avgViews = allVideos.length > 0 ? Math.round(totalViews / allVideos.length) : 0
    const bestRank = allVideos.reduce((min: number, v: any) => Math.min(min, v.best_rank), 999)
    const totalTop5 = allVideos.reduce((s: number, v: any) => s + v.top5_hits, 0)
    const totalTop10 = allVideos.reduce((s: number, v: any) => s + v.top10_hits, 0)

    let totalGrowth = 0
    let validVideos = 0
    const now = new Date()
    allVideos.forEach((v: any) => {
      if (v.published_at && v.view_count) {
        const p = new Date(v.published_at)
        const days = Math.max(1, (now.getTime() - p.getTime()) / (1000 * 60 * 60 * 24))
        totalGrowth += (v.view_count / days)
        validVideos++
      }
    })
    const avgDailyGrowth = validVideos > 0 ? Math.round(totalGrowth / validVideos) : 0
    const dailyGrowthPct = totalViews > 0 ? Number(((avgDailyGrowth / totalViews) * 100).toFixed(4)) : 0

    const keywordMap = new Map<string, { keyword: string; rank: number; videos: any[]; totalViews: number }>()
    allVideos.forEach((v: any) => {
      v.keywords.forEach((kw: any) => {
        if (!keywordMap.has(kw.text)) {
          keywordMap.set(kw.text, { keyword: kw.text, rank: kw.rank, videos: [], totalViews: 0 })
        }
        const entry = keywordMap.get(kw.text)!
        if (kw.rank < entry.rank) entry.rank = kw.rank
        entry.videos.push({
          id: v.id,
          youtube_id: v.youtube_id,
          title: v.title,
          view_count: v.view_count,
          rank: kw.rank,
          thumbnail_url: v.thumbnail_url,
          is_short: v.is_short
        })
        entry.totalViews += v.view_count
      })
    })

    const allKeywords = Array.from(keywordMap.values()).sort((a, b) => a.rank - b.rank)
    const top5Keywords = allKeywords.filter(k => k.rank <= 5)
    const top10Keywords = allKeywords.filter(k => k.rank > 5 && k.rank <= 10)
    const beyond10Keywords = allKeywords.filter(k => k.rank > 10)

    const brandMap = new Map<string, { name: string; totalViews: number; videoCount: number; keywords: Set<string> }>()
    allVideos.forEach((v: any) => {
      v.brands.forEach((brand: string) => {
        if (!brandMap.has(brand)) {
          brandMap.set(brand, { name: brand, totalViews: 0, videoCount: 0, keywords: new Set() })
        }
        const b = brandMap.get(brand)!
        b.totalViews += v.view_count
        b.videoCount++
        v.keywords.forEach((kw: any) => b.keywords.add(kw.text))
      })
    })

    const brandPerformance = Array.from(brandMap.values())
      .map(b => ({
        name: b.name,
        totalViews: b.totalViews,
        videoCount: b.videoCount,
        avgViews: b.videoCount > 0 ? Math.round(b.totalViews / b.videoCount) : 0,
        topKeyword: Array.from(b.keywords)[0] || '—',
        topKeywordRank: allKeywords.find(k => b.keywords.has(k.keyword))?.rank || 999
      }))
      .sort((a, b) => b.totalViews - a.totalViews)

    const topKeywordsByViews = allKeywords.slice(0, 10).map(k => ({
      keyword: k.keyword,
      totalViews: k.totalViews,
      avgRank: k.rank,
      videoCount: k.videos.length
    }))

    const allKeywordsSet = new Set<string>()
    allVideos.forEach((v: any) => v.keywords.forEach((kw: any) => allKeywordsSet.add(kw.text)))
    const allBrandsSet = new Set<string>()
    allVideos.forEach((v: any) => v.brands.forEach((b: string) => allBrandsSet.add(b)))
    const shortsCount = allVideos.filter((v: any) => v.is_short).length
    const shortsRatio = allVideos.length > 0 ? Math.round((shortsCount / allVideos.length) * 100) : 0

    return NextResponse.json({
      id: decodedId,
      channelId: allVideos[0]?.channel_id || null,
      name: allVideos[0]?.channel_name || 'Unknown',
      totalViews,
      avgViews,
      videoCount: allVideos.length,
      bestRank: bestRank < 999 ? bestRank : null,
      dailyGrowth: avgDailyGrowth,
      dailyGrowthPct,
      shortsRatio,
      kwCount: allKeywordsSet.size,
      brandCount: allBrandsSet.size,
      top5_hits: totalTop5,
      top10_hits: totalTop10,
      keywordRankings: {
        top5: top5Keywords,
        top10: top10Keywords,
        beyond10: beyond10Keywords
      },
      brandPerformance,
      topKeywordsByViews,
      videos: allVideos.map((v: any) => ({
        id: v.id,
        youtube_id: v.youtube_id,
        title: v.title,
        view_count: v.view_count,
        thumbnail_url: v.thumbnail_url,
        published_at: v.published_at,
        is_short: v.is_short,
        best_rank: v.best_rank,
        top5_hits: v.top5_hits,
        top10_hits: v.top10_hits,
        keywords: v.keywords,
        brands: Array.from(v.brands)
      }))
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('API /creators/[id] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
