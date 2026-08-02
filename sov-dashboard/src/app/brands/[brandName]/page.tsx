'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useCampaignStore } from '@/lib/store'
import { ChevronLeft, Eye, Video, TrendingUp, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { LoadingState, ErrorState } from '@/components/StateViews'

interface Params {
  brandName: string
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

export default function BrandDetailPage({ params }: { params: Promise<Params> }) {
  const { brandName } = use(params)
  const decodedBrandName = decodeURIComponent(brandName)
  const { activeCampaignId } = useCampaignStore()
  const brandQuery = useQuery({
    queryKey: ['brand-detail', activeCampaignId, decodedBrandName],
    queryFn: async () => {
      const res = await fetch(`/api/brands/${encodeURIComponent(decodedBrandName)}?campaign_id=${activeCampaignId}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      return d
    },
    enabled: !!activeCampaignId,
  })

  const data = brandQuery.data as any
  const loading = brandQuery.isLoading
  const error = brandQuery.error?.message as string | null

  if (loading) {
    return <LoadingState title="Loading brand insights…" />
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Failed to Load Brand Profile"
        body={error || 'Make sure active campaign has tagged videos for this brand.'}
        actions={
          <Link href="/brands" className="btn btn-ghost btn-sm">
            <ChevronLeft size={14} /> Back to Brands List
          </Link>
        }
      />
    )
  }

  const { metrics, topVideos, topKeywords, langBreakdown } = data
  const colors = ['#1A73E8', '#10B981', '#F59E0B', '#8B5CF6']

  const langChartData = langBreakdown.map((l: any, i: number) => ({
    name: l.language === 'en' ? 'English' : l.language === 'ta' ? 'Tamil' : l.language === 'te' ? 'Telugu' : l.language === 'ml' ? 'Malayalam' : l.language,
    count: l.video_count,
    fill: colors[i % colors.length]
  }))

  return (
    <div className="anim-fade-up">

      {/* Header breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/brands" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ChevronLeft size={14} /> Brands Overview
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Brand Profile: <span className="accent">{decodedBrandName}</span></h1>
          <p className="page-subtitle">Deep dive performance statistics and content footprint.</p>
        </div>
      </div>

      {/* Grid statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Total Appearances</span>
            <Video size={16} />
          </div>
          <div className="kpi-value">{metrics.total_videos}</div>
          <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)', marginTop: 4 }}>Across all tracked keywords</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Unique Videos</span>
            <Video size={16} style={{ color: 'var(--success)' }} />
          </div>
          <div className="kpi-value">{metrics.unique_videos}</div>
          <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)', marginTop: 4 }}>Distinct YouTube assets</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Unique Viewership</span>
            <Eye size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="kpi-value">{fmt(metrics.unique_views)}</div>
          <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)', marginTop: 4 }}>Aggregated unique views</div>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>7d View Growth</span>
            <TrendingUp size={16} style={{ color: metrics.growth_7d >= 0 ? 'var(--success)' : 'var(--danger)' }} />
          </div>
          <div className="kpi-value" style={{ color: metrics.growth_7d >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
            {metrics.growth_7d >= 0 ? '+' : ''}{metrics.growth_7d}%
          </div>
          <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)', marginTop: 4 }}>Growth vs previous week</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, alignItems: 'start' }}>
        {/* Left: Top Keywords */}
        <div className="card" style={{ padding: 20 }}>
          <div className="chart-title">Top Keywords Ranks</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th style={{ textAlign: 'center' }}>Best Rank</th>
                  <th style={{ textAlign: 'right' }}>Videos Count</th>
                </tr>
              </thead>
              <tbody>
                {topKeywords.map((k: any) => (
                  <tr key={k.keyword}>
                    <td style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{k.keyword}</td>
                    <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }}>#{k.best_rank}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{k.brand_videos_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Language distribution */}
        <div className="card" style={{ padding: 20 }}>
          <div className="chart-title">Language Distribution</div>
          {langChartData.length === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>No language data found</div>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={langChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light)" />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 'var(--fs-label)', fontWeight: 600 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {langChartData.map((d: any, idx: number) => (
                      <Cell key={idx} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Videos Section */}
      <div className="card" style={{ padding: 20 }}>
        <div className="chart-title">Top Videos for {decodedBrandName}</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Video Title</th>
                <th>Channel</th>
                <th style={{ textAlign: 'right' }}>Views</th>
                <th style={{ textAlign: 'center' }}>Best Rank</th>
                <th style={{ textAlign: 'center' }}>Keywords</th>
              </tr>
            </thead>
            <tbody>
              {topVideos.map((v: any) => (
                <tr key={v.youtube_id}>
                  <td>
                    <a href={`https://youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                      {v.title}
                    </a>
                  </td>
                  <td style={{ fontSize: 'var(--fs-sm)' }}>{v.channel_name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(v.view_count)}</td>
                  <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }}>#{v.best_rank}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{v.keywords_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
