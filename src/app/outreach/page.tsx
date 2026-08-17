'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Mail, TrendingUp, AlertTriangle, Inbox, BarChart3, Shield,
  Activity, Zap, Clock, CheckCircle, XCircle, AlertCircle,
  RefreshCw, Send, Eye, MessageSquare, Filter, Search,
  ArrowUpRight, ArrowDownRight, Minus, Loader2, Plus, Upload,
  Globe, FileText, Settings as SettingsIcon, Users, Rocket
} from 'lucide-react'
import { KPISkeleton, StatusBadge, ErrorState, EmptyState, Toast, timeAgo } from '@/components/cp/CampaignUI'

interface SummaryData {
  ramp: { current_step: number; current_daily_budget: number; sent_today_global: number }
  today: { sent: number; delivered: number; bounced: number; replied: number }
  backlog: number
  alerts: Array<{ id: string; severity: string; scope: string; message: string; created_at: string }>
}

interface QueueData {
  backlog: Record<string, Record<string, number>>
  stuck: Array<{ id: string; status: string; claimed_at: string; claimed_by: string; last_error: string }>
}

interface HealthData {
  mailboxes: Array<{
    id: string; email: string; status: string; provider: string;
    warmup_stage: number; daily_cap: number; sent_today: number;
    sent_count: number; bounce_rate: number; complaint_rate: number;
    reply_rate: number; health_score: number
  }>
  domains: Array<{
    id: string; domain: string; tier: string; status: string;
    spf_status: string; dkim_status: string; dmarc_status: string
  }>
}

interface RepliesData {
  classifications: Array<{ category: string; count: number }>
  funnel: { sent: number; delivered: number; replied: number }
  replyRate: string
}

export default function OutreachDashboard() {
  const [activeTab, setActiveTab] = useState('command')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [queue, setQueue] = useState<QueueData | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [replies, setReplies] = useState<RepliesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [s, q, h, r] = await Promise.all([
        fetch('/api/outreach/summary').then(r => r.json()),
        fetch('/api/outreach/queue').then(r => r.json()),
        fetch('/api/outreach/health').then(r => r.json()),
        fetch('/api/outreach/replies').then(r => r.json()),
      ])
      if (s.error || q.error || h.error || r.error) {
        setError(s.error || q.error || h.error || r.error)
      } else {
        setSummary(s)
        setQueue(q)
        setHealth(h)
        setReplies(r)
        setError('')
      }
    } catch {
      if (!silent) setError('Failed to load outreach data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => loadData(true), 20000)
    return () => clearInterval(interval)
  }, [loadData])

  const tabs = [
    { id: 'command', label: 'Command Center', icon: Activity },
    { id: 'health', label: 'Mailbox & Domain', icon: Shield },
    { id: 'queue', label: 'Queue', icon: Inbox },
    { id: 'replies', label: 'Replies & Funnel', icon: BarChart3 },
  ]

  if (loading) return <div className="anim-fade-up"><KPISkeleton /></div>
  if (error) return <ErrorState title="Outreach system error" description={error} onRetry={() => loadData()} />

  return (
    <div className="anim-fade-up">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              background: 'var(--blue-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>
              <Mail size={14} style={{ color: '#FFF' }} />
            </div>
            <h1 className="page-title">
              Outreach <span className="accent">System</span>
            </h1>
            {refreshing && (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} />
            )}
          </div>
          <p className="page-subtitle">
            Smart creator outreach pipeline · Self-governing ramp · Reply intelligence
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => loadData()} className="btn btn-ghost btn-sm" title="Refresh data">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Management Quick Actions */}
      <div className="grid-4" style={{ gap: 6, marginBottom: 16 }}>
        <Link href="/outreach/campaigns" className="quick-action">
          <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'rgba(220,38,38,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={13} style={{ color: 'var(--red)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-bright)' }}>Campaigns</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Launch & track</div>
          </div>
        </Link>
        <Link href="/outreach/creators" className="quick-action">
          <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'rgba(37,99,235,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={13} style={{ color: 'var(--blue)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-bright)' }}>Creators</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Add & import</div>
          </div>
        </Link>
        <Link href="/outreach/domains" className="quick-action">
          <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'rgba(5,150,105,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={13} style={{ color: 'var(--green)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-bright)' }}>Domains</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Domains & mailboxes</div>
          </div>
        </Link>
        <Link href="/outreach/templates" className="quick-action">
          <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'rgba(124,58,237,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={13} style={{ color: 'var(--purple)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-bright)' }}>Templates</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Email templates</div>
          </div>
        </Link>
        <Link href="/outreach/settings" className="quick-action">
          <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'rgba(217,119,6,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon size={13} style={{ color: 'var(--orange)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-bright)' }}>Settings</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Ramp & thresholds</div>
          </div>
        </Link>
      </div>

      {/* Tab Group */}
      <div className="tab-group" style={{ marginBottom: 16 }}>
        {tabs.map(tab => {
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
      {activeTab === 'command' && <CommandCenter data={summary} />}
      {activeTab === 'health' && <HealthView data={health} />}
      {activeTab === 'queue' && <QueueView data={queue} />}
      {activeTab === 'replies' && <RepliesView data={replies} />}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// COMMAND CENTER
// ═══════════════════════════════════════════════════════════════════

function CommandCenter({ data }: { data: SummaryData | null }) {
  if (!data) return <EmptyState icon={<Mail size={20} />} title="No data" description="Waiting for outreach data..." />

  const ramp = data.ramp || {}
  const today = data.today || {}
  const alerts = data.alerts || []

  const kpiItems = [
    { icon: Send, label: 'Today Sent', value: today.sent?.toString() || '0', color: 'var(--blue)', bg: 'var(--blue-dim)' },
    { icon: Eye, label: 'Delivered', value: today.delivered?.toString() || '0', color: 'var(--green)', bg: 'var(--green-dim)' },
    { icon: AlertTriangle, label: 'Bounced', value: today.bounced?.toString() || '0', color: 'var(--red)', bg: 'var(--red-dim)' },
    { icon: TrendingUp, label: 'Replied', value: today.replied?.toString() || '0', color: 'var(--purple)', bg: 'var(--purple-light)' },
    { icon: Zap, label: 'Ramp Step', value: ramp.current_step?.toString() ?? '—', color: 'var(--blue)', bg: 'var(--blue-dim)' },
    { icon: BarChart3, label: 'Daily Budget', value: ramp.current_daily_budget ? `${ramp.current_daily_budget}/day` : '—', color: 'var(--green)', bg: 'var(--green-dim)' },
    { icon: Clock, label: 'Queue Backlog', value: data.backlog?.toString() ?? '—', color: 'var(--orange)', bg: 'var(--orange-dim)' },
  ]

  return (
    <div>
      {/* KPI Grid */}
      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        {kpiItems.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className={`kpi-card anim-fade-up anim-delay-${Math.min(i + 1, 6)}`}>
              <div className="kpi-icon-wrap" style={{ background: kpi.bg }}>
                <Icon size={16} style={{ color: kpi.color }} />
              </div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          )
        })}
      </div>

      {/* Ramp Progress */}
      {ramp.current_daily_budget && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="section-title" style={{ marginBottom: 0 }}>Ramp Progress</span>
            <span className="badge badge-blue">{ramp.current_step + 1} / 7 steps</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div
              className="progress-bar__fill"
              style={{ width: `${((ramp.current_step + 1) / 7) * 100}%` }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>200/day</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>2,500/day</span>
          </div>
        </div>
      )}

      {/* Today's Performance */}
      {today.sent > 0 && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div className="section-title" style={{ marginBottom: 1 }}>Delivery Rate</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }} className="text-mono">
              {today.sent > 0 ? ((today.delivered / today.sent) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border-2)' }} />
          <div>
            <div className="section-title" style={{ marginBottom: 1 }}>Reply Rate</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--purple)' }} className="text-mono">
              {today.sent > 0 ? ((today.replied / today.sent) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border-2)' }} />
          <div>
            <div className="section-title" style={{ marginBottom: 1 }}>Bounce Rate</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: today.bounced > 0 ? 'var(--red)' : 'var(--green)' }} className="text-mono">
              {today.sent > 0 ? ((today.bounced / today.sent) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Active Alerts</span>
          {alerts.length > 0 && (
            <span className="badge badge-red">{alerts.length}</span>
          )}
        </div>
        {alerts.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <CheckCircle size={16} style={{ color: 'var(--green)', marginBottom: 6 }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>All systems healthy</div>
          </div>
        ) : (
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {alerts.slice(0, 10).map((a, i) => (
              <div key={a.id || i} style={{
                padding: '6px 12px',
                borderBottom: i < alerts.length - 1 ? '1px solid var(--border-1)' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                  background: a.severity === 'critical' ? 'var(--red)' : a.severity === 'warning' ? 'var(--orange)' : 'var(--blue)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.3 }}>{a.message}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                    {a.scope} · {timeAgo(a.created_at)}
                  </div>
                </div>
                <StatusBadge status={a.severity} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAILBOX & DOMAIN HEALTH
// ══════════════════════════════════════════════════════════════════

function HealthView({ data }: { data: HealthData | null }) {
  if (!data) return <EmptyState icon={<Shield size={20} />} title="No health data" description="Waiting for mailbox and domain data..." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Mailboxes */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Mailboxes (worst first)</span>
          <span className="badge badge-gray">{data.mailboxes?.length || 0} total</span>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Warmup</th>
                <th>Sent</th>
                <th>Cap</th>
                <th>Bounce%</th>
                <th>Complaint%</th>
                <th>Reply%</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {(data.mailboxes || [])
                .sort((a, b) => (a.health_score || 0) - (b.health_score || 0))
                .map((m) => (
                  <tr key={m.id}>
                    <td className="text-mono" style={{ fontSize: 11 }}>{m.email}</td>
                    <td>
                      <span className="chip">{m.provider}</span>
                    </td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td>
                      <span className="text-mono" style={{ fontSize: 11 }}>{m.warmup_stage}</span>
                    </td>
                    <td className="text-mono">{m.sent_today ?? m.sent_count ?? 0}</td>
                    <td className="text-mono">{m.daily_cap}</td>
                    <td>
                      <span style={{ color: (m.bounce_rate || 0) >= 0.02 ? 'var(--red)' : 'var(--text-secondary)' }} className="text-mono">
                        {((m.bounce_rate || 0) * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: (m.complaint_rate || 0) >= 0.001 ? 'var(--red)' : 'var(--text-secondary)' }} className="text-mono">
                        {((m.complaint_rate || 0) * 100).toFixed(3)}%
                      </span>
                    </td>
                    <td className="text-mono">{((m.reply_rate || 0) * 100).toFixed(2)}%</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="progress-bar" style={{ width: 50 }}>
                          <div
                            className="progress-bar__fill"
                            style={{
                              width: `${m.health_score || 0}%`,
                              background: (m.health_score || 0) > 70 ? 'var(--green-gradient)' : (m.health_score || 0) > 40 ? 'linear-gradient(135deg, #D97706, #B45309)' : 'linear-gradient(135deg, #DC2626, #B91C1C)',
                            }}
                          />
                        </div>
                        <span className="text-mono" style={{ fontSize: 11, fontWeight: 600 }}>{(m.health_score || 0).toFixed(0)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Domains */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Domains</span>
          <span className="badge badge-gray">{data.domains?.length || 0} total</span>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Tier</th>
                <th>Status</th>
                <th>SPF</th>
                <th>DKIM</th>
                <th>DMARC</th>
              </tr>
            </thead>
            <tbody>
              {(data.domains || []).map((d) => (
                <tr key={d.id}>
                  <td className="text-mono" style={{ fontSize: 11 }}>{d.domain}</td>
                  <td>
                    <span className={`badge ${d.tier === 'tier1' ? 'badge-blue' : 'badge-purple'}`}>{d.tier}</span>
                  </td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>
                    <span className={`badge ${d.spf_status === 'pass' ? 'badge-green' : d.spf_status === 'missing' ? 'badge-red' : 'badge-orange'}`}>
                      {d.spf_status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${d.dkim_status === 'pass' ? 'badge-green' : d.dkim_status === 'missing' ? 'badge-red' : 'badge-orange'}`}>
                      {d.dkim_status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${d.dmarc_status?.includes('pass') ? 'badge-green' : d.dmarc_status === 'missing' ? 'badge-red' : 'badge-orange'}`}>
                      {d.dmarc_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// QUEUE MONITOR
// ═══════════════════════════════════════════════════════════════════

function QueueView({ data }: { data: QueueData | null }) {
  if (!data) return <EmptyState icon={<Inbox size={20} />} title="No queue data" description="Waiting for queue data..." />

  const backlog = data.backlog || {}
  const stuck = data.stuck || []

  const totalQueued = Object.entries(backlog)
    .filter(([status]) => status === 'queued')
    .reduce((sum, [, tiers]) => sum + Object.values(tiers).reduce((a, b) => a + b, 0), 0)

  const totalSent = Object.entries(backlog)
    .filter(([status]) => status === 'sent')
    .reduce((sum, [, tiers]) => sum + Object.values(tiers).reduce((a, b) => a + b, 0), 0)

  const totalFailed = Object.entries(backlog)
    .filter(([status]) => status === 'failed')
    .reduce((sum, [, tiers]) => sum + Object.values(tiers).reduce((a, b) => a + b, 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Queue Summary */}
      <div className="grid-kpi" style={{ marginBottom: 0 }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--blue-dim)' }}>
            <Inbox size={16} style={{ color: 'var(--blue)' }} />
          </div>
          <div className="kpi-value">{totalQueued}</div>
          <div className="kpi-label">Queued</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--green-dim)' }}>
            <CheckCircle size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div className="kpi-value">{totalSent}</div>
          <div className="kpi-label">Sent</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--red-dim)' }}>
            <XCircle size={16} style={{ color: 'var(--red)' }} />
          </div>
          <div className="kpi-value">{totalFailed}</div>
          <div className="kpi-label">Failed</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: stuck.length > 0 ? 'var(--orange-dim)' : 'var(--green-dim)' }}>
            <AlertCircle size={16} style={{ color: stuck.length > 0 ? 'var(--orange)' : 'var(--green)' }} />
          </div>
          <div className="kpi-value">{stuck.length}</div>
          <div className="kpi-label">Stuck</div>
        </div>
      </div>

      {/* Backlog by Status */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)' }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Backlog by Status</span>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Tier</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(backlog).map(([status, tiers]) =>
                Object.entries(tiers).map(([tier, count]) => (
                  <tr key={`${status}-${tier}`}>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td>
                      <span className={`badge ${tier === 'tier1' ? 'badge-blue' : 'badge-purple'}`}>{tier}</span>
                    </td>
                    <td className="text-mono" style={{ fontWeight: 600 }}>{count as number}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stuck Rows */}
      {stuck.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'var(--orange)' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--orange-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} style={{ color: 'var(--orange)' }} />
            <span className="section-title" style={{ marginBottom: 0, color: 'var(--orange)' }}>Stuck Rows — Requires Attention</span>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {stuck.map((s, i) => (
              <div key={s.id || i} style={{
                padding: '6px 12px',
                borderBottom: i < stuck.length - 1 ? '1px solid var(--border-1)' : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{s.id?.slice(0, 8)}...</span>
                <StatusBadge status={s.status} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(s.claimed_at)}</span>
                {s.last_error && (
                  <span style={{ fontSize: 10, color: 'var(--red)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.last_error}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// REPLIES & FUNNEL
// ═══════════════════════════════════════════════════════════════════

function RepliesView({ data }: { data: RepliesData | null }) {
  if (!data) return <EmptyState icon={<BarChart3 size={20} />} title="No reply data" description="Waiting for reply and classification data..." />

  const funnel = data.funnel || {}
  const classifications = data.classifications || []
  const replyRate = data.replyRate || '0'

  const categoryColors: Record<string, string> = {
    interested: 'var(--green)',
    not_interested: 'var(--text-muted)',
    wrong_person: 'var(--orange)',
    unsubscribe: 'var(--red)',
    out_of_office: 'var(--blue)',
    question: 'var(--purple)',
    other: 'var(--text-secondary)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Funnel */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Conversion Funnel</span>
          <div className="delta-pos" style={{ fontSize: 11, padding: '3px 10px' }}>
            <TrendingUp size={10} />
            {replyRate}% reply rate
          </div>
        </div>

        {/* Funnel Bars */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 12 }}>
          {[
            { label: 'Sent', value: funnel.sent || 0, color: 'var(--blue)', pct: 100 },
            { label: 'Delivered', value: funnel.delivered || 0, color: 'var(--green)', pct: funnel.sent > 0 ? ((funnel.delivered / funnel.sent) * 100) : 0 },
            { label: 'Replied', value: funnel.replied || 0, color: 'var(--purple)', pct: funnel.sent > 0 ? ((funnel.replied / funnel.sent) * 100) : 0 },
          ].map((step) => (
            <div key={step.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 80,
                background: `${step.color}15`,
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                display: 'flex', alignItems: 'end', justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: '100%',
                  height: `${step.pct}%`,
                  background: step.color,
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  transition: 'height 0.4s ease',
                  opacity: 0.8,
                }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)', marginTop: 6 }} className="text-mono">
                {step.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{step.label}</div>
            </div>
          ))}
        </div>

        {/* Reply Rate Highlight */}
        <div style={{
          textAlign: 'center',
          padding: '8px 16px',
          background: 'var(--purple-light)',
          borderRadius: 'var(--radius-sm)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          margin: '0 auto',
        }}>
          <MessageSquare size={12} style={{ color: 'var(--purple)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>
            Reply Rate: {replyRate}%
          </span>
          {parseFloat(replyRate) < 1 && parseFloat(replyRate) > 0 && (
            <span className="badge badge-orange" style={{ fontSize: 9 }}>Below floor</span>
          )}
          {parseFloat(replyRate) >= 3 && (
            <span className="badge badge-green" style={{ fontSize: 9 }}>Healthy</span>
          )}
        </div>
      </div>

      {/* Classification Breakdown */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)' }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Classification Breakdown</span>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Distribution</th>
              </tr>
            </thead>
            <tbody>
              {classifications.map((c) => {
                const total = classifications.reduce((s, x) => s + x.count, 0)
                const pct = total > 0 ? (c.count / total) * 100 : 0
                return (
                  <tr key={c.category}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: categoryColors[c.category] || 'var(--text-muted)' }} />
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {c.category.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="text-mono" style={{ fontWeight: 600 }}>{c.count}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div
                            className="progress-bar__fill"
                            style={{ width: `${pct}%`, background: categoryColors[c.category] || 'var(--blue-gradient)' }}
                          />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-up Performance */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)' }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Follow-up Performance</span>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Enqueued</th>
                <th>Sent</th>
                <th>Failed</th>
                <th>Suppressed</th>
              </tr>
            </thead>
            <tbody>
              {['followup_1', 'followup_2', 'followup_3', 'followup_4'].map((stage) => (
                <tr key={stage}>
                  <td>
                    <span className="badge badge-purple">{stage.replace('_', ' ')}</span>
                  </td>
                  <td className="text-mono">—</td>
                  <td className="text-mono">—</td>
                  <td className="text-mono">—</td>
                  <td className="text-mono">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
