import { NextRequest, NextResponse } from 'next/server'
import { getCampaignSession } from '@/lib/cp-auth'
import { getCPClient } from '@/lib/cp-db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/campaigns/[id]/notifications — Get notifications
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const client = getCPClient()
  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get('unread') === 'true'

  try {
    let query = client
      .from('cp_notifications')
      .select('*')
      .eq('campaign_id', id)
      .eq('user_id', session.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (unreadOnly) {
      query = query.eq('is_read', false)
      const { count } = await client
        .from('cp_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .eq('user_id', session.id)
        .eq('is_read', false)
      return NextResponse.json({ count: count || 0 })
    }

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notifications: notifications || [] })
  } catch (err) {
    console.error('Get notifications error:', err)
    return NextResponse.json({ error: 'Failed to get notifications' }, { status: 500 })
  }
}

// PATCH /api/campaigns/[id]/notifications — Mark as read
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getCampaignSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const client = getCPClient()

  try {
    if (body.mark_all) {
      await client
        .from('cp_notifications')
        .update({ is_read: true })
        .eq('campaign_id', id)
        .eq('user_id', session.id)
        .eq('is_read', false)
    } else if (body.id) {
      await client
        .from('cp_notifications')
        .update({ is_read: body.is_read })
        .eq('id', body.id)
        .eq('user_id', session.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Update notification error:', err)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
