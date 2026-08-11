'use client'

import { useState, useEffect } from 'react'
import {
  Users, Package, Eye, TrendingUp, IndianRupee, Target,
  FileText, Radio, BarChart3, Clock, Calendar, ChevronDown, ExternalLink,
  ThumbsUp, ThumbsDown, MessageSquare
} from 'lucide-react'
import {
  KPISkeleton, StatusBadge, ErrorState, LoadingState,
  TableSkeleton, formatNumber, formatCurrency
} from '@/components/cp/CampaignUI'

export default function ClientPortalPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selectedCampId, setSelectedCampId] = useState<string>('')
  const [campaign, setCampaign] = useState<any>(null)
  const [kpis, setKpis] = useState<any>(null)
  const [creators, setCreators] = useState<any[]>([])
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [campLoading, setCampLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'brief' | 'shortlist' | 'content' | 'report'>('overview')
  const [clientActionLoading, setClientActionLoading] = useState<string | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Fetch campaigns
  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(d => {
        if (d.campaigns) {
          setCampaigns(d.campaigns)
          if (d.campaigns.length > 0) {
            setSelectedCampId(d.campaigns[0].id)
          } else {
            setLoading(false)
          }
        } else if (d.error) {
          setError(d.error)
          setLoading(false)
        }
      })
      .catch(() => {
        setError('Failed to load portal data')
        setLoading(false)
      })
  }, [])

  // Fetch campaign specifics when selection changes
  useEffect(() => {
    if (!selectedCampId) return
    setCampLoading(true)

    Promise.all([
      fetch(`/api/campaigns/${selectedCampId}`).then(r => r.json()),
      fetch(`/api/campaigns/${selectedCampId}/creators`).then(r => r.json()),
      fetch(`/api/campaigns/${selectedCampId}/deliverables`).then(r => r.json())
    ])
      .then(([campData, creatorsData, deliverablesData]) => {
        if (campData.campaign) setCampaign(campData.campaign)
        if (campData.kpis) setKpis(campData.kpis)
        if (creatorsData.creators) setCreators(creatorsData.creators)
        if (deliverablesData.deliverables) setDeliverables(deliverablesData.deliverables)
      })
      .catch(() => setError('Failed to refresh campaign data'))
      .finally(() => {
        setLoading(false)
        setCampLoading(false)
      })
  }, [selectedCampId])

  if (loading) {
    return <div className="anim-fade-up"><LoadingState text="Loading Client Portal..." /></div>
  }

  if (error) {
    return <ErrorState title="Portal Access Issue" description={error} />
  }

  const handleClientAction = async (creatorId: string, action: 'accepted' | 'rejected', remark?: string) => {
    setClientActionLoading(creatorId)
    try {
      const res = await fetch(`/api/campaigns/${selectedCampId}/creators/${creatorId}/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_action: action,
          client_remark: remark || '',
          client_action_at: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        setCreators(prev => prev.map(c =>
          c.id === creatorId ? { ...c, client_action: action, client_remark: remark || '' } : c
        ))
        setShowRejectDialog(null)
        setRejectReason('')
      }
    } catch {
      // silent
    } finally {
      setClientActionLoading(null)
    }
  }

  if (campaigns.length === 0) {
    return (
      <ErrorState
        title="No Assigned Campaigns"
        description="You currently do not have any campaigns assigned to your client login. Please contact your Brand Solutions manager."
      />
    )
  }

  const kpiItems = kpis ? [
    { icon: Users, label: 'Creators', value: kpis.totalCreators.toString(), color: '#1A73E8', bg: 'rgba(26,115,232,0.06)' },
    { icon: Package, label: 'Deliverables', value: kpis.totalDeliverables.toString(), color: '#7C3AED', bg: 'rgba(124,58,237,0.06)' },
    { icon: Eye, label: 'Total Views', value: formatNumber(kpis.totalViews), color: '#00C853', bg: 'rgba(0,200,83,0.06)' },
    { icon: TrendingUp, label: 'Engagement', value: `${kpis.engagementRate}%`, color: '#FF6D00', bg: 'rgba(255,109,0,0.06)' },
    { icon: IndianRupee, label: 'Quoted Spend', value: formatCurrency(kpis.totalSpend), color: '#1A73E8', bg: 'rgba(26,115,232,0.06)' },
    { icon: Target, label: 'Blended CPV', value: `₹${kpis.blendedCPV.toFixed(2)}`, color: '#7C3AED', bg: 'rgba(124,58,237,0.06)' },
  ] : []

  // Status mapping for deliverables Kanban
  const COLUMNS = [
    { id: 'pending', label: 'Pending' },
    { id: 'script_pending', label: 'Script Pending' },
    { id: 'script_approved', label: 'Script Approved' },
    { id: 'filming', label: 'Filming' },
    { id: 'in_review', label: 'In Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'live', label: 'Live' },
  ]

  return (
    <div className="anim-fade-up" style={{ minHeight: '80vh' }}>
      {/* Client Header / Campaign Selector */}
      <div className="page-header" style={{ alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--blue)' }}>Client Dashboard</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {campaign?.name}
            </h1>
            {campaign && <StatusBadge status={campaign.status} />}
          </div>
          <p className="page-subtitle">
            {campaign?.brand} · Go live {campaign && new Date(campaign.go_live_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Campaign Switcher (if multiple) */}
        {campaigns.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Switch Campaign:</span>
            <select
              value={selectedCampId}
              onChange={e => setSelectedCampId(e.target.value)}
              className="input"
              style={{ width: 220, padding: '6px 12px', fontSize: 12.5 }}
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {campLoading ? (
        <KPISkeleton />
      ) : (
        <>
          {/* Top KPI row */}
          {kpis && (
            <div className="grid-kpi" style={{ marginBottom: 24 }}>
              {kpiItems.map(kpi => {
                const Icon = kpi.icon
                return (
                  <div key={kpi.label} className="kpi-card">
                    <div className="kpi-icon-wrap" style={{ background: kpi.bg }}>
                      <Icon size={18} style={{ color: kpi.color }} />
                    </div>
                    <div className="kpi-value">{kpi.value}</div>
                    <div className="kpi-label">{kpi.label}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* SLA Clock warnings if active */}
          {campaign?.status === 'active' && kpis && (
            <div className={kpis.daysRemaining < 0 ? 'delta-neg' : kpis.daysRemaining < 7 ? 'delta-neg' : 'delta-pos'}
              style={{ marginBottom: 24, width: 'fit-content', padding: '8px 16px', fontSize: 13 }}>
              <Clock size={14} />
              {kpis.daysRemaining < 0
                ? `${Math.abs(kpis.daysRemaining)} days overdue`
                : kpis.daysRemaining === 0
                  ? 'Go live today!'
                  : `${kpis.daysRemaining} days to go live`}
            </div>
          )}

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: 4,
            background: 'var(--bg-elevated)',
            padding: 4,
            borderRadius: 10,
            width: 'fit-content',
            marginBottom: 24,
            border: '1.5px solid var(--border-1)'
          }}>
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'brief', label: 'Campaign Brief', icon: FileText },
              { id: 'shortlist', label: 'Creator Shortlist', icon: Users },
              { id: 'content', label: 'Content Pipeline', icon: Radio },
              { id: 'report', label: 'Report & Insights', icon: BarChart3 },
            ].map(tab => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: isSelected ? '#FFFFFF' : 'transparent',
                    color: isSelected ? 'var(--blue)' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="card" style={{ padding: 24 }}>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 className="section-title" style={{ marginBottom: 12 }}>Posts by Format</h3>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {[
                      { label: 'YouTube Long', count: kpis?.postsByFormat.youtube_long || 0, color: '#FF0000' },
                      { label: 'YouTube Shorts', count: kpis?.postsByFormat.youtube_shorts || 0, color: '#FF0000' },
                      { label: 'Instagram Reels', count: kpis?.postsByFormat.instagram_reels || 0, color: '#E1306C' },
                    ].map(f => (
                      <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, boxShadow: `0 0 8px ${f.color}40` }} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{f.label}</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-bright)' }} className="mono">{f.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border-1)' }} />

                <div>
                  <h3 className="section-title" style={{ marginBottom: 12 }}>Workflow Progress</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    {[
                      { label: 'Shortlisted', count: kpis?.creatorsByStatus.shortlisted || 0, status: 'shortlisted' },
                      { label: 'Client Review', count: kpis?.creatorsByStatus.client_review || 0, status: 'client_review' },
                      { label: 'Negotiating', count: kpis?.creatorsByStatus.negotiating || 0, status: 'negotiating' },
                      { label: 'Onboarded', count: kpis?.creatorsByStatus.onboarded || 0, status: 'onboarded' },
                      { label: 'Active', count: kpis?.creatorsByStatus.active || 0, status: 'active' },
                      { label: 'Completed', count: kpis?.creatorsByStatus.completed || 0, status: 'completed' },
                    ].map(st => (
                      <div key={st.label} style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{st.label}</span>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-bright)', marginTop: 2 }}>{st.count}</div>
                        </div>
                        <StatusBadge status={st.status} label="" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'brief' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 6 }}>Campaign Objective</h3>
                  <div style={{
                    padding: 16,
                    borderRadius: 10,
                    background: 'var(--bg-elevated)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {campaign?.objective || 'No objective outlined.'}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 6 }}>Mandatories & Guidelines</h3>
                  <div style={{
                    padding: 16,
                    borderRadius: 10,
                    background: 'var(--bg-elevated)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {campaign?.brief_mandatories || 'No mandatories defined.'}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shortlist' && (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Creator</th>
                      <th>Platform</th>
                      <th>Subscribers</th>
                      <th>Avg Views</th>
                      <th>Engagement</th>
                      <th>Quoted Cost</th>
                      <th>Client Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creators.filter(c => c.status !== 'rejected').map(c => (
                      <tr key={c.id}>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{c.channel_name}</div>
                            <a
                              href={c.channel_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--blue)', marginTop: 2, textDecoration: 'none' }}
                            >
                              Visit channel <ExternalLink size={10} />
                            </a>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, textTransform: 'capitalize', fontWeight: 600 }}>{c.platform}</span>
                        </td>
                        <td>{formatNumber(c.subscribers)}</td>
                        <td>{formatNumber(c.avg_views)}</td>
                        <td>{c.engagement_rate}%</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{formatCurrency(c.quoted_cost)}</td>
                        <td>
                          {c.client_action === 'accepted' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#00875A', fontWeight: 700 }}>
                              <ThumbsUp size={12} /> Accepted
                            </span>
                          ) : c.client_action === 'rejected' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#DE350B', fontWeight: 700 }}>
                              <ThumbsDown size={12} /> Rejected
                            </span>
                          ) : clientActionLoading === c.id ? (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updating...</span>
                          ) : (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => handleClientAction(c.id, 'accepted')}
                                style={{
                                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  background: 'rgba(0,135,90,0.08)', color: '#00875A', border: '1px solid rgba(0,135,90,0.2)',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                }}
                              >
                                <ThumbsUp size={11} /> Like
                              </button>
                              <button
                                onClick={() => setShowRejectDialog(c.id)}
                                style={{
                                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  background: 'rgba(222,53,11,0.06)', color: '#DE350B', border: '1px solid rgba(222,53,11,0.15)',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                }}
                              >
                                <ThumbsDown size={11} /> Reject
                              </button>
                            </div>
                          )}
                          {c.client_remark && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                              <MessageSquare size={10} /> {c.client_remark}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Reject Dialog */}
                {showRejectDialog && (
                  <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)',
                    zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease',
                  }}>
                    <div className="card" style={{ width: 400, padding: 24, animation: 'fadeUp 0.25s ease' }} onClick={e => e.stopPropagation()}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 12 }}>Reject Creator</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                        Please provide a reason for rejecting this creator:
                      </p>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        rows={3}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border-2)',
                          background: 'var(--bg-input)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                        <button onClick={() => { setShowRejectDialog(null); setRejectReason('') }} className="btn btn-ghost btn-sm">Cancel</button>
                        <button
                          onClick={() => handleClientAction(showRejectDialog, 'rejected', rejectReason)}
                          disabled={!rejectReason.trim()}
                          className="btn btn-sm"
                          style={{ background: '#DE350B', color: '#FFF', opacity: rejectReason.trim() ? 1 : 0.5 }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'content' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
                overflowX: 'auto',
                paddingBottom: 8
              }}>
                {COLUMNS.map(col => {
                  const items = deliverables.filter(d => d.status === col.id)
                  return (
                    <div
                      key={col.id}
                      style={{
                        background: 'var(--bg-elevated)',
                        borderRadius: 12,
                        padding: 12,
                        minHeight: 280,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-bright)' }}>{col.label}</span>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 99,
                          background: 'var(--bg-hover)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--text-secondary)',
                          marginLeft: 'auto'
                        }}>{items.length}</span>
                      </div>
                      {items.map(d => (
                        <div
                          key={d.id}
                          style={{
                            background: '#FFFFFF',
                            borderRadius: 8,
                            padding: 10,
                            border: '1.5px solid var(--border-1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}
                        >
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{d.platform.replace(/_/g, ' ')}</span>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{d.creator_name || 'Creator Piece'}</div>
                          {d.live_link && (
                            <a
                              href={d.live_link}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--blue)', marginTop: 6, textDecoration: 'none' }}
                            >
                              View live post <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'report' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <h3 className="section-title" style={{ marginBottom: 12 }}>Engagement Summary</h3>
                    <div style={{ padding: 20, borderRadius: 10, background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Total Views</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)' }}>{formatNumber(kpis?.totalViews || 0)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Engagement Rate</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)' }}>{kpis?.engagementRate}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="section-title" style={{ marginBottom: 12 }}>Top Performing Deliverables</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {deliverables
                        .filter(d => d.views > 0)
                        .sort((a, b) => b.views - a.views)
                        .slice(0, 3)
                        .map(d => (
                          <div key={d.id} style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'var(--bg-elevated)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-bright)' }}>{d.creator_name || 'Post'}</div>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{d.platform.replace(/_/g, ' ')}</span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>{formatNumber(d.views)} views</span>
                          </div>
                        ))}
                      {deliverables.filter(d => d.views > 0).length === 0 && (
                        <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                          No tracking metrics active yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
