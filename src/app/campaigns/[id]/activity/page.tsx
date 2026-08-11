'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Activity as ActivityIcon } from 'lucide-react'
import Link from 'next/link'

interface ActivityItem {
  id: string
  actor_name: string
  actor_role: string
  action_type: string
  entity_type: string
  entity_name: string
  details: Record<string, unknown>
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  status_changed: 'changed status',
  remarked: 'added a remark',
  approved: 'approved',
  rejected: 'rejected',
  shortlisted: 'shortlisted',
  onboarded: 'onboarded',
  negotiated: 'negotiated',
  cost_returned: 'returned cost',
  invited: 'invited',
  live_link_added: 'added live link',
  script_submitted: 'submitted script',
  content_submitted: 'submitted content',
}

const ROLE_COLORS: Record<string, string> = {
  brand_solutions: 'var(--green)',
  campaign_manager: 'var(--blue)',
  ir_manager: 'var(--purple)',
  ir_executive: 'var(--orange)',
  client: '#64748B',
  system: '#94A3B8',
}

const ROLE_LABELS: Record<string, string> = {
  brand_solutions: 'BS',
  campaign_manager: 'CM',
  ir_manager: 'IRM',
  ir_executive: 'IRE',
  client: 'Client',
  system: 'SYS',
}

export default function ActivityPage() {
  const params = useParams()
  const campaignId = params.id as string

  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}/activity`)
      .then(r => r.json())
      .then(d => {
        if (d.activities) setActivities(d.activities)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [campaignId])

  const filtered = filter === 'all'
    ? activities
    : activities.filter(a => a.action_type === filter)

  const groupedByDate = filtered.reduce((acc, item) => {
    const date = new Date(item.created_at).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {} as Record<string, ActivityItem[]>)

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div className="anim-fade-up" style={{ maxWidth: 750, margin: '0 auto' }}>
      <Link
        href={`/campaigns/${campaignId}`}
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
      </Link>

      <div className="page-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 20 }}>
        <div>
          <h1 className="page-title">
            Campaign <span className="text-gradient-blue">Activity Feed</span>
          </h1>
          <p className="page-subtitle">Full audit trail and version history of the campaign</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', background: 'var(--bg-elevated)', padding: 4, borderRadius: 10, border: '1.5px solid var(--border-1)', width: 'fit-content' }}>
        {['all', 'created', 'status_changed', 'remarked', 'approved', 'rejected'].map(f => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
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
              {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: 16, display: 'flex', gap: 14 }}>
              <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                <div className="skeleton" style={{ width: '50%', height: 12 }} />
                <div className="skeleton" style={{ width: '75%', height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <ActivityIcon size={32} style={{ color: 'var(--blue)', opacity: 0.4, marginBottom: 8 }} />
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 600 }}>No activities found matching this filter.</p>
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date} style={{ marginBottom: 24, animation: 'fadeIn 0.3s ease' }}>
            <div style={{
              fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.6px',
              paddingBottom: 8, marginBottom: 12,
              borderBottom: '1px dashed var(--border-2)',
            }}>
              {date}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(item => {
                const roleColor = ROLE_COLORS[item.actor_role] || '#94A3B8'
                const roleLabel = ROLE_LABELS[item.actor_role] || 'SYS'
                return (
                  <div
                    key={item.id}
                    className="card-interactive"
                    style={{
                      display: 'flex', gap: 14, padding: '14px 18px',
                      alignItems: 'center', cursor: 'default'
                    }}
                  >
                    {/* Role circle badge */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `${roleColor}10`,
                      border: `1.5px solid ${roleColor}25`,
                      color: roleColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10.5, fontWeight: 800, flexShrink: 0
                    }} title={item.actor_role.replace(/_/g, ' ')}>
                      {roleLabel}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{item.actor_name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {' '}{ACTION_LABELS[item.action_type] || item.action_type}{' '}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{item.entity_name}</span>
                      </div>
                      {item.details && Object.keys(item.details).length > 0 && (
                        <div style={{
                          fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4,
                          fontWeight: 500, background: 'var(--bg-elevated)',
                          padding: '4px 10px', borderRadius: 6, width: 'fit-content'
                        }}>
                          {item.details.from !== undefined && item.details.to !== undefined
                            ? <span style={{ textTransform: 'capitalize' }}>{String(item.details.from)} → {String(item.details.to)}</span>
                            : Object.entries(item.details).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`).join(', ')
                          }
                        </div>
                      )}
                    </div>

                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
