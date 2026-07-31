import { NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaign_id = searchParams.get('campaign_id')
    const format = searchParams.get('format') || 'all'
    const sortBy = searchParams.get('sort_by') || 'views'

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
      SELECT DISTINCT
        v.id, v.channel_id, v.channel_name, v.view_count, v.tags, v.youtube_id, v.title, v.thumbnail_url, v.published_at
      FROM (
        SELECT video_id FROM keyword_videos WHERE campaign_id = $1
        UNION ALL
        SELECT video_id FROM keyword_shorts WHERE campaign_id = $1
      ) cv
      JOIN videos v ON v.id = cv.video_id
      WHERE 1=1
      ${formatFilter.replace('cv.', '')}
    `, [campaign_id])

    if (videosRows.length === 0) {
      return NextResponse.json({ creators: [] })
    }

    const videoIds = videosRows.map(v => v.id)

    // 2. Fetch keyword appearances & best ranks
    const kwRows = await queryAll<any>(`
      SELECT kv.video_id, k.text as keyword_id, kv.rank, false as is_short
      FROM keyword_videos kv
      JOIN keywords k ON k.id = kv.keyword_id
      WHERE kv.campaign_id = $1 AND kv.video_id = ANY($2)
      UNION ALL
      SELECT ks.video_id, k.text as keyword_id, ks.rank, true as is_short
      FROM keyword_shorts ks
      JOIN keywords k ON k.id = ks.keyword_id
      WHERE ks.campaign_id = $1 AND ks.video_id = ANY($2)
    `, [campaign_id, videoIds])

    // 3. Fetch brand tags.
    // Uses `= ANY($2)` rather than PostgREST's .in(), which serialises every id
    // into the URL. Past roughly 300 UUIDs the request exceeds the max URI
    // length and fails outright, which silently zeroed the BRANDS count for
    // every creator on campaigns with more than a few hundred videos.
    const btRows = await queryAll<any>(
      `SELECT video_id, brand_name FROM brand_tags WHERE campaign_id = $1 AND video_id = ANY($2)`,
      [campaign_id, videoIds]
    )

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
        youtube_id: v.youtube_id,
        title: v.title,
        thumbnail_url: v.thumbnail_url,
        published_at: v.published_at,
        tags: parsedTags,
        keywords: new Set<string>(),
        brands: new Set<string>(parsedTags),
        best_rank: 999,
        top5_hits: 0,
        top10_hits: 0
      })
    })

    kwRows.forEach(row => {
      const v = videoMap.get(row.video_id)
      if (v) {
        v.keywords.add(row.keyword_id)
        if (row.is_short) v.is_short = true
        if (row.rank < v.best_rank) v.best_rank = row.rank
        if (row.rank <= 5) v.top5_hits++
        if (row.rank <= 10) v.top10_hits++
      }
    })

    ;(btRows || []).forEach(r => {
      const v = videoMap.get(r.video_id)
      if (v) v.brands.add(r.brand_name)
    })

    // Aggregate by creator channel_id
    const creatorMap = new Map<string, any>()
    Array.from(videoMap.values()).forEach(v => {
      const cid = v.channel_id || v.channel_name || 'unknown'
      if (!v.channel_name) return
      if (!creatorMap.has(cid)) {
        creatorMap.set(cid, {
          channel_id: cid,
          name: v.channel_name,
          views: 0,
          count: 0,
          shorts: 0,
          bestRank: 99,
          kws: new Set<string>(),
          brandsMap: new Map<string, number>(),
          top5_hits: 0,
          top10_hits: 0,
          videos: []
        })
      }
      const c = creatorMap.get(cid)
      c.views += (v.view_count || 0)
      c.count++
      c.top5_hits += v.top5_hits
      c.top10_hits += v.top10_hits
      if (v.is_short) c.shorts++
      if (v.best_rank < c.bestRank) c.bestRank = v.best_rank
      v.keywords.forEach((k: string) => c.kws.add(k))
      v.brands.forEach((b: string) => {
        c.brandsMap.set(b, (c.brandsMap.get(b) || 0) + (v.view_count || 0))
      })
      
      c.videos.push({
        id: v.id,
        youtube_id: v.youtube_id || v.id,
        title: v.title || v.channel_name + ' Video',
        view_count: v.view_count,
        best_rank: v.best_rank,
        is_short: v.is_short,
        thumbnail_url: v.thumbnail_url,
        published_at: v.published_at,
        top5_hits: v.top5_hits,
        top10_hits: v.top10_hits
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

      // Calculate daily view growth
      let totalGrowth = 0;
      let validVideos = 0;
      const now = new Date();
      c.videos.forEach((v: any) => {
        if (v.published_at && v.view_count) {
          const p = new Date(v.published_at);
          const days = Math.max(1, (now.getTime() - p.getTime()) / (1000 * 60 * 60 * 24));
          totalGrowth += (v.view_count / days);
          validVideos++;
        }
      });
      const avgDailyGrowth = validVideos > 0 ? Math.round(totalGrowth / validVideos) : 0;

      return {
        id: c.channel_id,
        name: c.name,
        views: c.views,
        count: c.count,
        shortsRatio,
        avgViews,
        kwCount,
        brandCount,
        bestRank: c.bestRank,
        top5_hits: c.top5_hits,
        top10_hits: c.top10_hits,
        brandsList,
        dailyGrowth: avgDailyGrowth,
        dailyGrowthPct: c.views > 0 ? Number(((avgDailyGrowth / c.views) * 100).toFixed(4)) : 0,
        kws: Array.from(c.kws),
        creatorVideos: c.videos.sort((a: any, b: any) => b.view_count - a.view_count)
      }
    }).sort((a, b) => sortBy === 'keywords' ? b.kwCount - a.kwCount : b.views - a.views)

    return NextResponse.json({ creators })
  } catch (e: any) {
    console.error('API /creators error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
