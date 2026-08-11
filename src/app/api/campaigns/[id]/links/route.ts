/**
 * Link Tracking API
 * GET /api/campaigns/[id]/links - List tracked links
 * POST /api/campaigns/[id]/links - Create tracked link
 * GET /api/links/[code]/track - Redirect + track click
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - List tracked links
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const client = getCPClient()

  try {
    const { data: links, error } = await client
      .from('cp_tracked_links')
      .select(`
        *,
        creator:cp_creators(id, channel_name),
        deliverable:cp_deliverables(id, platform, status)
      `)
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ links: links || [] })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}

// POST - Create tracked link
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (session.role === 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const client = getCPClient()

  const { original_url, creator_id, deliverable_id } = body

  if (!original_url || !creator_id) {
    return NextResponse.json({ error: 'original_url and creator_id required' }, { status: 400 })
  }

  try {
    // Get creator and campaign info
    const { data: creator } = await client
      .from('cp_creators')
      .select('channel_name')
      .eq('id', creator_id)
      .single()

    const { data: campaign } = await client
      .from('cp_campaigns')
      .select('name')
      .eq('id', id)
      .single()

    // Generate short code
    const hash = Array.from(`${original_url}${creator_id}${Date.now()}`)
      .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
      .toString(36)
      .replace('-', '')
    const short_code = hash.substring(0, 7)

    // Build UTM URL
    const url = new URL(original_url)
    url.searchParams.set('utm_source', (creator?.channel_name || 'unknown').toLowerCase().replace(/\s+/g, '_'))
    url.searchParams.set('utm_medium', 'influencer')
    url.searchParams.set('utm_campaign', (campaign?.name || 'campaign').toLowerCase().replace(/\s+/g, '_'))
    url.searchParams.set('utm_content', short_code)

    const { data: link, error } = await client
      .from('cp_tracked_links')
      .insert({
        campaign_id: id,
        creator_id,
        deliverable_id: deliverable_id || null,
        original_url,
        short_code,
        short_url: `https://tbm.link/${short_code}`,
        tracked_url: url.toString(),
        utm_source: url.searchParams.get('utm_source'),
        utm_medium: 'influencer',
        utm_campaign: url.searchParams.get('utm_campaign'),
        utm_content: short_code,
        clicks: 0,
        unique_clicks: 0,
        conversions: 0,
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await client.from('cp_activity_feed').insert({
      campaign_id: id,
      actor_user_id: session.id,
      actor_role: session.role,
      actor_name: session.name,
      action_type: 'created',
      entity_type: 'link',
      entity_id: link.id,
      entity_name: link.short_url,
      details: { original_url, creator_id },
    })

    return NextResponse.json({ link }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}
