import { queryAll, queryOne, batchUpsert } from './supabase'
import {
  searchYouTubeOAuth,
  getVideoDetailsOAuth,
  getViewCountsOAuth,
  type SearchOrder,
  type SearchVideoDuration,
} from './youtube-oauth'
import { filterEligibleChannels } from './channel-filter'
import { decryptApiKey } from './crypto'
import { fetchTranscript } from './transcript'
import { analyzeBrandsFromTranscript, detectIrrelevantVideo } from './brand-analyzer'

export interface ScrapeResult {
  saved: number
  ranked: number
  pool_added: number
  quota_cost: number
  new_videos_fetched: number
  reused_from_pool: number
  /** Long-form videos ranked for this keyword (target: 10). */
  long_form?: number
  /** Short-form videos ranked for this keyword (target: 10). */
  short_form?: number
  /** Search pages walked to reach the targets. */
  pages_fetched?: number
  /** Hits dropped because the channel declares a non-Indian country. */
  rejected_foreign?: number
  /** Hits dropped because the channel belongs to a brand. */
  rejected_brand?: number
  /** True when the API returned nothing and the campaign pool was used instead. */
  used_pool_fallback?: boolean
}

interface SearchHit {
  position: number
  youtube_id: string
  title: string
  channel_name: string
  channel_id: string
  published_at: string
  thumbnail_url: string
}

interface YouTubeVideo {
  youtube_id: string
  title: string
  description: string
  channel_name: string
  channel_id: string
  view_count: number
  published_at: string
  thumbnail_url: string
  duration: string
  duration_sec: number
  tags: string[]
}

function parseDurationSec(duration: string | null): number {
  if (!duration) return 0
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const h = parseInt(match[1] ?? '0', 10)
  const m = parseInt(match[2] ?? '0', 10)
  const s = parseInt(match[3] ?? '0', 10)
  return h * 3600 + m * 60 + s
}





function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

async function getKeyFromSupabase(minUnits: number = 100): Promise<{ api_key: string; key_id: string } | null> {
  const rows = await queryAll<{ id: string; api_key: string; units_used: number }>(
    `UPDATE api_keys SET units_used = units_used + $1, last_used_at = NOW()
     WHERE id = (
       SELECT id FROM api_keys
       WHERE is_active = TRUE AND (units_used + $2) <= units_limit
       ORDER BY units_used ASC LIMIT 1
     )
     RETURNING id, api_key, units_used`,
    [minUnits, minUnits]
  )
  if (!rows || rows.length === 0) return null
  const row = rows[0]
  let key: string
  try { key = decryptApiKey(row.api_key) } catch { key = row.api_key }
  return { api_key: key, key_id: row.id }
}

async function searchYouTubeViaApiKey(
  keyword: string, maxResults: number = 50, regionCode: string = 'IN', order: SearchOrder = 'relevance',
  pageToken?: string, videoDuration?: SearchVideoDuration
): Promise<{ hits: SearchHit[]; quota_cost: number; nextPageToken?: string }> {
  // search.list is billed 1 call against the separate Search Queries bucket
  // (not the shared units pool) since the June 2026 quota split.
  const keyInfo = await getKeyFromSupabase(1)
  if (!keyInfo) throw new Error('NO_API_KEYS')

  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'id,snippet')
  url.searchParams.set('q', keyword)
  url.searchParams.set('type', 'video')
  url.searchParams.set('maxResults', String(Math.min(maxResults, 50)))
  url.searchParams.set('regionCode', regionCode)
  url.searchParams.set('order', order)
  if (pageToken) url.searchParams.set('pageToken', pageToken)
  if (videoDuration && videoDuration !== 'any') url.searchParams.set('videoDuration', videoDuration)
  url.searchParams.set('key', keyInfo.api_key)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    if (res.status === 403 || res.status === 429) {
      await queryAll(`UPDATE api_keys SET units_used = units_limit WHERE id = $1`, [keyInfo.key_id])
    }
    throw new Error(`YouTube API error (${res.status}): ${err?.error?.message || res.statusText}`)
  }

  const data = await res.json() as any
  const hits: SearchHit[] = (data.items || [])
    .map((item: any, index: number) => ({
      position: index + 1,
      youtube_id: item.id?.videoId || '',
      title: item.snippet?.title ?? '',
      channel_name: item.snippet?.channelTitle ?? '',
      channel_id: item.snippet?.channelId ?? '',
      published_at: item.snippet?.publishedAt ?? '',
      thumbnail_url: item.snippet?.thumbnails?.medium?.url ?? '',
    }))
    .filter((h: SearchHit) => Boolean(h.youtube_id))

  return { hits, quota_cost: 1, nextPageToken: data.nextPageToken }
}

async function fetchVideoDetailsViaApiKey(youtubeIds: string[]): Promise<{ videos: YouTubeVideo[]; quota_cost: number }> {
  if (youtubeIds.length === 0) return { videos: [], quota_cost: 0 }
  const keyInfo = await getKeyFromSupabase(1)
  if (!keyInfo) throw new Error('NO_API_KEYS')

  const ids = youtubeIds.slice(0, 50)
  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'statistics,snippet,contentDetails')
  url.searchParams.set('id', ids.join(','))
  url.searchParams.set('key', keyInfo.api_key)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any
    throw new Error(`YouTube API error (${res.status}): ${err?.error?.message || res.statusText}`)
  }

  const data = await res.json() as any
  const videos: YouTubeVideo[] = (data.items || []).map((item: any) => ({
    youtube_id: item.id,
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    channel_name: item.snippet?.channelTitle || '',
    channel_id: item.snippet?.channelId || '',
    view_count: parseInt(item.statistics?.viewCount || '0', 10),
    published_at: item.snippet?.publishedAt || '',
    thumbnail_url: item.snippet?.thumbnails?.medium?.url || '',
    duration: item.contentDetails?.duration || '',
    duration_sec: parseDurationSec(item.contentDetails?.duration),
    tags: [],
  }))

  return { videos, quota_cost: 1 }
}

async function getCampaignPoolIds(campaignId: string): Promise<Set<string>> {
  const rows = await queryAll<{ youtube_id: string }>(
    `SELECT v.youtube_id FROM campaign_videos cv INNER JOIN videos v ON v.id = cv.video_id WHERE cv.campaign_id = $1`,
    [campaignId]
  )
  return new Set(rows.map(r => r.youtube_id).filter(Boolean))
}



const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'price', 'vs', 'review', 'best', 'top', 'new', '2024', '2025', '2026', '2027',
])

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\u0B80-\u0BFF\u0900-\u097F\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
}

function scoreKeywordRelevance(title: string, description: string, channelName: string, keywordText: string): number {
  const kwTokens = tokenize(keywordText)
  if (kwTokens.length === 0) return 0

  const titleTokens = tokenize(title)
  const descTokens = tokenize(description).slice(0, 100)
  const channelTokens = tokenize(channelName)

  let score = 0
  const titleSet = new Set(titleTokens)
  const channelSet = new Set(channelTokens)

  for (const kw of kwTokens) {
    if (titleSet.has(kw)) score += 3
    if (channelSet.has(kw)) score += 1
    for (const dt of descTokens) {
      if (dt === kw) { score += 1; break }
    }
    for (const tt of titleTokens) {
      if (tt.includes(kw) || kw.includes(tt)) { score += 2; break }
    }
  }

  return score
}

async function loadKeywordRelevantPoolVideos(campaignId: string, keywordText: string, limit: number = 50): Promise<YouTubeVideo[]> {
  const rows = await queryAll<any>(
    `SELECT v.youtube_id, v.title, v.description, v.channel_name, v.channel_id,
            v.view_count, v.published_at, v.thumbnail_url, v.duration, v.duration_sec, v.tags
     FROM campaign_videos cv
     INNER JOIN videos v ON v.id = cv.video_id
     WHERE cv.campaign_id = $1
     ORDER BY v.view_count DESC
     LIMIT 500`,
    [campaignId]
  )

  const scored = rows.map(r => ({
    video: {
      youtube_id: r.youtube_id || '',
      title: r.title || '',
      description: r.description || '',
      channel_name: r.channel_name || '',
      channel_id: r.channel_id || '',
      view_count: r.view_count || 0,
      published_at: r.published_at || '',
      thumbnail_url: r.thumbnail_url || '',
      duration: r.duration || '',
      duration_sec: r.duration_sec || 0,
      tags: Array.isArray(r.tags) ? r.tags : [],
    } as YouTubeVideo,
    score: scoreKeywordRelevance(r.title || '', r.description || '', r.channel_name || '', keywordText),
  }))

  scored.sort((a, b) => b.score - a.score || b.video.view_count - a.video.view_count)

  const minScore = scored.length > 0 ? scored[0].score : 0
  if (minScore > 0) {
    return scored.filter(s => s.score >= Math.max(1, minScore * 0.3)).slice(0, limit).map(s => s.video)
  }
  return scored.slice(0, limit).map(s => s.video)
}





/**
 * Snapshot this keyword's current ranking into keyword_rank_history before it is
 * overwritten. Without this the weekly refresh would destroy the very data that
 * week-over-week movement is computed from.
 */
export async function archiveKeywordRanks(keywordId: string, campaignId: string): Promise<void> {
  const weekStart = getWeekStart()

  const archive = async (table: 'keyword_videos' | 'keyword_shorts', formType: 'long' | 'short') => {
    await queryAll(
      `INSERT INTO keyword_rank_history (id, keyword_id, campaign_id, video_id, rank, form_type, week_start)
       SELECT gen_random_uuid(), keyword_id, campaign_id, video_id, rank, $1, $2
       FROM ${table} WHERE keyword_id = $3
       ON CONFLICT (keyword_id, video_id, form_type, week_start) DO NOTHING`,
      [formType, weekStart, keywordId]
    )
  }

  try {
    await archive('keyword_videos', 'long')
    await archive('keyword_shorts', 'short')
  } catch (err) {
    // History is valuable but must not block the refresh itself.
    console.error(`Failed to archive ranks for keyword ${keywordId} (campaign ${campaignId}):`, err)
  }
}

/** Videos at or under this length are Shorts. */
const SHORT_MAX_SEC = 60

/** How many videos we want per format for every keyword. */
const TARGET_PER_FORMAT = 10

/**
 * How many 50-result *unfiltered* search pages we are willing to walk to fill
 * the long-form bucket. Long-form almost always fills from page 1 — this only
 * needs to go higher for keywords saturated with foreign/brand channels.
 * Each page costs 1 search call against the separate Search Queries bucket
 * (default 100 calls/day/project), which is the real constraint — not units.
 */
function maxSearchPages(): number {
  const raw = parseInt(process.env.YOUTUBE_MAX_SEARCH_PAGES ?? '1', 10)
  if (!Number.isFinite(raw)) return 1
  return Math.min(Math.max(raw, 1), 5)
}

function isQuotaError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? '')
  return msg.includes('quota') || msg.includes('429') || msg.includes('403') || msg.includes('NO_API_KEYS')
}

/** Whether serp_position is the video's true universal YouTube rank, a rank
 *  within a videoDuration-filtered result set, or a cached-pool estimate used
 *  when the API was unreachable (see migration 008). */
type PositionType = 'true_serp' | 'shorts_filtered' | 'pool_fallback'

/** A search hit carrying its position and what kind of position it is. */
interface RankedHit extends SearchHit {
  serp_position: number
  position_type: PositionType
}

interface SearchPage {
  hits: RankedHit[]
  nextPageToken?: string
  quotaCost: number
}

/**
 * One page of relevance-ordered Indian results.
 * Tries OAuth first, falls back to a stored API key, and preserves absolute
 * result positions across pages via `offset`.
 *
 * When `videoDuration` is set, the returned positions rank within that
 * filtered result set, not the true unified SERP — callers must tag those
 * hits `shorts_filtered`, never `true_serp`.
 */
async function fetchSearchPage(
  keywordText: string,
  offset: number,
  pageToken: string | undefined,
  videoDuration?: SearchVideoDuration
): Promise<SearchPage> {
  const positionType: PositionType = videoDuration && videoDuration !== 'any' ? 'shorts_filtered' : 'true_serp'

  try {
    const res = await searchYouTubeOAuth(keywordText, 50, 'IN', 'relevance', pageToken, videoDuration)
    const hits = (res.items || [])
      .filter(item => item.id?.videoId)
      .map((item, index) => ({
        position: offset + index + 1,
        serp_position: offset + index + 1,
        position_type: positionType,
        youtube_id: item.id.videoId,
        title: item.snippet?.title ?? '',
        channel_name: item.snippet?.channelTitle ?? '',
        channel_id: item.snippet?.channelId ?? '',
        published_at: item.snippet?.publishedAt ?? '',
        thumbnail_url: item.snippet?.thumbnails?.medium?.url ?? '',
      }))
    return { hits, nextPageToken: res.nextPageToken, quotaCost: 1 }
  } catch (oauthErr) {
    console.error(`OAuth search failed for "${keywordText}" (offset ${offset}):`, oauthErr)

    const res = await searchYouTubeViaApiKey(keywordText, 50, 'IN', 'relevance', pageToken, videoDuration)
    const hits = res.hits.map((h, index) => ({
      ...h,
      position: offset + index + 1,
      serp_position: offset + index + 1,
      position_type: positionType,
    }))
    return { hits, nextPageToken: res.nextPageToken, quotaCost: res.quota_cost }
  }
}

/** Video details for any number of ids, in 50-id batches. Never throws. */
async function fetchDetailsForAll(
  youtubeIds: string[]
): Promise<{ videos: Map<string, YouTubeVideo>; quotaCost: number }> {
  const videos = new Map<string, YouTubeVideo>()
  let quotaCost = 0

  for (let i = 0; i < youtubeIds.length; i += 50) {
    const batch = youtubeIds.slice(i, i + 50)
    try {
      const res = await getVideoDetailsOAuth(batch)
      quotaCost += 1
      for (const item of res.items || []) {
        videos.set(item.id, {
          youtube_id: item.id,
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          channel_name: item.snippet?.channelTitle || '',
          channel_id: item.snippet?.channelId || '',
          view_count: parseInt(item.statistics?.viewCount || '0', 10),
          published_at: item.snippet?.publishedAt || '',
          thumbnail_url: item.snippet?.thumbnails?.medium?.url || '',
          duration: item.contentDetails?.duration || '',
          duration_sec: parseDurationSec(item.contentDetails?.duration),
          tags: [],
        })
      }
    } catch (err) {
      console.error('OAuth video details failed, trying API key fallback:', err)
      try {
        const { videos: kwVideos, quota_cost } = await fetchVideoDetailsViaApiKey(batch)
        quotaCost += quota_cost
        for (const v of kwVideos) videos.set(v.youtube_id, v)
      } catch (err2) {
        console.error('API key video details also failed for batch:', err2)
        // Ids left without details are skipped from format ranking below.
      }
    }
  }

  return { videos, quotaCost }
}

/** Video ids that must never be ranked again (AI-detected irrelevant content). */
async function loadExcludedVideoIds(youtubeIds: string[]): Promise<Set<string>> {
  const excluded = new Set<string>()
  if (youtubeIds.length === 0) return excluded

  try {
    const blacklisted = await queryAll<{ youtube_id: string }>(
      `SELECT youtube_id FROM video_blacklist WHERE youtube_id = ANY($1)`,
      [youtubeIds]
    )
    for (const b of blacklisted) excluded.add(b.youtube_id)
  } catch {
    // video_blacklist not migrated yet — nothing to exclude.
  }

  try {
    const irrelevant = await queryAll<{ youtube_id: string }>(
      `SELECT youtube_id FROM videos WHERE youtube_id = ANY($1) AND is_irrelevant = TRUE`,
      [youtubeIds]
    )
    for (const v of irrelevant) excluded.add(v.youtube_id)
  } catch {
    // is_irrelevant column not migrated yet.
  }

  return excluded
}

/**
 * Fetch one keyword's first-page ranking.
 *
 * Walks YouTube's relevance-ordered results (regionCode=IN) keeping each video's
 * true search position, drops foreign and brand-owned channels, and keeps pulling
 * the next result in line until it has 10 long-form and 10 short-form videos.
 */
export async function scrapeKeyword(
  campaignId: string,
  keywordId: string,
  keywordText: string,
  options: { archiveBefore?: boolean } = {}
): Promise<ScrapeResult> {
  const brandNames = await queryAll<{ name: string }>(
    `SELECT name FROM campaign_brands WHERE campaign_id = $1`, [campaignId]
  ).then(rows => rows.map(r => r.name)).catch(() => [] as string[])

  const poolIdsBefore = await getCampaignPoolIds(campaignId)

  const longForm: Array<{ hit: RankedHit; video: YouTubeVideo }> = []
  const shortForm: Array<{ hit: RankedHit; video: YouTubeVideo }> = []
  const poolVideos = new Map<string, YouTubeVideo>()
  const seenIds = new Set<string>()

  let quotaCost = 0
  let pageToken: string | undefined
  let offset = 0
  let pagesFetched = 0
  let rejectedForeign = 0
  let rejectedBrand = 0
  let usedFallback = false

  const pageLimit = maxSearchPages()

  // Shared per-page pipeline: dedupe, drop excluded/foreign/brand channels,
  // fetch details, classify by duration. Mutates longForm/shortForm/poolVideos
  // and returns the quota this page's follow-up calls consumed.
  const processPage = async (hits: RankedHit[]): Promise<number> => {
    let pageQuota = 0
    const fresh = hits.filter(h => h.youtube_id && !seenIds.has(h.youtube_id))
    for (const h of fresh) seenIds.add(h.youtube_id)
    if (fresh.length === 0) return 0

    // 1. Drop videos already known to be irrelevant.
    const excluded = await loadExcludedVideoIds(fresh.map(h => h.youtube_id))
    const notExcluded = fresh.filter(h => !excluded.has(h.youtube_id))

    // 2. Drop foreign and brand-owned channels (input order preserved).
    const { eligible, rejected, quotaCost: channelQuota } =
      await filterEligibleChannels(notExcluded, brandNames)
    pageQuota += channelQuota
    for (const r of rejected) {
      if (r.reason === 'foreign_channel') rejectedForeign++
      else rejectedBrand++
    }

    // 3. Duration decides format, so details are required for every survivor.
    const { videos: details, quotaCost: detailQuota } =
      await fetchDetailsForAll(eligible.map(h => h.youtube_id))
    pageQuota += detailQuota

    for (const hit of eligible) {
      const video = details.get(hit.youtube_id)
      if (!video) continue // details unavailable — cannot classify the format
      poolVideos.set(video.youtube_id, video)

      if (video.duration_sec <= 0) continue
      if (video.duration_sec <= SHORT_MAX_SEC) {
        if (shortForm.length < TARGET_PER_FORMAT) shortForm.push({ hit, video })
      } else if (hit.position_type === 'true_serp' && longForm.length < TARGET_PER_FORMAT) {
        // Long-form only ever comes from the unfiltered phase — a
        // shorts_filtered page should never contain anything long enough to
        // qualify, but the guard keeps the true-SERP promise airtight.
        longForm.push({ hit, video })
      }
    }
    return pageQuota
  }

  // Phase A — walk unfiltered, relevance-ordered pages, keeping every video's
  // true YouTube search position. This fills long-form almost every time and
  // opportunistically catches true-position Shorts along the way.
  while (pagesFetched < pageLimit) {
    let page: SearchPage
    try {
      page = await fetchSearchPage(keywordText, offset, pageToken)
    } catch (err) {
      console.error(`Search failed for "${keywordText}" at offset ${offset}:`, err)
      if (pagesFetched === 0 && !isQuotaError(err)) throw err
      break
    }

    pagesFetched++
    quotaCost += page.quotaCost
    offset += page.hits.length
    quotaCost += await processPage(page.hits)

    const filled = longForm.length >= TARGET_PER_FORMAT && shortForm.length >= TARGET_PER_FORMAT
    if (filled || !page.nextPageToken) break
    pageToken = page.nextPageToken
  }

  // Phase B — Shorts are the bucket page-walking fills worst (they're a
  // minority of unfiltered results). Rather than pay another full unfiltered
  // page hoping for more, spend exactly one videoDuration=short call: it's
  // Shorts-dense, so it reliably tops up the remaining slots. Those hits rank
  // within a Shorts-only result set, not the true SERP — tagged accordingly
  // by fetchSearchPage and never written into keyword_videos.
  if (shortForm.length < TARGET_PER_FORMAT) {
    try {
      const shortsPage = await fetchSearchPage(keywordText, 0, undefined, 'short')
      pagesFetched++
      quotaCost += shortsPage.quotaCost
      quotaCost += await processPage(shortsPage.hits)
    } catch (err) {
      console.error(`Shorts top-up search failed for "${keywordText}":`, err)
      if (!isQuotaError(err) && longForm.length === 0 && shortForm.length === 0) throw err
    }
  }

  // Nothing usable from the API (quota exhausted, outage) — fall back to the
  // campaign pool so the keyword keeps a ranking instead of going blank.
  if (longForm.length === 0 && shortForm.length === 0) {
    usedFallback = true
    const fallback = await loadKeywordRelevantPoolVideos(campaignId, keywordText, 50)
    let position = 0
    for (const video of fallback) {
      position++
      const hit: RankedHit = {
        position,
        serp_position: position,
        position_type: 'pool_fallback',
        youtube_id: video.youtube_id,
        title: video.title,
        channel_name: video.channel_name,
        channel_id: video.channel_id,
        published_at: video.published_at,
        thumbnail_url: video.thumbnail_url,
      }
      poolVideos.set(video.youtube_id, video)
      if (video.duration_sec > 0 && video.duration_sec <= SHORT_MAX_SEC) {
        if (shortForm.length < TARGET_PER_FORMAT) shortForm.push({ hit, video })
      } else if (video.duration_sec > SHORT_MAX_SEC && longForm.length < TARGET_PER_FORMAT) {
        longForm.push({ hit, video })
      }
    }
  }

  if (options.archiveBefore) {
    await archiveKeywordRanks(keywordId, campaignId)
  }

  // Replace the previous ranking only once new data is in hand.
  await queryAll(`DELETE FROM keyword_videos WHERE keyword_id = $1`, [keywordId])
  await queryAll(`DELETE FROM keyword_shorts WHERE keyword_id = $1`, [keywordId])

  const ranked = await persistRankedVideos(
    campaignId,
    keywordId,
    longForm,
    shortForm,
    Array.from(poolVideos.values())
  )

  const now = new Date().toISOString()
  await queryAll(`UPDATE keywords SET last_scraped_at = $1 WHERE id = $2`, [now, keywordId])
  await queryAll(
    `INSERT INTO system_metadata (key, value, updated_at) VALUES ('last_ranking_refresh', $1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [now, now]
  )

  const newlyFetched = Array.from(poolVideos.keys()).filter(id => !poolIdsBefore.has(id)).length

  return {
    saved: poolVideos.size,
    ranked: ranked.ranked,
    pool_added: ranked.pool_added,
    quota_cost: quotaCost,
    new_videos_fetched: newlyFetched,
    reused_from_pool: poolVideos.size - newlyFetched,
    long_form: longForm.length,
    short_form: shortForm.length,
    pages_fetched: pagesFetched,
    rejected_foreign: rejectedForeign,
    rejected_brand: rejectedBrand,
    used_pool_fallback: usedFallback,
  }
}

/**
 * Persist a keyword's ranking.
 *
 * `rank` is the 1..10 slot inside the format; `serp_position` is the video's real
 * position in YouTube's results, so a slot-3 video that actually sat at position 17
 * is still recorded honestly.
 */
async function persistRankedVideos(
  campaignId: string,
  keywordId: string,
  longForm: Array<{ hit: RankedHit; video: YouTubeVideo }>,
  shortForm: Array<{ hit: RankedHit; video: YouTubeVideo }>,
  allVideos: YouTubeVideo[]
): Promise<{ ranked: number; pool_added: number }> {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  if (allVideos.length === 0) return { ranked: 0, pool_added: 0 }

  const brandNames = await queryAll<{ name: string }>(
    `SELECT name FROM campaign_brands WHERE campaign_id = $1`, [campaignId]
  ).then(rows => rows.map(r => r.name)).catch(() => [] as string[])

  // Brand tags from the video's own metadata (transcript analysis refines these later).
  const videoBrandMap = new Map<string, string[]>()
  for (const v of allVideos) {
    const haystack = `${v.title} ${v.channel_name} ${v.description || ''}`.toLowerCase()
    videoBrandMap.set(v.youtube_id, brandNames.filter(b => haystack.includes(b.toLowerCase())))
  }

  const allYoutubeIds = allVideos.map(v => v.youtube_id)
  const existingRows = await queryAll<{ id: string; youtube_id: string }>(
    `SELECT id, youtube_id FROM videos WHERE youtube_id = ANY($1)`,
    [allYoutubeIds]
  )
  const existingMap = new Map(existingRows.map(r => [r.youtube_id, r.id]))

  // Upsert every video we saw, new or not — one statement per video keeps the
  // id mapping exact and survives partial failures.
  for (const v of allVideos) {
    const tags = videoBrandMap.get(v.youtube_id) || []
    try {
      const inserted = await queryAll<{ id: string; youtube_id: string }>(
        `INSERT INTO videos (youtube_id, title, description, channel_name, channel_id, view_count, published_at, duration, duration_sec, thumbnail_url, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (youtube_id) DO UPDATE SET
           view_count = EXCLUDED.view_count, title = EXCLUDED.title, channel_name = EXCLUDED.channel_name,
           duration = EXCLUDED.duration, duration_sec = EXCLUDED.duration_sec,
           thumbnail_url = EXCLUDED.thumbnail_url, tags = EXCLUDED.tags
         RETURNING id, youtube_id`,
        [v.youtube_id, v.title, v.description || '', v.channel_name, v.channel_id,
         v.view_count || 0, v.published_at || null, v.duration || '', v.duration_sec || 0,
         v.thumbnail_url || '', tags]
      )
      for (const r of inserted) existingMap.set(r.youtube_id, r.id)
    } catch (err) {
      console.error(`Failed to upsert video ${v.youtube_id}:`, err)
    }
  }

  const cvRows = allVideos
    .map(v => ({ campaign_id: campaignId, video_id: existingMap.get(v.youtube_id)! }))
    .filter(r => r.video_id)
  if (cvRows.length > 0) {
    await batchUpsert('campaign_videos', cvRows, 'campaign_id,video_id')
  }

  const btRows: Record<string, any>[] = []
  for (const v of allVideos) {
    const vid = existingMap.get(v.youtube_id)
    if (!vid) continue
    for (const bName of (videoBrandMap.get(v.youtube_id) || [])) {
      btRows.push({ video_id: vid, brand_name: bName, campaign_id: campaignId })
    }
  }
  if (btRows.length > 0) {
    await batchUpsert('brand_tags', btRows, 'video_id,brand_name,campaign_id')
  }

  const kvRows: Record<string, any>[] = []
  const ksRows: Record<string, any>[] = []
  const vsRows: Record<string, any>[] = []

  const buildRows = (
    entries: Array<{ hit: RankedHit; video: YouTubeVideo }>,
    target: Record<string, any>[]
  ) => {
    entries.forEach((entry, i) => {
      const vid = existingMap.get(entry.video.youtube_id)
      if (!vid) return
      target.push({
        keyword_id: keywordId,
        campaign_id: campaignId,
        video_id: vid,
        rank: i + 1,
        serp_position: entry.hit.serp_position,
        position_type: entry.hit.position_type,
        discovered_at: now,
        last_seen_at: now,
      })
      vsRows.push({
        video_id: vid,
        campaign_id: campaignId,
        view_count: entry.video.view_count || 0,
        snapshot_date: today,
      })
    })
  }

  buildRows(longForm, kvRows)
  buildRows(shortForm, ksRows)

  // serp_position/position_type are newer columns; retry without them so an
  // un-migrated database still records the ranking.
  const upsertRanks = async (table: string, rows: Record<string, any>[]) => {
    if (rows.length === 0) return
    try {
      await batchUpsert(table, rows, 'keyword_id,video_id')
    } catch (err) {
      console.error(`${table} upsert with serp_position/position_type failed, retrying without them:`, err)
      const stripped = rows.map(({ serp_position, position_type, ...rest }) => rest)
      await batchUpsert(table, stripped, 'keyword_id,video_id')
    }
  }

  await Promise.all([
    upsertRanks('keyword_videos', kvRows),
    upsertRanks('keyword_shorts', ksRows),
    vsRows.length > 0
      ? batchUpsert('view_snapshots', vsRows, 'video_id,campaign_id,snapshot_date')
      : Promise.resolve(),
  ])

  return { ranked: kvRows.length + ksRows.length, pool_added: cvRows.length }
}

export interface DailyViewUpdateResult {
  updated: number
  deleted: number
  quota_cost: number
  batches: number
  /** Distinct YouTube videos polled — one API call slot each. */
  unique_videos: number
  /** (video, campaign) pairs snapshotted — the "total" count. */
  total_entries: number
  failed_batches: number
}

/**
 * Daily view refresh.
 *
 * A video that ranks on 40 keywords, or that belongs to three campaigns, is still
 * ONE video on YouTube: it is polled once (unique) and its view count is then
 * written to every campaign it belongs to (total). Batches are isolated — one bad
 * batch never aborts the run.
 */
export async function runDailyViewUpdatePg(campaignId?: string): Promise<DailyViewUpdateResult> {
  const rows = campaignId
    ? await queryAll<{ youtube_id: string; video_id: string; campaign_id: string }>(
        `SELECT v.youtube_id, v.id as video_id, cv.campaign_id
         FROM campaign_videos cv
         INNER JOIN videos v ON v.id = cv.video_id
         WHERE cv.campaign_id = $1 AND v.is_deleted = FALSE AND v.youtube_id IS NOT NULL`,
        [campaignId]
      )
    : await queryAll<{ youtube_id: string; video_id: string; campaign_id: string }>(
        `SELECT v.youtube_id, v.id as video_id, cv.campaign_id
         FROM campaign_videos cv
         INNER JOIN videos v ON v.id = cv.video_id
         WHERE v.is_deleted = FALSE AND v.youtube_id IS NOT NULL`
      )

  // youtube_id → every (video, campaign) pair that needs the resulting count.
  const byYoutubeId = new Map<string, Array<{ video_id: string; campaign_id: string }>>()
  for (const r of rows) {
    if (!r.youtube_id) continue
    const entries = byYoutubeId.get(r.youtube_id)
    if (entries) entries.push({ video_id: r.video_id, campaign_id: r.campaign_id })
    else byYoutubeId.set(r.youtube_id, [{ video_id: r.video_id, campaign_id: r.campaign_id }])
  }

  const uniqueIds = Array.from(byYoutubeId.keys())
  const totalEntries = rows.length
  const today = new Date().toISOString().split('T')[0]

  let quotaCost = 0
  let updated = 0
  let deleted = 0
  let batches = 0
  let failedBatches = 0

  for (let i = 0; i < uniqueIds.length; i += 50) {
    const batchIds = uniqueIds.slice(i, i + 50)
    try {
      const stats = await getViewCountsOAuth(batchIds)
      quotaCost += 1
      batches++

      const viewMap = new Map<string, number>()
      const deletedIds: string[] = []
      for (const stat of stats) {
        if (stat.is_deleted) deletedIds.push(stat.youtube_id)
        else viewMap.set(stat.youtube_id, stat.view_count)
      }

      if (deletedIds.length > 0) {
        await queryAll(`UPDATE videos SET is_deleted = TRUE WHERE youtube_id = ANY($1)`, [deletedIds])
        deleted += deletedIds.length
      }

      if (viewMap.size > 0) {
        const entries = Array.from(viewMap.entries())
        const params: (string | number)[] = []
        const cases = entries.map(([id, count], idx) => {
          params.push(id, count)
          return `WHEN youtube_id = $${idx * 2 + 1} THEN $${idx * 2 + 2}`
        }).join(' ')
        await queryAll(
          `UPDATE videos SET view_count = CASE ${cases} ELSE view_count END WHERE youtube_id = ANY($${params.length + 1})`,
          [...params, entries.map(e => e[0])]
        )
        updated += viewMap.size
      }

      // One snapshot row per (video, campaign) — the same count fans out to
      // every campaign that tracks the video.
      const vsRows: Record<string, any>[] = []
      for (const ytId of batchIds) {
        const vc = viewMap.get(ytId)
        if (vc === undefined) continue
        for (const entry of byYoutubeId.get(ytId) ?? []) {
          vsRows.push({
            video_id: entry.video_id,
            campaign_id: entry.campaign_id,
            view_count: vc,
            snapshot_date: today,
          })
        }
      }
      if (vsRows.length > 0) {
        await batchUpsert('view_snapshots', vsRows, 'video_id,campaign_id,snapshot_date')
      }
    } catch (batchErr: any) {
      failedBatches++
      console.error(
        `View update batch ${i}-${i + batchIds.length} failed:`,
        batchErr?.message || batchErr
      )
      // Continue — a single failed batch must not cost the whole day's data.
    }
  }

  const now = new Date().toISOString()
  await queryAll(
    `INSERT INTO system_metadata (key, value, updated_at) VALUES ('last_views_refresh', $1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [now, now]
  ).catch(err => console.error('Failed to record last_views_refresh:', err))

  return {
    updated,
    deleted,
    quota_cost: quotaCost,
    batches,
    unique_videos: uniqueIds.length,
    total_entries: totalEntries,
    failed_batches: failedBatches,
  }
}

export interface WeeklyRefreshResult {
  keywords_processed: number
  failed: number
  total_quota: number
  /** Keywords still waiting after this chunk — drives the caller's resume loop. */
  remaining: number
  total: number
  offset: number
  next_offset: number
  completed: boolean
  errors: Array<{ keyword: string; error: string }>
}

/**
 * Weekly ranking refresh — re-runs the full keyword fetch so week-over-week rank
 * movement can be measured.
 *
 * Every active keyword of every campaign is re-scraped (no campaign filter means
 * the whole system). The previous ranking is archived to keyword_rank_history
 * first, so last week's positions survive the overwrite.
 *
 * Runs in chunks: serverless functions have a hard wall-clock limit and a full
 * pass over hundreds of keywords cannot finish inside it. The caller repeats with
 * `next_offset` until `completed` is true.
 */
export async function runWeeklyKeywordRefreshPg(
  campaignId?: string,
  options: { offset?: number; limit?: number; timeBudgetMs?: number } = {}
): Promise<WeeklyRefreshResult> {
  const offset = Math.max(0, options.offset ?? 0)
  const limit = options.limit && options.limit > 0 ? options.limit : Number.MAX_SAFE_INTEGER
  const timeBudgetMs = options.timeBudgetMs ?? 0
  const startedAt = Date.now()

  // Deterministic order so chunked runs never skip or repeat a keyword.
  const keywords = campaignId
    ? await queryAll<{ id: string; text: string; campaign_id: string }>(
        `SELECT id, text, campaign_id FROM keywords
         WHERE status = 'active' AND campaign_id = $1
         ORDER BY campaign_id, id`,
        [campaignId]
      )
    : await queryAll<{ id: string; text: string; campaign_id: string }>(
        `SELECT id, text, campaign_id FROM keywords
         WHERE status = 'active'
         ORDER BY campaign_id, id`
      )

  const chunkEnd = limit === Number.MAX_SAFE_INTEGER ? undefined : offset + limit
  const chunk = keywords.slice(offset, chunkEnd)

  let totalQuota = 0
  let failed = 0
  let processed = 0
  const errors: Array<{ keyword: string; error: string }> = []

  for (const kw of chunk) {
    if (timeBudgetMs > 0 && Date.now() - startedAt > timeBudgetMs) break

    try {
      const result = await scrapeKeyword(kw.campaign_id, kw.id, kw.text, { archiveBefore: true })
      totalQuota += result.quota_cost
    } catch (err: any) {
      failed++
      const msg = String(err?.message ?? err).slice(0, 200)
      errors.push({ keyword: kw.text, error: msg })
      console.error(`Weekly refresh failed for keyword "${kw.text}":`, msg)
      // Quota exhaustion affects every remaining keyword — stop and resume later.
      if (isQuotaError(err)) break
    }
    processed++
  }

  const nextOffset = offset + processed
  const completed = nextOffset >= keywords.length

  const now = new Date().toISOString()
  if (completed) {
    await queryAll(
      `INSERT INTO system_metadata (key, value, updated_at) VALUES ('last_weekly_refresh', $1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [now, now]
    ).catch(err => console.error('Failed to record last_weekly_refresh:', err))
  }

  return {
    keywords_processed: processed - failed,
    failed,
    total_quota: totalQuota,
    remaining: Math.max(0, keywords.length - nextOffset),
    total: keywords.length,
    offset,
    next_offset: nextOffset,
    completed,
    errors,
  }
}

export async function runBrandAnalysisPg(campaignId?: string, limit: number = 10): Promise<{
  analyzed: number
  skipped: number
  no_transcript: number
  brands_found: number
}> {
  // 1. Get brand names — 1 query
  const brandNames = campaignId
    ? await queryAll<{ name: string }>(
        `SELECT name FROM campaign_brands WHERE campaign_id = $1`, [campaignId]
      ).then(rows => rows.map(r => r.name))
    : []

  // 2. Get videos to analyze — 1 query (include channel_name + description for analyst prompt)
  let videos: { id: string; youtube_id: string; title: string; channel_name: string; description: string; is_irrelevant: boolean }[]

  if (campaignId) {
    videos = await queryAll<{ id: string; youtube_id: string; title: string; channel_name: string; description: string; is_irrelevant: boolean }>(
      `SELECT v.id, v.youtube_id, v.title, v.channel_name, v.description, COALESCE(v.is_irrelevant, FALSE) as is_irrelevant FROM videos v
       WHERE v.is_deleted = FALSE AND v.id IN (SELECT video_id FROM campaign_videos WHERE campaign_id = $1)
       AND v.id NOT IN (SELECT video_id FROM brand_analysis)
       ORDER BY v.view_count DESC
       LIMIT $2`,
      [campaignId, limit]
    )
  } else {
    videos = await queryAll<{ id: string; youtube_id: string; title: string; channel_name: string; description: string; is_irrelevant: boolean }>(
      `SELECT v.id, v.youtube_id, v.title, v.channel_name, v.description, COALESCE(v.is_irrelevant, FALSE) as is_irrelevant FROM videos v
       WHERE v.is_deleted = FALSE
       AND v.id NOT IN (SELECT video_id FROM brand_analysis)
       ORDER BY v.view_count DESC
       LIMIT $1`,
      [limit]
    )
  }

  let analyzed = 0
  let noTranscript = 0
  let brandsFound = 0

  for (const video of videos) {
    try {
      // 0. Check if already marked as irrelevant — skip immediately
      if (video.is_irrelevant) {
        continue
      }

      // 1. Detect irrelevance using heuristics + LLM (fast, ~200ms)
      const relevance = await detectIrrelevantVideo(video.title, video.channel_name || '', video.description || '')
      if (relevance.is_irrelevant && relevance.score >= 0.8) {
        // Store irrelevance data for future scrapes
        await queryAll(
          `UPDATE videos SET is_irrelevant = TRUE, irrelevant_reason = $1, irrelevant_score = $2, irrelevant_category = $3, irrelevant_detected_at = NOW() WHERE id = $4`,
          [relevance.reason, relevance.score, relevance.category, video.id]
        ).catch(() => {
          // Column may not exist yet — fallback to just is_irrelevant
          return queryAll(
            `UPDATE videos SET is_irrelevant = TRUE, irrelevant_reason = $1, irrelevant_detected_at = NOW() WHERE id = $2`,
            [relevance.reason, video.id]
          )
        })

        // Also add to permanent blacklist for future scrapes
        await queryAll(
          `INSERT INTO video_blacklist (youtube_id, reason, category, detected_by)
           VALUES ($1, $2, $3, 'ai') ON CONFLICT (youtube_id) DO NOTHING`,
          [video.youtube_id, relevance.reason, relevance.category]
        ).catch(() => {
          // Blacklist table may not exist yet — non-fatal
        })

        continue
      }

      let transcriptText = ''
      let language = 'en'

      // 2. Check for existing transcript — 1 query
      const existingTranscript = await queryOne<{ transcript_text: string; language: string }>(
        `SELECT transcript_text, language FROM video_transcripts WHERE video_id = $1`,
        [video.id]
      )

      if (existingTranscript?.transcript_text) {
        transcriptText = existingTranscript.transcript_text
        language = existingTranscript.language || 'en'
      } else {
        const result = await fetchTranscript(video.youtube_id)
        if (!result) {
          noTranscript++
          continue
        }
        transcriptText = result.text
        language = result.language

        // 4. Save transcript — 1 query
        await queryAll(
          `INSERT INTO video_transcripts (video_id, youtube_id, transcript_text, language, fetch_status)
           VALUES ($1, $2, $3, $4, 'success')
           ON CONFLICT (video_id) DO UPDATE SET transcript_text = EXCLUDED.transcript_text, language = EXCLUDED.language, fetch_status = EXCLUDED.fetch_status`,
          [video.id, video.youtube_id, transcriptText, language]
        )
      }

      const detections = await analyzeBrandsFromTranscript(
        transcriptText,
        video.title,
        brandNames,
        video.channel_name || '',
        video.description || ''
      )

      // 5. Batch insert brand analysis — 1 query
      if (detections.length > 0) {
        const baRows = detections.map(d => ({
          video_id: video.id,
          brand_name: d.brand_name,
          confidence: d.confidence,
          mention_type: d.mention_type,
          context_quotes: JSON.stringify(d.context_quotes),
        }))
        await batchUpsert('brand_analysis', baRows, 'video_id,brand_name')
        brandsFound += detections.filter(d => d.confidence >= 0.6).length
      }

      const highConfBrands = detections.filter(d => d.confidence >= 0.6).map(d => d.brand_name)

      if (highConfBrands.length > 0) {
        // 6. Update video tags — 1 query
        const currentVideo = await queryOne<{ tags: any }>(
          `SELECT tags FROM videos WHERE id = $1`, [video.id]
        )
        const currentTags = Array.isArray(currentVideo?.tags) ? currentVideo!.tags : []
        const mergedTags = [...new Set([...currentTags, ...highConfBrands])]
        await queryAll(
          `UPDATE videos SET tags = $1 WHERE id = $2`,
          [JSON.stringify(mergedTags), video.id]
        )

        // 7. Batch upsert brand_tags — 1 query
        if (campaignId) {
          const btRows = highConfBrands.map(brand => ({
            video_id: video.id,
            brand_name: brand,
            campaign_id: campaignId,
          }))
          await batchUpsert('brand_tags', btRows, 'video_id,brand_name,campaign_id')
        }
      }

      analyzed++
      await new Promise(r => setTimeout(r, 4500))
    } catch (err) {
      console.error(`Analysis failed for ${video.youtube_id}:`, err)
    }
  }

  // 8. Update system metadata — 1 query
  const now = new Date().toISOString()
  await queryAll(
    `INSERT INTO system_metadata (key, value, updated_at) VALUES ('last_brand_analysis', $1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [now, now]
  )

  return { analyzed, skipped: videos.length - analyzed - noTranscript, no_transcript: noTranscript, brands_found: brandsFound }
}
