'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCampaignStore } from '@/lib/store'
import {
  BarChart, Bar, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis
} from 'recharts'
import {
  Users, Star, Layers, Zap, Info, ExternalLink, Video, Eye, ChevronRight, ChevronDown, Search, ArrowUp, ArrowDown
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
  const [videoFilter, setVideoFilter] = useState<'all' | 'top5' | 'top10' | 'shorts' | 'long'>('all')
  const [mounted, setMounted] = useState(false)
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

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card
          title="Creator Reach vs Efficiency"
          sub="Bubble size indicates total views. Displays top 50 creators."
          height={260}
          info="Locate creators with both high keyword frequency and high average views."
        >
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" dataKey="x" name="Keyword Freq" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis type="number" dataKey="y" name="Avg Views" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <ZAxis type="number" dataKey="z" range={[20, 400]} name="Total Views" />
                <RechartsTooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload
                      return (
                        <div style={{ background: '#0F172A', padding: '8px 12px', borderRadius: 8, color: '#FFF', fontSize: 11 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                          <div>Total Views: {fmt(d.z)}</div>
                          <div>Avg Views: {fmt(d.y)}</div>
                          <div>Keywords: {d.x}</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: 12 }}>Insufficient data for scatter plot</div>
          )}
        </Card>

        <Card title="Creator-Brand View Share Matrix" sub="Which brands drive viewership for top creator channels" height={260}>
          {brandAlignmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandAlignmentData} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
                <RechartsTooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#FFF' }} />
                {allBrands.slice(0, 5).map((b, i) => (
                  <Bar key={b} dataKey={b} stackId="a" fill={C[i % C.length]} radius={i === 0 ? [2, 0, 0, 2] : [0, 2, 2, 0]} barSize={16} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: 12 }}>No brand alignment data available</div>
          )}
        </Card>
      </div>

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
                      onClick={() => setExpandedRowId(isExpanded ? null : c.id)}
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
                          onClick={(e) => { e.stopPropagation(); router.push('/channel/' + encodeURIComponent(c.name)) }}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#FFF', color: '#1A73E8', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          Analyze <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: '#F8FAFC' }}>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div style={{ padding: '20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
                              {/* Left Col: Channel Summary */}
                              <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 0, marginBottom: 16 }}>Performance Summary</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                  <div><div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Top 5 Hits</div><div style={{ fontSize: 20, fontWeight: 800, color: '#059669', fontFamily: "'JetBrains Mono',monospace" }}>{c.top5_hits}</div></div>
                                  <div><div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Top 10 Hits</div><div style={{ fontSize: 20, fontWeight: 800, color: '#1A73E8', fontFamily: "'JetBrains Mono',monospace" }}>{c.top10_hits}</div></div>
                                  <div><div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Avg Views</div><div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{fmt(c.avgViews)}</div></div>
                                  <div><div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Daily Growth</div><div style={{ fontSize: 16, fontWeight: 800, color: c.dailyGrowthPct > 5 ? '#10B981' : '#3B82F6', fontFamily: "'JetBrains Mono',monospace" }}>{c.dailyGrowthPct > 0 ? '+' : ''}{c.dailyGrowthPct}%</div></div>
                                </div>
                                <h4 style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 10 }}>Top Keywords Covered</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {(c.kws || []).slice(0, 12).map((kw: any) => (
                                    <span key={kw} style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>{kw}</span>
                                  ))}
                                  {(c.kws || []).length > 12 && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#F8FAFC', color: '#94A3B8' }}>+{c.kws.length - 12} more</span>}
                                </div>
                              </div>

                              {/* Right Col: Video List */}
                              <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                  <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>Indexed Videos</h4>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>{c.count} total</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                                  {[
                                    { id: 'all', label: 'All' },
                                    { id: 'top5', label: 'Top 5s' },
                                    { id: 'top10', label: 'Top 10s' },
                                    { id: 'shorts', label: 'Shorts' },
                                    { id: 'long', label: 'Long Form' }
                                  ].map(f => (
                                    <button
                                      key={f.id}
                                      onClick={() => setVideoFilter(f.id as any)}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        borderRadius: 6,
                                        border: `1px solid ${videoFilter === f.id ? '#1A73E8' : '#E2E8F0'}`,
                                        background: videoFilter === f.id ? '#EFF6FF' : '#FFF',
                                        color: videoFilter === f.id ? '#1A73E8' : '#64748B',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {f.label}
                                    </button>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 6 }}>
                                  {(() => {
                                    let filtered = c.creatorVideos || [];
                                    if (videoFilter === 'top5') filtered = filtered.filter((v: any) => v.top5_hits > 0);
                                    if (videoFilter === 'top10') filtered = filtered.filter((v: any) => v.top10_hits > 0);
                                    if (videoFilter === 'shorts') filtered = filtered.filter((v: any) => v.is_short);
                                    if (videoFilter === 'long') filtered = filtered.filter((v: any) => !v.is_short);
                                    
                                    if (filtered.length === 0) {
                                      return <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>No videos match this filter.</div>
                                    }
                                    
                                    return filtered.map((v: any) => (
                                      <a key={v.id} href={`https://www.youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                        <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#FFF', border: '1px solid #F1F5F9', padding: '10px 14px', borderRadius: 10, transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#F1F5F9'; e.currentTarget.style.boxShadow = 'none' }}>
                                          <div style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', flexShrink: 0, background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
                                            {v.thumbnail_url && <img src={v.thumbnail_url} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</span>
                                              <ExternalLink size={12} style={{ color: '#94A3B8', flexShrink: 0 }} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: '#64748B' }}>
                                              <span style={{ fontWeight: 700, color: '#334155' }}>{fmtIndian(v.view_count)} views</span>
                                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 700, background: '#ECFDF5', padding: '2px 6px', borderRadius: 4 }}><Star size={10} /> {v.top5_hits} Top 5s</span>
                                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#1A73E8', fontWeight: 700, background: '#EFF6FF', padding: '2px 6px', borderRadius: 4 }}><Star size={10} /> {v.top10_hits} Top 10s</span>
                                              <span style={{ color: v.is_short ? '#EC4899' : '#1A73E8', fontWeight: 600 }}>{v.is_short ? 'Short' : 'Video'}</span>
                                            </div>
                                          </div>
                                          <div style={{ flexShrink: 0, paddingLeft: 10 }}><Rank n={v.best_rank || 99} /></div>
                                        </div>
                                      </a>
                                    ))
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
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
