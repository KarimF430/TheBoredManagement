'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { motion } from 'framer-motion'
import { useCampaignStore } from '@/lib/store'
import { useFilterStore } from '@/lib/filter-store'
import SharedFilterBar from '@/components/SharedFilterBar'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle, RefreshCw, ChevronUp, ChevronDown, Download,
  Search, Info, Layers, Calendar, Target, Award, Activity, TrendingUp,
  TrendingDown, Minus, BarChart2, ArrowUpRight, ArrowDownRight, Zap,
} from 'lucide-react'
import { PageSkeleton } from '@/components/PageSkeleton'
import Link from 'next/link'
import { brandColor } from '@/lib/brand-colors'
import { EmptyState } from '@/components/StateViews'

const ANIM = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }
const STAGGER = { show: { transition: { staggerChildren: 0.06 } } }

function MetricCard({ label, value, icon: Icon, color, info, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; info: string; sub?: string
}) {
  return (
    <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <Icon size={12} style={{ color, flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</span>
        </div>
        <div style={{ color: 'var(--neutral-300)', cursor: 'help', flexShrink: 0, marginLeft: 4 }} title={info}><Info size={10} /></div>
      </div>
      <div>
        <div className="kpi-value mono" style={{ fontSize: 22, color, marginTop: 8 }}>{value}</div>
        {sub && <div className="kpi-sub" style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  )
}

function Card({ title, sub, height = 280, children, info, right }: {
  title: string; sub?: string; height?: number; children: React.ReactNode; info?: string; right?: React.ReactNode
}) {
  return (
    <div className="chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-h3" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
            {info && <span title={info} style={{ cursor: 'help', color: 'var(--neutral-300)', flexShrink: 0 }}><Info size={12} /></span>}
          </div>
          {sub && <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        {right && <div style={{ marginLeft: 8, flexShrink: 0 }}>{right}</div>}
      </div>
      <div style={{ height, flex: 1 }}>{children}</div>
    </div>
  )
}

function Badge({ fg, bg, children }: { fg: string; bg?: string; children: React.ReactNode }) {
  return <span className="badge" style={{ background: bg || `${fg}12`, color: fg }}>{children}</span>
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].filter(p => p.value > 0).sort((a: any, b: any) => b.value - a.value)
  return (
    <div className="tooltip-box tooltip-box--dark" style={{ minWidth: 180 }}>
      <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>{label}</div>
      {sorted.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--neutral-300)', fontWeight: 600 }}>{p.name}</span>
          </div>
          <span className="num" style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: p.color || p.fill }}>{(p.value as number).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

function rollingAvg(data: any[], key: string, window = 3) {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1)
    const avg = slice.reduce((s, x) => s + (x[key] ?? 0), 0) / slice.length
    return { ...d, [`${key}_avg`]: Math.round(avg * 10) / 10 }
  })
}

function computeBrandStats(data: any[], brands: string[]) {
  if (!data.length) return []
  const last = data[data.length - 1]
  const prev = data.length > 1 ? data[data.length - 2] : null
  const peak = (b: string) => Math.max(...data.map(d => d[b] ?? 0))
  const avg = (b: string) => data.reduce((s, d) => s + (d[b] ?? 0), 0) / data.length
  return brands.map((b) => ({
    brand: b,
    current: last[b] ?? 0,
    prev: prev?.[b] ?? 0,
    delta: prev ? ((last[b] ?? 0) - (prev[b] ?? 0)) : 0,
    peak: peak(b),
    avg: avg(b),
    color: brandColor(b),
  })).sort((a, b) => b.current - a.current)
}

function computeHHI(brands: string[], data: any[]): number {
  if (!data.length || !brands.length) return 0
  const last = data[data.length - 1]
  const shares = brands.map(b => (last[b] ?? 0) / 100)
  return Math.round(shares.reduce((sum, s) => sum + s * s, 0) * 10000)
}

function computeVolatility(brand: string, data: any[]): number {
  if (data.length < 2) return 0
  const vals = data.map(d => d[brand] ?? 0)
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
  return Math.round(Math.sqrt(variance) * 10) / 10
}

function computeBrandRanks(data: any[], brands: string[]): any[] {
  return data.map(d => {
    const sorted = brands.slice().sort((a, b) => (d[b] ?? 0) - (d[a] ?? 0))
    const ranks: Record<string, number> = {}
    sorted.forEach((b, i) => { ranks[b] = i + 1 })
    return { date: d.date, ...ranks }
  })
}

export default function SovTrendPage() {
  const { campaigns, activeCampaignId, fetchCampaigns } = useCampaignStore()
  const { search, ownership, format, dateRange, customDateFrom, customDateTo } = useFilterStore()
  const [chartType, setChartType] = useState<'area' | 'line'>('area')
  const [activeBrands, setActiveBrands] = useState<string[]>([])
  const [showAvg, setShowAvg] = useState(false)

  const days = (() => {
    if (dateRange === 'Custom' && customDateFrom && customDateTo) {
      const from = new Date(customDateFrom)
      const to = new Date(customDateTo)
      const diffMs = to.getTime() - from.getTime()
      return String(Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1))
    }
    const map: Record<string, string> = { '24h': '1', '48h': '2', '1W': '7', '1M': '30', 'All': '365' }
    return map[dateRange] || '30'
  })()

  const trendQuery = useQuery({
    queryKey: ['sov-trend', activeCampaignId, days, ownership, format, customDateFrom, customDateTo],
    queryFn: async () => {
      let url = `/api/sov-trend?campaign_id=${activeCampaignId}&days=${days}`
      if (ownership !== 'all') url += `&is_ours=${ownership === 'ours' ? 'true' : 'false'}`
      if (format !== 'all') url += `&format=${format}`
      if (dateRange === 'Custom' && customDateFrom && customDateTo) {
        url += `&date_from=${customDateFrom}&date_to=${customDateTo}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch trend data')
      return res.json()
    },
    enabled: !!activeCampaignId,
  })

  const data = trendQuery.data?.data ?? []
  const brands: string[] = trendQuery.data?.brands ?? []
  const hasScrapeData = trendQuery.data?.has_scrape_data ?? false
  const loading = trendQuery.isLoading
  const filteredBrands = search ? brands.filter(b => b.toLowerCase().includes(search.toLowerCase())) : brands

  useEffect(() => {
    if (brands.length > 0) setActiveBrands(brands)
  }, [brands])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const toggleBrand = (b: string) =>
    setActiveBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])

  // These must run on EVERY render. They used to sit below the loading /
  // empty-state early returns, so the first render (loading) ran fewer hooks
  // than the second (data present) — "Rendered more hooks than during the
  // previous render". Derived values are cheap and safe to compute against
  // the empty defaults, so hoisting them above the guards is the fix.
  const brandStats = useMemo(() => computeBrandStats(data, brands), [data, brands])
  const hhi = useMemo(() => computeHHI(brands, data), [brands, data])
  const brandRanks = useMemo(() => computeBrandRanks(data, brands), [data, brands])

  const volatilityData = useMemo(() => {
    return brands.map(b => ({
      brand: b,
      volatility: computeVolatility(b, data),
      color: brandColor(b),
    })).sort((a, b) => b.volatility - a.volatility)
  }, [brands, data])

  const brandCards = useMemo(() => {
    return brandStats.map((bs, i) => {
      const signal = bs.delta > 1 ? 'Accelerating' : bs.delta < -1 ? 'Declining' : 'Stable'
      const signalIcon = signal === 'Accelerating' ? ArrowUpRight : signal === 'Declining' ? ArrowDownRight : Minus
      const signalColor = signal === 'Accelerating' ? '#22C55E' : signal === 'Declining' ? '#EF4444' : '#F59E0B'
      const momentum = signal === 'Accelerating' ? 'Accelerating' : signal === 'Declining' ? 'Declining' : 'Stable'
      return { ...bs, signal, signalIcon, signalColor, momentum, idx: i + 1 }
    })
  }, [brandStats])

  if (loading) return (
    <div className="anim-fade-up">
      <PageSkeleton cols={6} rows={3} />
    </div>
  )

  if (!activeCampaignId || brands.length === 0) return (
    <div className="anim-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Share-of-Voice <span className="accent">Trend</span></h1>
          <p className="page-subtitle">Time-series SOV evolution with brand comparison</p>
        </div>
      </div>
      <EmptyState
        icon={<AlertCircle size={36} strokeWidth={1.5} style={{ color: 'var(--neutral-300)' }} />}
        title={!activeCampaignId ? 'Select a Campaign' : 'No Brand Data'}
        body={!activeCampaignId
          ? 'Choose a campaign to view SOV trends'
          : <>Add brands in <Link href="/control" style={{ color: 'var(--accent)', fontWeight: 600 }}>Campaign Control</Link> to start plotting trends.</>}
      />
    </div>
  )

  const effectiveActiveBrands = activeBrands.length > 0 ? activeBrands : brands
  const chartData = showAvg && data.length > 0
    ? effectiveActiveBrands.reduce((d, b) => rollingAvg(d, b), data)
    : data

  const lastSnapshot = data.length > 0 ? data[data.length - 1] : null
  const leaderSov = brandStats.length > 0 ? brandStats[0].current : 0
  const daysTracked = data.length
  const maxVolatility = volatilityData.length > 0 ? volatilityData[0].volatility : 1

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: 8 }}>
            Share of Voice Trend Intelligence
            {loading && <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)', fontWeight: 600, marginLeft: 8 }}>Loading...</span>}
          </div>
          <div style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', marginTop: 4 }}>
            Time-series SOV evolution — brand tracking, momentum analysis, market concentration
          </div>
        </div>
      </div>

      <SharedFilterBar hasActiveFilters={showAvg || chartType !== 'area'} onReset={() => { setShowAvg(false); setChartType('area') }}>
        <div className="toggle-group">
          {(['area', 'line'] as const).map(m => (
            <button key={m} onClick={() => setChartType(m)} className={`toggle-btn ${chartType === m ? 'active' : ''}`}>
              {m === 'area' ? 'Stacked Area' : 'Multi Line'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAvg(v => !v)} className={`toggle-btn ${showAvg ? 'active' : ''}`} style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-label)', fontWeight: 600, border: '1px solid var(--border-2)', cursor: 'pointer', background: showAvg ? 'var(--accent)' : 'var(--bg-base)', color: showAvg ? 'var(--surface)' : 'var(--text-secondary)', fontFamily: 'inherit' }}>
          7-Day Avg
        </button>
      </SharedFilterBar>

      {!hasScrapeData && (
        <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--accent)' }}>
          <RefreshCw size={18} style={{ color: 'var(--accent)', flexShrink: 0, animation: 'spin 8s linear infinite' }} />
          <div style={{ fontSize: 'var(--fs-body)', color: 'var(--text-primary)' }}>
            <strong>Snapshots pending.</strong> Run a scrape from <Link href="/control" style={{ fontWeight: 700, color: 'var(--accent)', textDecoration: 'underline' }}>Campaign Control</Link> to log daily view snapshots.
          </div>
        </div>
      )}

      {/* KPI Row */}
      <motion.div variants={STAGGER} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <motion.div variants={ANIM}>
          <MetricCard label="Total Brands" value={brands.length} icon={Layers} color="var(--accent)" sub="Tracked in campaign" info="Number of distinct brands being monitored for share-of-voice." />
        </motion.div>
        <motion.div variants={ANIM}>
          <MetricCard label="Data Points" value={daysTracked} icon={Calendar} color="var(--info)" sub="Days with data" info="Total number of days with recorded SOV data points." />
        </motion.div>
        <motion.div variants={ANIM}>
          <MetricCard label="Market Concentration" value={hhi} icon={Target} color="#EC4899" sub={hhi > 2500 ? 'Highly concentrated' : hhi > 1500 ? 'Moderately concentrated' : 'Competitive'} info="Herfindahl-Hirschman Index. Higher = more concentrated (dominant brand). Range: 0–10000." />
        </motion.div>
        <motion.div variants={ANIM}>
          <MetricCard label="Leader SOV" value={`${leaderSov.toFixed(1)}%`} icon={Award} color="var(--success-text)" sub={brandStats[0]?.brand || '—'} info="Current share-of-voice percentage of the leading brand." />
        </motion.div>
        <motion.div variants={ANIM}>
          <MetricCard label="Days Tracked" value={daysTracked} icon={Activity} color="var(--warning)" sub={`Since ${data[0]?.date || '—'}`} info="Duration of SOV tracking in days." />
        </motion.div>
      </motion.div>

      {/* Brand Intelligence Grid */}
      {brandCards.length > 0 && (
        <div>
          <div className="t-h2" style={{ marginBottom: 16 }}>Brand Intelligence</div>
          <motion.div variants={STAGGER} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {brandCards.map((bs) => (
              <motion.div
                key={bs.brand}
                variants={ANIM}
                style={{ background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg-base) 100%)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-2)', padding: 20, boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}
                whileHover={{ borderColor: 'var(--neutral-300)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
              >
                <div style={{ position: 'absolute', top: -14, right: -10, fontSize: 64, fontWeight: 900, color: 'var(--bg-hover)', zIndex: 0 }}>#{bs.idx}</div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: bs.color }} />
                    <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }} title={bs.brand}>{bs.brand}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: bs.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                    {bs.current.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>current SOV</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
                    <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '6px 8px' }}>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Peak</div>
                      <div style={{ fontSize: 'var(--fs-body)', fontWeight: 800, color: 'var(--text-bright)', fontFamily: 'var(--font-mono)' }}>{bs.peak.toFixed(1)}%</div>
                    </div>
                    <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '6px 8px' }}>
                      <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Average</div>
                      <div style={{ fontSize: 'var(--fs-body)', fontWeight: 800, color: 'var(--text-bright)', fontFamily: 'var(--font-mono)' }}>{bs.avg.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <bs.signalIcon size={12} style={{ color: bs.signalColor }} />
                      <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: bs.signalColor }}>{bs.delta >= 0 ? '+' : ''}{bs.delta.toFixed(1)}%</span>
                    </div>
                    <Badge fg={bs.signalColor}>{bs.momentum}</Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Main Trend Chart */}
      <Card title="SOV Timeline" sub={`Daily share-of-voice % per brand${showAvg ? ' · 7-day rolling average' : ''}`} height={380}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {effectiveActiveBrands.map((b) => (
                  <linearGradient key={b} id={`sov_grad_${b}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={brandColor(b)} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={brandColor(b)} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis unit="%" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} />
              {effectiveActiveBrands.map((b) => (
                <Area
                  key={b} type="monotone"
                  dataKey={showAvg ? `${b}_avg` : b}
                  name={b}
                  stackId="1"
                  stroke={brandColor(b)}
                  fill={`url(#sov_grad_${b})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={800}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis unit="%" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} />
              {effectiveActiveBrands.map((b) => (
                <Line
                  key={b} type="monotone"
                  dataKey={showAvg ? `${b}_avg` : b}
                  name={b}
                  stroke={brandColor(b)}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  animationDuration={800}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </Card>

      {/* SOV Distribution + Brand Ranking Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="SOV Distribution" sub="Current snapshot — horizontal share per brand" info="Horizontal bar chart showing each brand's share-of-voice percentage for the most recent date." height={Math.max(220, brands.length * 32)}>
          {lastSnapshot ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={brands.map((b) => ({
                  brand: b.length > 18 ? b.slice(0, 18) + '…' : b,
                  sov: lastSnapshot[b] ?? 0,
                  color: brandColor(b),
                })).sort((a, b) => b.sov - a.sov)}
                layout="vertical"
                margin={{ top: 4, right: 40, left: 60, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light)" />
                <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <YAxis type="category" dataKey="brand" tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'SOV']} contentStyle={{ background: 'var(--tooltip-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 11 }} labelStyle={{ color: 'var(--text-muted)' }} itemStyle={{ color: 'var(--tooltip-text)' }} />
                <Bar dataKey="sov" radius={[0, 6, 6, 0]} barSize={20}>
                  {brands.map((b) => <Cell key={b} fill={brandColor(b)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
              No snapshot data yet
            </div>
          )}
        </Card>

        <Card title="Brand Ranking Timeline" sub="How brand positions shift over time" info="Rank 1 = highest SOV on that date. Shows competitive movement across all tracked days." height={Math.max(220, brands.length * 32)}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, minWidth: 400 }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>Date</th>
                  {brands.map((b) => (
                    <th key={b} style={{ padding: '8px 8px', textAlign: 'center', fontSize: 'var(--fs-micro)', fontWeight: 700, color: brandColor(b), whiteSpace: 'nowrap' }} title={b}>
                      {b.length > 10 ? b.slice(0, 10) + '…' : b}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brandRanks.slice(-10).map((row) => (
                  <tr key={row.date}>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-bright)', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>{row.date}</td>
                    {brands.map((b) => {
                      const rank = row[b] ?? '-'
                      const isTop = rank === 1
                      return (
                        <td key={b} style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-micro)', fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            background: isTop ? 'var(--text-bright)' : 'var(--border-1)',
                            color: isTop ? 'var(--surface)' : 'var(--text-secondary)',
                          }}>
                            {rank}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Momentum Tracker + Volatility Analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Momentum Tracker" sub="Brand acceleration, stability, and decline signals" info="Based on period-over-period change: >1% = Accelerating, <-1% = Declining, else Stable." height={Math.max(240, brands.length * 40)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {brandStats.map((bs) => {
              const signal = bs.delta > 1 ? 'Accelerating' : bs.delta < -1 ? 'Declining' : 'Stable'
      const signalColor = signal === 'Accelerating' ? '#22C55E' : signal === 'Declining' ? '#EF4444' : '#F59E0B'
              const progressWidth = Math.min(100, Math.max(5, Math.abs(bs.delta) * 8 + 10))
              return (
                <div key={bs.brand} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)', border: '1px solid var(--border-1)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: bs.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)', minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bs.brand}>{bs.brand}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--border-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressWidth}%`, background: signalColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                    <span className="num" style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: bs.color, minWidth: 48, textAlign: 'right' }}>{bs.current.toFixed(1)}%</span>
                    <Badge fg={signalColor}>{signal}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Volatility Analysis" sub="Standard deviation of SOV — higher = more variable" info="Measures how much a brand's SOV fluctuates. High volatility may indicate unstable competitive positioning." height={Math.max(240, brands.length * 40)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {volatilityData.map((v) => {
              const pct = maxVolatility > 0 ? (v.volatility / maxVolatility) * 100 : 0
              const level = v.volatility > 15 ? 'High' : v.volatility > 8 ? 'Moderate' : 'Low'
              const levelColor = v.volatility > 15 ? '#EF4444' : v.volatility > 8 ? '#F59E0B' : '#22C55E'
              return (
                <div key={v.brand} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)', border: '1px solid var(--border-1)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)', minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.brand}>{v.brand}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--border-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: levelColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                    <span className="num" style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: v.color, minWidth: 48, textAlign: 'right' }}>σ {v.volatility}</span>
                    <Badge fg={levelColor}>{level}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Brand Filter */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 10 }}>
          Filter Brands {search ? <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--fs-label)' }}>· {filteredBrands.length} of {brands.length}</span> : <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--fs-label)' }}>· {brands.length} total</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {filteredBrands.map((b) => {
            const active = effectiveActiveBrands.includes(b)
            const color = brandColor(b)
            return (
              <button
                key={b}
                onClick={() => toggleBrand(b)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-md)',
                  background: active ? `${color}10` : 'var(--bg-base)',
                  border: `1px solid ${active ? `${color}40` : 'var(--border-2)'}`,
                  color: active ? color : 'var(--text-secondary)',
                  fontSize: 'var(--fs-sm)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? color : 'var(--neutral-300)' }} />
                {b}
                {active && (
                  <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {brandStats.find(s => s.brand === b)?.current.toFixed(1)}%
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
