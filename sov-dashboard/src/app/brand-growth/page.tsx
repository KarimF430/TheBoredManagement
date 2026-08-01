'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Download, AlertCircle, RefreshCw, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend } from 'recharts'
import { useCampaignStore } from '@/lib/store'
import { useFilterStore } from '@/lib/filter-store'
import SharedFilterBar from '@/components/SharedFilterBar'
import { useQuery } from '@tanstack/react-query'
import { PageSkeleton } from '@/components/PageSkeleton'
import { EmptyState } from '@/components/StateViews'
import Link from 'next/link'

const COLORS = [
  '#4C78A8', '#54A24B', '#E45756', '#72B7B2', '#EECA3B',
  '#B279A2', '#FF9DA6', '#9D755D', '#BAB0AC', '#D67195',
  '#F58518', '#4C78A8', '#54A24B', '#E45756', '#72B7B2',
  '#79B8FF', '#A8D8B9', '#F4A582', '#CAB2D6', '#FFFFB3',
]

function brandColor(name: string, idx: number): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function GrowthBadge({ val }: { val: number }) {
  if (val > 0) return <span className="delta-pos"><TrendingUp size={12} /> +{val.toFixed(1)}%</span>
  if (val < 0) return <span className="delta-neg"><TrendingDown size={12} /> {val.toFixed(1)}%</span>
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}><Minus size={11} /> 0%</span>
}

function RankBadge({ val }: { val: number }) {
  if (val > 0) return <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--success-text)', fontWeight: 700, fontSize: 'var(--fs-sm)' }}><TrendingUp size={12} /> +{val}</span>
  if (val < 0) return <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--danger)', fontWeight: 700, fontSize: 'var(--fs-sm)' }}><TrendingDown size={12} /> {val}</span>
  return <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-label)' }}>—</span>
}

function MiniSparkBar({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length === 0 || data.every(v => v === 0)) return <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--neutral-300)' }}>—</span>
  const max = Math.max(...data) || 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24, width: 48 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${Math.max(15, (v / max) * 100)}%`, borderRadius: 'var(--radius-xs)', background: i === data.length - 1 ? color : `${color}30` }} />
      ))}
    </div>
  )
}

export default function BrandGrowthPage() {
  const { campaigns, activeCampaignId, fetchCampaigns } = useCampaignStore()
  const { search, ownership, format, dateRange, customDateFrom, customDateTo } = useFilterStore()
  const [metric, setMetric] = useState<'views' | 'frequency'>('views')

  const period = (() => {
    const map: Record<string, string> = { '24h': '24h', '48h': '7d', '1W': '7d', '1M': '30d', 'All': '30d' }
    return map[dateRange] || '30d'
  })()

  const growthQuery = useQuery({
    queryKey: ['brand-growth', activeCampaignId, metric, period, ownership, format, customDateFrom, customDateTo],
    queryFn: async () => {
      let url = `/api/brands/growth?campaign_id=${activeCampaignId}&metric=${metric}&period=${period}`
      if (ownership !== 'all') url += `&is_ours=${ownership === 'ours' ? 'true' : 'false'}`
      if (format !== 'all') url += `&format=${format}`
      if (dateRange === 'Custom' && customDateFrom && customDateTo) {
        url += `&date_from=${customDateFrom}&date_to=${customDateTo}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch growth data')
      return res.json()
    },
    enabled: !!activeCampaignId,
  })
  const data = growthQuery.data?.data ?? []
  const hasScrapeData = growthQuery.data?.has_scrape_data ?? false
  const loading = growthQuery.isLoading
  const filtered = search ? data.filter((b: any) => b.brand_name?.toLowerCase().includes(search.toLowerCase())) : data

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const handleExport = () => {
    const headers = 'Brand,Current Value,Previous Value,Growth %,Videos Tracked'
    const rows = data.map((b: any) => `"${b.brand_name}",${b.currentValue},${b.previousValue},${b.growthPercent}%,${b.video_count}`)
    const blob = new Blob([headers + '\n' + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `brand_growth_${metric}.csv`; a.click()
  }

  if (loading) return (
    <div className="anim-fade-up">
      <PageSkeleton cols={2} rows={4} />
    </div>
  )

  if (!activeCampaignId) return (
    <div className="anim-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Brand <span className="accent">Growth</span></h1>
          <p className="page-subtitle">Velocity tracking and period comparison</p>
        </div>
      </div>
      <EmptyState
        icon={<AlertCircle size={36} strokeWidth={1.5} style={{ color: 'var(--neutral-300)' }} />}
        title="Select a Campaign"
        body="Choose a campaign to view brand growth data"
      />
    </div>
  )

  const sorted = [...filtered].sort((a, b) => b.growthPercent - a.growthPercent)
  const topGainer = sorted[0]
  const topLoser = sorted[sorted.length - 1]

  return (
    <div className="anim-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Brand <span className="accent">Growth</span></h1>
          <p className="page-subtitle">Velocity tracking and period comparison</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={data.length === 0}>
          <Download size={13} /> Export
        </button>
      </div>

      <SharedFilterBar style={{ marginBottom: 20 }}>
        {/* Metric Toggle */}
        <div className="toggle-group">
          <button className={`toggle-btn ${metric === 'views' ? 'active' : ''}`} onClick={() => setMetric('views')}>By Views</button>
          <button className={`toggle-btn ${metric === 'frequency' ? 'active' : ''}`} onClick={() => setMetric('frequency')}>By Frequency</button>
        </div>
      </SharedFilterBar>

      {data.length === 0 ? (
        <EmptyState
          icon={<AlertCircle size={36} strokeWidth={1.5} style={{ color: 'var(--neutral-300)' }} />}
          title="No Brand Growth Data"
          body={<>Tag brands and trigger a scrape from <Link href="/control" style={{ color: 'var(--accent)', fontWeight: 600 }}>Campaign Control</Link> to generate growth metrics.</>}
        />
      ) : (
        <>
          {!hasScrapeData && (
            <div className="card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--accent)' }}>
              <RefreshCw size={18} style={{ color: 'var(--accent)', flexShrink: 0, animation: 'spin 8s linear infinite' }} />
              <div style={{ fontSize: 'var(--fs-body)', color: 'var(--text-primary)' }}>
                <strong>Partial data.</strong> Run a scrape to generate view snapshots for accurate growth tracking.
              </div>
            </div>
          )}

          {/* KPI Strip */}
          {sorted.length >= 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="kpi-card" style={{ borderColor: 'var(--success-border)', display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--success-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={20} style={{ color: 'var(--success-text)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--success-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Top Gainer</div>
                  <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-primary)', marginTop: 1 }}>{topGainer?.brand_name}</div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--success-text)', marginTop: 1 }}>+{topGainer?.growthPercent.toFixed(1)}%</div>
                </div>
              </div>
              <div className="kpi-card" style={{ borderColor: 'var(--danger-border)', display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--danger-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingDown size={20} style={{ color: 'var(--danger)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--danger-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Needs Attention</div>
                  <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-primary)', marginTop: 1 }}>{topLoser?.brand_name}</div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--danger)', marginTop: 1 }}>{topLoser?.growthPercent.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Growth Velocity Bar Chart */}
          <div className="chart-container" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div className="t-h3">Growth Velocity</div>
                <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2 }}>Growth rate (%) per brand over {period}</div>
              </div>
              <Zap size={16} style={{ color: 'var(--warning)' }} />
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sorted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="brand_name" tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Growth']} contentStyle={{ background: 'var(--tooltip-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 11 }} labelStyle={{ color: 'var(--text-muted)' }} itemStyle={{ color: 'var(--tooltip-text)' }} />
                  <ReferenceLine y={0} stroke="var(--neutral-300)" strokeDasharray="4 4" />
                  <Bar dataKey="growthPercent" name="Growth" radius={[6, 6, 0, 0]}>
                    {sorted.map((entry, index) => (
                      <Cell key={index} fill={brandColor(entry.brand_name, index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="t-h3">Brand Performance</div>
              <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2 }}>All brands ranked by {metric === 'views' ? 'view' : 'frequency'} growth</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>#</th>
                    <th>Brand</th>
                    <th style={{ textAlign: 'right' }}>Current</th>
                    <th style={{ textAlign: 'right' }}>Previous</th>
                    <th style={{ textAlign: 'right' }}>Growth</th>
                    <th style={{ textAlign: 'center' }}>Rank</th>
                    <th>Sparkline</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => {
                    const color = brandColor(row.brand_name, i)
                    return (
                      <tr key={`${row.brand_name}_${i}`}>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.brand_name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(row.currentValue)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(row.previousValue)}</td>
                        <td style={{ textAlign: 'right' }}><GrowthBadge val={row.growthPercent} /></td>
                        <td style={{ textAlign: 'center' }}><RankBadge val={row.rankMovement} /></td>
                        <td><MiniSparkBar data={row.sparklineData || []} color={color} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}