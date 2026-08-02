'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, AreaChart, Area, Legend
} from 'recharts'
import {
  Video, Search, Eye, Clock, Tag, ExternalLink, Download, Loader2,
  ChevronLeft, ChevronRight, ChevronDown, Plus, X, Link2, TrendingUp, TrendingDown,
  Hash, User, Star, Filter, Check, Info, BarChart2, Play, Award, Zap
} from 'lucide-react'
import Link from 'next/link'
import { useCampaignStore } from '@/lib/store'
import { useFilterStore } from '@/lib/filter-store'
import { brandColor } from '@/lib/brand-colors'

const C = [
  '#4C78A8', '#54A24B', '#E45756', '#2F7D7A', '#B45309',
  '#7E4D74', '#C94A5E', '#9D755D', '#6B645C', '#A8476F',
  '#CC5800', '#0284C7', '#10B981', '#D97706', '#8B5CF6',
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

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function fmtGain(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n) || n === 0) return ''
  const prefix = n > 0 ? '+' : ''
  if (Math.abs(n) >= 1e7) return `${prefix}${(n / 1e7).toFixed(1)} Cr`
  if (Math.abs(n) >= 1e5) return `${prefix}${(n / 1e5).toFixed(1)} L`
  if (Math.abs(n) >= 1e3) return `${prefix}${(n / 1e3).toFixed(1)}K`
  return `${prefix}${n.toLocaleString()}`
}

function fmtDuration(iso: string | null): string {
  if (!iso) return ''
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return ''
  const h = m[1] ? parseInt(m[1]) : 0
  const min = m[2] ? parseInt(m[2]) : 0
  const sec = m[3] ? parseInt(m[3]) : 0
  return h > 0 ? `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${min}:${String(sec).padStart(2, '0')}`
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso + 'Z')
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function Rank({ n }: { n: number }) {
  const c = n <= 3 ? '#059669' : n <= 5 ? '#1A73E8' : n <= 10 ? '#7C3AED' : '#D97706'
  const bg = n <= 3 ? 'rgba(5,150,105,0.08)' : n <= 5 ? 'rgba(26,115,232,0.08)' : n <= 10 ? 'rgba(124,58,237,0.08)' : 'rgba(217,119,6,0.08)'
  return <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: bg, color: c, whiteSpace: 'nowrap' }}>#{n}</span>
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
}
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export default function VideosTab() {
  const { activeCampaignId, campaigns } = useCampaignStore()
  // Format/ownership live in the shared store so the global SharedFilterBar and
  // this tab's own controls stay in sync instead of silently diverging.
  const {
    format: formatTab, setFormat: setFormatTab,
    ownership: ownershipFilter, setOwnership: setOwnershipFilter,
  } = useFilterStore()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [sort, setSort] = useState<'views' | 'rank' | 'date' | 'engagement'>('views')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)

  const [showAddUrl, setShowAddUrl] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addTags, setAddTags] = useState('')
  const [addingVideo, setAddingVideo] = useState(false)
  const [addResult, setAddResult] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [editingTags, setEditingTags] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [togglingOwnership, setTogglingOwnership] = useState<string | null>(null)
  const [gainMap, setGainMap] = useState<Record<string, { daily_gain: number | null; latest_views: number }>>({})

  const limit = 20
  const campaign = campaigns.find(c => c.id === activeCampaignId)

  useEffect(() => { setPage(1) }, [debouncedSearch, formatTab, ownershipFilter])

  const analyticsQuery = useQuery({
    queryKey: ['videos-analytics', activeCampaignId, formatTab, ownershipFilter],
    queryFn: async () => {
      if (!activeCampaignId) return null
      const params = new URLSearchParams({ campaign_id: activeCampaignId, format: formatTab, is_ours: ownershipFilter === 'ours' ? 'true' : ownershipFilter === 'theirs' ? 'false' : 'all' })
      const res = await fetch(`/api/videos/analytics?${params}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!activeCampaignId,
    staleTime: 30000,
  })

  const analytics = analyticsQuery.data
  const summary = analytics?.summary

  const leaderboardQuery = useQuery({
    queryKey: ['videos-leaderboard', activeCampaignId, page, sort, debouncedSearch, formatTab, ownershipFilter],
    queryFn: async () => {
      if (!activeCampaignId) return { data: [], total: 0 }
      const params = new URLSearchParams({
        campaign_id: activeCampaignId, sort, page: String(page), limit: String(limit),
      })
      if (formatTab !== 'all') params.set('tab', formatTab)
      if (ownershipFilter !== 'all') params.set('is_ours', ownershipFilter === 'ours' ? 'true' : 'false')
      if (debouncedSearch) params.set('q', debouncedSearch)
      const res = await fetch(`/api/videos/leaderboard?${params}`)
      if (!res.ok) return { data: [], total: 0 }
      return res.json()
    },
    enabled: !!activeCampaignId,
  })

  const videos = leaderboardQuery.data?.data ?? []
  const total = leaderboardQuery.data?.total ?? 0
  const loading = leaderboardQuery.isLoading
  const totalPages = Math.ceil(total / limit)

  const fetchDailyGain = useCallback(async (videoIds: string[], campId: string) => {
    if (!videoIds.length || !campId) return
    try {
      const res = await fetch('/api/videos/batch-snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_ids: videoIds, campaign_id: campId }),
      })
      const d = await res.json()
      if (d.data) setGainMap(d.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (activeCampaignId && videos.length > 0) {
      const ids = videos.map((v: any) => v.id).filter(Boolean)
      fetchDailyGain(ids, activeCampaignId)
    }
  }, [videos, activeCampaignId, fetchDailyGain])

  const addVideoByUrl = async () => {
    if (!activeCampaignId || !addUrl.trim()) return
    setAddingVideo(true); setAddResult(null)
    try {
      const tags = addTags.split(',').map(t => t.trim()).filter(Boolean)
      const res = await fetch('/api/videos/add-by-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: addUrl, campaign_id: activeCampaignId, tags }),
      })
      const d = await res.json()
      if (res.ok) {
        setAddResult({ msg: d.message || 'Video added!', type: 'success' })
        setAddUrl(''); setAddTags('')
        setTimeout(() => { setAddResult(null); setShowAddUrl(false) }, 1500)
        setPage(1); leaderboardQuery.refetch()
      } else setAddResult({ msg: d.error || 'Failed', type: 'error' })
    } catch { setAddResult({ msg: 'Network error', type: 'error' }) }
    finally { setAddingVideo(false) }
  }

  const toggleOwnership = async (videoId: string, current: boolean) => {
    if (!activeCampaignId) return
    setTogglingOwnership(videoId)
    try {
      await fetch('/api/videos/ownership', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, is_ours: !current, campaign_id: activeCampaignId }),
      })
      leaderboardQuery.refetch()
    } catch { /* ignore */ }
    finally { setTogglingOwnership(null) }
  }

  const saveTags = async (youtubeId: string, tags: string[]) => {
    if (!activeCampaignId) return
    try {
      await fetch('/api/videos/tags', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_id: youtubeId, tags, campaign_id: activeCampaignId }),
      })
      leaderboardQuery.refetch()
      setEditingTags(null)
    } catch { /* ignore */ }
  }

  const handleExport = async () => {
    if (!activeCampaignId) return
    try {
      const params = new URLSearchParams({ campaign_id: activeCampaignId, limit: '10000', sort })
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (formatTab !== 'all') params.set('tab', formatTab)
      if (ownershipFilter !== 'all') params.set('is_ours', ownershipFilter === 'ours' ? 'true' : 'false')
      const res = await fetch(`/api/videos/leaderboard?${params}`)
      const d = await res.json()
      const allVideos = d.data || []
      const headers = 'Title,Channel,Views,Engagement Rate,Duration,Rank,Keywords,Brand Tags,Published,Ownership'
      const rows = allVideos.map((v: any) => [
        `"${(v.title || '').replace(/"/g, '""')}"`, `"${v.channel_name || ''}"`,
        String(v.view_count || 0), String(v.engagement_rate || ''),
        `"${v.duration || ''}"`, String(v.best_rank || ''),
        String(v.keyword_count || 0),
        `"${(v.brands || []).join(', ')}"`,
        v.published_at || '', v.is_ours ? 'Yes' : 'No',
      ])
      const blob = new Blob([headers + '\n' + rows.map((r: any[]) => r.join(',')).join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'campaign_videos.csv'; a.click()
    } catch { /* ignore */ }
  }

  const viewsDistData = useMemo(() => {
    if (!analytics?.views_distribution) return []
    return analytics.views_distribution.map((d: any) => ({ name: d.range, count: d.count }))
  }, [analytics])

  const durationDistData = useMemo(() => {
    if (!analytics?.duration_distribution) return []
    return analytics.duration_distribution.map((d: any) => ({ name: d.range, count: d.count }))
  }, [analytics])

  const channelTop10Data = useMemo(() => {
    if (!analytics?.channel_top10) return []
    return analytics.channel_top10.map((c: any) => ({
      channel: c.channel.length > 16 ? c.channel.slice(0, 16) + '...' : c.channel,
      videos: c.video_count,
      views: c.total_views,
    }))
  }, [analytics])

  const brandCoverageData = useMemo(() => {
    if (!analytics?.brand_coverage) return []
    return [
      { name: 'Tagged', value: analytics.brand_coverage.tagged, fill: '#1A73E8' },
      { name: 'Untagged', value: analytics.brand_coverage.untagged, fill: '#E2E8F0' },
    ]
  }, [analytics])

  const discoveryData = useMemo(() => {
    if (!analytics?.discovery_timeline) return []
    return analytics.discovery_timeline.map((d: any) => ({ week: d.week, count: d.count }))
  }, [analytics])

  const formatSplit = useMemo(() => {
    if (!summary) return null
    const total = summary.long_form_count + summary.short_form_count
    return {
      long: summary.long_form_count,
      short: summary.short_form_count,
      longPct: total > 0 ? Math.round((summary.long_form_count / total) * 100) : 0,
      shortPct: total > 0 ? Math.round((summary.short_form_count / total) * 100) : 0,
    }
  }, [summary])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            Video Analytics Intelligence
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Deep analytics on video performance, engagement metrics, channel distribution, and brand coverage.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowAddUrl(v => !v)} className="btn btn-sm" style={{ background: 'linear-gradient(135deg, #059669, #10B981)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700 }}>
            <Plus size={13} /> Add Video
          </button>
          <button onClick={handleExport} className="btn btn-ghost btn-sm" style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700 }}>
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Add Video by URL */}
      {showAddUrl && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <div style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', borderRadius: 12, padding: 16, border: '1.5px solid #A7F3D0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link2 size={14} /> Add Video by YouTube URL
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <input className="input" placeholder="https://youtube.com/watch?v=..." value={addUrl} onChange={e => setAddUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addVideoByUrl()} style={{ flex: 1 }} />
              <input className="input" placeholder="Brand tags (comma separated)" value={addTags} onChange={e => setAddTags(e.target.value)} style={{ width: 220 }} />
            </div>
            {addResult && <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: addResult.type === 'success' ? '#059669' : '#DC2626' }}>{addResult.msg}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={addVideoByUrl} disabled={addingVideo || !addUrl.trim()} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6 }}>
                {addingVideo ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />} Add
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddUrl(false)} style={{ border: '1px solid #D1D5DB', borderRadius: 6 }}><X size={12} /> Cancel</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Metric Cards */}
      <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <motion.div variants={fadeUp}>
          <MetricCard label="Total Videos" value={summary?.total_videos ?? '—'} icon={Video} color="#1A73E8" sub={`${summary?.our_videos_count ?? 0} ours`} info="Total number of videos discovered and tracked for this campaign." />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard label="Total Views" value={fmtIndian(summary?.total_views)} icon={Eye} color="#059669" sub={`Avg ${fmtIndian(summary?.avg_views)}`} info="Combined view count across all tracked videos." />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard label="Avg Views" value={fmtIndian(summary?.avg_views)} icon={TrendingUp} color="#7C3AED" sub={`Median ${fmtIndian(summary?.median_views)}`} info="Average view count per video. Median shown for comparison." />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard label="Engagement Rate" value={summary?.avg_engagement_rate != null ? `${(summary.avg_engagement_rate * 100).toFixed(2)}%` : '—'} icon={Star} color="#F59E0B" sub="Avg likes + comments / views" info="Average engagement rate across all videos." />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard label="Transcript Coverage" value={summary?.transcript_coverage_pct != null ? `${Math.round(summary.transcript_coverage_pct)}%` : '—'} icon={Tag} color="#EC4899" sub="Videos with transcripts" info="Percentage of videos with transcript data available." />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard label="Multi-Keyword" value={summary?.multi_keyword_count ?? '—'} icon={Hash} color="#8B5CF6" sub="Videos on 2+ keywords" info="Videos appearing for multiple tracked keywords — broader visibility." />
        </motion.div>
      </motion.div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Views Distribution */}
        <Card title="Views Distribution" sub="Histogram of video view counts" height={240}
          info="Shows how many videos fall into each view count range.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={viewsDistData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechartsTooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  if (!d) return null
                  return (
                    <div style={{ background: '#0F172A', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', minWidth: 160 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#FFF', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Range: {d.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Videos</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>{d.count}</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} fill="#1A73E8" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Duration Distribution */}
        <Card title="Duration Distribution" sub="Video length frequency breakdown" height={240}
          info="Distribution of video durations — helps understand optimal content length.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={durationDistData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechartsTooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  if (!d) return null
                  return (
                    <div style={{ background: '#0F172A', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', minWidth: 160 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#FFF', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Duration: {d.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Videos</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>{d.count}</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" radius={[5, 5, 0, 0]} fill="#7C3AED" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Channel Contribution */}
        <Card title="Channel Contribution" sub="Top 10 channels by video count" height={240}
          info="Which channels produce the most content in this campaign.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={channelTop10Data} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="channel" tick={{ fontSize: 10, fill: '#0F172A', fontWeight: 600 }} axisLine={false} tickLine={false} width={110} />
              <RechartsTooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  if (!d) return null
                  return (
                    <div style={{ background: '#0F172A', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', minWidth: 180 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#FFF', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{label}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Videos</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>{d.videos}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Total Views</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399' }}>{fmt(d.views)}</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="videos" radius={[0, 5, 5, 0]} maxBarSize={18}>
                {channelTop10Data.map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Brand Coverage Pie */}
        <Card title="Brand Coverage" sub="Tagged vs untagged video split" height={240}
          info="Percentage of videos that have brand tags assigned.">
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ flex: 1, height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandCoverageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {brandCoverageData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      if (!d) return null
                      const total = brandCoverageData.reduce((s, e) => s + e.value, 0)
                      return (
                        <div style={{ background: '#0F172A', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', minWidth: 140 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#FFF', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{d.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Count</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>{d.value}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 10.5, color: '#94A3B8' }}>%</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: d.fill }}>{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                          </div>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 16 }}>
              {brandCoverageData.map((entry: any) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: entry.fill, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{entry.name}</div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>{entry.value} videos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Discovery Timeline */}
      <Card title="Discovery Timeline" sub="Videos discovered per week" height={220}
        info="When videos were first indexed — shows discovery velocity over time.">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={discoveryData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="discGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1A73E8" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#1A73E8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 9.5, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9.5, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <RechartsTooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null
                return (
                  <div style={{ background: '#0F172A', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', minWidth: 160 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#FFF', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Week: {label}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10.5, color: '#94A3B8' }}>Videos Found</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#FFF' }}>{payload[0]?.value}</span>
                    </div>
                  </div>
                )
              }}
            />
            <Area type="monotone" dataKey="count" stroke="#1A73E8" strokeWidth={2} fill="url(#discGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Format Split Bar */}
      {formatSplit && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Format Split</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Long-form vs Short-form video distribution</div>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: '#1A73E8' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>Long-Form <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: '#0F172A' }}>{formatSplit.long}</span></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: '#7C3AED' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>Shorts <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: '#0F172A' }}>{formatSplit.short}</span></span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 3, height: 28, borderRadius: 8, overflow: 'hidden' }}>
            {formatSplit.longPct > 0 && (
              <div style={{ flex: formatSplit.longPct, background: '#1A73E8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'flex 0.4s ease' }}>
                {formatSplit.longPct >= 10 && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#FFF' }}>{formatSplit.longPct}%</span>}
              </div>
            )}
            {formatSplit.shortPct > 0 && (
              <div style={{ flex: formatSplit.shortPct, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'flex 0.4s ease' }}>
                {formatSplit.shortPct >= 10 && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#FFF' }}>{formatSplit.shortPct}%</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Leaderboard */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Video Leaderboard</div>
            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{total} videos tracked. Click to expand details.</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Format Toggle */}
            <div style={{ display: 'flex', gap: 3, background: '#F1F5F9', padding: 3, borderRadius: 10 }}>
              {[
                { id: 'long', label: 'Long-Form' },
                { id: 'short', label: 'Shorts' },
                { id: 'all', label: 'All' },
              ].map(tab => (
                <button key={tab.id} onClick={() => { setFormatTab(tab.id as any); setPage(1) }}
                  style={{ padding: '4px 12px', borderRadius: 8, border: 'none', background: formatTab === tab.id ? '#1A73E8' : '#F8FAFC', color: formatTab === tab.id ? '#FFF' : '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 18, background: '#E2E8F0' }} />

            {/* Sort */}
            <select className="input" value={sort} onChange={e => { setSort(e.target.value as any); setPage(1) }}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 700, minWidth: 100 }}>
              <option value="views">By Views</option>
              <option value="rank">By Rank</option>
              <option value="date">Recent</option>
              <option value="engagement">Engagement</option>
            </select>

            <div style={{ width: 1, height: 18, background: '#E2E8F0' }} />

            {/* Search */}
            <div style={{ position: 'relative', minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input className="input" placeholder="Search videos..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 12, padding: '6px 10px 6px 32px' }} />
            </div>

            <button onClick={() => setShowFilters(v => !v)} className="btn btn-ghost btn-sm"
              style={{ borderColor: showFilters ? '#1A73E8' : '#E2E8F0', color: showFilters ? '#1A73E8' : '#64748B', border: '1px solid', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
              <Filter size={12} /> Filters
              {ownershipFilter !== 'all' && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A73E8', marginLeft: 4 }} />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 12, alignItems: 'flex-end', background: '#F8FAFC' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Ownership</div>
              <select className="input" value={ownershipFilter} onChange={e => { setOwnershipFilter(e.target.value as any); setPage(1) }}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 600 }}>
                <option value="all">All Videos</option>
                <option value="ours">Our Videos</option>
                <option value="theirs">Not Ours</option>
              </select>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setOwnershipFilter('all'); setPage(1) }}
              style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700 }}>Clear Filters</button>
          </div>
        )}

        {/* Leaderboard Table */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: '#94A3B8' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Loading...
          </div>
        ) : videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
            <Video size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>No videos found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  {['#', 'Video', 'Views', 'Daily Δ', 'Rank', 'KW', 'Engagement', 'Brands', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: h === '#' || h === 'Rank' || h === 'KW' || h === 'Action' ? 'center' : 'left', fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', background: '#F8FAFC' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {videos.map((v: any, i: number) => {
                  const isExpanded = expandedVideo === v.youtube_id
                  const tags = v.brands || v.tags || []
                  const gain = gainMap[v.id]
                  const isEditing = editingTags === v.youtube_id
                  return (
                    <React.Fragment key={v.id || v.youtube_id}>
                      <tr
                        style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: isExpanded ? '#F8FAFC' : v.is_ours ? 'rgba(5,150,105,0.03)' : 'transparent' }}
                        onClick={() => setExpandedVideo(isExpanded ? null : v.youtube_id)}
                        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#F8FAFC' }}
                        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = isExpanded ? '#F8FAFC' : v.is_ours ? 'rgba(5,150,105,0.03)' : 'transparent' }}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, fontSize: 12, color: C[i % C.length] }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            #{(page - 1) * limit + i + 1}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Link href={`/video/${v.youtube_id}`} style={{ flexShrink: 0, textDecoration: 'none' }}>
                              <div style={{ position: 'relative' }}>
                                <img src={v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                                  alt="" style={{ width: 80, height: 45, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
                                {v.is_short && <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 7, fontWeight: 700, background: '#DC2626', color: '#fff', padding: '1px 4px', borderRadius: 3 }}>SHORT</span>}
                                {v.best_rank && v.best_rank <= 3 && (
                                  <span style={{ position: 'absolute', top: 2, left: 2, fontSize: 8, fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: 3, border: '1px solid #FDE68A' }}>#{v.best_rank}</span>
                                )}
                              </div>
                            </Link>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <Link href={`/video/${v.youtube_id}`} style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                                {v.title}
                              </Link>
                              <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><User size={10} /> {v.channel_name}</span>
                                {v.duration && <span><Clock size={10} style={{ verticalAlign: -1 }} /> {fmtDuration(v.duration)}</span>}
                                {v.published_at && <span>· {fmtRelative(v.published_at)}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono',monospace" }}>
                          {fmtIndian(v.view_count || gain?.latest_views)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {gain?.daily_gain != null && gain.daily_gain !== 0 ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: gain.daily_gain > 0 ? '#059669' : '#DC2626', fontFamily: "'JetBrains Mono',monospace" }}>
                              {gain.daily_gain > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                              {fmtGain(gain.daily_gain)}
                            </span>
                          ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {v.best_rank ? <Rank n={v.best_rank} /> : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#334155' }}>
                          {v.keyword_count || 0}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {v.engagement_rate != null ? (
                            <span style={{ fontSize: 11, fontWeight: 700, color: v.engagement_rate > 0.05 ? '#059669' : v.engagement_rate > 0.02 ? '#1A73E8' : '#F59E0B', fontFamily: "'JetBrains Mono',monospace" }}>
                              {(v.engagement_rate * 100).toFixed(1)}%
                            </span>
                          ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {tags.slice(0, 2).map((tag: string) => (
                              <span key={tag} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: `${brandColor(tag)}15`, color: brandColor(tag) }}>{tag}</span>
                            ))}
                            {tags.length > 2 && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#F1F5F9', color: '#64748B' }}>+{tags.length - 2}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <a href={`https://youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#94A3B8', padding: 4, display: 'inline-flex' }} title="Open on YouTube"
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink size={13} />
                          </a>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr style={{ background: '#F8FAFC' }}>
                          <td colSpan={9} style={{ padding: '14px 20px 18px' }}>
                            <div style={{ display: 'flex', gap: 14 }}>
                              {/* Thumbnail large */}
                              <div style={{ flexShrink: 0 }}>
                                <div style={{ position: 'relative', width: 200, borderRadius: 8, overflow: 'hidden', background: '#F1F5F9' }}>
                                  <img src={v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`}
                                    alt="" style={{ width: '100%', height: 112, objectFit: 'cover', display: 'block' }} />
                                  {v.is_short && <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: 800, background: '#DC2626', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>SHORT</span>}
                                  {v.best_rank && <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 9, fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 4, border: '1px solid #FDE68A' }}>#{v.best_rank}</span>}
                                </div>
                              </div>

                              {/* Details */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* KPI strip */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                  {[
                                    { icon: Eye, label: 'Views', value: fmtIndian(v.view_count || gain?.latest_views), color: '#1A73E8' },
                                    { icon: Star, label: 'Engagement', value: v.engagement_rate != null ? `${(v.engagement_rate * 100).toFixed(2)}%` : '—', color: '#F59E0B' },
                                    { icon: Hash, label: 'Keywords', value: v.keyword_count || 0, color: '#8B5CF6' },
                                    { icon: Clock, label: 'Duration', value: fmtDuration(v.duration) || '—', color: '#059669' },
                                    { icon: TrendingUp, label: 'Daily Δ', value: gain?.daily_gain != null ? fmtGain(gain.daily_gain) : '—', color: gain?.daily_gain != null && gain.daily_gain > 0 ? '#059669' : gain?.daily_gain != null && gain.daily_gain < 0 ? '#DC2626' : '#94A3B8' },
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

                                {/* Ownership + Brand tags */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                                  <button onClick={() => toggleOwnership(v.id, v.is_ours)} disabled={togglingOwnership === v.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                      background: v.is_ours ? '#DCFCE7' : '#F1F5F9', color: v.is_ours ? '#16A34A' : '#64748B', fontFamily: 'inherit' }}>
                                    {togglingOwnership === v.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : v.is_ours ? <><Check size={11} /> Ours</> : 'Mark Ours'}
                                  </button>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                    {isEditing ? (
                                      <>
                                        <input autoFocus value={tagInput} onChange={e => setTagInput(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') saveTags(v.youtube_id, tagInput.split(',').map(t => t.trim()).filter(Boolean)); if (e.key === 'Escape') setEditingTags(null) }}
                                          style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, border: '1px solid #1A73E8', outline: 'none', width: 180 }} placeholder="Brand1, Brand2" />
                                        <button onClick={() => saveTags(v.youtube_id, tagInput.split(',').map(t => t.trim()).filter(Boolean))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', padding: 2 }}><Check size={12} /></button>
                                        <button onClick={() => setEditingTags(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}><X size={12} /></button>
                                      </>
                                    ) : (
                                      <>
                                        {tags.map((tag: string) => (
                                          <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${brandColor(tag)}18`, color: brandColor(tag) }}>{tag}</span>
                                        ))}
                                        <button onClick={() => { setEditingTags(v.youtube_id); setTagInput(tags.join(', ')) }}
                                          style={{ width: 20, height: 20, borderRadius: 4, border: '1px dashed #CBD5E1', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                          <Plus size={10} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Extra details */}
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                                  {v.like_count != null && (
                                    <div style={{ fontSize: 10.5, color: '#64748B' }}><strong style={{ color: '#334155' }}>Likes:</strong> {v.like_count.toLocaleString()}</div>
                                  )}
                                  {v.comment_count != null && (
                                    <div style={{ fontSize: 10.5, color: '#64748B' }}><strong style={{ color: '#334155' }}>Comments:</strong> {v.comment_count.toLocaleString()}</div>
                                  )}
                                  {v.transcript_status && (
                                    <div style={{ fontSize: 10.5, color: '#64748B' }}><strong style={{ color: '#334155' }}>Transcript:</strong> {v.transcript_status}</div>
                                  )}
                                  {v.first_seen_at && (
                                    <div style={{ fontSize: 10.5, color: '#64748B' }}><strong style={{ color: '#334155' }}>First Seen:</strong> {new Date(v.first_seen_at).toLocaleDateString()}</div>
                                  )}
                                </div>

                                {/* Keywords appeared */}
                                {v.keywords_appeared && v.keywords_appeared.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', marginRight: 4 }}>Keywords:</span>
                                    {v.keywords_appeared.map((kw: string) => (
                                      <span key={kw} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#EFF6FF', color: '#1D4ED8' }}>{kw}</span>
                                    ))}
                                  </div>
                                )}

                                {/* View details link */}
                                <a href={`/video/${v.youtube_id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 11, fontWeight: 700, color: '#1A73E8', textDecoration: 'none' }}>
                                  View Full Details <ExternalLink size={12} />
                                </a>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 20px', borderTop: '1px solid #E2E8F0' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}