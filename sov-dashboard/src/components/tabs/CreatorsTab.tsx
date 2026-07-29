'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCampaignStore } from '@/lib/store'
import {
  BarChart, Bar, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis
} from 'recharts'
import {
  Users, Star, Layers, Zap, Info, ExternalLink, Video, Eye, ChevronRight, ChevronDown, Search, ArrowUp, ArrowDown, Download, Hash, Award, TrendingUp, Loader2, X
} from 'lucide-react'
import { useFilterStore } from '@/lib/filter-store'
import { useRouter } from 'next/navigation'

const C = [
  '#4C78A8', '#54A24B', '#E45756', '#72B7B2', '#EECA3B',
  '#B279A2', '#FF9DA6', '#9D755D', '#BAB0AC', '#D67195',
  '#F58518', '#38BDF8', '#10B981', '#F59E0B', '#8B5CF6',
]

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function fmtIndian(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  if (n >= 1e7) return (n / 1e7).toFixed(1) + ' Cr'
  if (n >= 1e5) return (n / 1e5).toFixed(1) + ' Lakh'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' K'
  return n.toLocaleString('en-IN')
}

function Rank({ n }: { n: number }) {
  const c = n <= 3 ? '#059669' : n <= 5 ? '#1A73E8' : n <= 10 ? '#7C3AED' : '#D97706'
  const bg = n <= 3 ? 'rgba(5,150,105,0.08)' : n <= 5 ? 'rgba(26,115,232,0.08)' : n <= 10 ? 'rgba(124,58,237,0.08)' : 'rgba(217,119,6,0.08)'
  return <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: bg, color: c, whiteSpace: 'nowrap' }}>#{n}</span>
}

function MetricCard({ label, value, icon: Icon, color, info, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; info: string; sub?: string
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <Icon size={12} style={{ color, flexShrink: 0 }} />
          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</span>
        </div>
        <div style={{ color: '#CBD5E1', cursor: 'help', flexShrink: 0, marginLeft: 4 }} title={info}><Info size={10} /></div>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1, marginTop: 8 }}>{value}</div>
        {sub && <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  )
}

function Card({ title, sub, height = 280, children, info }: {
  title: string; sub?: string; height?: number; children: React.ReactNode; info?: string
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
            {info && <span title={info} style={{ cursor: 'help', color: '#CBD5E1', flexShrink: 0 }}><Info size={12} /></span>}
          </div>
          {sub && <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
      <div style={{ height, flex: 1, position: 'relative' }}>{children}</div>
    </div>
  )
}

export default function CreatorsTab() {
  const { format, setFormat } = useFilterStore()
  const { activeCampaignId } = useCampaignStore()

  const [creatorMinVideos, setCreatorMinVideos] = useState<number>(1)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'views', direction: 'desc' })
  const [search, setSearch] = useState('')
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [videoFilters, setVideoFilters] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)
  const [expandedCreatorId, setExpandedCreatorId] = useState<string | null>(null)
  const [creatorDetail, setCreatorDetail] = useState<any>(null)
  const [creatorDetailLoading, setCreatorDetailLoading] = useState(false)
  const [kwTab, setKwTab] = useState<'top5' | 'top10' | 'all'>('all')
  const [expandedKws, setExpandedKws] = useState<Set<string>>(new Set())
  const [kwSortMode, setKwSortMode] = useState<'views' | 'frequency'>('views')
  const [kwFormatFilter, setKwFormatFilter] = useState<'all' | 'short' | 'long'>('all')
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  const { data: rawCreators = [], isLoading } = useQuery({
    queryKey: ['creators', activeCampaignId, format],
    queryFn: async () => {
      if (!activeCampaignId) return []
      const res = await fetch(`/api/creators?campaign_id=${activeCampaignId}&format=${format}`)
      if (!res.ok) return []
      const d = await res.json()
      return d.creators || []
    },
    enabled: !!activeCampaignId
  })

  const analytics = useMemo(() => {
    let channels = rawCreators.filter((c: any) => c.count >= creatorMinVideos)
    if (sortConfig.key === 'frequency') {
      channels = [...channels].sort((a, b) => sortConfig.direction === 'asc' ? a.kwCount - b.kwCount : b.kwCount - a.kwCount)
    } else if (sortConfig.key === 'growth') {
      channels = [...channels].sort((a, b) => sortConfig.direction === 'asc' ? a.dailyGrowthPct - b.dailyGrowthPct : b.dailyGrowthPct - a.dailyGrowthPct)
    } else if (sortConfig.key === 'authority') {
      channels = [...channels].sort((a, b) => {
        const authA = (a.top5_hits * 2) + a.top10_hits
        const authB = (b.top5_hits * 2) + b.top10_hits
        return sortConfig.direction === 'asc' ? authA - authB : authB - authA
      })
    } else {
      channels = [...channels].sort((a, b) => sortConfig.direction === 'asc' ? a.views - b.views : b.views - a.views)
    }

    const topCreators50 = channels.slice(0, 50)

    const scatterData = topCreators50.map((c: any, i: number) => ({
      name: c.name,
      x: c.kwCount,
      y: c.avgViews,
      z: c.views,
      color: C[i % C.length]
    }))

    const top8Creators = channels.slice(0, 8)
    const allBrandsSet = new Set<string>()
    top8Creators.forEach((c: any) => (c.brandsList || []).forEach((b: any) => allBrandsSet.add(b.name)))
    const brandAlignmentData = top8Creators.map((c: any) => {
      const row: any = { name: c.name.length > 11 ? c.name.slice(0, 11) + '...' : c.name }
        ; (c.brandsList || []).forEach((b: any) => {
          row[b.name] = c.views > 0 ? Math.round((b.views / c.views) * 100) : 0
        })
      return row
    })

    const maxDailyGrowth = Math.max(...channels.map((c: any) => c.dailyGrowth || 0), 1)

    return { channels, scatterData, brandAlignmentData, allBrands: Array.from(allBrandsSet), maxDailyGrowth }
  }, [rawCreators, creatorMinVideos, sortConfig])

  const fetchCreatorDetail = async (creatorId: string) => {
    if (expandedCreatorId === creatorId) {
      setExpandedCreatorId(null)
      setCreatorDetail(null)
      return
    }
    setExpandedCreatorId(creatorId)
    setCreatorDetailLoading(true)
    setCreatorDetail(null)
    setKwTab('all')
    setExpandedKws(new Set())
    setKwSortMode('views')
    setKwFormatFilter('all')
    try {
      const res = await fetch(`/api/creators/${encodeURIComponent(creatorId)}?campaign_id=${activeCampaignId}&format=${format}`)
      const d = await res.json()
      if (!d.error) setCreatorDetail(d)
    } catch {}
    setCreatorDetailLoading(false)
  }

  if (!mounted) return null

  const { channels, scatterData, brandAlignmentData, allBrands, maxDailyGrowth } = analytics
  const filteredChannels = channels.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* Header & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            Creator Sponsorship & Reach Intelligence
            {isLoading && <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginLeft: 8 }}>Loading...</span>}
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Evaluate influencer performance across YouTube search terms to select optimal brand partners.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF', padding: '4px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <Search size={14} color="#64748B" />
            <input
              placeholder="Search creators..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 12, width: 140 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Format:</span>
            <select
              value={format} onChange={(e) => setFormat(e.target.value as 'all' | 'long' | 'short')}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 600, background: '#FFF', outline: 'none' }}
            >
              <option value="all">All</option>
              <option value="long">Long-form</option>
              <option value="short">Shorts</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Min Videos:</span>
            <select
              value={creatorMinVideos} onChange={(e) => setCreatorMinVideos(Number(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 600, background: '#FFF', outline: 'none' }}
            >
              <option value={1}>1+ Videos</option>
              <option value={2}>2+ Videos</option>
              <option value={3}>3+ Videos</option>
              <option value={5}>5+ Videos</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <MetricCard label="Total Creators" value={channels.length} icon={Users} color="#1A73E8" sub="Unique channels indexed" info="Total number of unique YouTube channels found in search." />
        <MetricCard label="High Impact Partners" value={channels.filter((c: any) => c.avgViews > 100_000 || c.bestRank <= 3).length} icon={Star} color="#EA580C" sub="Top #3 Rank or >100K avg views" info="Creators with massive reach or top search dominance." />
        <MetricCard label="Avg Partnership Reach" value={channels.length > 0 ? fmt(Math.round(channels.reduce((s: any, c: any) => s + c.avgViews, 0) / channels.length)) : '—'} icon={Eye} color="#059669" sub="Average views per video" info="Average view count across all videos for these creators." />
        <MetricCard label="Multi-Brand Creators" value={channels.filter((c: any) => (c.brandCount || 0) > 1).length} icon={Layers} color="#7C3AED" sub="Spans 2+ competitor brands" info="Creators who have reviewed or featured multiple brands." />
        <MetricCard label="Shorts Specialists" value={channels.filter((c: any) => c.shortsRatio > 60).length} icon={Zap} color="#EC4899" sub=">60% Shorts ratio" info="Channels where over 60% of indexed content are Shorts." />
      </div>

      {/* Top 10 Creators Intelligence */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>Top 10 Creators Intelligence</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {filteredChannels.slice(0, 10).map((c: any, i: number) => (
            <div
              key={c.id}
              onClick={() => fetchCreatorDetail(c.id)}
              style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', borderRadius: 16, border: expandedCreatorId === c.id ? '1.5px solid #1A73E8' : '1px solid #E2E8F0', padding: 20, boxShadow: expandedCreatorId === c.id ? '0 4px 16px rgba(26,115,232,0.12)' : '0 2px 4px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (expandedCreatorId !== c.id) { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' } }}
              onMouseLeave={e => { if (expandedCreatorId !== c.id) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)' } }}
            >
              <div style={{ position: 'absolute', top: -14, right: -10, fontSize: 64, fontWeight: 900, color: '#F1F5F9', zIndex: 0 }}>#{i + 1}</div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Views</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#1A73E8', fontFamily: "'JetBrains Mono',monospace" }}>{fmt(c.views)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Keywords</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#334155' }}>{c.kwCount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Brands</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#334155' }}>{c.brandCount}</div>
                    </div>
                  </div>
                  {c.brandCount > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {c.brandsList.slice(0, 3).map((b: any) => (
                        <span key={b.name} style={{ fontSize: 9, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: 6 }}>{b.name}</span>
                      ))}
                      {c.brandCount > 3 && <span style={{ fontSize: 9, fontWeight: 700, background: '#F1F5F9', color: '#64748B', padding: '2px 6px', borderRadius: 6 }}>+{c.brandCount - 3}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inline Creator Intelligence Expansion */}
      {expandedCreatorId && (
        <div style={{ background: '#FFF', borderRadius: 14, border: '1.5px solid rgba(26,115,232,0.15)', boxShadow: '0 4px 20px rgba(26,115,232,0.06)', overflow: 'hidden' }}>
          {/* Expansion Header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(26,115,232,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(26,115,232,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--blue-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#FFF', flexShrink: 0, boxShadow: '0 4px 12px var(--blue-glow)' }}>
                {creatorDetail?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-bright)' }}>{creatorDetail?.name || 'Loading...'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Creator Intelligence Deep Dive</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {creatorDetail?.channelId && (
                <a href={`https://youtube.com/channel/${creatorDetail.channelId}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(255,45,85,0.25)', background: 'var(--red-dim)' }}>
                  YouTube <ExternalLink size={11} />
                </a>
              )}
              <button onClick={() => { setExpandedCreatorId(null); setCreatorDetail(null) }} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-1)', background: '#FFF', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {creatorDetailLoading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <Loader2 size={24} style={{ color: 'var(--blue)', animation: 'spin 1s linear infinite', marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Loading…</div>
            </div>
          ) : creatorDetail ? (
            <div style={{ padding: '14px 20px 18px' }}>
              {/* KPI Strip - compact single row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[
                  { icon: Eye, label: 'Views', value: fmt(creatorDetail.totalViews), color: 'var(--blue)' },
                  { icon: TrendingUp, label: 'Avg/Video', value: fmt(creatorDetail.avgViews), color: 'var(--green)' },
                  { icon: Star, label: 'Top 5', value: creatorDetail.top5_hits, color: 'var(--orange)' },
                  { icon: Hash, label: 'Top 10', value: creatorDetail.top10_hits, color: 'var(--violet)' },
                  { icon: Award, label: 'Best Rank', value: creatorDetail.bestRank ? `#${creatorDetail.bestRank}` : '—', color: 'var(--orange)' },
                  { icon: TrendingUp, label: 'Growth', value: `${creatorDetail.dailyGrowthPct > 0 ? '+' : ''}${creatorDetail.dailyGrowthPct}%`, color: creatorDetail.dailyGrowthPct > 5 ? 'var(--green)' : 'var(--blue)' },
                ].map((kpi, i) => (
                  <div key={i} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-1)', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <kpi.icon size={11} style={{ color: kpi.color }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{kpi.label}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-bright)', lineHeight: 1.1 }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Keyword Rankings - Full Width */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border-1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>Keyword Rankings & Videos</div>
                    <span className="badge badge-blue" style={{ fontSize: 9 }}>{creatorDetail.videos?.length || 0} videos</span>
                  </div>
                  {/* Tabs + Format + Sort Filters row */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 3, background: 'var(--bg-elevated)', padding: 3, borderRadius: 7, border: '1px solid var(--border-1)' }}>
                      {[
                        { id: 'all', label: 'All', count: (creatorDetail.keywordRankings?.top5?.length || 0) + (creatorDetail.keywordRankings?.top10?.length || 0) + (creatorDetail.keywordRankings?.beyond10?.length || 0) },
                        { id: 'top5', label: 'Top 5', count: creatorDetail.keywordRankings?.top5?.length || 0 },
                        { id: 'top10', label: 'Top 6-10', count: creatorDetail.keywordRankings?.top10?.length || 0 },
                      ].map(tab => (
                        <button key={tab.id} onClick={() => setKwTab(tab.id as any)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: kwTab === tab.id ? '#FFF' : 'transparent', color: kwTab === tab.id ? 'var(--text-bright)' : 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: kwTab === tab.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.12s' }}>
                          {tab.label}
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '0 4px', borderRadius: 8, background: kwTab === tab.id ? 'var(--blue-dim)' : 'transparent', color: kwTab === tab.id ? 'var(--blue)' : 'var(--text-muted)' }}>{tab.count}</span>
                        </button>
                      ))}
                    </div>
                    <div style={{ width: 1, height: 18, background: 'var(--border-1)' }} />
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[
                        { id: 'all', label: 'All Formats' },
                        { id: 'short', label: 'Shorts' },
                        { id: 'long', label: 'Long' },
                      ].map(f => (
                        <button key={f.id} onClick={() => setKwFormatFilter(f.id as any)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: kwFormatFilter === f.id ? (f.id === 'short' ? 'var(--red-dim)' : f.id === 'long' ? 'var(--blue-dim)' : 'var(--bg-elevated)') : 'transparent', color: kwFormatFilter === f.id ? (f.id === 'short' ? 'var(--red)' : f.id === 'long' ? 'var(--blue)' : 'var(--text-primary)') : 'var(--text-muted)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ width: 1, height: 18, background: 'var(--border-1)' }} />
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button onClick={() => setKwSortMode('views')} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: kwSortMode === 'views' ? 'var(--blue-dim)' : 'transparent', color: kwSortMode === 'views' ? 'var(--blue)' : 'var(--text-muted)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                        By Views
                      </button>
                      <button onClick={() => setKwSortMode('frequency')} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: kwSortMode === 'frequency' ? 'var(--orange-dim)' : 'transparent', color: kwSortMode === 'frequency' ? 'var(--orange)' : 'var(--text-muted)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                        By Frequency
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '8px 10px' }}>Keyword</th>
                          <th style={{ padding: '8px 8px', textAlign: 'center', width: 48 }}>Rank</th>
                          <th style={{ padding: '8px 8px', textAlign: 'center', width: 44 }}>Vids</th>
                          <th style={{ padding: '8px 8px', textAlign: 'center', width: 64 }}>Views</th>
                          <th style={{ padding: '8px 8px', textAlign: 'center', width: 44 }}>Type</th>
                          <th style={{ padding: '8px 4px', width: 24 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let kws = []
                          if (kwTab === 'all') {
                            kws = [...(creatorDetail.keywordRankings?.top5 || []), ...(creatorDetail.keywordRankings?.top10 || []), ...(creatorDetail.keywordRankings?.beyond10 || [])]
                          } else {
                            kws = creatorDetail.keywordRankings?.[kwTab] || []
                          }
                          if (kwFormatFilter !== 'all') {
                            kws = kws.filter((kw: any) => {
                              if (!kw.videos) return false
                              return kwFormatFilter === 'short' ? kw.videos.some((v: any) => v.is_short) : kw.videos.some((v: any) => !v.is_short)
                            })
                          }
                          kws = [...kws].sort((a: any, b: any) => {
                            if (kwSortMode === 'views') return (b.totalViews || 0) - (a.totalViews || 0)
                            return (b.videos?.length || b.videoCount || 0) - (a.videos?.length || a.videoCount || 0)
                          })
                          if (kws.length === 0) return <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: 12 }}>No keywords match filters</td></tr>
                          return kws.map((kw: any) => (
                            <React.Fragment key={kw.keyword}>
                              <tr className="row-hover" style={{ cursor: 'pointer' }} onClick={() => { const n = new Set(expandedKws); if (n.has(kw.keyword)) n.delete(kw.keyword); else n.add(kw.keyword); setExpandedKws(n) }}>
                                <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 12 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Search size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{kw.keyword}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center' }}><Rank n={kw.rank} /></td>
                                <td style={{ padding: '8px', textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--text-primary)', fontSize: 11 }}>{kw.videos?.length || kw.videoCount || 0}</td>
                                <td style={{ padding: '8px', textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--blue)', fontSize: 11 }}>{fmt(kw.totalViews)}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: kw.videos?.every((v: any) => v.is_short) ? 'var(--red-dim)' : kw.videos?.every((v: any) => !v.is_short) ? 'var(--blue-dim)' : 'var(--bg-elevated)', color: kw.videos?.every((v: any) => v.is_short) ? 'var(--red)' : kw.videos?.every((v: any) => !v.is_short) ? 'var(--blue)' : 'var(--text-secondary)' }}>
                                    {kw.videos?.every((v: any) => v.is_short) ? 'Short' : kw.videos?.every((v: any) => !v.is_short) ? 'Long' : 'Mix'}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{expandedKws.has(kw.keyword) ? <ChevronDown size={12} color="var(--text-muted)" /> : <ChevronRight size={12} color="var(--text-muted)" />}</td>
                              </tr>
                              {expandedKws.has(kw.keyword) && kw.videos && (
                                <tr>
                                  <td colSpan={6} style={{ padding: '0 8px 8px' }}>
                                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
                                      {kw.videos.filter((v: any) => {
                                        if (kwFormatFilter === 'all') return true
                                        if (kwFormatFilter === 'short') return v.is_short
                                        if (kwFormatFilter === 'long') return !v.is_short
                                        return true
                                      }).map((v: any, vi: number, arr: any[]) => (
                                        <a key={v.id} href={`/video/${v.youtube_id}`} className="row-hover" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 10px', textDecoration: 'none', borderBottom: vi < arr.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                                          <div style={{ width: 38, height: 38, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-hover)' }}>
                                            {v.thumbnail_url && <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                                            <div style={{ display: 'flex', gap: 5, fontSize: 10, color: 'var(--text-muted)', marginTop: 2, alignItems: 'center' }}>
                                              <span className="mono" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{fmtIndian(v.view_count)}</span>
                                              <span className="badge" style={{ fontSize: 8, padding: '0 4px', background: v.is_short ? 'var(--red-dim)' : 'var(--blue-dim)', color: v.is_short ? 'var(--red)' : 'var(--blue)' }}>{v.is_short ? 'Short' : 'Video'}</span>
                                              <span style={{ fontWeight: 700, color: v.rank <= 3 ? 'var(--green)' : v.rank <= 5 ? 'var(--blue)' : 'var(--violet)' }}>#{v.rank}</span>
                                            </div>
                                          </div>
                                        </a>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Brand Performance - below keyword table */}
                {creatorDetail.brandPerformance?.length > 0 && (
                  <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
                    <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>Brand Performance</div>
                      <span className="badge badge-purple" style={{ fontSize: 9 }}>{creatorDetail.brandCount} brands</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 0 }}>
                      {/* Brand Chart */}
                      <div style={{ padding: '12px 16px', borderRight: '1px solid var(--border-1)' }}>
                        <div style={{ height: 160 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={creatorDetail.brandPerformance.slice(0, 6).map((b: any, i: number) => ({ name: b.name.length > 10 ? b.name.slice(0, 10) + '…' : b.name, views: b.totalViews, fill: C[i % C.length] }))} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickFormatter={(v: any) => fmt(v)} axisLine={false} tickLine={false} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-primary)', fontWeight: 600 }} axisLine={false} tickLine={false} width={76} />
                              <RechartsTooltip
                                formatter={(value: any) => [fmtIndian(value), 'Views']}
                                contentStyle={{ background: 'var(--text-bright)', borderRadius: 8, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", padding: '8px 12px' }}
                                labelStyle={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 600, marginBottom: 2 }}
                                itemStyle={{ color: '#FFF', fontWeight: 700 }}
                                cursor={{ fill: 'var(--blue-dim)' }}
                              />
                              <Bar dataKey="views" radius={[0, 3, 3, 0]} maxBarSize={20}>
                                {creatorDetail.brandPerformance.slice(0, 6).map((_: any, idx: number) => <Cell key={idx} fill={C[idx % C.length]} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      {/* Brand List */}
                      <div style={{ padding: '8px 16px', maxHeight: 180, overflowY: 'auto' }}>
                        {creatorDetail.brandPerformance.slice(0, 6).map((brand: any, i: number) => (
                          <div key={brand.name} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < Math.min(creatorDetail.brandPerformance.length, 6) - 1 ? '1px solid var(--border-1)' : 'none' }}>
                            <div style={{ width: 6, height: 6, borderRadius: 3, background: C[i % C.length], flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{brand.name}</span>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>{brand.videoCount} videos</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <span className="mono" style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)' }}>{fmt(brand.totalViews)}</span>
                              <Rank n={brand.topKeywordRank} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          ) : null}
        </div>
      )}

      {/* Creator Leaderboard Table */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Creator Collaboration Leaderboard</div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>Ranked by overall daily view growth and keyword search dominance.</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                {[
                  { label: '#', key: '' },
                  { label: 'Creator Channel', key: 'name' },
                  { label: 'Daily View Growth', key: 'growth' },
                  { label: 'Total Views', key: 'views' },
                  { label: 'Avg Views/Vid', key: 'avgViews' },
                  { label: 'Keyword Freq', key: 'frequency' },
                  { label: 'Best Rank', key: 'bestRank' },
                  { label: 'Channel Authority', key: 'authority' },
                  { label: 'Action', key: '' }
                ].map(h => (
                  <th
                    key={h.label}
                    onClick={() => h.key ? setSortConfig(p => ({ key: h.key, direction: p.key === h.key && p.direction === 'desc' ? 'asc' : 'desc' })) : null}
                    style={{ padding: '12px 14px', textAlign: h.label === '#' || h.label === 'Best Rank' || h.label === 'Action' ? 'center' : 'left', fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', background: '#F8FAFC', cursor: h.key ? 'pointer' : 'default', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => { if (h.key) e.currentTarget.style.background = '#F1F5F9' }}
                    onMouseLeave={(e) => { if (h.key) e.currentTarget.style.background = '#F8FAFC' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: h.label === '#' || h.label === 'Best Rank' || h.label === 'Action' ? 'center' : 'flex-start', gap: 4 }}>
                      {h.label}
                      {sortConfig.key === h.key && (
                        sortConfig.direction === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredChannels.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    No creators found matching the current filters.
                  </td>
                </tr>
              ) : filteredChannels.map((c: any, i: number) => {
                const authorityScore = (c.top5_hits * 2) + c.top10_hits
                const authBadge = authorityScore > 50 ? { label: `Elite (${authorityScore})`, color: '#6D28D9', bg: '#F3E8FF' }
                  : authorityScore > 20 ? { label: `Strong (${authorityScore})`, color: '#1A73E8', bg: '#EFF6FF' }
                    : authorityScore > 5 ? { label: `Good (${authorityScore})`, color: '#059669', bg: '#ECFDF5' }
                      : { label: `Emerging (${authorityScore})`, color: '#64748B', bg: '#F8FAFC' }

                const isExpanded = expandedRowId === c.id

                return (
                  <React.Fragment key={c.id || c.name}>
                    <tr
                      style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: isExpanded ? '#F8FAFC' : 'transparent' }}
                      onClick={() => { if (expandedRowId === c.id) { setExpandedRowId(null); setExpandedCreatorId(null); setCreatorDetail(null) } else { setExpandedRowId(c.id); fetchCreatorDetail(c.id) } }}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = '#F8FAFC' }}
                      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, fontSize: 12, color: C[i % C.length] }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          #{i + 1}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${C[i % C.length]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C[i % C.length] }}>
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{c.name}</div>
                            <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>{c.shortsRatio > 50 ? 'Shorts Focus' : 'Long-form Focus'} · {c.count} vids</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: c.dailyGrowthPct > 5 ? '#10B981' : c.dailyGrowthPct > 1 ? '#3B82F6' : '#F59E0B' }}>
                            {c.dailyGrowthPct > 0 ? '+' : ''}{c.dailyGrowthPct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{fmt(c.views)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1A73E8', fontFamily: "'JetBrains Mono',monospace" }}>{fmt(c.avgViews)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: '#334155' }}>{c.kwCount} kws</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}><Rank n={c.bestRank || 99} /></td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: authBadge.bg, color: authBadge.color, whiteSpace: 'nowrap' }}>{authBadge.label}</span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); fetchCreatorDetail(c.id) }}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#FFF', color: '#1A73E8', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          Analyze <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && expandedCreatorId === c.id && creatorDetail && (
                      <tr style={{ background: '#F8FAFC' }}>
                        <td colSpan={9} style={{ padding: '14px 20px 18px' }}>
                          {/* KPI Strip - compact single row */}
                          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                            {[
                              { icon: Eye, label: 'Views', value: fmt(creatorDetail.totalViews), color: 'var(--blue)' },
                              { icon: TrendingUp, label: 'Avg/Video', value: fmt(creatorDetail.avgViews), color: 'var(--green)' },
                              { icon: Star, label: 'Top 5', value: creatorDetail.top5_hits, color: 'var(--orange)' },
                              { icon: Hash, label: 'Top 10', value: creatorDetail.top10_hits, color: 'var(--violet)' },
                              { icon: Award, label: 'Best Rank', value: creatorDetail.bestRank ? `#${creatorDetail.bestRank}` : '—', color: 'var(--orange)' },
                              { icon: TrendingUp, label: 'Growth', value: `${creatorDetail.dailyGrowthPct > 0 ? '+' : ''}${creatorDetail.dailyGrowthPct}%`, color: creatorDetail.dailyGrowthPct > 5 ? 'var(--green)' : 'var(--blue)' },
                            ].map((kpi, i) => (
                              <div key={i} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-1)', background: '#FFF' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                  <kpi.icon size={11} style={{ color: kpi.color }} />
                                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{kpi.label}</span>
                                </div>
                                <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-bright)', lineHeight: 1.1 }}>{kpi.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Keyword Rankings - Full Width */}
                          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
                            <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border-1)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>Keyword Rankings & Videos</div>
                                <span className="badge badge-blue" style={{ fontSize: 9 }}>{creatorDetail.videos?.length || 0} videos</span>
                              </div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: 3, background: 'var(--bg-elevated)', padding: 3, borderRadius: 7, border: '1px solid var(--border-1)' }}>
                                  {[
                                    { id: 'all', label: 'All', count: (creatorDetail.keywordRankings?.top5?.length || 0) + (creatorDetail.keywordRankings?.top10?.length || 0) + (creatorDetail.keywordRankings?.beyond10?.length || 0) },
                                    { id: 'top5', label: 'Top 5', count: creatorDetail.keywordRankings?.top5?.length || 0 },
                                    { id: 'top10', label: 'Top 6-10', count: creatorDetail.keywordRankings?.top10?.length || 0 },
                                  ].map(tab => (
                                    <button key={tab.id} onClick={() => setKwTab(tab.id as any)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: kwTab === tab.id ? '#FFF' : 'transparent', color: kwTab === tab.id ? 'var(--text-bright)' : 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: kwTab === tab.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.12s' }}>
                                      {tab.label}
                                      <span style={{ fontSize: 9, fontWeight: 800, padding: '0 4px', borderRadius: 8, background: kwTab === tab.id ? 'var(--blue-dim)' : 'transparent', color: kwTab === tab.id ? 'var(--blue)' : 'var(--text-muted)' }}>{tab.count}</span>
                                    </button>
                                  ))}
                                </div>
                                <div style={{ width: 1, height: 18, background: 'var(--border-1)' }} />
                                <div style={{ display: 'flex', gap: 3 }}>
                                  {[
                                    { id: 'all', label: 'All Formats' },
                                    { id: 'short', label: 'Shorts' },
                                    { id: 'long', label: 'Long' },
                                  ].map(f => (
                                    <button key={f.id} onClick={() => setKwFormatFilter(f.id as any)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: kwFormatFilter === f.id ? (f.id === 'short' ? 'var(--red-dim)' : f.id === 'long' ? 'var(--blue-dim)' : 'var(--bg-elevated)') : 'transparent', color: kwFormatFilter === f.id ? (f.id === 'short' ? 'var(--red)' : f.id === 'long' ? 'var(--blue)' : 'var(--text-primary)') : 'var(--text-muted)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                                      {f.label}
                                    </button>
                                  ))}
                                </div>
                                <div style={{ width: 1, height: 18, background: 'var(--border-1)' }} />
                                <div style={{ display: 'flex', gap: 3 }}>
                                  <button onClick={() => setKwSortMode('views')} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: kwSortMode === 'views' ? 'var(--blue-dim)' : 'transparent', color: kwSortMode === 'views' ? 'var(--blue)' : 'var(--text-muted)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                                    By Views
                                  </button>
                                  <button onClick={() => setKwSortMode('frequency')} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: kwSortMode === 'frequency' ? 'var(--orange-dim)' : 'transparent', color: kwSortMode === 'frequency' ? 'var(--orange)' : 'var(--text-muted)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                                    By Frequency
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                              <table className="data-table" style={{ fontSize: 12 }}>
                                <thead>
                                  <tr>
                                    <th style={{ padding: '8px 10px' }}>Keyword</th>
                                    <th style={{ padding: '8px 8px', textAlign: 'center', width: 48 }}>Rank</th>
                                    <th style={{ padding: '8px 8px', textAlign: 'center', width: 44 }}>Vids</th>
                                    <th style={{ padding: '8px 8px', textAlign: 'center', width: 64 }}>Views</th>
                                    <th style={{ padding: '8px 8px', textAlign: 'center', width: 44 }}>Type</th>
                                    <th style={{ padding: '8px 4px', width: 24 }}></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    let kws = []
                                    if (kwTab === 'all') {
                                      kws = [...(creatorDetail.keywordRankings?.top5 || []), ...(creatorDetail.keywordRankings?.top10 || []), ...(creatorDetail.keywordRankings?.beyond10 || [])]
                                    } else {
                                      kws = creatorDetail.keywordRankings?.[kwTab] || []
                                    }
                                    if (kwFormatFilter !== 'all') {
                                      kws = kws.filter((kw: any) => {
                                        if (!kw.videos) return false
                                        return kwFormatFilter === 'short' ? kw.videos.some((v: any) => v.is_short) : kw.videos.some((v: any) => !v.is_short)
                                      })
                                    }
                                    kws = [...kws].sort((a: any, b: any) => {
                                      if (kwSortMode === 'views') return (b.totalViews || 0) - (a.totalViews || 0)
                                      return (b.videos?.length || b.videoCount || 0) - (a.videos?.length || a.videoCount || 0)
                                    })
                                    if (kws.length === 0) return <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: 12 }}>No keywords match filters</td></tr>
                                    return kws.map((kw: any) => (
                                      <React.Fragment key={kw.keyword}>
                                        <tr className="row-hover" style={{ cursor: 'pointer' }} onClick={() => { const n = new Set(expandedKws); if (n.has(kw.keyword)) n.delete(kw.keyword); else n.add(kw.keyword); setExpandedKws(n) }}>
                                          <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                              <Search size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{kw.keyword}</span>
                                            </div>
                                          </td>
                                          <td style={{ padding: '8px', textAlign: 'center' }}><Rank n={kw.rank} /></td>
                                          <td style={{ padding: '8px', textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--text-primary)', fontSize: 11 }}>{kw.videos?.length || kw.videoCount || 0}</td>
                                          <td style={{ padding: '8px', textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--blue)', fontSize: 11 }}>{fmt(kw.totalViews)}</td>
                                          <td style={{ padding: '8px', textAlign: 'center' }}>
                                            <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: kw.videos?.every((v: any) => v.is_short) ? 'var(--red-dim)' : kw.videos?.every((v: any) => !v.is_short) ? 'var(--blue-dim)' : 'var(--bg-elevated)', color: kw.videos?.every((v: any) => v.is_short) ? 'var(--red)' : kw.videos?.every((v: any) => !v.is_short) ? 'var(--blue)' : 'var(--text-secondary)' }}>
                                              {kw.videos?.every((v: any) => v.is_short) ? 'Short' : kw.videos?.every((v: any) => !v.is_short) ? 'Long' : 'Mix'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>{expandedKws.has(kw.keyword) ? <ChevronDown size={12} color="var(--text-muted)" /> : <ChevronRight size={12} color="var(--text-muted)" />}</td>
                                        </tr>
                                        {expandedKws.has(kw.keyword) && kw.videos && (
                                          <tr>
                                            <td colSpan={6} style={{ padding: '0 8px 8px' }}>
                                              <div style={{ background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
                                                {kw.videos.filter((v: any) => {
                                                  if (kwFormatFilter === 'all') return true
                                                  if (kwFormatFilter === 'short') return v.is_short
                                                  if (kwFormatFilter === 'long') return !v.is_short
                                                  return true
                                                }).map((v: any, vi: number, arr: any[]) => (
                                                  <a key={v.id} href={`/video/${v.youtube_id}`} className="row-hover" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 10px', textDecoration: 'none', borderBottom: vi < arr.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                                                    <div style={{ width: 38, height: 38, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-hover)' }}>
                                                      {v.thumbnail_url && <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                                                      <div style={{ display: 'flex', gap: 5, fontSize: 10, color: 'var(--text-muted)', marginTop: 2, alignItems: 'center' }}>
                                                        <span className="mono" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{fmtIndian(v.view_count)}</span>
                                                        <span className="badge" style={{ fontSize: 8, padding: '0 4px', background: v.is_short ? 'var(--red-dim)' : 'var(--blue-dim)', color: v.is_short ? 'var(--red)' : 'var(--blue)' }}>{v.is_short ? 'Short' : 'Video'}</span>
                                                        <span style={{ fontWeight: 700, color: v.rank <= 3 ? 'var(--green)' : v.rank <= 5 ? 'var(--blue)' : 'var(--violet)' }}>#{v.rank}</span>
                                                      </div>
                                                    </div>
                                                  </a>
                                                ))}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    ))
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Brand Performance */}
                          {creatorDetail.brandPerformance?.length > 0 && (
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                              <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>Brand Performance</div>
                                <span className="badge badge-purple" style={{ fontSize: 9 }}>{creatorDetail.brandCount} brands</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 0 }}>
                                <div style={{ padding: '12px 16px', borderRight: '1px solid var(--border-1)' }}>
                                  <div style={{ height: 160 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={creatorDetail.brandPerformance.slice(0, 6).map((b: any, i: number) => ({ name: b.name.length > 10 ? b.name.slice(0, 10) + '…' : b.name, views: b.totalViews, fill: C[i % C.length] }))} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickFormatter={(v: any) => fmt(v)} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-primary)', fontWeight: 600 }} axisLine={false} tickLine={false} width={76} />
                                        <RechartsTooltip
                                          formatter={(value: any) => [fmtIndian(value), 'Views']}
                                          contentStyle={{ background: 'var(--text-bright)', borderRadius: 8, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", padding: '8px 12px' }}
                                          labelStyle={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 600, marginBottom: 2 }}
                                          itemStyle={{ color: '#FFF', fontWeight: 700 }}
                                          cursor={{ fill: 'var(--blue-dim)' }}
                                        />
                                        <Bar dataKey="views" radius={[0, 3, 3, 0]} maxBarSize={20}>
                                          {creatorDetail.brandPerformance.slice(0, 6).map((_: any, idx: number) => <Cell key={idx} fill={C[idx % C.length]} />)}
                                        </Bar>
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                                <div style={{ padding: '8px 16px', maxHeight: 180, overflowY: 'auto' }}>
                                  {creatorDetail.brandPerformance.slice(0, 6).map((brand: any, i: number) => (
                                    <div key={brand.name} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < Math.min(creatorDetail.brandPerformance.length, 6) - 1 ? '1px solid var(--border-1)' : 'none' }}>
                                      <div style={{ width: 6, height: 6, borderRadius: 3, background: C[i % C.length], flexShrink: 0 }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{brand.name}</span>
                                        <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>{brand.videoCount} videos</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <span className="mono" style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)' }}>{fmt(brand.totalViews)}</span>
                                        <Rank n={brand.topKeywordRank} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
