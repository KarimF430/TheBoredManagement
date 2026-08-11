/**
 * Link Tracking System
 * Replaces Rebrandly for creator post-live conversion tracking
 * Features: UTM parameters, click tracking, conversion tracking, analytics
 */

export interface TrackedLink {
  id: string
  campaignId: string
  creatorId: string
  deliverableId: string | null
  originalUrl: string
  shortCode: string
  shortUrl: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  utmTerm: string
  clicks: number
  uniqueClicks: number
  conversions: number
  conversionRate: number
  lastClickedAt: string | null
  createdAt: string
}

export interface LinkClick {
  id: string
  linkId: string
  ipAddress: string
  userAgent: string
  referer: string
  country: string
  city: string
  device: string
  browser: string
  clickedAt: string
}

export interface LinkAnalytics {
  totalClicks: number
  uniqueClicks: number
  conversions: number
  conversionRate: number
  clicksByDay: Array<{ date: string; clicks: number }>
  clicksByCountry: Array<{ country: string; clicks: number }>
  clicksByDevice: Array<{ device: string; clicks: number }>
  topReferers: Array<{ referer: string; clicks: number }>
}

const BASE_SHORT_URL = 'https://tbm.link'

/**
 * Generate a short code from a URL
 */
function generateShortCode(url: string, creatorId: string): string {
  const hash = Array.from(`${url}${creatorId}${Date.now()}`)
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
    .toString(36)
    .replace('-', '')
  return hash.substring(0, 7)
}

/**
 * Create a tracked link
 */
export function createTrackedLink(params: {
  campaignId: string
  creatorId: string
  deliverableId?: string
  originalUrl: string
  creatorName: string
  campaignName: string
}): TrackedLink {
  const shortCode = generateShortCode(params.originalUrl, params.creatorId)

  return {
    id: crypto.randomUUID(),
    campaignId: params.campaignId,
    creatorId: params.creatorId,
    deliverableId: params.deliverableId || null,
    originalUrl: params.originalUrl,
    shortCode,
    shortUrl: `${BASE_SHORT_URL}/${shortCode}`,
    utmSource: params.creatorName.toLowerCase().replace(/\s+/g, '_'),
    utmMedium: 'influencer',
    utmCampaign: params.campaignName.toLowerCase().replace(/\s+/g, '_'),
    utmContent: shortCode,
    utmTerm: '',
    clicks: 0,
    uniqueClicks: 0,
    conversions: 0,
    conversionRate: 0,
    lastClickedAt: null,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Build full URL with UTM parameters
 */
export function buildTrackedUrl(link: TrackedLink): string {
  const url = new URL(link.originalUrl)
  url.searchParams.set('utm_source', link.utmSource)
  url.searchParams.set('utm_medium', link.utmMedium)
  url.searchParams.set('utm_campaign', link.utmCampaign)
  url.searchParams.set('utm_content', link.utmContent)
  if (link.utmTerm) url.searchParams.set('utm_term', link.utmTerm)
  return url.toString()
}

/**
 * Calculate link analytics
 */
export function calculateLinkAnalytics(
  clicks: LinkClick[],
  link: TrackedLink
): LinkAnalytics {
  // Clicks by day (last 30 days)
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 86400000
  const recentClicks = clicks.filter(c => new Date(c.clickedAt).getTime() > thirtyDaysAgo)

  const clicksByDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 86400000).toISOString().split('T')[0]
    clicksByDay[date] = 0
  }
  recentClicks.forEach(c => {
    const date = c.clickedAt.split('T')[0]
    if (clicksByDay[date] !== undefined) {
      clicksByDay[date]++
    }
  })

  // Clicks by country
  const clicksByCountry: Record<string, number> = {}
  clicks.forEach(c => {
    clicksByCountry[c.country || 'Unknown'] = (clicksByCountry[c.country || 'Unknown'] || 0) + 1
  })

  // Clicks by device
  const clicksByDevice: Record<string, number> = {}
  clicks.forEach(c => {
    const device = c.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
    clicksByDevice[device] = (clicksByDevice[device] || 0) + 1
  })

  // Top referers
  const referers: Record<string, number> = {}
  clicks.forEach(c => {
    const ref = c.referer || 'Direct'
    referers[ref] = (referers[ref] || 0) + 1
  })

  // Unique clicks (by IP)
  const uniqueIps = new Set(clicks.map(c => c.ipAddress))

  return {
    totalClicks: link.clicks,
    uniqueClicks: uniqueIps.size,
    conversions: link.conversions,
    conversionRate: link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0,
    clicksByDay: Object.entries(clicksByDay).map(([date, clicks]) => ({ date, clicks })),
    clicksByCountry: Object.entries(clicksByCountry)
      .map(([country, clicks]) => ({ country, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10),
    clicksByDevice: Object.entries(clicksByDevice)
      .map(([device, clicks]) => ({ device, clicks })),
    topReferers: Object.entries(referers)
      .map(([referer, clicks]) => ({ referer, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10),
  }
}

/**
 * Export analytics to CSV
 */
export function exportAnalyticsToCSV(analytics: LinkAnalytics): string {
  const rows = [
    ['Metric', 'Value'],
    ['Total Clicks', analytics.totalClicks.toString()],
    ['Unique Clicks', analytics.uniqueClicks.toString()],
    ['Conversions', analytics.conversions.toString()],
    ['Conversion Rate', `${analytics.conversionRate.toFixed(2)}%`],
    [],
    ['Date', 'Clicks'],
    ...analytics.clicksByDay.map(d => [d.date, d.clicks.toString()]),
    [],
    ['Country', 'Clicks'],
    ...analytics.clicksByCountry.map(c => [c.country, c.clicks.toString()]),
    [],
    ['Device', 'Clicks'],
    ...analytics.clicksByDevice.map(d => [d.device, d.clicks.toString()]),
  ]

  return rows.map(r => r.join(',')).join('\n')
}
