/**
 * YouTube Scraper Worker
 *
 * Scrapes YouTube channels via Data API v3, computes engagement metrics,
 * and pushes results into cp_raw_creators / cp_filtered_creators.
 *
 * Supports two modes:
 *   1. Keyword search — searches YouTube for videos matching a keyword,
 *      extracts unique channels, fetches full channel + video stats.
 *   2. Channel crawl — given a seed channel URL, fetches that channel's
 *      related channels (via search) and crawls breadth-first.
 *
 * Quota budget: Each search costs 100 units. Each channels.list costs 1 unit.
 * Each videos.list costs 1 unit. YouTube daily limit = 10,000 units.
 */

import { getCPClient } from '@/lib/cp-db'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// ── Types ──────────────────────────────────────────────────────────

export interface YouTubeScrapeResult {
  channel_id: string
  handle: string
  title: string
  description: string
  thumbnail_url: string
  subscriber_count: number
  video_count: number
  total_views: number
  country: string
  avg_views: number
  avg_likes: number
  avg_comments: number
  engagement_rate: number
  recent_videos: number
  email: string | null
}

export interface ScrapeProgress {
  channels_found: number
  channels_passed: number
  channels_failed: number
  quota_used: number
  quota_limit: number
  current_phase: string
}

// ── Tier thresholds ────────────────────────────────────────────────

const SUBSCRIBER_TIERS = [
  { max: 10_000, tier: 'nano' as const },
  { max: 100_000, tier: 'micro' as const },
  { max: 500_000, tier: 'mid' as const },
  { max: 5_000_000, tier: 'macro' as const },
  { max: Infinity, tier: 'mega' as const },
]

function getTier(subs: number): string {
  for (const t of SUBSCRIBER_TIERS) {
    if (subs < t.max) return t.tier
  }
  return 'nano'
}

// ── API Key management ─────────────────────────────────────────────

function getApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY || null
}

async function ytFetch(url: URL): Promise<any> {
  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as any)?.error?.message || res.statusText
    throw new Error(`YouTube API ${res.status}: ${msg}`)
  }
  return res.json()
}

// ── Core scraping functions ────────────────────────────────────────

/**
 * Search YouTube for videos matching a keyword, return unique channel IDs
 */
export async function searchYouTubeChannels(
  keyword: string,
  maxResults = 50,
  regionCode = 'IN'
): Promise<{ channels: Map<string, { title: string; thumbnail: string }>; quotaCost: number }> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured')

  const url = new URL(`${YOUTUBE_API_BASE}/search`)
  url.searchParams.set('part', 'id,snippet')
  url.searchParams.set('q', keyword)
  url.searchParams.set('type', 'channel')
  url.searchParams.set('maxResults', String(Math.min(maxResults, 50)))
  url.searchParams.set('regionCode', regionCode)
  url.searchParams.set('key', apiKey)

  const data = await ytFetch(url)
  const channels = new Map<string, { title: string; thumbnail: string }>()

  for (const item of data.items || []) {
    const id = item.id?.channelId
    if (!id) continue
    channels.set(id, {
      title: item.snippet?.title || '',
      thumbnail: item.snippet?.thumbnails?.default?.url || '',
    })
  }

  return { channels, quotaCost: 100 }
}

/**
 * Search YouTube for videos (not channels) to discover channels via video results
 */
export async function searchYouTubeVideos(
  keyword: string,
  maxResults = 50,
  regionCode = 'IN'
): Promise<{ channels: Map<string, { title: string; thumbnail: string }>; quotaCost: number }> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured')

  const url = new URL(`${YOUTUBE_API_BASE}/search`)
  url.searchParams.set('part', 'id,snippet')
  url.searchParams.set('q', keyword)
  url.searchParams.set('type', 'video')
  url.searchParams.set('maxResults', String(Math.min(maxResults, 50)))
  url.searchParams.set('regionCode', regionCode)
  url.searchParams.set('key', apiKey)

  const data = await ytFetch(url)
  const channels = new Map<string, { title: string; thumbnail: string }>()

  for (const item of data.items || []) {
    const channelId = item.snippet?.channelId
    if (!channelId) continue
    channels.set(channelId, {
      title: item.snippet?.channelTitle || '',
      thumbnail: item.snippet?.thumbnails?.default?.url || '',
    })
  }

  return { channels, quotaCost: 100 }
}

/**
 * Fetch full channel metadata + recent video stats for a batch of channel IDs
 */
export async function fetchChannelBatch(
  channelIds: string[]
): Promise<YouTubeScrapeResult[]> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured')

  const results: YouTubeScrapeResult[] = []

  // Process in batches of 50 (YouTube API limit)
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50)

    // 1. Fetch channel metadata
    const channelUrl = new URL(`${YOUTUBE_API_BASE}/channels`)
    channelUrl.searchParams.set('part', 'snippet,statistics,contentDetails')
    channelUrl.searchParams.set('id', batch.join(','))
    channelUrl.searchParams.set('key', apiKey)

    const channelData = await ytFetch(channelUrl)

    for (const ch of channelData.items || []) {
      const snippet = ch.snippet || {}
      const stats = ch.statistics || {}
      const content = ch.contentDetails || {}

      const subscriberCount = parseInt(stats.subscriberCount || '0', 10)
      const videoCount = parseInt(stats.videoCount || '0', 10)
      const totalViews = parseInt(stats.viewCount || '0', 10)

      // 2. Fetch recent videos for this channel
      let avgViews = 0
      let avgLikes = 0
      let avgComments = 0
      let recentVideoCount = 0

      try {
        const uploadsPlaylistId = content.relatedPlaylists?.uploads
        if (uploadsPlaylistId) {
          const playlistUrl = new URL(`${YOUTUBE_API_BASE}/playlistItems`)
          playlistUrl.searchParams.set('part', 'snippet')
          playlistUrl.searchParams.set('playlistId', uploadsPlaylistId)
          playlistUrl.searchParams.set('maxResults', '10')
          playlistUrl.searchParams.set('key', apiKey)

          const playlistData = await ytFetch(playlistUrl)
          const videoIds = (playlistData.items || [])
            .map((item: any) => item.snippet?.resourceId?.videoId)
            .filter(Boolean)
            .join(',')

          if (videoIds) {
            const videoUrl = new URL(`${YOUTUBE_API_BASE}/videos`)
            videoUrl.searchParams.set('part', 'statistics,contentDetails')
            videoUrl.searchParams.set('id', videoIds)
            videoUrl.searchParams.set('key', apiKey)

            const videoData = await ytFetch(videoUrl)
            const videos = videoData.items || []
            recentVideoCount = videos.length

            if (videos.length > 0) {
              const totalVIEWS = videos.reduce((s: number, v: any) => s + parseInt(v.statistics?.viewCount || '0', 10), 0)
              const totalLIKES = videos.reduce((s: number, v: any) => s + parseInt(v.statistics?.likeCount || '0', 10), 0)
              const totalCOMMENTS = videos.reduce((s: number, v: any) => s + parseInt(v.statistics?.commentCount || '0', 10), 0)

              avgViews = Math.round(totalVIEWS / videos.length)
              avgLikes = Math.round(totalLIKES / videos.length)
              avgComments = Math.round(totalCOMMENTS / videos.length)
            }
          }
        }
      } catch {
        // Video fetch failed, use 0s
      }

      // 3. Extract email from description
      const email = extractEmail(snippet.description || '')

      // 4. Compute engagement rate
      const engagementRate = subscriberCount > 0
        ? parseFloat(((avgLikes + avgComments) / subscriberCount * 100).toFixed(4))
        : 0

      // 5. Build result
      const handle = snippet.customUrl || `@${snippet.title?.replace(/\s+/g, '')}` || ch.id

      results.push({
        channel_id: ch.id,
        handle,
        title: snippet.title || '',
        description: (snippet.description || '').slice(0, 500),
        thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        subscriber_count: subscriberCount,
        video_count: videoCount,
        total_views: totalViews,
        country: snippet.country || '',
        avg_views: avgViews,
        avg_likes: avgLikes,
        avg_comments: avgComments,
        engagement_rate: engagementRate,
        recent_videos: recentVideoCount,
        email,
      })
    }
  }

  return results
}

/**
 * Extract email address from text (YouTube channel descriptions)
 */
function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  return match ? match[0].toLowerCase() : null
}

// ── Filter pipeline ────────────────────────────────────────────────

export interface FilterOptions {
  minSubscribers?: number
  maxSubscribers?: number
  minAvgViews?: number
  minEngagement?: number
  countries?: string[]
  excludeCountries?: string[]
}

const DEFAULT_FILTER: FilterOptions = {
  minSubscribers: 5000,
  maxSubscribers: 5_000_000,
  minAvgViews: 1000,
  minEngagement: 1.0,
  excludeCountries: [],
}

export function passesFilter(ch: YouTubeScrapeResult, opts: FilterOptions = {}): boolean {
  const f = { ...DEFAULT_FILTER, ...opts }

  if (f.minSubscribers && ch.subscriber_count < f.minSubscribers) return false
  if (f.maxSubscribers && ch.subscriber_count > f.maxSubscribers) return false
  if (f.minAvgViews && ch.avg_views < f.minAvgViews) return false
  if (f.minEngagement && ch.engagement_rate < f.minEngagement) return false
  if (f.countries?.length && ch.country && !f.countries.includes(ch.country)) return false
  if (f.excludeCountries?.length && ch.country && f.excludeCountries.includes(ch.country)) return false

  return true
}

// ── Database persistence ───────────────────────────────────────────

export async function saveToDatabase(
  results: YouTubeScrapeResult[],
  jobId: string,
  filterOpts?: FilterOptions
): Promise<{ raw: number; filtered: number; skipped: number }> {
  const cp = getCPClient()
  let raw = 0
  let filtered = 0
  let skipped = 0

  // Get existing handles for dedupe
  const { data: existingRaw } = await cp
    .from('cp_raw_creators')
    .select('handle')
  const existingHandles = new Set((existingRaw || []).map((r: any) => r.handle?.toLowerCase()))

  for (const ch of results) {
    const handle = ch.channel_id // Use channel_id as unique handle

    if (existingHandles.has(handle)) {
      skipped++
      continue
    }

    // Insert raw
    try {
      await cp.from('cp_raw_creators').insert({
        handle,
        full_name: ch.title,
        bio: ch.description,
        profile_pic_url: ch.thumbnail_url,
        is_verified: ch.subscriber_count >= 100_000, // Heuristic
        is_private: false,
        is_business: false,
        followers: ch.subscriber_count,
        following: 0,
        posts_count: ch.video_count,
        avg_views: ch.avg_views,
        avg_likes: ch.avg_likes,
        avg_comments: ch.avg_comments,
        engagement_rate: ch.engagement_rate,
        email: ch.email,
        category: ch.country || null,
        source: 'youtube_api',
        source_job_id: jobId,
        status: 'raw',
      })
      raw++
      existingHandles.add(handle)
    } catch {
      skipped++
      continue
    }

    // Check filter
    if (passesFilter(ch, filterOpts)) {
      const tier = getTier(ch.subscriber_count)
      try {
        await cp.from('cp_filtered_creators').insert({
          raw_creator_id: null,
          handle,
          full_name: ch.title,
          bio: ch.description,
          profile_pic_url: ch.thumbnail_url,
          is_verified: ch.subscriber_count >= 100_000,
          email: ch.email,
          followers: ch.subscriber_count,
          following: 0,
          posts_count: ch.video_count,
          avg_views: ch.avg_views,
          avg_likes: ch.avg_likes,
          avg_comments: ch.avg_comments,
          engagement_rate: ch.engagement_rate,
          views_to_followers_ratio: ch.subscriber_count > 0
            ? parseFloat((ch.avg_views / ch.subscriber_count).toFixed(4))
            : 0,
          category: ch.country || null,
          tier,
          score_breakdown: {
            subscribers: ch.subscriber_count,
            avg_views: ch.avg_views,
            engagement: ch.engagement_rate,
            country: ch.country,
            recent_videos: ch.recent_videos,
          },
          score_passed: true,
          outreach_status: 'not_contacted',
        })
        filtered++
      } catch {
        skipped++
      }
    }
  }

  return { raw, filtered, skipped }
}

// ── Main scrape orchestrator ───────────────────────────────────────

export interface ScrapeJobConfig {
  keyword: string
  mode: 'keyword_channels' | 'keyword_videos' | 'channel_crawl'
  maxChannels?: number
  regionCode?: string
  filter?: FilterOptions
}

export async function runYouTubeScrape(
  jobId: string,
  config: ScrapeJobConfig,
  progressCallback?: (progress: ScrapeProgress) => void
): Promise<{ raw: number; filtered: number; skipped: number; quotaUsed: number }> {
  const cp = getCPClient()
  const maxChannels = config.maxChannels || 200
  const filterOpts = config.filter || {}

  // Update job status
  await cp.from('cp_scrape_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId)

  let allChannelIds = new Map<string, { title: string; thumbnail: string }>()
  let quotaUsed = 0

  try {
    // Phase 1: Discover channels
    progressCallback?.({
      channels_found: 0,
      channels_passed: 0,
      channels_failed: 0,
      quota_used: quotaUsed,
      quota_limit: 10000,
      current_phase: 'searching',
    })

    if (config.mode === 'keyword_channels' || config.mode === 'keyword_videos') {
      const searchFn = config.mode === 'keyword_channels' ? searchYouTubeChannels : searchYouTubeVideos
      const { channels, quotaCost } = await searchFn(config.keyword, 50, config.regionCode)
      quotaUsed += quotaCost

      for (const [id, info] of channels) {
        allChannelIds.set(id, info)
      }
    } else if (config.mode === 'channel_crawl') {
      // For channel crawl, search for the seed channel
      const { channels, quotaCost } = await searchYouTubeChannels(config.keyword, 10, config.regionCode)
      quotaUsed += quotaCost
      for (const [id, info] of channels) {
        allChannelIds.set(id, info)
      }

      // Then search for related channels using the seed as a keyword
      const { channels: related, quotaCost: relCost } = await searchYouTubeVideos(config.keyword, 50, config.regionCode)
      quotaUsed += relCost
      for (const [id, info] of related) {
        allChannelIds.set(id, info)
      }
    }

    // Trim to max
    const channelIds = Array.from(allChannelIds.keys()).slice(0, maxChannels)

    progressCallback?.({
      channels_found: channelIds.length,
      channels_passed: 0,
      channels_failed: 0,
      quota_used: quotaUsed,
      quota_limit: 10000,
      current_phase: 'fetching_details',
    })

    // Phase 2: Fetch channel details in batches of 50
    let allResults: YouTubeScrapeResult[] = []

    for (let i = 0; i < channelIds.length; i += 50) {
      const batch = channelIds.slice(i, i + 50)
      const batchResults = await fetchChannelBatch(batch)
      allResults.push(...batchResults)

      // Update progress
      const passed = allResults.filter(r => passesFilter(r, filterOpts)).length
      progressCallback?.({
        channels_found: channelIds.length,
        channels_passed: passed,
        channels_failed: allResults.length - passed,
        quota_used: quotaUsed,
        quota_limit: 10000,
        current_phase: `processing_batch_${Math.floor(i / 50) + 1}`,
      })
    }

    // Phase 3: Save to database
    progressCallback?.({
      channels_found: channelIds.length,
      channels_passed: 0,
      channels_failed: 0,
      quota_used: quotaUsed,
      quota_limit: 10000,
      current_phase: 'saving',
    })

    const saveResult = await saveToDatabase(allResults, jobId, filterOpts)

    // Update job
    await cp.from('cp_scrape_jobs').update({
      status: 'completed',
      progress: 100,
      profiles_found: channelIds.length,
      profiles_passed: saveResult.filtered,
      profiles_failed: channelIds.length - saveResult.filtered,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

    return {
      raw: saveResult.raw,
      filtered: saveResult.filtered,
      skipped: saveResult.skipped,
      quotaUsed,
    }
  } catch (error: any) {
    await cp.from('cp_scrape_jobs').update({
      status: 'failed',
      error_message: error.message || 'Unknown error',
    }).eq('id', jobId)
    throw error
  }
}
