'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCampaignStore } from '@/lib/store'
import { Play } from 'lucide-react'

const NAV = [
  {
    section: 'WORKSPACE',
    items: [
      { href: '/workspace', label: 'Project Hub', dot: 'blue' },
      { href: '/control', label: 'Campaign Control', dot: 'blue' },
    ]
  },
  {
    section: 'ANALYTICS',
    items: [
      { href: '/',              label: 'Overview',          dot: 'blue' },
      { href: '/leaderboard',   label: 'Top Videos',        dot: 'green' },
      { href: '/brand-growth',  label: 'Brand Growth',      dot: 'green' },
      { href: '/sov-trend',     label: 'SOV Trend',         dot: 'violet' },
      { href: '/keyword-sov',   label: 'Keyword SOV',       dot: 'orange' },
      { href: '/keywords',      label: 'Keywords',          dot: 'violet' },
      { href: '/brands',        label: 'All Brands',        dot: 'blue' },
      { href: '/dropped',       label: 'Dropped Rankings',  dot: 'red' },
      { href: '/multi-keyword', label: 'Multi-Keyword',     dot: 'violet' },
      { href: '/analytic-calendar', label: 'Calendar',      dot: 'blue' },
      { href: '/brands-products', label: 'Brands & Products', dot: 'orange' },
    ]
  },
  {
    section: 'SYSTEM',
    items: [
      { href: '/settings', label: 'Settings', dot: 'orange' },
    ]
  },
  {
    section: 'LEGAL',
    items: [
      { href: '/privacy-policy', label: 'Privacy Policy', dot: 'gray' },
    ]
  }
]

const DOT_COLORS: Record<string, { color: string; dim: string }> = {
  blue:   { color: '#1A73E8', dim: 'rgba(26,115,232,0.08)' },
  green:  { color: '#22C55E', dim: 'rgba(34,197,94,0.08)' },
  violet: { color: '#8B5CF6', dim: 'rgba(139,92,246,0.08)' },
  orange: { color: '#F59E0B', dim: 'rgba(245,158,11,0.08)' },
  red:    { color: '#EF4444', dim: 'rgba(239,68,68,0.08)' },
  gray:   { color: '#94A3B8', dim: 'rgba(148,163,184,0.12)' },
}

export default function Sidebar({ open = false, onNavigate }: { open?: boolean; onNavigate?: () => void } = {}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [quota, setQuota] = useState<{ used: number; total: number } | null>(null)
  const { campaigns, activeCampaignId, fetchCampaigns } = useCampaignStore()

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  useEffect(() => {
    fetch('/api/api-keys')
      .then(r => r.json())
      .then(d => {
        const s = d.stats
        if (s) setQuota({ used: s.total_used ?? 0, total: s.total_capacity ?? 1 })
      })
      .catch(() => {})
  }, [])

  const quotaPct = quota ? Math.min(100, Math.round((quota.used / quota.total) * 100)) : 62
  const quotaColor = quotaPct > 80 ? '#EF4444' : quotaPct > 60 ? '#F59E0B' : '#1A73E8'

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId)

  return (
    <aside
      id="primary-navigation"
      className="sidebar"
      data-collapsed={collapsed}
      data-open={open}
      aria-label="Primary"
    >

      {/* ── Active Project (Top) ── */}
      <div style={{
        padding: collapsed ? '14px 10px' : '10px 12px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
        minHeight: 52,
      }}>
        {collapsed ? (
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #F58220 0%, #FF9F43 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(245,130,32,0.25)',
          }}>
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="8" width="3" height="6" rx="1" fill="white" opacity="0.8"/>
              <rect x="6" y="4" width="3" height="10" rx="1" fill="white" opacity="0.9"/>
              <rect x="11" y="1" width="3" height="13" rx="1" fill="white"/>
            </svg>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            {activeCampaign ? (
              <div style={{
                padding: '8px 12px',
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'default',
              }}>
                <div className="t-micro" style={{ marginBottom: 2 }}>
                  Active Project
                </div>
                <div style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeCampaign.name}
                </div>
                {activeCampaign.category && (
                  <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeCampaign.category}{activeCampaign.sub_category ? ` › ${activeCampaign.sub_category}` : ''}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '8px 12px', fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-muted)' }}>
                No Active Project
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav data-tutorial="sidebar-nav" style={{
        flex: 1,
        padding: collapsed ? '8px 6px' : '6px 10px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {NAV.map(group => (
          <div key={group.section} style={{ marginBottom: 8 }}>
            {!collapsed && (
              <div className="nav-section">
                {group.section}
              </div>
            )}
            {group.items.map(item => {
              const active = pathname === item.href
              const dot = DOT_COLORS[item.dot] || DOT_COLORS.gray
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className="nav-item"
                  data-active={active}
                  data-collapsed={collapsed}
                  style={{ '--item-color': dot.color, '--item-color-dim': dot.dim } as React.CSSProperties}
                >
                  {active && !collapsed && <div className="nav-item__rail" />}

                  <div className="nav-item__dot" style={active ? { background: dot.color, boxShadow: `0 0 6px ${dot.color}60` } : undefined} />

                  {!collapsed && (
                    <span className="nav-item__label">
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── API Quota bar ── */}
      {!collapsed && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-light)',
          background: 'var(--bg-base)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', fontWeight: 600 }}>API Quota Used</span>
            <span className="mono" style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: quotaColor }}>{quotaPct}%</span>
          </div>
          <div className="sov-bar-track" style={{ background: 'var(--neutral-200)' }}>
            <div className="sov-bar-fill" style={{ width: `${quotaPct}%`, background: `linear-gradient(90deg, ${quotaColor}, ${quotaColor}88)` }} />
          </div>
          {quota && (
            <div className="mono" style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)', marginTop: 3 }}>
              {quota.used.toLocaleString()} / {quota.total.toLocaleString()} units
            </div>
          )}
        </div>
      )}

      {/* ── User Status & Logout ── */}
      {!collapsed && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-light)',
          background: 'var(--bg-base)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Admin Panel
            </div>
            <div className="t-micro">Logged in</div>
          </div>
          <button
            className="btn-danger btn-sm"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
          >
            Logout
          </button>
        </div>
      )}

      {/* ── Replay Tutorial ── */}
      {!collapsed && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => (window as any).__replayTutorial?.()}
          style={{ margin: '0 8px 4px', color: 'var(--text-secondary)' }}
        >
          <Play size={12} /> Replay Tutorial
        </button>
      )}

      {/* ── Collapse toggle ── */}
      <button
        className="sidebar-collapse-btn"
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {collapsed
            ? <path d="M5 3l4 4-4 4" />
            : <path d="M9 3L5 7l4 4" />
          }
        </svg>
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  )
}
