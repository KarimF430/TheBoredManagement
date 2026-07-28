'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCampaignStore } from '@/lib/store'
import {
  BarChart, Bar, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Star, TrendingUp, Layers, Zap, Info, Search, X, Award, ExternalLink, Video, Eye, Target, Filter, ChevronRight
} from 'lucide-react'
import { useDashboard } from '@/lib/dashboard-context'
import { useFilterStore } from '@/lib/filter-store'

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
  return <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 5, background: bg, color: c }}>#{n}</span>
}

function Card({ title, sub, height = 280, children, right, info }: {
  title: string; sub?: string; height?: number; children: React.ReactNode; right?: React.ReactNode; info?: string
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
            {info && <span title={info} style={{ cursor: 'help', color: '#CBD5E1', flexShrink: 0 }}><Info size={11} /></span>}
          </div>
          {sub && <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>{sub}</div>}
        </div>
        {right && <div style={{ marginLeft: 8, flexShrink: 0 }}>{right}</div>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

export default function CreatorsTab() {
  const { setDrawerType, downloadCSV } = useDashboard()
  const { search, format } = useFilterStore()
  const { activeCampaignId } = useCampaignStore()

  const [creatorMinVideos, setCreatorMinVideos] = useState<number>(1)
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null)
  const [sortBy, setSortBy] = useState<'views' | 'frequency'>('views')

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
    if (sortBy === 'frequency') {
      channels = [...channels].sort((a, b) => b.kwCount - a.kwCount)
    } else {
      channels = [...channels].sort((a, b) => b.views - a.views)
    }

    // Top Creators Chart
    const topCreatorChart = channels.slice(0, 8).map((c: any, i: number) => ({
      name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
      Views: c.views, Videos: c.count, AvgViews: c.avgViews, fill: C[i % C.length]
    }))

    // Radar Data
    const topCreators5 = channels.slice(0, 5)
    const maxViews = Math.max(...topCreators5.map((c: any) => c.views)) || 1
    const maxKws = Math.max(...topCreators5.map((c: any) => c.kwCount)) || 1
    const maxAvg = Math.max(...topCreators5.map((c: any) => c.avgViews)) || 1
    const creatorRadar = topCreators5.map((c: any, i: number) => ({
      creator: c.name.slice(0, 10),
      'Views Reach': Math.round((c.views / maxViews) * 100),
      'Keyword Cover': Math.round((c.kwCount / maxKws) * 100),
      'Avg Efficiency': Math.round((c.avgViews / maxAvg) * 100),
      'Brand Span': Math.min(100, c.brandCount * 25),
      'Shorts Mix': c.shortsRatio,
      color: C[i % C.length]
    }))

    // Brand-Creator Share Chart Data
    const top8Creators = channels.slice(0, 8)
    const allBrandsSet = new Set<string>()
    top8Creators.forEach((c: any) => c.brandsList.forEach((b: any) => allBrandsSet.add(b.name)))
    const brandAlignmentData = top8Creators.map((c: any) => {
      const row: any = { name: c.name.length > 11 ? c.name.slice(0, 11) + '...' : c.name }
      c.brandsList.forEach((b: any) => {
        row[b.name] = c.views > 0 ? Math.round((b.views / c.views) * 100) : 0
      })
      return row
    })

    return { channels, topCreatorChart, creatorRadar, brandAlignmentData, allBrands: Array.from(allBrandsSet) }
  }, [rawCreators, creatorMinVideos, sortBy])

  const { channels, topCreatorChart, creatorRadar, brandAlignmentData, allBrands } = analytics
  const filteredChannels = channels.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {/* Header & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#FFF', padding: '14px 18px', borderRadius: 14, border: '1px solid #F1F5F9' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} style={{ color: '#1A73E8' }} /> Creator Sponsorship & Reach Intelligence
            {isLoading && <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginLeft: 8 }}>Loading data...</span>}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
            Evaluate influencer performance across YouTube search terms to select top partners.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Sort By:</span>
            <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ cursor: 'pointer', padding: '6px 12px', minWidth: 120, fontSize: 12, fontWeight: 600 }}>
              <option value="views">Total Views</option>
              <option value="frequency">Keyword Frequency</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Min Videos:</span>
            <select className="input" value={creatorMinVideos} onChange={(e) => setCreatorMinVideos(Number(e.target.value))} style={{ cursor: 'pointer', padding: '6px 12px', minWidth: 110, fontSize: 12, fontWeight: 600 }}>
              <option value={1}>1+ Videos</option>
              <option value={2}>2+ Videos</option>
              <option value={3}>3+ Videos</option>
              <option value={5}>5+ Videos</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Creators', value: channels.length, icon: Users, color: '#1A73E8', sub: 'Active in search results' },
          { label: 'High Impact Partners', value: channels.filter((c: any) => c.avgViews > 100_000 || c.bestRank <= 3).length, icon: Star, color: '#059669', sub: 'Ranks #1-#3 or >1L views' },
          { label: 'Avg Partnership Reach', value: channels.length > 0 ? fmt(Math.round(channels.reduce((s: any, c: any) => s + c.avgViews, 0) / channels.length)) : '—', icon: TrendingUp, color: '#8B5CF6', sub: 'Views per video' },
          { label: 'Multi-Brand Creators', value: channels.filter((c: any) => c.brandCount > 1).length, icon: Layers, color: '#F59E0B', sub: 'Features 2+ brands' },
          { label: 'Shorts Specialists', value: channels.filter((c: any) => c.shortsRatio > 60).length, icon: Zap, color: '#EC4899', sub: '>60% Shorts ratio' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${kpi.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <kpi.icon size={14} style={{ color: kpi.color }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{kpi.value}</div>
            <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Partnership Score Matrix + Creator-Brand Alignment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Partnership Score Matrix */}
        <Card
          title="Partnership Score Matrix"
          sub="Composite rating: View reach (30%) + Efficiency (25%) + Search SOV (25%) + Brand Span (20%)"
          height={280}
          info="Higher score = superior ROI & audience conversion potential."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={channels.slice(0, 8).map((c: any, i: number) => {
              const viewScore = Math.round((c.views / (channels[0]?.views || 1)) * 100)
              const effScore = Math.round((c.avgViews / (channels[0]?.avgViews || 1)) * 100)
              const kwScore = Math.round((c.kwCount / (channels.reduce((m: any, ch: any) => Math.max(m, ch.kwCount), 1))) * 100)
              const brandScore = Math.min(100, c.brandCount * 25)
              const partnershipScore = Math.round(viewScore * 0.3 + effScore * 0.25 + kwScore * 0.25 + brandScore * 0.2)
              return {
                name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
                'Partnership Score': partnershipScore,
                'View Reach': viewScore,
                'Efficiency': effScore,
                fill: C[i % C.length]
              }
            })} layout="vertical" margin={{ top: 4, right: 50, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v: any) => `${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
              <RechartsTooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div style={{ background: '#0F172A', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', minWidth: 160 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 3 }}>Partnership Score: <strong style={{ color: '#38BDF8' }}>{d?.['Partnership Score']}</strong></div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 3 }}>View Reach: <strong style={{ color: '#34D399' }}>{d?.['View Reach']}%</strong></div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>Efficiency: <strong style={{ color: '#FBBF24' }}>{d?.['Efficiency']}%</strong></div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="Partnership Score" radius={[0, 6, 6, 0]} barSize={18}>
                {channels.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Creator-Brand Alignment */}
        <Card
          title="Creator-Brand View Share Matrix"
          sub="Which brands drive viewership for top creator channels"
          height={280}
          info="Shows view share distribution across tagged brands for each creator."
        >
          {brandAlignmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandAlignmentData} layout="vertical" margin={{ top: 4, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
                <RechartsTooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#FFF' }} labelStyle={{ color: '#94A3B8' }} />
                {allBrands.slice(0, 5).map((b, i) => (
                  <Bar key={b} dataKey={b} stackId="a" fill={C[i % C.length]} radius={i === 0 ? [4, 0, 0, 4] : [0, 4, 4, 0]} barSize={18} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: 12 }}>
              No brand alignment data available.
            </div>
          )}
        </Card>
      </div>

      {/* Creator Radar */}
      {creatorRadar.length > 1 && (
        <Card
          title="Creator Capability Radar"
          sub="Multi-dimensional profiling to align creators with your specific marketing objective"
          height={280}
          info="Each axis represents a partnership criterion. Wider area = more versatile influencer."
        >
          <div style={{ display: 'flex', gap: 16, height: '100%' }}>
            <div style={{ flex: 1.5 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={[
                  { subject: 'Views Reach', ...Object.fromEntries(creatorRadar.map((c: any) => [c.creator, c['Views Reach']])) },
                  { subject: 'KW Cover', ...Object.fromEntries(creatorRadar.map((c: any) => [c.creator, c['Keyword Cover']])) },
                  { subject: 'Avg Eff.', ...Object.fromEntries(creatorRadar.map((c: any) => [c.creator, c['Avg Efficiency']])) },
                  { subject: 'Brand Span', ...Object.fromEntries(creatorRadar.map((c: any) => [c.creator, c['Brand Span']])) },
                  { subject: 'Shorts Mix', ...Object.fromEntries(creatorRadar.map((c: any) => [c.creator, c['Shorts Mix']])) },
                ]}>
                  <PolarGrid stroke="#F1F5F9" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#CBD5E1' }} tickCount={3} />
                  {creatorRadar.map((c: any) => (
                    <Radar key={c.creator} name={c.creator} dataKey={c.creator} stroke={c.color} fill={c.color} fillOpacity={0.08} strokeWidth={2} />
                  ))}
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10.5 }} />
                  <RechartsTooltip contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#FFF' }} labelStyle={{ color: '#94A3B8' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Sponsorship Strategy Guide</div>
              {[
                { goal: 'Max Mass Reach', desc: 'Sponsor creators with high Views Reach score', color: '#1A73E8' },
                { goal: 'SEO Dominance', desc: 'Target high Keyword Cover creators', color: '#10B981' },
                { goal: 'High-Impact Reviews', desc: 'High Avg Efficiency score creators', color: '#8B5CF6' },
                { goal: 'Shorts Viral Growth', desc: 'Creators with high Shorts Mix ratio', color: '#EC4899' },
              ].map((g, i) => (
                <div key={i} style={{ padding: '7px 10px', borderRadius: 8, background: '#F8FAFC', borderLeft: `3px solid ${g.color}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B' }}>{g.goal}</div>
                  <div style={{ fontSize: 9.5, color: '#64748B', lineHeight: 1.3 }}>{g.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Creator Leaderboard Table */}
      <div style={{ background: '#FFF', borderRadius: 14, border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Creator Collaboration Leaderboard</div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Ranked by overall partnership score and keyword search dominance. Click any creator to analyze keywords.</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                {['#', 'Creator Channel', 'Partnership Score', 'Videos', 'Total Views', 'Avg Views/Vid', 'Keyword Freq', 'Brands', 'Best Rank', 'Collab Tier', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === '#' || h === 'Best Rank' || h === 'Action' ? 'center' : 'left', fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap', background: '#FAFBFC' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredChannels.map((c: any, i: number) => {
                const viewScore = Math.round((c.views / (channels[0]?.views || 1)) * 100)
                const effScore = Math.round((c.avgViews / (channels[0]?.avgViews || 1)) * 100)
                const kwScore = Math.round((c.kwCount / (channels.reduce((m: any, ch: any) => Math.max(m, ch.kwCount), 1))) * 100)
                const brandScore = Math.min(100, c.brandCount * 25)
                const partnershipScore = Math.round(viewScore * 0.3 + effScore * 0.25 + kwScore * 0.25 + brandScore * 0.2)
                const fitTier = partnershipScore > 70 ? { label: 'Tier 1 - Premium Advocate', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' }
                  : partnershipScore > 45 ? { label: 'Tier 2 - Strong Influencer', color: '#1A73E8', bg: 'rgba(26,115,232,0.06)', border: 'rgba(26,115,232,0.2)' }
                  : partnershipScore > 25 ? { label: 'Tier 3 - Niche Reviewer', color: '#D97706', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)' }
                  : { label: 'Tier 4 - Emerging Creator', color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' }

                return (
                  <tr
                    key={c.name} className="row-hover" style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer' }}
                    onClick={() => setSelectedCreator(c)}
                  >
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, fontSize: 12, color: C[i % C.length] }}>#{i + 1}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C[i % C.length]}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: C[i % C.length], flexShrink: 0 }}>
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{c.name}</div>
                          <div style={{ fontSize: 10.5, color: '#94A3B8' }}>{c.shortsRatio > 50 ? 'Shorts Specialist' : 'Long-form Creator'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${partnershipScore}%`, height: '100%', background: partnershipScore > 70 ? '#059669' : partnershipScore > 45 ? '#1A73E8' : partnershipScore > 25 ? '#F59E0B' : '#94A3B8', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{partnershipScore}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{c.count}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{fmt(c.views)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1A73E8', fontFamily: "'JetBrains Mono',monospace" }}>{fmt(c.avgViews)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, color: '#64748B' }}>{c.kwCount} keywords</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {c.brandsList.slice(0, 2).map((b: any) => (
                          <span key={b.name} style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#F1F5F9', color: '#475569' }}>
                            {b.name}
                          </span>
                        ))}
                        {c.brandsList.length > 2 && (
                          <span style={{ fontSize: 10, color: '#94A3B8' }}>+{c.brandsList.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}><Rank n={c.bestRank || 99} /></td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: fitTier.bg, color: fitTier.color, border: `1px solid ${fitTier.border}`, whiteSpace: 'nowrap' }}>{fitTier.label}</span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedCreator(c) }}
                        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#FFF', color: '#1A73E8', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        Analyze <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creator Keyword Analysis Modal */}
      <AnimatePresence>
        {selectedCreator && (
          <div className="drawer-overlay" onClick={() => setSelectedCreator(null)}>
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="drawer-content"
              onClick={(e) => e.stopPropagation()}
              style={{ width: 620, maxWidth: '100%' }}
            >
              {/* Modal Header */}
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFBFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#1A73E8', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
                    {selectedCreator.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{selectedCreator.name}</h3>
                    <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                      Creator Intelligence & Keyword Ranking Portfolio
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedCreator(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Creator Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Total Views</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{fmt(selectedCreator.views)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Videos</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{selectedCreator.count}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Keywords Ranked</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1A73E8', fontFamily: "'JetBrains Mono',monospace" }}>{selectedCreator.kwCount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Best Search Rank</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', fontFamily: "'JetBrains Mono',monospace" }}>#{selectedCreator.bestRank}</div>
                  </div>
                </div>

                {/* Ranked Keywords List */}
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Target size={14} style={{ color: '#1A73E8' }} /> Keyword Search Dominance ({Array.from(selectedCreator.kws).length} keywords)
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto', background: '#FFF', padding: 10, borderRadius: 10, border: '1px solid #F1F5F9' }}>
                    {Array.from(selectedCreator.kws).map((kw: any) => (
                      <span key={kw} style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 6, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Videos Portfolio */}
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Video size={14} style={{ color: '#8B5CF6' }} /> Indexed Videos ({selectedCreator.creatorVideos.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedCreator.creatorVideos.map((v: any) => (
                      <div key={v.id} style={{ display: 'flex', gap: 12, background: '#FFF', border: '1px solid #F1F5F9', padding: 10, borderRadius: 10 }}>
                        {v.thumbnail_url ? (
                          <img src={v.thumbnail_url} alt={v.title} style={{ width: 80, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 80, height: 48, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Video size={16} style={{ color: '#CBD5E1' }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a
                            href={`https://www.youtube.com/watch?v=${v.youtube_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</span>
                            <ExternalLink size={11} style={{ color: '#1A73E8', flexShrink: 0 }} />
                          </a>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 11, color: '#64748B' }}>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{fmtIndian(v.view_count)} views</span>
                            <span>·</span>
                            <Rank n={v.best_rank || 99} />
                            <span>·</span>
                            <span style={{ fontWeight: 600, color: v.is_short ? '#EC4899' : '#1A73E8' }}>{v.is_short ? 'Short' : 'Long-form'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
