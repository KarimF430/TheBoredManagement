'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Rocket, Send, CheckCircle, XCircle, Eye,
  AlertTriangle, Loader2, Mail, TrendingUp, BarChart3,
  Clock, Users, Trash2, Pause, Play, RefreshCw, Zap
} from 'lucide-react'
import { StatusBadge, Toast, EmptyState, ErrorState, KPISkeleton } from '@/components/cp/CampaignUI'

interface Campaign {
  id: string
  name: string
  template_id: string | null
  template_name: string | null
  template: { subject: string; body_text: string; tier: string; stage: string } | null
  status: string
  creator_ids: string[]
  total_creators: number
  queued_count: number
  sent_count: number
  delivered_count: number
  replied_count: number
  bounced_count: number
  failed_count: number
  settings: Record<string, unknown>
  launched_at: string | null
  completed_at: string | null
  created_at: string
  queue_stats: Record<string, number>
  creators: Array<{
    id: string
    email: string
    name: string
    niche: string
    size_tier: string
  }>
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [launching, setLaunching] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/outreach/campaigns/${id}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setCampaign(data.campaign)
    } catch {
      setError('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadCampaign() }, [loadCampaign])

  const handleLaunch = async () => {
    if (!campaign) return
    if (!confirm(`Launch campaign "${campaign.name}" to ${campaign.total_creators} creators?`)) return

    setLaunching(true)
    try {
      const res = await fetch(`/api/outreach/campaigns/${id}/launch`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        showToast(data.error, 'error')
      } else {
        showToast(`Launched! ${data.enqueue.queued} emails queued, ${data.enqueue.skipped} skipped, ${data.enqueue.invalid} invalid, ${data.enqueue.suppressed} suppressed`)
        loadCampaign()
      }
    } catch {
      showToast('Failed to launch', 'error')
    } finally {
      setLaunching(false)
    }
  }

  const handlePause = async () => {
    try {
      await fetch(`/api/outreach/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      })
      showToast('Campaign paused')
      loadCampaign()
    } catch {
      showToast('Failed to pause', 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this campaign?')) return
    try {
      await fetch(`/api/outreach/campaigns/${id}`, { method: 'DELETE' })
      showToast('Campaign deleted')
      router.push('/outreach/campaigns')
    } catch {
      showToast('Failed to delete', 'error')
    }
  }

  if (loading) return <div className="anim-fade-up"><KPISkeleton /></div>
  if (error) return <ErrorState title="Failed to load campaign" description={error} onRetry={loadCampaign} />
  if (!campaign) return <ErrorState title="Campaign not found" description="This campaign may have been deleted." onRetry={() => router.push('/outreach/campaigns')} />

  const queueStats = campaign.queue_stats || {}
  const totalQueued = Object.values(queueStats).reduce((a, b) => a + b, 0)
  const sentRate = campaign.total_creators > 0 ? ((campaign.sent_count || 0) / campaign.total_creators * 100).toFixed(1) : '0'
  const replyRate = (campaign.sent_count || 0) > 0 ? ((campaign.replied_count || 0) / campaign.sent_count * 100).toFixed(1) : '0'
  const deliveryRate = (campaign.sent_count || 0) > 0 ? ((campaign.delivered_count || 0) / campaign.sent_count * 100).toFixed(1) : '0'
  const bounceRate = (campaign.sent_count || 0) > 0 ? ((campaign.bounced_count || 0) / campaign.sent_count * 100).toFixed(1) : '0'

  return (
    <div className="anim-fade-up">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 12 }}>
        <Link href="/outreach/campaigns" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={11} /> Back to Campaigns
        </Link>
      </div>

      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>
              <span className="accent">{campaign.name}</span>
            </h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="page-subtitle">
            {campaign.total_creators} creators · {campaign.template_name || 'No template'}
            {campaign.launched_at && ` · Launched ${new Date(campaign.launched_at).toLocaleString()}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {campaign.status === 'draft' && (
            <button onClick={handleLaunch} disabled={launching} className="btn btn-green btn-sm">
              {launching ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Rocket size={13} />}
              {launching ? 'Launching...' : 'Launch Campaign'}
            </button>
          )}
          {campaign.status === 'sending' && (
            <button onClick={handlePause} className="btn btn-ghost btn-sm">
              <Pause size={13} /> Pause
            </button>
          )}
          {campaign.status === 'paused' && (
            <button onClick={handleLaunch} disabled={launching} className="btn btn-green btn-sm">
              {launching ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={13} />}
              {launching ? 'Resuming...' : 'Resume Campaign'}
            </button>
          )}
          <button onClick={loadCampaign} className="btn btn-ghost btn-sm" title="Refresh">
            <RefreshCw size={13} />
          </button>
          {campaign.status === 'draft' && (
            <button onClick={handleDelete} className="btn btn-danger btn-sm" title="Delete">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--blue-dim)' }}>
            <Users size={16} style={{ color: 'var(--blue)' }} />
          </div>
          <div className="kpi-value">{campaign.total_creators}</div>
          <div className="kpi-label">Creators</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--green-dim)' }}>
            <Send size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div className="kpi-value">{campaign.sent_count || 0}</div>
          <div className="kpi-label">Sent ({sentRate}%)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--blue-dim)' }}>
            <Eye size={16} style={{ color: 'var(--blue)' }} />
          </div>
          <div className="kpi-value">{campaign.delivered_count || 0}</div>
          <div className="kpi-label">Delivered ({deliveryRate}%)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--purple-light)' }}>
            <TrendingUp size={16} style={{ color: 'var(--purple)' }} />
          </div>
          <div className="kpi-value">{campaign.replied_count || 0}</div>
          <div className="kpi-label">Replied ({replyRate}%)</div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--orange-dim)' }}>
            <Clock size={16} style={{ color: 'var(--orange)' }} />
          </div>
          <div className="kpi-value">{campaign.queued_count || 0}</div>
          <div className="kpi-label">Queued</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: campaign.bounced_count > 0 ? 'var(--red-dim)' : 'var(--bg-elevated)' }}>
            <AlertTriangle size={16} style={{ color: campaign.bounced_count > 0 ? 'var(--red)' : 'var(--text-muted)' }} />
          </div>
          <div className="kpi-value">{campaign.bounced_count || 0}</div>
          <div className="kpi-label">Bounced ({bounceRate}%)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--green-dim)' }}>
            <CheckCircle size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div className="kpi-value">{campaign.completed_at ? 'Yes' : '—'}</div>
          <div className="kpi-label">Completed</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--blue-dim)' }}>
            <Zap size={16} style={{ color: 'var(--blue)' }} />
          </div>
          <div className="kpi-value">{campaign.template_name || '—'}</div>
          <div className="kpi-label">Template</div>
        </div>
      </div>

      {/* Funnel Visualization */}
      {(campaign.sent_count || 0) > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)' }}>
            <span className="section-title" style={{ marginBottom: 0 }}>Funnel</span>
          </div>
          <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'end' }}>
            {[
              { label: 'Creators', value: campaign.total_creators, color: 'var(--text-secondary)', pct: 100 },
              { label: 'Sent', value: campaign.sent_count || 0, color: 'var(--blue)', pct: campaign.total_creators > 0 ? ((campaign.sent_count || 0) / campaign.total_creators * 100) : 0 },
              { label: 'Delivered', value: campaign.delivered_count || 0, color: 'var(--green)', pct: campaign.total_creators > 0 ? ((campaign.delivered_count || 0) / campaign.total_creators * 100) : 0 },
              { label: 'Replied', value: campaign.replied_count || 0, color: 'var(--purple)', pct: campaign.total_creators > 0 ? ((campaign.replied_count || 0) / campaign.total_creators * 100) : 0 },
            ].map((step) => (
              <div key={step.label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: 80,
                  background: `${step.color}15`,
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  display: 'flex', alignItems: 'end', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: '100%',
                    height: `${Math.max(step.pct, 2)}%`,
                    background: step.color,
                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                    transition: 'height 0.3s ease',
                  }} />
                </div>
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }} className="text-mono">{step.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{step.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Group */}
      <div className="tab-group" style={{ marginBottom: 16 }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'creators', label: 'Creators', icon: Users },
          { id: 'template', label: 'Template', icon: Mail },
          { id: 'queue', label: 'Queue Status', icon: Clock },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="tab-btn"
              data-active={activeTab === tab.id}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Campaign Info */}
          <div className="card">
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)' }}>
              <span className="section-title" style={{ marginBottom: 0 }}>Campaign Details</span>
            </div>
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Status</div>
                <StatusBadge status={campaign.status} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Template</div>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{campaign.template_name || '—'}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Created</div>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{new Date(campaign.created_at).toLocaleString()}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Launched</div>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{campaign.launched_at ? new Date(campaign.launched_at).toLocaleString() : '—'}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Completed</div>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{campaign.completed_at ? new Date(campaign.completed_at).toLocaleString() : '—'}</span>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Total Creators</div>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{campaign.total_creators}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'creators' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="section-title" style={{ marginBottom: 0 }}>Target Creators ({campaign.creators?.length || 0})</span>
          </div>
          <div className="data-table-wrap" style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Niche</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {(campaign.creators || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                      No creator details available
                    </td>
                  </tr>
                ) : campaign.creators.map((c) => (
                  <tr key={c.id}>
                    <td className="text-mono" style={{ fontSize: 11 }}>{c.email}</td>
                    <td style={{ fontWeight: 500, fontSize: 12 }}>{c.name || '—'}</td>
                    <td><span className="chip">{c.niche || '—'}</span></td>
                    <td>
                      <StatusBadge status={c.size_tier || 'unknown'} label={c.size_tier || '—'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'template' && campaign.template && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="section-title" style={{ marginBottom: 0 }}>Template: {campaign.template_name}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <span className={`badge ${campaign.template.tier === 'tier1' ? 'badge-blue' : 'badge-purple'}`}>{campaign.template.tier}</span>
                <span className="badge badge-purple">{campaign.template.stage}</span>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Subject</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{campaign.template.subject}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Body</div>
                <div style={{
                  fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', background: 'var(--bg-elevated)',
                  padding: 12, borderRadius: 'var(--radius-sm)',
                }}>
                  {campaign.template.body_text}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)' }}>
            <span className="section-title" style={{ marginBottom: 0 }}>Queue Status Breakdown</span>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(queueStats).length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                      No queue data yet. Launch the campaign to start sending.
                    </td>
                  </tr>
                ) : Object.entries(queueStats).map(([status, count]) => (
                  <tr key={status}>
                    <td><StatusBadge status={status} /></td>
                    <td className="text-mono" style={{ fontWeight: 600 }}>{count as number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
