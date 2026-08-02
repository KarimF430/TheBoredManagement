'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { useCampaignStore } from '@/lib/store'
import { useFilterStore } from '@/lib/filter-store'
import SharedFilterBar from '@/components/SharedFilterBar'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle, Hash, BarChart2, BarChart3, Download, Search,
  Pencil, X, Loader2, Zap, Award, Layers, Eye, TrendingUp,
  ChevronDown, ChevronRight, ExternalLink, Info, Play, User, Eye as EyeIcon
} from 'lucide-react'
import { PageSkeleton } from '@/components/PageSkeleton'
import Link from 'next/link'
import { brandColor } from '@/lib/brand-colors'
import { EmptyState } from '@/components/StateViews'

const C = [
  '#4C78A8', '#54A24B', '#E45756', '#2F7D7A', '#B45309',
  '#7E4D74', '#C94A5E', '#9D755D', '#6B645C', '#A8476F',
  '#CC5800', '#0284C7', '#10B981', '#D97706', '#8B5CF6',
]
function bc(name: string, _i: number) { return brandColor(name) || C[Math.abs([...name].reduce((h, c) => (h << 5) - h + c.charCodeAt(0) | 0, 0)) % C.length] }

const LANG_OPTS = [
  { v: 'all', l: 'All Languages' }, { v: 'ta', l: 'Tamil' }, { v: 'te', l: 'Telugu' },
  { v: 'ml', l: 'Malayalam' }, { v: 'en', l: 'English' }, { v: 'hi', l: 'Hinglish' }, { v: 'kn', l: 'Kannada' },
]
const TYPE_OPTS = [
  { v: 'all', l: 'All Types' }, { v: 'generic', l: 'Generic' }, { v: 'branded', l: 'Branded' }, { v: 'comparison', l: 'Comparison' },
]
const ELANG = ['en','hi','kn','te','ta','ml'].map(v => ({ v, l: LANG_OPTS.find(x => x.v === v)?.l || v }))

function fm(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

function MetricCard({ label, value, icon: Icon, color, info, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; info: string; sub?: string
}) {
  return (
    <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <Icon size={12} style={{ color, flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</span>
        </div>
        <div style={{ color: 'var(--neutral-300)', cursor: 'help', flexShrink: 0, marginLeft: 4 }} title={info}><Info size={10} /></div>
      </div>
      <div>
        <div className="kpi-value mono" style={{ fontSize: 22, color, marginTop: 8 }}>{value}</div>
        {sub && <div className="kpi-sub" style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  )
}

function Card({ title, sub, height = 280, children, info, right }: {
  title: string; sub?: string; height?: number; children: React.ReactNode; info?: string; right?: React.ReactNode
}) {
  return (
    <div className="chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-h3" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
            {info && <span title={info} style={{ cursor: 'help', color: 'var(--neutral-300)', flexShrink: 0 }}><Info size={12} /></span>}
          </div>
          {sub && <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        {right && <div style={{ marginLeft: 8, flexShrink: 0 }}>{right}</div>}
      </div>
      <div style={{ height, flex: 1 }}>{children}</div>
    </div>
  )
}

function Badge({ fg, bg, children }: { fg: string; bg?: string; children: React.ReactNode }) {
  return <span className="badge" style={{ background: bg || `${fg}12`, color: fg }}>{children}</span>
}

export default function KeywordSovPage() {
  const { activeCampaignId, fetchCampaigns } = useCampaignStore()
  const { search, ownership, format } = useFilterStore()
  const [lang, setLang] = useState('all')
  const [type, setType] = useState('all')
  const [vm, setVm] = useState<'chart' | 'heatmap' | 'table'>('chart')
  const [sk, setSk] = useState('total_videos')
  const [sd, setSd] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; kw: any }>({ open: false, kw: null })
  const [et, setEt] = useState('')
  const [el, setEl] = useState('en')
  const [eCat, setECat] = useState('generic')
  const [eSaving, setESaving] = useState(false)
  const [expandedKw, setExpandedKw] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['kw-sov', activeCampaignId, lang, type, ownership, format],
    queryFn: async () => {
      let url = `/api/keywords/sov?campaign_id=${activeCampaignId}&language=${lang}&type=${type}`
      if (ownership !== 'all') url += `&is_ours=${ownership === 'ours' ? 'true' : 'false'}`
      if (format !== 'all') url += `&format=${format}`
      const r = await fetch(url)
      if (!r.ok) throw new Error('Failed to fetch')
      return r.json()
    },
    enabled: !!activeCampaignId,
  })

  const data: any[] = q.data?.data ?? []
  const brands: string[] = q.data?.brandNames ?? []
  const grandTotalViews: number = q.data?.total_views ?? 0
  const filtered = search ? data.filter((kw: any) => kw.keyword?.toLowerCase().includes(search.toLowerCase())) : data

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  const openModal = (kw: any) => { setEt(kw.keyword || ''); setEl(kw.language || 'en'); setECat(kw.type || kw.category || 'generic'); setModal({ open: true, kw }) }
  const saveEdit = async () => {
    if (!modal.kw?.id || !et.trim()) return
    setESaving(true)
    try { await fetch('/api/keywords', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: modal.kw.id, text: et.trim(), language: el, category: eCat }) }); setModal({ open: false, kw: null }); q.refetch() } catch {}
    finally { setESaving(false) }
  }

  const exportCsv = () => {
    if (!data.length) return
    const h = ['keyword','total_videos',...brands,'Other']
    const r = data.map((d: any) => [`"${d.keyword.replace(/"/g,'""')}"`, d.total_videos ?? 0, ...brands.map(b => (d[b]??0).toFixed(1)), (d.Other??0).toFixed(1)].join(','))
    const b = new Blob([[h.join(','), ...r].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'keyword_sov.csv'; a.click()
  }

  const A = useMemo(() => {
    const avgSov = brands.map((b, i) => ({
      brand: b.length > 22 ? b.slice(0, 22) + '…' : b,
      fullBrand: b,
      avg: data.length ? data.reduce((s, kw) => s + Number(kw[b]??0), 0) / data.length : 0,
      f: bc(b, i),
    })).sort((a, b) => b.avg - a.avg)

    const dom: Record<string, number> = {}
    brands.forEach(b => dom[b] = 0)
    data.forEach(kw => {
      const best = brands.reduce((a, b) => Number(kw[b]??0) > Number(kw[a]??0) ? b : a, brands[0])
      if (best) dom[best] = (dom[best]??0) + 1
    })
    const domPie = brands.map((b, i) => ({ n: b, v: dom[b]??0, f: bc(b, i) })).filter(d => d.v > 0)

    const kwA = data.map(kw => {
      const bSovs = brands.map(b => ({ n: b, v: Number(kw[b]??0) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v)
      const top = bSovs[0]?.n || '—'
      const topV = bSovs[0]?.v || 0
      const cs = parseFloat((1 - topV / 100).toFixed(2))
      return {
        keyword: kw.keyword, videos: Number(kw.total_videos??0),
        top, topV, cs,
        cl: cs > 0.5 ? 'High' : cs > 0.25 ? 'Medium' : 'Low',
        cc: cs > 0.5 ? '#059669' : cs > 0.25 ? '#D97706' : '#DC2626',
        bc: bSovs.length,
        opp: cs > 0.4 && Number(kw.total_videos??0) > 0,
        brands: bSovs,
      }
    })

    const totalKws = data.length
    const totalVids = data.reduce((s, kw) => s + Number(kw.total_videos ?? 0), 0)
    const avgC = totalKws ? kwA.reduce((s, k) => s + k.cs, 0) / totalKws : 0
    const opps = kwA.filter(k => k.opp).sort((a, b) => b.videos - a.videos)

    return { avgSov, domPie, kwA, totalKws, totalVids, avgC, opps }
  }, [data, brands])

  const sortedData = useMemo(() =>
    filtered.slice().sort((a, b) => {
      const av = Number(a[sk]??0), bv = Number(b[sk]??0)
      return sd ? bv - av : av - bv
    }), [filtered, sk, sd])

  const ch = Math.max(300, Math.min(filtered.length, 50) * 42)
  const sortCb = (k: string) => () => { sk === k ? setSd(v => !v) : (setSk(k), setSd(true)) }

  if (q.isLoading) return <div className="anim-fade-up"><PageSkeleton cols={4} rows={5} /></div>

  if (!activeCampaignId) return (
    <div className="anim-fade-up">
      <div className="page-header"><div><h1 className="page-title">Keyword <span className="accent">SOV</span></h1><p className="page-subtitle">Competitive brand share per keyword</p></div></div>
      <EmptyState
        icon={<AlertCircle size={36} strokeWidth={1.5} style={{ color: 'var(--neutral-300)' }} />}
        title="Select a Campaign"
        body="Choose a campaign to view keyword SOV analysis"
      />
    </div>
  )

  return (
    <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: 8 }}>
            Keyword Share of Voice Intelligence
            {q.isLoading && <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)', fontWeight: 600, marginLeft: 8 }}>Loading...</span>}
          </div>
          <div style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)', marginTop: 4 }}>
            Competitive brand share per keyword — corrected attribution, contest scoring, opportunity signals
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="toggle-group">
            {(['chart','heatmap','table'] as const).map(m => (
              <button key={m} onClick={() => setVm(m)} className={`toggle-btn ${vm === m ? 'active' : ''}`}>
                {m === 'chart' ? 'Chart' : m === 'heatmap' ? 'Heatmap' : 'Table'}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} disabled={!data.length} className="btn btn-sm" style={{ opacity: data.length ? 1 : 0.5 }}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      <SharedFilterBar hasActiveFilters={lang !== 'all' || type !== 'all'} onReset={() => { setLang('all'); setType('all') }} hideLanguageFilter>
        <div style={{ minWidth: 130 }}>
          <select className="input" value={lang} onChange={e => setLang(e.target.value)} style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
            {LANG_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 120 }}>
          <select className="input" value={type} onChange={e => setType(e.target.value)} style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
            {TYPE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      </SharedFilterBar>

      {!data.length ? (
        <EmptyState
          icon={<AlertCircle size={36} strokeWidth={1.5} style={{ color: 'var(--neutral-300)' }} />}
          title="No Keyword SOV Data"
          body={<>Add keywords and trigger a scrape from <Link href="/control" style={{ color: 'var(--accent)', fontWeight: 600 }}>Campaign Control</Link> to generate SOV statistics.</>}
        />
      ) : (
        <>
          {/* KPI Cards — Creators pattern */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <MetricCard label="Keywords" value={A.totalKws} icon={Hash} color="var(--accent)" sub="Tracked in campaign" info="Total number of active keywords being monitored for brand SOV." />
            <MetricCard label="Videos" value={fm(A.totalVids)} icon={Eye} color="var(--info)" sub="Across all keywords" info="Total videos associated with tracked keywords across all brands." />
            <MetricCard label="Total Views" value={fm(grandTotalViews)} icon={EyeIcon} color="var(--warning)" sub="Combined viewership" info="Sum of all video view counts across every tracked keyword." />
            <MetricCard label="Brands" value={brands.length} icon={Layers} color="#EC4899" sub="Detected in results" info="Number of distinct brands detected across all keyword search results." />
            <MetricCard label="Contest Index" value={A.avgC.toFixed(2)} icon={TrendingUp} color="var(--success-text)" sub={A.avgC > 0.4 ? 'Competitive market' : A.avgC > 0.2 ? 'Moderate contest' : 'Brand-dominated'} info="Higher = more contested. Measures how evenly SOV is distributed across brands." />
            <MetricCard label="Lead Brand" value={A.avgSov[0]?.fullBrand || '—'} icon={Award} color="#EC4899" sub={`${A.avgSov[0]?.avg.toFixed(1) || '0'}% avg SOV`} info="Brand with highest average share of voice across all keywords." />
          </div>

          {/* Top Keywords Intelligence — Creators pattern */}
          <div>
            <div className="t-h2" style={{ marginBottom: 16 }}>Top Keywords Intelligence</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {A.kwA.sort((a, b) => b.videos - a.videos).slice(0, 10).map((kw, i) => (
                <div
                  key={kw.keyword}
                  onClick={() => setExpandedKw(expandedKw === kw.keyword ? null : kw.keyword)}
                  style={{ background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg-base) 100%)', borderRadius: 'var(--radius-lg)', border: expandedKw === kw.keyword ? '1.5px solid var(--accent)' : '1px solid var(--border-2)', padding: 20, boxShadow: expandedKw === kw.keyword ? '0 4px 16px rgba(26,115,232,0.12)' : 'var(--shadow-sm)', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { if (expandedKw !== kw.keyword) { e.currentTarget.style.borderColor = 'var(--neutral-300)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' } }}
                  onMouseLeave={e => { if (expandedKw !== kw.keyword) { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' } }}
                >
                  <div style={{ position: 'absolute', top: -14, right: -10, fontSize: 64, fontWeight: 900, color: 'var(--bg-hover)', zIndex: 0 }}>#{i + 1}</div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      {kw.opp && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'rgba(5,150,105,0.08)', color: 'var(--success-text)' }}>OPP</span>}
                      <Badge fg={kw.cc}>{kw.cl} contest</Badge>
                    </div>
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 12, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{kw.keyword}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Videos</div>
                          <div style={{ fontSize: 'var(--fs-h1)', fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{kw.videos}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Views</div>
                          <div style={{ fontSize: 'var(--fs-h3)', fontWeight: 800, color: 'var(--text-bright)', fontFamily: 'var(--font-mono)' }}>{fm(data.find((d: any) => d.keyword === kw.keyword)?.avg_views || 0)}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Top Brand</div>
                          <div style={{ fontSize: 'var(--fs-label)', fontWeight: 800, color: 'var(--text-secondary)' }}>{kw.top}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Top SOV</div>
                          <div style={{ fontSize: 'var(--fs-label)', fontWeight: 800, fontFamily: 'var(--font-mono)', color: kw.topV > 60 ? 'var(--danger-text)' : kw.topV > 40 ? 'var(--warning-text)' : 'var(--success-text)' }}>{kw.topV.toFixed(1)}%</div>
                        </div>
                      </div>
                      {kw.brands.length > 0 && (
                        <div style={{ marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {kw.brands.slice(0, 3).map((b: any) => (
                            <span key={b.n} style={{ fontSize: 9, fontWeight: 700, background: `${bc(b.n, 0)}15`, color: bc(b.n, 0), padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>{b.n}</span>
                          ))}
                          {kw.brands.length > 3 && <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--bg-hover)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>+{kw.brands.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Overview Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: A.domPie.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
            <Card title="Average SOV per Brand" sub="Mean share of voice — corrected attribution, rows sum to 100%" height={Math.max(200, A.avgSov.length * 36)}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={A.avgSov} layout="vertical" margin={{ top: 4, right: 50, left: 56, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light)" />
                  <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: any) => `${v}%`} />
                  <YAxis type="category" dataKey="brand" tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip
                    formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Avg SOV']}
                    contentStyle={{ background: 'var(--tooltip-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 11, fontFamily: 'var(--font-mono)', padding: '8px 12px' }}
                    labelStyle={{ color: 'var(--text-muted)', fontSize: 9, fontWeight: 600, marginBottom: 2 }}
                    itemStyle={{ color: 'var(--tooltip-text)', fontWeight: 700 }}
                    cursor={{ fill: 'rgba(26,115,232,0.04)' }}
                  />
                  <Bar dataKey="avg" radius={[0, 6, 6, 0]} barSize={16}>
                    {A.avgSov.map((d, i) => <Cell key={i} fill={d.f} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {A.domPie.length > 0 && (
              <Card title="Keyword Dominance" sub="Keywords where each brand has the highest SOV%" height={240}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={A.domPie} dataKey="v" nameKey="n" cx="40%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                      {A.domPie.map((d, i) => <Cell key={i} fill={d.f} stroke="transparent" />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} keywords`, 'Dominates']} contentStyle={{ background: 'var(--tooltip-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 11 }} labelStyle={{ color: 'var(--text-muted)' }} itemStyle={{ color: 'var(--tooltip-text)' }} />
                    <Legend iconType="circle" layout="horizontal" align="left" verticalAlign="top" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>

          {/* Competition + Opportunities */}
          <div style={{ display: 'grid', gridTemplateColumns: A.opps.length > 0 ? '1fr 260px' : '1fr', gap: 16 }}>
            <Card title="Competition Analysis" sub={A.opps.length > 0 ? `${A.opps.length} competitive opportunities identified` : 'High = no dominant brand, Low = brand stronghold'} height={320}>
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 280 }}>
                <table className="data-table" style={{ width: '100%', minWidth: 520, fontSize: 'var(--fs-sm)' }}>
                  <thead>
                    <tr>
                      {[{ k: 'keyword', l: 'Keyword', a: 'left' as const }, { k: 'videos', l: 'Videos', a: 'right' as const }, { k: 'brands', l: 'Brands', a: 'center' as const }, { k: 'top', l: 'Top Brand', a: 'left' as const }, { k: 'topV', l: 'Top SOV', a: 'right' as const }, { k: 'contest', l: 'Contest', a: 'center' as const }].map(th => (
                        <th key={th.k} style={{ textAlign: th.a }}>{th.l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {A.kwA.sort((x, y) => y.cs - x.cs).slice(0, 12).map((k) => (
                      <tr key={k.keyword} className="row-hover" style={{ cursor: 'default' }}>
                        <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={k.keyword}>{k.keyword}</span>
                          {k.opp && <Badge fg="#059669"><Zap size={8} /> Opp</Badge>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{k.videos}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{k.bc}</td>
                        <td>{k.top}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: k.topV > 60 ? 'var(--danger-text)' : k.topV > 40 ? 'var(--warning-text)' : 'var(--success-text)' }}>{k.topV.toFixed(1)}%</td>
                        <td style={{ textAlign: 'center' }}><Badge fg={k.cc}>{k.cl}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {A.opps.length > 0 && (
              <Card title="Opportunities" sub="High contest + active video volume" height={320}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 280 }}>
                  {A.opps.slice(0, 6).map((k) => (
                    <div key={k.keyword} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.12)' }}>
                      <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={k.keyword}>{k.keyword}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 'var(--fs-micro)', color: 'var(--text-secondary)' }}>
                        <span>{k.videos} videos</span>
                        <span>{k.bc} brands</span>
                        <span style={{ fontWeight: 700, color: 'var(--success-text)' }}>CS {k.cs.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Main Viz */}
          {vm === 'chart' ? (
            <Card title="Keyword-wise Brand SOV" sub={`Stacked horizontal bars — each row = 100% of attributed views. Total: ${fm(A.totalVids)} videos across ${A.totalKws} keywords`} height={ch}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filtered} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light)" />
                  <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: any) => `${v}%`} />
                  <YAxis dataKey="keyword" type="category"
                    tick={({ x, y, payload }) => {
                      const m = filtered.find(d => d.keyword === payload.value)
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={-10} y={0} dy={4} textAnchor="end" fill="var(--text-bright)" fontSize={11} fontWeight={600}>
                            {payload.value.length > 28 ? payload.value.slice(0, 28) + '…' : payload.value}
                          </text>
                          {m?.total_videos !== undefined && (
                            <text x={-10} y={13} dy={4} textAnchor="end" fill="var(--text-muted)" fontSize={9}>{m.total_videos} videos</text>
                          )}
                        </g>
                      )
                    }}
                    axisLine={false} tickLine={false} width={250} />
                  <Tooltip content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null
                    const s = [...payload].filter((p: any) => p.value > 0).sort((a: any, b: any) => b.value - a.value)
                    return (
                      <div style={{ background: 'var(--tooltip-bg)', borderRadius: 'var(--radius-md)', padding: '10px 14px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', minWidth: 170 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{label}</div>
                        {s.map((p: any) => (
                          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 7, height: 7, borderRadius: 2, background: p.fill || p.color }} />
                              <span style={{ fontSize: 11, color: 'var(--neutral-300)' }}>{p.name}</span>
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tooltip-text)' }}>{p.value.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    )
                  }} cursor={{ fill: 'rgba(26,115,232,0.02)' }} />
                  <Legend iconType="circle" layout="horizontal" verticalAlign="top" align="right" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                  {brands.map((b, i) => (
                    <Bar key={b} dataKey={b} name={b} stackId="a" fill={bc(b, i)} barSize={14}
                      radius={i === brands.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                  ))}
                  <Bar dataKey="Other" name="Other" stackId="a" fill="#E2E8F0" barSize={14} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          ) : vm === 'heatmap' ? (
            <Card title="Keyword × Brand Heatmap" sub="Darker = higher SOV%. Each row sums to 100%." height={Math.max(300, filtered.length * 38)}>
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 600 }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3, minWidth: 500 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', minWidth: 130 }}>Keyword</th>
                      {brands.map((b, bi) => (
                        <th key={b} style={{ padding: '8px 8px', textAlign: 'center', fontSize: 'var(--fs-micro)', fontWeight: 700, color: bc(b, bi), minWidth: 68 }} title={b}>{b.length > 10 ? b.slice(0, 10) + '…' : b}</th>
                      ))}
                      <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-muted)', minWidth: 50 }}>Other</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(kw => (
                      <tr key={kw.keyword}>
                        <td style={{ padding: '6px 12px', fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text-bright)', whiteSpace: 'nowrap' }}>
                          <div>{kw.keyword}</div>
                          {kw.total_videos !== undefined && <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>{kw.total_videos} videos</div>}
                        </td>
                        {brands.map((b, bi) => {
                          const val = Number(kw[b]??0)
                          const color = bc(b, bi)
                          const w = `${Math.round(Math.max(0.04, Math.min(1, val / 100)) * 100)}%`
                          return (
                            <td key={b} style={{ padding: '6px 8px', textAlign: 'center' }} title={`${b}: ${val.toFixed(1)}%`}>
                              <div style={{ width: '100%', height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', display: 'flex', alignItems: 'center' }}>
                                <div style={{ height: '76%', borderRadius: 'var(--radius-sm)', background: color, width: w, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--surface)', fontWeight: 700, fontSize: 'var(--fs-micro)' }}>
                                  {val > 5 ? `${val.toFixed(0)}%` : ''}
                                </div>
                              </div>
                            </td>
                          )
                        })}
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <div style={{ width: '100%', height: 30, borderRadius: 'var(--radius-sm)', background: Number(kw.Other??0) > 0 ? 'rgba(148,163,184,0.12)' : 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {Number(kw.Other??0) > 0 ? `${Number(kw.Other).toFixed(0)}%` : '—'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card title="Keyword Table" sub="Click column headers to sort. Click a row to expand details." height={400}
              right={<button onClick={exportCsv} className="btn btn-sm"><Download size={13} /> CSV</button>}>
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 360 }}>
                <table className="data-table" style={{ width: '100%', minWidth: 750, fontSize: 'var(--fs-sm)' }}>
                  <thead>
                    <tr>
                      {[{ k: 'keyword', l: 'Keyword', a: 'left' as const }, { k: 'total_videos', l: 'Videos', a: 'right' as const }, ...brands.map(b => ({ k: b, l: b.length > 10 ? b.slice(0, 10) + '…' : b, a: 'right' as const })), { k: 'Other', l: 'Other', a: 'right' as const }, { k: 'edit', l: '', a: 'center' as const }].map(th => (
                        <th key={th.k} onClick={th.k !== 'edit' && th.k !== 'Other' ? sortCb(th.k) : undefined}
                          style={{ textAlign: th.a, cursor: th.k !== 'edit' && th.k !== 'Other' ? 'pointer' : 'default', userSelect: 'none' }} title={th.k}>
                          {th.l} {sk === th.k ? (sd ? '▼' : '▲') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((kw: any) => {
                      const isExpanded = expandedKw === kw.keyword
                      const kwInfo = A.kwA.find(k => k.keyword === kw.keyword)
                      return (
                        <React.Fragment key={kw.keyword}>
                          <tr className="row-hover" style={{ cursor: 'pointer' }} onClick={() => setExpandedKw(isExpanded ? null : kw.keyword)}>
                            <td style={{ fontWeight: 600 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isExpanded ? <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />}
                                {kw.keyword}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{kw.total_videos ?? 0}</td>
                            {brands.map(b => {
                              const val = Number(kw[b]??0)
                              return (
                                <td key={b} style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: val > 50 ? 'var(--success-text)' : val > 30 ? 'var(--text-bright)' : 'var(--text-secondary)' }}>{val.toFixed(1)}%</td>
                              )
                            })}
                            <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{(Number(kw.Other??0)).toFixed(1)}%</td>
                            <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => openModal(kw)} className="btn btn-xs btn-ghost" style={{ gap: 4 }}>
                                <Pencil size={11} /> Edit
                              </button>
                            </td>
                          </tr>
                           <AnimatePresence>
                            {isExpanded && kwInfo && (
                              <tr>
                                <td colSpan={brands.length + 4} style={{ padding: 0, border: 'none' }}>
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }} style={{ overflow: 'hidden' }}>
                                    <div style={{ padding: '14px 18px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-light)' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                        {/* Brand Breakdown */}
                                        <div>
                                          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>Brand Breakdown</div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {kwInfo.brands.map((b: any) => (
                                              <div key={b.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: 2, background: bc(b.n, 0), flexShrink: 0 }} />
                                                <span style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.n}>{b.n.length > 16 ? b.n.slice(0, 16) + '…' : b.n}</span>
                                                <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: b.v > 50 ? 'var(--success-text)' : b.v > 30 ? 'var(--text-bright)' : 'var(--text-secondary)' }}>{b.v.toFixed(1)}%</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        {/* SOV Distribution */}
                                        <div>
                                          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>SOV Distribution</div>
                                          <div style={{ height: 80 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                              <BarChart data={kwInfo.brands} margin={{ top: 2, right: 4, bottom: 0, left: 4 }}>
                                                <Bar dataKey="v" radius={[3, 3, 0, 0]} barSize={14}>
                                                  {kwInfo.brands.map((b: any, i: number) => <Cell key={i} fill={bc(b.n, i)} />)}
                                                </Bar>
                                                <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'SOV']} contentStyle={{ background: 'var(--tooltip-bg)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 10 }} itemStyle={{ color: 'var(--tooltip-text)' }} />
                                              </BarChart>
                                            </ResponsiveContainer>
                                          </div>
                                        </div>
                                        {/* Performance Metrics */}
                                        <div>
                                          <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>Performance</div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--fs-label)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Videos</span>
                                              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{kw.videos}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Total Views</span>
                                              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fm(data.find((d: any) => d.keyword === kw.keyword)?.total_views || 0)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Avg Views</span>
                                              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fm(data.find((d: any) => d.keyword === kw.keyword)?.avg_views || 0)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Top Brand</span>
                                              <span style={{ fontWeight: 700 }}>{kwInfo.top}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Brands</span>
                                              <span style={{ fontWeight: 700 }}>{kwInfo.bc}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span style={{ color: 'var(--text-secondary)' }}>Contest</span>
                                              <Badge fg={kwInfo.cc}>{kwInfo.cl} ({kwInfo.cs.toFixed(2)})</Badge>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Top Video */}
                                        {(() => {
                                          const kwData = data.find((d: any) => d.keyword === kw.keyword)
                                          if (!kwData?.top_video_title) return null
                                          return (
                                            <div>
                                              <div style={{ fontSize: 'var(--fs-micro)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>Top Video</div>
                                              <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--border-2)' }}>
                                                <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{kwData.top_video_title}</div>
                                                <div style={{ display: 'flex', gap: 8, fontSize: 'var(--fs-micro)', color: 'var(--text-secondary)' }}>
                                                  {kwData.top_video_channel && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><User size={9} /> {kwData.top_video_channel.length > 18 ? kwData.top_video_channel.slice(0, 18) + '…' : kwData.top_video_channel}</span>}
                                                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700, color: 'var(--accent)' }}><Eye size={9} /> {fm(kwData.top_video_views)}</span>
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })()}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Edit Modal */}
      {modal.open && (
        <div className="modal-scrim" style={{ backdropFilter: 'blur(4px)' }} onClick={() => setModal({ open: false, kw: null })}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.2 }}
            className="modal-panel"
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-bright)' }}>Edit Keyword</div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: 3 }}>Update text, language, or type</div>
              </div>
              <button onClick={() => setModal({ open: false, kw: null })} style={{ padding: 6, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--bg-hover)', cursor: 'pointer', display: 'flex' }}>
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="field-label">Keyword Text</label>
              <input type="text" value={et} onChange={e => setEt(e.target.value)} className="input" placeholder="e.g. best water purifier 2026" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="field-label">Language</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ELANG.map(o => (
                  <button key={o.v} onClick={() => setEl(o.v)} className={`choice${el === o.v ? ' active' : ''}`}>{o.l}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="field-label">Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['generic','branded','comparison'].map(v => (
                  <button key={v} onClick={() => setECat(v)} className={`choice${eCat === v ? ' active' : ''}`}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveEdit} disabled={eSaving || !et.trim()} className="btn btn-blue" style={{ flex: 1, justifyContent: 'center' }}>
                {eSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : '✓'} {eSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setModal({ open: false, kw: null })} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
