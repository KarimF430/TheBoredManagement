/**
 * Link Redirect + Click Tracking
 * GET /api/links/[code] - Redirect to original URL and track click with GeoIP
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { enrichClickData } from '@/lib/geoip'

interface RouteParams {
  params: Promise<{ code: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { code } = await params
  const client = getCPClient()

  try {
    const { data: link, error } = await client
      .from('cp_tracked_links')
      .select('*')
      .eq('short_code', code)
      .single()

    if (error || !link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const userAgent = req.headers.get('user-agent') || ''
    const referer = req.headers.get('referer') || ''
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0] || 'unknown'

    // Enrich with GeoIP + device detection
    const enriched = await enrichClickData(ip, userAgent, referer)

    // Insert enriched click record
    await client.from('cp_link_clicks').insert({
      link_id: link.id,
      ip_address: ip,
      user_agent: userAgent,
      referer,
      device: enriched.device.device,
      browser: enriched.device.browser,
      os: enriched.device.os,
      is_bot: enriched.device.isBot,
      country: enriched.geo.country,
      country_code: enriched.geo.country_code,
      city: enriched.geo.city,
      region: enriched.geo.region,
      latitude: enriched.geo.lat,
      longitude: enriched.geo.lon,
      timezone: enriched.geo.timezone,
      isp: enriched.geo.isp,
      clicked_at: enriched.clicked_at,
    })

    // Update click counts
    await client
      .from('cp_tracked_links')
      .update({
        clicks: (link.clicks || 0) + 1,
        last_clicked_at: new Date().toISOString(),
      })
      .eq('id', link.id)

    // Redirect to tracked URL (with UTM)
    const redirectUrl = link.tracked_url || link.original_url
    return NextResponse.redirect(redirectUrl)
  } catch {
    const { data: link } = await client
      .from('cp_tracked_links')
      .select('original_url')
      .eq('short_code', code)
      .single()

    if (link) return NextResponse.redirect(link.original_url)
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }
}
