import { NextRequest, NextResponse } from 'next/server'
import { supabase, queryAll } from '@/lib/supabase'
import { authorizeCampaignAccess } from '@/lib/auth'
import { invalidateCampaign } from '@/lib/cache'

export const runtime = 'nodejs'
export const maxDuration = 60

function extractVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = trimmed.match(p)
    if (m) return m[1]
  }
  return null
}

function detectFormat(url: string): 'long' | 'short' {
  if (/\/shorts\//.test(url)) return 'short'
  return 'long'
}

// ── GET /api/our-videos ──────────────────────────────────────────────────────
// Fetches all "our videos" with rankings, creator stats, and growth data.
export async function GET(req: NextRequest) {
  try {
    const cid = req.nextUrl.searchParams.get('campaign_id')
    const view = req.nextUrl.searchParams.get('view') || 'overview'
    const format = req.nextUrl.searchParams.get('format') // 'all' | 'long' | 'short'
    const search = req.nextUrl.searchParams.get('search') || ''
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10)
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10)

    if (!cid) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    const { authorized, error } = await authorizeCampaignAccess(req, cid)
    if (!authorized) return error

    // Fetch ALL campaign videos first (for comparison + our videos)
    const { data: allCampaignVideos } = await supabase
      .from('campaign_videos')
      .select('video_id, is_ours')
      .eq('campaign_id', cid)

    // Filter to only our videos for this specific campaign
    const ourVideoLinks = (allCampaignVideos || []).filter(r => r.is_ours)
    const ourVideoIds = ourVideoLinks.map(r => r.video_id)

    // Fetch our video metadata
    let ourVideos: any[] = []
    if (ourVideoIds.length > 0) {
      const BATCH = 200
      for (let i = 0; i < ourVideoIds.length; i += BATCH) {
        const { data, error: fetchErr } = await supabase
          .from('videos')
          .select(`
            id, youtube_id, title, channel_name, channel_id, view_count, like_count,
            comment_count, duration, duration_sec, thumbnail_url, published_at,
            is_ours, tags, created_at
          `)
          .in('id', ourVideoIds.slice(i, i + BATCH))
          .order('view_count', { ascending: false })
        if (fetchErr) throw fetchErr
        if (data) ourVideos.push(...data)
      }
    }

    // Fetch ALL campaign videos for comparison (ours vs theirs)
    const allCampaignVideoIds = [...new Set((allCampaignVideos || []).map(r => r.video_id))]
    let allCampaignVideoRows: any[] = []
    if (allCampaignVideoIds.length > 0) {
      const BATCH = 200
      for (let i = 0; i < allCampaignVideoIds.length; i += BATCH) {
        const { data } = await supabase
          .from('videos')
          .select('id, view_count, like_count, comment_count')
          .in('id', allCampaignVideoIds.slice(i, i + BATCH))
        if (data) allCampaignVideoRows.push(...data)
      }
    }

    // Compute campaign-wide stats for comparison
    const allCampViews = allCampaignVideoRows.reduce((s, v) => s + (v.view_count || 0), 0)
    const allCampLikes = allCampaignVideoRows.reduce((s, v) => s + (v.like_count || 0), 0)
    const allCampComments = allCampaignVideoRows.reduce((s, v) => s + (v.comment_count || 0), 0)
    const allCampCount = allCampaignVideoRows.length || 1

    // Build lookup map for O(1) is_ours check (was O(n²) with .find())
    const campaignLinkMap = new Map<string, boolean>()
    for (const cv of (allCampaignVideos || [])) {
      campaignLinkMap.set(cv.video_id, !!cv.is_ours)
    }

    const theirVideos = allCampaignVideoRows.filter(v => !campaignLinkMap.get(v.id))
    const theirCount = theirVideos.length || 1
    const theirViews = theirVideos.reduce((s, v) => s + (v.view_count || 0), 0)
    const theirLikes = theirVideos.reduce((s, v) => s + (v.like_count || 0), 0)
    const theirAvgViews = theirCount > 0 ? Math.floor(theirViews / theirCount) : 0

    // Video IDs for this campaign's our videos
    const videoIds = ourVideoIds
    const campaignLinks: Record<string, any> = {}
    for (const l of ourVideoLinks) campaignLinks[l.video_id] = l

    // Fetch keyword rankings for our videos
    const kvQuery = videoIds.length > 0 ? await supabase
      .from('keyword_videos')
      .select('video_id, keyword_id, rank, discovered_at, last_seen_at')
      .eq('campaign_id', cid)
      .in('video_id', videoIds) : { data: [] }

    const ksQuery = videoIds.length > 0 ? await supabase
      .from('keyword_shorts')
      .select('video_id, keyword_id, rank, discovered_at, last_seen_at')
      .eq('campaign_id', cid)
      .in('video_id', videoIds) : { data: [] }

    const kvRows = kvQuery.data || []
    const ksRows = ksQuery.data || []

    // Fetch keyword text for ranked videos
    const allKeywordIds = [...new Set([...kvRows.map(r => r.keyword_id), ...ksRows.map(r => r.keyword_id)])]
    let keywordMap: Record<string, string> = {}
    if (allKeywordIds.length > 0) {
      const { data: kws } = await supabase.from('keywords').select('id, text').in('id', allKeywordIds)
      if (kws) for (const k of kws) keywordMap[k.id] = k.text
    }

    // Build video -> rankings map
    const videoRankings: Record<string, { keyword: string; rank: number; format: string; lastSeen: string }[]> = {}
    for (const r of kvRows) {
      if (!videoRankings[r.video_id]) videoRankings[r.video_id] = []
      videoRankings[r.video_id].push({
        keyword: keywordMap[r.keyword_id] || '—',
        rank: r.rank,
        format: 'long',
        lastSeen: r.last_seen_at,
      })
    }
    for (const r of ksRows) {
      if (!videoRankings[r.video_id]) videoRankings[r.video_id] = []
      videoRankings[r.video_id].push({
        keyword: keywordMap[r.keyword_id] || '—',
        rank: r.rank,
        format: 'short',
        lastSeen: r.last_seen_at,
      })
    }

    // Fetch view snapshots for growth data (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const snapshotsQuery = videoIds.length > 0 ? await supabase
      .from('view_snapshots')
      .select('video_id, view_count, snapshot_date')
      .eq('campaign_id', cid)
      .in('video_id', videoIds)
      .gte('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true }) : { data: [] }

    const snapshots = snapshotsQuery.data || []

    // Build daily views timeline
    const dailyViews: Record<string, number> = {}
    for (const s of snapshots) {
      const date = s.snapshot_date
      dailyViews[date] = (dailyViews[date] || 0) + (s.view_count || 0)
    }
    const viewsTimeline = Object.entries(dailyViews)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Compute per-video growth
    const videoGrowth: Record<string, { current: number; previous: number; growth: number }> = {}
    for (const vid of videoIds) {
      const vidSnapshots = snapshots.filter(s => s.video_id === vid).sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
      if (vidSnapshots.length >= 2) {
        const current = vidSnapshots[vidSnapshots.length - 1].view_count || 0
        const previous = vidSnapshots[vidSnapshots.length - 2].view_count || 0
        videoGrowth[vid] = { current, previous, growth: previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 0 }
      }
    }

    // Filter by format if needed
    let filtered = ourVideos || []
    if (format === 'long') {
      filtered = filtered.filter(v => !v.duration_sec || v.duration_sec > 60)
    } else if (format === 'short') {
      filtered = filtered.filter(v => v.duration_sec && v.duration_sec <= 60)
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(v =>
        v.title?.toLowerCase().includes(q) ||
        v.channel_name?.toLowerCase().includes(q)
      )
    }

    // ── Overview view ──
    if (view === 'overview') {
      const totalViews = filtered.reduce((s, v) => s + (v.view_count || 0), 0)
      const totalLikes = filtered.reduce((s, v) => s + (v.like_count || 0), 0)
      const totalComments = filtered.reduce((s, v) => s + (v.comment_count || 0), 0)
      const rankingVideos = filtered.filter(v => videoRankings[v.id]?.length > 0)
      const channels = new Set(filtered.map(v => v.channel_name).filter(Boolean))

      // Top 5 by views
      const top5 = filtered.slice(0, 5).map(v => ({
        id: v.id, title: v.title, channel_name: v.channel_name, thumbnail_url: v.thumbnail_url,
        view_count: v.view_count, rank: videoRankings[v.id]?.[0]?.rank || null,
        keyword: videoRankings[v.id]?.[0]?.keyword || null,
      }))

      // Channel breakdown
      const channelMap: Record<string, { name: string; count: number; views: number; topVideo: any }> = {}
      for (const v of filtered) {
        const ch = v.channel_name || 'Unknown'
        if (!channelMap[ch]) channelMap[ch] = { name: ch, count: 0, views: 0, topVideo: null }
        channelMap[ch].count++
        channelMap[ch].views += v.view_count || 0
        if (!channelMap[ch].topVideo || (v.view_count || 0) > (channelMap[ch].topVideo.view_count || 0)) {
          channelMap[ch].topVideo = { id: v.id, title: v.title, thumbnail_url: v.thumbnail_url, view_count: v.view_count }
        }
      }
      const topChannels = Object.values(channelMap).sort((a, b) => b.views - a.views).slice(0, 5)

      // Keyword ranking summary
      const keywordSet: Record<string, { count: number; bestRank: number }> = {}
      for (const v of filtered) {
        for (const r of videoRankings[v.id] || []) {
          if (!keywordSet[r.keyword]) keywordSet[r.keyword] = { count: 0, bestRank: 99 }
          keywordSet[r.keyword].count++
          if (r.rank < keywordSet[r.keyword].bestRank) keywordSet[r.keyword].bestRank = r.rank
        }
      }
      const topKeywords = Object.entries(keywordSet)
        .map(([keyword, data]) => ({ keyword, ...data }))
        .sort((a, b) => a.bestRank - b.bestRank)
        .slice(0, 10)

      // 7d growth
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const views7d = Object.entries(dailyViews)
        .filter(([d]) => new Date(d) >= sevenDaysAgo)
        .reduce((s, [, v]) => s + v, 0)
      const viewsPrev7d = Object.entries(dailyViews)
        .filter(([d]) => { const dt = new Date(d); return dt >= new Date(sevenDaysAgo.getTime() - 7 * 86400000) && dt < sevenDaysAgo })
        .reduce((s, [, v]) => s + v, 0)

      // Best rank across all our videos
      let bestRank: number | null = null
      let totalRankings = 0
      for (const v of filtered) {
        for (const r of videoRankings[v.id] || []) {
          totalRankings++
          if (!bestRank || r.rank < bestRank) bestRank = r.rank
        }
      }

      // View share: our views as % of total campaign views
      const viewShare = allCampViews > 0 ? Math.round((totalViews / allCampViews) * 1000) / 10 : 0

      // Our avg views vs their avg views
      const ourAvgViews = filtered.length > 0 ? Math.floor(totalViews / filtered.length) : 0
      const avgViewsDiff = theirAvgViews > 0 ? Math.round(((ourAvgViews - theirAvgViews) / theirAvgViews) * 1000) / 10 : null

      // 7d growth: if prev7d has data, use it; otherwise use views7d as raw number
      const growth7dPct = viewsPrev7d > 0 ? Math.round(((views7d - viewsPrev7d) / viewsPrev7d) * 1000) / 10 : null

      // Rank distribution: how many keywords we rank #1-3, #4-10, #11+
      let rankTop3 = 0, rank4to10 = 0, rank11plus = 0
      for (const v of filtered) {
        for (const r of videoRankings[v.id] || []) {
          if (r.rank <= 3) rankTop3++
          else if (r.rank <= 10) rank4to10++
          else rank11plus++
        }
      }

      return NextResponse.json({
        overview: {
          totalVideos: filtered.length,
          totalViews,
          totalLikes,
          totalComments,
          rankingCount: rankingVideos.length,
          channelCount: channels.size,
          avgViews: ourAvgViews,
          views7d,
          views7dGrowth: growth7dPct,
          bestRank,
          totalRankings,
          viewShare,
          rankTop3,
          rank4to10,
          rank11plus,
        },
        comparison: {
          campaignTotalVideos: allCampCount,
          campaignTotalViews: allCampViews,
          theirVideoCount: theirCount,
          theirTotalViews: theirViews,
          theirAvgViews,
          avgViewsDiff,
          ourEngagement: totalViews > 0 ? Math.round(((totalLikes + totalComments) / totalViews) * 10000) / 100 : 0,
          theirEngagement: theirViews > 0 ? Math.round(((theirLikes + theirVideos.reduce((s, v) => s + (v.comment_count || 0), 0)) / theirViews) * 10000) / 100 : 0,
        },
        top5,
        topChannels,
        topKeywords,
        viewsTimeline,
      })
    }

    // ── Videos view ──
    if (view === 'videos') {
      const offset = (page - 1) * limit
      const paged = filtered.slice(offset, offset + limit)
      const videos = paged.map(v => ({
        id: v.id,
        youtube_id: v.youtube_id,
        title: v.title,
        channel_name: v.channel_name,
        thumbnail_url: v.thumbnail_url,
        view_count: v.view_count,
        like_count: v.like_count,
        comment_count: v.comment_count,
        duration: v.duration,
        duration_sec: v.duration_sec,
        published_at: v.published_at,
        is_short: v.duration_sec && v.duration_sec <= 60,
        rankings: videoRankings[v.id] || [],
        bestRank: videoRankings[v.id]?.length ? Math.min(...videoRankings[v.id].map(r => r.rank)) : null,
        growth: videoGrowth[v.id] || null,
      }))

      return NextResponse.json({
        videos,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      })
    }

    // ── Creators view ──
    if (view === 'creators') {
      const channelMap: Record<string, {
        name: string; count: number; views: number; avgViews: number;
        topVideo: any; keywords: string[]; growth7d: number; growth30d: number;
      }> = {}

      for (const v of filtered) {
        const ch = v.channel_name || 'Unknown'
        if (!channelMap[ch]) {
          channelMap[ch] = {
            name: ch, count: 0, views: 0, avgViews: 0,
            topVideo: { id: v.id, title: v.title, thumbnail_url: v.thumbnail_url, view_count: v.view_count },
            keywords: [], growth7d: 0, growth30d: 0,
          }
        }
        channelMap[ch].count++
        channelMap[ch].views += v.view_count || 0
        if ((v.view_count || 0) > (channelMap[ch].topVideo.view_count || 0)) {
          channelMap[ch].topVideo = { id: v.id, title: v.title, thumbnail_url: v.thumbnail_url, view_count: v.view_count }
        }
        for (const r of videoRankings[v.id] || []) {
          if (!channelMap[ch].keywords.includes(r.keyword)) channelMap[ch].keywords.push(r.keyword)
        }
      }

      const creators = Object.values(channelMap).map(ch => ({
        ...ch,
        avgViews: ch.count > 0 ? Math.floor(ch.views / ch.count) : 0,
      })).sort((a, b) => b.views - a.views)

      return NextResponse.json({ creators })
    }

    // ── Rankings view ──
    if (view === 'rankings') {
      const ranked = filtered
        .filter(v => videoRankings[v.id]?.length > 0)
        .map(v => ({
          id: v.id,
          title: v.title,
          channel_name: v.channel_name,
          thumbnail_url: v.thumbnail_url,
          view_count: v.view_count,
          is_short: v.duration_sec && v.duration_sec <= 60,
          rankings: videoRankings[v.id] || [],
          bestRank: Math.min(...(videoRankings[v.id] || []).map(r => r.rank)),
        }))
        .sort((a, b) => a.bestRank - b.bestRank)

      return NextResponse.json({ rankings: ranked })
    }

    // ── Growth view ──
    if (view === 'growth') {
      const growthData = filtered.map(v => {
        const snaps = snapshots.filter(s => s.video_id === v.id).sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
        const last7 = snaps.slice(-7)
        const prev7 = snaps.slice(-14, -7)
        const current7d = last7.length > 0 ? last7[last7.length - 1].view_count - last7[0].view_count : 0
        const prev7d = prev7.length > 0 ? prev7[prev7.length - 1].view_count - prev7[0].view_count : current7d
        const trend = last7.map(s => ({ date: s.snapshot_date, views: s.view_count }))

        return {
          id: v.id,
          title: v.title,
          channel_name: v.channel_name,
          thumbnail_url: v.thumbnail_url,
          view_count: v.view_count,
          is_short: v.duration_sec && v.duration_sec <= 60,
          growth7d: current7d,
          growth7dPct: prev7d > 0 ? Math.round(((current7d - prev7d) / Math.abs(prev7d || 1)) * 1000) / 10 : 0,
          trend,
        }
      }).sort((a, b) => b.growth7d - a.growth7d)

      return NextResponse.json({ growth: growthData, viewsTimeline })
    }

    return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 })
  } catch (e: any) {
    console.error('Our videos API error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── POST /api/our-videos ─────────────────────────────────────────────────────
// Bulk-add video URLs and mark as ours. Uses batch processing for 100+ URLs.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { campaign_id, urls } = body

    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })
    if (!urls?.length) return NextResponse.json({ error: 'urls array required' }, { status: 400 })

    const { authorized, error } = await authorizeCampaignAccess(req, campaign_id)
    if (!authorized) return error

    const results: { added: string[]; skipped: string[]; errors: { url: string; error: string }[] } = {
      added: [], skipped: [], errors: [],
    }

    // Step 1: Extract and deduplicate video IDs
    const urlMap = new Map<string, string>() // videoId -> raw url
    for (const rawUrl of urls) {
      const url = typeof rawUrl === 'string' ? rawUrl : rawUrl.url
      const videoId = extractVideoId(url)
      if (!videoId) {
        results.errors.push({ url, error: 'Invalid YouTube URL' })
      } else if (!urlMap.has(videoId)) {
        urlMap.set(videoId, url)
      }
    }

    const uniqueIds = [...urlMap.keys()]
    if (uniqueIds.length === 0) {
      return NextResponse.json({ ok: true, added: 0, skipped: 0, errors: results.errors.length, details: results })
    }

    // Step 2: Batch-check which videos already exist
    const BATCH = 200
    const existingMap = new Map<string, { id: string; youtube_id: string }>()
    for (let i = 0; i < uniqueIds.length; i += BATCH) {
      const { data } = await supabase
        .from('videos')
        .select('id, youtube_id')
        .in('youtube_id', uniqueIds.slice(i, i + BATCH))
      if (data) for (const v of data) existingMap.set(v.youtube_id, v)
    }

    // Step 3: Batch-check campaign links
    const existingIds = [...existingMap.values()].map(v => v.id)
    const campaignLinkMap = new Map<string, boolean>() // videoId -> is_ours
    if (existingIds.length > 0) {
      for (let i = 0; i < existingIds.length; i += BATCH) {
        const { data } = await supabase
          .from('campaign_videos')
          .select('video_id, is_ours')
          .eq('campaign_id', campaign_id)
          .in('video_id', existingIds.slice(i, i + BATCH))
        if (data) for (const l of data) campaignLinkMap.set(l.video_id, !!l.is_ours)
      }
    }

    // Step 4: Process existing videos — skip if already ours in this campaign, otherwise link
    const toLinkExisting: { video_id: string; is_ours: boolean }[] = []
    for (const videoId of uniqueIds) {
      const existing = existingMap.get(videoId)
      if (!existing) continue

      if (campaignLinkMap.get(existing.id)) {
        results.skipped.push(videoId)
      } else {
        toLinkExisting.push({ video_id: existing.id, is_ours: true })
        results.added.push(videoId)
      }
    }

    // Batch update existing videos + links
    if (toLinkExisting.length > 0) {
      const videoIdsToUpdate = toLinkExisting.map(r => r.video_id)
      await supabase.from('videos').update({ is_ours: true }).in('id', videoIdsToUpdate)
      for (let i = 0; i < toLinkExisting.length; i += BATCH) {
        const batch = toLinkExisting.slice(i, i + BATCH)
        const { data: existingLinks } = await supabase
          .from('campaign_videos')
          .select('video_id')
          .eq('campaign_id', campaign_id)
          .in('video_id', batch.map(r => r.video_id))
        const linkedSet = new Set((existingLinks || []).map(r => r.video_id))
        const toInsert = batch.filter(r => !linkedSet.has(r.video_id))
        const toUpdate = batch.filter(r => linkedSet.has(r.video_id))
        if (toInsert.length > 0) {
          await supabase.from('campaign_videos').insert(
            toInsert.map(r => ({ campaign_id, video_id: r.video_id, is_ours: true }))
          )
        }
        if (toUpdate.length > 0) {
          await supabase.from('campaign_videos')
            .update({ is_ours: true })
            .eq('campaign_id', campaign_id)
            .in('video_id', toUpdate.map(r => r.video_id))
        }
      }
    }

    // Step 5: Process new videos — batch-fetch oEmbed (parallel with concurrency limit)
    const newVideoIds = uniqueIds.filter(id => !existingMap.has(id))
    if (newVideoIds.length > 0) {
      const CONCURRENCY = 10
      const oembedResults = new Map<string, any>()

      for (let i = 0; i < newVideoIds.length; i += CONCURRENCY) {
        const batch = newVideoIds.slice(i, i + CONCURRENCY)
        const promises = batch.map(async (videoId) => {
          try {
            const res = await fetch(
              `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
            )
            if (res.ok) {
              const data = await res.json()
              oembedResults.set(videoId, data)
            } else {
              results.errors.push({ url: urlMap.get(videoId) || videoId, error: 'Video not found or unavailable' })
            }
          } catch {
            results.errors.push({ url: urlMap.get(videoId) || videoId, error: 'Failed to fetch metadata' })
          }
        })
        await Promise.all(promises)
      }

      // Batch-insert new videos
      const videosToInsert = newVideoIds
        .filter(id => oembedResults.has(id))
        .map(id => {
          const oembed = oembedResults.get(id)
          return {
            youtube_id: id,
            title: oembed.title || 'Unknown Title',
            channel_name: oembed.author_name || 'Unknown Channel',
            channel_id: oembed.author_url?.split('/').pop() || '',
            thumbnail_url: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
            is_deleted: false,
            is_ours: true,
          }
        })

      const insertedMap = new Map<string, string>() // youtube_id -> internal id
      for (let i = 0; i < videosToInsert.length; i += BATCH) {
        const batch = videosToInsert.slice(i, i + BATCH)
        const { data } = await supabase
          .from('videos')
          .upsert(batch, { onConflict: 'youtube_id', ignoreDuplicates: false })
          .select('id, youtube_id')
        if (data) for (const v of data) insertedMap.set(v.youtube_id, v.id)
      }

      // Batch-insert campaign links for new videos
      const newLinks = newVideoIds
        .filter(id => insertedMap.has(id))
        .map(id => ({ campaign_id, video_id: insertedMap.get(id)!, is_ours: true }))

      for (let i = 0; i < newLinks.length; i += BATCH) {
        const batch = newLinks.slice(i, i + BATCH)
        const { error: linkErr } = await supabase.from('campaign_videos').insert(batch)
        if (linkErr && !linkErr.message?.includes('duplicate')) {
          // Non-fatal: videos are still marked as ours globally
        }
      }

      // Track newly added
      for (const id of newVideoIds) {
        if (insertedMap.has(id) && !results.added.includes(id)) {
          results.added.push(id)
        }
      }
    }

    // Invalidate leaderboard + overview caches
    await invalidateCampaign(campaign_id)

    return NextResponse.json({
      ok: true,
      added: results.added.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      details: results,
    })
  } catch (e: any) {
    console.error('Our videos POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── DELETE /api/our-videos ───────────────────────────────────────────────────
// Remove videos from "our" list (unmark is_ours).
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { video_ids, campaign_id } = body

    if (!video_ids?.length) return NextResponse.json({ error: 'video_ids required' }, { status: 400 })

    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    // Only remove from this campaign, don't touch global is_ours
    const { error: vErr } = await supabase
      .from('campaign_videos')
      .update({ is_ours: false })
      .in('video_id', video_ids)
      .eq('campaign_id', campaign_id)
    if (vErr) throw vErr

    // Sync global is_ours: unset if no other campaign has it as ours
    for (const vid of video_ids) {
      const { data: otherCampaigns } = await supabase
        .from('campaign_videos')
        .select('campaign_id')
        .eq('video_id', vid)
        .eq('is_ours', true)
        .neq('campaign_id', campaign_id)
        .limit(1)

      if (!otherCampaigns?.length) {
        await supabase
          .from('videos')
          .update({ is_ours: false })
          .eq('id', vid)
      }
    }

    // Invalidate leaderboard + overview caches so is_ours changes are visible immediately
    if (campaign_id) await invalidateCampaign(campaign_id)

    return NextResponse.json({ ok: true, removed: video_ids.length })
  } catch (e: any) {
    console.error('Our videos DELETE error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
