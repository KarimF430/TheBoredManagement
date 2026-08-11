/**
 * Campaign Panel — Global State Store
 * Zustand with optimistic updates, undo/redo, and entity management
 */
import { create } from 'zustand'

// ── Types ──────────────────────────────────────────────────────────

export interface Campaign {
  id: string
  name: string
  brand: string
  campaign_type: string
  objective: string
  platform_mix: string[]
  deliverable_types: string[]
  budget: number
  start_date: string
  go_live_date: string
  status: string
  brief_mandatories: string
  sla_client_feedback_hours: number
  sla_script_days: number
  sla_content_days: number
  sla_onboard_to_live_days: number
  created_at: string
  updated_at: string
}

export interface Creator {
  id: string
  campaign_id: string
  channel_name: string
  channel_url: string
  platform: string
  subscribers: number
  avg_views: number
  engagement_rate: number
  internal_cost: number
  quoted_cost: number
  status: string
  onboarded_at: string | null
  go_live_deadline: string | null
  auto_metrics: Record<string, unknown>
  created_at: string
}

export interface Deliverable {
  id: string
  creator_id: string
  campaign_id: string
  platform: string
  status: string
  live_link: string | null
  views: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number
  script_current_version: number
  product_shipped_at: string | null
  product_delivered_at: string | null
  shoot_scheduled_at: string | null
  shoot_completed_at: string | null
  tracking_started_at: string | null
  created_at: string
  creator?: { channel_name: string; platform: string } | null
}

export interface TeamMember {
  id: string
  user_id: string
  campaign_id: string
  role: string
  assigned_sections: string[]
  user: { id: string; name: string; email: string; role: string } | null
}

export interface TrackedLink {
  id: string
  campaign_id: string
  creator_id: string
  deliverable_id: string | null
  original_url: string
  short_url: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  clicks: number
  conversions: number
  created_at: string
}

export interface ProductShipment {
  id: string
  deliverable_id: string
  campaign_id: string
  product_name: string
  tracking_number: string | null
  carrier: string | null
  status: 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'returned'
  shipped_at: string | null
  delivered_at: string | null
  estimated_delivery: string | null
  created_at: string
}

interface UndoAction {
  id: string
  entity: string
  entityId: string
  field: string
  oldValue: unknown
  newValue: unknown
  timestamp: number
}

// ── Store ──────────────────────────────────────────────────────────

interface CampaignStore {
  // Data
  campaigns: Campaign[]
  creators: Creator[]
  deliverables: Deliverable[]
  teamMembers: TeamMember[]
  trackedLinks: TrackedLink[]
  shipments: ProductShipment[]

  // UI State
  selectedCampaignId: string | null
  loading: Record<string, boolean>
  errors: Record<string, string | null>

  // Undo
  undoStack: UndoAction[]
  redoStack: UndoAction[]

  // Actions
  setSelectedCampaign: (id: string | null) => void

  // Campaign CRUD
  setCampaigns: (campaigns: Campaign[]) => void
  addCampaign: (campaign: Campaign) => void
  updateCampaign: (id: string, updates: Partial<Campaign>) => void
  removeCampaign: (id: string) => void

  // Creator CRUD
  setCreators: (creators: Creator[]) => void
  addCreator: (creator: Creator) => void
  updateCreator: (id: string, updates: Partial<Creator>) => void
  removeCreator: (id: string) => void

  // Deliverable CRUD
  setDeliverables: (deliverables: Deliverable[]) => void
  addDeliverable: (deliverable: Deliverable) => void
  updateDeliverable: (id: string, updates: Partial<Deliverable>) => void
  removeDeliverable: (id: string) => void

  // Team
  setTeamMembers: (members: TeamMember[]) => void
  addTeamMember: (member: TeamMember) => void
  removeTeamMember: (id: string) => void

  // Links
  setTrackedLinks: (links: TrackedLink[]) => void
  addTrackedLink: (link: TrackedLink) => void
  updateTrackedLink: (id: string, updates: Partial<TrackedLink>) => void

  // Shipments
  setShipments: (shipments: ProductShipment[]) => void
  addShipment: (shipment: ProductShipment) => void
  updateShipment: (id: string, updates: Partial<ProductShipment>) => void

  // Undo/Redo
  pushUndo: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void
  undo: () => void
  redo: () => void
  clearUndo: () => void

  // Loading
  setLoading: (key: string, loading: boolean) => void
  setError: (key: string, error: string | null) => void

  // Sync helpers
  optimisticUpdate: <T extends { id: string }>(
    entity: string,
    id: string,
    updates: Partial<T>,
    revertFn: () => void
  ) => Promise<void>
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  // Initial state
  campaigns: [],
  creators: [],
  deliverables: [],
  teamMembers: [],
  trackedLinks: [],
  shipments: [],
  selectedCampaignId: null,
  loading: {},
  errors: {},
  undoStack: [],
  redoStack: [],

  setSelectedCampaign: (id) => set({ selectedCampaignId: id }),

  // Campaign CRUD
  setCampaigns: (campaigns) => set({ campaigns }),
  addCampaign: (campaign) => set(s => ({ campaigns: [campaign, ...s.campaigns] })),
  updateCampaign: (id, updates) => set(s => ({
    campaigns: s.campaigns.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  removeCampaign: (id) => set(s => ({
    campaigns: s.campaigns.filter(c => c.id !== id)
  })),

  // Creator CRUD
  setCreators: (creators) => set({ creators }),
  addCreator: (creator) => set(s => ({ creators: [...s.creators, creator] })),
  updateCreator: (id, updates) => set(s => ({
    creators: s.creators.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  removeCreator: (id) => set(s => ({
    creators: s.creators.filter(c => c.id !== id)
  })),

  // Deliverable CRUD
  setDeliverables: (deliverables) => set({ deliverables }),
  addDeliverable: (deliverable) => set(s => ({
    deliverables: [...s.deliverables, deliverable]
  })),
  updateDeliverable: (id, updates) => set(s => ({
    deliverables: s.deliverables.map(d => d.id === id ? { ...d, ...updates } : d)
  })),
  removeDeliverable: (id) => set(s => ({
    deliverables: s.deliverables.filter(d => d.id !== id)
  })),

  // Team
  setTeamMembers: (members) => set({ teamMembers: members }),
  addTeamMember: (member) => set(s => ({
    teamMembers: [...s.teamMembers, member]
  })),
  removeTeamMember: (id) => set(s => ({
    teamMembers: s.teamMembers.filter(m => m.id !== id)
  })),

  // Links
  setTrackedLinks: (links) => set({ trackedLinks: links }),
  addTrackedLink: (link) => set(s => ({
    trackedLinks: [...s.trackedLinks, link]
  })),
  updateTrackedLink: (id, updates) => set(s => ({
    trackedLinks: s.trackedLinks.map(l => l.id === id ? { ...l, ...updates } : l)
  })),

  // Shipments
  setShipments: (shipments) => set({ shipments }),
  addShipment: (shipment) => set(s => ({
    shipments: [...s.shipments, shipment]
  })),
  updateShipment: (id, updates) => set(s => ({
    shipments: s.shipments.map(sh => sh.id === id ? { ...sh, ...updates } : sh)
  })),

  // Undo/Redo
  pushUndo: (action) => set(s => ({
    undoStack: [...s.undoStack, { ...action, id: crypto.randomUUID(), timestamp: Date.now() }],
    redoStack: []
  })),

  undo: () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return

    const lastAction = undoStack[undoStack.length - 1]
    set(s => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, lastAction]
    }))

    // Apply revert based on entity type
    const { entity, entityId, field, oldValue } = lastAction
    if (entity === 'campaign') {
      get().updateCampaign(entityId, { [field]: oldValue })
    } else if (entity === 'creator') {
      get().updateCreator(entityId, { [field]: oldValue })
    } else if (entity === 'deliverable') {
      get().updateDeliverable(entityId, { [field]: oldValue })
    }
  },

  redo: () => {
    const { redoStack } = get()
    if (redoStack.length === 0) return

    const action = redoStack[redoStack.length - 1]
    set(s => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, action]
    }))

    const { entity, entityId, field, newValue } = action
    if (entity === 'campaign') {
      get().updateCampaign(entityId, { [field]: newValue })
    } else if (entity === 'creator') {
      get().updateCreator(entityId, { [field]: newValue })
    } else if (entity === 'deliverable') {
      get().updateDeliverable(entityId, { [field]: newValue })
    }
  },

  clearUndo: () => set({ undoStack: [], redoStack: [] }),

  setLoading: (key, loading) => set(s => ({
    loading: { ...s.loading, [key]: loading }
  })),

  setError: (key, error) => set(s => ({
    errors: { ...s.errors, [key]: error }
  })),

  // Optimistic update helper
  optimisticUpdate: async (entity, id, updates, revertFn) => {
    // Get old value for undo
    let oldValue: unknown
    if (entity === 'campaign') {
      const item = get().campaigns.find(c => c.id === id)
      oldValue = item ? { ...item } : null
    } else if (entity === 'creator') {
      const item = get().creators.find(c => c.id === id)
      oldValue = item ? { ...item } : null
    } else if (entity === 'deliverable') {
      const item = get().deliverables.find(d => d.id === id)
      oldValue = item ? { ...item } : null
    }

    // Apply optimistic update immediately
    if (entity === 'campaign') {
      get().updateCampaign(id, updates)
    } else if (entity === 'creator') {
      get().updateCreator(id, updates)
    } else if (entity === 'deliverable') {
      get().updateDeliverable(id, updates)
    }

    // Push undo
    const field = Object.keys(updates)[0]
    get().pushUndo({
      entity,
      entityId: id,
      field,
      oldValue: oldValue ? (oldValue as Record<string, unknown>)[field] : null,
      newValue: updates[field as keyof typeof updates],
    })
  },
}))
