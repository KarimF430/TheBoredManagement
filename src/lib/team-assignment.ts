/**
 * Team Assignment System
 * Tracks who works on what campaign and which sections
 */

export type TeamRole = 'brand_solutions' | 'campaign_manager' | 'ir_manager' | 'ir_executive' | 'viewer'

export type CampaignSection =
  | 'brief'
  | 'shortlist'
  | 'negotiation'
  | 'onboarding'
  | 'content'
  | 'tracking'
  | 'reporting'
  | 'client_comms'

export interface TeamAssignment {
  id: string
  userId: string
  campaignId: string
  role: TeamRole
  assignedSections: CampaignSection[]
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
}

export interface SectionOwnership {
  section: CampaignSection
  label: string
  owner: TeamAssignment | null
  collaborators: TeamAssignment[]
  status: 'idle' | 'in_progress' | 'blocked'
  lastActivity: string | null
}

const SECTION_META: Record<CampaignSection, { label: string; icon: string; color: string }> = {
  brief: { label: 'Brief', icon: 'FileText', color: '#7C3AED' },
  shortlist: { label: 'Shortlist', icon: 'Users', color: '#FF6D00' },
  negotiation: { label: 'Negotiation', icon: 'IndianRupee', color: '#1A73E8' },
  onboarding: { label: 'Onboarding', icon: 'UserPlus', color: '#00C853' },
  content: { label: 'Content', icon: 'Package', color: '#00C853' },
  tracking: { label: 'Tracking', icon: 'Radio', color: '#1A73E8' },
  reporting: { label: 'Reporting', icon: 'BarChart3', color: '#7C3AED' },
  client_comms: { label: 'Client Comms', icon: 'Mail', color: '#FF6D00' },
}

/**
 * Build section ownership map from team assignments
 */
export function buildSectionOwnership(
  assignments: TeamAssignment[],
  activities: Array<{ action_type: string; entity_type: string; created_at: string }>
): SectionOwnership[] {
  const sections = Object.keys(SECTION_META) as CampaignSection[]

  return sections.map(section => {
    const sectionAssignments = assignments.filter(a =>
      a.assignedSections.includes(section)
    )

    // Find owner (highest role in section)
    const rolePriority: Record<TeamRole, number> = {
      brand_solutions: 5,
      campaign_manager: 4,
      ir_manager: 3,
      ir_executive: 2,
      viewer: 1,
    }

    const owner = sectionAssignments.sort((a, b) =>
      rolePriority[b.role] - rolePriority[a.role]
    )[0] || null

    const collaborators = sectionAssignments.filter(a => a.id !== owner?.id)

    // Determine status based on recent activity
    const sectionActivities = activities.filter(a => {
      const sectionMap: Record<string, CampaignSection> = {
        campaign: 'brief',
        creator: 'shortlist',
        deliverable: 'content',
        script: 'content',
      }
      return sectionMap[a.entity_type] === section
    })

    const lastActivity = sectionActivities[0]?.created_at || null
    const status = !lastActivity ? 'idle' : 'in_progress'

    return {
      section,
      label: SECTION_META[section].label,
      owner,
      collaborators,
      status,
      lastActivity,
    }
  })
}

/**
 * Get role label
 */
export function getRoleLabel(role: TeamRole): string {
  const labels: Record<TeamRole, string> = {
    brand_solutions: 'Brand Solutions',
    campaign_manager: 'Campaign Manager',
    ir_manager: 'IR Manager',
    ir_executive: 'IR Executive',
    viewer: 'Viewer',
  }
  return labels[role] || role
}

/**
 * Get section permissions based on role
 */
export function getSectionPermissions(role: TeamRole): Record<CampaignSection, 'edit' | 'view' | 'none'> {
  const base: Record<CampaignSection, 'edit' | 'view' | 'none'> = {
    brief: 'view',
    shortlist: 'view',
    negotiation: 'view',
    onboarding: 'view',
    content: 'view',
    tracking: 'view',
    reporting: 'view',
    client_comms: 'view',
  }

  switch (role) {
    case 'brand_solutions':
    case 'campaign_manager':
      return Object.fromEntries(Object.keys(base).map(k => [k, 'edit'])) as Record<CampaignSection, 'edit' | 'view' | 'none'>
    case 'ir_manager':
      return { ...base, shortlist: 'edit', negotiation: 'edit', onboarding: 'edit', content: 'edit', tracking: 'edit' }
    case 'ir_executive':
      return { ...base, shortlist: 'edit', content: 'edit', tracking: 'edit' }
    case 'viewer':
      return base
    default:
      return base
  }
}

export { SECTION_META }
