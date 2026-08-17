import { NextResponse } from 'next/server'
import { outreachSelect, outreachUpdate, outreachDelete, outreachCount } from '@/lib/outreach/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const campaigns = await outreachSelect<any>('outreach_campaigns', {
      filters: { id },
      limit: 1,
    })

    if (campaigns.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const campaign = campaigns[0]

    let templateName = null
    let template = null
    if (campaign.template_id) {
      const templates = await outreachSelect<any>('outreach_templates', {
        filters: { id: campaign.template_id },
        limit: 1,
      })
      if (templates.length > 0) {
        template = templates[0]
        templateName = templates[0].name
      }
    }

    // Get queue stats for this campaign
    const queueStats = await outreachSelect<any>('outreach_send_queue', {
      filters: { campaign_id: id },
      select: 'status',
    })

    const statusCounts: Record<string, number> = {}
    for (const row of queueStats) {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
    }

    // Get reply stats
    const replyRows = await outreachSelect<any>('outreach_log', {
      filters: { campaign_id: id },
    })

    const replyCount = replyRows.filter((r: any) => r.replied_at).length
    const bounceCount = replyRows.filter((r: any) => r.bounced).length
    const deliveredCount = replyRows.filter((r: any) => r.delivered_at).length

    // Get creators info
    const creatorIds = campaign.creator_ids || []
    let creators: any[] = []
    if (creatorIds.length > 0) {
      // Fetch creators in batches
      for (let i = 0; i < creatorIds.length; i += 50) {
        const batch = creatorIds.slice(i, i + 50)
        const rows = await outreachSelect<any>('outreach_creators', {
          filters: {},
        })
        creators.push(...rows.filter((r: any) => batch.includes(r.id)))
      }
    }

    return NextResponse.json({
      campaign: {
        ...campaign,
        template_name: templateName,
        template,
        queue_stats: statusCounts,
        reply_count: replyCount,
        bounce_count: bounceCount,
        delivered_count: deliveredCount,
        creators,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const allowed = ['name', 'template_id', 'status', 'settings']
    const updates: Record<string, unknown> = {}

    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    updates.updated_at = new Date().toISOString()

    const result = await outreachUpdate('outreach_campaigns', 'id', id, updates)
    if (result.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign: result[0] })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await outreachDelete('outreach_campaigns', 'id', id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
