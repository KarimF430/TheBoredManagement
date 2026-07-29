'use client'

import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis, Legend
} from 'recharts'
import { motion } from 'framer-motion'
import {
  Target, Award, Hash, BarChart2, TrendingUp, Info, Download, Search, ChevronDown, ChevronRight,
  ExternalLink, Eye, Zap
} from 'lucide-react'
import { useDashboard } from '@/lib/dashboard-context'
import { useFilterStore } from '@/lib/filter-store'
import { brandColor } from '@/lib/brand-colors'

const C = [
  '#4C78A8', '#54A24B', '#E45756', '#72B7B2', '#EECA3B',
  '#B279A2', '#FF9DA6', '#9D755D', '#BAB0AC', '#D67195',
  '#F58518', '#38BDF8', '#10B981', '#F59E0B', '#8B5CF6',
]

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

function Card({ title, sub, height = 280, children, info, right }: {
  title: string; sub?: string; height?: number; children: React.ReactNode; info?: string; right?: React.ReactNode
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
        {right && <div style={{ marginLeft: 8, flexShrink: 0 }}>{right}</div>}
      </div>
      <div style={{ height, flex: 1, position: 'relative' }}>{children}</div>
    </div>
  )
}

function Rank({ n }: { n: number }) {
  const c = n <= 3 ? '#059669' : n <= 5 ? '#1A73E8' : n <= 10 ? '#7C3AED' : '#D97706'
  const bg = n <= 3 ? 'rgba(5,150,105,0.08)' : n <= 5 ? 'rgba(26,115,232,0.08)' : n <= 10 ? 'rgba(124,58,237,0.08)' : 'rgba(217,119,6,0.08)'
  return <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: bg, color: c, whiteSpace: 'nowrap' }}>#{n}</span>
}

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

export default function RankingsTab() {
  const { videos, keywords, overview, isDemo, setDrawerType, downloadCSV, distinctBrands } = useDashboard()
  const { search, format } = useFilterStore()
  const [rankBrandFilter, setRankBrandFilter] = useState<string>('all')
  const [rankRangeFilter, setRankRangeFilter] = useState<'all' | 'top3' | 'top5' | 'top10'>('all')
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)
  const [kwTab, setKwTab] = useState<'all' | 'top3' | 'top5' | 'top10'>('all')
  const [kwSortMode, setKwSortMode] = useState<'rank' | 'views'>('rank')

  const analytics = useMemo(() => {
    let filteredRankVideos = videos
    if (format !== 'all') {
      filteredRankVideos = filteredRankVideos.filter((v: any) => format === 'short' ? v.is_short : !v.is_short)
    }
    if (search) {
      filteredRankVideos = filteredRankVideos.filter((v: any) => v.title?.toLowerCase().includes(search.toLowerCase()))
    }
    if (rankBrandFilter !== 'all') {
      filteredRankVideos = filteredRankVideos.filter((v: any) => (v.tags || v.brands || []).includes(rankBrandFilter))
    }
    if (rankRangeFilter !== 'all') {
      filteredRankVideos = filteredRankVideos.filter((v: any) => {
        const r = v.best_rank || 20
        if (rankRangeFilter === 'top3') return r <= 3
        if (rankRangeFilter === 'top5') return r <= 5
        if (rankRangeFilter === 'top10') return r <= 10
        return true
      })
    }

    const rankBuckets = [
      { range: '#1', min: 1, max: 1, count: 0, fill: '#059669' },
      { range: '#2–3', min: 2, max: 3, count: 0, fill: '#10B981' },
      { range: '#4–5', min: 4, max: 5, count: 0, fill: '#1A73E8' },
      { range: '#6–10', min: 6, max: 10, count: 0, fill: '#8B5CF6' },
      { range: '#11–15', min: 11, max: 15, count: 0, fill: '#F59E0B' },
      { range: '#16–20', min: 16, max: 20, count: 0, fill: '#EF4444' },
    ]
    filteredRankVideos.forEach(v => {
      const r = v.best_rank ?? 20
      const b = rankBuckets.find(bk => r >= bk.min && r <= bk.max)
      if (b) b.count++
    })

    const rankedOnly = filteredRankVideos.filter((v: any) => v.best_rank != null)

    const scatterData = rankedOnly.slice(0, 50).map((v: any, i: number) => ({
      views: v.view_count || 0, rank: v.best_rank || 20,
      z: Math.max(30, (v.keyword_count || 1) * 70),
      title: v.title, channel: v.channel_name, tags: (v.tags || v.brands || []),
      keywords: v.keywords_appeared || [], keywordCount: v.keyword_count || 0,
      fill: C[i % C.length]
    }))

    const longForm = filteredRankVideos.filter((v: any) => !v.is_short)
    const shorts = filteredRankVideos.filter((v: any) => v.is_short)

    const rankTypeCompare = [
      { range: 'Top 1', long: longForm.filter(v => v.best_rank === 1).length, shorts: shorts.filter(v => v.best_rank === 1).length },
      { range: 'Top 3', long: longForm.filter(v => v.best_rank && v.best_rank <= 3).length, shorts: shorts.filter(v => v.best_rank && v.best_rank <= 3).length },
      { range: 'Top 5', long: longForm.filter(v => v.best_rank && v.best_rank <= 5).length, shorts: shorts.filter(v => v.best_rank && v.best_rank <= 5).length },
      { range: 'Top 10', long: longForm.filter(v => v.best_rank && v.best_rank <= 10).length, shorts: shorts.filter(v => v.best_rank && v.best_rank <= 10).length },
    ]

    return { rankBuckets, filteredRankVideos, rankedOnly, scatterData, rankTypeCompare }
  }, [videos, rankBrandFilter, rankRangeFilter, search, format])

  const { rankBuckets, filteredRankVideos, rankedOnly, scatterData, rankTypeCompare } = analytics
  const totalRanked = rankedOnly.length

  const brandRankCounts = useMemo(() => {
    const counts = new Map<string, number>()
    filteredRankVideos.forEach((v: any) => {
      (v.tags || v.brands || []).forEach((b: string) => {
        counts.set(b, (counts.get(b) || 0) + 1)
      })
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [filteredRankVideos])

  const topBrands = brandRankCounts.slice(0, Math.min(brandRankCounts.length, 6))

  const sortedRankedVideos = useMemo(() => {
    let vids = [...rankedOnly]
    if (kwTab === 'top3') vids = vids.filter((v: any) => v.best_rank <= 3)
    else if (kwTab === 'top5') vids = vids.filter((v: any) => v.best_rank >= 4 && v.best_rank <= 5)
    else if (kwTab === 'top10') vids = vids.filter((v: any) => v.best_rank >= 6 && v.best_rank <= 10)
    if (kwSortMode === 'views') vids.sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
    else vids.sort((a: any, b: any) => (a.best_rank || 20) - (b.best_rank || 20))
    return vids
  }, [rankedOnly, kwTab, kwSortMode])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            Search Ranking Intelligence
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Analyze video search positions, brand ranking dominance, and keyword coverage across all tracked terms.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select className="input" value={rankBrandFilter} onChange={(e) => setRankBrandFilter(e.target.value)} style={{ cursor: 'pointer', padding: '6px 12px', minWidth: 150, fontSize: 12, fontWeight: 600 }}>
            <option value="all">All Brands</option>
            {distinctBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="input" value={rankRangeFilter} onChange={(e) => setRankRangeFilter(e.target.value as any)} style={{ cursor: 'pointer', padding: '6px 12px', minWidth: 130, fontSize: 12, fontWeight: 600 }}>
            <option value="all">All Ranks</option>
            <option value="top3">Top 3 Only</option>
            <option value="top5">Top 5 Only</option>
            <option value="top10">Top 10 Only</option>
          </select>
        </div>
      </div>

      {/* KPI Cards — Creators pattern */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <MetricCard label="Total Ranked" value={totalRanked} icon={Target} color="#1A73E8" sub="Videos with rank data" info="Number of unique videos that appear in search rankings for tracked keywords." />
        <MetricCard label="Top-3 Videos" value={rankedOnly.filter((v: any) => v.best_rank <= 3).length} icon={Award} color="#059669" sub="High-impact positions" info="Videos ranking 1–3 for any keyword — strongest search presence." />
        <MetricCard label="Ranking Keywords" value={keywords.length} icon={Hash} color="#8B5CF6" sub="Tracked keywords" info="Total number of active keywords being monitored for rankings." />
        <MetricCard label="Avg Rank Position" value={rankedOnly.length > 0 ? (rankedOnly.reduce((s: number, v: any) => s + v.best_rank, 0) / rankedOnly.length).toFixed(1) : '—'} icon={BarChart2} color="#F59E0B" sub="Lower = better" info="Average best rank position across all ranked videos." />
        <MetricCard label="Top 10 Coverage" value={`${totalRanked > 0 ? Math.round((rankedOnly.filter((v: any) => v.best_rank <= 10).length / totalRanked) * 100) : 0}%`} icon={TrendingUp} color="#EC4899" sub="Of total ranked" info="Percentage of ranked videos that appear in top 10 positions." />
      </div>

      {/* Top Ranked Videos Intelligence — Creators pattern */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>Top Ranked Videos Intelligence</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {rankedOnly
            .sort((a: any, b: any) => (a.best_rank || 20) - (b.best_rank || 20))
            .slice(0, 10)
            .map((v: any, i: number) => (
              <div
                key={v.id}
                onClick={() => setExpandedVideo(expandedVideo === v.id ? null : v.id)}
                style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', borderRadius: 16, border: expandedVideo === v.id ? '1.5px solid #1A73E8' : '1px solid #E2E8F0', padding: 20, boxShadow: expandedVideo === v.id ? '0 4px 16px rgba(26,115,232,0.12)' : '0 2px 4px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (expandedVideo !== v.id) { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' } }}
                onMouseLeave={e => { if (expandedVideo !== v.id) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)' } }}
              >
                <div style={{ position: 'absolute', top: -14, right: -10, fontSize: 64, fontWeight: 900, color: '#F1F5F9', zIndex: 0 }}>#{i + 1}</div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Rank n={v.best_rank} />
                    {v.is_short && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>Short</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 12, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Views</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#1A73E8', fontFamily: "'JetBrains Mono',monospace" }}>{fmtIndian(v.view_count)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Keywords</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#334155' }}>{v.keyword_count || 0}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Channel</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#334155', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.channel_name}</div>
                      </div>
                    </div>
                    {(v.tags || v.brands || []).length > 0 && (
                      <div style={{ marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(v.tags || v.brands || []).slice(0, 3).map((b: string) => (
                          <span key={b} style={{ fontSize: 9, fontWeight: 700, background: `${brandColor(b)}15`, color: brandColor(b), padding: '2px 6px', borderRadius: 6 }}>{b}</span>
                        ))}
                        {(v.tags || v.brands || []).length > 3 && <span style={{ fontSize: 9, fontWeight: 700, background: '#F1F5F9', color: '#64748B', padding: '2px 6px', borderRadius: 6 }}>+{(v.tags || v.brands || []).length - 3}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Position Distribution + Brand Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Position distribution" sub="Number of videos in search rank categories" height={240}
          right={<button onClick={() => setDrawerType('rank_detail')} className="btn btn-ghost btn-sm">View more</button>}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankBuckets.map(b => ({
              ...b,
              pct: totalRanked > 0 ? Math.round((b.count / totalRanked) * 100) : 0,
            }))} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechartsTooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  if (!d) return null
                  return (
                    <div style={{ background: '#0F172A', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', minWidth: 160 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#FFF', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Position {d.range}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Videos</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>{d.count}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>% of total</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: d.fill }}>{d.pct}%</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99, marginTop: 6 }}>
                        <div style={{ height: '100%', width: `${d.pct}%`, background: d.fill, borderRadius: 99 }} />
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                {rankBuckets.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Brand ranking comparison" sub="How brands perform across ranking tiers — competitive positioning" height={240}
          info="Shows the distribution of each brand's videos across ranking positions.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { tier: 'Top 1-3', ...Object.fromEntries(topBrands.map(([b]) => [b, rankedOnly.filter((v: any) => (v.tags || v.brands || []).includes(b) && v.best_rank <= 3).length])) },
              { tier: 'Top 4-5', ...Object.fromEntries(topBrands.map(([b]) => [b, rankedOnly.filter((v: any) => (v.tags || v.brands || []).includes(b) && v.best_rank > 3 && v.best_rank <= 5).length])) },
              { tier: 'Top 6-10', ...Object.fromEntries(topBrands.map(([b]) => [b, rankedOnly.filter((v: any) => (v.tags || v.brands || []).includes(b) && v.best_rank > 5 && v.best_rank <= 10).length])) },
              { tier: '11-20', ...Object.fromEntries(topBrands.map(([b]) => [b, rankedOnly.filter((v: any) => (v.tags || v.brands || []).includes(b) && v.best_rank > 10).length])) },
            ]} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="tier" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechartsTooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div style={{ background: '#0F172A', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', minWidth: 150 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#FFF', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{label}</div>
                      {payload.filter((p: any) => p.value > 0).sort((a: any, b: any) => b.value - a.value).map((p: any) => (
                        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.fill, flexShrink: 0 }} />
                          <span style={{ fontSize: 10.5, color: '#94A3B8', flex: 1 }}>{p.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>{p.value} vids</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 10.5 }} />
              {topBrands.map(([b], i) => (
                <Bar key={b} dataKey={b} name={b} fill={C[i % C.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Long-form vs Shorts + Ranking Opportunities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Long-form vs shorts by position" sub="Format dominance per ranking tier (filtered)" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankTypeCompare} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechartsTooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div style={{ background: '#0F172A', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#FFF', marginBottom: 6 }}>{label}</div>
                      {payload.map((p: any) => (
                        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.fill, flexShrink: 0 }} />
                          <span style={{ fontSize: 10.5, color: '#94A3B8', flex: 1 }}>{p.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>{p.value} vids</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <Bar dataKey="long" name="Long-form" fill="#10B981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="shorts" name="Shorts" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 10.5 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Ranking opportunities" sub="Videos near top positions — easiest to push higher" height={240}
          info="Videos ranked 4–10 that could reach top 3 with optimization.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 200 }}>
            {rankedOnly
              .filter((v: any) => v.best_rank >= 4 && v.best_rank <= 10)
              .sort((a: any, b: any) => a.best_rank - b.best_rank)
              .slice(0, 5)
              .map((v: any) => (
                <a key={v.id} href={`/video/${v.youtube_id}`} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9', textDecoration: 'none' }} className="row-hover">
                  <Rank n={v.best_rank} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <span>{v.channel_name}</span>
                      <span>·</span>
                      <span className="mono" style={{ fontWeight: 700, color: '#1A73E8' }}>{fmtIndian(v.view_count)}</span>
                    </div>
                  </div>
                  <ExternalLink size={12} color="#CBD5E1" />
                </a>
              ))}
            {rankedOnly.filter((v: any) => v.best_rank >= 4 && v.best_rank <= 10).length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: '#94A3B8', fontSize: 12 }}>No videos in #4-10 range</div>
            )}
          </div>
        </Card>
      </div>

      {/* Bubble Map */}
      <Card title="Views vs search position bubble map" sub="Each bubble = one video. X = search rank (lower is better), Y = view count. Bubble size = keyword span" height={280}
        info="Ideal bubbles are large and positioned top-left (high views, high rank).">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 10, left: -20, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis type="number" dataKey="rank" name="Search Rank" domain={[1, 20]} reversed
              tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false}
              label={{ value: '<- Better Rank | Worse Rank ->', position: 'insideBottom', offset: -14, fontSize: 9.5, fill: '#94A3B8' }} />
            <YAxis type="number" dataKey="views" name="Views"
              tick={{ fontSize: 9.5, fill: '#94A3B8' }} tickFormatter={(v: any) => fmt(v)} axisLine={false} tickLine={false} />
            <ZAxis type="number" dataKey="z" range={[30, 220]} />
            <RechartsTooltip
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                if (!d) return null
                const rankColor = d.rank <= 3 ? '#059669' : d.rank <= 5 ? '#1A73E8' : d.rank <= 10 ? '#8B5CF6' : '#F59E0B'
                return (
                  <div style={{ background: '#0F172A', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', maxWidth: 280, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF', marginBottom: 8, lineHeight: 1.4, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{d.title}</div>
                    {d.channel && <div style={{ fontSize: 10.5, color: '#64748B', marginBottom: 6 }}>{d.channel}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                      <div style={{ fontSize: 10.5, color: '#94A3B8' }}>Rank</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: rankColor, textAlign: 'right' }}>#{d.rank}</div>
                      <div style={{ fontSize: 10.5, color: '#94A3B8' }}>Views</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', textAlign: 'right' }}>{fmt(d.views)}</div>
                      <div style={{ fontSize: 10.5, color: '#94A3B8' }}>Keywords</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#FFF', textAlign: 'right' }}>{d.keywordCount}</div>
                    </div>
                    {d.tags && d.tags.length > 0 && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Brands</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {d.tags.slice(0, 4).map((t: string) => (
                            <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: `${brandColor(t)}18`, color: brandColor(t) }}>{t}</span>
                          ))}
                          {d.tags.length > 4 && <span style={{ fontSize: 10, color: '#64748B' }}>+{d.tags.length - 4}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }}
            />
            {scatterData.map((d: any, i: number) => <Scatter key={i} data={[d]} fill={d.fill} fillOpacity={0.75} />)}
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Ranked Videos Leaderboard — Creators pattern */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Ranked Videos Leaderboard</div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>All ranked videos with brand and keyword data. Click to expand details.</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 3, background: '#F8FAFC', padding: 3, borderRadius: 7, border: '1px solid #E2E8F0' }}>
              {[
                { id: 'all', label: 'All', count: rankedOnly.length },
                { id: 'top3', label: 'Top 3', count: rankedOnly.filter((v: any) => v.best_rank <= 3).length },
                { id: 'top5', label: '4-5', count: rankedOnly.filter((v: any) => v.best_rank >= 4 && v.best_rank <= 5).length },
                { id: 'top10', label: '6-10', count: rankedOnly.filter((v: any) => v.best_rank >= 6 && v.best_rank <= 10).length },
              ].map(tab => (
                <button key={tab.id} onClick={() => setKwTab(tab.id as any)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: kwTab === tab.id ? '#FFF' : 'transparent', color: kwTab === tab.id ? '#0F172A' : '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: kwTab === tab.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.12s' }}>
                  {tab.label}
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '0 4px', borderRadius: 8, background: kwTab === tab.id ? '#EFF6FF' : 'transparent', color: kwTab === tab.id ? '#1A73E8' : '#94A3B8' }}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 18, background: '#E2E8F0' }} />
            <div style={{ display: 'flex', gap: 3 }}>
              <button onClick={() => setKwSortMode('rank')} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: kwSortMode === 'rank' ? '#EFF6FF' : 'transparent', color: kwSortMode === 'rank' ? '#1A73E8' : '#94A3B8', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                By Rank
              </button>
              <button onClick={() => setKwSortMode('views')} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: kwSortMode === 'views' ? '#EFF6FF' : 'transparent', color: kwSortMode === 'views' ? '#1A73E8' : '#94A3B8', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                By Views
              </button>
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                {['#', 'Video', 'Rank', 'Views', 'Keywords', 'Format', 'Brands'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: h === '#' || h === 'Rank' || h === 'Format' ? 'center' : 'left', fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', background: '#F8FAFC' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRankedVideos.slice(0, 20).map((v: any, i: number) => {
                const isExpanded = expandedVideo === v.id
                return (
                  <React.Fragment key={v.id}>
                    <tr
                      style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: isExpanded ? '#F8FAFC' : 'transparent' }}
                      onClick={() => setExpandedVideo(isExpanded ? null : v.id)}
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
                          <div style={{ width: 38, height: 38, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#F1F5F9' }}>
                            {v.thumbnail_url && <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                            <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>{v.channel_name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}><Rank n={v.best_rank} /></td>
                      <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{fmtIndian(v.view_count)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: '#334155' }}>{v.keyword_count || 0}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: v.is_short ? 'rgba(220,38,38,0.08)' : 'rgba(26,115,232,0.08)', color: v.is_short ? '#DC2626' : '#1A73E8' }}>
                          {v.is_short ? 'Short' : 'Long'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(v.tags || v.brands || []).slice(0, 2).map((b: string) => (
                            <span key={b} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: `${brandColor(b)}15`, color: brandColor(b) }}>{b}</span>
                          ))}
                          {(v.tags || v.brands || []).length > 2 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#F1F5F9', color: '#64748B' }}>+{(v.tags || v.brands || []).length - 2}</span>}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: '#F8FAFC' }}>
                        <td colSpan={7} style={{ padding: '14px 20px 18px' }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                            {[
                              { icon: Eye, label: 'Views', value: fmtIndian(v.view_count), color: '#1A73E8' },
                              { icon: Hash, label: 'Keywords', value: v.keyword_count || 0, color: '#8B5CF6' },
                              { icon: Award, label: 'Best Rank', value: `#${v.best_rank}`, color: '#059669' },
                              { icon: TrendingUp, label: 'Format', value: v.is_short ? 'Short' : 'Long', color: v.is_short ? '#DC2626' : '#1A73E8' },
                            ].map((kpi, ki) => (
                              <div key={ki} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #F1F5F9', background: '#FFF' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                  <kpi.icon size={11} style={{ color: kpi.color }} />
                                  <span style={{ fontSize: 9, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{kpi.label}</span>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.1 }}>{kpi.value}</div>
                              </div>
                            ))}
                          </div>
                          {v.keywords_appeared && v.keywords_appeared.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', marginRight: 4 }}>Keywords:</span>
                              {v.keywords_appeared.map((kw: string) => (
                                <span key={kw} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#EFF6FF', color: '#1D4ED8' }}>{kw}</span>
                              ))}
                            </div>
                          )}
                          {v.youtube_id && (
                            <a href={`/video/${v.youtube_id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 11, fontWeight: 700, color: '#1A73E8', textDecoration: 'none' }}>
                              View Video Details <ExternalLink size={12} />
                            </a>
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

      {/* Ranking Health Overview + Insight Callouts */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(26,115,232,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={14} style={{ color: '#1A73E8' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Ranking Health Overview</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>Distribution of {totalRanked} ranked videos across search positions</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, height: 28, borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: '#1', count: rankBuckets[0]?.count || 0, color: '#059669' },
            { label: '#2-3', count: rankBuckets[1]?.count || 0, color: '#10B981' },
            { label: '#4-5', count: rankBuckets[2]?.count || 0, color: '#1A73E8' },
            { label: '#6-10', count: rankBuckets[3]?.count || 0, color: '#8B5CF6' },
            { label: '#11-15', count: rankBuckets[4]?.count || 0, color: '#F59E0B' },
            { label: '#16-20', count: rankBuckets[5]?.count || 0, color: '#EF4444' },
          ].map((seg) => {
            const pctVal = totalRanked > 0 ? Math.round((seg.count / totalRanked) * 100) : 0
            return pctVal > 0 ? (
              <div key={seg.label} title={`${seg.label}: ${seg.count} videos (${pctVal}%)`}
                style={{ flex: pctVal, background: seg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'flex 0.4s ease', cursor: 'default' }}>
                {pctVal >= 8 && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#FFF' }}>{pctVal}%</span>}
              </div>
            ) : null
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { label: '#1', count: rankBuckets[0]?.count || 0, color: '#059669' },
            { label: '#2-3', count: rankBuckets[1]?.count || 0, color: '#10B981' },
            { label: '#4-5', count: rankBuckets[2]?.count || 0, color: '#1A73E8' },
            { label: '#6-10', count: rankBuckets[3]?.count || 0, color: '#8B5CF6' },
            { label: '#11-15', count: rankBuckets[4]?.count || 0, color: '#F59E0B' },
            { label: '#16-20', count: rankBuckets[5]?.count || 0, color: '#EF4444' },
          ].map(seg => (
            <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
              <span style={{ fontSize: 10.5, color: '#64748B' }}>{seg.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{seg.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insight Callouts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          {
            icon: '🏆', title: 'Top-3 density',
            value: rankedOnly.filter((v: any) => v.best_rank <= 3).length,
            total: totalRanked,
            desc: 'Videos ranking 1-3 across all keywords — strongest search presence',
            accent: '#059669', bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '#A7F3D0',
            action: 'Maintain and protect these positions',
            metric: totalRanked > 0 ? Math.round((rankedOnly.filter((v: any) => v.best_rank <= 3).length / totalRanked) * 100) : 0,
          },
          {
            icon: '🚀', title: 'Quick wins (4-5)',
            value: rankedOnly.filter((v: any) => v.best_rank >= 4 && v.best_rank <= 5).length,
            total: totalRanked,
            desc: 'One step from top 3 — highest ROI optimization targets',
            accent: '#1A73E8', bg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: 'rgba(26,115,232,0.25)',
            action: 'Partner boost + SEO optimization',
            metric: totalRanked > 0 ? Math.round((rankedOnly.filter((v: any) => v.best_rank >= 4 && v.best_rank <= 5).length / totalRanked) * 100) : 0,
          },
          {
            icon: '📊', title: 'Growth pool (6-10)',
            value: rankedOnly.filter((v: any) => v.best_rank >= 6 && v.best_rank <= 10).length,
            total: totalRanked,
            desc: 'Largest segment — push to top 5 for significant SOV gains',
            accent: '#8B5CF6', bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', border: 'rgba(139,92,246,0.25)',
            action: 'Content refresh + creator collabs',
            metric: totalRanked > 0 ? Math.round((rankedOnly.filter((v: any) => v.best_rank >= 6 && v.best_rank <= 10).length / totalRanked) * 100) : 0,
          },
          {
            icon: '⚠️', title: 'At risk (11-20)',
            value: rankedOnly.filter((v: any) => v.best_rank >= 11 && v.best_rank <= 20).length,
            total: totalRanked,
            desc: 'Dropping from visibility — urgent action needed',
            accent: '#F59E0B', bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: 'rgba(245,158,11,0.25)',
            action: 'Re-optimize titles, thumbnails, descriptions',
            metric: totalRanked > 0 ? Math.round((rankedOnly.filter((v: any) => v.best_rank >= 11 && v.best_rank <= 20).length / totalRanked) * 100) : 0,
          },
        ].map(c => (
          <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 22 }}>{c.icon}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.accent, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.1 }}>
              {c.value}<span style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginLeft: 4 }}>/ {c.total}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.metric}%`, background: c.accent, borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: c.accent, fontFamily: "'JetBrains Mono',monospace", minWidth: 32, textAlign: 'right' }}>{c.metric}%</span>
            </div>
            <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.4, marginBottom: 6 }}>{c.desc}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: c.accent, fontStyle: 'italic' }}>→ {c.action}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
