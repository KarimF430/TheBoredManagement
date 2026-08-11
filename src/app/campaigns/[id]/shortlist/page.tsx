'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Plus, Users, Search,
  X, ExternalLink, ShieldAlert, RefreshCw, Play, Upload
} from 'lucide-react'
import { TableSkeleton, StatusBadge, Toast, formatNumber } from '@/components/cp/CampaignUI'
import BulkImport from '@/components/cp/BulkImport'
import NegotiationHistory from '@/components/cp/NegotiationHistory'

interface Creator {
  id: string; channel_name: string; channel_url: string; platform: string
  subscribers: number; avg_views: number; engagement_rate: number
  internal_cost: number; quoted_cost: number; status: string
  rejection_reason: string | null; created_at: string
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  shortlisted: { bg: 'var(--blue-dim)', color: 'var(--blue)', label: 'Shortlisted' },
  client_review: { bg: 'rgba(124,58,237,0.08)', color: 'var(--purple)', label: 'Client Review' },
  negotiating: { bg: 'rgba(255,109,0,0.08)', color: 'var(--orange)', label: 'Negotiating' },
  onboarded: { bg: 'var(--green-dim)', color: 'var(--green)', label: 'Onboarded' },
  active: { bg: 'var(--green-dim)', color: 'var(--green)', label: 'Active' },
  completed: { bg: 'var(--blue-dim)', color: 'var(--blue)', label: 'Completed' },
  rejected: { bg: 'var(--red-dim)', color: 'var(--red)', label: 'Rejected' },
}

export default function ShortlistPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<{ role: string } | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [fetchingYT, setFetchingYT] = useState(false)
  const [addForm, setAddForm] = useState({
    channel_name: '', channel_url: '', platform: 'youtube',
    subscribers: '', avg_views: '', engagement_rate: '',
    internal_cost: '', quoted_cost: '',
    deliverable_platforms: [] as string[],
  })
  const [addLoading, setAddLoading] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [expandedNegotiation, setExpandedNegotiation] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setSession(d.user) }).catch(() => {}).finally(() => setSessionLoading(false))
  }, [])

  useEffect(() => { if (!sessionLoading) fetchCreators() }, [campaignId, statusFilter, sessionLoading])

  const fetchCreators = () => {
    setLoading(true)
    const url = statusFilter ? `/api/campaigns/${campaignId}/creators?status=${statusFilter}` : `/api/campaigns/${campaignId}/creators`
    fetch(url).then(r => r.json()).then(d => { if (d.creators) setCreators(d.creators) }).catch(() => {}).finally(() => setLoading(false))
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const handleFetchYouTube = async () => {
    const url = addForm.channel_url.trim()
    if (!url) { showToast('Enter a YouTube channel URL first', 'error'); return }
    setFetchingYT(true)
    try {
      const res = await fetch(`/api/youtube/resolve?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (data.error) { showToast(data.error, 'error'); return }
      setAddForm(prev => ({
        ...prev,
        channel_name: data.title || prev.channel_name,
        subscribers: data.subscribers?.toString() || prev.subscribers,
        avg_views: data.avg_views?.toString() || prev.avg_views,
        engagement_rate: data.engagement_rate?.toString() || prev.engagement_rate,
        platform: data.platform || prev.platform,
      }))
      showToast('Channel data fetched from YouTube')
    } catch {
      showToast('Failed to fetch YouTube data', 'error')
    } finally {
      setFetchingYT(false)
    }
  }

  const handleAdd = async () => {
    if (!addForm.channel_name.trim() || !addForm.channel_url.trim()) {
      return showToast('Channel name and URL are required', 'error')
    }
    setAddLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creators`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          subscribers: parseInt(addForm.subscribers) || 0,
          avg_views: parseInt(addForm.avg_views) || 0,
          engagement_rate: parseFloat(addForm.engagement_rate) || 0,
          internal_cost: parseFloat(addForm.internal_cost) || 0,
          quoted_cost: parseFloat(addForm.quoted_cost) || 0,
        }),
      })
      if (!res.ok) { const d = await res.json(); return showToast(d.error || 'Failed', 'error') }
      showToast('Creator added to shortlist')
      setShowAddDrawer(false)
      setAddForm({ channel_name: '', channel_url: '', platform: 'youtube', subscribers: '', avg_views: '', engagement_rate: '', internal_cost: '', quoted_cost: '', deliverable_platforms: [] })
      fetchCreators()
    } catch { showToast('Connection error', 'error') }
    finally { setAddLoading(false) }
  }

  const filtered = creators.filter(c => {
    if (search) { const q = search.toLowerCase(); if (!c.channel_name.toLowerCase().includes(q) && !c.channel_url.toLowerCase().includes(q)) return false }
    return true
  })
  const activeCreators = filtered.filter(c => c.status !== 'rejected')
  const rejectedCreators = filtered.filter(c => c.status === 'rejected')

  return (
    <div className="anim-fade-up">
      <button onClick={() => router.push(`/campaigns/${campaignId}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to overview
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Creator <span className="text-gradient-blue">Shortlist</span></h1>
          <p className="page-subtitle">Add creators by URL and track negotiation status</p>
        </div>
        {session?.role !== 'client' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowBulkImport(true)} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={14} /> Bulk Import
            </button>
            <button onClick={() => setShowAddDrawer(true)} className="btn btn-blue" style={{ borderRadius: 10 }}><Plus size={15} /> Add Creator</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search channels..." className="input" style={{ paddingLeft: 34 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input" style={{ width: 180 }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {sessionLoading || loading ? (
        <TableSkeleton rows={4} cols={session?.role === 'client' ? 7 : 8} />
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Users size={32} style={{ color: 'var(--blue)', opacity: 0.4, marginBottom: 8 }} />
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 600 }}>{search ? 'No matching creators found.' : 'No creators in this shortlist yet.'}</p>
        </div>
      ) : (
        <>
          {activeCreators.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              <table className="data-table">
                <thead><tr><th>Status</th><th>Creator</th><th>Platform</th><th>Subscribers</th><th>Avg Views</th><th>Engagement</th><th>Cost</th><th>Negotiation</th><th>Action</th></tr></thead>
                <tbody>
                  {activeCreators.map(c => {
                    const st = STATUS_STYLES[c.status] || STATUS_STYLES.shortlisted
                    return (
                      <tr key={c.id}>
                        <td><StatusBadge status={c.status} label={st.label} /></td>
                        <td><div><div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{c.channel_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.channel_url}</div></div></td>
                        <td><span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{c.platform}</span></td>
                        <td>{formatNumber(c.subscribers)}</td>
                        <td>{formatNumber(c.avg_views)}</td>
                        <td>{c.engagement_rate}%</td>
                        <td>
                          {session?.role !== 'client' ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Int: ₹{c.internal_cost?.toLocaleString('en-IN')}</span>
                              <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>Qut: ₹{c.quoted_cost?.toLocaleString('en-IN')}</span>
                            </div>
                          ) : <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>₹{c.quoted_cost?.toLocaleString('en-IN')}</span>}
                        </td>
                        <td style={{ width: 200 }}>
                          <NegotiationHistory
                            campaignId={campaignId}
                            creatorId={c.id}
                            creatorName={c.channel_name}
                            internalCost={c.internal_cost}
                            onUpdate={fetchCreators}
                          />
                        </td>
                        <td><a href={c.channel_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}>Visit <ExternalLink size={11} /></a></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rejectedCreators.length > 0 && (
            <details style={{ marginBottom: 20 }}>
              <summary style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--red-dim)', border: '1.5px solid var(--red-dim)', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--red)', userSelect: 'none' }}>
                Rejected Creators ({rejectedCreators.length})
              </summary>
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 8 }}>
                <table className="data-table">
                  <thead><tr><th>Creator</th><th>Reason</th><th>Action</th></tr></thead>
                  <tbody>
                    {rejectedCreators.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.channel_name}</td>
                        <td style={{ color: 'var(--text-muted)' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--red)', fontWeight: 600 }}><ShieldAlert size={12} />{c.rejection_reason || 'Rejected'}</span></td>
                        <td><a href={c.channel_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs">Link <ExternalLink size={10} /></a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}

      {showAddDrawer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.2s ease' }}
          onClick={() => setShowAddDrawer(false)}>
          <div className="card" style={{ width: 480, maxWidth: '100%', height: '100%', borderRadius: 0, boxShadow: '-8px 0 32px rgba(0,0,0,0.08)', animation: 'slideIn 0.3s cubic-bezier(0.16,1,0.3,1) both', padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, border: 'none', borderLeft: '1.5px solid var(--border-2)', background: '#FFF' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-bright)' }}>Add New Creator</h2>
              <button onClick={() => setShowAddDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Channel Name *</label>
                <input value={addForm.channel_name} onChange={e => setAddForm(p => ({ ...p, channel_name: e.target.value }))} placeholder="e.g. Tech Guru" className="input" />
              </div>
              <div>
                <label style={labelStyle}>Channel URL *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={addForm.channel_url} onChange={e => setAddForm(p => ({ ...p, channel_url: e.target.value }))} placeholder="https://youtube.com/@channel" className="input" style={{ flex: 1 }} />
                  <button onClick={handleFetchYouTube} disabled={fetchingYT || !addForm.channel_url}
                    className="btn btn-sm btn-ghost" style={{ border: '1.5px solid var(--border-2)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {fetchingYT ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={12} style={{ color: 'var(--red)' }} />}
                    {fetchingYT ? 'Fetching...' : 'Auto-fill'}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Platform</label>
                <select value={addForm.platform} onChange={e => setAddForm(p => ({ ...p, platform: e.target.value }))} className="input">
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Subscribers</label><input type="number" value={addForm.subscribers} onChange={e => setAddForm(p => ({ ...p, subscribers: e.target.value }))} placeholder="0" className="input" /></div>
                <div><label style={labelStyle}>Avg Views</label><input type="number" value={addForm.avg_views} onChange={e => setAddForm(p => ({ ...p, avg_views: e.target.value }))} placeholder="0" className="input" /></div>
              </div>
              <div>
                <label style={labelStyle}>Engagement Rate (%)</label>
                <input type="number" step="0.1" value={addForm.engagement_rate} onChange={e => setAddForm(p => ({ ...p, engagement_rate: e.target.value }))} placeholder="0.0" className="input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Internal Cost (₹)</label><input type="number" value={addForm.internal_cost} onChange={e => setAddForm(p => ({ ...p, internal_cost: e.target.value }))} placeholder="0" className="input" /></div>
                <div><label style={labelStyle}>Quoted Cost (₹)</label><input type="number" value={addForm.quoted_cost} onChange={e => setAddForm(p => ({ ...p, quoted_cost: e.target.value }))} placeholder="0" className="input" /></div>
              </div>
              <div>
                <label style={labelStyle}>Deliverables Platforms</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['youtube_long', 'youtube_shorts', 'instagram_reels'].map(p => {
                    const active = addForm.deliverable_platforms.includes(p)
                    return (
                      <button key={p} type="button" onClick={() => setAddForm(prev => ({ ...prev, deliverable_platforms: prev.deliverable_platforms.includes(p) ? prev.deliverable_platforms.filter(x => x !== p) : [...prev.deliverable_platforms, p] }))}
                        style={{ padding: '6px 12px', borderRadius: 16, fontSize: 11, background: active ? 'var(--blue-dim)' : 'transparent', color: active ? 'var(--blue)' : 'var(--text-muted)', border: `1.5px solid ${active ? 'var(--blue)' : 'var(--border-2)'}`, fontWeight: 600, cursor: 'pointer' }}>
                        {p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 20, borderTop: '1.5px solid var(--border-1)' }}>
              <button onClick={() => setShowAddDrawer(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleAdd} disabled={addLoading} className="btn btn-blue" style={{ flex: 1 }}>
                {addLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                Add to Shortlist
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
      {showBulkImport && (
        <BulkImport
          campaignId={campaignId}
          onImported={() => { setShowBulkImport(false); fetchCreators() }}
          onClose={() => setShowBulkImport(false)}
        />
      )}
    </div>
  )
}

const labelStyle = { display: 'block' as const, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.4px' }
