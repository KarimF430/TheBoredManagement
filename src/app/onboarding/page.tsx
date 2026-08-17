'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Mail, CheckCircle, XCircle, AlertTriangle, BarChart3,
  Loader2, RefreshCw, Search, Filter, Send, Eye, Clock,
  ArrowUpRight, TrendingUp, Shield, Zap, Play, Pause,
  ChevronDown, ExternalLink, Copy, Rocket, Plus
} from 'lucide-react'
import { StatusBadge, Toast, EmptyState, ErrorState, KPISkeleton } from '@/components/cp/CampaignUI'

interface Analytics {
  headline: {
    replyRate: number
    replyRateFormatted: string
    creatorsEmailed: number
    realReplies: number
    completionRate: number
    completionRateFormatted: string
    openedSessions: number
    completedSessions: number
    dataTrustRate: number
    dataTrustRateFormatted: string
    verifiedProfiles: number
  }
  stepDropoff: Array<{ step: number; completed: number }>
  nicheConversion: Record<string, { completed: number; total: number }>
  goNogo: {
    status: string
    reason: string
    thresholds: Record<string, number>
  }
}

interface Session {
  id: string
  token: string
  creator_email: string
  creator_name: string | null
  current_step: number
  total_steps: number
  completed_steps: number[]
  status: string
  otp_verified: boolean
  invited_at: string
  started_at: string | null
  completed_at: string | null
  expires_at: string
  created_at: string
  draft: {
    primary_niche: string | null
    secondary_niches: string[]
    youtube_handle: string | null
    instagram_handle: string | null
    rate_card: Record<string, unknown>
    city: string | null
    state: string | null
  } | null
}

interface PilotStatus {
  batch: string
  stats: {
    total: number
    invited: number
    emailSent: number
    completed: number
    replied: number
    goNogo: { go: number; noGo: number; hold: number; pending: number }
  }
  completionRate: number
  replyRate: number
}

const STEP_NAMES = ['Identity', 'Niche', 'Behavioral', 'Cluster', 'Willingness', 'Rates']

export default function OnboardingAdminPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'sessions' | 'pilot'>('analytics')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsTotal, setSessionsTotal] = useState(0)
  const [sessionsPage, setSessionsPage] = useState(1)
  const [pilotStatus, setPilotStatus] = useState<PilotStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  // Pilot
  const [pilotBatch, setPilotBatch] = useState('pilot-500')
  const [pilotLoading, setPilotLoading] = useState(false)

  // Session detail
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)

  // Test session creation
  const [testEmail, setTestEmail] = useState('')
  const [testName, setTestName] = useState('')
  const [creatingTest, setCreatingTest] = useState(false)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/creator-onboarding/analytics?days=30')
      const data = await res.json()
      if (!data.error) setAnalytics(data)
    } catch {}
  }, [])

  const loadSessions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: sessionsPage.toString(), limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      if (searchFilter) params.set('search', searchFilter)
      const res = await fetch(`/api/creator-onboarding/sessions?${params}`)
      const data = await res.json()
      if (!data.error) {
        setSessions(data.sessions || [])
        setSessionsTotal(data.total || 0)
      }
    } catch {}
  }, [sessionsPage, statusFilter, searchFilter])

  const loadPilot = useCallback(async () => {
    try {
      const res = await fetch('/api/creator-onboarding/pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', batchName: pilotBatch }),
      })
      const data = await res.json()
      if (data.ok) setPilotStatus(data)
    } catch {}
  }, [pilotBatch])

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    await Promise.all([loadAnalytics(), loadSessions(), loadPilot()])
    setLoading(false)
    setRefreshing(false)
  }, [loadAnalytics, loadSessions, loadPilot])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => { loadSessions() }, [loadSessions])

  // Pilot actions
  const handlePilotSelect = async () => {
    setPilotLoading(true)
    try {
      const res = await fetch('/api/creator-onboarding/pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', batchName: pilotBatch }),
      })
      const data = await res.json()
      if (data.error) showToast(data.error, 'error')
      else showToast(`Selected ${data.selected} creators for pilot batch "${data.batch}"`)
      loadPilot()
    } catch {
      showToast('Failed to select pilots', 'error')
    } finally {
      setPilotLoading(false)
    }
  }

  const handlePilotSend = async () => {
    setPilotLoading(true)
    try {
      const res = await fetch('/api/creator-onboarding/pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_send', batchName: pilotBatch }),
      })
      const data = await res.json()
      if (data.ok) showToast(`Marked ${data.marked} as email sent`)
      loadPilot()
    } catch {
      showToast('Failed to mark sends', 'error')
    } finally {
      setPilotLoading(false)
    }
  }

  const handleGateCheck = async () => {
    setPilotLoading(true)
    try {
      const res = await fetch('/api/creator-onboarding/pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'gate_check', batchName: pilotBatch }),
      })
      const data = await res.json()
      if (data.ok) {
        const icon = data.status === 'go' ? '✅' : data.status === 'hold' ? '⏸️' : '🛑'
        showToast(`${icon} Gate: ${data.status.toUpperCase()} — ${data.reason}`)
      }
      loadPilot()
    } catch {
      showToast('Failed gate check', 'error')
    } finally {
      setPilotLoading(false)
    }
  }

  const copyOnboardingLink = (token: string) => {
    const url = `${window.location.origin}/creator-onboarding?token=${token}`
    navigator.clipboard.writeText(url)
    showToast('Onboarding link copied')
  }

  const handleCreateTestSession = async () => {
    // Validate email format if provided
    if (testEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      showToast('Please enter a valid email address', 'error')
      return
    }
    setCreatingTest(true)
    try {
      const res = await fetch('/api/creator-onboarding/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_test', email: testEmail || undefined, name: testName || undefined }),
      })
      const data = await res.json()
      if (data.error) {
        // Show user-friendly error messages
        const errorMsg = data.error.includes('already exists') 
          ? 'A session already exists for this email. Use a different email.' 
          : data.error.includes('Email is required') 
            ? 'Email is required to create a session'
            : data.error
        showToast(errorMsg, 'error')
      } else {
        showToast('Test session created')
        setTestEmail('')
        setTestName('')
        loadSessions()
      }
    } catch {
      showToast('Failed to create test session. Please try again.', 'error')
    } finally {
      setCreatingTest(false)
    }
  }

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this onboarding session? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/creator-onboarding/session?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        showToast(data.error, 'error')
      } else {
        showToast('Session deleted')
        loadSessions()
        if (selectedSession?.id === id) setSelectedSession(null)
      }
    } catch {
      showToast('Failed to delete session', 'error')
    }
  }

  if (loading) return <div className="anim-fade-up"><KPISkeleton /></div>

  const goNogo = analytics?.goNogo

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={14} style={{ color: '#FFF' }} />
            </div>
            <h1 className="page-title">
              <span className="accent">Creator</span> Onboarding
            </h1>
            {goNogo && (
              <span className={`badge ${goNogo.status === 'go' ? 'badge-green' : goNogo.status === 'hold' ? 'badge-orange' : 'badge-red'}`}>
                {goNogo.status === 'go' ? '✅ GO' : goNogo.status === 'hold' ? '⏸️ HOLD' : '🛑 NO-GO'}
              </span>
            )}
          </div>
          <p className="page-subtitle">
            Analytics, pilot controls, and session management
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => loadAll()} className="btn btn-ghost btn-sm" disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-group" style={{ marginBottom: 16 }}>
        {[
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'sessions', label: 'Sessions', icon: Users },
          { id: 'pilot', label: 'Pilot Control', icon: Rocket },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="tab-btn"
              data-active={activeTab === tab.id}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ANALYTICS TAB */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && analytics && (
        <div>
          {/* Headline KPIs */}
          <div className="grid-kpi" style={{ marginBottom: 16 }}>
            <div className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: 'var(--blue-dim)' }}>
                <Mail size={16} style={{ color: 'var(--blue)' }} />
              </div>
              <div className="kpi-value">{analytics.headline.creatorsEmailed}</div>
              <div className="kpi-label">Creators Emailed</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: 'var(--green-dim)' }}>
                <TrendingUp size={16} style={{ color: 'var(--green)' }} />
              </div>
              <div className="kpi-value">{analytics.headline.replyRateFormatted}</div>
              <div className="kpi-label">Reply Rate ({analytics.headline.realReplies} replies)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: 'var(--purple-light)' }}>
                <CheckCircle size={16} style={{ color: 'var(--purple)' }} />
              </div>
              <div className="kpi-value">{analytics.headline.completionRateFormatted}</div>
              <div className="kpi-label">Completion ({analytics.headline.completedSessions}/{analytics.headline.openedSessions})</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: 'var(--orange-dim)' }}>
                <Shield size={16} style={{ color: 'var(--orange)' }} />
              </div>
              <div className="kpi-value">{analytics.headline.dataTrustRateFormatted}</div>
              <div className="kpi-label">Data Trust ({analytics.headline.verifiedProfiles} verified)</div>
            </div>
          </div>

          {/* Go/No-Go Gate */}
          <div className="card" style={{
            marginBottom: 16,
            borderColor: goNogo?.status === 'go' ? 'var(--green)' : goNogo?.status === 'hold' ? 'var(--orange)' : 'var(--red)',
          }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={13} style={{ color: goNogo?.status === 'go' ? 'var(--green)' : 'var(--red)' }} />
              <span className="section-title" style={{ marginBottom: 0 }}>Go / No-Go Gate</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span className={`badge ${goNogo?.status === 'go' ? 'badge-green' : goNogo?.status === 'hold' ? 'badge-orange' : 'badge-red'}`} style={{ fontSize: 12, padding: '4px 12px' }}>
                  {goNogo?.status?.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{goNogo?.reason}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <ThresholdDisplay label="Reply Rate Floor" value={goNogo?.thresholds.replyRateFloor} />
                <ThresholdDisplay label="Reply Rate Stop" value={goNogo?.thresholds.replyRateStop} />
                <ThresholdDisplay label="Completion Floor" value={goNogo?.thresholds.completionRateFloor} />
                <ThresholdDisplay label="Completion Stop" value={goNogo?.thresholds.completionRateStop} />
              </div>
            </div>
          </div>

          {/* Step Drop-off */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)' }}>
              <span className="section-title" style={{ marginBottom: 0 }}>Step Drop-off</span>
            </div>
            <div style={{ padding: 16, display: 'flex', gap: 8, alignItems: 'end' }}>
              {analytics.stepDropoff.map((step, i) => {
                const max = Math.max(...analytics.stepDropoff.map(s => s.completed), 1)
                const pct = (step.completed / max) * 100
                return (
                  <div key={step.step} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      height: 80,
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                      display: 'flex', alignItems: 'end', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: '100%',
                        height: `${pct}%`,
                        background: i < 5 ? 'var(--blue)' : 'var(--green)',
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                        transition: 'height 0.3s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }} className="text-mono">{step.completed}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Step {step.step}</div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{STEP_NAMES[i]}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Niche Conversion */}
          {Object.keys(analytics.nicheConversion).length > 0 && (
            <div className="card">
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)' }}>
                <span className="section-title" style={{ marginBottom: 0 }}>Niche Conversion</span>
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Niche</th>
                      <th>Total</th>
                      <th>Completed</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analytics.nicheConversion)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([niche, data]) => (
                        <tr key={niche}>
                          <td style={{ fontWeight: 600 }}>{niche}</td>
                          <td className="text-mono">{data.total}</td>
                          <td className="text-mono" style={{ color: 'var(--green)' }}>{data.completed}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="progress-bar" style={{ width: 60 }}>
                                <div className="progress-bar__fill" style={{ width: `${data.total > 0 ? (data.completed / data.total) * 100 : 0}%` }} />
                              </div>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {data.total > 0 ? ((data.completed / data.total) * 100).toFixed(0) : 0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SESSIONS TAB */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'sessions' && (
        <div>
          {/* Create Test Session */}
          <div className="card" style={{ padding: 12, marginBottom: 12, borderColor: 'var(--blue)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Play size={13} style={{ color: 'var(--blue)' }} />
              <span className="section-title" style={{ marginBottom: 0 }}>Create Test Session</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, display: 'block' }}>Test Email</label>
                <input
                  className="input"
                  placeholder="test-creator@example.com"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                />
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, display: 'block' }}>Creator Name</label>
                <input
                  className="input"
                  placeholder="Test Creator"
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                />
              </div>
              <button
                onClick={handleCreateTestSession}
                disabled={creatingTest}
                className="btn btn-blue btn-sm"
              >
                {creatingTest ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
                Create Test Session
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              Creates a test onboarding session with a shareable link. Leave fields blank for auto-generated values.
            </div>
          </div>

          {/* Filters */}
          <div className="card" style={{ padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  placeholder="Search by email or name..."
                  value={searchFilter}
                  onChange={e => { setSearchFilter(e.target.value); setSessionsPage(1) }}
                  style={{ paddingLeft: 28 }}
                />
              </div>
            </div>
            <select className="input" style={{ width: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setSessionsPage(1) }}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sessionsTotal} sessions</span>
          </div>

          {/* Sessions Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="data-table-wrap" style={{ maxHeight: 600, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Creator</th>
                    <th>Status</th>
                    <th>Step</th>
                    <th>Niche</th>
                    <th>Location</th>
                    <th>Created</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 32, textAlign: 'center' }}>
                        <EmptyState
                          icon={<Users size={20} />}
                          title="No sessions found"
                          description="No onboarding sessions match your filters."
                        />
                      </td>
                    </tr>
                  ) : sessions.map(s => (
                    <tr key={s.id} onClick={() => setSelectedSession(s)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{s.creator_name || '—'}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.creator_email}</div>
                        </div>
                      </td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div className="progress-bar" style={{ width: 50 }}>
                            <div className="progress-bar__fill" style={{ width: `${(s.completed_steps.length / s.total_steps) * 100}%` }} />
                          </div>
                          <span style={{ fontSize: 10 }} className="text-mono">{s.completed_steps.length}/{s.total_steps}</span>
                        </div>
                      </td>
                      <td><span className="chip">{s.draft?.primary_niche || '—'}</span></td>
                      <td style={{ fontSize: 11 }}>{s.draft?.city || '—'}{s.draft?.state ? `, ${s.draft.state}` : ''}</td>
                      <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => copyOnboardingLink(s.token)} className="btn-subtle btn-xs" title="Copy link">
                            <Copy size={11} />
                          </button>
                          <a href={`/creator-onboarding?token=${s.token}`} target="_blank" rel="noopener noreferrer" className="btn-subtle btn-xs" title="Open onboarding">
                            <ExternalLink size={11} />
                          </a>
                          <button
                            onClick={() => handleDeleteSession(s.id)}
                            className="btn-subtle btn-xs"
                            title="Delete session"
                            style={{ color: 'var(--red)' }}
                          >
                            <XCircle size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sessionsTotal > 50 && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'center', gap: 4 }}>
                <button className="page-btn" disabled={sessionsPage <= 1} onClick={() => setSessionsPage(p => p - 1)}>Prev</button>
                <span style={{ padding: '0 12px', fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                  Page {sessionsPage} of {Math.ceil(sessionsTotal / 50)}
                </span>
                <button className="page-btn" disabled={sessionsPage * 50 >= sessionsTotal} onClick={() => setSessionsPage(p => p + 1)}>Next</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PILOT TAB */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'pilot' && (
        <div>
          {/* Batch Config */}
          <div className="card" style={{ marginBottom: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Rocket size={14} style={{ color: 'var(--blue)' }} />
              <span className="section-title" style={{ marginBottom: 0 }}>Pilot Batch Configuration</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label className="section-title">Batch Name</label>
                <input className="input" value={pilotBatch} onChange={e => setPilotBatch(e.target.value)} placeholder="e.g. pilot-500" />
              </div>
              <button onClick={loadPilot} className="btn btn-ghost btn-sm">Load Status</button>
            </div>
          </div>

          {/* Pilot Status */}
          {pilotStatus && (
            <div className="grid-kpi" style={{ marginBottom: 16 }}>
              <div className="kpi-card">
                <div className="kpi-icon-wrap" style={{ background: 'var(--blue-dim)' }}>
                  <Users size={16} style={{ color: 'var(--blue)' }} />
                </div>
                <div className="kpi-value">{pilotStatus.stats.total}</div>
                <div className="kpi-label">Total Selected</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon-wrap" style={{ background: 'var(--green-dim)' }}>
                  <Mail size={16} style={{ color: 'var(--green)' }} />
                </div>
                <div className="kpi-value">{pilotStatus.stats.emailSent}</div>
                <div className="kpi-label">Emails Sent</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon-wrap" style={{ background: 'var(--purple-light)' }}>
                  <CheckCircle size={16} style={{ color: 'var(--purple)' }} />
                </div>
                <div className="kpi-value">{pilotStatus.stats.completed}</div>
                <div className="kpi-label">Completed</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon-wrap" style={{ background: 'var(--orange-dim)' }}>
                  <TrendingUp size={16} style={{ color: 'var(--orange)' }} />
                </div>
                <div className="kpi-value">{pilotStatus.stats.replied}</div>
                <div className="kpi-label">Replied</div>
              </div>
            </div>
          )}

          {/* Pilot Actions */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 12 }}>
              Pilot Actions
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={handlePilotSelect} disabled={pilotLoading} className="btn btn-blue btn-sm">
                {pilotLoading ? <Loader2 size={13} className="spin" /> : <Users size={13} />}
                Select Top 500
              </button>
              <button onClick={handlePilotSend} disabled={pilotLoading} className="btn btn-green btn-sm">
                {pilotLoading ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
                Mark as Sent
              </button>
              <button onClick={handleGateCheck} disabled={pilotLoading} className="btn btn-ghost btn-sm">
                {pilotLoading ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
                Gate Check
              </button>
            </div>
            <div className="card" style={{ marginTop: 12, background: 'var(--blue-dim)', borderColor: 'var(--blue-light)', padding: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>Select Top 500:</strong> Finds highest-ranked creators from outreach_creator_scores<br/>
                <strong>Mark as Sent:</strong> Marks pilot entries as email_sent_at for tracking<br/>
                <strong>Gate Check:</strong> Evaluates reply/completion rates against thresholds (go/hold/no-go)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="drawer-overlay" onClick={() => setSelectedSession(null)}>
          <div className="drawer-panel" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Session Details</h3>
              <button onClick={() => setSelectedSession(null)} className="btn-subtle btn-xs">✕</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Basic Info */}
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Creator</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Name:</span> <span style={{ fontSize: 12 }}>{selectedSession.creator_name || '—'}</span></div>
                    <div><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Email:</span> <span style={{ fontSize: 12 }}>{selectedSession.creator_email}</span></div>
                    <div><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Status:</span> <StatusBadge status={selectedSession.status} /></div>
                    <div><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>OTP Verified:</span> <span style={{ fontSize: 12 }}>{selectedSession.otp_verified ? '✅' : '❌'}</span></div>
                  </div>
                </div>

                {/* Progress */}
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Progress</div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {STEP_NAMES.map((name, i) => {
                      const step = i + 1
                      const completed = selectedSession.completed_steps.includes(step)
                      const current = selectedSession.current_step === step
                      return (
                        <div key={step} style={{
                          flex: 1, textAlign: 'center', padding: '6px 2px',
                          borderRadius: 'var(--radius-sm)',
                          background: completed ? 'var(--green-dim)' : current ? 'var(--blue-dim)' : 'var(--bg-elevated)',
                          border: `1px solid ${completed ? 'var(--green)' : current ? 'var(--blue)' : 'var(--border-1)'}`,
                        }}>
                          <div style={{ fontSize: 9, color: completed ? 'var(--green)' : current ? 'var(--blue)' : 'var(--text-muted)' }}>
                            {completed ? '✓' : current ? '●' : step}
                          </div>
                          <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>{name}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Draft Data */}
                {selectedSession.draft && (
                  <div className="card" style={{ padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Profile Data</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Niche:</span> <span style={{ fontSize: 12 }}>{selectedSession.draft.primary_niche || '—'}</span></div>
                      <div><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Location:</span> <span style={{ fontSize: 12 }}>{selectedSession.draft.city || '—'}{selectedSession.draft.state ? `, ${selectedSession.draft.state}` : ''}</span></div>
                      <div><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>YouTube:</span> <span style={{ fontSize: 12 }}>{selectedSession.draft.youtube_handle || '—'}</span></div>
                      <div><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Instagram:</span> <span style={{ fontSize: 12 }}>{selectedSession.draft.instagram_handle || '—'}</span></div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => copyOnboardingLink(selectedSession.token)} className="btn btn-blue btn-sm" style={{ flex: 1 }}>
                    <Copy size={13} /> Copy Link
                  </button>
                  <a href={`/creator-onboarding?token=${selectedSession.token}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                    <ExternalLink size={13} /> Open Onboarding
                  </a>
                  <button
                    onClick={() => handleDeleteSession(selectedSession.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, color: 'var(--red)' }}
                  >
                    <XCircle size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}

function ThresholdDisplay({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }} className="text-mono">
        {value !== undefined ? `${(value * 100).toFixed(1)}%` : '—'}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
