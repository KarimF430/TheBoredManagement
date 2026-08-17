'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Upload, Plus, Search, Trash2, Edit3, FileText,
  CheckCircle, XCircle, AlertCircle, Loader2, Download,
  Filter, RefreshCw, Mail, Globe, Shield, Zap, Rocket
} from 'lucide-react'
import { StatusBadge, Toast, EmptyState, ErrorState, KPISkeleton } from '@/components/cp/CampaignUI'

interface Creator {
  id: string
  email: string
  name: string
  niche: string
  size_tier: string
  jurisdiction: string
  source: string
  raw_signals: Record<string, unknown>
  created_at: string
}

export default function OutreachCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const pageSize = 25

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadCreators = useCallback(async () => {
    try {
      const res = await fetch('/api/outreach/creators')
      const data = await res.json()
      if (data.error) setError(data.error)
      else setCreators(data.creators || [])
    } catch {
      setError('Failed to load creators')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCreators() }, [loadCreators])

  const filtered = creators.filter(c => {
    const matchSearch = !search ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.niche || '').toLowerCase().includes(search.toLowerCase())
    const matchTier = !filterTier || c.size_tier === filterTier
    return matchSearch && matchTier
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleAddCreator = async (creator: Partial<Creator>) => {
    try {
      const res = await fetch('/api/outreach/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creator),
      })
      const data = await res.json()
      if (data.error) showToast(data.error, 'error')
      else {
        showToast('Creator added')
        setShowAddModal(false)
        loadCreators()
      }
    } catch {
      showToast('Failed to add creator', 'error')
    }
  }

  const handleImportCSV = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/outreach/creators/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.error) showToast(data.error, 'error')
      else {
        showToast(`Imported ${data.imported} creators (${data.skipped} skipped)`)
        setShowImportModal(false)
        loadCreators()
      }
    } catch {
      showToast('Failed to import', 'error')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    try {
      await fetch('/api/outreach/creators/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      showToast(`Deleted ${selectedIds.size} creators`)
      setSelectedIds(new Set())
      loadCreators()
    } catch {
      showToast('Failed to delete', 'error')
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(paginated.map(c => c.id)))
  }

  if (loading) return <KPISkeleton />
  if (error) return <ErrorState title="Failed to load creators" description={error} onRetry={loadCreators} />

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">
            <span className="accent">Creators</span>
          </h1>
          <p className="page-subtitle">{creators.length} total · {filtered.length} showing</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowImportModal(true)} className="btn btn-ghost btn-sm">
            <Upload size={13} /> Import CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-blue btn-sm">
            <Plus size={13} /> Add Creator
          </button>
          {selectedIds.size > 0 && (
            <button onClick={() => setShowLaunchModal(true)} className="btn btn-green btn-sm">
              <Rocket size={13} /> Launch Campaign ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--blue-dim)' }}>
            <Mail size={16} style={{ color: 'var(--blue)' }} />
          </div>
          <div className="kpi-value">{creators.length}</div>
          <div className="kpi-label">Total Creators</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--green-dim)' }}>
            <Globe size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div className="kpi-value">{new Set(creators.map(c => c.niche).filter(Boolean)).size}</div>
          <div className="kpi-label">Niches</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--purple-light)' }}>
            <Zap size={16} style={{ color: 'var(--purple)' }} />
          </div>
          <div className="kpi-value">{creators.filter(c => c.size_tier === 'micro' || c.size_tier === 'nano').length}</div>
          <div className="kpi-label">Micro/Nano</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: selectedIds.size > 0 ? 'var(--red-dim)' : 'var(--bg-elevated)' }}>
            <Shield size={16} style={{ color: selectedIds.size > 0 ? 'var(--red)' : 'var(--text-muted)' }} />
          </div>
          <div className="kpi-value">{selectedIds.size}</div>
          <div className="kpi-label">Selected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search creators..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              style={{ paddingLeft: 28 }}
            />
          </div>
        </div>
        <select className="input" style={{ width: 140 }} value={filterTier} onChange={e => { setFilterTier(e.target.value); setPage(1) }}>
          <option value="">All Tiers</option>
          <option value="nano">Nano</option>
          <option value="micro">Micro</option>
          <option value="mid">Mid</option>
          <option value="macro">Macro</option>
        </select>
        {selectedIds.size > 0 && (
          <button onClick={handleDeleteSelected} className="btn btn-danger btn-sm">
            <Trash2 size={12} /> Delete ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrap" style={{ maxHeight: 500, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={selectedIds.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} />
                </th>
                <th>Email</th>
                <th>Name</th>
                <th>Niche</th>
                <th>Tier</th>
                <th>Jurisdiction</th>
                <th>Source</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: 'center' }}>
                    <EmptyState
                      icon={<Mail size={20} />}
                      title={creators.length === 0 ? 'No creators yet' : 'No matches'}
                      description={creators.length === 0 ? 'Add creators manually or import a CSV file to get started.' : 'Try adjusting your search or filters.'}
                      action={creators.length === 0 ? (
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <button onClick={() => setShowAddModal(true)} className="btn btn-blue btn-sm"><Plus size={12} /> Add Creator</button>
                          <button onClick={() => setShowImportModal(true)} className="btn btn-ghost btn-sm"><Upload size={12} /> Import CSV</button>
                        </div>
                      ) : undefined}
                    />
                  </td>
                </tr>
              ) : paginated.map(c => (
                <tr key={c.id} className={selectedIds.has(c.id) ? 'table-row selected' : ''}>
                  <td>
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} />
                  </td>
                  <td className="text-mono" style={{ fontSize: 11 }}>{c.email}</td>
                  <td style={{ fontWeight: 500 }}>{c.name || '—'}</td>
                  <td><span className="chip">{c.niche || '—'}</span></td>
                  <td>
                    <StatusBadge
                      status={c.size_tier || 'unknown'}
                      label={c.size_tier ? c.size_tier.charAt(0).toUpperCase() + c.size_tier.slice(1) : '—'}
                    />
                  </td>
                  <td><span className="chip">{c.jurisdiction || '—'}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.source || '—'}</td>
                  <td>
                    {c.raw_signals && Object.keys(c.raw_signals).length > 0 ? (
                      <span className="badge badge-blue">{Object.keys(c.raw_signals).length} signals</span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                if (p > totalPages) return null
                return (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                )
              })}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Creator Modal */}
      {showAddModal && <AddCreatorModal onClose={() => setShowAddModal(false)} onSubmit={handleAddCreator} />}

      {/* Import CSV Modal */}
      {showImportModal && <ImportCSVModal onClose={() => setShowImportModal(false)} onImport={handleImportCSV} fileInputRef={fileInputRef} />}

      {/* Launch Campaign Modal */}
      {showLaunchModal && (
        <LaunchCampaignModal
          selectedIds={Array.from(selectedIds)}
          creators={creators.filter(c => selectedIds.has(c.id))}
          onClose={() => setShowLaunchModal(false)}
          onLaunched={() => {
            setShowLaunchModal(false)
            setSelectedIds(new Set())
            showToast('Campaign launched! Check the Campaigns page for progress.')
          }}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}

function AddCreatorModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (c: Partial<Creator>) => void }) {
  const [form, setForm] = useState({ email: '', name: '', niche: '', size_tier: 'micro', jurisdiction: 'IN', source: 'manual' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email) return
    onSubmit(form)
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Add Creator</h3>
          <button onClick={onClose} className="btn-subtle btn-xs">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="section-title">Email *</label>
            <input className="input" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value.toLowerCase() })} placeholder="creator@example.com" />
          </div>
          <div>
            <label className="section-title">Name</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Creator name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="section-title">Niche</label>
              <input className="input" value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} placeholder="e.g. tech, beauty" />
            </div>
            <div>
              <label className="section-title">Size Tier</label>
              <select className="input" value={form.size_tier} onChange={e => setForm({ ...form, size_tier: e.target.value })}>
                <option value="nano">Nano</option>
                <option value="micro">Micro</option>
                <option value="mid">Mid</option>
                <option value="macro">Macro</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="section-title">Jurisdiction</label>
              <select className="input" value={form.jurisdiction} onChange={e => setForm({ ...form, jurisdiction: e.target.value })}>
                <option value="IN">India (IN)</option>
                <option value="US">United States (US)</option>
                <option value="UK">United Kingdom (UK)</option>
                <option value="EU">European Union (EU)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="section-title">Source</label>
              <input className="input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="e.g. manual, scraper" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-blue" style={{ flex: 1 }}>Add Creator</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ImportCSVModal({ onClose, onImport, fileInputRef }: { onClose: () => void; onImport: (f: File) => void; fileInputRef: React.RefObject<HTMLInputElement | null> }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) setFile(e.dataTransfer.files[0])
  }

  const handleImport = () => {
    if (file) onImport(file)
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Import Creators from CSV</h3>
          <button onClick={onClose} className="btn-subtle btn-xs">✕</button>
        </div>
        <div style={{ padding: 16 }}>
          {/* Format Info */}
          <div className="card" style={{ marginBottom: 16, background: 'var(--blue-dim)', borderColor: 'var(--blue-light)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 6 }}>Expected CSV Format</div>
            <code style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', display: 'block', whiteSpace: 'pre' }}>
{`email,name,niche,size_tier,jurisdiction,source
creator@email.com,John Doe,tech,micro,IN,manual
another@email.com,Jane Smith,beauty,nano,US,scraper`}
            </code>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              Required: <strong>email</strong> · Optional: name, niche, size_tier (nano/micro/mid/macro), jurisdiction, source
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--blue)' : 'var(--border-2)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: 32,
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--blue-dim)' : 'var(--bg-elevated)',
              transition: 'all 0.15s ease',
            }}
          >
            <Upload size={24} style={{ color: dragOver ? 'var(--blue)' : 'var(--text-muted)', marginBottom: 8 }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {file ? file.name : 'Drop CSV file here or click to browse'}
            </div>
            {file && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</div>}
            <input ref={fileInputRef as any} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleImport} disabled={!file} className="btn btn-blue" style={{ flex: 1, opacity: file ? 1 : 0.5 }}>
              <Upload size={12} /> Import
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LaunchCampaignModal({
  selectedIds,
  creators,
  onClose,
  onLaunched,
}: {
  selectedIds: string[]
  creators: Creator[]
  onClose: () => void
  onLaunched: () => void
}) {
  const [name, setName] = useState(`Campaign ${new Date().toLocaleDateString()}`)
  const [templateId, setTemplateId] = useState('')
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; tier: string; stage: string; subject: string }>>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
  const [launchResult, setLaunchResult] = useState<{ queued: number; skipped: number; invalid: number; suppressed: number } | null>(null)

  useEffect(() => {
    fetch('/api/outreach/templates')
      .then(r => r.json())
      .then(data => {
        setTemplates((data.templates || []).filter((t: any) => t.active))
        setLoadingTemplates(false)
      })
      .catch(() => setLoadingTemplates(false))
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setLaunching(true)
    try {
      // Create campaign
      const createRes = await fetch('/api/outreach/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          template_id: templateId || null,
          creator_ids: selectedIds,
        }),
      })
      const createData = await createRes.json()
      if (createData.error) {
        setToast({ msg: createData.error, type: 'error' })
        setLaunching(false)
        return
      }

      const campaignId = createData.campaign.id
      setCreatedCampaignId(campaignId)

      // Launch if template is selected
      if (templateId) {
        const launchRes = await fetch(`/api/outreach/campaigns/${campaignId}/launch`, { method: 'POST' })
        const launchData = await launchRes.json()
        if (launchData.error) {
          setToast({ msg: launchData.error, type: 'error' })
          setLaunching(false)
          return
        }
        setLaunchResult(launchData.enqueue)
      }

      onLaunched()
    } catch {
      setToast({ msg: 'Failed to create campaign', type: 'error' })
    } finally {
      setLaunching(false)
    }
  }

  const selectedTemplate = templates.find(t => t.id === templateId)

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Launch Campaign</h3>
          <button onClick={onClose} className="btn-subtle btn-xs">✕</button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Selected Creators Summary */}
          <div className="card" style={{ background: 'var(--blue-dim)', borderColor: 'var(--blue-light)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>
              {selectedIds.length} Creator{selectedIds.length !== 1 ? 's' : ''} Selected
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
              {creators.slice(0, 5).map(c => c.email).join(', ')}
              {creators.length > 5 && ` ... +${creators.length - 5} more`}
            </div>
          </div>

          {/* Campaign Name */}
          <div>
            <label className="section-title">Campaign Name *</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Batch 1 - Tech Creators"
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="section-title">Email Template</label>
            {loadingTemplates ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loading templates...</div>
            ) : templates.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                No active templates.{' '}
                <Link href="/outreach/templates" style={{ color: 'var(--blue)' }}>Create one first</Link>
              </div>
            ) : (
              <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                <option value="">— Select a template (optional) —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.tier} · {t.stage})</option>
                ))}
              </select>
            )}
            {selectedTemplate && (
              <div className="card" style={{ marginTop: 8, background: 'var(--bg-elevated)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Subject Preview</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedTemplate.subject}</div>
              </div>
            )}
          </div>

          {/* Launch Result */}
          {launchResult && (
            <div className="card" style={{ background: 'var(--green-dim)', borderColor: 'var(--green)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>Launch Result</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Queued: {launchResult.queued} · Skipped: {launchResult.skipped} · Invalid: {launchResult.invalid} · Suppressed: {launchResult.suppressed}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || launching}
              className="btn btn-green"
              style={{ flex: 1, opacity: (!name.trim() || launching) ? 0.5 : 1 }}
            >
              {launching ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Rocket size={12} />}
              {launching ? 'Creating...' : 'Create & Launch'}
            </button>
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Campaigns without a template are saved as drafts. You can assign a template and launch later from the Campaigns page.
          </div>
        </div>

        {toast && <Toast message={toast.msg} type={toast.type} />}
      </div>
    </div>
  )
}
