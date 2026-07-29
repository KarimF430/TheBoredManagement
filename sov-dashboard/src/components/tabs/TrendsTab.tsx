'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts'
import { motion } from 'framer-motion'
import { Loader2, Download, TrendingUp, Calendar, Activity, Flame, Crown, Info, BarChart2 } from 'lucide-react'
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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].filter(p => p.value > 0).sort((a: any, b: any) => b.value - a.value)
  return (
    <div style={{ background: '#0F172A', border: 'none', borderRadius: 10, padding: '10px 14px', minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <div style={{ fontSize: 10.5, color: '#94A3B8', marginBottom: 8, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>{label}</div>
      {sorted.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} /><span style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 600 }}>{p.name}</span></div>
          <span style={{ fontSize: 12, fontWeight: 800, color: p.color || p.fill }}>{(p.value as number).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const sq = values.map(v => (v - mean) ** 2)
  return Math.sqrt(sq.reduce((s, v) => s + v, 0) / (values.length - 1))
}

function computeBrandStats(data: any[], brands: string[]) {
  if (!data.length) return []
  const last = data[data.length - 1]
  const prev = data.length > 1 ? data[data.length - 2] : null
  return brands.map(b => {
    const values = data.map(d => d[b] ?? 0)
    const peak = Math.max(...values)
    const avg = values.reduce((s, v) => s + v, 0) / values.length
    const volatility = stdDev(values)
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length : firstAvg
    const trendDirection: 'up' | 'down' | 'flat' = secondAvg > firstAvg + 0.5 ? 'up' : secondAvg < firstAvg - 0.5 ? 'down' : 'flat'
    const momentum = (last[b] ?? 0) - (prev?.[b] ?? last[b] ?? 0)
    return {
      brand: b,
      current: last[b] ?? 0,
      prev: prev?.[b] ?? 0,
      delta: prev ? ((last[b] ?? 0) - (prev[b] ?? 0)) : 0,
      peak,
      avg,
      volatility,
      trendDirection,
      momentum,
      color: brandColor(b),
    }
  }).sort((a, b) => b.current - a.current)
}

function TrendBadge({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#059669', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.15)' }}>↗ Rising</span>
  if (direction === 'down') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#DC2626', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}>↘ Falling</span>
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#64748B', fontWeight: 600, fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#F1F5F9' }}>→ Flat</span>
}

function MomentumBadge({ value }: { value: number }) {
  if (value > 1) return <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', padding: '2px 7px', borderRadius: 12, background: 'rgba(5,150,105,0.08)' }}>Strong</span>
  if (value > 0) return <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', padding: '2px 7px', borderRadius: 12, background: 'rgba(16,185,129,0.08)' }}>Positive</span>
  if (value > -1) return <span style={{ fontSize: 10, fontWeight: 600, color: '#64748B', padding: '2px 7px', borderRadius: 12, background: '#F1F5F9' }}>Neutral</span>
  if (value > -3) return <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', padding: '2px 7px', borderRadius: 12, background: 'rgba(245,158,11,0.08)' }}>Weak</span>
  return <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', padding: '2px 7px', borderRadius: 12, background: 'rgba(220,38,38,0.08)' }}>Critical</span>
}

export default function TrendsTab() {
  const { downloadCSV } = useDashboard()
  const { search, ownership, dateRange, customDateFrom, customDateTo } = useFilterStore()
  const { activeCampaignId } = useCampaignStore()
  const [chartType, setChartType] = useState<'area' | 'line'>('area')
  const [activeBrands, setActiveBrands] = useState<string[]>([])
  const [showAvg, setShowAvg] = useState(false)
  const [metric, setMetric] = useState<'views' | 'frequency'>('views')

  const days = useMemo(() => {
    if (dateRange === 'Custom' && customDateFrom && customDateTo) {
      const from = new Date(customDateFrom)
      const to = new Date(customDateTo)
      const diffMs = to.getTime() - from.getTime()
      return String(Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1))
    }
    const map: Record<string, string> = { '24h': '1', '48h': '2', '1W': '7', '1M': '30', 'All': '365' }
    return map[dateRange] || '30'
  }, [dateRange, customDateFrom, customDateTo])

  const trendTabQuery = useQuery({
    queryKey: ['trends-tab', activeCampaignId, days, ownership, metric],
    queryFn: async () => {
      if (!activeCampaignId) return { data: [], brands: [] }
      const params = new URLSearchParams({ campaign_id: activeCampaignId, days })
      if (ownership !== 'all') params.set('is_ours', ownership === 'ours' ? 'true' : 'false')
      if (metric === 'frequency') params.set('metric', 'frequency')
      const res = await fetch(`/api/sov-trend?${params}`)
      if (!res.ok) throw new Error('Failed to fetch trend data')
      return res.json()
    },
    enabled: !!activeCampaignId,
  })

  const data = trendTabQuery.data?.data ?? []
  const brands = trendTabQuery.data?.brands ?? []
  const filteredBrands = search ? brands.filter((b: string) => b.toLowerCase().includes(search.toLowerCase())) : brands

  useEffect(() => {
    if (trendTabQuery.data?.brands) setActiveBrands(trendTabQuery.data.brands)
  }, [trendTabQuery.data?.brands])

  const toggleBrand = (b: string) => setActiveBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])

  const enrichedData = useMemo(() => {
    if (!showAvg) return data
    return data.map((d: any, i: number) => {
      const row = { ...d }
      for (const b of activeBrands) {
        const w = data.slice(Math.max(0, i - 2), i + 1)
        row[`${b}_avg`] = Math.round((w.reduce((s: number, x: any) => s + (x[b] ?? 0), 0) / w.length) * 10) / 10
      }
      return row
    })
  }, [data, showAvg, activeBrands])

  const brandStats = useMemo(() => computeBrandStats(data, brands), [data, brands])

  const totalDataPoints = useMemo(() => data.length * activeBrands.length, [data, activeBrands])
  const daysTracked = data.length
  const avgDailySOV = useMemo(() => {
    if (!data.length || !activeBrands.length) return 0
    const totals = data.map((d: any) => activeBrands.reduce((s, b) => s + (d[b] ?? 0), 0))
    return totals.reduce((s: number, v: number) => s + v, 0) / totals.length
  }, [data, activeBrands])
  const mostVolatileBrand = useMemo(() => {
    if (!brandStats.length) return '—'
    return brandStats.reduce((max, s) => s.volatility > max.volatility ? s : max, brandStats[0]).brand
  }, [brandStats])
  const marketLeader = brandStats.length > 0 ? brandStats[0].brand : '—'

  const distributionData = useMemo(() => {
    if (!brandStats.length) return []
    const total = brandStats.reduce((s, b) => s + b.current, 0)
    return brandStats.map(b => ({
      name: b.brand,
      value: total > 0 ? Math.round((b.current / total) * 100) : 0,
      color: b.color,
    }))
  }, [brandStats])

  const heatmapData = useMemo(() => {
    if (!data.length || !brands.length) return []
    const recent = data.slice(-14)
    return recent.map((d: any) => {
      const row: any = { date: d.date }
      for (const b of brands) row[b] = d[b] ?? 0
      return row
    })
  }, [data, brands])

  const handleExport = () => {
    const headers = ['Date', ...brands]
    const rows = data.map((d: any) => [d.date, ...brands.map((b: string) => String(d[b] ?? 0))])
    downloadCSV('sov_trend', headers, rows)
  }

  if (trendTabQuery.isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#64748B' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Loading…</div>

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* Header */}
      <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            SOV Trends
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Track share of voice movement, volatility, and brand momentum over time.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: 'var(--border-radius-xs)', overflow: 'hidden' }}>
            <button onClick={() => setMetric('views')} className={`toggle-btn ${metric === 'views' ? 'on' : ''}`}>Views</button>
            <button onClick={() => setMetric('frequency')} className={`toggle-btn ${metric === 'frequency' ? 'on' : ''}`}>Frequency</button>
          </div>
          <div style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: 'var(--border-radius-xs)', overflow: 'hidden' }}>
            <button onClick={() => setChartType('area')} className={`toggle-btn ${chartType === 'area' ? 'on' : ''}`}>Area</button>
            <button onClick={() => setChartType('line')} className={`toggle-btn ${chartType === 'line' ? 'on' : ''}`}>Line</button>
          </div>
          <button onClick={() => setShowAvg(v => !v)} className={`toggle-btn ${showAvg ? 'on' : ''}`}>3d avg</button>
          <button onClick={handleExport} className="btn btn-ghost btn-sm"><Download size={11} /> CSV</button>
        </div>
      </motion.div>

      {/* Brand Filter Chips */}
      <motion.div variants={fadeUp} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {filteredBrands.map((b: string) => {
          const on = activeBrands.includes(b)
          const c = brandColor(b)
          return (
            <button key={b} onClick={() => toggleBrand(b)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6,
              border: `1.5px solid ${on ? c : '#E2E8F0'}`, background: on ? `${c}10` : '#FFF',
              color: on ? c : '#64748B', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: on ? c : '#CBD5E1' }} />{b}
            </button>
          )
        })}
        {search && brands.length > filteredBrands.length && <span style={{ fontSize: 11, color: '#94A3B8', alignSelf: 'center' }}>{filteredBrands.length} of {brands.length}</span>}
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <MetricCard label="Total Data Points" value={totalDataPoints.toLocaleString()} icon={BarChart2} color="#1A73E8" sub={`${brands.length} brands × ${data.length} days`} info="Total individual data cells across all brands and dates." />
        <MetricCard label="Days Tracked" value={daysTracked} icon={Calendar} color="#8B5CF6" sub={`${days} day range`} info="Number of unique dates with SOV data in the selected period." />
        <MetricCard label="Avg Daily SOV" value={`${avgDailySOV.toFixed(1)}%`} icon={Activity} color="#10B981" sub="Across all active brands" info="Average combined SOV per day for the filtered brands." />
        <MetricCard label="Most Volatile Brand" value={mostVolatileBrand} icon={Flame} color="#F59E0B" sub={`σ = ${brandStats.find(b => b.brand === mostVolatileBrand)?.volatility.toFixed(1) ?? 0}%`} info="Brand with the highest standard deviation — most unpredictable SOV." />
        <MetricCard label="Market Leader" value={marketLeader} icon={Crown} color="#059669" sub={`${brandStats[0]?.current.toFixed(1) ?? 0}% current`} info="Brand with the highest current SOV percentage." />
      </motion.div>

      {/* Main Trend Chart */}
      <motion.div variants={fadeUp}>
        <Card title="SOV Trend" sub={`${chartType === 'area' ? 'Area' : 'Line'} chart · ${metric} metric · ${days}d window`} height={320}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={enrichedData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={d => d?.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {activeBrands.map(b => (
                  <Area key={b} type="monotone" dataKey={b} stroke={brandColor(b)} fill={`${brandColor(b)}15`} strokeWidth={2} dot={false} animationDuration={800} />
                ))}
                {showAvg && activeBrands.map(b => (
                  <Line key={`${b}_avg`} type="monotone" dataKey={`${b}_avg`} stroke={brandColor(b)} strokeWidth={1} strokeDasharray="4 4" dot={false} />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={enrichedData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={d => d?.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                {activeBrands.map(b => (
                  <Line key={b} type="monotone" dataKey={b} stroke={brandColor(b)} strokeWidth={2} dot={false} animationDuration={800} />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Brand Comparison Table */}
      {brandStats.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card title="Brand Comparison" sub="Current SOV, peak, average, volatility, and trend analysis" height={Math.min(brandStats.length * 44 + 50, 400)}
            info="Volatility = standard deviation. Momentum = day-over-day change. Trend = overall direction over the period.">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    {['Brand', 'Current', 'Peak', 'Avg', 'Volatility', 'Trend', 'Momentum'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Brand' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#F8FAFC' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {brandStats.map(s => (
                    <tr key={s.brand} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{s.brand}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#0F172A' }}>{s.current.toFixed(1)}%</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{s.peak.toFixed(1)}%</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{s.avg.toFixed(1)}%</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: s.volatility > 5 ? '#DC2626' : s.volatility > 2 ? '#F59E0B' : '#059669', fontFamily: "'JetBrains Mono', monospace" }}>{s.volatility.toFixed(1)}%</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}><TrendBadge direction={s.trendDirection} /></td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}><MomentumBadge value={s.momentum} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Distribution + Heatmap */}
      <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="SOV Distribution" sub="Current market share breakdown" height={260}
          info="Proportional SOV across all brands at the latest data point.">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2} strokeWidth={0}>
                {distributionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div style={{ background: '#0F172A', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>{d.name}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: d.color, fontFamily: "'JetBrains Mono', monospace" }}>{d.value}%</div>
                    </div>
                  )
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 10.5 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="SOV Heatmap" sub="Brand strength across recent dates" height={260}
          info="Darker cells indicate higher SOV on that date. Last 14 data points shown.">
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 220 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 6px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#64748B', background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 1 }}>Date</th>
                  {brands.slice(0, 8).map((b: string) => (
                    <th key={b} style={{ padding: '4px 6px', textAlign: 'center', fontSize: 9, fontWeight: 700, color: brandColor(b), background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap' }}>{b.slice(0, 8)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row: Record<string, any>, ri: number) => (
                  <tr key={ri}>
                    <td style={{ padding: '3px 6px', fontSize: 9, fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap' }}>{row.date?.slice(5)}</td>
                    {brands.slice(0, 8).map((b: string) => {
                      const val = row[b] ?? 0
                      const maxVal = Math.max(...heatmapData.map((r: Record<string, any>) => r[b] ?? 0), 1)
                      const intensity = val / maxVal
                      const bg = `rgba(${intensity > 0.5 ? '5,150,105' : '26,115,232'},${0.08 + intensity * 0.4})`
                      return (
                        <td key={b} style={{ padding: '3px 6px', textAlign: 'center', background: bg, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: intensity > 0.5 ? '#059669' : '#1A73E8', fontSize: 9 }}>
                          {val.toFixed(1)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
