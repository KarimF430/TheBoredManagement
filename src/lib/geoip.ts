/**
 * GeoIP Resolution for Link Clicks
 * Resolves IP addresses to country, city, and device info
 * Uses ip-api.com (free tier: 45 req/min) as primary, with in-memory cache
 */

export interface GeoLocation {
  ip: string
  country: string
  country_code: string
  city: string
  region: string
  lat: number | null
  lon: number | null
  timezone: string | null
  isp: string | null
}

export interface DeviceInfo {
  device: 'mobile' | 'tablet' | 'desktop' | 'unknown'
  browser: string
  os: string
  isBot: boolean
}

const GEO_CACHE = new Map<string, { data: GeoLocation; expiry: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000

export async function resolveGeoIP(ip: string): Promise<GeoLocation> {
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { ip, country: 'Unknown', country_code: 'XX', city: 'Local', region: '', lat: null, lon: null, timezone: null, isp: null }
  }
  const cached = GEO_CACHE.get(ip)
  if (cached && cached.expiry > Date.now()) return cached.data

  try {
    const res = await fetch(
      'http://ip-api.com/json/' + ip + '?fields=status,country,countryCode,city,region,lat,lon,timezone,isp',
      { signal: AbortSignal.timeout(3000) }
    )
    const data = await res.json()
    if (data.status === 'success') {
      const geo: GeoLocation = {
        ip, country: data.country || 'Unknown', country_code: data.countryCode || 'XX',
        city: data.city || 'Unknown', region: data.region || '', lat: data.lat || null,
        lon: data.lon || null, timezone: data.timezone || null, isp: data.isp || null,
      }
      GEO_CACHE.set(ip, { data: geo, expiry: Date.now() + CACHE_TTL })
      return geo
    }
  } catch { /* fallback */ }

  return { ip, country: 'Unknown', country_code: 'XX', city: 'Unknown', region: '', lat: null, lon: null, timezone: null, isp: null }
}

const BROWSER_RE = [
  { p: /Edge|Edg/i, n: 'Edge' }, { p: /Chrome/i, n: 'Chrome' },
  { p: /Firefox/i, n: 'Firefox' }, { p: /Safari/i, n: 'Safari' },
  { p: /Opera|OPR/i, n: 'Opera' },
]
const OS_RE = [
  { p: /Windows/i, n: 'Windows' }, { p: /Mac OS/i, n: 'macOS' },
  { p: /Linux/i, n: 'Linux' }, { p: /Android/i, n: 'Android' },
  { p: /iPhone|iPad|iPod/i, n: 'iOS' },
]
const BOT_RE = /bot|crawler|spider|scraper|headless|puppeteer|selenium|curl|wget|python-requests/i

export function parseDeviceInfo(userAgent: string): DeviceInfo {
  const ua = userAgent || ''
  const isBot = BOT_RE.test(ua)
  let device: DeviceInfo['device'] = 'desktop'
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) device = 'mobile'
  else if (/iPad|Tablet/i.test(ua)) device = 'tablet'
  let browser = 'Unknown'
  for (const { p, n } of BROWSER_RE) { if (p.test(ua)) { browser = n; break } }
  let os = 'Unknown'
  for (const { p, n } of OS_RE) { if (p.test(ua)) { os = n; break } }
  return { device, browser, os, isBot }
}

export interface EnrichedClickData {
  ip: string
  user_agent: string
  referer: string
  geo: GeoLocation
  device: DeviceInfo
  clicked_at: string
}

export async function enrichClickData(ip: string, userAgent: string, referer: string): Promise<EnrichedClickData> {
  const [geo, device] = await Promise.all([resolveGeoIP(ip), Promise.resolve(parseDeviceInfo(userAgent))])
  return { ip, user_agent: userAgent, referer, geo, device, clicked_at: new Date().toISOString() }
}

export interface GeoAnalytics {
  clicksByCountry: Array<{ country: string; country_code: string; clicks: number }>
  clicksByCity: Array<{ city: string; country: string; clicks: number }>
  clicksByDevice: Array<{ device: string; clicks: number }>
  clicksByBrowser: Array<{ browser: string; clicks: number }>
  clicksByOS: Array<{ os: string; clicks: number }>
  uniqueCountries: number
  uniqueCities: number
}

export function aggregateGeoAnalytics(
  clicks: Array<{ country: string; country_code: string; city: string; device: string; browser: string; os: string }>
): GeoAnalytics {
  const countryMap = new Map<string, { country: string; code: string; count: number }>()
  const cityMap = new Map<string, { city: string; country: string; count: number }>()
  const deviceMap = new Map<string, number>()
  const browserMap = new Map<string, number>()
  const osMap = new Map<string, number>()

  for (const c of clicks) {
    const cKey = c.country_code || c.country || 'Unknown'
    const existing = countryMap.get(cKey)
    if (existing) existing.count++
    else countryMap.set(cKey, { country: c.country || 'Unknown', code: c.country_code || 'XX', count: 1 })

    const cityKey = c.city + '|' + c.country
    const cityExisting = cityMap.get(cityKey)
    if (cityExisting) cityExisting.count++
    else cityMap.set(cityKey, { city: c.city || 'Unknown', country: c.country || 'Unknown', count: 1 })

    deviceMap.set(c.device || 'Unknown', (deviceMap.get(c.device || 'Unknown') || 0) + 1)
    browserMap.set(c.browser || 'Unknown', (browserMap.get(c.browser || 'Unknown') || 0) + 1)
    osMap.set(c.os || 'Unknown', (osMap.get(c.os || 'Unknown') || 0) + 1)
  }

  return {
    clicksByCountry: Array.from(countryMap.values()).map(v => ({ country: v.country, country_code: v.code, clicks: v.count })).sort((a, b) => b.clicks - a.clicks).slice(0, 20),
    clicksByCity: Array.from(cityMap.values()).map(v => ({ city: v.city, country: v.country, clicks: v.count })).sort((a, b) => b.clicks - a.clicks).slice(0, 20),
    clicksByDevice: Array.from(deviceMap.entries()).map(([device, clicks]) => ({ device, clicks })).sort((a, b) => b.clicks - a.clicks),
    clicksByBrowser: Array.from(browserMap.entries()).map(([browser, clicks]) => ({ browser, clicks })).sort((a, b) => b.clicks - a.clicks),
    clicksByOS: Array.from(osMap.entries()).map(([os, clicks]) => ({ os, clicks })).sort((a, b) => b.clicks - a.clicks),
    uniqueCountries: countryMap.size,
    uniqueCities: cityMap.size,
  }
}
