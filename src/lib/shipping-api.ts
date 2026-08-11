/**
 * Shipping API Integration
 * Supports Shiprocket and Delhivery APIs for automatic shipment tracking
 * When a tracking number is added, the system polls the carrier API to auto-update status
 */

export interface ShippingConfig {
  provider: 'shiprocket' | 'delhivery' | 'manual'
  apiKey?: string
  apiSecret?: string
  baseUrl: string
}

export interface TrackingResult {
  status: 'pending' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'returned' | 'failed'
  currentLocation: string | null
  estimatedDelivery: string | null
  actualDelivery: string | null
  lastUpdate: string
  events: TrackingEvent[]
}

export interface TrackingEvent {
  timestamp: string
  location: string | null
  status: string
  description: string
}

const SHIPROCKET_CONFIG: ShippingConfig = {
  provider: 'shiprocket',
  apiKey: process.env.SHIPROCKET_API_KEY,
  apiSecret: process.env.SHIPROCKET_API_SECRET,
  baseUrl: 'https://apiv2.shiprocket.in/v1/external',
}

const DELHIVERY_CONFIG: ShippingConfig = {
  provider: 'delhivery',
  apiKey: process.env.DELHIVERY_API_KEY,
  baseUrl: 'https://dlv-api.delhivery.com/v3',
}

// ── Shiprocket Integration ───────────────────────────────────────

async function getShiprocketToken(): Promise<string> {
  const res = await fetch(`${SHIPROCKET_CONFIG.baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: SHIPROCKET_CONFIG.apiKey,
      password: SHIPROCKET_CONFIG.apiSecret,
    }),
  })
  const data = await res.json()
  return data.token
}

export async function trackShiprocket(trackingNumber: string): Promise<TrackingResult> {
  try {
    const token = await getShiprocketToken()
    const res = await fetch(
      `${SHIPROCKET_CONFIG.baseUrl}/courier/track/shipment/${trackingNumber}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()

    const shipment = data?.response?.data?.tracking_data
    if (!shipment) {
      return {
        status: 'pending',
        currentLocation: null,
        estimatedDelivery: null,
        actualDelivery: null,
        lastUpdate: new Date().toISOString(),
        events: [],
      }
    }

    const statusMap: Record<string, TrackingResult['status']> = {
      'manifested': 'shipped',
      'picked_up': 'shipped',
      'in_transit': 'in_transit',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered',
      'returned': 'returned',
      'undelivered': 'failed',
    }

    const events = (shipment.shipment_track || []).map((e: Record<string, unknown>) => ({
      timestamp: (e.scan_date as string) || new Date().toISOString(),
      location: (e.location as string) || null,
      status: (e.scan_type as string) || 'unknown',
      description: (e.scan_remark as string) || '',
    }))

    const latestEvent = events[0]
    const rawStatus = (shipment?.current_status as string)?.toLowerCase() || 'pending'

    return {
      status: statusMap[rawStatus] || 'in_transit',
      currentLocation: latestEvent?.location || null,
      estimatedDelivery: shipment?.etd || null,
      actualDelivery: rawStatus === 'delivered' ? latestEvent?.timestamp || null : null,
      lastUpdate: latestEvent?.timestamp || new Date().toISOString(),
      events,
    }
  } catch {
    return {
      status: 'pending',
      currentLocation: null,
      estimatedDelivery: null,
      actualDelivery: null,
      lastUpdate: new Date().toISOString(),
      events: [],
    }
  }
}

// ── Delhivery Integration ────────────────────────────────────────

export async function trackDelhivery(trackingNumber: string): Promise<TrackingResult> {
  try {
    const token = process.env.DELHIVERY_API_TOKEN
    const res = await fetch(
      `${DELHIVERY_CONFIG.baseUrl}/shipments/${trackingNumber}/tracking`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()

    const shipment = data?.ShipmentData?.[0]
    if (!shipment) {
      return {
        status: 'pending',
        currentLocation: null,
        estimatedDelivery: null,
        actualDelivery: null,
        lastUpdate: new Date().toISOString(),
        events: [],
      }
    }

    const statusMap: Record<string, TrackingResult['status']> = {
      'Manifested': 'shipped',
      'Picked Up': 'shipped',
      'In Transit': 'in_transit',
      'Out for Delivery': 'out_for_delivery',
      'Delivered': 'delivered',
      'RTO': 'returned',
      'Undelivered': 'failed',
    }

    const rawStatus = shipment?.Status?.Status || 'pending'

    return {
      status: statusMap[rawStatus] || 'in_transit',
      currentLocation: shipment?.Scans?.[0]?.ScannedLocation || null,
      estimatedDelivery: shipment?.ExpectedDeliveryDate || null,
      actualDelivery: rawStatus === 'Delivered' ? shipment?.Scans?.[0]?.ScanDateTime || null : null,
      lastUpdate: shipment?.Scans?.[0]?.ScanDateTime || new Date().toISOString(),
      events: (shipment?.Scans || []).map((s: Record<string, unknown>) => ({
        timestamp: (s.ScanDateTime as string) || new Date().toISOString(),
        location: (s.ScannedLocation as string) || null,
        status: (s.ScanType as string) || 'unknown',
        description: (s.Instruction as string) || '',
      })),
    }
  } catch {
    return {
      status: 'pending',
      currentLocation: null,
      estimatedDelivery: null,
      actualDelivery: null,
      lastUpdate: new Date().toISOString(),
      events: [],
    }
  }
}

// ── Universal Tracker ────────────────────────────────────────────

export async function trackShipment(
  trackingNumber: string,
  carrier: string
): Promise<TrackingResult> {
  const carrierLower = (carrier || '').toLowerCase()

  if (carrierLower.includes('shiprocket') || carrierLower.includes('delhivery')) {
    if (carrierLower.includes('delhivery')) {
      return trackDelhivery(trackingNumber)
    }
    return trackShiprocket(trackingNumber)
  }

  // Default: try Shiprocket first, fallback to Delhivery
  const result = await trackShiprocket(trackingNumber)
  if (result.status === 'pending') {
    return trackDelhivery(trackingNumber)
  }
  return result
}

// ── Batch Tracking (for cron jobs) ───────────────────────────────

export interface BatchTrackingUpdate {
  shipmentId: string
  trackingNumber: string
  carrier: string
  newStatus: string
  currentLocation: string | null
  estimatedDelivery: string | null
  actualDelivery: string | null
}

export async function batchTrackShipments(
  shipments: Array<{ id: string; tracking_number: string; carrier: string }>
): Promise<BatchTrackingUpdate[]> {
  const updates: BatchTrackingUpdate[] = []

  for (const shipment of shipments) {
    if (!shipment.tracking_number) continue

    const result = await trackShipment(shipment.tracking_number, shipment.carrier)

    updates.push({
      shipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      carrier: shipment.carrier,
      newStatus: result.status,
      currentLocation: result.currentLocation,
      estimatedDelivery: result.estimatedDelivery,
      actualDelivery: result.actualDelivery,
    })

    // Rate limit: 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return updates
}
