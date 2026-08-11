import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = getCPClient()

    const { data, error } = await client
      .from('cp_creator_commercials')
      .select('*')
      .eq('creator_pool_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ commercials: data || [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const client = getCPClient()
    const { data, error } = await client
      .from('cp_creator_commercials')
      .insert({
        creator_pool_id: id,
        platform: body.platform,
        deliverable_type: body.deliverable_type,
        rate: body.rate,
        currency: body.currency || 'INR',
        negotiable: body.negotiable ?? true,
        min_rate: body.min_rate || null,
        notes: body.notes || null,
        effective_from: body.effective_from || new Date().toISOString().split('T')[0],
        effective_to: body.effective_to || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ commercial: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { commercial_id, ...updates } = body

    if (!commercial_id) {
      return NextResponse.json({ error: 'commercial_id is required' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const client = getCPClient()
    const { data, error } = await client
      .from('cp_creator_commercials')
      .update(updates)
      .eq('id', commercial_id)
      .eq('creator_pool_id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ commercial: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const commercialId = searchParams.get('commercial_id')

    if (!commercialId) {
      return NextResponse.json({ error: 'commercial_id is required' }, { status: 400 })
    }

    const client = getCPClient()
    const { error } = await client
      .from('cp_creator_commercials')
      .delete()
      .eq('id', commercialId)
      .eq('creator_pool_id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
