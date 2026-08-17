import { NextResponse } from 'next/server'
import { outreachSelect, outreachInsert, outreachUpdate, outreachCount } from '@/lib/outreach/db'

export async function GET() {
  try {
    const campaigns = await outreachSelect<any>('outreach_campaigns', {
      order: { column: 'created_at', ascending: false },
    })

    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        let templateName = null
        if (c.template_id) {
          const templates = await outreachSelect<any>('outreach_templates', {
            filters: { id: c.template_id },
            limit: 1,
          })
          templateName = templates[0]?.name || null
        }
        return { ...c, template_name: templateName }
      })
    )

    return NextResponse.json({ campaigns: enriched })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, template_id, creator_ids, settings } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!creator_ids || !Array.isArray(creator_ids) || creator_ids.length === 0) {
      return NextResponse.json({ error: 'creator_ids must be a non-empty array' }, { status: 400 })
    }

    const campaign = await outreachInsert<any>('outreach_campaigns', {
      name,
      template_id: template_id || null,
      status: 'draft',
      creator_ids,
      total_creators: creator_ids.length,
      settings: settings || {},
    })

    return NextResponse.json({ campaign })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
