import { NextResponse } from 'next/server'
import { outreachUpdate } from '@/lib/outreach/db'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.tier !== undefined) updates.tier = body.tier
    if (body.stage !== undefined) updates.stage = body.stage
    if (body.subject !== undefined) updates.subject = body.subject
    if (body.body_text !== undefined) updates.body_text = body.body_text
    if (body.body_html !== undefined) updates.body_html = body.body_html
    if (body.active !== undefined) updates.active = body.active
    updates.updated_at = new Date().toISOString()

    await outreachUpdate('outreach_templates', 'id', id, updates)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = (await import('@/lib/cp-db')).getCPClient()
    const { error } = await client.from('outreach_templates').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
