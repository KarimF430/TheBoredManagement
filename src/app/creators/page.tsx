'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Plus, Search, Filter, Upload, ChevronDown, ExternalLink,
  Video, Camera, Star, TrendingUp, Eye, ArrowUpDown, Loader2, X,
  ArrowUpFromLine
} from 'lucide-react'
import { formatNumber } from '@/components/cp/CampaignUI'

interface Creator {
  id: string; name: string; email: string | null; phone: string | null
  youtube_url: string | null; youtube_handle: string | null
  instagram_url: string | null; instagram_handle: string | null
  niche: string[]; subscribers: number; avg_views: number; avg_engagement: number
  tier: string; status: string; rate_card: Record<string, number>; notes: string | null
  country: string | null; created_at: string
}

const NICHES = ['Technology', 'Gaming', 'Beauty', 'Fashion', 'Food', 'Travel', 'Fitness', 'Education', 'Entertainment', 'Lifestyle', 'Finance', 'Health', 'Automotive', 'Music', 'Comedy', 'News', 'Science', 'Parenting']
const TIERS = ['nano', 'micro', 'mid', 'macro', 'mega']
const TIER_COLORS: Record<string, string> = { nano: '#97A0AF', micro: '#00875A', mid: '#0052CC', macro: '#FF8B00', mega: '#DE350B' }

export default function CreatorDatabasePage() {
  const router = useRouter()
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [nicheFilter, setNicheFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [sort, setSort] = useState('name')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', youtube_url: '', instagram_url: '', niche: [] as string[], subscribers: '', avg_views: '', avg_engagement: '', tier: 'micro', notes: '' })
  const [saving, setSaving] = useState(false)
  const [bridging, setBridging] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const fetchCreators = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (nicheFilter) params.set('niche', nicheFilter)
      if (tierFilter) params.set('tier', tierFilter)
      params.set('sort', sort)
      params.set('page', page.toString())
      const res = await fetch(`/api/creators/pool?${params}`)
      const data = await res.json()
      setCreators(data.creators || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch { showToast('Failed to load creators', 'error') }
    finally { setLoading(false) }
  }, [search, nicheFilter, tierFilter, sort, page])

  useEffect(() => { fetchCreators() }, [fetchCreators])

  const handlePushToOutreach = async () => {
    setBridging(true)
    try {
      const res = await fetch('/api/outreach/creators/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'crm' }),
      })
      const data = await res.json()
      if (data.error) showToast(data.error, 'error')
      else showToast(`Pushed ${data.pushed} creators to Outreach (${data.skipped} already exist)`)
    } catch {
      showToast('Failed to push to outreach', 'error')
    } finally {
      setBridging(false)
    }
  }

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/creators/pool', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subscribers: parseInt(form.subscribers) || 0, avg_views: parseInt(form.avg_views) || 0, avg_engagement: parseFloat(form.avg_engagement) || 0 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showToast('Creator added to database')
      setShowAdd(false)
      setForm({ name: '', email: '', phone: '', youtube_url: '', instagram_url: '', niche: [], subscribers: '', avg_views: '', avg_engagement: '', tier: 'micro', notes: '' })
      fetchCreators()
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : 'Failed', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="anim-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="accent">Creator</span> Database</h1>
          <p className="page-subtitle">{total} creators in your pool</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePushToOutreach} disabled={bridging} className="btn btn-ghost btn-sm">
            {bridging ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowUpFromLine size={14} />}
            Push to Outreach
          </button>
          <button onClick={() => setShowImport(true)} className="btn btn-ghost btn-sm"><Upload size={14} /> Import</button>
          <button onClick={() => setShowAdd(true)} className="btn btn-blue btn-sm"><Plus size={14} /> Add Creator</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 400 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search by name, handle, email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ paddingLeft: 32 }} />
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 140 }} value={nicheFilter} onChange={e => { setNicheFilter(e.target.value); setPage(1) }}>
          <option value="">All Niches</option>
          {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', minWidth: 120 }} value={tierFilter} onChange={e => { setTierFilter(e.target.value); setPage(1) }}>
          <option value="">All Tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', minWidth: 140 }} value={sort} onChange={e => setSort(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="subscribers">Sort by Followers</option>
          <option value="avg_views">Sort by Avg Views</option>
          <option value="engagement">Sort by Engagement</option>
          <option value="created">Sort by Recently Added</option>
        </select>
      </div>

      {/* Creator Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} /></div>
      ) : creators.length === 0 ? (
        <div className="state-panel">
          <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div className="state-panel__title">No creators found</div>
          <div className="state-panel__desc">Add creators to build your reusable database.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {creators.map(c => (
            <div key={c.id} onClick={() => router.push(`/creators/${c.id}`)} className="card-interactive" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius)', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {c.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {c.youtube_handle && <span style={{ fontSize: 11, color: '#FF0000', display: 'flex', alignItems: 'center', gap: 2 }}><Video size={10} />{c.youtube_handle}</span>}
                    {c.instagram_handle && <span style={{ fontSize: 11, color: '#E4405F', display: 'flex', alignItems: 'center', gap: 2 }}><Camera size={10} />{c.instagram_handle}</span>}
                  </div>
                </div>
                <span className="badge" style={{ background: `${TIER_COLORS[c.tier] || '#97A0AF'}15`, color: TIER_COLORS[c.tier] || '#97A0AF' }}>{c.tier}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>{formatNumber(c.subscribers)} followers</span>
                <span>{formatNumber(c.avg_views)} avg views</span>
                <span style={{ color: c.avg_engagement > 5 ? 'var(--green)' : 'var(--text-muted)' }}>{c.avg_engagement}% eng</span>
              </div>
              {c.niche.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {c.niche.slice(0, 3).map(n => <span key={n} className="badge badge-gray" style={{ fontSize: 10 }}>{n}</span>)}
                  {c.niche.length > 3 && <span className="badge badge-gray" style={{ fontSize: 10 }}>+{c.niche.length - 3}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 20 }}>
          <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span style={{ padding: '0 12px', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Page {page} of {totalPages}</span>
          <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {/* Add Creator Drawer */}
      {showAdd && (
        <div className="drawer-overlay" onClick={() => setShowAdd(false)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()} style={{ animation: 'slideIn 0.2s ease' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Add Creator</h2>
              <button onClick={() => setShowAdd(false)} className="btn-subtle"><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><label style={labelStyle}>Name *</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Phone</label><input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div><label style={labelStyle}>YouTube URL</label><input className="input" placeholder="https://youtube.com/@..." value={form.youtube_url} onChange={e => setForm(p => ({ ...p, youtube_url: e.target.value }))} /></div>
                <div><label style={labelStyle}>Instagram URL</label><input className="input" placeholder="https://instagram.com/..." value={form.instagram_url} onChange={e => setForm(p => ({ ...p, instagram_url: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Subscribers</label><input className="input" type="number" value={form.subscribers} onChange={e => setForm(p => ({ ...p, subscribers: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Avg Views</label><input className="input" type="number" value={form.avg_views} onChange={e => setForm(p => ({ ...p, avg_views: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Engagement %</label><input className="input" type="number" step="0.01" value={form.avg_engagement} onChange={e => setForm(p => ({ ...p, avg_engagement: e.target.value }))} /></div>
                </div>
                <div><label style={labelStyle}>Tier</label>
                  <select className="input" value={form.tier} onChange={e => setForm(p => ({ ...p, tier: e.target.value }))}>
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Niche</label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {NICHES.map(n => (
                      <button key={n} onClick={() => setForm(p => ({ ...p, niche: p.niche.includes(n) ? p.niche.filter(x => x !== n) : [...p.niche, n] }))}
                        className={`badge ${form.niche.includes(n) ? 'badge-blue' : 'badge-gray'}`} style={{ cursor: 'pointer', fontSize: 10 }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div><label style={labelStyle}>Notes</label><textarea className="textarea" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowAdd(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !form.name.trim()} className="btn btn-blue btn-sm">
                {saving ? 'Saving...' : 'Add Creator'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <div className="drawer-overlay" onClick={() => setShowImport(false)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()} style={{ animation: 'slideIn 0.2s ease', width: 480 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Import Creators from CSV</h2>
              <button onClick={() => setShowImport(false)} className="btn-subtle"><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 6 }}>Expected CSV Format</div>
                <code style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', display: 'block', whiteSpace: 'pre', background: 'var(--bg-elevated)', padding: 10, borderRadius: 'var(--radius)' }}>
{`name,email,youtube_url,instagram_url,subscribers,avg_views,avg_engagement,tier,niche,notes
John,john@example.com,https://youtube.com/@john,,15000,5000,4.2,micro,"Technology;Gaming",Great fit
Jane,jane@example.com,,,85000,20000,6.1,mid,"Beauty;Fashion",`}
                </code>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                  Required: <strong>email</strong> · Optional: name, youtube_url, instagram_url, subscribers, avg_views, avg_engagement, tier, niche (semicolon-separated), notes
                </div>
              </div>
              <CSVImportHelper onSuccess={() => { setShowImport(false); fetchCreators(); showToast('Creators imported successfully'); }} onError={(msg) => showToast(msg, 'error')} />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast--${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  )
}

function CSVImportHelper({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/creators/import-csv', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) onError(data.error)
      else onSuccess()
    } catch {
      onError('Failed to import CSV')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length > 0) setFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--blue)' : 'var(--border-2)'}`,
          borderRadius: 'var(--radius)',
          padding: 32,
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--blue-dim)' : 'var(--bg-elevated)',
          transition: 'all 0.15s ease',
        }}
      >
        <Upload size={24} style={{ color: dragOver ? 'var(--blue)' : 'var(--text-muted)', marginBottom: 8 }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-bright)' }}>
          {file ? file.name : 'Drop CSV file here or click to browse'}
        </div>
        {file && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</div>}
        <input ref={fileRef as any} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={() => setFile(null)} className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled={!file}>Clear</button>
        <button onClick={handleImport} disabled={!file || importing} className="btn btn-blue btn-sm" style={{ flex: 1, opacity: !file || importing ? 0.5 : 1 }}>
          {importing ? 'Importing...' : 'Import'}
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.4px' }
