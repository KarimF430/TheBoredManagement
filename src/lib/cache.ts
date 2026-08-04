import { Redis } from '@upstash/redis'

// ── L1: In-Process Memory Cache (0ms, 30s TTL) ────────────────────────────────
// Lives inside the Node.js process — zero network latency.
// Prevents hammering Redis for repeated requests within the same function instance.
interface MemEntry { data: unknown; expiresAt: number }
const memCache = new Map<string, MemEntry>()
const MEM_TTL_MS = 30_000  // 30 seconds
const MEM_MAX_SIZE = 150   // cap to prevent OOM

function getL1<T>(key: string): T | null {
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key)
    return null
  }
  return entry.data as T
}

function setL1(key: string, data: unknown, ttlMs = MEM_TTL_MS) {
  // Evict oldest entry if at capacity
  if (memCache.size >= MEM_MAX_SIZE) {
    const firstKey = memCache.keys().next().value
    if (firstKey) memCache.delete(firstKey)
  }
  memCache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function invalidateL1(pattern?: string) {
  if (!pattern) { memCache.clear(); return }
  for (const key of memCache.keys()) {
    if (key.includes(pattern)) memCache.delete(key)
  }
}

// ── L2: Redis Cache (~10ms) ───────────────────────────────────────────────────
let redisInstance: Redis | null = null
try {
  const url = process.env.UPSTASH_REDIS_REST_URL
  if (url && url.startsWith('https://')) {
    redisInstance = Redis.fromEnv()
  }
} catch (e) {
  console.warn('Upstash Redis initialization warning (expected during build/CI):', e)
}

export const redis = redisInstance

export const CACHE_TTL = {
  overview_kpis: 300,
  brand_sov: 300,
  video_leaderboard: 300,
  sov_trend: 300,
  brand_detail: 300,
  brand_growth: 300,
  dropped_rankings: 300,
  multi_keyword: 300,
  system_metadata: 30,
  keywords_sov: 300,
  brands_overview: 300,
  campaigns: 300,
  videos_campaign: 300,
  videos_pending: 300,
  campaign_videos: 300,
  keywords: 300,
  views_snapshot: 60,
} as const

// ── In-flight Deduplication (prevents thundering herd on cold start) ──────────
const inflight = new Map<string, Promise<unknown>>()

async function dedupedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (inflight.has(key)) return inflight.get(key) as Promise<T>
  const p = fetcher().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

// ── Main Cache Wrapper: L1 → L2 → Fetcher ────────────────────────────────────
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  // L1: memory hit (0ms — fastest possible)
  const l1 = getL1<T>(key)
  if (l1 !== null) return l1

  return dedupedFetch(key, async () => {
    // L2: Redis hit (~10ms)
    try {
      if (redis) {
        const cached = await redis.get<T>(key)
        if (cached !== null) {
          // If cached value is empty data, skip cache and re-fetch
          const isCachedEmpty = cached && typeof cached === 'object' && 'data' in cached && Array.isArray((cached as any).data) && (cached as any).data.length === 0
          if (!isCachedEmpty) {
            setL1(key, cached) // promote to L1
            return cached
          }
          // Stale empty cache — delete and fall through to re-fetch
          redis.del(key).catch(() => {})
        }
      }
    } catch {}

    // L3: Fetch fresh from database
    const fresh = await fetcher()

    // Don't cache empty results — allow re-fetch on next request
    const isEmpty = fresh && typeof fresh === 'object' && 'data' in fresh && Array.isArray((fresh as any).data) && (fresh as any).data.length === 0
    if (!isEmpty) {
      setL1(key, fresh)
      try {
        if (redis) {
          redis.setex(key, ttl, JSON.stringify(fresh)).catch(() => {})
        }
      } catch {}
    }

    return fresh
  })
}

// ── Stale-While-Revalidate: return L1 immediately, refresh in background ──────
export async function getCachedSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const l1 = getL1<T>(key)
  if (l1 !== null) {
    // Serve stale data immediately, refresh in background
    Promise.resolve().then(() =>
      fetcher()
        .then(fresh => {
          setL1(key, fresh)
          if (redis) redis.setex(key, ttl, JSON.stringify(fresh)).catch(() => {})
        })
        .catch(() => {})
    )
    return l1
  }
  return getCached(key, fetcher, ttl)
}

// ── Client-side cache removed — React Query handles client caching ─────────────

// ── Cache Key Builder ─────────────────────────────────────────────────────────
export const cacheKey = {
  overview: (campaignId: string) => `campaign:${campaignId}:overview`,
  kpis: (campaignId: string) => `campaign:${campaignId}:kpis:v1`,
  brandSov: (campaignId: string) => `campaign:${campaignId}:brands:sov`,
  freqSov: (campaignId: string) => `campaign:${campaignId}:brands:freq-sov`,
  leaderboard: (campaignId: string, sort: string, page: number, tab: string) =>
    `campaign:${campaignId}:videos:leaderboard:${tab}:${sort}:page:${page}`,
  sovTrend: (campaignId: string, brands: string, range: string) =>
    `campaign:${campaignId}:sov-trend:${brands}:${range}`,
  keywordsSov: (campaignId: string, lang: string, type: string) =>
    `campaign:${campaignId}:keywords:sov:${lang}:${type}`,
  brandGrowth: (campaignId: string, metric: string, period: string) =>
    `campaign:${campaignId}:brands:growth:${metric}:${period}`,
  brandDetail: (campaignId: string, brandName: string) =>
    `campaign:${campaignId}:brand:${brandName}`,
  droppedRankings: (campaignId: string) => `campaign:${campaignId}:videos:dropped`,
  multiKeyword: (campaignId: string, minKeywords: number) =>
    `campaign:${campaignId}:videos:multi-keyword:${minKeywords}`,
  metadata: () => `system:metadata`,
  scrapeJobs: (campaignId: string) => `campaign:${campaignId}:scrape-jobs`,
  campaigns: () => `campaigns:all`,
  videosCampaign: (campaignId: string, page: number, sort: string, search: string) =>
    `campaign:${campaignId}:videos:campaign:${sort}:p${page}:${search || ''}`,
  videosPending: (campaignId: string, page: number, search: string) =>
    `campaign:${campaignId}:videos:pending:p${page}:${search || ''}`,
  keywords: (campaignId: string) => `campaign:${campaignId}:keywords`,
  brands: (campaignId: string) => `campaign:${campaignId}:brands`,
  brandsTags: (campaignId: string) => `campaign:${campaignId}:brands:tags`,
}

export async function invalidateCampaign(campaignId: string) {
  invalidateL1(`campaign:${campaignId}`)
  invalidateL1('campaigns:all')
  try {
    if (redis) {
      const keys = await redis.keys(`campaign:${campaignId}:*`)
      if (keys.length > 0) await redis.del(...keys)
      await redis.del(cacheKey.campaigns())
      await redis.del(cacheKey.metadata())
    }
  } catch {}
}
