'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Video, Eye, TrendingUp, Plus, Loader2, Check,
  Search, X, ExternalLink, Trash2, Download,
  BarChart3, Users, Target, ArrowUpRight, ArrowDownRight,
  Percent, Trophy
} from 'lucide-react'
import { useCampaignStore } from '@/lib/store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell
} from 'recharts'
import { useFilterStore } from '@/lib/filter-store'
import { PageSkeleton } from '@/components/PageSkeleton'

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}%`
}

function fmtRelative(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso.includes('T') ? iso : iso + 'Z')
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function Rank({ n }: { n: number }) {
  const c = n <= 3 ? '#059669' : n <= 5 ? '#1A73E8' : n <= 10 ? '#7C3AED' : '#D97706'
  const bg = n <= 3 ? 'rgba(5,150,105,0.08)' : n <= 5 ? 'rgba(26,115,232,0.08)' : n <= 10 ? 'rgba(124,58,237,0.08)' : 'rgba(217,119,6,0.08)'
  return <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: bg, color: c, whiteSpace: 'nowrap' }}>#{n}</span>
}

function GrowthBadge({ value, pct }: { value: number; pct: number | null }) {
  const positive = value >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
      color: positive ? '#059669' : '#DC2626',
      background: positive ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
    }}>
      {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {fmt(value)}{pct != null && ` (${fmtPct(pct)})`}
    </span>
  )
}

type SubTab = 'overview' | 'videos' | 'creators' | 'rankings' | 'growth'

const VIDEOS_PER_PAGE = 10

export default function OurVideosTab() {
  const { activeCampaignId } = useCampaignStore()
  const { format } = useFilterStore()
  const queryClient = useQueryClient()
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview')
  const [showAdd, setShowAdd] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [formatFilter, setFormatFilter] = useState<'all' | 'long' | 'short'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [videoPage, setVideoPage] = useState(1)

  const effectiveFormat = formatFilter !== 'all' ? formatFilter : format

  const overviewQuery = useQuery({
    queryKey: ['our-videos', 'overview', activeCampaignId, effectiveFormat],
    queryFn: async () => {
      const params = new URLSearchParams({ campaign_id: activeCampaignId!, view: 'overview' })
      if (effectiveFormat && effectiveFormat !== 'all') params.set('format', effectiveFormat)
      const res = await fetch(`/api/our-videos?${params}`)
      return res.json()
    },
    enabled: !!activeCampaignId,
  })

  const videosQuery = useQuery({
    queryKey: ['our-videos', 'videos', activeCampaignId, effectiveFormat, search],
    queryFn: async () => {
      const params = new URLSearchParams({ campaign_id: activeCampaignId!, view: 'videos', limit: '500' })
      if (effectiveFormat && effectiveFormat !== 'all') params.set('format', effectiveFormat)
      if (search) params.set('search', search)
      const res = await fetch(`/api/our-videos?${params}`)
      return res.json()
    },
    enabled: !!activeCampaignId && activeSubTab === 'videos',
  })

  const creatorsQuery = useQuery({
    queryKey: ['our-videos', 'creators', activeCampaignId, effectiveFormat],
    queryFn: async () => {
      const params = new URLSearchParams({ campaign_id: activeCampaignId!, view: 'creators' })
      if (effectiveFormat && effectiveFormat !== 'all') params.set('format', effectiveFormat)
      const res = await fetch(`/api/our-videos?${params}`)
      return res.json()
    },
    enabled: !!activeCampaignId && activeSubTab === 'creators',
  })

  const rankingsQuery = useQuery({
    queryKey: ['our-videos', 'rankings', activeCampaignId, effectiveFormat],
    queryFn: async () => {
      const params = new URLSearchParams({ campaign_id: activeCampaignId!, view: 'rankings' })
      if (effectiveFormat && effectiveFormat !== 'all') params.set('format', effectiveFormat)
      const res = await fetch(`/api/our-videos?${params}`)
      return res.json()
    },
    enabled: !!activeCampaignId && activeSubTab === 'rankings',
  })

  const growthQuery = useQuery({
    queryKey: ['our-videos', 'growth', activeCampaignId, effectiveFormat],
    queryFn: async () => {
      const params = new URLSearchParams({ campaign_id: activeCampaignId!, view: 'growth' })
      if (effectiveFormat && effectiveFormat !== 'all') params.set('format', effectiveFormat)
      const res = await fetch(`/api/our-videos?${params}`)
      return res.json()
    },
    enabled: !!activeCampaignId && activeSubTab === 'growth',
  })

  const addMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const res = await fetch('/api/our-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: activeCampaignId, urls }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['our-videos'] })
      setUrlInput('')
      setShowAdd(false)
      setAddError(null)
    },
    onError: (e: Error) => setAddError(e.message),
  })

  const removeMutation = useMutation({
    mutationFn: async (videoIds: string[]) => {
      const res = await fetch('/api/our-videos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_ids: videoIds, campaign_id: activeCampaignId }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['our-videos'] })
      setSelected(new Set())
    },
  })

  const handleAdd = () => {
    const urls = urlInput.split('\n').map(l => l.trim()).filter(Boolean)
    if (urls.length === 0) return
    addMutation.mutate(urls)
  }

  const handleRemove = (ids: string[], title?: string) => {
    const msg = ids.length === 1 && title
      ? `Remove "${title}" from Our Videos?`
      : `Remove ${ids.length} video(s) from Our Videos?`
    if (!confirm(msg)) return
    removeMutation.mutate(ids)
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = (ids: string[]) => {
    if (selected.size === ids.length) setSelected(new Set())
    else setSelected(new Set(ids))
  }

  const handleExportVideos = () => {
    const videos = videosQuery.data?.videos || []
    const headers = 'Title,Channel,Format,Views,Likes,Best Rank,Keyword,URL'
    const rows = videos.map((v: any) => {
      const kw = v.rankings?.[0]?.keyword || ''
      return `"${(v.title || '').replace(/"/g, '""')}","${(v.channel_name || '').replace(/"/g, '""')}",${v.is_short ? 'Short' : 'Long'},${v.view_count || 0},${v.like_count || 0},${v.bestRank || ''},"${kw.replace(/"/g, '""')}",https://youtube.com/watch?v=${v.youtube_id || ''}`
    })
    const blob = new Blob([headers + '\n' + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `our_videos_${effectiveFormat || 'all'}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const renderOverview = () => {
    const data = overviewQuery.data
    if (overviewQuery.isLoading) return <PageSkeleton cols={6} rows={3} />
    if (!data?.overview) return <EmptyState />

    const o = data.overview
    const c = data.comparison || {}
    const rankDist = [
      { name: '#1-3', value: o.rankTop3 || 0, color: '#059669' },
      { name: '#4-10', value: o.rank4to10 || 0, color: '#1A73E8' },
      { name: '#11+', value: o.rank11plus || 0, color: '#D97706' },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { icon: Video, label: 'OUR VIDEOS', value: fmt(o.totalVideos), color: '#1A73E8', sub: `of ${fmt(c.campaignTotalVideos)} campaign videos` },
            { icon: Eye, label: 'TOTAL VIEWS', value: fmt(o.totalViews), color: '#7C3AED', sub: `${fmt(o.avgViews)} avg per video` },
            { icon: Trophy, label: 'BEST RANK', value: o.bestRank ? `#${o.bestRank}` : '—', color: '#059669', sub: `${o.totalRankings || 0} keyword rankings` },
            { icon: Percent, label: 'VIEW SHARE', value: `${o.viewShare || 0}%`, color: '#EC4899', sub: 'of total campaign views' },
            { icon: TrendingUp, label: '7D GROWTH', value: o.views7dGrowth != null ? fmtPct(o.views7dGrowth) : fmt(o.views7d), color: '#10B981', sub: o.views7dGrowth != null ? `${fmt(o.views7d)} views this week` : 'views this week' },
          ].map((kpi) => (
            <div key={kpi.label} className="kpi-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="kpi-icon-wrap" style={{ background: `${kpi.color}12`, width: 28, height: 28 }}>
                  <kpi.icon size={14} style={{ color: kpi.color }} />
                </div>
                <span className="kpi-label" style={{ fontSize: 10 }}>{kpi.label}</span>
              </div>
              <div className="kpi-value" style={{ fontSize: 22, marginTop: 4 }}>{kpi.value}</div>
              {kpi.sub && <div className="kpi-sub" style={{ marginTop: 2 }}>{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* Competitive Comparison */}
        {c.campaignTotalVideos > 0 && (
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={14} style={{ color: '#1A73E8' }} />
                Our Videos vs Campaign
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>How your videos compare to all other videos in this campaign</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
              <ComparisonCard
                label="Videos"
                ours={o.totalVideos}
                theirs={c.theirVideoCount || 0}
                total={c.campaignTotalVideos}
                color="#1A73E8"
              />
              <ComparisonCard
                label="Avg Views"
                ours={o.avgViews}
                theirs={c.theirAvgViews || 0}
                isCurrency={false}
                color="#7C3AED"
                diff={c.avgViewsDiff}
              />
              <ComparisonCard
                label="Total Views"
                ours={o.totalViews}
                theirs={c.theirTotalViews || 0}
                isCurrency={false}
                color="#059669"
              />
              <ComparisonCard
                label="Engagement"
                ours={c.ourEngagement || 0}
                theirs={c.theirEngagement || 0}
                isCurrency={false}
                isPercent
                color="#EC4899"
              />
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Views Trend (30 Days)</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Daily total views across all our videos</div>
            </div>
            {data.viewsTimeline?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.viewsTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={d => { const dt = new Date(d); return `${dt.getDate()} ${dt.toLocaleDateString('en-IN', { month: 'short' })}` }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => fmt(v)} width={50} />
                  <RechartsTooltip
                    contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 11, color: '#fff' }}
                    formatter={(v: any) => [fmt(v as number), 'Views']}
                    labelFormatter={d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  />
                  <Area type="monotone" dataKey="views" stroke="#4C78A8" fill="#4C78A820" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#94A3B8', fontSize: 12 }}>No view data yet</div>
            )}
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Rank Distribution</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Keyword ranking positions</div>
            </div>
            {(o.rankTop3 + o.rank4to10 + o.rank11plus) > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={rankDist} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} width={40} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                      {rankDist.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
                  {rankDist.map(r => (
                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748B' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />
                      {r.name}: {r.value}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, color: '#94A3B8', fontSize: 12 }}>No rankings yet</div>
            )}
          </div>
        </div>

        {/* Bottom Row: Top Videos + Top Channels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Top Performing Videos</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>By view count</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.top5?.map((v: any, i: number) => (
                <div key={v.id || i} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < (data.top5?.length || 0) - 1 ? '1px solid var(--border-1)' : 'none' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', width: 16, textAlign: 'center' }}>{i + 1}</span>
                  <img src={v.thumbnail_url} alt="" style={{ width: 48, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{v.channel_name} · {fmt(v.view_count)} views</div>
                  </div>
                  {v.rank && <Rank n={v.rank} />}
                </div>
              ))}
              {(!data.top5 || data.top5.length === 0) && (
                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, padding: 20 }}>No videos yet. Add your video URLs above.</div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Top Channels</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>By total views</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: 220 }}>
              {data.topChannels?.map((ch: any, i: number) => (
                <div key={ch.name} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < (data.topChannels?.length || 0) - 1 ? '1px solid var(--border-1)' : 'none' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', width: 16, textAlign: 'center' }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{ch.count} videos · {fmt(ch.views)} views</div>
                  </div>
                </div>
              ))}
              {(!data.topChannels || data.topChannels.length === 0) && (
                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, padding: 20 }}>No channel data</div>
              )}
            </div>
          </div>
        </div>

        {/* Keyword Rankings */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Keyword Rankings</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Keywords where our videos rank</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {data.topKeywords?.map((kw: any, i: number) => (
              <div key={kw.keyword} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                <Rank n={kw.bestRank} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw.keyword}</div>
                  <div style={{ fontSize: 9, color: '#94A3B8' }}>{kw.count} video(s)</div>
                </div>
              </div>
            ))}
            {(!data.topKeywords || data.topKeywords.length === 0) && (
              <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, padding: 20, gridColumn: '1 / -1' }}>No keyword rankings yet</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderVideos = () => {
    const data = videosQuery.data
    if (videosQuery.isLoading) return <PageSkeleton cols={4} rows={6} />
    const allVideos = data?.videos || []
    const totalPages = Math.max(1, Math.ceil(allVideos.length / VIDEOS_PER_PAGE))
    const safePage = Math.min(videoPage, totalPages)
    const pagedVideos = allVideos.slice((safePage - 1) * VIDEOS_PER_PAGE, safePage * VIDEOS_PER_PAGE)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              className="input"
              value={search}
              onChange={e => { setSearch(e.target.value); setVideoPage(1) }}
              placeholder="Search videos..."
              style={{ paddingLeft: 30 }}
            />
          </div>
          <button onClick={handleExportVideos} className="btn btn-ghost btn-sm" disabled={allVideos.length === 0}>
            <Download size={11} /> CSV
          </button>
          {selected.size > 0 && (
            <button onClick={() => handleRemove(Array.from(selected))} className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trash2 size={11} /> Remove ({selected.size})
            </button>
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 80px 80px 80px 120px 60px', gap: 0, padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
            {['', 'Video', 'Format', 'Views', 'Likes', 'Rank', 'Keyword', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', textAlign: h === 'Views' || h === 'Likes' ? 'right' : h === 'Format' || h === 'Rank' || h === 'Keyword' ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>
          {pagedVideos.map((v: any, i: number) => (
            <div key={v.youtube_id || `${v.id}-${i}`} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 80px 80px 80px 120px 60px', gap: 0, padding: '10px 16px', borderBottom: '1px solid #F8FAFC', alignItems: 'center' }}>
              <div>
                <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleSelect(v.id)} style={{ cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={v.thumbnail_url} alt="" style={{ width: 56, height: 36, borderRadius: 4, objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', bottom: 1, right: 1, background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 8, padding: '1px 3px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace" }}>{v.duration || '—'}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{v.title}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>{v.channel_name} · {fmtRelative(v.published_at)}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className={`badge ${v.is_short ? 'badge-red' : 'badge-blue'}`}>
                  {v.is_short ? 'Short' : 'Long'}
                </span>
              </div>
              <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 700, color: '#0F172A' }}>{fmt(v.view_count)}</div>
              <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#64748B' }}>{fmt(v.like_count)}</div>
              <div style={{ textAlign: 'center' }}>
                {v.bestRank ? <Rank n={v.bestRank} /> : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
              </div>
              <div style={{ textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.rankings?.[0] ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#1A73E8' }}>{v.rankings[0].keyword}</span>
                ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <a href={`https://youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noopener noreferrer" title="Open on YouTube"
                  className="row-hover" style={{ padding: 4, borderRadius: 4, color: '#94A3B8', textDecoration: 'none' }}
                ><ExternalLink size={12} /></a>
                <button onClick={() => handleRemove([v.id], v.title)} title="Remove from Our Videos"
                  className="row-hover" style={{ padding: 4, borderRadius: 4, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
                ><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
          {allVideos.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>No our videos found. Add video URLs above to start tracking.</div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setVideoPage(1)} disabled={safePage === 1}>&laquo;</button>
            <button className="page-btn" onClick={() => setVideoPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>&lsaquo;</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p: number
              if (totalPages <= 7) p = i + 1
              else if (safePage <= 4) p = i + 1
              else if (safePage >= totalPages - 3) p = totalPages - 6 + i
              else p = safePage - 3 + i
              return (
                <button key={p} className={`page-btn ${safePage === p ? 'active' : ''}`} onClick={() => setVideoPage(p)}>{p}</button>
              )
            })}
            <button className="page-btn" onClick={() => setVideoPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>&rsaquo;</button>
            <button className="page-btn" onClick={() => setVideoPage(totalPages)} disabled={safePage === totalPages}>&raquo;</button>
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 8 }}>
              {allVideos.length} videos · Page {safePage} of {totalPages}
            </span>
          </div>
        )}
      </div>
    )
  }

  const renderCreators = () => {
    const data = creatorsQuery.data
    if (creatorsQuery.isLoading) return <PageSkeleton cols={5} rows={5} />
    const creators = data?.creators || []

    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1.2fr 60px 1fr 1fr 1.5fr 1fr', gap: 0, padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
          {['#', 'CREATOR', 'VIDEOS', 'TOTAL VIEWS', 'AVG VIEWS', 'TOP VIDEO', 'KEYWORDS'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', textAlign: h === 'VIDEOS' || h === 'TOTAL VIEWS' || h === 'AVG VIEWS' ? 'right' : 'left', letterSpacing: '0.3px' }}>{h}</span>
          ))}
        </div>
        {creators.map((ch: any, i: number) => (
          <div key={ch.name} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '40px 1.2fr 60px 1fr 1fr 1.5fr 1fr', gap: 0, padding: '12px 16px', borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{i + 1}</span>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
            <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#64748B' }}>{ch.count}</div>
            <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 700, color: '#0F172A' }}>{fmt(ch.views)}</div>
            <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#64748B' }}>{fmt(ch.avgViews)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <img src={ch.topVideo?.thumbnail_url} alt="" style={{ width: 44, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.topVideo?.title}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ch.keywords?.slice(0, 2).map((k: string) => (
                <span key={k} className="badge badge-blue" style={{ fontSize: 10 }}>{k}</span>
              ))}
              {(ch.keywords?.length || 0) > 2 && <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>+{ch.keywords.length - 2}</span>}
            </div>
          </div>
        ))}
        {creators.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>No creator data yet</div>
        )}
      </div>
    )
  }

  const renderRankings = () => {
    const data = rankingsQuery.data
    if (rankingsQuery.isLoading) return <PageSkeleton cols={5} rows={5} />
    const rankings = data?.rankings || []

    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 90px 90px 120px 2fr', gap: 0, padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
          {['#', 'VIDEO', 'BEST RANK', 'FORMAT', 'VIEWS', 'KEYWORDS RANKING'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', textAlign: h === 'BEST RANK' || h === 'FORMAT' || h === 'VIEWS' ? 'right' : 'left', letterSpacing: '0.3px' }}>{h}</span>
          ))}
        </div>
        {rankings.map((v: any, i: number) => (
          <div key={v.youtube_id || v.id || i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '40px 2fr 90px 90px 120px 2fr', gap: 0, padding: '12px 16px', borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{i + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <img src={v.thumbnail_url} alt="" style={{ width: 48, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{v.title}</div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>{v.channel_name}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}><Rank n={v.bestRank} /></div>
            <div style={{ textAlign: 'right' }}>
              <span className={`badge ${v.is_short ? 'badge-red' : 'badge-blue'}`}>
                {v.is_short ? 'Short' : 'Long'}
              </span>
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 700, color: '#0F172A' }}>{fmt(v.view_count)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {v.rankings?.map((r: any, ri: number) => (
                <span key={ri} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#F1F5F9', color: '#475569' }}>
                  <span style={{ color: r.rank <= 3 ? '#059669' : r.rank <= 5 ? '#1A73E8' : '#D97706' }}>#{r.rank}</span>
                  {r.keyword}
                </span>
              ))}
            </div>
          </div>
        ))}
        {rankings.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>No ranked videos yet. Add videos and run a scrape.</div>
        )}
      </div>
    )
  }

  const renderGrowth = () => {
    const data = growthQuery.data
    if (growthQuery.isLoading) return <PageSkeleton cols={4} rows={5} />
    const growth = data?.growth || []

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {data?.viewsTimeline?.length > 0 && (
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Total Views Growth</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Combined daily views across all our videos</div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.viewsTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={d => { const dt = new Date(d); return `${dt.getDate()} ${dt.toLocaleDateString('en-IN', { month: 'short' })}` }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => fmt(v)} width={50} />
                <RechartsTooltip
                  contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 11, color: '#fff' }}
                  formatter={(v: any) => [fmt(v as number), 'Views']}
                />
                <Area type="monotone" dataKey="views" stroke="#4C78A8" fill="#4C78A820" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', background: '#F8FAFC' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Daily Growth by Video</div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>7-day view change for each video</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 140px 100px', gap: 0, padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
            {['#', 'Video', 'Current Views', '7d Growth', 'Trend'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', textAlign: h === 'Current Views' || h === '7d Growth' ? 'right' : h === 'Trend' ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>
          {growth.map((v: any, i: number) => (
            <div key={v.youtube_id || v.id || i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 140px 100px', gap: 0, padding: '10px 16px', borderBottom: '1px solid #F8FAFC', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{i + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <img src={v.thumbnail_url} alt="" style={{ width: 48, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{v.title}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>{v.channel_name}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, fontWeight: 700, color: '#0F172A' }}>{fmt(v.view_count)}</div>
              <div style={{ textAlign: 'right' }}>
                {v.growth7d != null ? (
                  <GrowthBadge value={v.growth7d} pct={v.growth7dPct} />
                ) : (
                  <span style={{ fontSize: 11, color: '#CBD5E1' }}>—</span>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                {v.trend?.length > 1 ? (
                  <ResponsiveContainer width={80} height={28}>
                    <LineChart data={v.trend}>
                      <Line type="monotone" dataKey="views" stroke={(v.growth7d ?? 0) >= 0 ? '#059669' : '#DC2626'} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <span style={{ fontSize: 10, color: '#CBD5E1' }}>—</span>
                )}
              </div>
            </div>
          ))}
          {growth.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>No growth data yet. Views update daily after a scrape.</div>
          )}
        </div>
      </div>
    )
  }

  const subTabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={12} /> },
    { id: 'videos', label: 'Videos', icon: <Video size={12} /> },
    { id: 'creators', label: 'Creators', icon: <Users size={12} /> },
    { id: 'rankings', label: 'Rankings', icon: <Target size={12} /> },
    { id: 'growth', label: 'Growth', icon: <TrendingUp size={12} /> },
  ]

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <style>{`
        .tab-pill{padding:8px 16px;font-size:13px;font-weight:600;color:var(--text-secondary);background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;transition:all 0.15s;font-family:inherit;white-space:nowrap}
        .tab-pill:hover{color:var(--text-primary)}
        .tab-pill.on{color:var(--accent);border-bottom-color:var(--accent)}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>Our Videos</h1>
          <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
            {overviewQuery.data?.overview?.totalVideos || 0} videos · {fmt(overviewQuery.data?.overview?.totalViews || 0)} total views · {overviewQuery.data?.overview?.rankingCount || 0} ranking
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-blue" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', fontSize: 12.5 }}>
          <Plus size={14} /> Add Videos
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 0, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden' }}>
          {(['all', 'long', 'short'] as const).map(f => (
            <button key={f} onClick={() => { setFormatFilter(f); setVideoPage(1) }} className={`toggle-btn ${formatFilter === f ? 'active' : ''}`}>
              {f === 'all' ? 'All Formats' : f === 'long' ? 'Long Form' : 'Short Form'}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginLeft: 4 }}>
          {videosQuery.data?.videos?.length || overviewQuery.data?.overview?.totalVideos || 0} videos
        </span>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-2)', gap: 0 }}>
        {subTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
            className={`tab-pill ${activeSubTab === tab.id ? 'on' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeSubTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {activeSubTab === 'overview' && renderOverview()}
          {activeSubTab === 'videos' && renderVideos()}
          {activeSubTab === 'creators' && renderCreators()}
          {activeSubTab === 'rankings' && renderRankings()}
          {activeSubTab === 'growth' && renderGrowth()}
        </motion.div>
      </AnimatePresence>
    </motion.div>

      {showAdd && createPortal(
        <div className="modal-scrim" onClick={() => setShowAdd(false)}>
            <div className="modal-panel" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowAdd(false)}
                className="modal-close"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <h3 className="modal-title">Add Your Videos</h3>
              <p className="modal-subtitle">
                Paste YouTube video URLs (one per line) to mark them as &quot;ours&quot; and track across all keyword rankings.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label className="field-label">
                  Video URLs (One per line for bulk)
                </label>
                <textarea
                  className="input"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder={'https://youtube.com/watch?v=...\nhttps://youtube.com/shorts/...\nyoutu.be/...'}
                  rows={4}
                  style={{ resize: 'none', fontSize: 13, fontFamily: 'var(--font-mono)' }}
                />
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
                  Supports <code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>watch?v=</code>, <code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>shorts/</code>, <code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>youtu.be/</code>, and bare video IDs
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  {urlInput.split('\n').filter(l => l.trim()).length} URL(s) detected
                </div>
              </div>

              {addError && (
                <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#DC2626', fontSize: 11 }}>
                  {addError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-blue"
                  onClick={handleAdd}
                  disabled={!urlInput.trim() || addMutation.isPending}
                  style={{ flex: 1, height: 40 }}
                >
                  {addMutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Adding...</> : <><Check size={16} /> Add Videos</>}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowAdd(false)}
                  style={{ flex: 1, height: 40 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
        document.body
        )}
    </>
  )
}

function ComparisonCard({ label, ours, theirs, total, isCurrency, isPercent, color, diff }: {
  label: string; ours: number; theirs: number; total?: number; isCurrency?: boolean; isPercent?: boolean; color: string; diff?: number | null
}) {
  const oursDisplay = isPercent ? `${ours}%` : isCurrency ? fmt(ours) : fmt(ours)
  const theirsDisplay = isPercent ? `${theirs}%` : isCurrency ? fmt(theirs) : fmt(theirs)
  const better = isPercent ? ours > theirs : ours > theirs
  const worse = isPercent ? ours < theirs : ours < theirs

  return (
    <div style={{ padding: '12px 14px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color }}>{oursDisplay}</span>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>ours</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#64748B' }}>{theirsDisplay}</span>
        <span style={{ fontSize: 10, color: '#94A3B8' }}>others</span>
      </div>
      {diff != null && (
        <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: diff >= 0 ? '#059669' : '#DC2626' }}>
          {diff >= 0 ? '+' : ''}{diff}% vs others avg
        </div>
      )}
      {better && <div style={{ marginTop: 4, fontSize: 9, fontWeight: 700, color: '#059669' }}>Outperforming</div>}
      {worse && <div style={{ marginTop: 4, fontSize: 9, fontWeight: 700, color: '#DC2626' }}>Underperforming</div>}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <Video size={40} style={{ color: '#E2E8F0', marginBottom: 12 }} />
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>No Our Videos Yet</h3>
      <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Click &quot;Add Videos&quot; to start tracking your YouTube content.</p>
    </div>
  )
}
