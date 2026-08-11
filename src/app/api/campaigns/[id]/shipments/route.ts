import { NextRequest, NextResponse } from 'next/server'
import { getCPClient, cpSelect } from '@/lib/cp-db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const client = getCPClient()

    const { data: shipments, error } = await client
      .from('cp_product_shipments')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('shipped_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ shipments: shipments || [] })
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
    const { id: campaignId } = await params
    const body = await req.json()
    const { creator_id, product_name, tracking_number, carrier, shipped_at, expected_delivery } = body

    const client = getCPClient()

    const { data: shipment, error } = await client
      .from('cp_product_shipments')
      .insert({
        campaign_id: campaignId,
        creator_id: creator_id || null,
        product_name,
        tracking_number: tracking_number || null,
        carrier: carrier || null,
        status: 'shipped',
        shipped_at: shipped_at || new Date().toISOString(),
        expected_delivery: expected_delivery || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ shipment })
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
    const { id: campaignId } = await params
    const body = await req.json()
    const { shipment_id, status, tracking_number, delivered_at } = body

    if (!shipment_id) {
      return NextResponse.json({ error: 'shipment_id is required' }, { status: 400 })
    }

    const client = getCPClient()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status) updates.status = status
    if (tracking_number) updates.tracking_number = tracking_number
    if (delivered_at) updates.delivered_at = delivered_at

    const { data: shipment, error } = await client
      .from('cp_product_shipments')
      .update(updates)
      .eq('id', shipment_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ shipment })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
