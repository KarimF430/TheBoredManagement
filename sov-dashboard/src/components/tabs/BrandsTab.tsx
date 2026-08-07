'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis, ReferenceLine, Label, PieChart, Pie
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, Star, Info, TrendingUp, Zap, BarChart3, ChevronDown, ChevronRight, ChevronUp,
  Target, Eye, Hash, Search, ExternalLink, Loader2, Layers
} from 'lucide-react'
import { useDashboard } from '@/lib/dashboard-context'
import { useFilterStore } from '@/lib/filter-store'
import { useCampaignStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { brandColor } from '@/lib/brand-colors'
import Link from 'next/link'

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

function Rank({ n }: { n: number }) {
  const c = n <= 3 ? '#059669' : n <= 5 ? '#1A73E8' : n <= 10 ? '#7C3AED' : '#D97706'
  const bg = n <= 3 ? 'rgba(5,150,105,0.08)' : n <= 5 ? 'rgba(26,115,232,0.08)' : n <= 10 ? 'rgba(124,58,237,0.08)' : 'rgba(217,119,6,0.08)'
  return <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: bg, color: c, whiteSpace: 'nowrap' }}>#{n}</span>
}

function Bar100({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 5, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', minWidth: 50, flex: 1 }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
    </div>
  )
}

const TABLE_PAGE_SIZE = 10
const CHART_TOP = 10

export default function BrandsTab() {
  const { activeCampaignId, fetchCampaigns } = useCampaignStore()
  const { format, ownership } = useFilterStore()
  const { distinctLanguages } = useDashboard()
  const [brandSOVLang, setBrandSOVLang] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'views' | 'freq'>('views')
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null)
  const [brandDetailData, setBrandDetailData] = useState<any>(null)
  const [brandDetailLoading, setBrandDetailLoading] = useState(false)

  const fetchBrandDetail = useCallback(async (brandName: string) => {
    if (expandedBrand === brandName) {
      setExpandedBrand(null)
      setBrandDetailData(null)
      return
    }
    setExpandedBrand(brandName)
    setBrandDetailLoading(true)
    setBrandDetailData(null)
    try {
      const params = new URLSearchParams({ campaign_id: activeCampaignId! })
      if (format !== 'all') params.set('format', format)
      if (ownership !== 'all') params.set('is_ours', ownership === 'ours' ? 'true' : 'false')
      const res = await fetch(`/api/brands/${encodeURIComponent(brandName)}?${params}`)
      const d = await res.json()
      if (!d.error) setBrandDetailData(d)
    } catch {}
    setBrandDetailLoading(false)
  }, [expandedBrand, activeCampaignId, format, ownership])

  const brandsQuery = useQuery({
    queryKey: ['brands-tab', activeCampaignId, format, ownership, brandSOVLang],
    queryFn: async () => {
      const params = new URLSearchParams({ campaign_id: activeCampaignId! })
      if (format !== 'all') params.set('format', format)
      if (ownership !== 'all') params.set('is_ours', ownership === 'ours' ? 'true' : 'false')
      if (brandSOVLang !== 'all') params.set('language', brandSOVLang)
      const res = await fetch(`/api/brands?${params}`)
      return res.json()
    },
    enabled: !!activeCampaignId,
  })

  const brandsData: any[] = brandsQuery.data?.data ?? []
  const loading = brandsQuery.isLoading

  const analytics = useMemo(() => {
    // Language filtering now happens server-side (see brandsQuery above) so
    // sov_percent/total_views are recomputed for the selected language, not
    // just a client-side list-shrink over whole-campaign totals.
    const filtered = brandsData

    const topViews = filtered.map((b: any) => ({
      name: b.name,
      value: b.total_views || 0,
      freq: b.total_frequency || b.video_count || 0,
      pct: b.sov_percent || 0,
      freqPct: b.freq_sov_percent || 0,
      videoCount: b.video_count || 0,
      color: brandColor(b.name),
    })).sort((a: any, b: any) => b.value - a.value)

    const totalViews = topViews.reduce((s: number, b: any) => s + b.value, 0) || 1
    const totalFreq = topViews.reduce((s: number, b: any) => s + b.freq, 0) || 1

    const chartTop = CHART_TOP
    const maxSOV = topViews.length > 0 ? topViews[0].pct : 0
    const efficiencies = topViews.filter((b: any) => b.freq > 0).map((b: any) => b.value / b.freq)
    const avgEfficiency = efficiencies.length > 0 ? efficiencies.reduce((s: number, e: number) => s + e, 0) / efficiencies.length : 0

    const viewSOVs = topViews.map((b: any) => b.pct)
    const freqSOVs = topViews.map((b: any) => b.freqPct)
    const medianViewSOV = median(viewSOVs)
    const medianFreqSOV = median(freqSOVs)

    const brandPositioning = topViews.slice(0, chartTop).map((b: any) => {
      const efficiency = b.freq > 0 ? b.value / b.freq : 0
      const effVsAvg = avgEfficiency > 0 ? ((efficiency - avgEfficiency) / avgEfficiency) * 100 : 0
      return {
        name: b.name, viewSOV: b.pct, freqSOV: b.freqPct, z: b.videoCount * 50 + 300, color: b.color,
        aboveMedianView: b.pct >= medianViewSOV, aboveMedianFreq: b.freqPct >= medianFreqSOV,
        efficiency: Math.round(efficiency), effVsAvg: Math.round(effVsAvg),
        rank: topViews.indexOf(b) + 1, totalBrands: topViews.length,
      }
    })

    const brandEfficiency = topViews.slice(0, chartTop).map((b: any) => {
      const efficiency = b.freq > 0 ? b.value / b.freq : 0
      const effVsAvg = avgEfficiency > 0 ? ((efficiency - avgEfficiency) / avgEfficiency) * 100 : 0
      return {
        name: b.name.length > 12 ? b.name.slice(0, 10) + '…' : b.name,
        efficiency: Math.round(efficiency), color: b.color, fullName: b.name,
        aboveAvg: efficiency >= avgEfficiency, effVsAvg: Math.round(effVsAvg),
        rank: 0, totalBrands: topViews.length,
      }
    }).sort((a: any, b: any) => b.efficiency - a.efficiency)
    brandEfficiency.forEach((b: any, i: number) => { b.rank = i + 1 })

    const mostEfficient = brandEfficiency[0]
    const widestReach = [...topViews].sort((a: any, b: any) => b.freq - a.freq)[0]
    const viewLeader = topViews[0]

    const starBrands = brandPositioning.filter(b => b.aboveMedianView && b.aboveMedianFreq)
    const volumeBrands = brandPositioning.filter(b => b.aboveMedianView && !b.aboveMedianFreq)
    const nicheBrands = brandPositioning.filter(b => !b.aboveMedianView && b.aboveMedianFreq)
    const weakBrands = brandPositioning.filter(b => !b.aboveMedianView && !b.aboveMedianFreq)

    return { topViews, totalViews, totalFreq, maxSOV, brandPositioning, brandEfficiency, avgEfficiency, medianViewSOV, medianFreqSOV, mostEfficient, widestReach, viewLeader, starBrands, volumeBrands, nicheBrands, weakBrands }
  }, [brandsData, brandSOVLang])

  const { topViews, totalViews, maxSOV, brandPositioning, brandEfficiency, avgEfficiency, medianViewSOV, medianFreqSOV, mostEfficient, widestReach, viewLeader, starBrands, volumeBrands, nicheBrands, weakBrands } = analytics
  const sortedBrands = sortBy === 'views' ? topViews : [...topViews].sort((a: any, b: any) => b.freq - a.freq)
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
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>Brand SOV Analytics</h1>
          <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
            {sortedBrands.length} brands · {fmtIndian(totalViews)} total views · {brandPositioning.length > 0 ? `top SOV: ${(viewLeader?.pct ?? 0).toFixed(1)}%` : 'no data'}
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {[
          { icon: Hash, label: 'TOTAL BRANDS', value: sortedBrands.length, color: '#6366F1', sub: `${brandPositioning.length} in top ${CHART_TOP}` },
          { icon: Eye, label: 'TOTAL VIEWS', value: fmtIndian(totalViews), color: '#3B82F6', sub: 'across all brands' },
          { icon: TrendingUp, label: 'MARKET LEADER', value: viewLeader?.name || '—', color: '#10B981', sub: viewLeader ? `${viewLeader.pct?.toFixed(1)}% share` : '' },
          { icon: Zap, label: 'MOST EFFICIENT', value: mostEfficient?.fullName || '—', color: '#F59E0B', sub: mostEfficient ? `${fmt(mostEfficient.efficiency)} views/kw` : '' },
          { icon: Target, label: 'WIDEST REACH', value: widestReach?.name || '—', color: '#8B5CF6', sub: widestReach ? `${widestReach.freq} videos` : '' },
          { icon: BarChart3, label: 'AVG EFFICIENCY', value: fmt(avgEfficiency), color: '#EC4899', sub: 'views per keyword' },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div className="kpi-icon-wrap" style={{ background: `${kpi.color}10`, width: 26, height: 26 }}>
                <kpi.icon size={13} style={{ color: kpi.color }} />
              </div>
              <span className="kpi-label">{kpi.label}</span>
            </div>
            <div className="kpi-value" style={{ fontSize: 18 }}>{kpi.value}</div>
            <div className="kpi-sub">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Page-specific Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="input" value={brandSOVLang} onChange={(e) => setBrandSOVLang(e.target.value)} style={{ cursor: 'pointer', padding: '5px 10px', minWidth: 130 }}>
          <option value="all">All languages</option>
          {distinctLanguages.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
        <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginLeft: 4 }}>{sortedBrands.length} brands</span>
        <div style={{ display: 'flex', gap: 0, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden', marginLeft: 'auto' }}>
          {(['views', 'freq'] as const).map(tab => (
            <button key={tab} onClick={() => setSortBy(tab)} className={`toggle-btn ${sortBy === tab ? 'on' : ''}`}>{tab === 'views' ? 'By Views' : 'By KW Reach'}</button>
          ))}
        </div>
      </div>

      {/* Brand Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 120px 80px 80px 80px 40px', gap: 0, padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
          {['#', 'Brand', 'SOV', 'Views', 'KW Reach', 'Videos', ''].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', textAlign: h === 'Views' || h === 'KW Reach' || h === 'Videos' ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#94A3B8', gap: 8 }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading brand data...
          </div>
        ) : (
          <>
            {visibleBrands.map((b: any, i: number) => {
              const isExpanded = expandedBrand === b.name
              return (
                <React.Fragment key={b.name}>
                  <motion.div
                    initial={showAllBrands && i >= TABLE_PAGE_SIZE ? { opacity: 0, y: 6 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12, delay: showAllBrands && i >= TABLE_PAGE_SIZE ? (i - TABLE_PAGE_SIZE) * 0.015 : 0 }}
                    onClick={() => fetchBrandDetail(b.name)}
                    className="row-hover"
                    style={{
                      display: 'grid', gridTemplateColumns: '36px 1fr 120px 80px 80px 80px 40px', gap: 0, padding: '10px 16px',
                      borderBottom: '1px solid #F8FAFC', alignItems: 'center', cursor: 'pointer',
                      background: isExpanded ? '#F0F7FF' : 'transparent', transition: 'background 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 2 }}>
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {i + 1}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                    </div>
                    <Bar100 value={maxSOV > 0 ? (b.pct / maxSOV) * 100 : 0} color={b.color} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{fmtIndian(b.value)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{b.freq}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textAlign: 'right' }}>{b.videoCount}</span>
                    <span style={{ textAlign: 'center' }}>{isExpanded ? <ChevronDown size={12} color="#94A3B8" /> : <ChevronRight size={12} color="#94A3B8" />}</span>
                  </motion.div>

                  {/* Expanded Brand Detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '16px 20px' }}>
                          {brandDetailLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: '#94A3B8', gap: 8 }}>
                              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading brand details...
                            </div>
                          ) : brandDetailData ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {/* KPI Strip */}
                              <div style={{ display: 'flex', gap: 10 }}>
                                {[
                                  { label: 'Total Videos', value: brandDetailData.metrics?.total_videos || 0, color: '#1A73E8' },
                                  { label: 'Total Views', value: fmtIndian(brandDetailData.metrics?.total_views), color: '#3B82F6' },
                                  { label: '7d Growth', value: `${brandDetailData.metrics?.growth_7d > 0 ? '+' : ''}${brandDetailData.metrics?.growth_7d || 0}%`, color: brandDetailData.metrics?.growth_7d > 0 ? '#10B981' : '#EF4444' },
                                  { label: '30d Growth', value: `${brandDetailData.metrics?.growth_30d > 0 ? '+' : ''}${brandDetailData.metrics?.growth_30d || 0}%`, color: brandDetailData.metrics?.growth_30d > 0 ? '#10B981' : '#EF4444' },
                                  { label: 'Top Keywords', value: brandDetailData.topKeywords?.length || 0, color: '#8B5CF6' },
                                ].map((kpi, j) => (
                                  <div key={j} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: '#FFF', border: '1px solid #E2E8F0' }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{kpi.label}</div>
                                    <div className="mono" style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', lineHeight: 1.2, marginTop: 2 }}>{kpi.value}</div>
                                  </div>
                                ))}
                              </div>

                              {/* Two-column: Keywords + Videos */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 14 }}>
                                {/* Top Keywords */}
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Top Keywords</span>
                                    <span className="badge badge-blue" style={{ fontSize: 9 }}>{brandDetailData.topKeywords?.length || 0}</span>
                                  </div>
                                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                    {(brandDetailData.topKeywords || []).slice(0, 8).map((kw: any, ki: number) => (
                                      <div key={ki} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: ki < Math.min((brandDetailData.topKeywords?.length || 0), 8) - 1 ? '1px solid var(--border-1)' : 'none' }}>
                                        <Search size={10} style={{ color: '#94A3B8', flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw.keyword}</span>
                                        <Rank n={kw.best_rank} />
                                        <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{kw.count}x</span>
                                      </div>
                                    ))}
                                    {(!brandDetailData.topKeywords || brandDetailData.topKeywords.length === 0) && (
                                      <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No keyword data</div>
                                    )}
                                  </div>
                                </div>

                                {/* Top Videos */}
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Top Videos</span>
                                    <span className="badge badge-green" style={{ fontSize: 9 }}>{brandDetailData.topVideos?.length || 0}</span>
                                  </div>
                                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                    {(brandDetailData.topVideos || []).slice(0, 6).map((v: any, vi: number) => (
                                      <a key={v.id || vi} href={`/video/${v.youtube_id}`} className="row-hover" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 14px', textDecoration: 'none', borderBottom: vi < Math.min((brandDetailData.topVideos?.length || 0), 6) - 1 ? '1px solid var(--border-1)' : 'none' }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#F1F5F9' }}>
                                          <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                                          <div style={{ display: 'flex', gap: 6, fontSize: 10, color: '#94A3B8', marginTop: 2, alignItems: 'center' }}>
                                            <span className="mono" style={{ fontWeight: 700, color: '#475569' }}>{fmtIndian(v.view_count)}</span>
                                            <span>{v.channel_name}</span>
                                          </div>
                                        </div>
                                        <ExternalLink size={10} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                                      </a>
                                    ))}
                                    {(!brandDetailData.topVideos || brandDetailData.topVideos.length === 0) && (
                                      <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No video data</div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Language Breakdown */}
                              {brandDetailData.langBreakdown && brandDetailData.langBreakdown.length > 0 && (
                                <div className="card" style={{ padding: '10px 14px' }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Language Distribution</div>
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {brandDetailData.langBreakdown.map((l: any, li: number) => (
                                      <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: '#F1F5F9' }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{(l.language || 'unknown').toUpperCase()}</span>
                                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: '#1A73E8' }}>{l.video_count}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>No detail data available</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              )
            })}

            {sortedBrands.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No brand data available</div>
            )}

            {hasMore && (
              <button
                onClick={() => setShowAllBrands(!showAllBrands)}
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', borderTop: '1px solid #F1F5F9', borderRadius: 0 }}
              >
                {showAllBrands ? <>Show Less <ChevronUp size={14} /></> : <>Show All {sortedBrands.length} Brands <ChevronDown size={14} /></>}
              </button>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BRAND OPPORTUNITY MAP — 2×2 Quadrant Matrix
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={16} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>Brand Opportunity Map</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>View Share vs Keyword Reach — strategic quadrant classification</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1' }} />
              <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>View SOV Median: <span style={{ color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{medianViewSOV.toFixed(1)}%</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6' }} />
              <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Reach Median: <span style={{ color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{medianFreqSOV.toFixed(1)}%</span></span>
            </div>
          </div>
        </div>

        {/* Quadrant grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {[
            {
              title: 'Star Brands', emoji: '⭐', color: '#059669', lightBg: '#ECFDF5', lightBorder: '#D1FAE5',
              desc: 'High view share & high keyword reach',
              sub: 'Dominant market players with strong visibility across search and views',
              brands: starBrands, metric: (b: any) => `${b.viewSOV?.toFixed(1)}%`, metricLabel: 'SOV',
              iconBg: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            },
            {
              title: 'Volume Brands', emoji: '📊', color: '#2563EB', lightBg: '#EFF6FF', lightBorder: '#DBEAFE',
              desc: 'High view share but low reach',
              sub: 'Concentrated visibility — strong views but limited keyword coverage',
              brands: volumeBrands, metric: (b: any) => `${b.viewSOV?.toFixed(1)}%`, metricLabel: 'SOV',
              iconBg: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
            },
            {
              title: 'Niche Brands', emoji: '🎯', color: '#7C3AED', lightBg: '#F5F3FF', lightBorder: '#EDE9FE',
              desc: 'Low view share but wide reach',
              sub: 'Efficient niche players — broad keyword coverage with fewer views',
              brands: nicheBrands, metric: (b: any) => `${b.freqSOV?.toFixed(1)}%`, metricLabel: 'Reach',
              iconBg: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
            },
            {
              title: 'Weak Brands', emoji: '⚠️', color: '#DC2626', lightBg: '#FEF2F2', lightBorder: '#FECACA',
              desc: 'Low view share & low reach',
              sub: 'Need strategy overhaul — limited visibility across all metrics',
              brands: weakBrands, metric: (b: any) => `${b.viewSOV?.toFixed(1)}%`, metricLabel: 'SOV',
              iconBg: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
            },
          ].map((q, qi) => (
            <div key={q.title} style={{ padding: '18px 20px', borderRight: qi < 3 ? '1px solid #F1F5F9' : 'none', display: 'flex', flexDirection: 'column' }}>
              {/* Quadrant header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: q.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, boxShadow: `0 2px 6px ${q.color}25` }}>
                    {q.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: q.color, letterSpacing: '-0.1px' }}>{q.title}</div>
                    <div style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 1, lineHeight: 1.2 }}>{q.desc}</div>
                  </div>
                </div>
                <div style={{ minWidth: 24, height: 24, borderRadius: 6, background: q.color, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
                  {q.brands.length}
                </div>
              </div>

              {/* Brand list */}
              <div style={{ flex: 1 }}>
                {q.brands.length === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, marginBottom: 4, opacity: 0.3 }}>—</div>
                    <div style={{ fontSize: 10.5, color: '#CBD5E1', fontWeight: 500 }}>No brands in this quadrant</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {q.brands.slice(0, 5).map((b: any, bi: number) => (
                      <div key={b.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 6, background: bi === 0 ? q.lightBg : 'transparent', border: bi === 0 ? `1px solid ${q.lightBorder}` : '1px solid transparent', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 5, background: `${b.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, flexShrink: 0, marginLeft: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: q.color, fontFamily: "'JetBrains Mono', monospace" }}>{q.metric(b)}</span>
                          <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>{q.metricLabel}</span>
                        </div>
                      </div>
                    ))}
                    {q.brands.length > 5 && (
                      <div style={{ padding: '4px 8px', fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
                        +{q.brands.length - 5} more brand{q.brands.length - 5 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BRAND POSITIONING MAP & EFFICIENCY SCORE — Side by Side
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* ── Positioning Map ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={16} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>Brand Positioning Map</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>View SOV vs Keyword Reach — bubble size = video count</div>
              </div>
            </div>
          </div>

          {/* Chart area */}
          <div style={{ padding: '16px 22px 12px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 24, right: 24, left: 12, bottom: 32 }}>
                <defs>
                  <filter id="bubbleShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" dataKey="viewSOV" name="View SOV %" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false}
                  label={{ value: 'View SOV %', position: 'insideBottom', offset: -20, fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                <YAxis type="number" dataKey="freqSOV" name="KW Reach %" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false}
                  label={{ value: 'KW Reach %', angle: -90, position: 'insideLeft', offset: 4, fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                <ZAxis type="number" dataKey="z" range={[120, 600]} />
                <ReferenceLine x={medianViewSOV} stroke="#CBD5E1" strokeDasharray="6 4" strokeWidth={1} />
                <ReferenceLine y={medianFreqSOV} stroke="#CBD5E1" strokeDasharray="6 4" strokeWidth={1} />
                <RechartsTooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#CBD5E1' }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    if (!d) return null
                    return (
                      <div style={{ background: '#0F172A', borderRadius: 12, padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 200, border: '1px solid #1E293B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #1E293B' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, boxShadow: `0 0 8px ${d.color}60` }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>{d.name}</span>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: '#334155', color: '#94A3B8', fontWeight: 600, marginLeft: 'auto' }}>#{d.rank}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                          <div>
                            <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>View SOV</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', fontFamily: "'JetBrains Mono', monospace" }}>{d.viewSOV?.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>KW Reach</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#A78BFA', fontFamily: "'JetBrains Mono', monospace" }}>{d.freqSOV?.toFixed(1)}%</div>
                          </div>
                          <div style={{ gridColumn: '1 / -1', marginTop: 2, paddingTop: 6, borderTop: '1px solid #1E293B' }}>
                            <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Efficiency</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#FBBF24', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(d.efficiency)} <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>views/kw</span></div>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                {brandPositioning.map((d: any, i: number) => (
                  <Scatter key={i} name={d.name} data={[d]} fill={d.color} fillOpacity={0.8} stroke={d.color} strokeWidth={2} strokeOpacity={0.3}>
                  </Scatter>
                ))}
              </ScatterChart>
            </ResponsiveContainer>

            {/* Quadrant labels */}
            <div style={{ position: 'absolute', top: 36, right: 44, display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'none' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#10B981', opacity: 0.6 }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: '#10B981', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Market Leaders</span>
            </div>
            <div style={{ position: 'absolute', top: 36, left: 56, display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'none' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#8B5CF6', opacity: 0.6 }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: '#8B5CF6', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Niche Players</span>
            </div>
            <div style={{ position: 'absolute', bottom: 52, right: 44, display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'none' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#F59E0B', opacity: 0.6 }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: '#F59E0B', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Growth Challengers</span>
            </div>
            <div style={{ position: 'absolute', bottom: 52, left: 56, display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'none' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#EF4444', opacity: 0.6 }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: '#EF4444', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Emerging</span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 22px 16px', borderTop: '1px solid #F8FAFC' }}>
            {brandPositioning.map((d: any) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color }} />
                <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Efficiency Score ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #059669 0%, #34D399 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={16} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>Brand Efficiency Score</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>Views per keyword reached — higher = more efficient content</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, background: '#F0FDF4', border: '1px solid #DCFCE7' }}>
              <div style={{ width: 16, height: 2, borderTop: '2px dashed #059669' }} />
              <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>Avg: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(avgEfficiency)}</span></span>
            </div>
          </div>

          {/* Chart area */}
          <div style={{ padding: '16px 22px 8px' }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={brandEfficiency} layout="vertical" margin={{ top: 8, right: 80, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={(v: any) => fmt(v)} />
                <YAxis type="category" dataKey="name" tick={({ x, y, payload }: any) => {
                  const d = brandEfficiency.find((b: any) => b.name === payload.value)
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <circle cx={-8} cy={0} r={4} fill={d?.color || '#CBD5E1'} />
                      <text x={-18} y={0} dy={4} textAnchor="end" fontSize={11} fill="#0F172A" fontWeight={600}>{payload.value}</text>
                    </g>
                  )
                }} axisLine={false} tickLine={false} width={90} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    if (!d) return null
                    return (
                      <div style={{ background: '#0F172A', borderRadius: 12, padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 200, border: '1px solid #1E293B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #1E293B' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, boxShadow: `0 0 8px ${d.color}60` }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>{d.fullName}</span>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: '#334155', color: '#94A3B8', fontWeight: 600, marginLeft: 'auto' }}>#{d.rank}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                          <div>
                            <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Efficiency</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: d.aboveAvg ? '#34D399' : '#F87171', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(d.efficiency)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>vs Market Avg</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: d.aboveAvg ? '#34D399' : '#F87171', fontFamily: "'JetBrains Mono', monospace" }}>{d.effVsAvg > 0 ? '+' : ''}{d.effVsAvg}%</div>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <ReferenceLine x={avgEfficiency} stroke="#94A3B8" strokeDasharray="6 4" strokeWidth={1.5}>
                  <Label value={`Avg: ${fmt(avgEfficiency)}`} position="top" fontSize={10} fill="#94A3B8" fontWeight={600} />
                </ReferenceLine>
                <Bar dataKey="efficiency" radius={[0, 8, 8, 0]} barSize={20} label={{ position: 'right', formatter: (v: any) => fmt(v), fontSize: 11, fill: '#64748B', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  {brandEfficiency.map((d: any, i: number) => (
                    <Cell key={i} fill={d.aboveAvg ? d.color : '#E2E8F0'} fillOpacity={d.aboveAvg ? 0.9 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
