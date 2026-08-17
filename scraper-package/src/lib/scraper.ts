/**
 * Instagram Scraper — Session Cookie Based (Production Grade)
 *
 * ONLY uses authenticated requests with session cookies.
 * NO meta tag fallback — requires valid session cookies.
 *
 * Two-pass scraping:
 *   Pass 1: Profile via GraphQL API (1 request) — quick filter
 *   Pass 2: Last 10 posts via GraphQL API (10 requests) — avg views
 *
 * Cookie rotation: round-robin from DB, auto-expire on errors.
 */

import { getCPClient } from '@/lib/cp-db'
import { scoreCreator, classifyTier } from '@/lib/discovery'

// ── Types ──────────────────────────────────────────────────────────

export interface ScrapedProfile {
  handle: string
  full_name: string | null
  bio: string | null
  profile_pic_url: string | null
  is_verified: boolean
  is_private: boolean
  is_business: boolean
  followers: number
  following: number
  posts_count: number
  avg_views: number
  avg_likes: number
  avg_comments: number
  engagement_rate: number
  email: string | null
  phone: string | null
  website: string | null
  category: string | null
}

export interface ScrapeResult {
  profile: ScrapedProfile | null
  suggested_handles: string[]
  error: string | null
  error_type: string | null
}

export interface ScraperConfig {
  min_delay_ms: number
  max_delay_ms: number
  requests_per_minute: number
  requests_per_hour: number
  timeout_seconds: number
  max_posts_per_profile: number
}

// ── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: ScraperConfig = {
  min_delay_ms: 1500,
  max_delay_ms: 4000,
  requests_per_minute: 30,
  requests_per_hour: 200,
  timeout_seconds: 15,
  max_posts_per_profile: 10,
}

// ── Tier-based views/followers thresholds ──────────────────────────

export function getMinViewsRatio(followers: number): number {
  if (followers < 10_000) return 0.30
  if (followers < 50_000) return 0.40
  if (followers < 500_000) return 0.20
  return 0.10
}

// ── Pass 1: Quick filter (profile only) ────────────────────────────

export function pass1Filter(profile: ScrapedProfile): { pass: boolean; reason: string } {
  if (profile.followers < 5_000) return { pass: false, reason: `Followers ${profile.followers.toLocaleString()} < 5K` }
  if (profile.followers > 2_000_000) return { pass: false, reason: `Followers ${profile.followers.toLocaleString()} > 2M` }
  if (profile.posts_count < 10) return { pass: false, reason: `Only ${profile.posts_count} posts (need 10+)` }
  
  const folRatio = profile.following > 0 ? profile.followers / profile.following : 999
  if (folRatio < 5) return { pass: false, reason: `Follower/following ratio ${folRatio.toFixed(1)} < 5` }
  if (profile.is_private) return { pass: false, reason: 'Private account' }
  
  const hasBio = (profile.bio?.length || 0) > 15
  if (!hasBio && !profile.is_business) return { pass: false, reason: 'No bio and not business account' }
  
  return { pass: true, reason: '' }
}

// ── Pass 2: Deep filter (with avg views) ───────────────────────────

export function pass2Filter(profile: ScrapedProfile): { pass: boolean; reason: string } {
  if (profile.followers === 0) return { pass: false, reason: 'Zero followers' }
  if (profile.avg_views === 0) return { pass: false, reason: 'No view data from posts' }
  
  const minRatio = getMinViewsRatio(profile.followers)
  const viewsRatio = profile.avg_views / profile.followers
  
  if (viewsRatio < minRatio) {
    return { pass: false, reason: `Avg views ${(viewsRatio * 100).toFixed(1)}% < ${(minRatio * 100).toFixed(0)}% threshold` }
  }
  
  const engagement = (profile.avg_likes + profile.avg_comments) / profile.followers
  if (engagement < 0.01) return { pass: false, reason: `Engagement ${(engagement * 100).toFixed(1)}% < 1%` }
  
  return { pass: true, reason: '' }
}

// ── Config ─────────────────────────────────────────────────────────

async function loadConfig(): Promise<ScraperConfig> {
  try {
    const client = getCPClient()
    const { data } = await client
      .from('cp_scraper_config')
      .select('value')
      .eq('key', 'scrape_settings')
      .maybeSingle()
    
    if (data?.value) {
      const s = data.value as Record<string, unknown>
      return {
        ...DEFAULT_CONFIG,
        min_delay_ms: Number(s.min_delay_ms) || DEFAULT_CONFIG.min_delay_ms,
        max_delay_ms: Number(s.max_delay_ms) || DEFAULT_CONFIG.max_delay_ms,
        requests_per_minute: Number(s.requests_per_minute) || DEFAULT_CONFIG.requests_per_minute,
        requests_per_hour: Number(s.requests_per_hour) || DEFAULT_CONFIG.requests_per_hour,
        timeout_seconds: Number(s.timeout_seconds) || DEFAULT_CONFIG.timeout_seconds,
        max_posts_per_profile: Number(s.max_posts_per_profile) || DEFAULT_CONFIG.max_posts_per_profile,
      }
    }
  } catch {}
  return DEFAULT_CONFIG
}

// ── Rate Limiter ───────────────────────────────────────────────────

let requestLog: number[] = []
let hourlyCount = 0
let hourlyReset = Date.now() + 3_600_000
let circuitPausedUntil = 0
let consecutiveFailures = 0
let totalRequests = 0
let totalErrors = 0

function canRequest(config: ScraperConfig): { ok: boolean; waitMs: number } {
  const now = Date.now()
  
  if (now > hourlyReset) { hourlyCount = 0; hourlyReset = now + 3_600_000 }
  if (hourlyCount >= config.requests_per_hour) return { ok: false, waitMs: hourlyReset - now }
  
  const minuteAgo = now - 60_000
  requestLog = requestLog.filter(t => t > minuteAgo)
  if (requestLog.length >= config.requests_per_minute) {
    return { ok: false, waitMs: requestLog[0] + 60_000 - now }
  }
  
  if (circuitPausedUntil > now) return { ok: false, waitMs: circuitPausedUntil - now }
  if (consecutiveFailures >= 3) { circuitPausedUntil = now + 300_000; return { ok: false, waitMs: 300_000 } }
  if (totalRequests > 10 && totalErrors / totalRequests > 0.3) { circuitPausedUntil = now + 300_000; return { ok: false, waitMs: 300_000 } }
  
  return { ok: true, waitMs: 0 }
}

function recordRequest() { requestLog.push(Date.now()); hourlyCount++; totalRequests++ }
function recordSuccess() { consecutiveFailures = Math.max(0, consecutiveFailures - 1) }
function recordError() { consecutiveFailures++; totalErrors++ }
function resetCircuit() { circuitPausedUntil = 0; consecutiveFailures = 0; totalRequests = 0; totalErrors = 0; requestLog = []; hourlyCount = 0 }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function randomDelay(min: number, max: number) { return min + Math.random() * (max - min) }

// ── Cookie Management ──────────────────────────────────────────────

interface SessionCookie {
  id: string
  session_id: string
  ds_user_id: string
  csrftoken: string | null
}

async function getNextCookie(): Promise<SessionCookie | null> {
  try {
    const client = getCPClient()
    const { data, error } = await client
      .from('cp_session_cookies')
      .select('id, session_id, ds_user_id, csrftoken')
      .eq('status', 'active')
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single()
    
    if (error || !data) return null
    return data as SessionCookie
  } catch { return null }
}

async function recordCookieSuccess(cookieId: string) {
  try {
    const client = getCPClient()
    await client.rpc('cp_record_cookie_success', { _cookie_id: cookieId })
  } catch {}
}

async function recordCookieError(cookieId: string) {
  try {
    const client = getCPClient()
    await client.rpc('cp_record_cookie_error', { _cookie_id: cookieId })
  } catch {}
}

function buildCookieString(cookie: SessionCookie): string {
  let str = `sessionid=${cookie.session_id}; ds_user_id=${cookie.ds_user_id}`
  if (cookie.csrftoken) str += `; csrftoken=${cookie.csrftoken}`
  return str
}

// ── Instagram GraphQL API ──────────────────────────────────────────

const IG_BASE = 'https://www.instagram.com'
const IG_APP_ID = '936619743392459'
const IG_PROFILE_QUERY_HASH = 'c9100bf9110dd6361db5e19ed67983cd'
const IG_POST_QUERY_HASH = 'd4d88dc148037315e4e43863bbf3d1dc'

async function igFetch(
  url: string,
  config: ScraperConfig,
  cookie: SessionCookie,
  retries = 3
): Promise<{ ok: boolean; status: number; text: string | null }> {
  for (let i = 0; i < retries; i++) {
    const check = canRequest(config)
    if (!check.ok) { await sleep(Math.min(check.waitMs, 60_000)); continue }
    
    recordRequest()
    
    try {
      const headers = new Headers({
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'X-IG-App-ID': IG_APP_ID,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': cookie.csrftoken || '',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Referer': `${IG_BASE}/`,
        'Cookie': buildCookieString(cookie),
      })
      
      const ctrl = new AbortController()
      const tid = setTimeout(() => ctrl.abort(), config.timeout_seconds * 1000)
      
      const res = await fetch(url, { headers, signal: ctrl.signal, redirect: 'follow' })
      clearTimeout(tid)
      
      if (res.status === 401 || res.status === 403) {
        await recordCookieError(cookie.id)
        await sleep(2000 * Math.pow(2, i))
        continue
      }
      
      if (res.status === 429) {
        circuitPausedUntil = Date.now() + 120_000
        await sleep(2000 * Math.pow(2, i))
        continue
      }
      
      if (!res.ok) {
        recordError()
        await recordCookieError(cookie.id)
        await sleep(2000 * Math.pow(2, i))
        continue
      }
      
      recordSuccess()
      await recordCookieSuccess(cookie.id)
      return { ok: true, status: res.status, text: await res.text() }
    } catch {
      recordError()
      await recordCookieError(cookie.id)
      await sleep(2000 * Math.pow(2, i))
    }
  }
  return { ok: false, status: 0, text: null }
}

// ── Parse Profile from GraphQL API Response ────────────────────────

function parseProfileFromJSON(raw: string, fallbackHandle: string): ScrapedProfile | null {
  try {
    const data = JSON.parse(raw)
    const user = data?.data?.user
    if (!user) return null
    
    const bio = user.biography || ''
    const emailMatch = bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const phoneMatch = bio.match(/[\+]?[\d\s\-\(\)]{10,}/)
    
    return {
      handle: user.username || fallbackHandle,
      full_name: user.full_name || null,
      bio: bio || null,
      profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url || null,
      is_verified: user.is_verified || false,
      is_private: user.is_private || false,
      is_business: user.is_business_account || false,
      followers: user.edge_followed_by?.count || 0,
      following: user.edge_follow?.count || 0,
      posts_count: user.edge_owner_to_timeline_media?.count || 0,
      avg_views: 0,
      avg_likes: 0,
      avg_comments: 0,
      engagement_rate: 0,
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0].trim() : null,
      website: user.external_url || null,
      category: user.business_category_name || user.category_name || null,
    }
  } catch { return null }
}

// ── Extract Suggested Handles from GraphQL Response ────────────────

const SKIP_HANDLES = new Set(['media', 'instagram', 'explore', 'reels', 'stories', 'direct', 'accounts', 'accountscenter', 'help', 'press', 'about', 'developers', 'careers', 'privacy', 'terms'])

function extractSuggestedFromJSON(raw: string): string[] {
  const handles = new Set<string>()
  try {
    const data = JSON.parse(raw)
    const user = data?.data?.user
    
    // edge_related_profiles
    const related = user?.edge_related_profiles?.edges || []
    related.forEach((e: any) => {
      const h = e.node?.username
      if (h && !SKIP_HANDLES.has(h.toLowerCase())) handles.add(h.toLowerCase())
    })
    
    // bio @mentions
    const bio = user?.biography || ''
    const mentionRe = /@([a-zA-Z0-9_.]{1,30})/g
    let m
    while ((m = mentionRe.exec(bio))) {
      const h = m[1].toLowerCase()
      if (!SKIP_HANDLES.has(h)) handles.add(h)
    }
  } catch {}
  
  return Array.from(handles).slice(0, 25)
}

// ── Parse Post Metrics from GraphQL Response ───────────────────────

function parsePostFromJSON(raw: string): { views: number; likes: number; comments: number } | null {
  try {
    const data = JSON.parse(raw)
    const media = data?.data?.shortcode_media || data?.data?.xdt_shortcode_media
    if (!media) return null
    
    const isVideo = media.is_video === true || media.__typename === 'GraphVideo'
    const views = isVideo ? (media.video_view_count || media.video_play_count || 0) : 0
    const likes = media.edge_media_preview_like?.count || media.edge_liked_by?.count || media.like_count || 0
    const comments = media.edge_media_to_comment?.count || media.comment_count || 0
    
    return { views, likes, comments }
  } catch { return null }
}

// ── Extract Post Shortcodes from Profile Page ──────────────────────

function extractShortcodesFromProfile(raw: string): string[] {
  const shortcodes = new Set<string>()
  try {
    const data = JSON.parse(raw)
    const user = data?.data?.user
    const edges = user?.edge_owner_to_timeline_media?.edges || []
    edges.forEach((e: any) => {
      const sc = e.node?.shortcode
      if (sc) shortcodes.add(sc)
    })
  } catch {}
  return Array.from(shortcodes).slice(0, 12)
}

// ── Scrape Single Profile (Pass 1 + Pass 2) ────────────────────────

export async function scrapeProfile(
  handle: string,
  config?: ScraperConfig,
  fetchPosts = true
): Promise<ScrapeResult> {
  const cfg = config || await loadConfig()
  const clean = handle.replace(/^@/, '').toLowerCase().replace(/\//g, '')
  
  // Get session cookie
  const cookie = await getNextCookie()
  if (!cookie) {
    return { profile: null, suggested_handles: [], error: 'No active session cookies. Add cookies in scraper settings.', error_type: 'no_cookie' }
  }
  
  // Pass 1: Profile page with session cookie (returns full JSON in HTML)
  await sleep(randomDelay(cfg.min_delay_ms, cfg.max_delay_ms))
  
  const profileUrl = `${IG_BASE}/${clean}/`
  const profileRes = await igFetch(profileUrl, cfg, cookie)
  
  if (!profileRes.ok || !profileRes.text) {
    return { profile: null, suggested_handles: [], error: 'Profile request failed', error_type: 'request_failed' }
  }
  
  const profile = parseProfileFromJSON(profileRes.text, clean)
  if (!profile) {
    return { profile: null, suggested_handles: [], error: 'Failed to parse profile', error_type: 'parse_error' }
  }
  
  const pass1 = pass1Filter(profile)
  if (!pass1.pass) {
    return { profile, suggested_handles: extractSuggestedFromJSON(profileRes.text), error: pass1.reason, error_type: 'filtered_pass1' }
  }
  
  // Pass 2: Fetch last N posts for avg views
  if (fetchPosts && profile.posts_count > 0) {
    const shortcodes = extractShortcodesFromProfile(profileRes.text)
    if (shortcodes.length > 0) {
      const postMetrics: Array<{ views: number; likes: number; comments: number }> = []
      
      for (const sc of shortcodes.slice(0, cfg.max_posts_per_profile)) {
        await sleep(randomDelay(cfg.min_delay_ms, cfg.max_delay_ms))
        const postVars = JSON.stringify({ shortcode: sc })
        const postUrl = `${IG_BASE}/graphql/query/?query_hash=${IG_POST_QUERY_HASH}&variables=${encodeURIComponent(postVars)}`
        const postRes = await igFetch(postUrl, cfg, cookie)
        
        if (postRes.ok && postRes.text) {
          const metrics = parsePostFromJSON(postRes.text)
          if (metrics) postMetrics.push(metrics)
        }
      }
      
      if (postMetrics.length > 0) {
        profile.avg_views = Math.round(postMetrics.reduce((s, p) => s + p.views, 0) / postMetrics.length)
        profile.avg_likes = Math.round(postMetrics.reduce((s, p) => s + p.likes, 0) / postMetrics.length)
        profile.avg_comments = Math.round(postMetrics.reduce((s, p) => s + p.comments, 0) / postMetrics.length)
        
        if (profile.followers > 0) {
          profile.engagement_rate = ((profile.avg_likes + profile.avg_comments) / profile.followers) * 100
        }
        
        const pass2 = pass2Filter(profile)
        if (!pass2.pass) {
          return { profile, suggested_handles: extractSuggestedFromJSON(profileRes.text), error: pass2.reason, error_type: 'filtered_pass2' }
        }
      }
    }
  }
  
  return { profile, suggested_handles: extractSuggestedFromJSON(profileRes.text), error: null, error_type: null }
}

// ── Circuit Status ─────────────────────────────────────────────────

export function getCircuitStatus() {
  return {
    consecutive_failures: consecutiveFailures,
    total_requests: totalRequests,
    total_errors: totalErrors,
    error_rate: totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(1) + '%' : '0%',
    paused_until: circuitPausedUntil > Date.now() ? new Date(circuitPausedUntil).toISOString() : null,
  }
}

export { resetCircuit }
