import { NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaign_id = searchParams.get('campaign_id')
    const format = searchParams.get('format') || 'all'

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
    }

    // 1. Fetch all videos for this campaign
    // Including tags, keywords, shorts status
    const formatFilter = format === 'long'
      ? `AND v.id IN (SELECT video_id FROM keyword_videos WHERE campaign_id = $1)`
      : format === 'short'
      ? `AND v.id IN (SELECT video_id FROM keyword_shorts WHERE campaign_id = $1)`
      : ''

    const videosRows = await queryAll<any>(`
      SELECT 
        v.id, v.channel_name, v.view_count, v.tags
      FROM campaign_videos cv
      JOIN videos v ON v.id = cv.video_id
      WHERE cv.campaign_id = $1
      ${formatFilter}
    `, [campaign_id])

    if (videosRows.length === 0) {
      return NextResponse.json({ creators: [] })
    }

    const videoIds = videosRows.map(v => v.id)

    // 2. Fetch keyword appearances & best ranks
    const kwRows = await queryAll<any>(`
      SELECT video_id, keyword_id, rank, false as is_short
      FROM keyword_videos
      WHERE campaign_id = $1 AND video_id = ANY($2)
      UNION ALL
      SELECT video_id, keyword_id, rank, true as is_short
      FROM keyword_shorts
      WHERE campaign_id = $1 AND video_id = ANY($2)
    `, [campaign_id, videoIds])

    // 3. Fetch brand tags
    const { data: btRows } = await supabase
      .from('brand_tags')
      .select('video_id, brand_name')
      .eq('campaign_id', campaign_id)
      .in('video_id', videoIds)

    // Map keywords & brands to videos
    const videoMap = new Map<string, any>()
    videosRows.forEach(v => {
      let parsedTags = []
      try { parsedTags = typeof v.tags === 'string' ? JSON.parse(v.tags || '[]') : (v.tags || []) } catch {}
      videoMap.set(v.id, {
        id: v.id,
        channel_name: v.channel_name,
        view_count: v.view_count || 0,
        is_short: false,
        tags: parsedTags,
        keywords: new Set<string>(),
        brands: new Set<string>(parsedTags),
        best_rank: 999
      })
    })

    kwRows.forEach(row => {
      const v = videoMap.get(row.video_id)
      if (v) {
        v.keywords.add(row.keyword_id)
        if (row.is_short) v.is_short = true
        if (row.rank < v.best_rank) v.best_rank = row.rank
      }
    })

    ;(btRows || []).forEach(r => {
      const v = videoMap.get(r.video_id)
      if (v) v.brands.add(r.brand_name)
    })

    // Aggregate by creator
    const creatorMap = new Map<string, any>()
    Array.from(videoMap.values()).forEach(v => {
      if (!v.channel_name) return
      if (!creatorMap.has(v.channel_name)) {
        creatorMap.set(v.channel_name, {
          name: v.channel_name,
          views: 0,
          count: 0,
          shorts: 0,
          bestRank: 99,
          kws: new Set<string>(),
          brandsMap: new Map<string, number>(),
        })
      }
      const c = creatorMap.get(v.channel_name)
      c.views += (v.view_count || 0)
      c.count++
      if (v.is_short) c.shorts++
      if (v.best_rank < c.bestRank) c.bestRank = v.best_rank
      v.keywords.forEach((k: string) => c.kws.add(k))
      v.brands.forEach((b: string) => {
        c.brandsMap.set(b, (c.brandsMap.get(b) || 0) + (v.view_count || 0))
      })
    })

    // Final mapping
    const creators = Array.from(creatorMap.values()).map(c => {
      const kwCount = c.kws.size
      const brandCount = c.brandsMap.size
      const avgViews = c.count > 0 ? Math.round(c.views / c.count) : 0
      const shortsRatio = c.count > 0 ? Math.round((c.shorts / c.count) * 100) : 0
      
      const brandsList = Array.from(c.brandsMap.entries() as IterableIterator<[string, number]>)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views)

      return {
        name: c.name,
        views: c.views,
        count: c.count,
        shortsRatio,
        avgViews,
        kwCount,
        brandCount,
        bestRank: c.bestRank,
        brandsList,
      }
    }).sort((a, b) => b.views - a.views)

    return NextResponse.json({ creators })
  } catch (e: any) {
    console.error('API /creators error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
