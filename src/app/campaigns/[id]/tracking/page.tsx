'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Radio, TrendingUp, Eye, Heart, MessageSquare,
  ExternalLink, RefreshCw, Clock, Play, Camera, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, MousePointer
} from 'lucide-react'
import { Toast } from '@/components/cp/CampaignUI'
import LinkAnalytics from '@/components/cp/LinkAnalytics'

interface Deliverable {
  id: string
  creator_id: string
  platform: string
  status: string
  live_link: string | null
  live_link_added_at: string | null
  tracking_started_at: string | null
  tracking_ends_at: string | null
  views: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number
  last_metrics_refresh: string | null
  creator: {
    id: string
    channel_name: string
    channel_url: string
    platform: string
  } | null
}

interface Campaign {
  name: string
  brand: string
  go_live_date: string
}

const PLATFORM_ICONS: Record<string, typeof Play> = {
  youtube_long: Play,
  youtube_shorts: Play,
  instagram_reels: Camera,
  instagram_stories: Camera,
  instagram_posts: Camera,
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube_long: '#FF0000',
  youtube_shorts: '#FF0000',
  instagram_reels: '#E4405F',
  instagram_stories: '#E4405F',
  instagram_posts: '#E4405F',
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube_long: 'YouTube Long',
  youtube_shorts: 'YouTube Shorts',
  instagram_reels: 'Instagram Reels',
  instagram_stories: 'Instagram Stories',
  instagram_posts: 'Instagram Posts',
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function TrackingPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const [loading, setLoading] = useState(true)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [tab, setTab] = useState<'metrics' | 'links'>('metrics')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    try {
      const [delRes, campRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}/deliverables`),
        fetch(`/api/campaigns/${campaignId}`),
      ])
      const delData = await delRes.json()
      const campData = await campRes.json()
      setDeliverables(delData.deliverables || [])
      setCampaign(campData.campaign || null)
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRefreshMetrics = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/metrics/refresh`, { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showToast(data.message || `Refreshed ${data.refreshed} deliverables`)
      fetchData()
    } catch {
      showToast('Failed to refresh metrics. Check YOUTUBE_API_KEY.', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  const liveDeliverables = deliverables.filter(d => d.tracking_started_at)
  const filteredDeliverables = platformFilter === 'all'
    ? liveDeliverables
    : liveDeliverables.filter(d => d.platform === platformFilter)

  // Aggregate metrics
  const totalViews = liveDeliverables.reduce((sum, d) => sum + (d.views || 0), 0)
  const totalLikes = liveDeliverables.reduce((sum, d) => sum + (d.likes || 0), 0)
  const totalComments = liveDeliverables.reduce((sum, d) => sum + (d.comments || 0), 0)
  const totalShares = liveDeliverables.reduce((sum, d) => sum + (d.shares || 0), 0)
  const avgEngagement = liveDeliverables.length > 0
    ? liveDeliverables.reduce((sum, d) => sum + (d.engagement_rate || 0), 0) / liveDeliverables.length
    : 0

  // Platform breakdown
  const platformStats = Object.keys(PLATFORM_LABELS).map(platform => {
    const items = liveDeliverables.filter(d => d.platform === platform)
    return {
      platform,
      label: PLATFORM_LABELS[platform],
      count: items.length,
      views: items.reduce((sum, d) => sum + (d.views || 0), 0),
      likes: items.reduce((sum, d) => sum + (d.likes || 0), 0),
    }
  }).filter(p => p.count > 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} />
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease both' }}>
      {/* Back */}
      <button
        onClick={() => router.push(`/campaigns/${campaignId}`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 16,
        }}
      >
        <ArrowLeft size={14} /> Back to overview
      </button>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="accent">Live</span> Tracking
          </h1>
          <p className="page-subtitle">
            {campaign ? `${campaign.name} — ${campaign.brand}` : 'Real-time performance metrics'}
          </p>
        </div>
        <button
          onClick={handleRefreshMetrics}
          disabled={refreshing}
          className="btn btn-ghost btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* Tab toggle */}
      <div className="tab-group" style={{ marginBottom: 20 }}>
        <button className="tab-btn" data-active={tab === 'metrics'} onClick={() => setTab('metrics')}>
          <Radio size={14} /> Metrics
        </button>
        <button className="tab-btn" data-active={tab === 'links'} onClick={() => setTab('links')}>
          <MousePointer size={14} /> Link Analytics
        </button>
      </div>

      {tab === 'metrics' ? (
        <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Views', value: formatNumber(totalViews), icon: Eye, color: 'var(--blue)', bg: 'var(--blue-dim)' },
          { label: 'Total Likes', value: formatNumber(totalLikes), icon: Heart, color: 'var(--red)', bg: 'var(--red-dim)' },
          { label: 'Comments', value: formatNumber(totalComments), icon: MessageSquare, color: 'var(--purple)', bg: 'rgba(124,58,237,0.06)' },
          { label: 'Shares', value: formatNumber(totalShares), icon: ArrowUpRight, color: 'var(--green)', bg: 'rgba(0,200,83,0.06)' },
          { label: 'Avg Engagement', value: `${avgEngagement.toFixed(2)}%`, icon: TrendingUp, color: 'var(--orange)', bg: 'rgba(255,109,0,0.06)' },
          { label: 'Live Posts', value: liveDeliverables.length.toString(), icon: Radio, color: '#06B6D4', bg: 'rgba(6,182,212,0.06)' },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: kpi.bg }}>
                <Icon size={18} style={{ color: kpi.color }} />
              </div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          )
        })}
      </div>

      {/* Platform Breakdown */}
      {platformStats.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 16 }}>
            Platform Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {platformStats.map(p => {
              const Icon = PLATFORM_ICONS[p.platform] || Play
              const color = PLATFORM_COLORS[p.platform] || '#94A3B8'
              return (
                <div key={p.platform} style={{
                  background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px',
                  border: `1.5px solid ${color}20`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Icon size={16} style={{ color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{p.label}</span>
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, fontWeight: 700, color,
                      background: `${color}12`, padding: '2px 8px', borderRadius: 10,
                    }}>
                      {p.count}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-bright)' }}>{formatNumber(p.views)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Views</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-bright)' }}>{formatNumber(p.likes)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Likes</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Platform Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => setPlatformFilter('all')}
          className={`toggle-btn ${platformFilter === 'all' ? 'active' : ''}`}
        >
          All Platforms
        </button>
        {Object.keys(PLATFORM_LABELS).map(platform => {
          const count = liveDeliverables.filter(d => d.platform === platform).length
          if (count === 0) return null
          return (
            <button
              key={platform}
              onClick={() => setPlatformFilter(platform)}
              className={`toggle-btn ${platformFilter === platform ? 'active' : ''}`}
            >
              {PLATFORM_LABELS[platform]} ({count})
            </button>
          )
        })}
      </div>

      {/* Deliverables Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Creator</th>
              <th>Platform</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Views</th>
              <th style={{ textAlign: 'right' }}>Likes</th>
              <th style={{ textAlign: 'right' }}>Comments</th>
              <th style={{ textAlign: 'right' }}>Engagement</th>
              <th>Live Link</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliverables.map(d => {
              const Icon = PLATFORM_ICONS[d.platform] || Play
              const color = PLATFORM_COLORS[d.platform] || '#94A3B8'
              return (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'var(--blue-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#FFF', fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {d.creator?.channel_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.creator?.channel_name || 'Unknown'}</div>
                        {d.creator?.channel_url && (
                          <a
                            href={d.creator.channel_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 10, color: 'var(--text-muted)', textDecoration: 'none' }}
                          >
                            View channel →
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={14} style={{ color }} />
                      <span style={{ fontSize: 12 }}>{PLATFORM_LABELS[d.platform] || d.platform}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-green" style={{ fontSize: 10 }}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {formatNumber(d.views)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {formatNumber(d.likes)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {formatNumber(d.comments)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                      color: d.engagement_rate > 5 ? 'var(--green)' : d.engagement_rate > 2 ? 'var(--orange)' : 'var(--text-secondary)',
                    }}>
                      {d.engagement_rate?.toFixed(2) || '0.00'}%
                    </span>
                  </td>
                  <td>
                    {d.live_link ? (
                      <a
                        href={d.live_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={11} />
                        View
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {timeAgo(d.last_metrics_refresh)}
                  </td>
                </tr>
              )
            })}
            {filteredDeliverables.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  {liveDeliverables.length === 0
                    ? 'No live deliverables yet. Add a live link to start tracking.'
                    : 'No deliverables match the selected filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      ) : (
        <div className="card">
          <LinkAnalytics campaignId={campaignId} />
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
