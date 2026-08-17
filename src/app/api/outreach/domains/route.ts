import { NextResponse } from 'next/server'
import { outreachSelect, outreachInsert } from '@/lib/outreach/db'

export async function GET() {
  try {
    const domains = await outreachSelect<any>('outreach_sending_domains', {
      order: { column: 'created_at', ascending: false },
    })
    return NextResponse.json({ domains })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.domain) return NextResponse.json({ error: 'Domain is required' }, { status: 400 })

    const domain = body.domain.toLowerCase().trim()

    const existing = await outreachSelect<any>('outreach_sending_domains', {
      filters: { domain },
      limit: 1,
    })
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 })
    }

    const newDomain = await outreachInsert<any>('outreach_sending_domains', {
      domain,
      tier: body.tier || 'tier2',
      is_bulk_sender: body.is_bulk_sender ?? true,
      status: 'paused',
      paused_reason: 'pending_auth_verification',
    })

    return NextResponse.json({ domain: newDomain })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
