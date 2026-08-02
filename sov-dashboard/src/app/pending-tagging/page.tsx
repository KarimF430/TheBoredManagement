'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Video, Search, ExternalLink, ChevronLeft, ChevronRight, Tag, Brain, AlertCircle, Check, Loader2, Filter, Info, Eye, TrendingUp, ArrowUpDown, RefreshCw } from 'lucide-react'
import { useCampaignStore } from '@/lib/store'
import { useFilterStore } from '@/lib/filter-store'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ErrorState } from '@/components/StateViews'

interface PendingVideo {
  id: string
  youtube_id: string
  title: string
  channel_name: string
  view_count: number
  tags: string[]
  thumbnail_url: string
  published_at: string
  discovered_at: string
  best_rank: number
  keyword_names: string[]
  keyword_count: number
}

function fmt(n: number): string {
  if (n == null || isNaN(n)) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function fmtDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } }
const stagger = { show: { transition: { staggerChildren: 0.06 } } }

const PER_PAGE = 20

export default function PendingTaggingPage() {
  const { campaigns, activeCampaignId, fetchCampaigns } = useCampaignStore()
  const { format, ownership } = useFilterStore()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set())
  const [tagModal, setTagModal] = useState<{ videoId: string; youtubeId: string; title: string; brands: string[] } | null>(null)
  const [manualTag, setManualTag] = useState('')
  const [tagSaving, setTagSaving] = useState(false)
  const [campaignBrands, setCampaignBrands] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'views' | 'rank' | 'date'>('views')

  const pendingQuery = useQuery({
    queryKey: ['pending-tagging', activeCampaignId, page, search, format, ownership, sortBy],
    queryFn: async () => {
      if (!activeCampaignId) return { data: [], total: 0 }
      const params = new URLSearchParams({
        campaign_id: activeCampaignId,
        page: String(page),
        limit: String(PER_PAGE),
        sort: sortBy,
      })
      if (search) params.set('q', search)
      if (format !== 'all') params.set('format', format)
      if (ownership !== 'all') params.set('is_ours', ownership === 'ours' ? 'true' : 'false')
      const res = await fetch(`/api/videos/pending-tagging?${params}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      return json as { data: PendingVideo[]; total: number }
    },
    enabled: !!activeCampaignId,
  })

  const data = pendingQuery.data?.data ?? []
  const total = pendingQuery.data?.total ?? 0
  const loading = pendingQuery.isLoading
  const error = pendingQuery.error ? (pendingQuery.error as Error).message : ''

  const fetchBrands = useCallback(async (campId: string) => {
    try {
      const res = await fetch(`/api/brands?campaign_id=${campId}`)
      const d = await res.json()
      if (d.data) setCampaignBrands(d.data.map((b: any) => b.brand_name ?? b.name))
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])
  useEffect(() => { if (activeCampaignId) fetchBrands(activeCampaignId) }, [activeCampaignId, fetchBrands])
  useEffect(() => { setPage(1) }, [search, format, ownership, sortBy])

  const totalPages = Math.ceil(total / PER_PAGE)

  const totalViews = useMemo(() => data.reduce((s: number, v: PendingVideo) => s + (v.view_count || 0), 0), [data])
  const avgRank = useMemo(() => {
    if (!data.length) return 0
    return Math.round(data.reduce((s: number, v: PendingVideo) => s + (v.best_rank || 0), 0) / data.length)
  }, [data])

  async function handleSaveTag(videoId: string) {
    if (!activeCampaignId || !manualTag.trim()) return
    setTagSaving(true)
    try {
      await fetch('/api/brands/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, brand_name: manualTag.trim(), campaign_id: activeCampaignId }),
      })
      setManualTag('')
      setTagModal(null)
      pendingQuery.refetch()
    } catch (err) {
      console.error('Tag save error:', err)
    } finally {
      setTagSaving(false)
    }
  }

  async function handleAiAnalyze(videoId: string) {
    if (!activeCampaignId) return
    setAnalyzing(prev => new Set(prev).add(videoId))
    try {
      const res = await fetch('/api/brands/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_ids: [videoId], campaign_id: activeCampaignId, force: false }),
      })
      const json = await res.json()
      const analysis = json.results?.[0]
      if (analysis?.status === 'analyzed' && analysis.high_confidence_brands?.length > 0) {
        setTagModal(prev => prev ? { ...prev, brands: analysis.high_confidence_brands } : null)
      } else {
        setTagModal(prev => prev ? { ...prev, brands: [] } : null)
      }
      pendingQuery.refetch()
    } catch (err) {
      console.error('AI analyze error:', err)
    } finally {
      setAnalyzing(prev => { const n = new Set(prev); n.delete(videoId); return n })
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px 60px' }}>

      {/* Header */}
      <motion.div initial="hidden" animate="show" variants={stagger} style={{ marginBottom: 24 }}>
        <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title" style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--danger)' }}>Pending</span> Tagging
            </h1>
            <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', margin: 0 }}>
              Top-ranked videos that haven&apos;t been tagged with a brand yet.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {total} video{total !== 1 ? 's' : ''} need brands
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Metric Cards */}
      <motion.div initial="hidden" animate="show" variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'UNTAGGED VIDEOS', value: String(total), icon: AlertCircle, color: 'var(--danger)', info: 'Videos ranked in search but missing brand tags' },
          { label: 'TOTAL VIEWS', value: fmt(totalViews), icon: Eye, color: 'var(--accent)', info: 'Combined views across all untagged videos' },
          { label: 'AVG BEST RANK', value: String(avgRank || '—'), icon: TrendingUp, color: 'var(--success)', info: 'Average best rank position of untagged videos' },
          { label: 'CAMPAIGN BRANDS', value: String(campaignBrands.length), icon: Tag, color: 'var(--info)', info: 'Brands available for tagging' },
        ].map((m, i) => (
          <motion.div key={m.label} variants={fadeUp} className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <m.icon size={12} style={{ color: m.color, flexShrink: 0 }} />
                <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{m.label}</span>
              </div>
              <div style={{ color: 'var(--neutral-300)', cursor: 'help', flexShrink: 0 }} title={m.info}><Info size={10} /></div>
            </div>
            <div className="kpi-value" style={{ fontFamily: 'var(--font-mono)', marginTop: 8 }}>{m.value}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 34, height: 36 }}
            placeholder="Search by title or channel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', background: 'var(--bg-base)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
          {([
            { value: 'views', label: 'Views' },
            { value: 'rank', label: 'Rank' },
            { value: 'date', label: 'Date' },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
              padding: '6px 12px', fontSize: 'var(--fs-label)', fontWeight: 600,
              background: sortBy === opt.value ? 'var(--accent)' : 'transparent',
              color: sortBy === opt.value ? 'var(--on-accent)' : 'var(--text-secondary)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-secondary)' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Loading…
        </div>
      ) : error ? (
        <ErrorState title={error} />
      ) : data.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 60, background: 'var(--surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--success-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Check size={28} style={{ color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>All caught up!</div>
          <div style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)' }}>No pending videos need tagging.</div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Video</th>
                    <th>Channel</th>
                    <th style={{ textAlign: 'right' }}>Views</th>
                    <th style={{ textAlign: 'center' }}>Rank</th>
                    <th>Keywords</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((v: PendingVideo) => (
                    <tr key={v.id}>
                      <td style={{ maxWidth: 380 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Link href={`/video/${v.youtube_id}`} style={{ flexShrink: 0, display: 'block', width: 80, height: 45, borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)', overflow: 'hidden' }}>
                            <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </Link>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Link href={`/video/${v.youtube_id}`} style={{
                              fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-bright)', textDecoration: 'none', lineHeight: 1.4,
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            } as React.CSSProperties}>
                              {v.title || 'Untitled'}
                            </Link>
                            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2 }}>Added {fmtDate(v.discovered_at)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.channel_name || '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-bright)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
                        {fmt(v.view_count)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: 28, height: 22, borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-label)', fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          background: v.best_rank <= 3 ? 'rgba(26,115,232,0.1)' : v.best_rank <= 5 ? 'rgba(255,109,0,0.08)' : 'var(--bg-elevated)',
                          color: v.best_rank <= 3 ? 'var(--accent)' : v.best_rank <= 5 ? 'var(--warning)' : 'var(--text-secondary)',
                        }}>
                          {v.best_rank}
                        </span>
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          {v.keyword_names.slice(0, 2).map((kw: string) => (
                            <span key={kw} className="badge badge-gray">{kw}</span>
                          ))}
                          {v.keyword_count > 2 && (
                            <span style={{ fontSize: 'var(--fs-caption)', fontWeight: 600, color: 'var(--text-muted)' }}>+{v.keyword_count - 2}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleAiAnalyze(v.id)}
                            disabled={analyzing.has(v.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--info-border)', background: 'var(--info-dim)',
                              color: 'var(--info)', fontSize: 'var(--fs-label)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                              opacity: analyzing.has(v.id) ? 0.6 : 1,
                            }}
                          >
                            {analyzing.has(v.id) ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Brain size={11} />}
                            AI
                          </button>
                          <button
                            onClick={() => setTagModal({ videoId: v.id, youtubeId: v.youtube_id, title: v.title, brands: [] })}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--accent-border)', background: 'var(--accent-dim)',
                              color: 'var(--accent)', fontSize: 'var(--fs-label)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            <Tag size={11} /> Tag
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Page {page} of {totalPages}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Tag Modal */}
      {tagModal && (
        <div className="modal-scrim" style={{ backdropFilter: 'blur(4px)' }} onClick={() => { setTagModal(null); setManualTag('') }}>
          <div className="modal-panel" style={{ width: 480, maxWidth: '90vw', boxShadow: 'var(--shadow-modal)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Tag Video</h3>
              <button onClick={() => { setTagModal(null); setManualTag('') }} className="modal-close" style={{ fontSize: 18 }}>×</button>
            </div>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>{tagModal.title}</p>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                value={manualTag}
                onChange={e => setManualTag(e.target.value)}
                placeholder="Enter brand name..."
                onKeyDown={e => { if (e.key === 'Enter') handleSaveTag(tagModal.videoId) }}
                style={{ flex: 1, height: 38 }}
              />
              <button
                onClick={() => handleSaveTag(tagModal.videoId)}
                disabled={tagSaving || !manualTag.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 'var(--fs-sm)', fontWeight: 700,
                  cursor: manualTag.trim() ? 'pointer' : 'default', opacity: manualTag.trim() ? 1 : 0.5,
                  fontFamily: 'inherit',
                }}
              >
                {tagSaving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {tagSaving ? 'Saving...' : 'Save'}
              </button>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleAiAnalyze(tagModal.videoId)}
                disabled={analyzing.has(tagModal.videoId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--info-border)', background: 'var(--info-dim)',
                  color: 'var(--info)', fontSize: 'var(--fs-sm)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {analyzing.has(tagModal.videoId)
                  ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
                  : <><Brain size={12} /> AI Analyze</>
                }
              </button>
            </div>

            {tagModal.brands.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="field-label">AI Detected</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tagModal.brands.map(b => (
                    <button key={b} onClick={() => setManualTag(b)} style={{
                      cursor: 'pointer', fontSize: 'var(--fs-label)', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                      border: manualTag === b ? '1.5px solid var(--info)' : '1px solid var(--border-2)',
                      background: manualTag === b ? 'var(--info-dim)' : 'var(--bg-elevated)',
                      color: manualTag === b ? 'var(--info)' : 'var(--text-secondary)', fontFamily: 'inherit',
                    }}>{b}</button>
                  ))}
                </div>
              </div>
            )}

            {campaignBrands.length > 0 && !tagModal.brands.length && (
              <div style={{ marginTop: 12 }}>
                <div className="field-label">Campaign Brands</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {campaignBrands.slice(0, 8).map(b => (
                    <button key={b} onClick={() => setManualTag(b)} style={{
                      cursor: 'pointer', fontSize: 'var(--fs-label)', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                      border: manualTag === b ? '1.5px solid var(--accent)' : '1px solid var(--border-2)',
                      background: manualTag === b ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                      color: manualTag === b ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: 'inherit',
                    }}>{b}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
              <a href={`https://youtube.com/watch?v=${tagModal.youtubeId}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-label)', color: 'var(--text-muted)', textDecoration: 'none' }}>
                <ExternalLink size={11} /> Watch on YouTube
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
