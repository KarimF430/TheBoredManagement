'use client'

import { useState, useMemo } from 'react'
import {
  Search, Plus, Loader2, Globe, Clock, ArrowUpDown, Eye, BarChart2,
  Hash, Target, TrendingUp, Info, Activity, Layers, Video,
  Filter, X, ChevronDown, ChevronUp, BarChart3, Award, Zap, Star
} from 'lucide-react'
import { useCampaignStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

type MetricMode = 'views' | 'frequency'
type SortKey = 'name' | 'videos' | 'views' | 'frequency' | 'last_scraped' | 'status' | 'rank' | 'score' | 'slotValue'

import { useDashboard } from '@/lib/dashboard-context'
import { useFilterStore } from '@/lib/filter-store'

const C = ['#4C78A8','#54A24B','#E45756','#72B7B2','#EECA3B','#B279A2','#FF9DA6','#9D755D','#BAB0AC','#D67195']
const TYPE_COLORS: Record<string, string> = { generic: '#1A73E8', branded: '#DC2626', comparison: '#F59E0B' }
const LANG_LABELS: Record<string, string> = {
  en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam',
  kn: 'Kannada', bn: 'Bengali', mr: 'Marathi', es: 'Spanish', pt: 'Portuguese',
  fr: 'French', de: 'German', ja: 'Japanese',
}
const RANK_OPTIONS = [
  { value: 'all', label: 'All Ranks' },
  { value: '1-3', label: 'Top 3' },
  { value: '4-10', label: 'Top 10' },
  { value: '11+', label: '11+' },
  { value: 'unranked', label: 'Unranked' },
]
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
]

/* ── Helpers ── */

function fmtRelative(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso.includes('T') ? iso : iso + 'Z')
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '--'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function fmtIndian(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '--'
  if (n >= 1e7) { const val = n / 1e7; return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' Cr' }
  if (n >= 1e5) { const val = n / 1e5; return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' Lakh' }
  if (n >= 1e3) { const val = n / 1e3; return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' K' }
  return n.toLocaleString('en-IN')
}

function pct(a: number, b: number) {
  if (!b) return 0
  return Math.round((a / b) * 1000) / 10
}

/* ── Honest Keyword Analysis Functions ── */

/* Slot Value: average views per ranking slot. Best single proxy for keyword quality.
   High = each ranking position drives significant views. Low = views are diluted across many slots. */
function slotValue(kw: any): number {
  const v = kw.total_views || 0
  const f = kw.frequency || 0
  return f > 0 ? v / f : v
}

/* Freshness: hours since last scrape — tells us if data is current */
function freshnessLevel(kw: any): { level: string; color: string; label: string; hours: number } {
  if (!kw.last_scraped) return { level: 'unknown', color: '#94A3B8', label: 'Unknown', hours: 999 }
  const hours = Math.floor((Date.now() - new Date(kw.last_scraped.includes('T') ? kw.last_scraped : kw.last_scraped + 'Z').getTime()) / 3600000)
  if (hours < 24) return { level: 'fresh', color: '#059669', label: 'Fresh', hours }
  if (hours < 72) return { level: 'recent', color: '#1A73E8', label: 'Recent', hours }
  if (hours < 168) return { level: 'aging', color: '#D97706', label: 'Aging', hours }
  return { level: 'stale', color: '#DC2626', label: 'Stale', hours }
}

/* Classify keywords into the 2x2 matrix using dataset medians */
function classifyKeyword(kw: any, medianViews: number, medianSV: number): { segment: string; label: string; color: string; bg: string; order: number } {
  const v = kw.total_views || 0
  const sv = slotValue(kw)
  const highViews = v >= medianViews
  const highSV = sv >= medianSV
  if (highViews && highSV) return { segment: 'star', label: 'Star', color: '#059669', bg: 'rgba(5,150,105,0.1)', order: 0 }
  if (highViews && !highSV) return { segment: 'volume', label: 'Volume', color: '#1A73E8', bg: 'rgba(26,115,232,0.1)', order: 1 }
  if (!highViews && highSV) return { segment: 'niche', label: 'Niche', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', order: 2 }
  return { segment: 'weak', label: 'Weak', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', order: 3 }
}

/* Honest score: Slot Value is the primary driver (40%), then Total Views (30%), then Rank position (20%), then Frequency breadth (10%) */
function computeScore(kw: any, maxSV: number, maxViews: number, maxFreq: number, medianViews: number, medianSV: number) {
  const sv = slotValue(kw)
  const svScore = maxSV > 0 ? Math.min(40, (sv / maxSV) * 40) : 0
  const viewsScore = maxViews > 0 ? Math.min(30, ((kw.total_views || 0) / maxViews) * 30) : 0
  const rank = kw.best_rank || 99
  let posScore = 0
  if (rank === 1) posScore = 20
  else if (rank <= 3) posScore = 16
  else if (rank <= 5) posScore = 12
  else if (rank <= 10) posScore = 8
  else if (rank <= 20) posScore = 4
  else if (rank < 99) posScore = 2
  const freqScore = maxFreq > 0 ? Math.min(10, ((kw.frequency || 0) / maxFreq) * 10) : 0
  const total = Math.min(100, Math.round(svScore + viewsScore + posScore + freqScore))
  const cls = classifyKeyword(kw, medianViews, medianSV)
  const color = total >= 70 ? '#059669' : total >= 50 ? '#1A73E8' : total >= 30 ? '#D97706' : '#DC2626'
  const label = total >= 70 ? 'Strong' : total >= 50 ? 'Good' : total >= 30 ? 'Fair' : 'Weak'
  return { score: total, label, color, cls, components: { slotValue: Math.round(svScore), views: Math.round(viewsScore), position: posScore, frequency: Math.round(freqScore) } }
}

/* ── End Analysis Functions ── */

export default function KeywordsTab() {
  const { activeCampaignId } = useCampaignStore()
  const ctx = useDashboard()
  const overview = ctx?.overview
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [bulkKw, setBulkKw] = useState('')
  const [kwLang, setKwLang] = useState('en')
  const [kwType, setKwType] = useState<'generic' | 'branded' | 'comparison'>('generic')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [fetchProgress, setFetchProgress] = useState<{ done: number; total: number; current: string } | null>(null)
  const { search } = useFilterStore()
  const [filterType, setFilterType] = useState<string>('all')
  const [filterLang, setFilterLang] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRank, setFilterRank] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [metricMode, setMetricMode] = useState<MetricMode>('views')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const keywordsQuery = useQuery({
    queryKey: ['keywords-tab', activeCampaignId],
    queryFn: async () => {
      const res = await fetch(`/api/keywords?campaign_id=${activeCampaignId}`)
      const d = await res.json()
      return d.keywords ?? []
    },
    enabled: !!activeCampaignId,
  })

  const keywords = keywordsQuery.data ?? []
  const loading = keywordsQuery.isLoading

  /**
   * Add keywords and immediately fetch their first ranking.
   *
   * The keywords appear as soon as they are saved; the fetch then runs one
   * keyword at a time (each costs YouTube quota and takes a few seconds) and
   * the table refreshes after each one so results stream in.
   */
  const addKeywords = async () => {
    if (!activeCampaignId || !bulkKw.trim()) return
    setAdding(true)
    setAddError(null)
    setFetchProgress(null)
    try {
      const items = bulkKw.split('\n').map(l => l.trim()).filter(Boolean).map(text => ({ text, language: kwLang, type: kwType }))
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: activeCampaignId, keywords: items }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Failed to add keywords (${res.status})`)

      setBulkKw(''); setShowAdd(false)
      await keywordsQuery.refetch()

      const pending: Array<{ id: string; text: string }> = data?.pending_scrape ?? []
      if (pending.length === 0) return

      const failed: string[] = []
      for (let i = 0; i < pending.length; i++) {
        setFetchProgress({ done: i, total: pending.length, current: pending[i].text })
        try {
          const scrapeRes = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaign_id: activeCampaignId, keyword_id: pending[i].id, limit: 1 }),
          })
          if (!scrapeRes.ok) {
            const err = await scrapeRes.json().catch(() => ({}))
            failed.push(`${pending[i].text}: ${err?.error || scrapeRes.status}`)
          }
        } catch (e: any) {
          failed.push(`${pending[i].text}: ${e?.message || 'request failed'}`)
        }
        await keywordsQuery.refetch()
      }

      if (failed.length > 0) {
        setAddError(`Fetch failed for ${failed.length} keyword(s): ${failed.slice(0, 3).join('; ')}`)
      }
    } catch (e: any) {
      setAddError(e?.message || 'Failed to add keywords')
    } finally {
      setAdding(false)
      setFetchProgress(null)
    }
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    try { await fetch('/api/keywords', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: newStatus }) }); keywordsQuery.refetch() } catch { }
  }

  const bulkDelete = async () => {
    if (selected.size === 0 || !confirm(`Delete ${selected.size} keyword(s)?`)) return
    setBulkDeleting(true)
    try { for (const id of selected) await fetch('/api/keywords', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); setSelected(new Set()); keywordsQuery.refetch() } catch { } finally { setBulkDeleting(false) }
  }

  const bulkToggleStatus = async (newStatus: 'active' | 'paused') => {
    if (selected.size === 0) return
    try { for (const id of selected) await fetch('/api/keywords', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: newStatus }) }); setSelected(new Set()); keywordsQuery.refetch() } catch { }
  }

  const matchesRankFilter = (kw: any) => {
    const r = kw.best_rank || 99
    switch (filterRank) {
      case '1-3': return r <= 3
      case '4-10': return r >= 4 && r <= 10
      case '11+': return r >= 11
      case 'unranked': return r >= 99
      default: return true
    }
  }

  const allViews = keywords.map((k: any) => k.total_views || 0)
  const allSV = keywords.map((k: any) => slotValue(k))
  const maxViews = Math.max(...allViews, 1)
  const maxSV = Math.max(...allSV, 1)
  const maxFreq = Math.max(...keywords.map((k: any) => k.frequency || 0), 1)
  const medianViews = [...allViews].sort((a: number, b: number) => a - b)[Math.floor(allViews.length / 2)] || 0
  const medianSV = [...allSV].sort((a: number, b: number) => a - b)[Math.floor(allSV.length / 2)] || 0

  const scoredKeywords = useMemo(() =>
    keywords.map((kw: any) => ({ ...kw, _score: computeScore(kw, maxSV, maxViews, maxFreq, medianViews, medianSV) }))
  , [keywords, maxSV, maxViews, maxFreq, medianViews, medianSV])

  const filtered = useMemo(() => {
    let result = scoredKeywords.filter((kw: any) => {
      if (search && !kw.text.toLowerCase().includes(search.toLowerCase())) return false
      if (filterType !== 'all' && kw.category !== filterType) return false
      if (filterLang !== 'all' && kw.language !== filterLang) return false
      if (filterStatus !== 'all' && kw.status !== filterStatus) return false
      if (!matchesRankFilter(kw)) return false
      return true
    })
    result.sort((a: any, b: any) => {
      let cmp = 0
      switch (sortKey) {
        case 'name': cmp = a.text.localeCompare(b.text); break
        case 'videos': cmp = ((b.long_form_count || 0) + (b.short_form_count || 0)) - ((a.long_form_count || 0) + (a.short_form_count || 0)); break
        case 'views': cmp = (b.total_views || 0) - (a.total_views || 0); break
        case 'frequency': cmp = (b.frequency || 0) - (a.frequency || 0); break
        case 'last_scraped': cmp = new Date(b.last_scraped || 0).getTime() - new Date(a.last_scraped || 0).getTime(); break
        case 'status': cmp = (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1); break
        case 'rank': cmp = (a.best_rank || 99) - (b.best_rank || 99); break
        case 'score': cmp = (b._score?.score || 0) - (a._score?.score || 0); break
        case 'slotValue': cmp = slotValue(b) - slotValue(a); break
      }
      return sortAsc ? cmp : -cmp
    })
    return result
  }, [scoredKeywords, search, filterType, filterLang, filterStatus, filterRank, sortKey, sortAsc])

  const distinctLangs = useMemo(() => [...new Set(keywords.map((k: any) => k.language).filter(Boolean))].sort() as string[], [keywords])

  const stats = useMemo(() => {
    const totalVideos = keywords.reduce((s: number, k: any) => s + (k.long_form_count || 0) + (k.short_form_count || 0), 0)
    const totalViews = keywords.reduce((s: number, k: any) => s + (k.total_views || 0), 0)
    const active = keywords.filter((k: any) => k.status === 'active').length
    const topKeywords = keywords.filter((k: any) => (k.best_rank || 99) <= 3).length
    const top10 = keywords.filter((k: any) => (k.best_rank || 99) <= 10).length
    const unranked = keywords.filter((k: any) => (k.best_rank || 99) >= 99).length
    const totalFreq = keywords.reduce((s: number, k: any) => s + (k.frequency || 0), 0)

    /* Segment counts */
    const segments = { star: 0, volume: 0, niche: 0, weak: 0 }
    keywords.forEach((k: any) => {
      const cls = classifyKeyword(k, medianViews, medianSV)
      segments[cls.segment as keyof typeof segments]++
    })

    const langViews: Record<string, { views: number; count: number; videos: number }> = {}
    keywords.forEach((k: any) => {
      const lang = k.language || 'en'
      if (!langViews[lang]) langViews[lang] = { views: 0, count: 0, videos: 0 }
      langViews[lang].views += k.total_views || 0
      langViews[lang].count++
      langViews[lang].videos += (k.long_form_count || 0) + (k.short_form_count || 0)
    })
    const totalLangViews = Object.values(langViews).reduce((s, v) => s + v.views, 0) || 1
    const langDistribution = Object.entries(langViews)
      .map(([code, data]) => ({
        code, name: LANG_LABELS[code] || code.toUpperCase(),
        views: data.views, count: data.count, videos: data.videos,
        pct: pct(data.views, totalLangViews),
        fill: C[Object.keys(LANG_LABELS).indexOf(code) % C.length] || '#94A3B8',
      }))
      .sort((a, b) => b.pct - a.pct)

    const typeMap: Record<string, { count: number; videos: number; views: number }> = {}
    keywords.forEach((k: any) => {
      const type = k.category || k.type || 'generic'
      if (!typeMap[type]) typeMap[type] = { count: 0, videos: 0, views: 0 }
      typeMap[type].count++
      typeMap[type].videos += (k.long_form_count || 0) + (k.short_form_count || 0)
      typeMap[type].views += k.total_views || 0
    })
    const typeDistribution = Object.entries(typeMap)
      .map(([type, data]) => ({
        type, count: data.count, videos: data.videos, views: data.views,
        pct: pct(data.videos, totalVideos || 1),
        fill: TYPE_COLORS[type] || '#94A3B8',
      }))
      .sort((a, b) => b.videos - a.videos)

    const avgScore = keywords.length > 0
      ? Math.round(scoredKeywords.reduce((s: number, k: any) => s + (k._score?.score || 0), 0) / keywords.length)
      : 0

    return { total: keywords.length, active, paused: keywords.length - active, totalVideos, totalViews, uniqueVideos: overview?.totalVideos ?? 0, uniqueViews: overview?.totalViewership ?? 0, topKeywords, top10, unranked, totalFreq, langDistribution, typeDistribution, avgScore, segments }
  }, [keywords, scoredKeywords, medianViews, medianSV])

  const topByMetric = useMemo(() => {
    const sorted = [...scoredKeywords].sort((a: any, b: any) => {
      if (metricMode === 'views') return (b.total_views || 0) - (a.total_views || 0)
      return (b.frequency || 0) - (a.frequency || 0)
    })
    return sorted.slice(0, 6)
  }, [scoredKeywords, metricMode])

  /* Segment groupings for the Keyword Map */
  const segmentGroups = useMemo(() => {
    const groups: Record<string, any[]> = { star: [], volume: [], niche: [], weak: [] }
    scoredKeywords.forEach((kw: any) => {
      const seg = kw._score.cls.segment
      if (groups[seg]) groups[seg].push(kw)
    })
    return groups
  }, [scoredKeywords])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(key === 'score') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => <ArrowUpDown size={10} style={{ color: sortKey === col ? '#1A73E8' : '#CBD5E1', marginLeft: 3 }} />

  const getRankBg = (rank: number) => {
    if (rank <= 3) return 'rgba(5,150,105,0.08)'
    if (rank <= 10) return 'rgba(26,115,232,0.08)'
    if (rank < 99) return 'rgba(217,119,6,0.08)'
    return '#F1F5F9'
  }

  const getRankColor = (rank: number) => {
    if (rank <= 3) return '#059669'
    if (rank <= 10) return '#1A73E8'
    if (rank < 99) return '#D97706'
    return '#94A3B8'
  }

  const toggleRow = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const SEGMENT_META: Record<string, { label: string; icon: any; color: string; desc: string }> = {
    star: { label: 'Star Keywords', icon: Star, color: '#059669', desc: 'High views & high slot value — best ROI keywords' },
    volume: { label: 'Volume Keywords', icon: TrendingUp, color: '#1A73E8', desc: 'High views but diluted — popular but crowded' },
    niche: { label: 'Niche Keywords', icon: Target, color: '#7C3AED', desc: 'Low views but high slot value — efficient, focused' },
    weak: { label: 'Weak Keywords', icon: BarChart2, color: '#94A3B8', desc: 'Low views & low slot value — deprioritize' },
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        .kw-row:hover{background:#F8FAFC!important}
        .kw-row{cursor:pointer}
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Keyword Analytics
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
            {stats.total} keywords &middot; {stats.active} active &middot; {fmt(stats.uniqueVideos)} videos &middot; {fmtIndian(stats.uniqueViews)} views &middot; {fmt(stats.totalFreq)} appearances
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selected.size > 0 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 10px', borderRadius: 7, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1A73E8' }}>{selected.size} selected</span>
              <button style={{ padding: '3px 8px', fontSize: 10, background: '#10B981', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => bulkToggleStatus('active')}>Activate</button>
              <button style={{ padding: '3px 8px', fontSize: 10, background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => bulkToggleStatus('paused')}>Pause</button>
              <button style={{ padding: '3px 8px', fontSize: 10, background: '#EF4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={bulkDelete} disabled={bulkDeleting}>{bulkDeleting ? '...' : 'Delete'}</button>
            </div>
          )}
          <button onClick={() => setShowAdd(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#1A73E8', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={13} /> Add Keywords
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ background: '#EFF6FF', borderRadius: 12, padding: '16px 18px', border: '1.5px solid #BFDBFE', overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A73E8', marginBottom: 10 }}>Add New Keywords</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Language</div>
                <select className="input" value={kwLang} onChange={e => setKwLang(e.target.value)} style={{ width: '100%' }}>
                  {Object.entries(LANG_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Type</div>
                <select className="input" value={kwType} onChange={e => setKwType(e.target.value as any)} style={{ width: '100%' }}>
                  <option value="generic">Generic</option><option value="branded">Branded</option><option value="comparison">Comparison</option>
                </select>
              </div>
            </div>
            <textarea className="input" rows={4} placeholder={'best water purifier\nsamsung galaxy review\niphone vs android'} value={bulkKw} onChange={e => setBulkKw(e.target.value)} style={{ resize: 'vertical', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginBottom: 10, width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: '#64748B' }}>{bulkKw.split('\n').filter(l => l.trim()).length} keyword(s) ready</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addKeywords} disabled={adding || !bulkKw.trim()} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#1A73E8', color: '#fff', fontSize: 11, fontWeight: 700, cursor: adding ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {adding ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />} Add
                </button>
                <button onClick={() => setShowAdd(false)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(fetchProgress || addError) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {fetchProgress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#1A73E8', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '7px 12px' }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              Fetching rankings {fetchProgress.done + 1}/{fetchProgress.total} — &ldquo;{fetchProgress.current}&rdquo;
            </div>
          )}
          {addError && (
            <div style={{ fontSize: 11, fontWeight: 600, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '7px 12px' }}>
              {addError}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
        {[
          { label: 'TOTAL', value: stats.total, sub: 'keywords', icon: Hash, color: '#1A73E8' },
          { label: 'ACTIVE', value: stats.active, sub: stats.paused + ' paused', icon: Activity, color: '#10B981' },
          { label: 'VIDEOS', value: fmt(stats.uniqueVideos), sub: 'unique videos', icon: Video, color: '#8B5CF6' },
          { label: 'VIEWS', value: fmtIndian(stats.uniqueViews), sub: 'ranked views', icon: Eye, color: '#F59E0B' },
          { label: 'RANKED', value: stats.top10, sub: stats.topKeywords + ' in top 3', icon: Target, color: '#EC4899' },
          { label: 'APPEAR', value: fmt(stats.totalFreq), sub: stats.unranked + ' unranked', icon: BarChart2, color: '#06B6D4' },
          { label: 'SCORE', value: stats.avgScore, sub: 'avg keyword score', icon: Award, color: stats.avgScore >= 70 ? '#059669' : stats.avgScore >= 50 ? '#1A73E8' : stats.avgScore >= 30 ? '#D97706' : '#DC2626' },
        ].map((card) => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <card.icon size={12} style={{ color: card.color }} />
              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{card.value}</div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={14} style={{ color: '#F59E0B' }} /> Keyword Opportunity Map
            </div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>2x2 matrix: Total Views (reach) vs Slot Value (views per ranking slot)</div>
          </div>
          <div style={{ display: 'flex', gap: 6, fontSize: 10, color: '#64748B', alignItems: 'center' }}>
            <span>Median views: <strong>{fmt(medianViews)}</strong></span>
            <span style={{ color: '#E2E8F0' }}>|</span>
            <span>Median slot value: <strong>{fmt(medianSV)}</strong></span>
          </div>
        </div>
        {keywords.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>No keywords yet</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            {(['star', 'volume', 'niche', 'weak'] as const).map(seg => {
              const meta = SEGMENT_META[seg]
              const items = segmentGroups[seg] || []
              const count = stats.segments[seg] || 0
              const topItems = items.slice(0, 4)
              return (
                <div key={seg} style={{ background: meta.color + '06', borderRadius: 10, padding: '14px', border: `1px solid ${meta.color}20` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <meta.icon size={13} style={{ color: meta.color }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: meta.color }}>{meta.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, marginLeft: 'auto', background: meta.color + '15', padding: '1px 6px', borderRadius: 4 }}>{count}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: '#64748B', marginBottom: 8 }}>{meta.desc}</div>
                  {topItems.length === 0 ? (
                    <div style={{ fontSize: 10, color: '#94A3B8', padding: '6px 0' }}>No keywords</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {topItems.map((kw: any, idx: number) => (
                        <div key={kw.id || idx} style={{ fontSize: 10, fontWeight: 600, color: '#334155', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{kw.text}</span>
                          <span style={{ fontWeight: 700, color: meta.color, fontFamily: "'JetBrains Mono', monospace", marginLeft: 6 }}>{fmt(kw.total_views || 0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #F1F5F9' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={14} style={{ color: '#1A73E8' }} /> Language Distribution
            </div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Views share with keyword counts</div>
          </div>
          {stats.langDistribution.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>No language data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.langDistribution.map((lang) => (
                <div key={lang.code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                      {lang.name}
                      <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginLeft: 6 }}>{lang.count} kw &middot; {fmt(lang.videos)} videos</span>
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: lang.fill }}>{lang.pct}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: lang.pct + '%', background: `linear-gradient(90deg, ${lang.fill}, ${lang.fill}88)`, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#94A3B8', minWidth: 55, textAlign: 'right' }}>{fmtIndian(lang.views)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={14} style={{ color: '#7C3AED' }} /> Top Keywords
            </div>
            <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 8, padding: 2 }}>
              {(['views', 'frequency'] as MetricMode[]).map(mode => (
                <button key={mode} onClick={() => setMetricMode(mode)} style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none',
                  background: metricMode === mode ? '#fff' : 'transparent',
                  color: metricMode === mode ? '#1A73E8' : '#94A3B8',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: metricMode === mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                  {mode === 'views' ? 'By Views' : 'By Frequency'}
                </button>
              ))}
            </div>
          </div>
          {topByMetric.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topByMetric.map((kw: any, i: number) => {
                const val = metricMode === 'views' ? kw.total_views || 0 : kw.frequency || 0
                const maxVal = metricMode === 'views'
                  ? Math.max(...topByMetric.map((k: any) => k.total_views || 0), 1)
                  : Math.max(...topByMetric.map((k: any) => k.frequency || 0), 1)
                const pctWidth = (val / maxVal) * 100
                return (
                  <div key={kw.id || i}
                    onClick={() => {
                      router.push(`/leaderboard?keyword_id=${kw.id}`)
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, background: i % 2 === 0 ? '#FAFBFC' : 'transparent', cursor: 'pointer', transition: 'background 0.12s' }}
                    className="kw-row"
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F0F4FF' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#FAFBFC' : 'transparent' }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', minWidth: 16, textAlign: 'right' }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw.text}</div>
                      <div style={{ fontSize: 9.5, color: '#94A3B8' }}>
                        {LANG_LABELS[kw.language] || kw.language} &middot; rank #{kw.best_rank || '--'}
                        {metricMode === 'views' ? ` · ${fmt(kw.frequency || 0)} appearances` : ` · ${fmt(kw.total_views || 0)} views`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 60 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>{metricMode === 'views' ? fmt(val) : val}</div>
                      <div style={{ height: 3, background: '#F1F5F9', borderRadius: 99, marginTop: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pctWidth + '%', background: metricMode === 'views' ? '#7C3AED' : '#06B6D4', borderRadius: 99 }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Page-specific Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ cursor: 'pointer', padding: '6px 12px', minWidth: 100 }}>
          <option value="all">All Types</option><option value="generic">Generic</option><option value="branded">Branded</option><option value="comparison">Comparison</option>
        </select>
        <select className="input" value={filterLang} onChange={e => setFilterLang(e.target.value)} style={{ cursor: 'pointer', padding: '6px 12px', minWidth: 110 }}>
          <option value="all">All Languages</option>{distinctLangs.map(l => <option key={l} value={l}>{LANG_LABELS[l] || l}</option>)}
        </select>
        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ cursor: 'pointer', padding: '6px 12px', minWidth: 100 }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="input" value={filterRank} onChange={e => setFilterRank(e.target.value)} style={{ cursor: 'pointer', padding: '6px 12px', minWidth: 120 }}>
          {RANK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160, color: '#94A3B8', background: '#fff', borderRadius: 12, border: '1px solid #F1F5F9' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 36, color: '#94A3B8', background: '#fff', borderRadius: 12, border: '1px solid #F1F5F9' }}>
          <Search size={28} style={{ marginBottom: 8, opacity: 0.4 }} /><div>{keywords.length === 0 ? 'No keywords yet.' : 'No matches.'}</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 55px 60px 60px 60px 55px 55px 65px 75px', padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', alignItems: 'center' }}>
            <div><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((k: any) => k.id)))} style={{ cursor: 'pointer' }} /></div>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleSort('name')}>Keyword <SortIcon col="name" /></div>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleSort('rank')}>Rank <SortIcon col="rank" /></div>
            <div>Type</div>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} onClick={() => handleSort('videos')}>Videos <SortIcon col="videos" /></div>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} onClick={() => handleSort('views')}>Views <SortIcon col="views" /></div>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} onClick={() => handleSort('frequency')}>Freq <SortIcon col="frequency" /></div>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} onClick={() => handleSort('slotValue')}>Slot <SortIcon col="slotValue" /></div>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} onClick={() => handleSort('score')}>Score <SortIcon col="score" /></div>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleSort('status')}>Status <SortIcon col="status" /></div>
          </div>
          {filtered.map((kw: any, i: number) => {
            const rank = kw.best_rank || 99
            const s = kw._score as any
            const cls = s?.cls || { label: '', color: '#94A3B8', bg: 'transparent' }
            const isExpanded = expandedId === kw.id
            return (
              <div key={kw.id}>
                <div className="kw-row"
                  onClick={() => toggleRow(kw.id)}
                  style={{ display: 'grid', gridTemplateColumns: '32px 1fr 55px 60px 60px 60px 55px 55px 65px 75px', padding: '10px 14px', borderBottom: i < filtered.length - 1 || isExpanded ? '1px solid #F1F5F9' : 'none', fontSize: 12, alignItems: 'center', background: selected.has(kw.id) ? '#EFF6FF' : 'transparent', userSelect: 'none' }}>
                  <div onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(kw.id)} onChange={() => { const n = new Set(selected); n.has(kw.id) ? n.delete(kw.id) : n.add(kw.id); setSelected(n) }} style={{ cursor: 'pointer' }} /></div>
                  <div style={{ fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isExpanded ? <ChevronUp size={11} style={{ color: '#1A73E8', flexShrink: 0 }} /> : <ChevronDown size={11} style={{ color: '#94A3B8', flexShrink: 0 }} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw.text}</span>
                    <span style={{ fontSize: 8.5, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: cls.bg, color: cls.color, flexShrink: 0 }}>{cls.label}</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: getRankBg(rank), color: getRankColor(rank), textAlign: 'center', width: 'fit-content' }}>
                    {rank < 99 ? `#${rank}` : '--'}
                  </div>
                  <div><span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: (TYPE_COLORS[kw.category] || '#94A3B8') + '10', color: TYPE_COLORS[kw.category] || '#94A3B8' }}>{kw.category || 'generic'}</span></div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{(kw.long_form_count || 0) + (kw.short_form_count || 0)}</div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{fmt(kw.total_views || 0)}</div>
                  <div style={{ textAlign: 'right', fontWeight: 600, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{kw.frequency || 0}</div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: '#7C3AED', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{fmt(Math.round(slotValue(kw)))}</div>
                  <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: s.color }}>{s.score}</div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); toggleStatus(kw.id, kw.status) }} style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: 'none', background: kw.status === 'active' ? '#ECFDF5' : '#FEF2F2', color: kw.status === 'active' ? '#059669' : '#DC2626', cursor: 'pointer' }}>
                      {kw.status === 'active' ? 'Active' : 'Paused'}
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden', borderBottom: i < filtered.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                      <ExpandedKeywordRow kw={kw} score={s} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function ExpandedKeywordRow({ kw, score }: { kw: any; score: any }) {
  const sv = slotValue(kw)
  const videosCount = (kw.long_form_count || 0) + (kw.short_form_count || 0)
  const avgViewsPerVideo = videosCount > 0 ? Math.round((kw.total_views || 0) / videosCount) : 0
  const fresh = freshnessLevel(kw)
  const cls = score.cls
  const c = score.components

  return (
    <div style={{ padding: '16px 20px 20px', background: '#FAFBFC', borderTop: '1px solid #E2E8F0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8 }}>Score Components</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: score.color, fontFamily: "'JetBrains Mono', monospace" }}>{score.score}</span>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>/ 100</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: cls.bg, color: cls.color }}>{cls.label}</span>
            </div>
            <div style={{ height: 4, background: '#F1F5F9', borderRadius: 99, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: score.score + '%', background: `linear-gradient(90deg, ${score.color}, ${score.color}88)`, borderRadius: 99 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, color: '#475569' }}>
              {[
                { label: 'Slot Value (views/slot)', value: c.slotValue, max: 40, color: '#7C3AED', desc: 'How much each ranking slot pays off' },
                { label: 'Total Views', value: c.views, max: 30, color: '#F59E0B', desc: 'Overall keyword viewership' },
                { label: 'Rank Position', value: c.position, max: 20, color: '#059669', desc: 'Best rank achievement' },
                { label: 'Frequency Breadth', value: c.frequency, max: 10, color: '#06B6D4', desc: 'Number of ranking slots' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                    <span>{item.label} <span style={{ color: '#94A3B8' }}>({item.desc})</span></span>
                    <span style={{ fontWeight: 700, color: item.color }}>{item.value}/{item.max}</span>
                  </div>
                    <div style={{ height: 3, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: (item.value / item.max) * 100 + '%', background: item.color, borderRadius: 99, opacity: 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8 }}>Data Freshness</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: fresh.color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: fresh.color }}>{fresh.label}</span>
              <span style={{ fontSize: 10, color: '#94A3B8' }}>{fmtRelative(kw.last_scraped)}</span>
            </div>
            <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1.5 }}>
              {fresh.hours < 24 ? 'Recently scraped — data is current and actionable.' :
               fresh.hours < 72 ? 'Scraped within 3 days — reasonably fresh.' :
               fresh.hours < 168 ? 'Over a week old — consider re-scraping.' :
               'Data is stale — re-scrape for accurate rankings.'}
            </div>
          </div>
        </div>

        <div>
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #F1F5F9', marginBottom: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0F172A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <BarChart2 size={12} style={{ color: '#1A73E8' }} /> Key Metrics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FAFBFC', border: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 3 }}>Slot Value</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#7C3AED', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(Math.round(sv))}</div>
                <div style={{ fontSize: 9.5, color: '#64748B', marginTop: 2 }}>avg views per ranking slot</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FAFBFC', border: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 3 }}>Format Mix</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1A73E8', fontFamily: "'JetBrains Mono', monospace" }}>{kw.long_form_count || 0}L / {kw.short_form_count || 0}S</div>
                <div style={{ fontSize: 9.5, color: '#64748B', marginTop: 2 }}>long vs short content</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FAFBFC', border: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 3 }}>Avg Views/Video</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#F59E0B', fontFamily: "'JetBrains Mono', monospace" }}>{fmt(avgViewsPerVideo)}</div>
                <div style={{ fontSize: 9.5, color: '#64748B', marginTop: 2 }}>per ranking video</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FAFBFC', border: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 3 }}>Category</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: TYPE_COLORS[kw.category] || '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{kw.category || 'generic'}</div>
                <div style={{ fontSize: 9.5, color: '#64748B', marginTop: 2 }}>{LANG_LABELS[kw.language] || kw.language}</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0F172A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Target size={12} style={{ color: score.cls.color }} /> {score.cls.label} Keyword Profile
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total Views', value: fmt(kw.total_views || 0), color: '#F59E0B', icon: Eye },
                { label: 'Frequency', value: String(kw.frequency || 0), color: '#06B6D4', icon: BarChart2 },
                { label: 'Best Rank', value: kw.best_rank ? `#${kw.best_rank}` : '--', color: '#059669', icon: Award },
                { label: 'Videos', value: String(videosCount), color: '#8B5CF6', icon: Video },
              ].map(m => (
                <div key={m.label} style={{ background: '#FAFBFC', borderRadius: 8, padding: '10px 12px', border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.2px', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <m.icon size={10} /> {m.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: cls.bg, border: `1px solid ${cls.color}30`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: cls.color, fontWeight: 600 }}>
                {cls.segment === 'star' ? 'High views + high slot value. Prioritize this keyword — it pays off per ranking slot.' :
                 cls.segment === 'volume' ? 'High views but diluted slot value. Popular keyword, but consider if the competition is worth it.' :
                 cls.segment === 'niche' ? 'Low views but high slot value. Efficient keyword — good for targeted, focused content.' :
                 'Low views + low slot value. Deprioritize — better opportunities exist elsewhere.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}