import { NextResponse } from 'next/server'
import { outreachInsert } from '@/lib/outreach/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = ((body.email || '').toLowerCase().trim())

    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    try {
      await outreachInsert('outreach_suppressions', {
        email,
        reason: 'unsubscribe',
        source: 'one_click_post',
      })
    } catch {
      // Already suppressed
    }

    return NextResponse.json({ unsubscribed: email })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = ((searchParams.get('email') || '').toLowerCase().trim())

  if (!email) {
    return new Response('Email parameter required', { status: 400 })
  }

  try {
    await outreachInsert('outreach_suppressions', {
      email,
      reason: 'unsubscribe',
      source: 'one_click_get',
    })
  } catch {
    // Already suppressed
  }

  return new Response('You have been unsubscribed.')
}
