import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { aggregateGeoAnalytics } from '@/lib/geoip'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { searchParams } = new URL(req.url)
    const linkId = searchParams.get('link_id')

    const client = getCPClient()

    let query = client
      .from('cp_tracked_links')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (linkId) {
      query = query.eq('id', linkId)
    }

    const { data: links, error: linkError } = await query
    if (linkError) throw linkError

    const linkIds = (links || []).map((l: Record<string, unknown>) => l.id)

    let clicks: Record<string, unknown>[] = []
    if (linkIds.length > 0) {
      const { data } = await client
        .from('cp_link_clicks')
        .select('*')
        .in('link_id', linkIds)
        .order('clicked_at', { ascending: false })
      clicks = data || []
    }

    // Pre-fetch all conversion counts for all links in one query
    const conversionCounts: Record<string, number> = {}
    if (linkIds.length > 0) {
      const { data: convData } = await client
        .from('cp_link_conversions')
        .select('link_id')
        .in('link_id', linkIds)
      if (convData) {
        for (const row of convData) {
          const lid = row.link_id as string
          conversionCounts[lid] = (conversionCounts[lid] || 0) + 1
        }
      }
    }

    const clicksByLink: Record<string, Record<string, unknown>[]> = {}
    for (const c of clicks) {
      const lid = c.link_id as string
      if (!clicksByLink[lid]) clicksByLink[lid] = []
      clicksByLink[lid].push(c)
    }

    const analytics = (links || []).map((link: Record<string, unknown>) => {
      const linkClicks = clicksByLink[link.id as string] || []

      const clicksByDay: Record<string, number> = {}
      const clicksByBrowser: Record<string, number> = {}
      const clicksByOS: Record<string, number> = {}
      const referers: Record<string, number> = {}
      const uniqueIps = new Set<string>()
      const uniqueCountries = new Set<string>()
      const uniqueCities = new Set<string>()

      const geoClicks: Array<{ country: string; country_code: string; city: string; device: string; browser: string; os: string }> = []

      for (const c of linkClicks) {
        const date = (c.clicked_at as string)?.split('T')[0] || 'unknown'
        clicksByDay[date] = (clicksByDay[date] || 0) + 1

        const country = (c.country as string) || 'Unknown'
        const countryCode = (c.country_code as string) || 'XX'
        const city = (c.city as string) || 'Unknown'
        const browser = (c.browser as string) || 'Unknown'
        const os = (c.os as string) || 'Unknown'
        const device = (c.device as string) || 'Unknown'

        clicksByBrowser[browser] = (clicksByBrowser[browser] || 0) + 1
        clicksByOS[os] = (clicksByOS[os] || 0) + 1

        const ref = (c.referer as string) || 'Direct'
        referers[ref] = (referers[ref] || 0) + 1

        if (c.ip_address) uniqueIps.add(c.ip_address as string)
        if (country !== 'Unknown') uniqueCountries.add(country)
        if (city !== 'Unknown') uniqueCities.add(city)

        geoClicks.push({ country, country_code: countryCode, city, device, browser, os })
      }

      const geoAnalytics = aggregateGeoAnalytics(geoClicks)
      const linkId = link.id as string
      const convCount = conversionCounts[linkId] || 0
      const totalClicks = Number(link.clicks || 0)

      return {
        ...link,
        analytics: {
          totalClicks,
          uniqueClicks: uniqueIps.size,
          conversions: convCount,
          conversionRate: totalClicks > 0 ? (convCount / totalClicks) * 100 : 0,
          clicksByDay: Object.entries(clicksByDay).map(([date, count]) => ({ date, clicks: count })),
          clicksByCountry: geoAnalytics.clicksByCountry,
          clicksByCity: geoAnalytics.clicksByCity,
          clicksByDevice: geoAnalytics.clicksByDevice,
          clicksByBrowser: Object.entries(clicksByBrowser).map(([browser, count]) => ({ browser, clicks: count })).sort((a, b) => b.clicks - a.clicks),
          clicksByOS: Object.entries(clicksByOS).map(([os, count]) => ({ os, clicks: count })).sort((a, b) => b.clicks - a.clicks),
          topReferers: Object.entries(referers)
            .map(([referer, count]) => ({ referer, clicks: count }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10),
          uniqueCountries: uniqueCountries.size,
          uniqueCities: uniqueCities.size,
          recentClicks: linkClicks.slice(0, 20),
        },
      }
    })

    return NextResponse.json({ links: analytics })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
