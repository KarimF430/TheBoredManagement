'use client'

import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Eye, BarChart2, RefreshCw, ChevronUp, ChevronDown, Loader2, Play,
  ArrowUpRight, Zap, Video, Search, Award, Layers, Users, AlertCircle,
  Hash, Target, Star, Filter, Info, X, Download, MapPin, Tv, TrendingUp, Activity,
  Bell, Settings
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useCampaignStore } from '@/lib/store'
import { useFilterStore } from '@/lib/filter-store'
import { DashboardCtx } from '@/lib/dashboard-context'
import SharedFilterBar from '@/components/SharedFilterBar'
import TutorialTrigger from '@/components/tutorial/TutorialTrigger'

const VideosTab = lazy(() => import('@/components/tabs/VideosTab'))
const KeywordsTab = lazy(() => import('@/components/tabs/KeywordsTab'))
const TrendsTab = lazy(() => import('@/components/tabs/TrendsTab'))
const GrowthTab = lazy(() => import('@/components/tabs/GrowthTab'))
const AlertsTab = lazy(() => import('@/components/tabs/AlertsTab'))
const SettingsTab = lazy(() => import('@/components/tabs/SettingsTab'))
const BrandsTab = lazy(() => import('@/components/tabs/BrandsTab'))
const CreatorsTab = lazy(() => import('@/components/tabs/CreatorsTab'))
const RankingsTab = lazy(() => import('@/components/tabs/RankingsTab'))
import OverviewTab from '@/components/tabs/OverviewTab'

const C = [
  '#4C78A8', '#54A24B', '#E45756', '#2F7D7A', '#B45309',
  '#7E4D74', '#C94A5E', '#9D755D', '#6B645C', '#A8476F',
  '#CC5800', '#4C78A8', '#54A24B', '#E45756', '#2F7D7A',
  '#1D6BD6', '#3E8E5F', '#C4643A', '#8A63A8', '#A16207',
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

function pct(a: number, b: number) {
  if (!b) return 0
  return Math.round((a / b) * 1000) / 10
}

function fmtIndian(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  if (n >= 1e7) { const val = n / 1e7; return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' Cr' }
  if (n >= 1e5) { const val = n / 1e5; return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' Lakh' }
  if (n >= 1e3) { const val = n / 1e3; return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' K' }
  return n.toLocaleString('en-IN')
}

function Delta({ v, suffix = '%' }: { v: number; suffix?: string }) {
  const up = v >= 0
  return (
    <span className={up ? 'delta-pos' : 'delta-neg'}>
      {up ? <ChevronUp size={9} /> : <ChevronDown size={9} />}{Math.abs(v).toFixed(1)}{suffix}
    </span>
  )
}

function Rank({ n }: { n: number }) {
  const c = n <= 3 ? 'var(--success-text)' : n <= 5 ? 'var(--accent)' : n <= 10 ? 'var(--info)' : 'var(--warning-text)'
  const bg = n <= 3 ? 'var(--success-dim)' : n <= 5 ? 'var(--accent-dim)' : n <= 10 ? 'var(--info-dim)' : 'var(--warning-dim)'
  return <span className="num" style={{ fontSize: 'var(--fs-label)', fontWeight: 800, padding: '2px 6px', borderRadius: 'var(--radius-xs)', background: bg, color: c }}>#{n}</span>
}

function Bar100({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 4, background: 'var(--border-light)', borderRadius: 'var(--radius-full)', overflow: 'hidden', minWidth: 60 }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 'var(--radius-full)' }} />
    </div>
  )
}

function CsvButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="btn btn-sm" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
      <Download size={12} /> {label}
    </button>
  )
}

function formatTimestamp(input: any): string {
  if (!input) return 'Not updated'
  let date: Date
  if (typeof input === 'object' && input !== null) {
    const val = input.updated_at || input.value
    if (!val) return 'Not updated'
    date = new Date(val)
  } else {
    date = new Date(input)
  }
  if (isNaN(date.getTime())) return 'Not updated'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  let relative = 'Just now'
  if (diffMins >= 1 && diffMins < 60) relative = `${diffMins}m ago`
  else if (diffMins >= 60 && diffMins < 1440) relative = `${Math.floor(diffMins / 60)}h ago`
  else if (diffMins >= 1440) relative = `${Math.floor(diffMins / 1440)}d ago`

  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return `${dateStr} (${relative})`
}

function TabLoader({ label }: { label?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '60px 20px' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width: 28, height: 28, border: '3px solid var(--border-2)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
      {label && (
        <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</motion.span>
      )}
    </motion.div>
  )
}

export default function OverviewPage() {
  const { campaigns, activeCampaignId, fetchCampaigns } = useCampaignStore()
  const { format, ownership, dateRange, customDateFrom, customDateTo, language } = useFilterStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'brands' | 'creators' | 'rankings' | 'videos' | 'keywords' | 'trends' | 'growth' | 'alerts' | 'settings'>('overview')
  const [showDemo, setShowDemo] = useState(false)
  const [drawerType, setDrawerType] = useState<'views_detail' | 'brand_sov_detail' | 'creator_detail' | 'rank_detail' | null>(null)
  const [isRefreshingViews, setIsRefreshingViews] = useState(false)
  const [viewsRefreshMsg, setViewsRefreshMsg] = useState<{ text: string; type: 'ok' | 'warn' | 'error' } | null>(null)

  const campaign = campaigns.find(c => c.id === activeCampaignId)
  const isOursParam = ownership && ownership !== 'all' ? `&is_ours=${ownership}` : ''
  const formatParam = format && format !== 'all' ? `&format=${format}` : ''
  const timeRangeParam = dateRange && dateRange !== 'All' ? `&time_range=${dateRange}` : ''
  const customDateParam = dateRange === 'Custom' && customDateFrom && customDateTo ? `&date_from=${customDateFrom}&date_to=${customDateTo}` : ''
  const languageParam = language && language !== 'all' ? `&language=${language}` : ''

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', activeCampaignId, format, ownership, dateRange, customDateFrom, customDateTo, language],
    queryFn: async () => {
      const [kpisRes, fullRes] = await Promise.all([
        fetch(`/api/dashboard/kpis?campaign_id=${activeCampaignId}${formatParam}${timeRangeParam}${customDateParam}${languageParam}`),
        fetch(`/api/dashboard?campaign_id=${activeCampaignId}${formatParam}${isOursParam}${timeRangeParam}${customDateParam}${languageParam}`),
      ])
      const kpis = kpisRes.ok ? await kpisRes.json() : null
      const d = await fullRes.json()
      return { kpis, ...d }
    },
    enabled: !!activeCampaignId,
  })

  const handleViewsUpdate = async () => {
    if (!activeCampaignId || isRefreshingViews) return
    setIsRefreshingViews(true)
    setViewsRefreshMsg(null)
    try {
      const r = await fetch('/api/views/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: activeCampaignId }),
      })
      const d = await r.json()
      if (!r.ok) {
        setViewsRefreshMsg({ text: d.error || 'Views refresh failed', type: 'error' })
      } else if (d.partial) {
        setViewsRefreshMsg({ text: `Refreshed ${d.updated} of ${d.total} videos — ${d.remaining} left, run again to continue`, type: 'warn' })
      } else {
        setViewsRefreshMsg({ text: `Refreshed ${d.updated} video${d.updated === 1 ? '' : 's'} from YouTube`, type: 'ok' })
      }
      await dashboardQuery.refetch()
    } catch (e) {
      console.error(e)
      setViewsRefreshMsg({ text: 'Connection error during views refresh', type: 'error' })
    } finally {
      setIsRefreshingViews(false)
      setTimeout(() => setViewsRefreshMsg(null), 6000)
    }
  }

  const dashboardData = dashboardQuery.data
  const overview = dashboardData?.overview ?? null
  const keywords = dashboardData?.keywords ?? []
  const videos = dashboardData?.topVideos ?? []
  const regionalApiStats = dashboardData?.regionalStats ?? {}
  const regionalApiCounts = dashboardData?.regionalVideoCounts ?? {}
  const totalRegionalViews = dashboardData?.totalRegionalViews ?? 0
  const hasData = !!overview && (overview?.totalVideos ?? 0) > 0

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const distinctLanguages = useMemo(() => {
    const langs = new Set<string>()
    keywords.forEach((k: any) => { if (k.language) langs.add(k.language) })
    return Array.from(langs).sort()
  }, [keywords])

  const distinctBrands = useMemo(() => {
    const brands = new Set<string>()
    videos.forEach((v: any) => {
      ;(v.tags || v.brands || []).forEach((b: string) => brands.add(b))
    })
    return Array.from(brands).sort()
  }, [videos])

  const campaignBrands = useMemo(() => {
    const brands = new Set<string>()
    keywords.forEach((k: any) => { if (k.brand) brands.add(k.brand) })
    return Array.from(brands).sort()
  }, [keywords])

  // Minimal drawer data — only what the overlay needs
  const drawerData = useMemo(() => {
    let timeline: any[] = []
    const realDailyViews = overview?.dailyViews as { date: string; views: number }[] | undefined
    if (realDailyViews && realDailyViews.length > 0) {
      timeline = realDailyViews.map((d: any) => {
        const dateObj = new Date(d.date + 'T00:00:00')
        return {
          date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rawDate: d.date,
          views: d.views || 0,
          videos: 0,
          keywords: 0,
        }
      })
    }

    const brandMap = new Map<string, { views: number; freq: number; videoCount: number }>()
    videos.forEach((v: any) => {
      ;(v.tags || v.brands || []).forEach((b: string) => {
        if (!brandMap.has(b)) brandMap.set(b, { views: 0, freq: 0, videoCount: 0 })
        const m = brandMap.get(b)!; m.views += v.view_count || 0; m.freq += v.keyword_count || 1; m.videoCount++
      })
    })
    const totalV = Array.from(brandMap.values()).reduce((s, i) => s + i.views, 0) || 1
    const totalF = Array.from(brandMap.values()).reduce((s, i) => s + i.freq, 0) || 1
    const topViews = Array.from(brandMap.entries())
      .map(([name, item]) => ({ name, value: item.views, pct: pct(item.views, totalV), videoCount: item.videoCount, color: brandColor(name) }))
      .sort((a, b) => b.value - a.value)
    const topFreq = Array.from(brandMap.entries())
      .map(([name, item]) => ({ name, value: item.freq, pct: pct(item.freq, totalF), videoCount: item.videoCount, color: brandColor(name) }))
      .sort((a, b) => b.value - a.value)

    const chanMap = new Map<string, { name: string; views: number; count: number; kwCount: number; shorts: number; avgViews: number; brandCount: number; shortsRatio: number }>()
    videos.forEach((v: any) => {
      const n = v.channel_name; if (!n) return
      if (!chanMap.has(n)) chanMap.set(n, { name: n, views: 0, count: 0, kwCount: 0, shorts: 0, avgViews: 0, brandCount: 0, shortsRatio: 0 })
      const s = chanMap.get(n)!; s.views += v.view_count || 0; s.count++; s.kwCount += (v.keywords_appeared || []).length
      if (v.is_short) s.shorts++
    })
    const channels = Array.from(chanMap.values())
      .map(c => ({ ...c, avgViews: c.count > 0 ? Math.round(c.views / c.count) : 0, shortsRatio: c.count > 0 ? Math.round((c.shorts / c.count) * 100) : 0 }))
      .sort((a, b) => b.views - a.views)

    return { timeline, topViews, topFreq, channels, filteredRankVideos: videos }
  }, [overview, videos])

  const { timeline, topViews, topFreq, channels, filteredRankVideos } = drawerData

  const downloadCSV = (title: string, headers: string[], rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const ctxValue = useMemo(() => ({
    data: dashboardData,
    overview,
    videos,
    keywords,
    campaignBrands,
    regionalApiStats,
    regionalApiCounts,
    totalRegionalViews,
    hasData,
    isDemo: showDemo,
    setDrawerType,
    downloadCSV,
    setActiveTab,
    showDemo,
    setShowDemo,
    C,
    distinctBrands,
    distinctLanguages,
  }), [dashboardData, overview, videos, keywords, campaignBrands, regionalApiStats, regionalApiCounts, totalRegionalViews, hasData, showDemo, distinctBrands, distinctLanguages])

  return (
    <>
    <DashboardCtx.Provider value={ctxValue}>
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .tab-pane{animation:fadeUp 0.25s ease both}
        .tab-pill{padding:8px 16px;font-size:13px;font-weight:600;color:var(--text-secondary);background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;transition:all 0.15s;font-family:inherit;white-space:nowrap}
        .tab-pill:hover{color:var(--text-primary)}
        .tab-pill.on{color:var(--accent);border-bottom-color:var(--accent)}
        .mini-tab{padding:4px 10px;font-size:11.5px;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:all 0.12s;border-radius:6px}
        .select-filter{background:var(--surface);border:1px solid var(--border-2);font-size:11.5px;color:var(--text-secondary);border-radius:6px;padding:3px 8px;font-weight:600;outline:none;font-family:inherit}
        .drawer-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(2px);z-index:999;display:flex;justify-content:flex-end}
        .drawer-content{background:var(--surface);width:550px;max-width:100%;height:100%;box-shadow:-8px 0 32px rgba(0,0,0,0.15);animation:slideIn 0.3s cubic-bezier(0.16,1,0.3,1) both;display:flex;flex-direction:column}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }} data-tutorial="filter-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <h1 className="t-h1" style={{ margin: 0, letterSpacing: '-0.4px' }}>
              {campaign?.name || 'Campaign Analytics'}
            </h1>
            {hasData && <span className="badge badge-green" style={{ textTransform: 'uppercase' }}>Live</span>}
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} className="num">
            <span>{overview?.totalKeywords ?? 0} keywords</span>
            <span style={{ color: 'var(--border-2)' }}>·</span>
            <span>{fmt(overview?.totalVideos)} videos</span>
            <span style={{ color: 'var(--border-2)' }}>·</span>
            <span>{fmt(overview?.uniqueChannels)} creators</span>
          </div>
          <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Last updated: {formatTimestamp(overview?.lastUpdatedViews || dashboardData?.lastUpdated)}</span>
            <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--border-3)' }}>•</span>
            <span>Weekly run: Monday 11 PM</span>
          </div>
        </div>
        {/* minWidth:0 lets this shrink inside the flex row and lets the bar's own
            overflowX take over. Without it the bar's intrinsic width grows when
            the "N active" / "Reset Filters" chips appear, the header wraps, and
            the whole page below jumps down — the filter UI appearing to "go
            down" the moment you select anything. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', minWidth: 0, flexShrink: 1 }}>
          <SharedFilterBar
            showViewsUpdate
            onViewsUpdate={handleViewsUpdate}
            isViewsUpdating={isRefreshingViews || dashboardQuery.isRefetching}
            languages={distinctLanguages}
          />
        </div>
      </div>

      {viewsRefreshMsg && (
        <div role="status" style={{
          marginBottom: 16, padding: '9px 14px', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-sm)', fontWeight: 600,
          background: viewsRefreshMsg.type === 'error' ? 'var(--danger-dim)' : viewsRefreshMsg.type === 'warn' ? 'var(--warning-dim)' : 'var(--success-dim)',
          color: viewsRefreshMsg.type === 'error' ? 'var(--danger-text)' : viewsRefreshMsg.type === 'warn' ? 'var(--warning-text)' : 'var(--success-text)',
          border: `1px solid ${viewsRefreshMsg.type === 'error' ? 'var(--danger-border)' : viewsRefreshMsg.type === 'warn' ? 'var(--warning-border)' : 'var(--success-border)'}`,
        }}>
          {viewsRefreshMsg.text}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-2)', marginBottom: 24, overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart2 },
          { id: 'brands', label: 'Brand SOV', icon: Layers },
          { id: 'creators', label: 'Creators', icon: Users },
          { id: 'rankings', label: 'Rankings', icon: Target },
          { id: 'videos', label: 'Videos', icon: Video },
          { id: 'keywords', label: 'Keywords', icon: Search },
          { id: 'trends', label: 'Trends', icon: TrendingUp },
          { id: 'growth', label: 'Growth', icon: Activity },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} data-tab={id} className={`tab-pill ${activeTab === id ? 'on' : ''}`} onClick={() => setActiveTab(id as any)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* Demo banner */}
      {showDemo && (
        <div className="demo-banner" style={{ display: 'flex', gap: 14, padding: '12px 18px', borderRadius: 'var(--radius-md)', marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}>🧪</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--info)' }}>Demo Mode — Water Purifier Market Sample Data</div>
            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)', marginTop: 1, lineHeight: 1.5 }}>
              Showing reference data for 5 brands (Aquaguard, KENT RO, Livpure, Pureit, AO Smith) and top 8 creators. All charts, ranks, and SOV values are illustrative. Real data will replace this once keywords are added and a scrape is triggered.
            </div>
          </div>
          <button onClick={() => setShowDemo(false)} className="btn btn-danger btn-sm" style={{ flexShrink: 0 }}>
            🗑 Clear Demo Data
          </button>
        </div>
      )}

      <div className="tab-pane">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
          >
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'brands' && <Suspense fallback={<TabLoader label="Loading brands…" />}><BrandsTab /></Suspense>}
            {activeTab === 'creators' && <Suspense fallback={<TabLoader label="Loading creators…" />}><CreatorsTab /></Suspense>}
            {activeTab === 'rankings' && <Suspense fallback={<TabLoader label="Loading rankings…" />}><RankingsTab /></Suspense>}
            {activeTab === 'videos' && <Suspense fallback={<TabLoader label="Loading videos…" />}><VideosTab /></Suspense>}
            {activeTab === 'keywords' && <Suspense fallback={<TabLoader label="Loading keywords…" />}><KeywordsTab /></Suspense>}
            {activeTab === 'trends' && <Suspense fallback={<TabLoader label="Loading trends…" />}><TrendsTab /></Suspense>}
            {activeTab === 'growth' && <Suspense fallback={<TabLoader label="Loading growth…" />}><GrowthTab /></Suspense>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ════════════════════════════════════════
          DETAIL DRAWER OVERLAY
          ════════════════════════════════════════ */}
      {drawerType && (
        <div className="drawer-overlay" onClick={() => setDrawerType(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 className="t-h2" style={{ margin: 0 }}>
                  {drawerType === 'views_detail' && 'Discovery Trend Ledger'}
                  {drawerType === 'brand_sov_detail' && 'Brand Competitive Details'}
                  {drawerType === 'creator_detail' && 'Creator Portfolios'}
                  {drawerType === 'rank_detail' && 'Keyword Rankings Ledger'}
                </h2>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>Comprehensive exportable analytical data breakdown</p>
              </div>
              <button onClick={() => setDrawerType(null)} aria-label="Close" className="icon-btn" style={{ borderRadius: 'var(--radius-full)', width: 28, height: 28 }}>
                <X size={15} />
              </button>
            </div>

            {drawerType === 'views_detail' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="num" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-secondary)' }}>{timeline.length} Days Row Index</span>
                  <CsvButton onClick={() => downloadCSV('Daily_Performance', ['Date', 'Views', 'Daily Videos', 'Keywords Added'], timeline.map(t => [t.date, String(t.views), String(t.videos), String(t.keywords ?? 0)]))} label="CSV Export" />
                </div>
                <div style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                    <thead>
                      <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--border-2)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Date</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>Views</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>Daily Videos</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>Keywords Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.map((t: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>{t.date}</td>
                          <td className="num" style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--success-text)' }}>{fmt(t.views)}</td>
                          <td className="num" style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>{t.videos}</td>
                          <td className="num" style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--info)', fontWeight: 600 }}>{t.keywords ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {drawerType === 'brand_sov_detail' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-secondary)' }}>Filtered Brand Breakdown</span>
                  <CsvButton onClick={() => downloadCSV('Brand_Metrics', ['Brand', 'View SOV %', 'Views Count', 'KW appearances', 'Videos count'], topViews.map((v: any) => {
                    const f = topFreq.find((x: any) => x.name === v.name)
                    return [v.name, v.pct.toFixed(2), String(v.value), String(f?.value ?? 0), String(v.videoCount)]
                  }))} label="CSV Export" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topViews.map((b: any, i: number) => {
                    const f = topFreq.find((x: any) => x.name === b.name)
                    return (
                      <div key={`${b.name}_${i}`} className="row-hover" style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: '12px', border: '1px solid var(--border-2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 'var(--fs-body)', fontWeight: 800, color: 'var(--text-bright)' }}>{b.name}</span>
                          <span className="num" style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: b.color, background: `${b.color}10`, padding: '2px 8px', borderRadius: 'var(--radius-xs)' }}>{b.pct.toFixed(1)}% View SOV</span>
                        </div>
                        <div className="num" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 'var(--fs-label)' }}>
                          <div><div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>VIEWS</div><div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginTop: 1 }}>{fmt(b.value)}</div></div>
                          <div><div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>RANKINGS</div><div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginTop: 1 }}>{f?.value ?? 0} ({f?.pct?.toFixed(1) ?? 0}%)</div></div>
                          <div><div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>VIDEOS</div><div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginTop: 1 }}>{b.videoCount}</div></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {drawerType === 'creator_detail' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="num" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-secondary)' }}>Creators ({channels.length})</span>
                  <CsvButton onClick={() => downloadCSV('Creators_Breakdown', ['Creator', 'Views', 'Videos count', 'Avg Views', 'KW cover', 'Brands span'], channels.map((c: any) => [c.name, String(c.views), String(c.count), String(c.avgViews), String(c.kwCount), String(c.brandCount)]))} label="CSV Export" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {channels.map((c: any, idx: number) => (
                    <div key={c.name} className="row-hover" style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: '12px', border: '1px solid var(--border-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 800, color: 'var(--text-primary)' }}>{c.name}</span>
                        <Rank n={idx + 1} />
                      </div>
                      <div className="num" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 'var(--fs-label)' }}>
                        <div>Views: <strong>{fmt(c.views)}</strong></div>
                        <div>Videos: <strong>{c.count}</strong></div>
                        <div>Avg Views: <strong>{fmt(c.avgViews)}</strong></div>
                        <div>Keywords: <strong>{c.kwCount}</strong></div>
                        <div>Brands: <strong>{c.brandCount}</strong></div>
                        <div>Shorts: <strong>{c.shortsRatio}%</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {drawerType === 'rank_detail' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="num" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-secondary)' }}>Videos List ({filteredRankVideos.length})</span>
                  <CsvButton onClick={() => downloadCSV('Video_Rankings', ['Title', 'Channel', 'Views', 'Best Rank', 'Keywords count'], filteredRankVideos.map((v: any) => [v.title, v.channel_name, String(v.view_count), String(v.best_rank), String(v.keyword_count)]))} label="CSV Export" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredRankVideos.map((v: any) => (
                    <div key={v.id} className="row-hover" style={{ display: 'flex', gap: 10, padding: '10px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-2)' }}>
                      <img src={v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" style={{ width: 64, height: 38, borderRadius: 'var(--radius-xs)', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Link href={`/video/${v.youtube_id}`} style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-bright)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.title}
                        </Link>
                        <span className="num" style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)' }}>{v.channel_name} · {fmt(v.view_count)} views</span>
                      </div>
                      <div style={{ flexShrink: 0 }}><Rank n={v.best_rank || 20} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </DashboardCtx.Provider>
    <TutorialTrigger />
    </>
  )
}
