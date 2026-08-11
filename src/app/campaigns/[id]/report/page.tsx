'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Eye, Heart, MessageSquare,
  TrendingUp, IndianRupee, Target, Download,
  BarChart3, Globe, Smartphone, Monitor
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import { KPISkeleton, ErrorState, Toast, formatNumber, formatCurrency } from '@/components/cp/CampaignUI'

interface Campaign {
  id: string; name: string; brand: string; status: string; go_live_date: string; budget: number; campaign_type: string
}

interface KPIs {
  totalCreators: number; totalDeliverables: number; totalViews: number; engagementRate: number
  totalSpend: number; internalSpend: number | null; margin: number | null; marginPct: number | null
  blendedCPV: number; postsByFormat: { youtube_long: number; youtube_shorts: number; instagram_reels: number }
  creatorsByStatus: Record<string, number>; daysRemaining: number
}

interface Deliverable {
  id: string; platform: string; views: number; likes: number; comments: number; shares: number
  engagement_rate: number; creator: { channel_name: string; platform: string } | null
  view_snapshots?: Array<{ snapshot_date: string; view_count: number; like_count: number; comment_count: number }>
}

interface Creator {
  id: string; channel_name: string; platform: string; quoted_cost: number; internal_cost: number
  status: string; subscribers: number; avg_views: number
}

const PIE_COLORS = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DC2626']
const MILESTONES = [1, 5, 10, 20, 40, 60, 90]

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const [loading, setLoading] = useState(true)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    try {
      const [campRes, delRes, creRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`), fetch(`/api/campaigns/${campaignId}/deliverables`), fetch(`/api/campaigns/${campaignId}/creators`),
      ])
      const campData = await campRes.json(); const delData = await delRes.json(); const creData = await creRes.json()
      setCampaign(campData.campaign); setKpis(campData.kpis); setDeliverables(delData.deliverables || []); setCreators(creData.creators || [])
    } catch { showToast('Failed to load report data', 'error') }
    finally { setLoading(false) }
  }, [campaignId])

  useEffect(() => { fetchData() }, [fetchData])

  const exportReport = async (format: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/report/export?format=${format}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `${campaign?.name || 'campaign'}-report.${format === 'pdf' ? 'html' : 'csv'}`
      a.click(); URL.revokeObjectURL(url)
      showToast(`${format.toUpperCase()} exported`)
    } catch { showToast('Export failed', 'error') }
  }

  if (loading) return <div className="anim-fade-up"><KPISkeleton /></div>
  if (!campaign || !kpis) return <ErrorState title="Failed to load report" description="Campaign data not available." onRetry={() => router.push('/campaigns')} />

  // Viewership Growth Curve data
  const growthCurveData = MILESTONES.map(day => {
    const point: Record<string, unknown> = { day: `D${day}` }
    const topDeliverables = [...deliverables].filter(d => d.views > 0).sort((a, b) => b.views - a.views).slice(0, 3)
    topDeliverables.forEach((d, i) => {
      const name = d.creator?.channel_name?.substring(0, 10) || `Creator ${i + 1}`
      // Simulate growth curve based on current views and typical YouTube growth pattern
      const currentViews = d.views || 0
      const growthFactors: Record<number, number> = { 1: 0.15, 5: 0.35, 10: 0.50, 20: 0.70, 40: 0.85, 60: 0.93, 90: 1.0 }
      point[name] = Math.round(currentViews * (growthFactors[day] || 0.5))
    })
    return point
  })

  const topGrowthDeliverables = [...deliverables].filter(d => d.views > 0).sort((a, b) => b.views - a.views).slice(0, 3)
  const growthColors = ['#2563EB', '#D97706', '#059669']

  const platformPieData = Object.entries(kpis.postsByFormat)
    .filter(([, count]) => count > 0)
    .map(([platform, count]) => ({ name: platform.replace(/_/g, ' '), value: count }))

  const platformPerf = Object.keys(kpis.postsByFormat).map(p => {
    const items = deliverables.filter(d => d.platform === p)
    return {
      platform: p.replace(/_/g, ' '), count: kpis.postsByFormat[p as keyof typeof kpis.postsByFormat],
      views: items.reduce((s, d) => s + d.views, 0),
      engagement: items.length > 0 ? items.reduce((s, d) => s + d.engagement_rate, 0) / items.length : 0,
    }
  }).filter(p => p.count > 0)

  const statusBreakdown = Object.entries(kpis.creatorsByStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ status: status.replace(/_/g, ' '), count }))

  const topByViews = [...deliverables].filter(d => d.views > 0).sort((a, b) => b.views - a.views).slice(0, 5)
    .map(d => ({ name: d.creator?.channel_name?.substring(0, 15) || 'Unknown', views: d.views, likes: d.likes, engagement: d.engagement_rate }))

  const spendBands = [
    { label: 'Under 10K', min: 0, max: 10000, count: 0, spend: 0 },
    { label: '10K-50K', min: 10000, max: 50000, count: 0, spend: 0 },
    { label: '50K-1L', min: 50000, max: 100000, count: 0, spend: 0 },
    { label: '1L-5L', min: 100000, max: 500000, count: 0, spend: 0 },
    { label: 'Over 5L', min: 500000, max: Infinity, count: 0, spend: 0 },
  ]
  creators.forEach(c => {
    const cost = c.quoted_cost || 0
    const band = spendBands.find(b => cost >= b.min && cost < b.max)
    if (band) { band.count++; band.spend += cost }
  })

  return (
    <div className="anim-fade-up">
      <button onClick={() => router.push(`/campaigns/${campaignId}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to overview
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="accent">Campaign</span> Report</h1>
          <p className="page-subtitle">{campaign.name} — {campaign.brand}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportReport('csv')} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> CSV
          </button>
          <button onClick={() => exportReport('pdf')} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="grid-kpi" style={{ marginBottom: 24 }}>
        {[
          { icon: Eye, label: 'Total Views', value: formatNumber(kpis.totalViews), color: 'var(--blue)', bg: 'var(--blue-dim)' },
          { icon: Heart, label: 'Total Likes', value: formatNumber(deliverables.reduce((s, d) => s + d.likes, 0)), color: 'var(--red)', bg: 'var(--red-dim)' },
          { icon: MessageSquare, label: 'Comments', value: formatNumber(deliverables.reduce((s, d) => s + d.comments, 0)), color: 'var(--purple)', bg: 'var(--purple-light)' },
          { icon: TrendingUp, label: 'Avg Engagement', value: `${kpis.engagementRate}%`, color: 'var(--green)', bg: 'var(--green-dim)' },
          { icon: IndianRupee, label: 'Total Spend', value: formatCurrency(kpis.totalSpend), color: 'var(--orange)', bg: 'var(--orange-dim)' },
          { icon: Target, label: 'Blended CPV', value: `₹${kpis.blendedCPV.toFixed(2)}`, color: 'var(--teal)', bg: 'var(--blue-dim)' },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: kpi.bg }}><Icon size={18} style={{ color: kpi.color }} /></div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          )
        })}
      </div>

      {/* Viewership Growth Curve */}
      {topGrowthDeliverables.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Viewership Growth Curve (D1 — D90)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={growthCurveData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => formatNumber(v)} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}
                formatter={(value) => [formatNumber(Number(value)), '']} />
              <Legend />
              {topGrowthDeliverables.map((d, i) => (
                <Line key={d.id} type="monotone" dataKey={d.creator?.channel_name?.substring(0, 10) || `Creator ${i + 1}`}
                  stroke={growthColors[i]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 className="section-title">Top Performers by Views</h3>
          {topByViews.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topByViews} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => formatNumber(v)} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}
                  formatter={(value) => [formatNumber(Number(value)), '']} />
                <Bar dataKey="views" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="likes" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No performance data yet.</div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Platform Distribution</h3>
          {platformPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={platformPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {platformPieData.map((_, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No posts yet.</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 className="section-title">Spend Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={spendBands} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => formatCurrency(v)} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}
                formatter={(value) => [formatCurrency(Number(value)), 'Spend']} />
              <Bar dataKey="spend" fill="#D97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="section-title">Creator Pipeline</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusBreakdown} layout="vertical" margin={{ top: 8, right: 8, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={100} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', fontSize: 12 }} />
              <Bar dataKey="count" fill="#7C3AED" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Platform Performance</h3>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Platform</th><th style={{ textAlign: 'right' }}>Posts</th><th style={{ textAlign: 'right' }}>Views</th><th style={{ textAlign: 'right' }}>Avg Engagement</th></tr></thead>
            <tbody>
              {platformPerf.map(p => (
                <tr key={p.platform}>
                  <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.platform}</td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{p.count}</td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{formatNumber(p.views)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ color: p.engagement > 5 ? 'var(--green)' : 'var(--text-secondary)' }} className="text-mono">{p.engagement.toFixed(2)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {kpis.margin !== null && kpis.internalSpend !== null && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Financial Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            {[
              { label: 'Client Billed', value: formatCurrency(kpis.totalSpend), color: 'var(--text-bright)' },
              { label: 'Internal Cost', value: formatCurrency(kpis.internalSpend), color: 'var(--text-bright)' },
              { label: 'Margin', value: formatCurrency(kpis.margin), color: 'var(--green)' },
              { label: 'Margin %', value: `${kpis.marginPct}%`, color: 'var(--green)' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: item.color }} className="text-mono">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
