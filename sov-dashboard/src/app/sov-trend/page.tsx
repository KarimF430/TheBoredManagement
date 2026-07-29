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

const ANIM = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }
const STAGGER = { show: { transition: { staggerChildren: 0.06 } } }

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

function Badge({ fg, bg, children }: { fg: string; bg?: string; children: React.ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: bg || `${fg}12`, color: fg }}>{children}</span>
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].filter(p => p.value > 0).sort((a: any, b: any) => b.value - a.value)
  return (
    <div style={{ background: '#1E293B', border: 'none', borderRadius: 10, padding: '10px 14px', minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      <div style={{ fontSize: 10.5, color: '#94A3B8', marginBottom: 8, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>{label}</div>
      {sorted.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
            <span style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 600 }}>{p.name}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: p.color || p.fill }}>{(p.value as number).toFixed(1)}%</span>
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, background: '#fff', borderRadius: 14, border: '1px solid #F1F5F9' }}>
        <AlertCircle size={36} style={{ color: '#CBD5E1' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>{!activeCampaignId ? 'Select a Campaign' : 'No Brand Data'}</div>
        <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: 360 }}>
          {!activeCampaignId
            ? 'Choose a campaign to view SOV trends'
            : <>Add brands in <Link href="/control" style={{ color: '#1A73E8', fontWeight: 600 }}>Campaign Control</Link> to start plotting trends.</>}
        </div>
      </div>
    </div>
  )

  const brandStats = computeBrandStats(data, brands)
  const effectiveActiveBrands = activeBrands.length > 0 ? activeBrands : brands
  const chartData = showAvg && data.length > 0
    ? effectiveActiveBrands.reduce((d, b) => rollingAvg(d, b), data)
    : data

  const lastSnapshot = data.length > 0 ? data[data.length - 1] : null

  const hhi = useMemo(() => computeHHI(brands, data), [brands, data])
  const leaderSov = brandStats.length > 0 ? brandStats[0].current : 0
  const daysTracked = data.length

  const brandRanks = useMemo(() => computeBrandRanks(data, brands), [data, brands])

  const volatilityData = useMemo(() => {
    return brands.map(b => ({
      brand: b,
      volatility: computeVolatility(b, data),
      color: brandColor(b),
    })).sort((a, b) => b.volatility - a.volatility)
  }, [brands, data])

  const maxVolatility = volatilityData.length > 0 ? volatilityData[0].volatility : 1

  const brandCards = useMemo(() => {
    return brandStats.map((bs, i) => {
      const signal = bs.delta > 1 ? 'Accelerating' : bs.delta < -1 ? 'Declining' : 'Stable'
      const signalIcon = signal === 'Accelerating' ? ArrowUpRight : signal === 'Declining' ? ArrowDownRight : Minus
      const signalColor = signal === 'Accelerating' ? '#10B981' : signal === 'Declining' ? '#EF4444' : '#F59E0B'
      const momentum = signal === 'Accelerating' ? 'Accelerating' : signal === 'Declining' ? 'Declining' : 'Stable'
      return { ...bs, signal, signalIcon, signalColor, momentum, idx: i + 1 }
    })
  }, [brandStats])

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            Share of Voice Trend Intelligence
            {loading && <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginLeft: 8 }}>Loading...</span>}
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Time-series SOV evolution — brand tracking, momentum analysis, market concentration
          </div>
        </div>
      </div>

      <SharedFilterBar hasActiveFilters={showAvg || chartType !== 'area'} onReset={() => { setShowAvg(false); setChartType('area') }}>
        <div className="toggle-group" style={{ display: 'flex', gap: 3, background: '#F1F5F9', padding: 3, borderRadius: 10 }}>
          {(['area', 'line'] as const).map(m => (
            <button key={m} onClick={() => setChartType(m)} className={`toggle-btn ${chartType === m ? 'active' : ''}`}>
              {m === 'area' ? 'Stacked Area' : 'Multi Line'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAvg(v => !v)} className={`toggle-btn ${showAvg ? 'active' : ''}`} style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: '1px solid #E2E8F0', cursor: 'pointer', background: showAvg ? '#1A73E8' : '#F8FAFC', color: showAvg ? '#FFF' : '#64748B', fontFamily: 'inherit' }}>
          7-Day Avg
        </button>
      </SharedFilterBar>

      {!hasScrapeData && (
        <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid #1A73E8' }}>
          <RefreshCw size={18} style={{ color: '#1A73E8', flexShrink: 0, animation: 'spin 8s linear infinite' }} />
          <div style={{ fontSize: 13, color: '#1E3A8A' }}>
            <strong>Snapshots pending.</strong> Run a scrape from <Link href="/control" style={{ fontWeight: 700, color: '#1A73E8', textDecoration: 'underline' }}>Campaign Control</Link> to log daily view snapshots.
          </div>
        </div>
      )}

      {/* KPI Row */}
      <motion.div variants={STAGGER} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <motion.div variants={ANIM}>
          <MetricCard label="Total Brands" value={brands.length} icon={Layers} color="#1A73E8" sub="Tracked in campaign" info="Number of distinct brands being monitored for share-of-voice." />
        </motion.div>
        <motion.div variants={ANIM}>
          <MetricCard label="Data Points" value={daysTracked} icon={Calendar} color="#8B5CF6" sub="Days with data" info="Total number of days with recorded SOV data points." />
        </motion.div>
        <motion.div variants={ANIM}>
          <MetricCard label="Market Concentration" value={hhi} icon={Target} color="#EC4899" sub={hhi > 2500 ? 'Highly concentrated' : hhi > 1500 ? 'Moderately concentrated' : 'Competitive'} info="Herfindahl-Hirschman Index. Higher = more concentrated (dominant brand). Range: 0–10000." />
        </motion.div>
        <motion.div variants={ANIM}>
          <MetricCard label="Leader SOV" value={`${leaderSov.toFixed(1)}%`} icon={Award} color="#059669" sub={brandStats[0]?.brand || '—'} info="Current share-of-voice percentage of the leading brand." />
        </motion.div>
        <motion.div variants={ANIM}>
          <MetricCard label="Days Tracked" value={daysTracked} icon={Activity} color="#F59E0B" sub={`Since ${data[0]?.date || '—'}`} info="Duration of SOV tracking in days." />
        </motion.div>
      </motion.div>

      {/* Brand Intelligence Grid */}
      {brandCards.length > 0 && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>Brand Intelligence</div>
          <motion.div variants={STAGGER} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {brandCards.map((bs) => (
              <motion.div
                key={bs.brand}
                variants={ANIM}
                style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}
                whileHover={{ borderColor: '#CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
              >
                <div style={{ position: 'absolute', top: -14, right: -10, fontSize: 64, fontWeight: 900, color: '#F1F5F9', zIndex: 0 }}>#{bs.idx}</div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: bs.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }} title={bs.brand}>{bs.brand}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: bs.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
                    {bs.current.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: 600 }}>current SOV</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
                    <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Peak</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{bs.peak.toFixed(1)}%</div>
                    </div>
                    <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Average</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>{bs.avg.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <bs.signalIcon size={12} style={{ color: bs.signalColor }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: bs.signalColor }}>{bs.delta >= 0 ? '+' : ''}{bs.delta.toFixed(1)}%</span>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis unit="%" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis unit="%" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
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
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <YAxis type="category" dataKey="brand" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'SOV']} contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#FFF' }} />
                <Bar dataKey="sov" radius={[0, 6, 6, 0]} barSize={20}>
                  {brands.map((b) => <Cell key={b} fill={brandColor(b)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>
              No snapshot data yet
            </div>
          )}
        </Card>

        <Card title="Brand Ranking Timeline" sub="How brand positions shift over time" info="Rank 1 = highest SOV on that date. Shows competitive movement across all tracked days." height={Math.max(220, brands.length * 32)}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, minWidth: 400 }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>Date</th>
                  {brands.map((b) => (
                    <th key={b} style={{ padding: '8px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: brandColor(b), whiteSpace: 'nowrap' }} title={b}>
                      {b.length > 10 ? b.slice(0, 10) + '…' : b}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brandRanks.slice(-10).map((row) => (
                  <tr key={row.date}>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>{row.date}</td>
                    {brands.map((b) => {
                      const rank = row[b] ?? '-'
                      const isTop = rank === 1
                      return (
                        <td key={b} style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 700,
                            fontFamily: "'JetBrains Mono',monospace",
                            background: isTop ? '#0F172A' : '#F1F5F9',
                            color: isTop ? '#FFF' : '#64748B',
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
              const signalColor = signal === 'Accelerating' ? '#10B981' : signal === 'Declining' ? '#EF4444' : '#F59E0B'
              const progressWidth = Math.min(100, Math.max(5, Math.abs(bs.delta) * 8 + 10))
              return (
                <div key={bs.brand} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#FAFBFC', border: '1px solid #F1F5FF' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: bs.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bs.brand}>{bs.brand}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressWidth}%`, background: signalColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: bs.color, minWidth: 48, textAlign: 'right' }}>{bs.current.toFixed(1)}%</span>
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
              const levelColor = v.volatility > 15 ? '#EF4444' : v.volatility > 8 ? '#F59E0B' : '#10B981'
              return (
                <div key={v.brand} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#FAFBFC', border: '1px solid #F1F5FF' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.brand}>{v.brand}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: levelColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: v.color, minWidth: 48, textAlign: 'right' }}>σ {v.volatility}</span>
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
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
          Filter Brands {search ? <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: 11 }}>· {filteredBrands.length} of {brands.length}</span> : <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: 11 }}>· {brands.length} total</span>}
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
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                  background: active ? `${color}10` : '#F8FAFC',
                  border: `1px solid ${active ? `${color}40` : '#E2E8F0'}`,
                  color: active ? color : '#64748B',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? color : '#CBD5E1' }} />
                {b}
                {active && (
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
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
