'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useCampaignStore } from '@/lib/store'

/**
 * Syncs campaign data from API into Zustand store.
 * Call once at page level; all children read from store.
 */
export function useCampaignData(campaignId?: string) {
  const store = useCampaignStore()
  const loadedRef = useRef(false)

  const loadCampaigns = useCallback(async () => {
    store.setLoading('campaigns', true)
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      if (data.campaigns) store.setCampaigns(data.campaigns)
      if (data.error) store.setError('campaigns', data.error)
    } catch {
      store.setError('campaigns', 'Failed to load campaigns')
    } finally {
      store.setLoading('campaigns', false)
    }
  }, [])

  const loadCampaignDetail = useCallback(async (id: string) => {
    store.setLoading('campaignDetail', true)
    try {
      const [campRes, creatorsRes, delRes] = await Promise.all([
        fetch(`/api/campaigns/${id}`),
        fetch(`/api/campaigns/${id}/creators`),
        fetch(`/api/campaigns/${id}/deliverables`),
      ])
      const campData = await campRes.json()
      const creatorsData = await creatorsRes.json()
      const delData = await delRes.json()

      if (campData.campaign) {
        const existing = store.campaigns.find(c => c.id === id)
        if (existing) {
          store.updateCampaign(id, campData.campaign)
        } else {
          store.addCampaign(campData.campaign)
        }
      }
      if (creatorsData.creators) store.setCreators(creatorsData.creators)
      if (delData.deliverables) store.setDeliverables(delData.deliverables)
    } catch {
      store.setError('campaignDetail', 'Failed to load campaign')
    } finally {
      store.setLoading('campaignDetail', false)
    }
  }, [])

  const loadDeliverables = useCallback(async (id: string) => {
    store.setLoading('deliverables', true)
    try {
      const res = await fetch(`/api/campaigns/${id}/deliverables`)
      const data = await res.json()
      if (data.deliverables) store.setDeliverables(data.deliverables)
    } catch {
      store.setError('deliverables', 'Failed to load deliverables')
    } finally {
      store.setLoading('deliverables', false)
    }
  }, [])

  const loadCreators = useCallback(async (id: string) => {
    store.setLoading('creators', true)
    try {
      const res = await fetch(`/api/campaigns/${id}/creators`)
      const data = await res.json()
      if (data.creators) store.setCreators(data.creators)
    } catch {
      store.setError('creators', 'Failed to load creators')
    } finally {
      store.setLoading('creators', false)
    }
  }, [])

  // Auto-load on mount
  useEffect(() => {
    if (campaignId) {
      loadCampaignDetail(campaignId)
    } else if (!loadedRef.current) {
      loadedRef.current = true
      loadCampaigns()
    }
  }, [campaignId, loadCampaignDetail, loadCampaigns])

  return {
    loadCampaigns,
    loadCampaignDetail,
    loadDeliverables,
    loadCreators,
  }
}

/**
 * Optimistic update helper: updates store immediately, reverts on API failure.
 */
export function useOptimisticUpdate() {
  const store = useCampaignStore()

  const update = useCallback(async (
    entity: 'campaign' | 'creator' | 'deliverable',
    id: string,
    updates: Record<string, unknown>,
    apiCall: () => Promise<Response>
  ) => {
    // Save old values for revert
    let oldValues: Record<string, unknown> = {}
    if (entity === 'campaign') {
      const item = store.campaigns.find(c => c.id === id)
      if (item) oldValues = { ...item }
    } else if (entity === 'creator') {
      const item = store.creators.find(c => c.id === id)
      if (item) oldValues = { ...item }
    } else if (entity === 'deliverable') {
      const item = store.deliverables.find(d => d.id === id)
      if (item) oldValues = { ...item }
    }

    // Apply optimistic update
    if (entity === 'campaign') store.updateCampaign(id, updates)
    else if (entity === 'creator') store.updateCreator(id, updates)
    else if (entity === 'deliverable') store.updateDeliverable(id, updates)

    // Push undo
    const field = Object.keys(updates)[0]
    store.pushUndo({
      entity,
      entityId: id,
      field,
      oldValue: oldValues[field],
      newValue: updates[field],
    })

    try {
      const res = await apiCall()
      if (!res.ok) throw new Error('API failed')
      return true
    } catch {
      // Revert
      if (entity === 'campaign') store.updateCampaign(id, oldValues)
      else if (entity === 'creator') store.updateCreator(id, oldValues)
      else if (entity === 'deliverable') store.updateDeliverable(id, oldValues)
      return false
    }
  }, [store])

  return { update }
}
