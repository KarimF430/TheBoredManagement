/**
 * Product Tracking Pipeline
 * Tracks product from shipment → delivery → shoot → live
 */

export interface ProductStage {
  id: string
  label: string
  icon: string
  color: string
  completed: boolean
  timestamp: string | null
}

export interface ProductTracking {
  deliverableId: string
  productName: string
  trackingNumber: string | null
  carrier: string | null
  stages: ProductStage[]
  currentStage: number
  estimatedDelivery: string | null
  actualDelivery: string | null
}

const PRODUCT_STAGES = [
  { id: 'brief_approved', label: 'Brief Approved', icon: 'FileText', color: '#7C3AED' },
  { id: 'product_shipped', label: 'Product Shipped', icon: 'Truck', color: '#FF6D00' },
  { id: 'product_delivered', label: 'Product Delivered', icon: 'Package', color: '#1A73E8' },
  { id: 'shoot_scheduled', label: 'Shoot Scheduled', icon: 'Calendar', color: '#7C3AED' },
  { id: 'shoot_completed', label: 'Shoot Done', icon: 'Camera', color: '#00C853' },
  { id: 'content_submitted', label: 'Content Submitted', icon: 'Upload', color: '#1A73E8' },
  { id: 'content_approved', label: 'Content Approved', icon: 'CheckCircle2', color: '#00C853' },
  { id: 'live', label: 'Live', icon: 'Rocket', color: '#FF2D55' },
]

/**
 * Build product tracking timeline from deliverable data
 */
export function buildProductTracking(deliverable: Record<string, unknown>): ProductTracking {
  const stages: ProductStage[] = PRODUCT_STAGES.map(s => ({
    ...s,
    completed: false,
    timestamp: null,
  }))

  // Mark completed stages based on timestamps
  if (deliverable.brief_approved_at) {
    const stage = stages.find(s => s.id === 'brief_approved')
    if (stage) { stage.completed = true; stage.timestamp = deliverable.brief_approved_at as string }
  }
  if (deliverable.product_shipped_at) {
    const stage = stages.find(s => s.id === 'product_shipped')
    if (stage) { stage.completed = true; stage.timestamp = deliverable.product_shipped_at as string }
  }
  if (deliverable.product_delivered_at) {
    const stage = stages.find(s => s.id === 'product_delivered')
    if (stage) { stage.completed = true; stage.timestamp = deliverable.product_delivered_at as string }
  }
  if (deliverable.shoot_scheduled_at) {
    const stage = stages.find(s => s.id === 'shoot_scheduled')
    if (stage) { stage.completed = true; stage.timestamp = deliverable.shoot_scheduled_at as string }
  }
  if (deliverable.shoot_completed_at) {
    const stage = stages.find(s => s.id === 'shoot_completed')
    if (stage) { stage.completed = true; stage.timestamp = deliverable.shoot_completed_at as string }
  }
  if (deliverable.script_approved_at) {
    const stage = stages.find(s => s.id === 'content_submitted')
    if (stage) { stage.completed = true; stage.timestamp = deliverable.script_approved_at as string }
  }
  if (deliverable.status === 'approved') {
    const stage = stages.find(s => s.id === 'content_approved')
    if (stage) { stage.completed = true; stage.timestamp = deliverable.updated_at as string }
  }
  if (deliverable.status === 'live') {
    const stage = stages.find(s => s.id === 'live')
    if (stage) { stage.completed = true; stage.timestamp = deliverable.live_link_added_at as string }
  }

  const currentStage = stages.findIndex(s => !s.completed)

  return {
    deliverableId: deliverable.id as string,
    productName: (deliverable.product_name as string) || 'Product',
    trackingNumber: deliverable.tracking_number as string | null,
    carrier: deliverable.carrier as string | null,
    stages,
    currentStage: currentStage === -1 ? stages.length - 1 : currentStage,
    estimatedDelivery: deliverable.estimated_delivery as string | null,
    actualDelivery: deliverable.product_delivered_at as string | null,
  }
}

/**
 * Get SLA status for a deliverable stage
 */
export function getStageSLAStatus(
  stage: ProductStage,
  slaDays: number
): { status: 'on_track' | 'warning' | 'breached'; daysRemaining: number } | null {
  if (!stage.timestamp || stage.completed) return null

  const stageStart = new Date(stage.timestamp).getTime()
  const deadline = stageStart + slaDays * 86400000
  const now = Date.now()
  const daysRemaining = Math.ceil((deadline - now) / 86400000)

  if (daysRemaining < 0) return { status: 'breached', daysRemaining }
  if (daysRemaining <= 2) return { status: 'warning', daysRemaining }
  return { status: 'on_track', daysRemaining }
}

/**
 * Calculate campaign progress percentage
 */
export function calculateCampaignProgress(deliverables: Record<string, unknown>[]): number {
  if (deliverables.length === 0) return 0

  const completed = deliverables.filter(d =>
    ['approved', 'live'].includes(d.status as string)
  ).length

  return Math.round((completed / deliverables.length) * 100)
}
