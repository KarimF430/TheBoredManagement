'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Video, Camera, TrendingUp, Eye, Heart,
  Edit3, Save, X, Plus, ExternalLink
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatNumber, formatCurrency } from '@/components/cp/CampaignUI'

interface Creator {
  id: string; name: string; email: string | null; phone: string | null
  youtube_url: string | null; youtube_handle: string | null
  instagram_url: string | null; instagram_handle: string | null
  niche: string[]; subscribers: number; avg_views: number; avg_engagement: number
  tier: string; status: string; rate_card: Record<string, number>; notes: string | null
  country: string | null; created_at: string
}

interface History {
  id: string; campaign_id: string; campaign_name: string; brand: string
  platform: string; quoted_cost: number; views: number; likes: number
  comments: number; engagement_rate: number; live_link: string | null
  status: string; outcome: string | null; created_at: string
}

interface Commercial {
  id: string; platform: string; deliverable_type: string; rate: number
  negotiable: boolean; min_rate: number | null; notes: string | null
}

interface Stats {
  totalCampaigns: number; totalEarnings: number; totalViews: number
  totalLikes: number; avgEngagement: number; completedCampaigns: number
  avgCampaignEarnings: number
}

const PIE_COLORS = ['#0052CC', '#00875A', '#FF8B00', '#6554C0', '#00B8D9']
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: 'var(--text-secondary)', marginBottom: 4 }

export default function CreatorPortalPage() {
  const params = useParams()
  const router = useRouter()
  const creatorId = params.id as string
  const [creator, setCreator] = useState<Creator | null>(null)
  const [history, setHistory] = useState<History[]>([])
  const [commercials, setCommercials] = useState<Commercial[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Creator>>({})
  const [saving, setSaving] = useState(false)
  const [showAddCommercial, setShowAddCommercial] = useState(false)
  const [commercialForm, setCommercialForm] = useState({ platform: 'youtube_long', deliverable_type: 'video', rate: '', negotiable: true, min_rate: '', notes: '' })
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/creators/pool/${creatorId}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCreator(data.creator)
      setHistory(data.history || [])
      setCommercials(data.commercials || [])
      setStats(data.stats)
    } catch { showToast('Failed to load creator', 'error') }
    finally { setLoading(false) }
  }, [creatorId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/creators/pool/${creatorId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCreator(data.creator)
      setEditing(false)
      showToast('Creator updated')
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const handleAddCommercial = async () => {
    if (!commercialForm.rate) return
    try {
      const res = await fetch(`/api/creators/pool/${creatorId}/commercials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...commercialForm, rate: parseInt(commercialForm.rate), min_rate: commercialForm.min_rate ? parseInt(commercialForm.min_rate) : null }),
      })
      const data = await res.json()
      if (!data.error) { setCommercials(prev => [data.commercial, ...prev]); setShowAddCommercial(false); showToast('Rate added') }
    } catch { showToast('Failed', 'error') }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} /></div>
  if (!creator) return <div className="state-panel"><div className="state-panel__title">Creator not found</div></div>

  const platformData = history.reduce((acc: Record<string, number>, h) => { acc[h.platform || 'unknown'] = (acc[h.platform || 'unknown'] || 0) + 1; return acc }, {})
  const platformPie = Object.entries(platformData).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
  const campaignPerformance = history.map(h => ({ name: (h.brand || h.campaign_name || 'Unknown').substring(0, 12), views: h.views || 0, engagement: h.engagement_rate || 0 }))

  return (
    <div className="anim-fade-up">
      <button onClick={() => router.push('/creators')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to Creator Database
      </button>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius)', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
            {creator.name.charAt(0)}
          </div>
          <div>
            <h1 className="page-title">{creator.name}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
              {creator.youtube_handle && <a href={creator.youtube_url || '#'} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#FF0000', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}><Video size={12} />{creator.youtube_handle} <ExternalLink size={10} /></a>}
              {creator.instagram_handle && <a href={creator.instagram_url || '#'} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#E4405F', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}><Camera size={12} />{creator.instagram_handle} <ExternalLink size={10} /></a>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editing ? (
            <button onClick={() => { setEditing(true); setEditForm({ name: creator.name, email: creator.email, phone: creator.phone, niche: creator.niche, notes: creator.notes }) }} className="btn btn-ghost btn-sm"><Edit3 size={14} /> Edit</button>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm"><X size={14} /> Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-blue btn-sm"><Save size={14} /> {saving ? 'Saving...' : 'Save'}</button>
            </>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid-kpi" style={{ marginBottom: 24 }}>
          {[
            { label: 'Campaigns', value: stats.totalCampaigns.toString(), color: '#0052CC' },
            { label: 'Total Views', value: formatNumber(stats.totalViews), color: '#00875A' },
            { label: 'Total Earnings', value: formatCurrency(stats.totalEarnings), color: '#FF8B00' },
            { label: 'Avg Engagement', value: `${stats.avgEngagement}%`, color: '#6554C0' },
            { label: 'Completed', value: stats.completedCampaigns.toString(), color: '#00B8D9' },
          ].map(kpi => (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Edit Profile</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div><label style={labelStyle}>Name</label><input className="input" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label style={labelStyle}>Email</label><input className="input" type="email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><label style={labelStyle}>Phone</label><input className="input" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><label style={labelStyle}>Niche</label><input className="input" value={(editForm.niche || []).join(', ')} onChange={e => setEditForm(p => ({ ...p, niche: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} /></div>
          </div>
          <div style={{ marginTop: 12 }}><label style={labelStyle}>Notes</label><textarea className="textarea" rows={2} value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} /></div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 className="section-title">Campaign Performance</h3>
          {campaignPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={campaignPerformance} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBECF0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B778C' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6B778C' }} tickFormatter={(v: number) => formatNumber(v)} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 6, fontSize: 11 }} formatter={(value: any) => [typeof value === 'number' ? formatNumber(value) : value, 'Views']} />
                <Bar dataKey="views" fill="#0052CC" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No campaign history yet.</div>
          )}
        </div>

        {platformPie.length > 0 && (
          <div className="card">
            <h3 className="section-title">Platform Mix</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={platformPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {platformPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 6, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Commercials */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Rate Card</h3>
          <button onClick={() => setShowAddCommercial(!showAddCommercial)} className="btn btn-ghost btn-sm"><Plus size={14} /> Add Rate</button>
        </div>
        {showAddCommercial && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)' }}>
            <select className="input" style={{ width: 'auto' }} value={commercialForm.platform} onChange={e => setCommercialForm(p => ({ ...p, platform: e.target.value }))}>
              <option value="youtube_long">YouTube Long</option><option value="youtube_shorts">YouTube Shorts</option><option value="instagram_reels">Instagram Reels</option><option value="instagram_stories">Instagram Stories</option>
            </select>
            <input className="input" placeholder="Rate (INR)" type="number" style={{ width: 120 }} value={commercialForm.rate} onChange={e => setCommercialForm(p => ({ ...p, rate: e.target.value }))} />
            <input className="input" placeholder="Min rate" type="number" style={{ width: 100 }} value={commercialForm.min_rate} onChange={e => setCommercialForm(p => ({ ...p, min_rate: e.target.value }))} />
            <button onClick={handleAddCommercial} className="btn btn-blue btn-sm">Save</button>
          </div>
        )}
        {commercials.length > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Platform</th><th>Type</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Min Rate</th><th>Negotiable</th><th>Notes</th></tr></thead>
              <tbody>
                {commercials.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{c.platform.replace(/_/g, ' ')}</td>
                    <td>{c.deliverable_type}</td>
                    <td style={{ textAlign: 'right' }} className="text-mono">{formatCurrency(c.rate)}</td>
                    <td style={{ textAlign: 'right' }} className="text-mono">{c.min_rate ? formatCurrency(c.min_rate) : '—'}</td>
                    <td><span className={`badge ${c.negotiable ? 'badge-green' : 'badge-gray'}`}>{c.negotiable ? 'Yes' : 'Fixed'}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12 }}>No rates added yet. Add commercial rates for this creator.</div>
        )}
      </div>

      {/* Campaign History */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Campaign History</h3>
        {history.length > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Campaign</th><th>Brand</th><th>Platform</th><th style={{ textAlign: 'right' }}>Cost</th><th style={{ textAlign: 'right' }}>Views</th><th style={{ textAlign: 'right' }}>Engagement</th><th>Status</th></tr></thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} onClick={() => router.push(`/campaigns/${h.campaign_id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{h.campaign_name || '—'}</td>
                    <td>{h.brand || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{(h.platform || '').replace(/_/g, ' ')}</td>
                    <td style={{ textAlign: 'right' }} className="text-mono">{formatCurrency(h.quoted_cost)}</td>
                    <td style={{ textAlign: 'right' }} className="text-mono">{formatNumber(h.views)}</td>
                    <td style={{ textAlign: 'right' }} className="text-mono">{h.engagement_rate?.toFixed(2)}%</td>
                    <td><span className="badge badge-blue">{h.outcome || h.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 12 }}>No campaign history. This creator hasn't been used in any campaigns yet.</div>
        )}
      </div>

      {toast && <div className={`toast toast--${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
