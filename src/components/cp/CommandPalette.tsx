'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Search, FileText, Users, Package, Radio, BarChart3,
  Settings, Bell, LayoutDashboard, Plus, FolderOpen,
  Activity, ArrowRight, Hash, Command
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  section: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const campaignMatch = pathname.match(/\/campaigns\/([a-f0-9-]+)/)
  const campaignId = campaignMatch?.[1] || null
  const cid = campaignId || ''

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-campaigns', label: 'All Campaigns', description: 'View all campaigns', icon: <FolderOpen size={16} />, action: () => router.push('/campaigns'), section: 'Navigation', shortcut: 'G C' },
    { id: 'nav-new', label: 'New Campaign', description: 'Create a new campaign', icon: <Plus size={16} />, action: () => router.push('/campaigns/new'), section: 'Navigation', shortcut: 'N' },
    ...(campaignId ? [
      { id: 'nav-overview', label: 'Campaign Overview', description: 'View campaign KPIs and status', icon: <LayoutDashboard size={16} />, action: () => router.push(`/campaigns/${cid}`), section: 'Navigation', shortcut: 'G O' },
      { id: 'nav-brief', label: 'Brief', description: 'Edit campaign brief', icon: <FileText size={16} />, action: () => router.push(`/campaigns/${cid}/brief`), section: 'Navigation', shortcut: 'G B' },
      { id: 'nav-shortlist', label: 'Creator Shortlist', description: 'Manage creators', icon: <Users size={16} />, action: () => router.push(`/campaigns/${cid}/shortlist`), section: 'Navigation', shortcut: 'G S' },
      { id: 'nav-content', label: 'Content Pipeline', description: 'Kanban board', icon: <Package size={16} />, action: () => router.push(`/campaigns/${cid}/content`), section: 'Navigation', shortcut: 'G P' },
      { id: 'nav-tracking', label: 'Live Tracking', description: 'View metrics', icon: <Radio size={16} />, action: () => router.push(`/campaigns/${cid}/tracking`), section: 'Navigation', shortcut: 'G T' },
      { id: 'nav-report', label: 'Report', description: 'Campaign analytics', icon: <BarChart3 size={16} />, action: () => router.push(`/campaigns/${cid}/report`), section: 'Navigation', shortcut: 'G R' },
      { id: 'nav-activity', label: 'Activity Feed', description: 'View audit trail', icon: <Activity size={16} />, action: () => router.push(`/campaigns/${cid}/activity`), section: 'Navigation' },
      { id: 'nav-notifications', label: 'Notifications', description: 'View alerts', icon: <Bell size={16} />, action: () => router.push(`/campaigns/${cid}/notifications`), section: 'Navigation' },
      { id: 'nav-settings', label: 'Settings', description: 'Campaign settings', icon: <Settings size={16} />, action: () => router.push(`/campaigns/${cid}/settings`), section: 'Navigation' },
    ] : []),
    // Actions
    { id: 'action-new-campaign', label: 'Create Campaign', description: 'Start a new campaign', icon: <Plus size={16} />, action: () => router.push('/campaigns/new'), section: 'Actions' },
    ...(campaignId ? [
      { id: 'action-add-creator', label: 'Add Creator to Shortlist', description: 'Add a new creator', icon: <Users size={16} />, action: () => router.push(`/campaigns/${cid}/shortlist`), section: 'Actions' },
      { id: 'action-edit-brief', label: 'Edit Brief', description: 'Update campaign brief', icon: <FileText size={16} />, action: () => router.push(`/campaigns/${cid}/brief`), section: 'Actions' },
    ] : []),
  ]

  const filtered = query
    ? commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  const sections = [...new Set(filtered.map(c => c.section))]
  const flatList = filtered

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, flatList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatList[selectedIndex]) {
        flatList[selectedIndex].action()
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [flatList, selectedIndex, onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) onClose()
        else if (!open) {
          // Parent should handle opening
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  let itemIndex = -1

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, maxWidth: '90vw', maxHeight: '70vh',
          background: '#FFF', borderRadius: 16,
          border: '1.5px solid var(--border-2)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
          overflow: 'hidden',
        }}
      >
        {/* Search Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-1)',
        }}>
          <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, fontWeight: 500, color: 'var(--text-bright)',
              fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            padding: '2px 6px', borderRadius: 5,
            background: 'var(--bg-elevated)', fontSize: 11, fontWeight: 600,
            color: 'var(--text-muted)', border: '1px solid var(--border-1)',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {flatList.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
          {sections.map(section => (
            <div key={section}>
              <div style={{
                padding: '8px 12px 4px', fontSize: 10, fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>{section}</div>
              {filtered.filter(c => c.section === section).map(cmd => {
                itemIndex++
                const idx = itemIndex
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={cmd.id}
                    onClick={() => { cmd.action(); onClose() }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: isSelected ? 'var(--blue-dim)' : 'transparent',
                      transition: 'background 0.1s',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: isSelected ? 'var(--blue-gradient)' : 'var(--bg-elevated)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isSelected ? '#FFF' : 'var(--text-secondary)',
                      flexShrink: 0,
                    }}>
                      {cmd.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)' }}>
                        {cmd.label}
                      </div>
                      {cmd.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                          {cmd.description}
                        </div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {cmd.shortcut.split(' ').map((k, i) => (
                          <kbd key={i} style={{
                            padding: '2px 6px', borderRadius: 4,
                            background: 'var(--bg-elevated)', fontSize: 10, fontWeight: 600,
                            color: 'var(--text-muted)', border: '1px solid var(--border-1)',
                          }}>{k}</kbd>
                        ))}
                      </div>
                    )}
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)', opacity: isSelected ? 1 : 0, flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px', borderTop: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', gap: 16,
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-1)', fontSize: 10, fontWeight: 600 }}>↑↓</kbd>
            Navigate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-1)', fontSize: 10, fontWeight: 600 }}>↵</kbd>
            Select
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-1)', fontSize: 10, fontWeight: 600 }}>ESC</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  )
}
