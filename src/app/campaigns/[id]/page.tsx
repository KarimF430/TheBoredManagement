'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Users, Radio, Eye, TrendingUp, IndianRupee, Target,
  Package, Clock, BarChart3, FileText, Settings,
  Activity, Bell, Shield, Undo2, Redo2
} from 'lucide-react'
import { KPISkeleton, StatusBadge, ErrorState, Toast, formatNumber, formatCurrency } from '@/components/cp/CampaignUI'
import SLADashboard from '@/components/cp/SLADashboard'
import ProductShipments from '@/components/cp/ProductShipments'
import StatusHistoryViewer from '@/components/cp/StatusHistoryViewer'
import { useCampaignStore } from '@/lib/store'

interface Campaign {
  id: string
  name: string
  brand: string
  status: string
  go_live_date: string
  budget: number
}

interface KPIs {
  totalCreators: number
  totalDeliverables: number
  totalViews: number
  engagementRate: number
  totalSpend: number
  internalSpend: number | null
  margin: number | null
  marginPct: number | null
  blendedCPV: number
  postsByFormat: { youtube_long: number; youtube_shorts: number; instagram_reels: number }
  creatorsByStatus: Record<string, number>
  daysRemaining: number
}

export default function CampaignOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [activeSection, setActiveSection] = useState<'overview' | 'sla' | 'shipments'>('overview')

  const { undoStack, redoStack, undo, redo } = useCampaignStore()

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(d => {
        if (d.campaign) setCampaign(d.campaign)
        if (d.kpis) setKpis(d.kpis)
        if (d.error) setError(d.error)
      })
      .catch(() => setError('Failed to load campaign'))
      .finally(() => setLoading(false))
  }, [campaignId])

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field)
    setEditValue(currentValue)
  }

  const saveEdit = async (field: string) => {
    if (!campaign) return
    const oldValue = campaign[field as keyof Campaign]
    let newValue: string | number = editValue
    if (field === 'budget') newValue = parseFloat(editValue) || 0

    setCampaign(prev => prev ? { ...prev, [field]: newValue } : prev)
    setEditingField(null)

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
      })
      if (!res.ok) throw new Error('Failed')
      showToast(`Updated ${field.replace(/_/g, ' ')}`)
    } catch {
      setCampaign(prev => prev ? { ...prev, [field]: oldValue } as Campaign : prev)
      showToast(`Failed to update ${field.replace(/_/g, ' ')}`, 'error')
    }
  }

  const cancelEdit = () => { setEditingField(null); setEditValue('') }

  if (loading) return <div className="anim-fade-up"><KPISkeleton /></div>
  if (error || !campaign) return <ErrorState title="Campaign not found" description={error || 'This campaign may have been deleted.'} onRetry={() => router.push('/campaigns')} />

  const kpiItems = kpis ? [
    { icon: Users, label: 'Creators', value: kpis.totalCreators.toString(), color: 'var(--blue)', bg: 'var(--blue-dim)' },
    { icon: Package, label: 'Deliverables', value: kpis.totalDeliverables.toString(), color: 'var(--purple)', bg: 'var(--purple-light)' },
    { icon: Eye, label: 'Total Views', value: formatNumber(kpis.totalViews), color: 'var(--green)', bg: 'var(--green-dim)' },
    { icon: TrendingUp, label: 'Engagement', value: `${kpis.engagementRate}%`, color: 'var(--orange)', bg: 'var(--orange-dim)' },
    { icon: IndianRupee, label: 'Spend', value: formatCurrency(kpis.totalSpend), color: 'var(--blue)', bg: 'var(--blue-dim)' },
    { icon: Target, label: 'Blended CPV', value: `₹${kpis.blendedCPV.toFixed(2)}`, color: 'var(--purple)', bg: 'var(--purple-light)' },
  ] : []

  const quickActions = [
    { label: 'Brief', sublabel: 'Edit campaign brief', icon: FileText, href: `/campaigns/${campaignId}/brief`, color: 'var(--purple)' },
    { label: 'Shortlist', sublabel: 'Manage creators', icon: Users, href: `/campaigns/${campaignId}/shortlist`, color: 'var(--orange)' },
    { label: 'Content', sublabel: 'Content pipeline', icon: Package, href: `/campaigns/${campaignId}/content`, color: 'var(--green)' },
    { label: 'Tracking', sublabel: 'Live metrics', icon: Radio, href: `/campaigns/${campaignId}/tracking`, color: 'var(--blue)' },
    { label: 'Report', sublabel: 'Campaign report', icon: BarChart3, href: `/campaigns/${campaignId}/report`, color: 'var(--purple)' },
    { label: 'Activity', sublabel: 'Activity feed', icon: Activity, href: `/campaigns/${campaignId}/activity`, color: 'var(--orange)' },
    { label: 'Notifications', sublabel: 'Team alerts', icon: Bell, href: `/campaigns/${campaignId}/notifications`, color: 'var(--red)' },
    { label: 'Settings', sublabel: 'SLA & team', icon: Settings, href: `/campaigns/${campaignId}/settings`, color: 'var(--text-secondary)' },
  ]

  return (
    <div className="anim-fade-up">
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {editingField === 'name' ? (
              <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                onBlur={() => saveEdit('name')}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit('name'); if (e.key === 'Escape') cancelEdit() }}
                style={{ fontSize: 18, fontWeight: 700, background: 'var(--bg-elevated)', border: '2px solid var(--blue)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', color: 'var(--text-bright)', outline: 'none', width: '100%' }} />
            ) : (
              <h1 className="page-title" onClick={() => startEdit('name', campaign.name)}
                style={{ cursor: 'pointer', borderBottom: '2px dashed transparent', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderBottomColor = 'var(--blue)')}
                onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}>
                <span className="text-gradient-blue">{campaign.name}</span>
              </h1>
            )}
            <StatusBadge status={campaign.status} />
          </div>
          <p className="page-subtitle">
            {campaign.brand} · Go live{' '}
            {editingField === 'go_live_date' ? (
              <input type="date" value={editValue} onChange={e => setEditValue(e.target.value)}
                onBlur={() => saveEdit('go_live_date')}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit('go_live_date'); if (e.key === 'Escape') cancelEdit() }}
                style={{ fontSize: 11, background: 'var(--bg-elevated)', border: '2px solid var(--blue)', borderRadius: 'var(--radius-sm)', padding: '1px 6px', color: 'var(--text-bright)', outline: 'none' }} />
            ) : (
              <span onClick={() => startEdit('go_live_date', campaign.go_live_date?.split('T')[0] || '')}
                style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--blue)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--text-muted)')}>
                {new Date(campaign.go_live_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => { undo(); showToast('Undone') }} disabled={undoStack.length === 0}
            className="btn btn-ghost btn-sm" title="Undo" style={{ opacity: undoStack.length === 0 ? 0.4 : 1 }}>
            <Undo2 size={15} />
          </button>
          <button onClick={() => { redo(); showToast('Redone') }} disabled={redoStack.length === 0}
            className="btn btn-ghost btn-sm" title="Redo" style={{ opacity: redoStack.length === 0 ? 0.4 : 1 }}>
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border-1)', width: 'fit-content' }}>
        {[
          { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
          { id: 'sla' as const, label: 'SLA Monitor', icon: Shield },
          { id: 'shipments' as const, label: 'Shipments', icon: Package },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 0, fontSize: 12, fontWeight: activeSection === tab.id ? 600 : 500, border: 'none', borderBottom: `2px solid ${activeSection === tab.id ? 'var(--blue)' : 'transparent'}`, background: 'transparent', color: activeSection === tab.id ? 'var(--blue)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.1s', fontFamily: 'inherit', marginBottom: '-1px' }}>
              <Icon size={13} /> {tab.label}
            </button>
          )
        })}
      </div>

      {activeSection === 'overview' && (
        <>
          {kpis && (
            <div className="grid-kpi" style={{ marginBottom: 24 }}>
              {kpiItems.map((kpi, i) => {
                const Icon = kpi.icon
                return (
                  <div key={kpi.label} className={`kpi-card anim-fade-up anim-delay-${Math.min(i + 1, 6)}`}>
                    <div className="kpi-icon-wrap" style={{ background: kpi.bg }}><Icon size={18} style={{ color: kpi.color }} /></div>
                    <div className="kpi-value">{kpi.value}</div>
                    <div className="kpi-label">{kpi.label}</div>
                  </div>
                )
              })}
            </div>
          )}

          {kpis && kpis.margin !== null && kpis.internalSpend !== null && (
            <div className="card" style={{ padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, borderColor: 'var(--green-dim)' }}>
              <div>
                <div className="section-title" style={{ marginBottom: 1 }}>Internal Cost</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-bright)' }} className="text-mono">{formatCurrency(kpis.internalSpend)}</div>
              </div>
              <div style={{ width: 1, height: 20, background: 'var(--border-2)' }} />
              <div>
                <div className="section-title" style={{ marginBottom: 1 }}>Margin</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }} className="text-mono">
                  {formatCurrency(kpis.margin)} <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>({kpis.marginPct}%)</span>
                </div>
              </div>
            </div>
          )}

          {campaign.status === 'active' && kpis && (
            <div className={kpis.daysRemaining < 0 ? 'delta-neg' : kpis.daysRemaining < 7 ? 'delta-neg' : 'delta-pos'}
              style={{ marginBottom: 12, width: 'fit-content' }}>
              <Clock size={10} />
              {kpis.daysRemaining < 0 ? `${Math.abs(kpis.daysRemaining)} days overdue` : kpis.daysRemaining === 0 ? 'Go live today!' : `${kpis.daysRemaining} days to go live`}
            </div>
          )}

          {kpis && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 className="section-title">Posts by Format</h3>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'YouTube Long', count: kpis.postsByFormat.youtube_long, color: '#FF0000' },
                  { label: 'YouTube Shorts', count: kpis.postsByFormat.youtube_shorts, color: '#FF0000' },
                  { label: 'Instagram Reels', count: kpis.postsByFormat.instagram_reels, color: '#E1306C' },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.color }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{f.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-bright)' }} className="text-mono">{f.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="section-title">Quick Actions</h3>
          <div className="grid-4" style={{ gap: 6 }}>
            {quickActions.map((action, i) => {
              const Icon = action.icon
              return (
                <button key={action.href} onClick={() => router.push(action.href)}
                  className={`quick-action anim-fade-up anim-delay-${Math.min(i + 1, 6)}`}>
                  <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: `${action.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} style={{ color: action.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-bright)' }}>{action.label}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{action.sublabel}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {activeSection === 'sla' && (
        <div className="card" style={{ padding: 12 }}>
          <h3 className="section-title">SLA Monitor</h3>
          <SLADashboard campaignId={campaignId} />
        </div>
      )}

      {activeSection === 'shipments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card" style={{ padding: 12 }}>
            <ProductShipments campaignId={campaignId} />
          </div>
          <div className="card" style={{ padding: 12 }}>
            <StatusHistoryViewer campaignId={campaignId} />
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
