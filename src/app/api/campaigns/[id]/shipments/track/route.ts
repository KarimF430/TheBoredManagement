import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { trackShipment, batchTrackShipments } from '@/lib/shipping-api'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body = await req.json()
    const { shipment_id, tracking_number, carrier } = body

    const client = getCPClient()

    // Single shipment tracking
    if (shipment_id || (tracking_number && carrier)) {
      let shipment
      if (shipment_id) {
        const { data } = await client
          .from('cp_product_shipments')
          .select('*')
          .eq('id', shipment_id)
          .single()
        shipment = data
      }

      const tn = tracking_number || shipment?.tracking_number
      const cr = carrier || shipment?.carrier

      if (!tn) {
        return NextResponse.json({ error: 'No tracking number available' }, { status: 400 })
      }

      const result = await trackShipment(tn, cr || '')

      // Update shipment in DB
      if (shipment_id && result.status !== 'pending') {
        const updates: Record<string, unknown> = {
          status: result.status,
          updated_at: new Date().toISOString(),
        }
        if (result.estimatedDelivery) updates.estimated_delivery = result.estimatedDelivery
        if (result.actualDelivery) updates.delivered_at = result.actualDelivery
        if (result.currentLocation) updates.current_location = result.currentLocation

        await client.from('cp_product_shipments').update(updates).eq('id', shipment_id)
      }

      return NextResponse.json({ tracking: result })
    }

    // Batch tracking for all active shipments in campaign
    const { data: shipments } = await client
      .from('cp_product_shipments')
      .select('id, tracking_number, carrier')
      .eq('campaign_id', campaignId)
      .not('tracking_number', 'is', null)
      .in('status', ['shipped', 'in_transit'])

    if (!shipments || shipments.length === 0) {
      return NextResponse.json({ message: 'No active shipments to track', updates: [] })
    }

    const updates = await batchTrackShipments(shipments)

    // Apply updates to DB
    for (const update of updates) {
      if (update.newStatus !== 'pending') {
        const dbUpdates: Record<string, unknown> = {
          status: update.newStatus,
          updated_at: new Date().toISOString(),
        }
        if (update.estimatedDelivery) dbUpdates.estimated_delivery = update.estimatedDelivery
        if (update.actualDelivery) dbUpdates.delivered_at = update.actualDelivery
        if (update.currentLocation) dbUpdates.current_location = update.currentLocation

        await client.from('cp_product_shipments').update(dbUpdates).eq('id', update.shipmentId)
      }
    }

    return NextResponse.json({ updates, tracked: updates.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
