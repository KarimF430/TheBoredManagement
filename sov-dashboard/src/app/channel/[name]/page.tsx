'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ExternalLink, Eye, Play, Award, Star, LayoutGrid,
  TrendingUp, ThumbsUp, Video, Tv,
  BarChart3, Search, Zap
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { useCampaignStore } from '@/lib/store'
import { LoadingState } from '@/components/StateViews'

const C = [
  '#4C78A8', '#54A24B', '#E45756', '#2F7D7A', '#B45309',
  '#7E4D74', '#C94A5E', '#9D755D', '#6B645C', '#A8476F',
  '#CC5800', '#4C78A8', '#54A24B', '#E45756', '#2F7D7A',
  '#1D6BD6', '#3E8E5F', '#C4643A', '#8A63A8', '#A16207',
]

function brandColor(name: string, idx: number): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return C[Math.abs(hash) % C.length]
}

function fmtNum(n: number | null | undefined) {
  if (!n) return '—'
  if (n >= 1_00_00_000) return (n / 1_00_00_000).toFixed(2) + ' Cr'
  if (n >= 1_00_000) return (n / 1_00_000).toFixed(1) + ' L'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString('en-IN')
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ChannelDetailPage() {
  const { name } = useParams<{ name: string }>()
  const decodedName = decodeURIComponent(name)
  const router = useRouter()
  const { activeCampaignId } = useCampaignStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!decodedName) return
    setLoading(true)
    const url = `/api/channel/${encodeURIComponent(decodedName)}${activeCampaignId ? `?campaign_id=${activeCampaignId}` : ''}`
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load channel details'))
      .finally(() => setLoading(false))
  }, [decodedName, activeCampaignId])

  if (loading) return (
    <LoadingState title="Loading channel profile…" />
  )

  const isDemo = !!error || !data
  const d = isDemo ? {
    channelName: decodedName, channelId: 'UCdemo', videoCount: 14, totalViews: 2180000,
    avgViews: 155714, bestRank: 1, sovPercent: 8.2, totalLikes: 125000,
    videos: [
      { youtube_id: 'd1', title: 'Best Water Purifier 2026 — Ultimate Buying Guide', view_count: 850000, like_count: 42000, is_short: false, best_rank: 1, keyword_count: 4, published_at: '2026-01-15', keywords: [{ text: 'best water purifier 2026', rank: 1 }, { text: 'water purifier buying guide', rank: 2 }, { text: 'ro purifier comparison', rank: 3 }], brands: ['Aquaguard', 'KENT RO', 'Livpure'] },
      { youtube_id: 'd2', title: 'Aquaguard vs KENT RO Comparison', view_count: 620000, like_count: 31000, is_short: false, best_rank: 2, keyword_count: 3, published_at: '2026-02-03', keywords: [{ text: 'aquaguard vs kent', rank: 2 }, { text: 'best ro purifier', rank: 4 }], brands: ['Aquaguard', 'KENT RO'] },
      { youtube_id: 'd3', title: 'Top 5 RO Purifiers Under ₹15000', view_count: 320000, like_count: 18000, is_short: false, best_rank: 3, keyword_count: 2, published_at: '2026-02-18', keywords: [{ text: 'water purifier price list', rank: 3 }], brands: ['Livpure'] },
      { youtube_id: 'd4', title: 'How to clean your RO filter #shorts', view_count: 150000, like_count: 9500, is_short: true, best_rank: 5, keyword_count: 1, published_at: '2026-03-01', keywords: [{ text: 'ro water filter maintenance', rank: 5 }], brands: [] },
      { youtube_id: 'd5', title: 'Is Copper RO really worth it?', view_count: 120000, like_count: 7200, is_short: false, best_rank: 8, keyword_count: 2, published_at: '2026-03-10', keywords: [{ text: 'copper ro purifier', rank: 8 }], brands: ['Aquaguard'] },
    ],
    keywords: [
      { text: 'best water purifier 2026', rank: 1, video_count: 2 },
      { text: 'water purifier buying guide', rank: 2, video_count: 1 },
      { text: 'aquaguard vs kent', rank: 3, video_count: 1 },
      { text: 'ro water filter maintenance', rank: 4, video_count: 2 },
      { text: 'water purifier price list', rank: 7, video_count: 1 },
    ],
    brands: ['Aquaguard', 'KENT RO', 'Livpure']
  } : data

  const { channelName, channelId, videoCount, totalViews, avgViews, bestRank, sovPercent, totalLikes, videos, keywords, brands } = d
  const signal = avgViews > 150_000 ? { label: 'Premium creator', color: 'var(--success-text)', bg: 'var(--success-dim)', border: 'var(--success-border)', icon: <Star size={12} /> }
    : avgViews > 80_000 ? { label: 'Strong creator', color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'var(--accent-border)', icon: <Zap size={12} /> }
    : avgViews > 40_000 ? { label: 'Growing creator', color: 'var(--warning-text)', bg: 'var(--warning-dim)', border: 'var(--warning-border)', icon: <TrendingUp size={12} /> }
    : { label: 'Emerging creator', color: 'var(--text-muted)', bg: 'var(--bg-hover)', border: 'var(--border-light)', icon: <Play size={12} /> }

  const chartData = videos.slice(0, 8).map((v: any, i: number) => ({
    name: v.title.length > 24 ? v.title.slice(0, 24) + '…' : v.title,
    views: v.view_count,
    fill: C[i % C.length],
  }))

  return (
    <div className="page-wrapper anim-fade-up">
      {isDemo && (
        <div className="demo-banner" style={{ marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--fs-h1)' }}>🧪</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--accent)' }}>Demo mode — Sample creator profile</div>
            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--accent)', marginTop: 1, lineHeight: 1.5 }}>
              This channel was not found in the database. Showing reference layout and metrics for a hypothetical top-tier creator.
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <Link href="/" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={13} style={{ marginRight: 4 }} /> Back to dashboard
        </Link>
        <span style={{ color: 'var(--neutral-300)', fontSize: 'var(--fs-sm)' }}>›</span>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>Creator profile</span>
      </div>

      {/* Profile Header */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          width: 88, height: 88, borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--accent), var(--info))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'var(--fs-display)', fontWeight: 800, color: 'var(--surface)', flexShrink: 0,
          boxShadow: '0 8px 28px var(--blue-glow)',
        }}>
          {channelName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'var(--fs-display)', fontWeight: 800, color: 'var(--text-bright)', margin: 0, letterSpacing: '-0.5px' }}>
              {channelName}
            </h1>
            <span className="badge" style={{ background: signal.bg, color: signal.color, border: `1px solid ${signal.border}`, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 'var(--fs-label)', fontWeight: 700 }}>
              {signal.icon} {signal.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Video size={14} /> {videoCount} campaign videos</span>
            <span style={{ color: 'var(--border-medium)' }}>·</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Search size={14} /> {keywords?.length || 0} search queries</span>
            {sovPercent && <>
              <span style={{ color: 'var(--border-medium)' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: 'var(--accent)' }}><BarChart3 size={14} /> {sovPercent}% SOV</span>
            </>}
          </div>
        </div>
        {channelId && (
          <a href={`https://youtube.com/channel/${channelId}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ padding: '10px 18px', fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--danger-text)', background: 'var(--danger-dim)', border: '1px solid var(--danger-border)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Tv size={16} /> View on YouTube <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid-kpi" style={{ marginBottom: 20 }}>
        {[
          { icon: <Eye size={18} />, label: 'Total views', value: fmtNum(totalViews), sub: 'Campaign videos', color: '#1A73E8' },
          { icon: <TrendingUp size={18} />, label: 'Avg views / video', value: fmtNum(avgViews), sub: 'Quality metric', color: '#00C853' },
          { icon: <Award size={18} />, label: 'Best rank', value: bestRank ? `#${bestRank}` : '—', sub: 'Across all keywords', color: '#FF6D00' },
          { icon: <ThumbsUp size={18} />, label: 'Total likes', value: fmtNum(totalLikes), sub: `${videoCount} videos`, color: '#EC4899' },
          { icon: <BarChart3 size={18} />, label: 'SOV share', value: sovPercent ? `${sovPercent}%` : '—', sub: 'Share of voice', color: '#7C3AED' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon-wrap" style={{ background: `${kpi.color}10`, color: kpi.color }}>{kpi.icon}</div>
            <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 4 }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Main Content: 2-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left: Top Videos */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div className="chart-title">Top performing videos</div>
            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2 }}>Highest view count videos from this creator in your campaign</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {videos.slice(0, 6).map((v: any, i: number) => (
              <Link key={i} href={`/video/${v.youtube_id}`} className="row-hover" style={{ display: 'flex', flexDirection: 'column', padding: '12px 14px', borderRadius: 'var(--radius-md)', textDecoration: 'none', border: '1px solid transparent', transition: 'all 0.15s' }}>
                {/* Thumbnail + Info */}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 120, flexShrink: 0, position: 'relative', paddingTop: '56.25%', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--text-bright)' }}>
                    <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    {v.is_short && <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'var(--brand-youtube)', color: 'var(--surface)', fontSize: 'var(--fs-micro)', fontWeight: 800, padding: '2px 5px', borderRadius: 'var(--radius-xs)', letterSpacing: '0.5px' }}>SHORT</span>}
                    <span className="rank-num" style={{ position: 'absolute', top: 4, left: 4, width: 'auto', padding: '2px 6px', fontSize: 'var(--fs-micro)', background: 'rgba(0,0,0,0.75)', color: 'var(--surface)' }}>
                      #{v.best_rank || '—'}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                    <div style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 } as React.CSSProperties}>
                      {v.title}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 'var(--fs-label)', color: 'var(--text-secondary)', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={11} /> {fmtNum(v.view_count)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ThumbsUp size={11} /> {fmtNum(v.like_count)}</span>
                      {v.published_at && <span style={{ color: 'var(--text-muted)' }}>· {fmtDate(v.published_at)}</span>}
                    </div>
                  </div>
                </div>
                {/* Keywords + Brands row */}
                {((v.keywords && v.keywords.length > 0) || (v.brands && v.brands.length > 0)) && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--accent-dim)', flexWrap: 'wrap', alignItems: 'center' }}>
                    {v.keywords && v.keywords.slice(0, 3).map((kw: any, ki: number) => (
                      <span key={ki} className="chip" style={{ fontSize: 'var(--fs-micro)', padding: '2px 7px', background: kw.rank <= 3 ? 'var(--success-dim)' : 'var(--accent-dim)', color: kw.rank <= 3 ? 'var(--success-text)' : 'var(--accent)', borderColor: kw.rank <= 3 ? 'var(--success-border)' : 'var(--accent-border)' }}>
                        <Search size={8} style={{ marginRight: 3 }} />{kw.text.length > 18 ? kw.text.slice(0, 18) + '…' : kw.text}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', marginLeft: 3, opacity: 0.7 }}>#{kw.rank}</span>
                      </span>
                    ))}
                    {v.brands && v.brands.map((b: string, bi: number) => (
                      <span key={`b-${bi}`} className="badge badge-purple" style={{ fontSize: 'var(--fs-micro)', padding: '2px 7px' }}>{b}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Keywords + Brands + Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Keywords */}
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <div className="chart-title">Top keywords</div>
              <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2 }}>Search queries this creator ranks for</div>
            </div>
            {keywords && keywords.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {keywords.slice(0, 6).map((kw: any, i: number) => (
                  <div key={i} className="row-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-dim)' }}>
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Search size={11} style={{ display: 'inline', marginRight: 6, color: 'var(--text-muted)' }} />
                      {kw.text}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)' }}>{kw.video_count} videos</span>
                      <span className="rank-num" style={{ width: 'auto', padding: '2px 8px', fontSize: 'var(--fs-label)', color: kw.rank <= 3 ? 'var(--success-text)' : kw.rank <= 5 ? 'var(--accent)' : 'var(--text-secondary)', background: kw.rank <= 3 ? 'var(--success-dim)' : kw.rank <= 5 ? 'var(--accent-dim)' : 'var(--bg-hover)' }}>
                        #{kw.rank}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 'var(--fs-body)' }}>
                <Search size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>No search queries tracked yet</div>
              </div>
            )}
          </div>

          {/* Brands */}
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <div className="chart-title">Brand footprint</div>
              <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2 }}>Brands featured in this creator's videos</div>
            </div>
            {brands && brands.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {brands.map((b: string) => (
                  <span key={b} className="badge badge-purple" style={{ padding: '5px 14px', borderRadius: 'var(--radius-full)', fontSize: 'var(--fs-sm)' }}>{b}</span>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 'var(--fs-body)' }}>
                <LayoutGrid size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>No brand tags assigned yet</div>
              </div>
            )}
          </div>

          {/* Views Distribution Chart */}
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <div className="chart-title">Video views distribution</div>
              <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2 }}>Top videos by view count</div>
            </div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 'var(--fs-micro)', fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 'var(--fs-micro)', fill: 'var(--text-muted)' }} tickFormatter={(v: any) => fmtNum(v)} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => [fmtNum(value), 'Views']}
                    contentStyle={{ background: 'var(--tooltip-bg)', borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-lg)', fontSize: 'var(--fs-sm)', fontFamily: 'var(--font-mono)', padding: '10px 14px' }}
                    labelStyle={{ color: 'var(--text-muted)', fontSize: 'var(--fs-micro)', fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: 'var(--surface)', fontWeight: 700 }}
                  />
                  <Bar dataKey="views" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {chartData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
