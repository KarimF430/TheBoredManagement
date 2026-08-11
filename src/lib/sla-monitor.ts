/**
 * SLA Monitor & Auto-Escalation Engine
 * Tracks SLA compliance, sends alerts, auto-escalates breaches
 */

export interface SLAConfig {
  clientFeedbackHours: number
  scriptDays: number
  contentDays: number
  onboardToLiveDays: number
}

export interface SLAClock {
  deliverableId: string
  stage: string
  startedAt: string
  deadline: string
  pausedAt: string | null
  resumedAt: string | null
  pausedDuration: number // milliseconds
  status: 'running' | 'paused' | 'completed' | 'breached'
}

export interface SLAAlert {
  id: string
  type: 'warning' | 'breached' | 'escalation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  campaignId: string
  deliverableId: string | null
  creatorName: string | null
  stage: string
  hoursRemaining: number | null
  hoursOverdue: number | null
  createdAt: string
  acknowledgedAt: string | null
}

export interface SLADashboard {
  totalActive: number
  onTrack: number
  warning: number
  breached: number
  avgResolutionHours: number
  slaComplianceRate: number
  alerts: SLAAlert[]
}

const STAGE_TO_SLA: Record<string, keyof SLAConfig> = {
  script_pending: 'scriptDays',
  script_approved: 'contentDays',
  filming: 'contentDays',
  in_review: 'contentDays',
  onboarded: 'onboardToLiveDays',
}

/**
 * Calculate SLA deadline from start time and config
 */
export function calculateDeadline(
  startedAt: string,
  stage: string,
  config: SLAConfig
): Date {
  const start = new Date(startedAt)
  const slaKey = STAGE_TO_SLA[stage]

  if (!slaKey) return new Date(start.getTime() + 7 * 86400000) // Default 7 days

  const slaValue = config[slaKey]
  if (slaKey === 'clientFeedbackHours') {
    return new Date(start.getTime() + slaValue * 3600000)
  }
  return new Date(start.getTime() + slaValue * 86400000)
}

/**
 * Check SLA status for a deliverable
 */
export function checkSLAStatus(
  clock: SLAClock,
  config: SLAConfig
): { status: 'on_track' | 'warning' | 'breached'; hoursRemaining: number; deadline: Date } {
  const deadline = calculateDeadline(clock.startedAt, clock.stage, config)

  // Adjust for paused time
  if (clock.pausedDuration > 0) {
    deadline.setTime(deadline.getTime() + clock.pausedDuration)
  }

  const now = Date.now()
  const deadlineMs = deadline.getTime()
  const hoursRemaining = (deadlineMs - now) / 3600000

  if (hoursRemaining < 0) {
    return { status: 'breached', hoursRemaining, deadline }
  }
  if (hoursRemaining <= 24) {
    return { status: 'warning', hoursRemaining, deadline }
  }
  return { status: 'on_track', hoursRemaining, deadline }
}

/**
 * Generate SLA alerts for all active deliverables
 */
export function generateSLAAlerts(
  deliverables: Array<{
    id: string
    campaign_id: string
    status: string
    creator?: { channel_name: string } | null
  }>,
  config: SLAConfig
): SLAAlert[] {
  const alerts: SLAAlert[] = []

  for (const deliverable of deliverables) {
    if (['approved', 'live', 'completed'].includes(deliverable.status)) continue

    // Check if stage has SLA
    const slaKey = STAGE_TO_SLA[deliverable.status]
    if (!slaKey) continue

    // In real app, we'd fetch the clock from DB
    // For now, simulate based on created_at
    const startedAt = new Date(Date.now() - 5 * 86400000).toISOString() // Simulated
    const clock: SLAClock = {
      deliverableId: deliverable.id,
      stage: deliverable.status,
      startedAt,
      deadline: '',
      pausedAt: null,
      resumedAt: null,
      pausedDuration: 0,
      status: 'running',
    }

    const { status, hoursRemaining } = checkSLAStatus(clock, config)

    if (status === 'warning' || status === 'breached') {
      alerts.push({
        id: crypto.randomUUID(),
        type: status === 'breached' ? 'breached' : 'warning',
        severity: status === 'breached' ? 'critical' : 'medium',
        title: status === 'breached'
          ? `SLA Breached: ${deliverable.status.replace(/_/g, ' ')}`
          : `SLA Warning: ${deliverable.status.replace(/_/g, ' ')}`,
        message: status === 'breached'
          ? `Deliverable is ${Math.abs(Math.round(hoursRemaining))}h overdue`
          : `Deliverable due in ${Math.round(hoursRemaining)}h`,
        campaignId: deliverable.campaign_id,
        deliverableId: deliverable.id,
        creatorName: deliverable.creator?.channel_name || null,
        stage: deliverable.status,
        hoursRemaining,
        hoursOverdue: status === 'breached' ? Math.abs(hoursRemaining) : null,
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
      })
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

/**
 * Build SLA dashboard summary
 */
export function buildSLADashboard(
  deliverables: Array<{ status: string }>,
  alerts: SLAAlert[]
): SLADashboard {
  const activeDeliverables = deliverables.filter(d =>
    !['approved', 'live', 'completed'].includes(d.status)
  )

  const breached = alerts.filter(a => a.type === 'breached').length
  const warning = alerts.filter(a => a.type === 'warning').length

  return {
    totalActive: activeDeliverables.length,
    onTrack: activeDeliverables.length - breached - warning,
    warning,
    breached,
    avgResolutionHours: 0, // Would calculate from historical data
    slaComplianceRate: activeDeliverables.length > 0
      ? ((activeDeliverables.length - breached) / activeDeliverables.length) * 100
      : 100,
    alerts,
  }
}

/**
 * Get escalation recipients based on breach severity
 */
export function getEscalationRecipients(
  alert: SLAAlert,
  teamMembers: Array<{ role: string; user: { email: string } }>
): string[] {
  const recipients: string[] = []

  switch (alert.severity) {
    case 'critical':
      // Escalate to Brand Solutions + Campaign Manager
      recipients.push(
        ...teamMembers
          .filter(m => ['brand_solutions', 'campaign_manager'].includes(m.role))
          .map(m => m.user.email)
      )
      break
    case 'high':
      // Escalate to Campaign Manager
      recipients.push(
        ...teamMembers
          .filter(m => m.role === 'campaign_manager')
          .map(m => m.user.email)
      )
      break
    case 'medium':
      // Escalate to IR Manager
      recipients.push(
        ...teamMembers
          .filter(m => m.role === 'ir_manager')
          .map(m => m.user.email)
      )
      break
    default:
      // Low - no escalation
      break
  }

  return [...new Set(recipients)]
}
