'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, Clock, AlertTriangle, Zap, FileText } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
  campaign_id: string | null
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  your_turn: Zap,
  deadline: Clock,
  escalation: AlertTriangle,
  digest: FileText,
}

const TYPE_COLORS: Record<string, string> = {
  your_turn: '#FF2D55',
  deadline: '#FF6D00',
  escalation: '#FF2D55',
  digest: '#1A73E8',
}

interface NotificationsDropdownProps {
  campaignId: string | null
  anchorRef?: React.RefObject<HTMLElement | null>
}

export default function NotificationsDropdown({ campaignId }: NotificationsDropdownProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    if (campaignId && open) {
      setLoading(true)
      fetch(`/api/campaigns/${campaignId}/notifications`)
        .then(r => r.json())
        .then(d => setNotifications(d.notifications || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [campaignId, open])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const markAsRead = async (id: string) => {
    if (!campaignId) return
    await fetch(`/api/campaigns/${campaignId}/notifications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_read: true }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    if (!campaignId) return
    await fetch(`/api/campaigns/${campaignId}/notifications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (!campaignId) return null

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          background: open ? 'var(--blue-dim)' : 'none',
          border: 'none',
          cursor: 'pointer',
          color: open ? 'var(--blue)' : 'var(--text-secondary)',
          padding: 7,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.15s',
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#FF2D55', color: '#FFF',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(255,45,85,0.4)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0,
          marginTop: 8, width: 380, maxHeight: 480,
          background: '#FFF', borderRadius: 14,
          border: '1.5px solid var(--border-2)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
          zIndex: 100, overflow: 'hidden',
          animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: 'var(--blue)',
                  fontFamily: 'inherit', padding: '4px 8px', borderRadius: 6,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', maxHeight: 380 }}>
            {loading && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Loading...
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No notifications yet
              </div>
            )}
            {notifications.slice(0, 10).map(n => {
              const Icon = TYPE_ICONS[n.type] || Bell
              const color = TYPE_COLORS[n.type] || '#1A73E8'
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id)
                    if (n.campaign_id) router.push(`/campaigns/${n.campaign_id}/notifications`)
                    setOpen(false)
                  }}
                  style={{
                    display: 'flex', gap: 12, padding: '12px 16px',
                    borderBottom: '1px solid var(--border-1)',
                    cursor: 'pointer',
                    background: n.is_read ? 'transparent' : 'rgba(26,115,232,0.02)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(26,115,232,0.02)'}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `${color}10`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color, flexShrink: 0,
                  }}>
                    <Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: n.is_read ? 500 : 700,
                      color: n.is_read ? 'var(--text-secondary)' : 'var(--text-bright)',
                      lineHeight: 1.3,
                    }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }}>
                        {n.body.length > 80 ? n.body.substring(0, 80) + '...' : n.body}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  {!n.is_read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: color, flexShrink: 0, marginTop: 4,
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div style={{
              padding: '10px 16px', borderTop: '1px solid var(--border-1)',
              textAlign: 'center',
            }}>
              <button
                onClick={() => {
                  router.push(`/campaigns/${campaignId}/notifications`)
                  setOpen(false)
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, color: 'var(--blue)',
                  fontFamily: 'inherit',
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
