/**
 * Campaign Management Panel — Role-Based Access Control
 *
 * 5 roles: Brand Solutions, Campaign Manager, IR Manager, IR Executive, Client
 * Each role maps to a set of allowed features.
 * Used by Sidebar, API routes, and UI gating.
 */

export type CampaignRole =
  | 'brand_solutions'
  | 'campaign_manager'
  | 'ir_manager'
  | 'ir_executive'
  | 'client'

export type CampaignFeature =
  | 'overview'
  | 'brief'
  | 'shortlist'
  | 'creators'
  | 'negotiate'
  | 'onboard'
  | 'content'
  | 'tracking'
  | 'report'
  | 'settings'
  | 'members'
  | 'escalations'
  | 'internal_cost'
  | 'margin'
  | 'export'
  | 'notifications'
  | 'activity'
  | 'client_access'
  | 'archive'
  | 'admin_dashboard'
  | 'employee_tracking'

export const CAMPAIGN_PERMISSIONS: Record<CampaignRole, CampaignFeature[]> = {
  brand_solutions: [
    'overview', 'brief', 'shortlist', 'creators', 'negotiate', 'onboard',
    'content', 'tracking', 'report', 'settings', 'members', 'escalations',
    'internal_cost', 'margin', 'export', 'notifications', 'activity',
    'client_access', 'archive', 'admin_dashboard', 'employee_tracking',
  ],
  campaign_manager: [
    'overview', 'brief', 'shortlist', 'creators', 'negotiate', 'onboard',
    'content', 'tracking', 'report', 'settings', 'members', 'escalations',
    'internal_cost', 'margin', 'export', 'notifications', 'activity',
    'client_access', 'archive', 'admin_dashboard', 'employee_tracking',
  ],
  ir_manager: [
    'overview', 'brief', 'shortlist', 'creators', 'negotiate', 'onboard',
    'content', 'tracking', 'report', 'escalations', 'internal_cost',
    'export', 'notifications', 'activity',
  ],
  ir_executive: [
    'overview', 'shortlist', 'creators', 'content', 'tracking',
    'report', 'notifications', 'activity',
  ],
  client: [
    'shortlist', 'content', 'report', 'notifications',
  ],
}

/** Features that require seeing internal cost/margin */
const COST_FEATURES: CampaignFeature[] = ['internal_cost', 'margin']

/** Check if a role can access a feature */
export function canAccessCampaign(
  role: CampaignRole | null | undefined,
  feature: CampaignFeature
): boolean {
  if (!role) return false
  return CAMPAIGN_PERMISSIONS[role]?.includes(feature) ?? false
}

/** Check if a role can see internal cost fields */
export function canSeeInternalCost(role: CampaignRole | null | undefined): boolean {
  if (!role) return false
  return COST_FEATURES.some(f => CAMPAIGN_PERMISSIONS[role]?.includes(f))
}

/** Check if a role can edit cost/commercials */
export function canEditCost(role: CampaignRole | null | undefined): boolean {
  if (!role) return false
  return role === 'brand_solutions' || role === 'campaign_manager' || role === 'ir_manager'
}

/** Check if a role can approve commercial edits (2-person approval) */
export function canApproveCostEdits(role: CampaignRole | null | undefined): boolean {
  if (!role) return false
  return role === 'brand_solutions' || role === 'campaign_manager'
}

/** Check if a role can edit shortlist and status */
export function canEditShortlist(role: CampaignRole | null | undefined): boolean {
  if (!role) return false
  return role !== 'client'
}

/** Check if a role is internal (not client) */
export function isInternalRole(role: CampaignRole | null | undefined): boolean {
  if (!role) return false
  return role !== 'client'
}

/** Get visible nav items filtered by role */
export function getVisibleCampaignNav(
  items: { href: string; label: string; feature: CampaignFeature; dot: string }[],
  role: CampaignRole | null | undefined
) {
  return items.filter(item => canAccessCampaign(role, item.feature))
}

/** Map role to display info */
export const ROLE_INFO: Record<CampaignRole, { label: string; color: string; bg: string }> = {
  brand_solutions:  { label: 'Brand Solutions', color: '#00C853', bg: 'rgba(0,200,83,0.1)' },
  campaign_manager: { label: 'Campaign Manager', color: '#1A73E8', bg: 'rgba(26,115,232,0.1)' },
  ir_manager:       { label: 'IR Manager', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  ir_executive:     { label: 'IR Executive', color: '#FF6D00', bg: 'rgba(255,109,0,0.1)' },
  client:           { label: 'Client', color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
}
