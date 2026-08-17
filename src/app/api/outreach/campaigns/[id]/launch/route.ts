import { NextResponse } from 'next/server'
import { outreachSelect, outreachUpdate } from '@/lib/outreach/db'
import { enqueueRecipients } from '@/lib/outreach/queue/enqueue'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    // Fetch campaign
    const campaigns = await outreachSelect<any>('outreach_campaigns', {
      filters: { id },
      limit: 1,
    })

    if (campaigns.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const campaign = campaigns[0]

    if (campaign.status === 'sending' || campaign.status === 'completed') {
      return NextResponse.json({ error: `Campaign is already ${campaign.status}` }, { status: 400 })
    }

    if (!campaign.template_id) {
      return NextResponse.json({ error: 'Campaign has no template assigned' }, { status: 400 })
    }

    if (!campaign.creator_ids || campaign.creator_ids.length === 0) {
      return NextResponse.json({ error: 'Campaign has no creators' }, { status: 400 })
    }

    // Fetch template
    const templates = await outreachSelect<any>('outreach_templates', {
      filters: { id: campaign.template_id },
      limit: 1,
    })

    if (templates.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const template = templates[0]

    // Fetch creators
    const allCreators = await outreachSelect<any>('outreach_creators', {
      filters: {},
    })
    const creators = allCreators.filter((c: any) => campaign.creator_ids.includes(c.id))

    if (creators.length === 0) {
      return NextResponse.json({ error: 'No matching creators found' }, { status: 400 })
    }

    // Build enqueue items — use template directly (personalization happens via followupEngine or can be added later)
    const recipients = creators.map((creator: any) => ({
      creator_id: creator.id,
      recipient_email: creator.email,
      tier: template.tier as 'tier1' | 'tier2',
      stage: 'first_touch',
      template_id: template.id,
      subject: template.subject,
      body_text: template.body_text,
      body_html: template.body_html || null,
      priority: 100000,
    }))

    // Enqueue
    const result = await enqueueRecipients(recipients)

    // Update campaign status
    await outreachUpdate('outreach_campaigns', 'id', id, {
      status: 'sending',
      queued_count: result.queued,
      launched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      campaign_id: id,
      enqueue: {
        queued: result.queued,
        skipped: result.skipped,
        invalid: result.invalid,
        suppressed: result.suppressed,
      },
      total_creators: creators.length,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
