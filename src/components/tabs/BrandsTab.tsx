'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis, ReferenceLine, Label
} from 'recharts'
import { motion } from 'framer-motion'
import { Award, Star, Info, TrendingUp, Zap, BarChart3, ChevronDown, ChevronUp, Target, Eye, Hash, Filter } from 'lucide-react'
import { useDashboard } from '@/lib/dashboard-context'

const C = [
  '#4C78A8', '#54A24B', '#E45756', '#72B7B2', '#EECA3B',
  '#B279A2', '#FF9DA6', '#9D755D', '#BAB0AC', '#D67195',
  '#F58518', '#4C78A8', '#54A24B', '#E45756', '#72B7B2',
  '#79B8FF', '#A8D8B9', '#F4A582', '#CAB2D6', '#FFFFB3',
]

function brandColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return C[Math.abs(hash) % C.length]
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
  if (n >= 1e7) { const val = n / 1e7; return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' Cr' }
  if (n >= 1e5) { const val = n / 1e5; return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' Lakh' }
  if (n >= 1e3) { const val = n / 1e3; return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' K' }
  return n.toLocaleString('en-IN')
}

function pct(a: number, b: number) {
  if (!b) return 0
  return Math.round((a / b) * 1000) / 10
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function Bar100({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 4, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', minWidth: 40, flex: 1 }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 99, transition: 'width 0.3s' }} />
    </div>
  )
}

function SectionHeader({ icon: Icon, iconColor, title, subtitle, right }: { icon: any; iconColor: string; title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon size={16} style={{ color: iconColor }} />
          {title}
          <Info size={12} style={{ color: '#CBD5E1', cursor: 'help' }} />
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{subtitle}</div>
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

const TABLE_PAGE_SIZE = 10
const CHART_TOP = 10

export default function BrandsTab() {
  const { videos, distinctLanguages } = useDashboard()
  const [brandSOVLang, setBrandSOVLang] = useState<string>('all')
  const [brandSOVFormat, setBrandSOVFormat] = useState<'all' | 'long' | 'short'>('all')
  const [sortBy, setSortBy] = useState<'views' | 'freq'>('views')
  const [showAllBrands, setShowAllBrands] = useState(false)

  const videoLanguagesMap = useMemo(() => {
    const map = new Map<string, string[]>()
    videos.forEach((v: any) => {
      const langs = new Set<string>()
      ;(v.keywords_appeared || []).forEach((kwText: string) => {
        const kw = (v.keywords || []).find((k: any) => k.text === kwText)
        if (kw?.language) langs.add(kw.language)
      })
      map.set(v.id, Array.from(langs))
    })
    return map
  }, [videos])

  const analytics = useMemo(() => {
    let filteredBrandVideos = videos
    if (brandSOVFormat !== 'all') {
      filteredBrandVideos = brandSOVFormat === 'long'
        ? videos.filter((v: any) => !v.is_short)
        : videos.filter((v: any) => v.is_short)
    }
    if (brandSOVLang !== 'all') {
      filteredBrandVideos = filteredBrandVideos.filter((v: any) => {
        const langs = videoLanguagesMap.get(v.id) || []
        return langs.includes(brandSOVLang)
      })
    }

    const brandMap = new Map<string, { views: number; freq: Set<string>; videoCount: number }>()
    filteredBrandVideos.forEach((v: any) => {
      const kws = (v.keywords_appeared || []) as string[]
      ;(v.tags || v.brands || []).forEach((b: string) => {
        if (!brandMap.has(b)) brandMap.set(b, { views: 0, freq: new Set(), videoCount: 0 })
        const m = brandMap.get(b)!
        m.views += v.view_count || 0
        m.videoCount++
        kws.forEach((k: string) => m.freq.add(k))
      })
    })

    const totalViewsFiltered = Array.from(brandMap.values()).reduce((sum, item) => sum + item.views, 0) || 1

    const topViews = Array.from(brandMap.entries()).map(([name, item]) => ({
      name, value: item.views, freq: item.freq.size, pct: pct(item.views, totalViewsFiltered), videoCount: item.videoCount, color: brandColor(name)
    })).sort((a, b) => b.value - a.value)

    const totalFreq = topViews.reduce((s, b) => s + b.freq, 0) || 1
    const topFreq = [...topViews].map(b => ({ ...b, freqPct: pct(b.freq, totalFreq) })).sort((a, b) => b.freq - a.freq)

    const totalVideos = topViews.reduce((s, b) => s + b.videoCount, 0)
    const avgSOV = topViews.length > 0 ? 100 / topViews.length : 0
    const topBrandSOV = topViews[0]?.pct ?? 0
    const chartTop = CHART_TOP

    const efficiencies = topViews.filter(b => b.freq > 0).map(b => b.value / b.freq)
    const avgEfficiency = efficiencies.length > 0 ? efficiencies.reduce((s, e) => s + e, 0) / efficiencies.length : 0

    const viewSOVs = topViews.map(b => b.pct)
    const freqSOVs = topViews.map(b => {
      const f = topFreq.find(x => x.name === b.name)
      return f?.freqPct ?? 0
    })
    const medianViewSOV = median(viewSOVs)
    const medianFreqSOV = median(freqSOVs)

    const brandPositioning = topViews.slice(0, chartTop).map((b) => {
      const f = topFreq.find((x) => x.name === b.name)
      const freqSOV = f?.freqPct ?? 0
      const efficiency = b.freq > 0 ? b.value / b.freq : 0
      const effVsAvg = avgEfficiency > 0 ? ((efficiency - avgEfficiency) / avgEfficiency) * 100 : 0
      return {
        name: b.name, viewSOV: b.pct, freqSOV, z: b.videoCount * 50 + 300, color: b.color,
        aboveMedianView: b.pct >= medianViewSOV, aboveMedianFreq: freqSOV >= medianFreqSOV,
        efficiency: Math.round(efficiency), effVsAvg: Math.round(effVsAvg),
        rank: topViews.indexOf(b) + 1, totalBrands: topViews.length,
      }
    })

    const brandEfficiency = topViews.slice(0, chartTop).map((b) => {
      const efficiency = b.freq > 0 ? b.value / b.freq : 0
      const effVsAvg = avgEfficiency > 0 ? ((efficiency - avgEfficiency) / avgEfficiency) * 100 : 0
      return {
        name: b.name.length > 12 ? b.name.slice(0, 10) + '…' : b.name,
        efficiency: Math.round(efficiency), color: b.color, fullName: b.name,
        aboveAvg: efficiency >= avgEfficiency, effVsAvg: Math.round(effVsAvg),
        rank: 0, totalBrands: topViews.length,
      }
    }).sort((a, b) => b.efficiency - a.efficiency)
    brandEfficiency.forEach((b, i) => { b.rank = i + 1 })

    const mostEfficient = brandEfficiency[0]
    const widestReach = topFreq[0]
    const viewLeader = topViews[0]

    // Opportunity quadrants
    const starBrands = brandPositioning.filter(b => b.aboveMedianView && b.aboveMedianFreq)
    const volumeBrands = brandPositioning.filter(b => b.aboveMedianView && !b.aboveMedianFreq)
    const nicheBrands = brandPositioning.filter(b => !b.aboveMedianView && b.aboveMedianFreq)
    const weakBrands = brandPositioning.filter(b => !b.aboveMedianView && !b.aboveMedianFreq)

    return { topViews, topFreq, totalViewsFiltered, totalFreq, totalVideos, avgSOV, topBrandSOV, brandPositioning, brandEfficiency, avgEfficiency, medianViewSOV, medianFreqSOV, mostEfficient, widestReach, viewLeader, starBrands, volumeBrands, nicheBrands, weakBrands }
  }, [videos, brandSOVLang, brandSOVFormat, videoLanguagesMap])

  const { topViews, topFreq, totalVideos, avgSOV, topBrandSOV, brandPositioning, brandEfficiency, avgEfficiency, medianViewSOV, medianFreqSOV, mostEfficient, widestReach, viewLeader, starBrands, volumeBrands, nicheBrands, weakBrands } = analytics
  const sortedBrands = sortBy === 'views' ? topViews : topFreq
  const visibleBrands = showAllBrands ? sortedBrands : sortedBrands.slice(0, TABLE_PAGE_SIZE)
  const hasMore = sortedBrands.length > TABLE_PAGE_SIZE

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>Brand SOV Analytics</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            {sortedBrands.length} brands · {fmtIndian(topViews.reduce((s, b) => s + b.value, 0))} total views · {totalVideos} videos · {brandPositioning.length > 0 ? `top SOV: ${topBrandSOV.toFixed(1)}%` : 'no data'}
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {[
          { icon: Hash, label: 'TOTAL BRANDS', value: sortedBrands.length, color: '#6366F1', sub: `${brandPositioning.length} in top ${CHART_TOP}` },
          { icon: Eye, label: 'TOTAL VIEWS', value: fmtIndian(topViews.reduce((s, b) => s + b.value, 0)), color: '#3B82F6', sub: 'across all brands' },
          { icon: TrendingUp, label: 'MARKET LEADER', value: viewLeader?.name || '—', color: '#10B981', sub: viewLeader ? `${viewLeader.pct?.toFixed(1)}% share` : '' },
          { icon: Zap, label: 'MOST EFFICIENT', value: mostEfficient?.fullName || '—', color: '#F59E0B', sub: mostEfficient ? `${fmt(mostEfficient.efficiency)} views/kw` : '' },
          { icon: Target, label: 'WIDEST REACH', value: widestReach?.name || '—', color: '#8B5CF6', sub: widestReach ? `${widestReach.freq} keywords` : '' },
          { icon: BarChart3, label: 'AVG EFFICIENCY', value: fmt(avgEfficiency), color: '#EC4899', sub: 'views per keyword' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <kpi.icon size={14} style={{ color: kpi.color }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Filter size={14} style={{ color: '#94A3B8' }} />
        <select value={brandSOVFormat} onChange={(e) => setBrandSOVFormat(e.target.value as any)}
          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 600, color: '#475569', background: '#fff', cursor: 'pointer' }}>
          <option value="all">All formats</option>
          <option value="long">Long-form</option>
          <option value="short">Shorts</option>
        </select>
        <select value={brandSOVLang} onChange={(e) => setBrandSOVLang(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 600, color: '#475569', background: '#fff', cursor: 'pointer' }}>
          <option value="all">All languages</option>
          {distinctLanguages.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
        <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginLeft: 4 }}>{sortedBrands.length} brands</span>
        <div style={{ display: 'flex', gap: 0, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden', marginLeft: 'auto' }}>
          {(['views', 'freq'] as const).map(tab => (
            <button key={tab} onClick={() => setSortBy(tab)} style={{ padding: '5px 14px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: sortBy === tab ? '#fff' : 'transparent', color: sortBy === tab ? '#0F172A' : '#94A3B8', boxShadow: sortBy === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>{tab === 'views' ? 'By Views' : 'By KW Reach'}</button>
          ))}
        </div>
      </div>

      {/* Brand Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #F1F5F9', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 80px 80px 80px', gap: 0, padding: '10px 18px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
          {['#', 'Brand', 'SOV', 'Views', 'KW Reach', 'Videos'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', textAlign: h === 'Views' || h === 'KW Reach' || h === 'Videos' ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
        {visibleBrands.map((b: any, i: number) => (
          <motion.div
            key={b.name}
            initial={showAllBrands && i >= TABLE_PAGE_SIZE ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12, delay: showAllBrands && i >= TABLE_PAGE_SIZE ? (i - TABLE_PAGE_SIZE) * 0.015 : 0 }}
            style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 80px 80px 80px', gap: 0, padding: '10px 18px', borderBottom: '1px solid #F8FAFC', alignItems: 'center' }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>{i + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
            </div>
            <Bar100 value={b.pct} color={b.color} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{fmtIndian(b.value)}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }} title={`Ranks in ${b.freq} unique keywords across ${b.videoCount} videos`}>{b.freq}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textAlign: 'right' }}>{b.videoCount}</span>
          </motion.div>
        ))}
        {sortedBrands.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No brand data available</div>
        )}
        {hasMore && (
          <button
            onClick={() => setShowAllBrands(!showAllBrands)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '10px 0', border: 'none', borderTop: '1px solid #F1F5F9',
              background: '#FAFBFC', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              color: '#1A73E8', transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#F0F4FF' }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = '#FAFBFC' }}
          >
            {showAllBrands ? <>Show Less <ChevronUp size={14} /></> : <>Show All {sortedBrands.length} Brands <ChevronDown size={14} /></>}
          </button>
        )}
      </div>

      {/* Brand Opportunity Map — 2x2 quadrants */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #F1F5F9', padding: '20px 22px' }}>
        <SectionHeader
          icon={Target}
          iconColor="#6366F1"
          title="Brand Opportunity Map"
          subtitle={`2×2 matrix: View Share (X) vs Keyword Reach Share (Y)`}
          right={
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
              Median view SOV: <strong style={{ color: '#64748B' }}>{medianViewSOV.toFixed(1)}%</strong>
              <span style={{ margin: '0 6px', color: '#E2E8F0' }}>|</span>
              Median reach SOV: <strong style={{ color: '#64748B' }}>{medianFreqSOV.toFixed(1)}%</strong>
            </span>
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { title: 'Star Brands', icon: '⭐', color: '#10B981', desc: 'High view share & high keyword reach — dominant players', brands: starBrands, metric: (b: any) => `${b.viewSOV?.toFixed(1)}% SOV` },
            { title: 'Volume Brands', icon: '📈', color: '#3B82F6', desc: 'High view share but low reach — concentrated visibility', brands: volumeBrands, metric: (b: any) => `${b.viewSOV?.toFixed(1)}% SOV` },
            { title: 'Niche Brands', icon: '🎯', color: '#8B5CF6', desc: 'Low view share but wide reach — efficient niche players', brands: nicheBrands, metric: (b: any) => `${b.freqSOV?.toFixed(1)}% reach` },
            { title: 'Weak Brands', icon: '📉', color: '#EF4444', desc: 'Low view share & low reach — need strategy overhaul', brands: weakBrands, metric: (b: any) => `${b.viewSOV?.toFixed(1)}% SOV` },
          ].map((q) => (
            <div key={q.title} style={{ background: '#FAFBFC', borderRadius: 10, border: `1px solid #F1F5F9`, borderTop: `3px solid ${q.color}`, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12 }}>{q.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: q.color }}>{q.title}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: q.color, borderRadius: 6, padding: '1px 7px' }}>{q.brands.length}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8, lineHeight: 1.3 }}>{q.desc}</div>
              {q.brands.length === 0 ? (
                <div style={{ fontSize: 11, color: '#CBD5E1', fontStyle: 'italic' }}>No brands</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {q.brands.slice(0, 4).map((b: any) => (
                    <div key={b.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginLeft: 4 }}>{q.metric(b)}</span>
                    </div>
                  ))}
                  {q.brands.length > 4 && (
                    <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>+{q.brands.length - 4} more</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Positioning Map & Efficiency */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Positioning Map */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #F1F5F9', padding: '20px 22px' }}>
          <SectionHeader
            icon={BarChart3}
            iconColor="#6366F1"
            title="Brand Positioning Map"
            subtitle="View SOV (X) vs KW Reach SOV (Y) — bubble = video count"
          />
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, left: 8, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" dataKey="viewSOV" name="View SOV %" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  label={{ value: 'View SOV %', position: 'insideBottom', offset: -16, fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                <YAxis type="number" dataKey="freqSOV" name="KW Reach %" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  label={{ value: 'KW Reach %', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                <ZAxis type="number" dataKey="z" range={[100, 500]} />
                <ReferenceLine x={medianViewSOV} stroke="#CBD5E1" strokeDasharray="5 3" strokeWidth={1} />
                <ReferenceLine y={medianFreqSOV} stroke="#CBD5E1" strokeDasharray="5 3" strokeWidth={1} />
                <RechartsTooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    if (!d) return null
                    return (
                      <div style={{ background: '#0F172A', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', minWidth: 180 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                          {d.name}
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#334155', color: '#94A3B8' }}>#{d.rank}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>View SOV: <strong style={{ color: '#38BDF8' }}>{d.viewSOV?.toFixed(1)}%</strong> · KW Reach: <strong style={{ color: '#34D399' }}>{d.freqSOV?.toFixed(1)}%</strong></div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Efficiency: <strong style={{ color: '#FBBF24' }}>{fmt(d.efficiency)}</strong> views/kw</div>
                        <div style={{ marginTop: 4, fontSize: 10, color: d.aboveMedianView && d.aboveMedianFreq ? '#34D399' : '#94A3B8' }}>
                          {d.aboveMedianView ? '✓' : '✗'} above-median SOV · {d.aboveMedianFreq ? '✓' : '✗'} above-median reach
                        </div>
                      </div>
                    )
                  }}
                />
                {brandPositioning.map((d: any, i: number) => <Scatter key={i} name={d.name} data={[d]} fill={d.color} fillOpacity={0.85} />)}
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: 28, right: 32, fontSize: 8, fontWeight: 700, color: '#10B981', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px', pointerEvents: 'none' }}>Market Leaders</div>
            <div style={{ position: 'absolute', top: 28, left: 48, fontSize: 8, fontWeight: 700, color: '#8B5CF6', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px', pointerEvents: 'none' }}>Niche Players</div>
            <div style={{ position: 'absolute', bottom: 42, right: 32, fontSize: 8, fontWeight: 700, color: '#F59E0B', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px', pointerEvents: 'none' }}>Growth Challengers</div>
            <div style={{ position: 'absolute', bottom: 42, left: 48, fontSize: 8, fontWeight: 700, color: '#EF4444', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px', pointerEvents: 'none' }}>Emerging</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {brandPositioning.map((d: any) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color }} />
                <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Efficiency Score */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #F1F5F9', padding: '20px 22px' }}>
          <SectionHeader
            icon={TrendingUp}
            iconColor="#10B981"
            title="Brand Efficiency Score"
            subtitle={`Views per keyword reached — avg: ${fmt(avgEfficiency)}`}
            right={
              <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>
                dashed line = market avg
              </span>
            }
          />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={brandEfficiency} layout="vertical" margin={{ top: 4, right: 70, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v: any) => fmt(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} width={88} />
              <RechartsTooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  if (!d) return null
                  return (
                    <div style={{ background: '#0F172A', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                        {d.fullName}
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#334155', color: '#94A3B8' }}>#{d.rank}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>Views/keyword: <strong style={{ color: d.aboveAvg ? '#34D399' : '#F87171' }}>{fmt(d.efficiency)}</strong></div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>vs avg: <strong style={{ color: d.aboveAvg ? '#34D399' : '#F87171' }}>{d.effVsAvg > 0 ? '+' : ''}{d.effVsAvg}%</strong></div>
                      <div style={{ marginTop: 4, fontSize: 10, color: d.aboveAvg ? '#34D399' : '#F87171' }}>
                        {d.aboveAvg ? '↑ Outperforming' : '↓ Below average'}
                      </div>
                    </div>
                  )
                }}
              />
              <ReferenceLine x={avgEfficiency} stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1.5}>
                <Label value={`Avg: ${fmt(avgEfficiency)}`} position="top" fontSize={10} fill="#94A3B8" fontWeight={600} />
              </ReferenceLine>
              <Bar dataKey="efficiency" radius={[0, 6, 6, 0]} label={{ position: 'right', formatter: (v: any) => fmt(v), fontSize: 11, fill: '#64748B', fontWeight: 700 }}>
                {brandEfficiency.map((d: any, i: number) => (
                  <Cell key={i} fill={d.aboveAvg ? d.color : '#CBD5E1'} fillOpacity={d.aboveAvg ? 1 : 0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}
