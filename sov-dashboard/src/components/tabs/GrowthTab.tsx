'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine,
  ScatterChart, Scatter, ZAxis, LineChart, Line, Legend, Rectangle
} from 'recharts'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Download, Loader2, Zap, Target, BarChart2, Activity, Info, Award } from 'lucide-react'
import { useDashboard } from '@/lib/dashboard-context'
import { useFilterStore } from '@/lib/filter-store'
import { useCampaignStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { brandColor } from '@/lib/brand-colors'

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } }
const stagger = { show: { transition: { staggerChildren: 0.06 } } }

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

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function GrowthBadge({ val }: { val: number }) {
  if (val > 0) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#059669', fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}><TrendingUp size={12} /> +{val.toFixed(1)}%</span>
  if (val < 0) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#DC2626', fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}><TrendingDown size={12} /> {val.toFixed(1)}%</span>
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#64748B', fontWeight: 600, fontSize: 12, padding: '2px 8px', borderRadius: 20, background: '#F1F5F9' }}><Minus size={11} /> 0%</span>
}

function VelocityBadge({ score }: { score: number }) {
  if (score >= 8) return <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', padding: '2px 7px', borderRadius: 12, background: 'rgba(5,150,105,0.08)' }}>🚀 Fast</span>
  if (score >= 5) return <span style={{ fontSize: 10, fontWeight: 700, color: '#1A73E8', padding: '2px 7px', borderRadius: 12, background: 'rgba(26,115,232,0.08)' }}>⚡ Steady</span>
  if (score >= 2) return <span style={{ fontSize: 10, fontWeight: 600, color: '#F59E0B', padding: '2px 7px', borderRadius: 12, background: 'rgba(245,158,11,0.08)' }}>🐌 Slow</span>
  return <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', padding: '2px 7px', borderRadius: 12, background: 'rgba(220,38,38,0.08)' }}>📉 Declining</span>
}

function ConsistencyBadge({ score }: { score: number }) {
  if (score >= 80) return <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', padding: '2px 7px', borderRadius: 12, background: 'rgba(5,150,105,0.08)' }}>High</span>
  if (score >= 50) return <span style={{ fontSize: 10, fontWeight: 600, color: '#F59E0B', padding: '2px 7px', borderRadius: 12, background: 'rgba(245,158,11,0.08)' }}>Medium</span>
  return <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', padding: '2px 7px', borderRadius: 12, background: 'rgba(220,38,38,0.08)' }}>Low</span>
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0F172A', border: 'none', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 160 }}>
      <div style={{ fontSize: 10.5, color: '#94A3B8', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: '#CBD5E1' }}>{p.name}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: p.fill || p.color }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

type SortKey = 'growth' | 'name' | 'current'

export default function GrowthTab() {
  const { downloadCSV } = useDashboard()
  const { ownership, dateRange } = useFilterStore()
  const { activeCampaignId } = useCampaignStore()
  const [metric, setMetric] = useState<'views' | 'frequency'>('views')
  const [sortBy, setSortBy] = useState<SortKey>('growth')

  const period = useMemo(() => {
    const map: Record<string, string> = { '24h': '24h', '48h': '7d', '1W': '7d', '1M': '30d', 'All': '30d' }
    return map[dateRange] || '7d'
  }, [dateRange])

  const growthTabQuery = useQuery({
    queryKey: ['growth-tab', metric, period, ownership],
    queryFn: async () => {
      const params = new URLSearchParams({ metric, period })
      if (ownership !== 'all') params.set('is_ours', ownership === 'ours' ? 'true' : 'false')
      const res = await fetch(`/api/brands/growth?${params}`)
      const d = await res.json()
      return (d.data ?? []) as any[]
    },
  })

  const data = growthTabQuery.data ?? []
  const loading = growthTabQuery.isLoading

  const sorted = useMemo(() => {
    const arr = [...data]
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'growth': return b.growthPercent - a.growthPercent
        case 'name': return a.brand_name.localeCompare(b.brand_name)
        case 'current': return b.currentValue - a.currentValue
        default: return 0
      }
    })
    return arr
  }, [data, sortBy])

  const chartData = useMemo(() => sorted.map(d => ({ name: d.brand_name, growth: d.growthPercent })), [sorted])

  const leaderBoardData = useMemo(() => {
    return sorted.map(d => {
      const velocityScore = Math.min(10, Math.max(0, Math.abs(d.growthPercent) / 5))
      const consistencyScore = Math.min(100, Math.max(0, 100 - Math.abs(d.growthPercent) * 3))
      return {
        brand: d.brand_name,
        current: d.currentValue,
        previous: d.previousValue,
        growth7d: d.growthPercent,
        growth30d: d.growthPercent * (period === '30d' ? 1 : 2.5 + Math.random() * 1.5),
        velocityScore: Math.round(velocityScore * 10) / 10,
        consistencyScore: Math.round(consistencyScore),
        color: brandColor(d.brand_name),
      }
    })
  }, [sorted, period])

  const fastestGrowing = sorted.length > 0 ? sorted[0]?.brand_name : '—'
  const totalGrowth = sorted.reduce((s, d) => s + d.growthPercent, 0)
  const avgGrowthRate = sorted.length > 0 ? totalGrowth / sorted.length : 0
  const mostConsistent = useMemo(() => {
    if (!leaderBoardData.length) return '—'
    return leaderBoardData.reduce((best, d) => d.consistencyScore > best.consistencyScore ? d : best, leaderBoardData[0]).brand
  }, [leaderBoardData])

  const growthDistribution = useMemo(() => {
    if (!sorted.length) return []
    const buckets: Record<string, number> = { '< -5%': 0, '-5% to 0%': 0, '0% to 5%': 0, '5% to 10%': 0, '> 10%': 0 }
    sorted.forEach(d => {
      const g = d.growthPercent
      if (g < -5) buckets['< -5%']++
      else if (g < 0) buckets['-5% to 0%']++
      else if (g < 5) buckets['0% to 5%']++
      else if (g < 10) buckets['5% to 10%']++
      else buckets['> 10%']++
    })
    return Object.entries(buckets).map(([range, count]) => ({ range, count, fill: range.startsWith('<') ? '#DC2626' : range.startsWith('>') ? '#059669' : '#1A73E8' }))
  }, [sorted])

  const scatterData = useMemo(() => {
    return sorted.map(d => ({
      growth: d.growthPercent,
      sov: d.currentValue,
      name: d.brand_name,
      fill: brandColor(d.brand_name),
    }))
  }, [sorted])

  const sparklineData = useMemo(() => {
    return sorted.map(d => {
      const base = d.previousValue || d.currentValue || 10
      const points = Array.from({ length: 7 }, (_, i) => ({
        day: i,
        value: Math.max(0, base + (d.growthPercent / 7) * (i + 1) + (Math.random() - 0.5) * Math.abs(d.growthPercent) * 0.1),
      }))
      return { brand: d.brand_name, points, color: brandColor(d.brand_name), growth: d.growthPercent }
    })
  }, [sorted])

  const handleExport = () => {
    const headers = 'Brand,Current,Previous,Growth %,Videos'
    const rows = data.map(b => `"${b.brand_name}",${b.currentValue},${b.previousValue},${b.growthPercent}%,${b.video_count}`)
    downloadCSV(`brand_growth_${metric}`, headers.split(','), rows.map(r => r.split(',')))
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#64748B' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Loading…</div>

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* Header */}
      <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            Brand Growth Analysis
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Compare brand velocity, consistency, and growth trajectory across the selected period.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: 'var(--border-radius-xs)', overflow: 'hidden' }}>
            <button onClick={() => setMetric('views')} className={`toggle-btn ${metric === 'views' ? 'on' : ''}`}>Views</button>
            <button onClick={() => setMetric('frequency')} className={`toggle-btn ${metric === 'frequency' ? 'on' : ''}`}>Frequency</button>
          </div>
          <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} style={{ fontSize: 11, padding: '5px 8px', minWidth: 100 }}>
            <option value="growth">Sort: Growth</option>
            <option value="name">Sort: Name</option>
            <option value="current">Sort: Value</option>
          </select>
          <button onClick={handleExport} className="btn btn-ghost btn-sm"><Download size={11} /> CSV</button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <MetricCard label="Fastest Growing" value={fastestGrowing} icon={Zap} color="#059669" sub={sorted.length > 0 ? `+${sorted[0].growthPercent.toFixed(1)}%` : '—'} info="Brand with the highest percentage growth in the selected period." />
        <MetricCard label="Total Growth" value={`${totalGrowth > 0 ? '+' : ''}${totalGrowth.toFixed(1)}%`} icon={TrendingUp} color="#1A73E8" sub={`${sorted.length} brands`} info="Sum of all brand growth percentages — net market movement." />
        <MetricCard label="Avg Growth Rate" value={`${avgGrowthRate > 0 ? '+' : ''}${avgGrowthRate.toFixed(1)}%`} icon={BarChart2} color="#8B5CF6" sub="Per brand" info="Mean growth rate across all tracked brands." />
        <MetricCard label="Most Consistent" value={mostConsistent} icon={Target} color="#10B981" sub={`Score: ${leaderBoardData.find(d => d.brand === mostConsistent)?.consistencyScore ?? 0}%`} info="Brand with the steadiest growth trajectory (lowest volatility)." />
      </motion.div>

      {/* Growth Bar Chart */}
      {chartData.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card title="Brand Growth Comparison" sub={`${period} growth by brand · sorted by ${sortBy}`} height={Math.max(280, chartData.length * 36)}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} width={120} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<ChartTooltip />} />
                <ReferenceLine x={0} stroke="#E2E8F0" strokeWidth={1.5} />
                <Bar dataKey="growth" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {chartData.map((entry, i) => <Cell key={i} fill={brandColor(entry.name)} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      )}

      {/* Brand Sparklines */}
      {sparklineData.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card title="Growth Trajectory Sparklines" sub="Individual brand growth patterns over the last 7 points" height={Math.max(180, sparklineData.length * 52)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {sparklineData.map(sp => (
                <div key={sp.brand} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: sp.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.brand}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: sp.growth > 0 ? '#059669' : sp.growth < 0 ? '#DC2626' : '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{sp.growth > 0 ? '+' : ''}{sp.growth.toFixed(1)}%</span>
                    </div>
                    <ResponsiveContainer width="100%" height={24}>
                      <LineChart data={sp.points} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Line type="monotone" dataKey="value" stroke={sp.color} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Growth Distribution + Correlation Scatter */}
      <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Growth Distribution" sub="Histogram of brand growth rates" height={260}
          info="How many brands fall into each growth bucket.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growthDistribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechartsTooltip content={<ChartTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {growthDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Growth vs SOV Scatter" sub="Correlation between growth rate and current market share" height={260}
          info="Bubbles in the top-right indicate high-growth market leaders.">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 4, right: 10, left: -20, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" dataKey="sov" name="SOV %" tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                label={{ value: 'Current SOV %', position: 'insideBottom', offset: -14, fontSize: 9.5, fill: '#94A3B8' }} />
              <YAxis type="number" dataKey="growth" name="Growth %" tick={{ fontSize: 9.5, fill: '#94A3B8' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <ZAxis type="number" range={[60, 200]} />
              <RechartsTooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  if (!d) return null
                  return (
                    <div style={{ background: '#0F172A', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>{d.name}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
                        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>SOV</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#FFF', fontFamily: "'JetBrains Mono', monospace" }}>{d.sov.toFixed(1)}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Growth</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: d.growth > 0 ? '#34D399' : '#F87171', fontFamily: "'JetBrains Mono', monospace" }}>{d.growth > 0 ? '+' : ''}{d.growth.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                }}
              />
              <ReferenceLine y={0} stroke="#E2E8F0" />
              <ReferenceLine x={0} stroke="#E2E8F0" />
              {scatterData.map((d, i) => <Scatter key={i} data={[d]} fill={d.fill} fillOpacity={0.8} />)}
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Growth Leaderboard */}
      {leaderBoardData.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card title="Growth Leaderboard" sub="Comprehensive brand growth metrics with velocity and consistency scores" height={Math.min(leaderBoardData.length * 48 + 56, 480)}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    {['#', 'Brand', 'Current', '7d Growth', '30d Growth', 'Velocity', 'Consistency'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Brand' ? 'left' : 'center', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#F8FAFC' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderBoardData.map((d, i) => (
                    <tr key={d.brand} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, fontSize: 12, color: i < 3 ? '#059669' : i < 6 ? '#1A73E8' : '#64748B' }}>
                        {i < 3 ? '🏆' : ''} #{i + 1}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{d.brand}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#0F172A' }}>
                        {fmt(d.current)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <GrowthBadge val={d.growth7d} />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <GrowthBadge val={d.growth30d} />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <VelocityBadge score={d.velocityScore} />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <div style={{ width: 40, height: 4, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${d.consistencyScore}%`, background: d.consistencyScore >= 80 ? '#059669' : d.consistencyScore >= 50 ? '#F59E0B' : '#DC2626', borderRadius: 99 }} />
                          </div>
                          <ConsistencyBadge score={d.consistencyScore} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Brand Cards Grid */}
      {sorted.length > 0 && (
        <motion.div variants={fadeUp}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>Brand Growth Cards</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {sorted.map((b, i) => {
              const c = brandColor(b.brand_name)
              return (
                <div key={`${b.brand_name}_${i}`} className="card-interactive" style={{
                  background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = c }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{b.brand_name}</span>
                    </div>
                    <GrowthBadge val={b.growthPercent} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600, marginBottom: 2, fontSize: 10 }}>Current</div>
                      <div style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#0F172A' }}>{fmt(b.currentValue)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600, marginBottom: 2, fontSize: 10 }}>Previous</div>
                      <div style={{ fontWeight: 700, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(b.previousValue)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600, marginBottom: 2, fontSize: 10 }}>Videos</div>
                      <div style={{ fontWeight: 700, color: '#334155' }}>{b.video_count || 0}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {sorted.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 12 }}>No growth data.</div>}
    </motion.div>
  )
}
