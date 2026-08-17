import { NextResponse } from 'next/server'
import { outreachSelect, outreachInsert } from '@/lib/outreach/db'

export async function GET() {
  try {
    const mailboxes = await outreachSelect<any>('outreach_mailboxes', {
      order: { column: 'created_at', ascending: false },
    })
    return NextResponse.json({ mailboxes })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.email || !body.domain_id) {
      return NextResponse.json({ error: 'Email and domain_id are required' }, { status: 400 })
    }

    const email = body.email.toLowerCase().trim()

    const existing = await outreachSelect<any>('outreach_mailboxes', {
      filters: { email },
      limit: 1,
    })
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Mailbox email already exists' }, { status: 409 })
    }

    const mailbox = await outreachInsert<any>('outreach_mailboxes', {
      domain_id: body.domain_id,
      tier: body.tier || 'tier2',
      provider: body.provider || 'gmail',
      email,
      display_name: body.display_name || null,
      warmup_stage: 0,
      daily_cap: body.daily_cap || 10,
      sent_today: 0,
      status: 'active',
    })

    return NextResponse.json({ mailbox })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
