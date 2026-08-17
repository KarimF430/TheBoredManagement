import { NextResponse } from 'next/server'
import { outreachSelect, outreachInsert, outreachUpdate } from '@/lib/outreach/db'

export async function GET() {
  try {
    const templates = await outreachSelect<any>('outreach_templates', {
      order: { column: 'stage', ascending: true },
    })
    return NextResponse.json({ templates })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.name || !body.subject || !body.body_text) {
      return NextResponse.json({ error: 'Name, subject, and body_text are required' }, { status: 400 })
    }

    const template = await outreachInsert<any>('outreach_templates', {
      name: body.name,
      tier: body.tier || 'tier2',
      stage: body.stage || 'first_touch',
      subject: body.subject,
      body_text: body.body_text,
      body_html: body.body_html || null,
      active: body.active ?? true,
    })

    return NextResponse.json({ template })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
