'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, FileText, Users, Package,
  Radio, BarChart3, Settings, Bell, ChevronLeft,
  Plus, FolderOpen, Activity, Database, Globe,
  ChevronDown, Search, Shield
} from 'lucide-react'

export default function CampaignSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const campaignMatch = pathname.match(/\/campaigns\/([a-f0-9-]+)/)
  const activeCampaignId = campaignMatch?.[1] || null

  const isInCampaign = !!activeCampaignId
  const isCampaignList = pathname === '/campaigns' || pathname === '/campaigns/new'

  const prefix = activeCampaignId ? `/campaigns/${activeCampaignId}` : ''

  const TOP_MODULES = [
    { href: '/admin', label: 'Command Centre', icon: Globe, active: pathname.startsWith('/admin') },
    { href: '/campaigns', label: 'Campaigns', icon: FolderOpen, active: isCampaignList || isInCampaign },
    { href: '/creators', label: 'Creators', icon: Database, active: pathname.startsWith('/creators') },
  ]

  const CAMPAIGN_NAV = [
    { href: prefix, label: 'Overview', icon: LayoutDashboard },
    { href: `${prefix}/brief`, label: 'Brief', icon: FileText },
    { href: `${prefix}/shortlist`, label: 'Shortlist', icon: Users },
    { href: `${prefix}/content`, label: 'Content', icon: Package },
    { href: `${prefix}/tracking`, label: 'Tracking', icon: Radio },
    { href: `${prefix}/report`, label: 'Report', icon: BarChart3 },
    { href: `${prefix}/activity`, label: 'Activity', icon: Activity },
    { href: `${prefix}/notifications`, label: 'Notifications', icon: Bell },
    { href: `${prefix}/settings`, label: 'Settings', icon: Settings },
  ]

  const QUICK_ACTIONS = [
    { href: '/campaigns/new', label: 'New Campaign', icon: Plus },
  ]

  const isActive = (href: string) => {
    if (href === '/campaigns') return pathname === '/campaigns' || pathname === '/campaigns/new'
    if (href === '/creators') return pathname.startsWith('/creators')
    return pathname === href
  }

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100%',
        width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-w)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-1)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.15s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? '8px 10px' : '8px 12px',
        borderBottom: '1px solid var(--border-1)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 40,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: '#FFF', fontWeight: 800, fontSize: 10 }}>C</span>
        </div>
        {!collapsed && (
          <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-bright)', whiteSpace: 'nowrap' }}>
            Campaign Panel
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {!collapsed && (
          <div style={{ padding: '10px 12px 3px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            MODULES
          </div>
        )}
        {TOP_MODULES.map(item => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${collapsed ? 'nav-item--collapsed' : ''}`}
              data-active={active}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
            >
              <div className="nav-item__rail" />
              <Icon size={14} style={{ flexShrink: 0, color: active ? 'var(--blue)' : 'var(--text-muted)' }} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {!collapsed && (
          <div style={{ padding: '10px 12px 3px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            ACTIONS
          </div>
        )}
        {QUICK_ACTIONS.map(item => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${collapsed ? 'nav-item--collapsed' : ''}`}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
            >
              <div className="nav-item__rail" />
              <Icon size={14} style={{ flexShrink: 0, color: 'var(--green)' }} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {isInCampaign && !collapsed && (
          <>
            <div style={{ padding: '10px 12px 3px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              CAMPAIGN
            </div>
            <div style={{ padding: '0 12px 4px', fontSize: 10, color: 'var(--blue)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeCampaignId?.slice(0, 12)}...
            </div>
            {CAMPAIGN_NAV.map(item => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item"
                  data-active={active}
                  onClick={onNavigate}
                >
                  <div className="nav-item__rail" />
                  <Icon size={13} style={{ flexShrink: 0, color: active ? 'var(--blue)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: 11 }}>{item.label}</span>
                </Link>
              )
            })}
          </>
        )}

        {isInCampaign && collapsed && CAMPAIGN_NAV.map(item => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="nav-item nav-item--collapsed"
              data-active={active}
              onClick={onNavigate}
              title={item.label}
            >
              <div className="nav-item__rail" />
              <Icon size={13} style={{ flexShrink: 0, color: active ? 'var(--blue)' : 'var(--text-muted)' }} />
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid var(--border-1)',
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'flex-end',
      }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-subtle btn-xs"
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={12}
            style={{
              transition: 'transform 0.15s',
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
