'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Trash2, Play, Pause, CheckCircle,
  XCircle, AlertCircle, Loader2, Mail, Send, Clock,
  Eye, BarChart3, Rocket, ArrowUpRight, Filter
} from 'lucide-react'
import { StatusBadge, Toast, EmptyState, ErrorState, KPISkeleton } from '@/components/cp/CampaignUI'

interface Campaign {
  id: string
  name: string
  template_id: string | null
  template_name: string | null
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
  updated_at: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--text-muted)',
  queued: 'var(--blue)',
  sending: 'var(--orange)',
  completed: 'var(--green)',
  paused: 'var(--orange)',
  cancelled: 'var(--red)',
}

export default function OutreachCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/outreach/campaigns')
      const data = await res.json()
      if (data.error) setError(data.error)
      else setCampaigns(data.campaigns || [])
    } catch {
      setError('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCampaigns() }, [loadCampaigns])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return
    try {
      await fetch(`/api/outreach/campaigns/${id}`, { method: 'DELETE' })
      showToast('Campaign deleted')
      loadCampaigns()
    } catch {
      showToast('Failed to delete', 'error')
    }
  }

  const handlePause = async (campaign: Campaign) => {
    try {
      await fetch(`/api/outreach/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      })
      showToast('Campaign paused')
      loadCampaigns()
    } catch {
      showToast('Failed to pause', 'error')
    }
  }

  const filtered = campaigns.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.template_name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || c.status === filterStatus
    return matchSearch && matchStatus
  })

  if (loading) return <KPISkeleton />
  if (error) return <ErrorState title="Failed to load campaigns" description={error} onRetry={loadCampaigns} />

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">
            <span className="accent">Campaigns</span>
          </h1>
          <p className="page-subtitle">{campaigns.length} campaigns · {campaigns.filter(c => c.status === 'sending').length} active</p>
        </div>
        <Link href="/outreach/creators" className="btn btn-blue btn-sm">
          <Plus size={13} /> New Campaign
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--blue-dim)' }}>
            <Mail size={16} style={{ color: 'var(--blue)' }} />
          </div>
          <div className="kpi-value">{campaigns.length}</div>
          <div className="kpi-label">Total Campaigns</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--green-dim)' }}>
            <CheckCircle size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div className="kpi-value">{campaigns.filter(c => c.status === 'completed').length}</div>
          <div className="kpi-label">Completed</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--orange-dim)' }}>
            <Send size={16} style={{ color: 'var(--orange)' }} />
          </div>
          <div className="kpi-value">{campaigns.filter(c => c.status === 'sending').length}</div>
          <div className="kpi-label">Sending</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--purple-light)' }}>
            <BarChart3 size={16} style={{ color: 'var(--purple)' }} />
          </div>
          <div className="kpi-value">{campaigns.reduce((sum, c) => sum + (c.replied_count || 0), 0)}</div>
          <div className="kpi-label">Total Replies</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search campaigns..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 28 }}
            />
          </div>
        </div>
        <select className="input" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sending">Sending</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Campaigns Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrap" style={{ maxHeight: 500, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Template</th>
                <th>Status</th>
                <th>Creators</th>
                <th>Queued</th>
                <th>Sent</th>
                <th>Replies</th>
                <th>Bounced</th>
                <th>Created</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 32, textAlign: 'center' }}>
                    <EmptyState
                      icon={<Rocket size={20} />}
                      title={campaigns.length === 0 ? 'No campaigns yet' : 'No matches'}
                      description={campaigns.length === 0 ? 'Go to Creators, select creators, and launch your first campaign.' : 'Try adjusting your search or filters.'}
                      action={campaigns.length === 0 ? (
                        <Link href="/outreach/creators" className="btn btn-blue btn-sm" style={{ marginTop: 10 }}>
                          <Plus size={12} /> Go to Creators
                        </Link>
                      ) : undefined}
                    />
                  </td>
                </tr>
              ) : filtered.map(c => {
                const replyRate = c.sent_count > 0 ? ((c.replied_count / c.sent_count) * 100).toFixed(1) : '0'
                const deliveryRate = c.sent_count > 0 ? ((c.delivered_count / c.sent_count) * 100).toFixed(1) : '0'

                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/outreach/campaigns/${c.id}`} style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                        {c.name}
                      </Link>
                      {c.launched_at && (
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                          Launched {new Date(c.launched_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td>
                      {c.template_name ? (
                        <span className="badge badge-purple">{c.template_name}</span>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="text-mono" style={{ fontSize: 11 }}>{c.total_creators}</td>
                    <td className="text-mono" style={{ fontSize: 11 }}>{c.queued_count || 0}</td>
                    <td>
                      <div className="text-mono" style={{ fontSize: 11 }}>{c.sent_count || 0}</div>
                      {c.sent_count > 0 && (
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{deliveryRate}% delivered</div>
                      )}
                    </td>
                    <td>
                      <div className="text-mono" style={{ fontSize: 11, color: 'var(--purple)' }}>{c.replied_count || 0}</div>
                      {c.sent_count > 0 && (
                        <div style={{ fontSize: 9, color: 'var(--purple)' }}>{replyRate}%</div>
                      )}
                    </td>
                    <td>
                      <span className="text-mono" style={{ fontSize: 11, color: (c.bounced_count || 0) > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                        {c.bounced_count || 0}
                      </span>
                    </td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Link href={`/outreach/campaigns/${c.id}`} className="btn-subtle btn-xs" title="View details">
                          <Eye size={11} />
                        </Link>
                        {c.status === 'sending' && (
                          <button onClick={() => handlePause(c)} className="btn-subtle btn-xs" title="Pause">
                            <Pause size={11} style={{ color: 'var(--orange)' }} />
                          </button>
                        )}
                        {c.status === 'draft' && (
                          <button onClick={() => handleDelete(c.id)} className="btn-subtle btn-xs" title="Delete">
                            <Trash2 size={11} style={{ color: 'var(--red)' }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
