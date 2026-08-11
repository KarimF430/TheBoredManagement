'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Bell, Check, CheckCheck } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  your_turn: 'var(--red)',
  digest: 'var(--blue)',
  escalation: 'var(--red)',
  deadline: 'var(--orange)',
}

const TYPE_GLOWS: Record<string, string> = {
  your_turn: '0 0 8px rgba(255,45,85,0.4)',
  digest: '0 0 8px rgba(26,115,232,0.4)',
  escalation: '0 0 8px rgba(255,45,85,0.4)',
  deadline: '0 0 8px rgba(255,109,0,0.4)',
}

export default function NotificationsPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}/notifications`)
      .then(r => r.json())
      .then(d => {
        if (d.notifications) setNotifications(d.notifications)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [campaignId])

  const markAsRead = async (id: string) => {
    await fetch(`/api/campaigns/${campaignId}/notifications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_read: true }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    await fetch(`/api/campaigns/${campaignId}/notifications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  const unreadCount = notifications.filter(n => !n.is_read).length

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="anim-fade-up" style={{ maxWidth: 650, margin: '0 auto' }}>
      <button
        onClick={() => router.push(`/campaigns/${campaignId}`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
          marginBottom: 16, textDecoration: 'none', transition: 'color 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-bright)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <ArrowLeft size={14} />
        Back to overview
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">
            Team <span className="text-gradient-blue">Alerts</span>
          </h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread action items pending` : 'All alerts and digests caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="btn btn-ghost"
            style={{ padding: '6px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--bg-elevated)', padding: 4, borderRadius: 10, border: '1.5px solid var(--border-1)', width: 'fit-content' }}>
        {[
          { id: 'all', label: 'All Alerts' },
          { id: 'unread', label: `Unread (${unreadCount})` }
        ].map(f => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: active ? '#FFFFFF' : 'transparent',
                color: active ? 'var(--blue)' : 'var(--text-muted)',
                fontSize: 11.5,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                boxShadow: active ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: 16, display: 'flex', gap: 14 }}>
              <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 6 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ width: '40%', height: 12 }} />
                <div className="skeleton" style={{ width: '70%', height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Bell size={32} style={{ color: 'var(--blue)', opacity: 0.4, marginBottom: 8 }} />
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 600 }}>
            {filter === 'unread' ? 'You are all caught up!' : 'No alerts logged yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(notif => {
            const isUnread = !notif.is_read
            const priorityColor = TYPE_COLORS[notif.type] || 'var(--blue)'
            const priorityGlow = TYPE_GLOWS[notif.type] || 'none'
            return (
              <div
                key={notif.id}
                onClick={() => isUnread && markAsRead(notif.id)}
                className="card-interactive"
                style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: '14px 18px',
                  background: isUnread ? 'rgba(26,115,232,0.03)' : 'var(--bg-card)',
                  borderColor: isUnread ? 'rgba(26,115,232,0.15)' : 'var(--border-1)',
                  cursor: isUnread ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Priority Glow Indicator */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: priorityColor,
                  boxShadow: priorityGlow,
                  marginTop: 6, flexShrink: 0,
                  opacity: isUnread ? 1 : 0.4
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: isUnread ? 700 : 500,
                    color: isUnread ? 'var(--text-bright)' : 'var(--text-primary)',
                    lineHeight: 1.4
                  }}>
                    {notif.title}
                  </div>
                  {notif.body && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500, lineHeight: 1.4 }}>
                      {notif.body}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {timeAgo(notif.created_at)}
                  </span>
                  {isUnread && (
                    <Check size={14} style={{ color: 'var(--blue)' }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
