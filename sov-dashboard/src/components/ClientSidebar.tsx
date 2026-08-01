'use client'

import { LogOut, TrendingUp } from 'lucide-react'

export default function ClientSidebar({ brandName, campaignName }: { brandName: string; campaignName: string }) {
  return (
    <aside className="sidebar" aria-label="Client navigation">
      <div style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', gap: 10,
        minHeight: 64,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 7,
          background: 'var(--blue-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px var(--blue-glow)',
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="1" y="8" width="3" height="6" rx="1" fill="white" opacity="0.8"/>
            <rect x="6" y="4" width="3" height="10" rx="1" fill="white" opacity="0.9"/>
            <rect x="11" y="1" width="3" height="13" rx="1" fill="white"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            SOV Panel
          </div>
          <div className="t-micro" style={{ marginTop: 1 }}>
            Brand Dashboard
          </div>
        </div>
      </div>

      {/* Active Project & Brand */}
      <div style={{ margin: '14px 12px', padding: '10px 12px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-sm)' }}>
        <div className="t-micro" style={{ marginBottom: 2 }}>
          Project Campaign
        </div>
        <div style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {campaignName}
        </div>
        <div className="t-micro" style={{ marginTop: 8, marginBottom: 2 }}>
          Your Assigned Brand
        </div>
        <div style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {brandName}
        </div>
      </div>

      {/* Quick Navigation Info Links */}
      <nav style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="nav-item" data-active="true" style={{ '--item-color': 'var(--accent)', '--item-color-dim': 'var(--accent-dim)' } as React.CSSProperties}>
          <TrendingUp size={14} />
          <span className="nav-item__label">Master Overview</span>
        </div>
      </nav>

      {/* User Actions & Sign Out */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Client Access
          </div>
          <div className="t-micro">{brandName}</div>
        </div>
        <button
          className="btn-danger btn-sm"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
            window.location.href = '/login'
          }}
        >
          <LogOut size={12} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
