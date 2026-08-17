'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, AlertCircle, Search, BadgeCheck, RefreshCw, Send, Check, Loader } from 'lucide-react'
import { formatNumber } from '@/components/cp/CampaignUI'

interface FilteredCreator {
  id: string
  handle: string
  full_name: string | null
  bio: string | null
  profile_pic_url: string | null
  is_verified: boolean
  followers: number
  following: number
  posts_count: number
  avg_views: number
  avg_likes: number
  avg_comments: number
  engagement_rate: number
  views_to_followers_ratio: number
  email: string | null
  phone: string | null
  website: string | null
  category: string | null
  tier: string
  score_passed: boolean
  outreach_status: string
  created_at: string
}

interface Campaign {
  id: string
  name: string
  brand: string
  status: string
}

const TIER_COLORS: Record<string, string> = { nano: '#97A0AF', micro: '#00875A', mid: '#0052CC', macro: '#FF8B00', mega: '#DE350B' }

export default function FilteredCreators() {
  const [creators, setCreators] = useState<FilteredCreator[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [outreachFilter, setOutreachFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [creatorsRes, campaignsRes] = await Promise.all([
        fetch('/api/scraper?action=filtered'),
        fetch('/api/campaigns'),
      ])
      const [creatorsData, campaignsData] = await Promise.all([
        creatorsRes.json(),
        campaignsRes.json().catch(() => ({ campaigns: [] })),
      ])
      if (creatorsData.error) throw new Error(creatorsData.error)
      setCreators(creatorsData.creators || [])
      setCampaigns(campaignsData?.campaigns || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => {
    let result = creators
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        `${c.handle} ${c.full_name || ''} ${c.email || ''} ${c.category || ''}`.toLowerCase().includes(q)
      )
    }
    if (tierFilter) result = result.filter(c => c.tier === tierFilter)
    if (outreachFilter) result = result.filter(c => c.outreach_status === outreachFilter)
    return result
  }, [creators, search, tierFilter, outreachFilter])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(c => c.id)))
  }

  const importToCampaign = async () => {
    if (!selectedCampaignId || selectedIds.size === 0) return
    setImporting(true)
    try {
      const res = await fetch(`/api/campaigns/${selectedCampaignId}/creators/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert(`Imported ${data.imported} creators`)
      setSelectedIds(new Set())
      setShowImport(false)
      setSelectedCampaignId('')
      loadData()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to import')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} />
      </div>
    )
  }

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="accent">Filtered</span> Creators
          </h1>
          <p className="page-subtitle">
            Creators that passed both filters — ready for campaign import
          </p>
        </div>
        <button onClick={loadData} className="btn btn-ghost btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search handle, name, email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 110 }} value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
          <option value="">All Tiers</option>
          <option value="nano">Nano</option>
          <option value="micro">Micro</option>
          <option value="mid">Mid</option>
          <option value="macro">Macro</option>
          <option value="mega">Mega</option>
        </select>
        <select className="input" style={{ width: 'auto', minWidth: 140 }} value={outreachFilter} onChange={e => setOutreachFilter(e.target.value)}>
          <option value="">All Outreach</option>
          <option value="not_contacted">Not Contacted</option>
          <option value="contacted">Contacted</option>
          <option value="interested">Interested</option>
          <option value="negotiating">Negotiating</option>
          <option value="booked">Booked</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Selection Bar */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: 'var(--glass-bg-heavy)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)' }}>
          <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={selectAll} style={{ cursor: 'pointer', accentColor: 'var(--blue)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </span>
          {selectedIds.size > 0 && (
            <>
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowImport(!showImport)} className="btn btn-blue btn-sm" style={{ gap: 4 }}>
                <Send size={12} /> Add to Campaign
              </button>
            </>
          )}
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <div style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--blue-dim)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Import to:</span>
          <select className="input" style={{ width: 'auto', minWidth: 200 }} value={selectedCampaignId} onChange={e => setSelectedCampaignId(e.target.value)}>
            <option value="">Select campaign...</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.brand}</option>
            ))}
          </select>
          <button onClick={importToCampaign} disabled={!selectedCampaignId || importing} className="btn btn-green btn-sm">
            {importing ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
            {importing ? 'Importing...' : 'Confirm'}
          </button>
          <button onClick={() => { setShowImport(false); setSelectedCampaignId('') }} className="btn btn-ghost btn-sm">Cancel</button>
        </div>
      )}

      {error && (
        <div className="state-panel" style={{ maxWidth: 500, marginBottom: 16 }}>
          <AlertCircle size={28} style={{ color: 'var(--red)', marginBottom: 10 }} />
          <div className="state-panel__title">Failed to load</div>
          <div className="state-panel__desc">{error}</div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="state-panel">
          <BadgeCheck size={30} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div className="state-panel__title">No filtered creators</div>
          <div className="state-panel__desc">Creators that pass both filters will appear here.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Showing {filtered.length} of {creators.length} filtered creators
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <th>Creator</th>
                  <th>Followers</th>
                  <th>Avg Views</th>
                  <th>Views/Fol</th>
                  <th>Engagement</th>
                  <th>Email</th>
                  <th>Tier</th>
                  <th>Outreach</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => toggleSelect(c.id)} style={{ cursor: 'pointer', background: selectedIds.has(c.id) ? 'var(--blue-dim)' : undefined }}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: 'var(--blue)' }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius)', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700 }}>
                          {c.full_name?.charAt(0) || c.handle.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>
                            {c.is_verified && <BadgeCheck size={12} style={{ color: 'var(--blue)', marginRight: 4, display: 'inline' }} />}
                            @{c.handle}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.full_name || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatNumber(c.followers)}</td>
                    <td>{formatNumber(c.avg_views)}</td>
                    <td>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: 'var(--green-dim)', color: 'var(--green)' }}>
                        {(c.views_to_followers_ratio * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: 'var(--green-dim)', color: 'var(--green)' }}>
                        {c.engagement_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      {c.email ? (
                        <span style={{ fontSize: 11, color: 'var(--green)' }}>{c.email}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: `${TIER_COLORS[c.tier] || '#97A0AF'}15`, color: TIER_COLORS[c.tier] || '#97A0AF' }}>
                        {c.tier || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {c.outreach_status || 'not_contacted'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
