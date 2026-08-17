import { NextResponse } from 'next/server'
import { enqueueRecipients } from '@/lib/outreach/queue/enqueue'
import { outreachConfig } from '@/lib/outreach/config'

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== outreachConfig.enqueue.apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { recipients, campaign_day } = body

    if (!Array.isArray(recipients)) {
      return NextResponse.json({ error: 'recipients must be an array' }, { status: 400 })
    }

    const result = await enqueueRecipients(recipients, { campaignDay: campaign_day })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
