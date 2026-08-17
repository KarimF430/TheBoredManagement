import { NextResponse } from 'next/server'
import { outreachSelect, outreachInsert, outreachUpdate } from '@/lib/outreach/db'

export async function GET() {
  try {
    const creators = await outreachSelect<any>('outreach_creators', {
      order: { column: 'created_at', ascending: false },
    })
    return NextResponse.json({ creators })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const email = body.email.toLowerCase().trim()

    // Check duplicate
    const existing = await outreachSelect<any>('outreach_creators', {
      filters: { email },
      limit: 1,
    })
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Creator with this email already exists' }, { status: 409 })
    }

    const creator = await outreachInsert<any>('outreach_creators', {
      email,
      name: body.name || null,
      niche: body.niche || null,
      size_tier: body.size_tier || null,
      jurisdiction: body.jurisdiction || null,
      source: body.source || 'manual',
      raw_signals: body.raw_signals || null,
    })

    return NextResponse.json({ creator })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
