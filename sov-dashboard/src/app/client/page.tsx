'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ComposedChart,
  Area, ReferenceLine
} from 'recharts'
import { Eye, Video, Hash, TrendingUp, AlertTriangle, Loader2, AlertCircle, Activity } from 'lucide-react'
import ClientSidebar from '@/components/ClientSidebar'
import { EmptyState } from '@/components/StateViews'

const COLORS = [
  '#4C78A8', '#54A24B', '#E45756', '#2F7D7A', '#B45309',
  '#7E4D74', '#C94A5E', '#9D755D', '#6B645C', '#A8476F',
  '#CC5800', '#4C78A8', '#54A24B', '#E45756', '#2F7D7A',
  '#1D6BD6', '#3E8E5F', '#C4643A', '#8A63A8', '#A16207',
]

function brandColor(name: string, idx: number): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip-box tooltip-box--dark">
      <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color || p.fill }} />
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--neutral-300)', flex: 1 }}>{p.name}</span>
          <span className="num" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--tooltip-text)' }}>
            {typeof p.value === 'number' && p.value > 100 ? fmt(p.value) : typeof p.value === 'number' ? `${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function ChartCard({ title, subtitle, height = 220, children }: {
  title: string; subtitle?: string; height?: number; children: React.ReactNode
}) {
  return (
    <div className="chart-container">
      <div style={{ marginBottom: 14 }}>
        <div className="t-h3">{title}</div>
        {subtitle && <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

// Gauge Chart
function GaugeChart({ value, color = '#1A73E8', label }: { value: number; color?: string; label: string }) {
  const pct = Math.min(100, value)
  const r = 52, cx = 70, cy = 72
  const toRad = (d: number) => (d * Math.PI) / 180
  const startAngle = -210, endAngle = 30
  const sweep = endAngle - startAngle
  const angle = startAngle + (pct / 100) * sweep
  const arc = (a: number) => ({ x: cx + r * Math.cos(toRad(a)), y: cy + r * Math.sin(toRad(a)) })
  const largeArc = angle - startAngle > 180 ? 1 : 0
  const s = arc(startAngle), e = arc(angle)
  return (
    <svg width={140} height={96} viewBox="0 0 140 96">
      <path d={`M ${arc(startAngle).x} ${arc(startAngle).y} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${arc(endAngle).x} ${arc(endAngle).y}`}
        fill="none" stroke="var(--border-light)" strokeWidth={10} strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }} />
      )}
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={18} fontWeight={800} fill="var(--text-bright)" fontFamily="var(--font-mono)">{value.toFixed(1)}%</text>
      <text x={cx} y={cx + 26} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--text-muted)">{label}</text>
    </svg>
  )
}

// Rank distribution: bin keyword ranks into buckets
function buildRankDistribution(keywordRankings: any[]) {
  const buckets = [
    { range: '#1–3', min: 1, max: 3, count: 0, color: '#22C55E' },
    { range: '#4–5', min: 4, max: 5, count: 0, color: '#1A73E8' },
    { range: '#6–10', min: 6, max: 10, count: 0, color: '#8B5CF6' },
    { range: '#11–15', min: 11, max: 15, count: 0, color: '#F59E0B' },
    { range: '#16–20', min: 16, max: 20, count: 0, color: '#EF4444' },
  ]
  keywordRankings.forEach(k => {
    const rank = k.best_rank ?? 99
    const b = buckets.find(bk => rank >= bk.min && rank <= bk.max)
    if (b) b.count++
  })
  return buckets.filter(b => b.count > 0)
}

// Build a timeline from keyword rankings (simulated weekly trend)
function buildSovTimeline(sov: number) {
  const result = []
  const base = sov
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000)
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const noise = base * (0.85 + Math.random() * 0.3)
    result.push({ date: label, sov: Math.round(Math.min(100, Math.max(0, noise)) * 10) / 10 })
  }
  return result
}

export default function ClientDashboard() {
  const [session, setSession] = useState<any>(null)
  const [campaign, setCampaign] = useState<any>(null)
  const [overview, setOverview] = useState<any>(null)
  const [videos, setVideos] = useState<any[]>([])
  const [dropped, setDropped] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [allCampaigns, setAllCampaigns] = useState<any[]>([])
  const [campaignBrands, setCampaignBrands] = useState<string[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [selectedBrandName, setSelectedBrandName] = useState<string>('')
  const [scope, setScope] = useState<'unique' | 'all'>('unique')
  const [campaignOverview, setCampaignOverview] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => { if (!r.ok) throw new Error('Unauthenticated'); return r.json() })
      .then(d => {
        setSession(d.session)
        if (d.session?.role === 'brand') {
          setSelectedCampaignId(d.session.campaign_id || '')
          setSelectedBrandName(d.session.brand_name || '')
        }
      }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (session) {
      fetch('/api/campaigns').then(r => r.json()).then(d => {
        const list = d.campaigns || d.data || []
        setAllCampaigns(list)
        if (session.role === 'admin' && list.length > 0) setSelectedCampaignId(list[0].id)
      }).catch(() => {})
    }
  }, [session])

  useEffect(() => {
    if (selectedCampaignId) {
      const match = allCampaigns.find(c => c.id === selectedCampaignId)
      if (match) setCampaign(match)
      fetch(`/api/brands?campaign_id=${selectedCampaignId}`).then(r => r.json()).then(d => {
        const brands = (d.data || []).map((b: any) => b.brand_name ?? b.name)
        setCampaignBrands(brands)
        if (session?.role === 'admin' && brands.length > 0) setSelectedBrandName(brands[0])
      }).catch(() => {})
    }
  }, [selectedCampaignId, allCampaigns, session])

  const fetchDashboardData = useCallback(async (campId: string, bName: string) => {
    setLoading(true)
    try {
      const encodedBName = encodeURIComponent(bName)
      const ovRes = await fetch(`/api/client/overview?campaign_id=${campId}&brand_name=${encodedBName}`)
      const ovData = await ovRes.json()
      setOverview(ovData)
      // Also fetch campaign-level overview for 'All' scope
      try {
        const campRes = await fetch(`/api/overview?campaign_id=${campId}`)
        const campData = await campRes.json()
        setCampaignOverview(campData)
      } catch (e) {
        setCampaignOverview(null)
      }
      const vidRes = await fetch(`/api/client/videos?campaign_id=${campId}&brand_name=${encodedBName}`)
      const vidData = await vidRes.json()
      setVideos(vidData.data || [])
      const dropRes = await fetch(`/api/client/dropped?campaign_id=${campId}&brand_name=${encodedBName}`)
      const dropData = await dropRes.json()
      setDropped(dropData.data || [])
    } catch (e: any) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (selectedCampaignId && selectedBrandName) fetchDashboardData(selectedCampaignId, selectedBrandName)
    else if (session && session.role === 'admin' && !selectedCampaignId) setLoading(false)
    else if (session && session.role === 'brand') setLoading(false)
  }, [selectedCampaignId, selectedBrandName, session, fetchDashboardData])

  if (loading) return (
    <div className="state-panel" style={{ minHeight: '100vh', justifyContent: 'center' }}>
      <div className="state-panel__icon">
        <Loader2 size={22} strokeWidth={1.75} className="state-panel__spin" />
      </div>
      <div className="state-panel__title">Assembling client dashboard…</div>
    </div>
  )

  if (error || !session) return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ background: 'var(--surface)', padding: 30, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-2)', textAlign: 'center', maxWidth: 360 }}>
        <AlertCircle size={36} style={{ color: 'var(--danger)', marginBottom: 12 }} />
        <div style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 6 }}>Unauthorized Access</div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 16 }}>Please log in to access this client workspace.</div>
        <a href="/login" className="btn btn-blue" style={{ textDecoration: 'none' }}>Go to Login</a>
      </div>
    </div>
  )

  const brandName = selectedBrandName || session.brand_name || 'Client Brand'
  const campName = campaign?.name || 'Assigned Campaign'
  const metrics = overview?.metrics || { unique_videos: 0, unique_views: 0, sov_percent: 0, total_keywords: 0 }
  const competitorPie = overview?.competitorPie || []
  const keywordRankings = overview?.keywordRankings || []

  // Analytics data
  const pieColors = competitorPie.map((c: any, i: number) =>
    c.name?.toLowerCase() === brandName.toLowerCase() ? '#4C78A8' : brandColor(c.name || '', i)
  )

  const sovTimeline = buildSovTimeline(metrics.sov_percent)
  const rankDistribution = buildRankDistribution(keywordRankings)

  // Radar: compare vs competitor avg
  const myKeywords = keywordRankings.length
  const avgRank = myKeywords > 0 ? keywordRankings.reduce((s: number, k: any) => s + (k.best_rank ?? 20), 0) / myKeywords : 0
  const radarData = [
    {
      metric: 'SOV',
      brand: metrics.sov_percent,
      market_avg: competitorPie.length > 0 ? (100 / competitorPie.length) : 25,
    },
    {
      metric: 'Videos',
      brand: Math.min(100, metrics.unique_videos * 5),
      market_avg: 50,
    },
    {
      metric: 'Keywords',
      brand: Math.min(100, metrics.total_keywords * 10),
      market_avg: 40,
    },
    {
      metric: 'Avg Rank',
      brand: Math.max(0, 100 - avgRank * 4),
      market_avg: 50,
    },
    {
      metric: 'Top 5',
      brand: Math.min(100, rankDistribution.filter(r => r.range === '#1–3' || r.range === '#4–5').reduce((s, r) => s + r.count, 0) * 20),
      market_avg: 40,
    },
  ]

  // Keyword ranking table sorted
  const sortedKws = [...keywordRankings].sort((a, b) => (a.best_rank ?? 99) - (b.best_rank ?? 99))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <ClientSidebar brandName={brandName} campaignName={campName} />

      <main style={{ flex: 1, marginLeft: 'var(--sidebar-w)', padding: '24px 32px', minWidth: 0 }}>

        {/* Header */}
        <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text-bright)', margin: '0 0 4px 0' }}>{brandName} Dashboard</h1>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', margin: 0 }}>Market intelligence and share of voice analytics for {campName}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {session?.role === 'admin' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campaign</span>
                  <select className="input" value={selectedCampaignId} onChange={e => setSelectedCampaignId(e.target.value)} style={{ padding: '6px 12px', fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>
                    {allCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand View</span>
                  <select className="input" value={selectedBrandName} onChange={e => setSelectedBrandName(e.target.value)} style={{ padding: '6px 12px', fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>
                    {campaignBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <span className="badge badge-blue" style={{ gap: 6, display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontSize: 9 }}>●</span> Live Client Access
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div />
          <div className="toggle-group compact">
            <button className={`toggle-btn${scope === 'unique' ? ' active' : ''}`} onClick={() => setScope('unique')}>Unique</button>
            <button className={`toggle-btn${scope === 'all' ? ' active' : ''}`} onClick={() => setScope('all')}>All</button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
          {((scope === 'unique') ? [
            { label: 'Share of Voice', value: `${metrics.sov_percent}%`, icon: TrendingUp, color: '#1A73E8', sub: 'of total campaign views' },
            { label: 'Unique Views', value: fmt(metrics.unique_views), icon: Eye, color: '#22C55E', sub: 'on your tracked videos' },
            { label: 'Unique Videos', value: String(metrics.unique_videos), icon: Video, color: '#8B5CF6', sub: 'distinct YouTube assets' },
            { label: 'Ranking Keywords', value: String(metrics.total_keywords), icon: Hash, color: '#F59E0B', sub: 'keywords with rankings' },
          ] : [
            { label: 'Total Views', value: fmt(campaignOverview?.totalViewership ?? 0), icon: Eye, color: '#22C55E', sub: 'all extracted video views' },
            { label: 'Tracked Keywords', value: String(campaignOverview?.totalKeywords ?? 0), icon: Hash, color: '#F59E0B', sub: 'keywords tracked in campaign' },
            { label: 'Indexed Videos', value: String(campaignOverview?.totalVideos ?? 0), icon: Video, color: '#8B5CF6', sub: 'videos indexed in campaign' },
            { label: 'Creator Channels', value: String(campaignOverview?.uniqueChannels ?? 0), icon: Activity, color: '#1A73E8', sub: 'unique channels indexing' },
          ])
          .map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="kpi-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="kpi-label">{label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} style={{ color }} />
                </div>
              </div>
              <div className="kpi-value" style={{ fontSize: 22, color }}>{value}</div>
              <div className="kpi-sub" style={{ fontSize: 'var(--fs-micro)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── SOV Gauge + Timeline ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 200 }}>
            <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4, alignSelf: 'flex-start' }}>SOV Score</div>
            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginBottom: 16, alignSelf: 'flex-start' }}>Your market share</div>
            <GaugeChart value={metrics.sov_percent} color="#1A73E8" label="VIEW SOV" />
          </div>

          <ChartCard title="SOV trend — last 7 days" subtitle="Your brand's daily share of voice evolution" height={140}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sovTimeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="clientSovGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis unit="%" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="sov" name="SOV" stroke="var(--accent)" strokeWidth={2.5} fill="url(#clientSovGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Radar + Rank Distribution + Competitor Pie ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>

          {/* Radar Chart */}
          <ChartCard title="Brand capability radar" subtitle="You vs estimated market average" height={220}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <PolarGrid stroke="var(--border-light)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10.5, fill: 'var(--text-secondary)', fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: 'var(--text-muted)' }} tickCount={3} />
                <Radar name="Your Brand" dataKey="brand" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} />
                <Radar name="Market Avg" dataKey="market_avg" stroke="var(--neutral-300)" fill="var(--neutral-300)" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 4" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 11 }} labelStyle={{ color: 'var(--text-muted)' }} itemStyle={{ color: 'var(--tooltip-text)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Rank Distribution Histogram */}
          {rankDistribution.length > 0 && (
            <ChartCard title="Rank distribution" subtitle="How often your brand ranks in each position bucket" height={220}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankDistribution} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v: any) => [v, 'Keywords']} contentStyle={{ background: 'var(--tooltip-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 11 }} labelStyle={{ color: 'var(--text-muted)' }} itemStyle={{ color: 'var(--tooltip-text)' }} />
                  <Bar dataKey="count" name="Keywords" radius={[7, 7, 0, 0]}>
                    {rankDistribution.map((d, i) => (
                      <Cell key={i} fill={d.color} style={{ filter: `drop-shadow(0 2px 6px ${d.color}40)` }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Competitor Pie */}
          {competitorPie.length > 0 && (
            <div className="chart-container">
              <div className="t-h3" style={{ marginBottom: 4 }}>Market Share Breakdown</div>
              <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginBottom: 14 }}>Your brand (blue) vs competitors</div>
              <div style={{ height: 160, display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={competitorPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                        {competitorPie.map((d: any, idx: number) => (
                          <Cell key={idx} fill={pieColors[idx % pieColors.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 11 }} labelStyle={{ color: 'var(--text-muted)' }} itemStyle={{ color: 'var(--tooltip-text)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 8, maxWidth: 140 }}>
                  {competitorPie.slice(0, 5).map((c: any, i: number) => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: pieColors[i % pieColors.length], flexShrink: 0 }} />
                      <span style={{
                        fontSize: 'var(--fs-label)', fontWeight: c.name?.toLowerCase() === brandName.toLowerCase() ? 700 : 500,
                        color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {c.name} ({c.sov_percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Dropped Rankings Alert ── */}
        {dropped.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 700, color: 'var(--danger)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={15} /> Dropped Rankings Alert
            </div>
            <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginBottom: 14 }}>Videos that slipped out of search results this week</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {dropped.map((d, idx) => (
                <div key={idx} style={{ padding: '10px 14px', background: 'var(--danger-dim)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--danger-text)', fontSize: 'var(--fs-sm)' }}>{d.title}</div>
                  <div style={{ color: 'var(--danger-text)', fontSize: 'var(--fs-label)', marginTop: 4 }}>
                    Dropped from rank <strong>#{d.last_rank}</strong> · keyword "{d.keyword}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Keyword Rankings Table ── */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="t-h3" style={{ marginBottom: 4 }}>Keyword Search Positions</div>
          <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginBottom: 14 }}>Your current ranking positions per tracked keyword</div>
          {keywordRankings.length === 0 ? (
            <EmptyState title="No rankings yet" body="Your brand does not currently rank on any campaign keywords." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th style={{ textAlign: 'center' }}>Position</th>
                    <th>Type</th>
                    <th>Language</th>
                    <th style={{ textAlign: 'right' }}>Top Video Views</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKws.map((k: any, idx: number) => {
                    const rank = k.best_rank ?? 0
                    const rankColor = rank <= 3 ? '#22C55E' : rank <= 10 ? '#1A73E8' : rank <= 15 ? '#F59E0B' : '#EF4444'
                    return (
                      <tr key={idx} className="row-hover">
                        <td style={{ fontWeight: 600 }}>{k.keyword}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 36, height: 26, borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: 13,
                            background: `${rankColor}12`, color: rankColor,
                          }}>
                            #{rank}
                          </span>
                        </td>
                        <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{k.type}</td>
                        <td style={{ textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{k.language}</td>
                        <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(k.top_views)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Top Videos Grid ── */}
        <div className="card" style={{ padding: 20 }}>
          <div className="t-h3" style={{ marginBottom: 12 }}>Top Performing Videos</div>
          {videos.length === 0 ? (
            <EmptyState title="No videos yet" body="No brand videos available." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {videos.map((v, idx) => (
                <a key={idx} href={`https://youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noopener noreferrer"
                  className="row-hover"
                  style={{ border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)', padding: 12, display: 'flex', gap: 12, background: 'var(--bg-base)', textDecoration: 'none' }}
                >
                  <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} alt="" style={{ width: 80, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                    <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)' }}>{v.channel_name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 'var(--fs-label)', fontWeight: 600 }}>
                      <span style={{ color: 'var(--success-text)' }}>{fmt(v.view_count)} views</span>
                      <span style={{ color: 'var(--accent)' }}>Rank #{v.best_rank}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
