'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import AnalysisProgress, { type AnalysisState } from '@/components/AnalysisProgress'
import { EmptyState, LoadingState } from '@/components/StateViews'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Download, ChevronUp, ChevronDown, Search, AlertCircle, Plus, X, Tag, Brain, Loader2 } from 'lucide-react'
import { useCampaignStore } from '@/lib/store'
import { useFilterStore } from '@/lib/filter-store'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface KeywordRank {
  keyword_text: string
  rank: number
}

interface VideoRow {
  id: string
  youtube_id: string
  title: string
  channel_name: string
  view_count: number
  best_rank: number
  keyword_count: number
  discovered_at: string
  is_new: boolean
  is_ours: boolean
  keywords_appeared: string[]
  /** YouTube's own tags, plus any brand merged in by AI analysis. */
  tags: string[]
  /**
   * Brands from the `brand_tags` table — what the brand filter matches on, so
   * it is authoritative. The scrape pipeline writes here without touching
   * `tags`, which is why the two disagree and chips went missing.
   */
  brands?: string[]
  keyword_ranks?: KeywordRank[]
}

const BRAND_COLORS: Record<string, string> = {
  BrandAlpha: '#1A73E8', CompetitorX: '#3B82F6', MarketLeader: '#22C55E',
  RisingBrand: '#A855F7', NichePro: '#EF4444',
}

function fmt(n: number): string {
  if (n == null || isNaN(n)) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function KeywordRankBreakdown({ ranks }: { ranks?: KeywordRank[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!ranks || ranks.length === 0) return null
  
  const show = expanded ? ranks : ranks.slice(0, 2)
  const remaining = ranks.length - 2

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, alignItems: 'center' }}>
      {show.map((r, i) => (
        <span key={i} className="badge badge-blue">
          {r.keyword_text}: <strong>#{r.rank}</strong>
        </span>
      ))}
      {!expanded && remaining > 0 && (
        <button 
          onClick={() => setExpanded(true)} 
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 'var(--fs-micro)', fontWeight: 700, cursor: 'pointer', padding: '2px 4px', display: 'inline-flex', alignItems: 'center', gap: 1 }}
        >
          +{remaining} more <ChevronDown size={8} />
        </button>
      )}
      {expanded && (
        <button 
          onClick={() => setExpanded(false)} 
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 'var(--fs-micro)', fontWeight: 700, cursor: 'pointer', padding: '2px 4px', display: 'inline-flex', alignItems: 'center', gap: 1 }}
        >
          Less <ChevronUp size={8} />
        </button>
      )}
    </div>
  )
}

const PER_PAGE = 20
function LeaderboardContent() {
  const { campaigns, activeCampaignId, fetchCampaigns } = useCampaignStore()
  const searchParams = useSearchParams()
  const initialKeywordId = searchParams.get('keyword_id') || ''
  const [sort, setSort] = useState<'views' | 'frequency' | 'rank'>(initialKeywordId ? 'rank' : 'views')
  const [page, setPage] = useState(1)

  // Filters
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedKeyword, setSelectedKeyword] = useState(initialKeywordId)
  const [selectedChannel, setSelectedChannel] = useState('')
  const { search, ownership, format, setSearch, setOwnership, setFormat } = useFilterStore()

  // Tag editing state
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null)
  const [customTagInput, setCustomTagInput] = useState('')
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [batchAnalyzing, setBatchAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null)
  const cancelRef = useRef(false)
  const [expandedKeywords, setExpandedKeywords] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Campaign-level reference data for the filter dropdowns. Cached by React
  // Query so navigating back to the leaderboard doesn't refetch both lists.
  const brandsQuery = useQuery<string[]>({
    queryKey: ['leaderboard-brands', activeCampaignId],
    queryFn: async () => {
      const res = await fetch(`/api/brands?campaign_id=${activeCampaignId}`)
      const d = await res.json()
      return (d.data ?? []).map((b: any) => b.brand_name ?? b.name)
    },
    enabled: !!activeCampaignId,
  })

  const keywordsQuery = useQuery<any[]>({
    queryKey: ['leaderboard-keywords', activeCampaignId],
    queryFn: async () => {
      const res = await fetch(`/api/keywords?campaign_id=${activeCampaignId}`)
      const d = await res.json()
      return d.keywords ?? []
    },
    enabled: !!activeCampaignId,
  })

  const campaignBrands = brandsQuery.data ?? []
  const keywords = keywordsQuery.data ?? []

  // Filter-dependent data: refetch when filters change
  const leaderboardQuery = useQuery<unknown, Error, { data: VideoRow[]; total: number; channels: string[] }>({
    queryKey: ['leaderboard', activeCampaignId, format, sort, page, selectedBrand, selectedKeyword, search, selectedChannel, ownership],
    queryFn: async () => {
      let url = `/api/videos/leaderboard?campaign_id=${activeCampaignId}&tab=${format}&sort=${sort}&page=${page}&limit=${PER_PAGE}`
      if (selectedBrand) url += `&brand_name=${encodeURIComponent(selectedBrand)}`
      if (selectedKeyword) url += `&keyword_id=${encodeURIComponent(selectedKeyword)}`
      if (selectedChannel) url += `&channel_name=${encodeURIComponent(selectedChannel)}`
      if (search.trim()) url += `&q=${encodeURIComponent(search.trim())}`
      if (ownership !== 'all') url += `&is_ours=${ownership === 'ours' ? 'true' : 'false'}`
      const res = await fetch(url)
      return res.json()
    },
    enabled: !!activeCampaignId,
  })

  const videos = leaderboardQuery.data?.data ?? []
  const total = leaderboardQuery.data?.total ?? 0
  const channels = leaderboardQuery.data?.channels ?? []
  const isPageLoading = leaderboardQuery.isFetching && !leaderboardQuery.isLoading

  const handleToggleOwnership = async (video: VideoRow) => {
    const newVal = !video.is_ours
    try {
      await fetch('/api/videos/ownership', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: video.id, is_ours: newVal, campaign_id: activeCampaignId }),
      })
      leaderboardQuery.refetch()
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateTags = async (youtubeId: string, newTags: string[]) => {
    if (!activeCampaignId) return
    try {
      await fetch('/api/videos/tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_id: youtubeId,
          tags: newTags,
          campaign_id: activeCampaignId,
        })
      })
      leaderboardQuery.refetch()
    } catch (e) {
      console.error(e)
    }
  }

  const handleAutoAnalyze = async (youtubeId: string) => {
    if (!activeCampaignId) return
    setAnalyzingId(youtubeId)
    try {
      const res = await fetch('/api/brands/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_ids: [youtubeId], campaign_id: activeCampaignId, force: false }),
      })
      const result = await res.json()
      const analysis = result.results?.[0]
      if (analysis?.status === 'analyzed' && analysis.high_confidence_brands?.length > 0) {
        leaderboardQuery.refetch()
      }
    } catch (e) {
      console.error('Auto analysis failed:', e)
    } finally {
      setAnalyzingId(null)
    }
  }

  /**
   * Analyse every unanalysed video in the campaign, in small batches.
   *
   * Previously this posted the 20 rows on the current page in one request and
   * reported nothing until it returned — so "AI Analyze All" neither covered
   * all videos nor showed progress. Batching also keeps each request well
   * inside the serverless timeout.
   */
  const handleBatchAnalyze = async () => {
    if (!activeCampaignId) return
    cancelRef.current = false
    setBatchAnalyzing(true)

    const base: AnalysisState = {
      total: 0, totalUnique: 0, alreadyAnalyzed: 0,
      processed: 0, success: 0, skipped: 0, failed: 0,
      currentVideo: '', phase: 'starting', errors: [],
    }
    setAnalysis({ ...base, message: 'Counting videos that still need analysis…' })

    try {
      const idsRes = await fetch(`/api/videos/ids?campaign_id=${activeCampaignId}&format=${format}`)
      const idsData = await idsRes.json()

      if (idsData.error) {
        setAnalysis({ ...base, phase: 'error', message: idsData.error })
        return
      }

      const queue = (idsData.videos || []) as { youtube_id: string; title: string }[]
      const totalUnique = idsData.totalUnique ?? queue.length
      const alreadyAnalyzed = idsData.alreadyAnalyzed ?? 0

      if (queue.length === 0) {
        setAnalysis({
          ...base, phase: 'complete', totalUnique, alreadyAnalyzed,
          message: `All ${totalUnique.toLocaleString()} videos in this campaign are already analysed.`,
        })
        return
      }

      let processed = 0, success = 0, skipped = 0, failed = 0
      const errors: AnalysisState['errors'] = []
      const BATCH = 5

      const snapshot = (over: Partial<AnalysisState>): AnalysisState => ({
        ...base, total: queue.length, totalUnique, alreadyAnalyzed,
        processed, success, skipped, failed, errors: [...errors],
        phase: 'analyzing', currentVideo: '', ...over,
      })

      for (let i = 0; i < queue.length; i += BATCH) {
        if (cancelRef.current) break
        const batch = queue.slice(i, i + BATCH)

        setAnalysis(snapshot({ currentVideo: batch.map(v => v.title).join(' · ') }))

        try {
          const res = await fetch('/api/brands/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_ids: batch.map(v => v.youtube_id), campaign_id: activeCampaignId, force: false }),
          })
          const result = await res.json()

          for (const r of (result.results || [])) {
            processed++
            if (r.status === 'analyzed') {
              const brands = r.high_confidence_brands?.length || r.brands_detected || 0
              if (brands > 0) success++; else skipped++
            } else if (r.status === 'error') {
              failed++
              const v = batch.find(bv => bv.youtube_id === r.youtube_id)
              errors.push({ youtube_id: r.youtube_id, title: v?.title || r.youtube_id, error: r.error || 'Failed' })
            } else {
              skipped++
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Network error'
          processed += batch.length
          failed += batch.length
          for (const v of batch) errors.push({ youtube_id: v.youtube_id, title: v.title, error: msg })
        }

        setAnalysis(snapshot({}))
        // Newly detected brands land in the table as the run proceeds.
        if (success > 0) leaderboardQuery.refetch()
      }

      const stopped = cancelRef.current
      setAnalysis(snapshot({
        phase: stopped ? 'cancelled' : 'complete',
        message: stopped
          ? `Stopped after ${processed.toLocaleString()} of ${queue.length.toLocaleString()} videos.`
          : `Found brands in ${success.toLocaleString()} of ${processed.toLocaleString()} videos analysed.`,
      }))
      leaderboardQuery.refetch()
    } catch (e: unknown) {
      setAnalysis({ ...base, phase: 'error', message: e instanceof Error ? e.message : 'Analysis failed' })
    } finally {
      setBatchAnalyzing(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const handleExportCSV = () => {
    const headers = 'Youtube ID,Title,Channel,Views,Best Rank,Discovered At,Tags'
    const rows = videos.map((v) =>
      `"${v.youtube_id}","${v.title.replace(/"/g, '""')}","${v.channel_name.replace(/"/g, '""')}",${v.view_count},${v.best_rank},${new Date(v.discovered_at).toLocaleDateString()},"${v.tags.join(';')}"`
    )
    const blob = new Blob([headers + '\n' + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `top_${format}_videos.csv`; a.click()
  }

  if (leaderboardQuery.isLoading) {
    return (
      <LoadingState title="Loading leaderboard..." />
    )
  }

  return (
    <div className="anim-fade-up">
      
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Top Videos <span className="accent">Leaderboard</span></h1>
          <p className="page-subtitle">Rankings based on search query extraction. Click on video tags to add or remove tags.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="toggle-group">
            <button className={`toggle-btn ${format === 'all' ? 'active' : ''}`} onClick={() => { setFormat('all'); setPage(1) }}>
              All
            </button>
            <button className={`toggle-btn ${format === 'long' ? 'active' : ''}`} onClick={() => { setFormat('long'); setPage(1) }}>
              Long Format
            </button>
            <button className={`toggle-btn ${format === 'short' ? 'active' : ''}`} onClick={() => { setFormat('short'); setPage(1) }}>
              Short Format
            </button>
          </div>
          <div className="toggle-group">
            <button className={`toggle-btn ${sort === 'views' ? 'active' : ''}`} onClick={() => { setSort('views'); setPage(1) }}>
              Top by Views
            </button>
            <button className={`toggle-btn ${sort === 'frequency' ? 'active' : ''}`} onClick={() => { setSort('frequency'); setPage(1) }}>
              Top by Freq
            </button>
            <button className={`toggle-btn ${sort === 'rank' ? 'active' : ''}`} onClick={() => { setSort('rank'); setPage(1) }}>
              YouTube Rank
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>
            <Download size={13} /> Export CSV
          </button>
          <button
            className="btn btn-sm"
            onClick={handleBatchAnalyze}
            disabled={batchAnalyzing}
            style={{
              background: batchAnalyzing ? 'var(--bg-hover)' : 'var(--info-dim)',
              border: `1px solid ${batchAnalyzing ? 'var(--border-2)' : 'var(--info-border)'}`,
              color: 'var(--info)',
              fontWeight: 700,
            }}
          >
            {batchAnalyzing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Brain size={13} />}
            {batchAnalyzing ? 'Analyzing…' : 'AI Analyze All'}
          </button>
        </div>
      </div>

      {analysis && (
        <AnalysisProgress
          state={analysis}
          onCancel={() => { cancelRef.current = true }}
          onDismiss={() => setAnalysis(null)}
        />
      )}

      {/* Page-specific filters: Brand, Keyword, Channel */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '0 24px', marginBottom: 16 }}>
        <div style={{ minWidth: 150 }}>
          <select className="input" value={selectedBrand} onChange={e => { setSelectedBrand(e.target.value); setPage(1) }} style={{ cursor: 'pointer', padding: '6px 12px' }}>
            <option value="">All Brands</option>
            {campaignBrands.map(b => (<option key={b} value={b}>{b}</option>))}
          </select>
        </div>
        <div style={{ minWidth: 180 }}>
          <select className="input" value={selectedKeyword} onChange={e => { const val = e.target.value; setSelectedKeyword(val); setSort(val ? 'rank' : 'views'); setPage(1) }} style={{ cursor: 'pointer', padding: '6px 12px' }}>
            <option value="">All Keywords</option>
            {keywords.map(kw => (<option key={kw.id} value={kw.id}>{kw.text} ({kw.language})</option>))}
          </select>
        </div>
        <div style={{ minWidth: 180 }}>
          <select className="input" value={selectedChannel} onChange={e => { setSelectedChannel(e.target.value); setPage(1) }} style={{ cursor: 'pointer', padding: '6px 12px' }}>
            <option value="">All Channels</option>
            {channels.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
        {(selectedBrand || selectedKeyword || selectedChannel) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedBrand(''); setSelectedKeyword(''); setSelectedChannel(''); setPage(1) }}>
            <X size={12} /> Reset
          </button>
        )}
      </div>

      {/* Main Table */}
      {videos.length === 0 ? (
        <EmptyState
          icon={<AlertCircle size={32} strokeWidth={1.5} />}
          title="No Leaderboard Entries Found"
          body="Add keywords and fire scrape jobs in Campaign Control to populate listings."
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          {isPageLoading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 50,
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--text-bright)', color: 'var(--surface)', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--surface)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Loading page…
              </div>
            </div>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 68, textAlign: 'center' }}>
                    Row
                  </th>
                  <th>Video</th>
                  <th>Keywords Tagged</th>
                  <th>Tags / Products</th>
                  <th>Channel</th>
                  <th style={{ textAlign: 'right' }}>Views</th>
                  <th style={{ textAlign: 'right' }}>Best Rank</th>
                  <th style={{ textAlign: 'center' }}>Keyword Count</th>
                  <th style={{ textAlign: 'center' }}>Our Video</th>
                  <th>Extracted</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video, i) => {
                  const globalRank = (page - 1) * PER_PAGE + i + 1
                  const isEditing = editingVideoId === video.youtube_id
                  // brand_tags first — the authoritative source the filter uses.
                  const allBrandChips = Array.from(new Set([...(video.brands || []), ...(video.tags || [])]))

                  return (
                    <tr key={video.youtube_id}>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: globalRank <= 3 ? 'var(--accent-dim)' : 'transparent',
                          color: globalRank <= 3 ? 'var(--accent)' : 'var(--text-muted)',
                          fontWeight: 800, fontSize: 'var(--fs-sm)', margin: '0 auto',
                        }}>
                          {globalRank}
                        </div>
                      </td>
                      <td style={{ maxWidth: 320 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Link
                            href={`/video/${video.youtube_id}`}
                            style={{ flexShrink: 0, display: 'block', width: 72, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)', overflow: 'hidden' }}
                          >
                            <img
                              src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Link>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                              {video.is_new && <span className="badge badge-green">NEW</span>}
                            </div>
                            <Link
                              href={`/video/${video.youtube_id}`}
                              style={{
                                fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                                textDecoration: 'none', lineHeight: 1.4,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              } as React.CSSProperties}
                            >
                              {video.title}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td style={{ minWidth: 180 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          {video.keyword_ranks && video.keyword_ranks.length > 0 ? (() => {
                            const kwExpanded = expandedKeywords.has(video.youtube_id)
                            const shown = kwExpanded ? video.keyword_ranks : video.keyword_ranks.slice(0, 2)
                            const remaining = video.keyword_ranks.length - 2
                            return (
                              <>
                                {shown.map((kr, idx) => (
                                  <span
                                    key={`kw-${idx}`}
                                    className="badge badge-blue"
                                  >
                                    {kr.keyword_text.length > 18 ? kr.keyword_text.slice(0, 18) + '…' : kr.keyword_text}: <strong>#{kr.rank}</strong>
                                  </span>
                                ))}
                                {!kwExpanded && remaining > 0 && (
                                  <button
                                    onClick={() => setExpandedKeywords(prev => new Set(prev).add(video.youtube_id))}
                                    style={{
                                      background: 'none', border: 'none', color: 'var(--accent)', fontSize: 'var(--fs-micro)',
                                      fontWeight: 700, cursor: 'pointer', padding: '2px 4px', display: 'inline-flex',
                                      alignItems: 'center', gap: 1,
                                    }}
                                  >
                                    +{remaining} more <ChevronDown size={8} />
                                  </button>
                                )}
                                {kwExpanded && (
                                  <button
                                    onClick={() => setExpandedKeywords(prev => { const n = new Set(prev); n.delete(video.youtube_id); return n })}
                                    style={{
                                      background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 'var(--fs-micro)',
                                      fontWeight: 700, cursor: 'pointer', padding: '2px 4px', display: 'inline-flex',
                                      alignItems: 'center', gap: 1,
                                    }}
                                  >
                                    Less <ChevronUp size={8} />
                                  </button>
                                )}
                              </>
                            )
                          })() : (
                            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--neutral-300)' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ minWidth: 200, position: 'relative' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          {allBrandChips.map(tag => (
                            <span
                              key={tag}
                              className="badge badge-blue"
                            >
                              {tag}
                              <button
                                onClick={() => handleUpdateTags(video.youtube_id, allBrandChips.filter(t => t !== tag))}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}

                          {/* Auto Analyze Button */}
                          <button
                            onClick={() => handleAutoAnalyze(video.youtube_id)}
                            disabled={analyzingId === video.youtube_id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: analyzingId === video.youtube_id ? 'var(--bg-hover)' : 'var(--info-dim)',
                              border: `1px solid ${analyzingId === video.youtube_id ? 'var(--border-2)' : 'var(--info-border)'}`,
                              color: 'var(--info)',
                              fontSize: 'var(--fs-caption)',
                              fontWeight: 700,
                              cursor: analyzingId === video.youtube_id ? 'not-allowed' : 'pointer',
                              opacity: analyzingId === video.youtube_id ? 0.6 : 1,
                              transition: 'all 0.15s',
                            }}
                            title="AI auto-detect brands from transcript"
                          >
                            {analyzingId === video.youtube_id ? (
                              <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <Brain size={10} />
                            )}
                            {analyzingId === video.youtube_id ? '...' : 'AI'}
                          </button>

                          <button
                            onClick={() => {
                              setEditingVideoId(isEditing ? null : video.youtube_id)
                              setCustomTagInput('')
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 20,
                              borderRadius: 'var(--radius-xs)',
                              background: 'var(--bg-hover)',
                              border: '1px solid var(--border-2)',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)',
                            }}
                            title="Add / edit product tags"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Inline Tags Popover */}
                        {isEditing && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            zIndex: 90,
                            background: 'var(--surface)',
                            border: '1px solid var(--border-2)',
                            borderRadius: 'var(--radius-md)',
                            padding: 10,
                            width: 220,
                            boxShadow: 'var(--shadow-md)',
                            marginTop: 4,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid var(--border-light)', paddingBottom: 4 }}>
                              <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Select Brand/Product</span>
                              <button
                                onClick={() => setEditingVideoId(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                            
                            {/* Campaign Brands list */}
                            <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                              {campaignBrands.length === 0 ? (
                                <span style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', fontStyle: 'italic' }}>No campaign brands defined. Add them in Control tab.</span>
                              ) : (
                                campaignBrands.map(brand => {
                                  const hasTag = allBrandChips.includes(brand)
                                  return (
                                    <label key={brand} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                      <input
                                        type="checkbox"
                                        checked={hasTag}
                                        onChange={() => {
                                          const next = hasTag
                                            ? allBrandChips.filter(t => t !== brand)
                                            : [...allBrandChips, brand]
                                          handleUpdateTags(video.youtube_id, next)
                                        }}
                                      />
                                      {brand}
                                    </label>
                                  )
                                })
                              )}
                            </div>

                            {/* Custom tag input */}
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                              <input
                                className="input"
                                style={{ padding: '4px 8px', fontSize: 'var(--fs-label)' }}
                                placeholder="Custom tag name..."
                                value={customTagInput}
                                onChange={e => setCustomTagInput(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && customTagInput.trim()) {
                                    const val = customTagInput.trim()
                                    if (!allBrandChips.includes(val)) {
                                      handleUpdateTags(video.youtube_id, [...allBrandChips, val])
                                    }
                                    setCustomTagInput('')
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (customTagInput.trim()) {
                                    const val = customTagInput.trim()
                                    if (!allBrandChips.includes(val)) {
                                      handleUpdateTags(video.youtube_id, [...allBrandChips, val])
                                    }
                                    setCustomTagInput('')
                                  }
                                }}
                                style={{
                                  background: 'var(--accent)',
                                  color: 'var(--on-accent)',
                                  border: 'none',
                                  borderRadius: 'var(--radius-xs)',
                                  padding: '4px 8px',
                                  fontSize: 'var(--fs-label)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)' }}>{video.channel_name}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, fontSize: 'var(--fs-body)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(video.view_count)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--fs-body)', color: 'var(--accent)' }}>
                          #{video.best_rank}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--fs-body)' }}>
                          {video.keyword_count}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleOwnership(video)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-label)', fontWeight: 700,
                            border: `1.5px solid ${video.is_ours ? 'var(--success)' : 'var(--border-2)'}`,
                            background: video.is_ours ? 'var(--success-dim)' : 'var(--surface)',
                            color: video.is_ours ? 'var(--success-text)' : 'var(--text-muted)',
                            cursor: 'pointer', transition: 'all 0.15s ease',
                          }}
                          title={video.is_ours ? 'Mark as not ours' : 'Mark as our video'}
                        >
                          {video.is_ours ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--fs-label)', color: 'var(--text-muted)' }}>
                        {new Date(video.discovered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderTop: '1px solid var(--border-1)',
            background: 'var(--bg-surface)',
          }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--text-secondary)' }}>
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)}
              </strong> of <strong style={{ color: 'var(--text-secondary)' }}>{total}</strong> videos
            </span>
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
              <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
              <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LoadingState title="Loading leaderboard..." />}>
      <LeaderboardContent />
    </Suspense>
  )
}
