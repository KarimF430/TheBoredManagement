'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, AlertCircle, Search, BadgeCheck, RefreshCw } from 'lucide-react'
import { formatNumber } from '@/components/cp/CampaignUI'

interface ScrapedProfile {
  id: string
  handle: string
  full_name: string | null
  bio: string | null
  profile_pic_url: string | null
  is_verified: boolean
  is_private: boolean
  is_business: boolean
  followers: number
  following: number
  posts_count: number
  avg_views: number
  avg_likes: number
  avg_comments: number
  engagement_rate: number
  email: string | null
  phone: string | null
  website: string | null
  category: string | null
  status: string
  created_at: string
}

export default function RawProfiles() {
  const [profiles, setProfiles] = useState<ScrapedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper?action=results')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProfiles(data.profiles || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProfiles() }, [loadProfiles])

  const getPass1 = (p: ScrapedProfile): { pass: boolean; reason: string } => {
    if (p.followers < 5000) return { pass: false, reason: `Followers ${formatNumber(p.followers)} < 5K` }
    if (p.followers > 2000000) return { pass: false, reason: `Followers > 2M` }
    if (p.posts_count < 10) return { pass: false, reason: `Only ${p.posts_count} posts` }
    const ratio = p.following > 0 ? p.followers / p.following : 999
    if (ratio < 5) return { pass: false, reason: `F/F ratio ${ratio.toFixed(1)} < 5` }
    if (p.is_private) return { pass: false, reason: 'Private account' }
    const hasBio = (p.bio?.length || 0) > 15
    if (!hasBio && !p.is_business) return { pass: false, reason: 'No bio, not business' }
    return { pass: true, reason: '' }
  }

  const getPass2 = (p: ScrapedProfile): { pass: boolean; reason: string } => {
    if (p.followers === 0 || p.avg_views === 0) return { pass: false, reason: 'No views data' }
    const ratio = p.avg_views / p.followers
    let threshold = 0.30
    if (p.followers >= 10000) threshold = 0.40
    if (p.followers >= 50000) threshold = 0.20
    if (p.followers >= 500000) threshold = 0.10
    if (ratio < threshold) return { pass: false, reason: `Views ${(ratio * 100).toFixed(1)}% < ${(threshold * 100).toFixed(0)}%` }
    return { pass: true, reason: '' }
  }

  const getTier = (followers: number): string => {
    if (followers < 10000) return 'nano'
    if (followers < 50000) return 'micro'
    if (followers < 500000) return 'mid'
    if (followers < 1000000) return 'macro'
    return 'mega'
  }

  const filtered = useMemo(() => {
    let result = profiles
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        `${p.handle} ${p.full_name || ''} ${p.email || ''} ${p.category || ''}`.toLowerCase().includes(q)
      )
    }
    if (statusFilter) {
      result = result.filter(p => p.status === statusFilter)
    }
    if (tierFilter) {
      result = result.filter(p => getTier(p.followers) === tierFilter)
    }
    return result
  }, [profiles, search, statusFilter, tierFilter])

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
            <span className="accent">Raw</span> Profiles
          </h1>
          <p className="page-subtitle">
            All scraped profiles with Pass 1 (profile) and Pass 2 (post analysis) filter results
          </p>
        </div>
        <button onClick={loadProfiles} className="btn btn-ghost btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search handle, name, email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 120 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="raw">Raw</option>
          <option value="filtered">Filtered</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="input" style={{ width: 'auto', minWidth: 110 }} value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
          <option value="">All Tiers</option>
          <option value="nano">Nano (&lt;10K)</option>
          <option value="micro">Micro (10-50K)</option>
          <option value="mid">Mid (50-500K)</option>
          <option value="macro">Macro (500K-1M)</option>
          <option value="mega">Mega (1M+)</option>
        </select>
      </div>

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
          <div className="state-panel__title">No profiles yet</div>
          <div className="state-panel__desc">Start a scrape job to discover creators.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Showing {filtered.length} of {profiles.length} profiles
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Followers</th>
                  <th>Avg Views</th>
                  <th>Engagement</th>
                  <th>Pass 1</th>
                  <th>Pass 2</th>
                  <th>Tier</th>
                  <th>Email</th>
                  <th>Category</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const pass1 = getPass1(p)
                  const pass2 = getPass2(p)
                  const tier = getTier(p.followers)
                  const tierColors: Record<string, string> = { nano: '#97A0AF', micro: '#00875A', mid: '#0052CC', macro: '#FF8B00', mega: '#DE350B' }
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700 }}>
                            {p.full_name?.charAt(0) || p.handle.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>
                              {p.is_verified && <BadgeCheck size={12} style={{ color: 'var(--blue)', marginRight: 4, display: 'inline' }} />}
                              @{p.handle}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.full_name || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatNumber(p.followers)}</td>
                      <td>{p.avg_views > 0 ? formatNumber(p.avg_views) : '—'}</td>
                      <td>{p.engagement_rate > 0 ? `${p.engagement_rate.toFixed(1)}%` : '—'}</td>
                      <td>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: pass1.pass ? 'var(--green-dim)' : 'var(--red-dim)', color: pass1.pass ? 'var(--green)' : 'var(--red)' }}>
                          {pass1.pass ? '✓' : pass1.reason}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: p.avg_views === 0 ? 'var(--bg-elevated)' : pass2.pass ? 'var(--green-dim)' : 'var(--red-dim)', color: p.avg_views === 0 ? 'var(--text-muted)' : pass2.pass ? 'var(--green)' : 'var(--red)' }}>
                          {p.avg_views === 0 ? 'No data' : pass2.pass ? '✓' : pass2.reason}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: `${tierColors[tier]}15`, color: tierColors[tier] }}>
                          {tier}
                        </span>
                      </td>
                      <td>
                        {p.email ? (
                          <span style={{ fontSize: 11, color: 'var(--green)' }}>{p.email}</span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          {p.category || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: p.status === 'filtered' ? 'var(--green-dim)' : p.status === 'rejected' ? 'var(--red-dim)' : 'var(--blue-dim)', color: p.status === 'filtered' ? 'var(--green)' : p.status === 'rejected' ? 'var(--red)' : 'var(--blue)' }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
