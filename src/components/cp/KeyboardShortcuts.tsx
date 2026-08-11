'use client'

import { useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCampaignStore } from '@/lib/store'

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  description: string
  action: () => void
}

export default function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const { undo, redo, undoStack, redoStack } = useCampaignStore()

  const campaignMatch = pathname.match(/\/campaigns\/([a-f0-9-]+)/)
  const campaignId = campaignMatch?.[1] || null

  const shortcuts: ShortcutConfig[] = [
    // Global
    { key: 'c', meta: true, description: 'All Campaigns', action: () => router.push('/campaigns') },
    { key: 'n', meta: true, description: 'New Campaign', action: () => router.push('/campaigns/new') },
    { key: 'z', meta: true, description: 'Undo', action: () => { if (undoStack.length > 0) undo() } },
    { key: 'z', meta: true, shift: true, description: 'Redo', action: () => { if (redoStack.length > 0) redo() } },
    { key: 'y', meta: true, description: 'Redo', action: () => { if (redoStack.length > 0) redo() } },

    // Campaign-scoped
    ...(campaignId ? [
      { key: 'g', meta: true, description: 'Overview', action: () => router.push(`/campaigns/${campaignId}`) },
      { key: 'b', meta: true, description: 'Brief', action: () => router.push(`/campaigns/${campaignId}/brief`) },
      { key: 's', meta: true, description: 'Shortlist', action: () => router.push(`/campaigns/${campaignId}/shortlist`) },
      { key: 'p', meta: true, description: 'Content Pipeline', action: () => router.push(`/campaigns/${campaignId}/content`) },
      { key: 't', meta: true, description: 'Tracking', action: () => router.push(`/campaigns/${campaignId}/tracking`) },
      { key: 'r', meta: true, description: 'Report', action: () => router.push(`/campaigns/${campaignId}/report`) },
    ] : []),
  ]

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : true
      const shiftMatch = shortcut.shift ? e.shiftKey : true
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

      if (ctrlMatch && shiftMatch && keyMatch) {
        e.preventDefault()
        shortcut.action()
        return
      }
    }
  }, [shortcuts, undo, redo, undoStack, redoStack])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return null
}
