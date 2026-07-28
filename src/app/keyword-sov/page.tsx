'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { useCampaignStore } from '@/lib/store'
import { useFilterStore } from '@/lib/filter-store'
import SharedFilterBar from '@/components/SharedFilterBar'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle, Hash, BarChart2, BarChart3, Download,
  Pencil, X, Loader2, Zap, Award, Layers, Eye, TrendingUp
} from 'lucide-react'
import { PageSkeleton } from '@/components/PageSkeleton'
import Link from 'next/link'

/* ── Palette ── */
const $ = {
  blue: '#2563EB', green: '#059669', amber: '#D97706', red: '#DC2626',
  purple: '#7C3AED', pink: '#DB2777', teal: '#0D9488',
  text: '#0F172A', sec: '#64748B', mute: '#94A3B8', line: '#F1F5F9', bg: '#FAFBFC',
  card: { bg: '#fff', br: 12, bd: '1px solid #F1F5F9', sh: '0 1px 3px rgba(0,0,0,0.04)' },
}
const BRAND_COLORS = ['#4C78A8','#54A24B','#E45756','#72B7B2','#EECA3B','#B279A2','#FF9DA6','#9D755D','#BAB0AC','#D67195','#F58518']
function bc(name: string, i: number) { let h = 0; for (let j = 0; j < name.length; j++) h = (h << 5) - h + name.charCodeAt(j) | 0; return BRAND_COLORS[Math.abs(h) % BRAND_COLORS.length] }

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

/* ── Components ── */
function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const s = [...payload].filter(p => p.value > 0).sort((a, b) => b.value - a.value)
  return (
    <div style={{ background: '#1E293B', borderRadius: 10, padding: '10px 14px', minWidth: 170, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>{label}</div>
      {s.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: p.fill || p.color }} />
            <span style={{ fontSize: 11, color: '#CBD5E1' }}>{p.name}</span>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#FFF' }}>{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

function Blk({ children, style: s2, ...rest }: any) {
  return <div style={{ ...$.card, ...s2 }} {...rest}>{children}</div>
}

function Badge({ fg, bg: bg2, children }: any) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: bg2 || `${fg}12`, color: fg }}>{children}</span>
}

/* ── Page ── */
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

  /* ── Analytics ── */
  const A = useMemo(() => {
    const avgSov = brands.map((b, i) => ({
      brand: b.length > 22 ? b.slice(0, 22) + '…' : b,
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
        cc: cs > 0.5 ? $.green : cs > 0.25 ? $.amber : $.red,
        bc: bSovs.length,
        opp: cs > 0.4 && Number(kw.total_videos??0) > 0,
      }
    })

    const totalKws = data.length
    const totalVids = data.reduce((s, kw) => s + Number(kw.total_videos??0), 0)
    const avgC = totalKws ? kwA.reduce((s, k) => s + k.cs, 0) / totalKws : 0
    const opps = kwA.filter(k => k.opp).sort((a, b) => b.videos - a.videos)

    return { avgSov, domPie, kwA, totalKws, totalVids, avgC, opps }
  }, [data, brands])

  const sortedData = useMemo(() =>
    filtered.slice().sort((a, b) => {
      const av = Number(a[sk]??0), bv = Number(b[sk]??0)
      return sd ? bv - av : av - bv
    }), [filtered, sk, sd])

  const ch = Math.max(240, filtered.length * 38)
  const sortCb = (k: string) => () => { sk === k ? setSd(v => !v) : (setSk(k), setSd(true)) }

  if (q.isLoading) return <div className="anim-fade-up"><PageSkeleton cols={4} rows={5} /></div>

  if (!activeCampaignId) return (
    <div className="anim-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Keyword <span className="accent">SOV</span></h1>
          <p className="page-subtitle">Competitive brand share per keyword</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, background: '#fff', borderRadius: 14, border: '1px solid #F1F5F9' }}>
        <AlertCircle size={36} style={{ color: '#CBD5E1' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>Select a Campaign</div>
        <div style={{ fontSize: 13, color: '#64748B' }}>Choose a campaign to view keyword SOV analysis</div>
      </div>
    </div>
  )

  return (
    <div className="anim-fade-up">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}tr.hv td{transition:background .1s}tr.hv:hover td{background:#F8FAFC!important}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: $.text, letterSpacing: '-0.3px', margin: 0 }}>Keyword <span style={{ color: $.blue }}>SOV</span></h1>
          <p style={{ fontSize: 12, color: $.mute, margin: '3px 0 0' }}>Competitive brand share per keyword — corrected attribution, contest scoring, opportunity signals</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, padding: 3, background: '#F1F5F9', borderRadius: 10 }}>
            {(['chart','heatmap','table'] as const).map(m => (
              <button key={m} onClick={() => setVm(m)}
                style={{ padding: '5px 14px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  background: vm === m ? '#fff' : 'transparent', color: vm === m ? $.blue : $.sec,
                  boxShadow: vm === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.12s' }}>
                {m === 'chart' ? 'Chart' : m === 'heatmap' ? 'Heatmap' : 'Table'}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} disabled={!data.length}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: $.sec, fontSize: 11, fontWeight: 600, cursor: data.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: data.length ? 1 : 0.5 }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Search & Select Filters */}
      <SharedFilterBar hasActiveFilters={lang !== 'all' || type !== 'all'} onReset={() => { setLang('all'); setType('all') }} style={{ marginBottom: 20 }}>
        {/* Language Filter */}
        <div style={{ minWidth: 130 }}>
          <select className="input" value={lang} onChange={e => setLang(e.target.value)} style={{ cursor: 'pointer', padding: '6px 12px' }}>
            {LANG_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>

        {/* Type Filter */}
        <div style={{ minWidth: 120 }}>
          <select className="input" value={type} onChange={e => setType(e.target.value)} style={{ cursor: 'pointer', padding: '6px 12px' }}>
            {TYPE_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      </SharedFilterBar>

      {/* ── Empty ── */}
      {!data.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, background: '#fff', borderRadius: 14, border: '1px solid #F1F5F9' }}>
          <AlertCircle size={36} style={{ color: '#CBD5E1' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>No Keyword SOV Data</div>
          <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: 360 }}>
            Add keywords and trigger a scrape from <Link href="/control" style={{ color: $.blue, fontWeight: 600 }}>Campaign Control</Link> to generate SOV statistics.
          </div>
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { icon: Hash, l: 'Keywords', v: A.totalKws, sub: 'tracked in campaign', c: $.blue },
              { icon: Eye, l: 'Videos', v: fm(A.totalVids), sub: 'across all keywords', c: $.purple },
              { icon: Layers, l: 'Brands', v: brands.length, sub: 'detected in results', c: $.pink },
              { icon: TrendingUp, l: 'Contest Index', v: A.avgC.toFixed(2), sub: A.avgC > 0.4 ? 'Competitive market' : A.avgC > 0.2 ? 'Moderate contest' : 'Brand-dominated', c: $.amber, bar: A.avgC },
              { icon: Award, l: 'Lead Brand', v: A.avgSov[0]?.brand || '—', sub: `${A.avgSov[0]?.avg.toFixed(1) || '0'}% avg SOV`, c: $.green, bar: (A.avgSov[0]?.avg || 0) / 100 },
            ].map(card => (
              <div key={card.l} style={{ position: 'relative', overflow: 'hidden', background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {card.bar !== undefined && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#F1F5F9' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, card.bar * 100)}%`, background: card.c, borderRadius: '0 2px 2px 0', transition: 'width 0.6s ease' }} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `${card.c}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <card.icon size={13} style={{ color: card.c }} />
                  </div>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: $.sec, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{card.l}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: $.text, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{card.v}</div>
                <div style={{ fontSize: 10, color: $.mute, marginTop: 4 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Brand Overview ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
            <Blk style={{ padding: '20px 22px' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: $.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart2 size={14} style={{ color: $.blue }} /> Average SOV per Brand
                </div>
                <div style={{ fontSize: 10.5, color: $.mute, marginTop: 2 }}>Mean share of voice — corrected attribution, rows sum to 100%</div>
              </div>
              <div style={{ height: Math.max(180, A.avgSov.length * 36) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={A.avgSov} layout="vertical" margin={{ top: 4, right: 50, left: 56, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: any) => `${v}%`} />
                    <YAxis type="category" dataKey="brand" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} width={56} />
                    <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Avg SOV']} contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#FFF' }} />
                    <Bar dataKey="avg" radius={[0, 6, 6, 0]} barSize={16}>
                      {A.avgSov.map((d, i) => <Cell key={i} fill={d.f} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Blk>

            {A.domPie.length > 0 && (
              <Blk style={{ padding: '20px 22px' }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: $.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={14} style={{ color: '#E45756' }} /> Keyword Dominance
                  </div>
                  <div style={{ fontSize: 10.5, color: $.mute, marginTop: 2 }}>Keywords where each brand has the highest SOV%</div>
                </div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={A.domPie} dataKey="v" nameKey="n" cx="40%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                        {A.domPie.map((d, i) => <Cell key={i} fill={d.f} stroke="transparent" />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} keywords`, 'Dominates']} contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#FFF' }} />
                      <Legend iconType="circle" layout="horizontal" align="left" verticalAlign="top" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Blk>
            )}
          </div>

          {/* ── Competition + Opportunities ── */}
          <div style={{ display: 'grid', gridTemplateColumns: A.opps.length > 0 ? '1fr 260px' : '1fr', gap: 16, marginBottom: 20 }}>
            <Blk style={{ padding: '20px 22px' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: $.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={14} style={{ color: $.amber }} /> Competition Analysis
                </div>
                <div style={{ fontSize: 10.5, color: $.mute, marginTop: 2 }}>
                  {A.opps.length > 0
                    ? `Sorted by contest level — ${A.opps.length} keywords identified as competitive opportunities`
                    : 'Sorted by contest level — High = no dominant brand, Low = brand stronghold'}
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                  <thead>
                    <tr>
                      {[{ k: 'keyword', l: 'Keyword', a: 'left' }, { k: 'videos', l: 'Videos', a: 'right' }, { k: 'brands', l: 'Brands', a: 'center' }, { k: 'top', l: 'Top Brand', a: 'left' }, { k: 'topV', l: 'Top SOV', a: 'right' }, { k: 'contest', l: 'Contest', a: 'center' }].map(th => (
                        <th key={th.k} style={{ textAlign: th.a as any, padding: '9px 10px', fontSize: 10, fontWeight: 700, color: $.mute, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${$.line}` }}>
                          {th.l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {A.kwA.sort((x, y) => y.cs - x.cs).slice(0, 12).map((k, i) => (
                      <tr key={k.keyword} className="hv" style={{ borderBottom: i < 11 ? `1px solid ${$.line}` : 'none' }}>
                        <td style={{ padding: '9px 10px', fontSize: 12, fontWeight: 600, color: $.text, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={k.keyword}>{k.keyword}</span>
                          {k.opp && <Badge fg={$.green}><Zap size={8} /> Opp</Badge>}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#334155' }}>{k.videos}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: $.sec }}>{k.bc}</td>
                        <td style={{ padding: '9px 10px', fontSize: 12, color: '#334155' }}>{k.top}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: k.topV > 60 ? $.red : k.topV > 40 ? $.amber : $.green }}>{k.topV.toFixed(1)}%</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                          <Badge fg={k.cc}>{k.cl}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {A.kwA.length > 12 && <div style={{ fontSize: 10, color: $.mute, textAlign: 'center', paddingTop: 10 }}>Top 12 shown — all keywords in the chart below</div>}
              </div>
            </Blk>

            {A.opps.length > 0 && (
              <Blk style={{ padding: '20px 22px' }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: $.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={14} style={{ color: $.green }} /> Opportunities
                  </div>
                  <div style={{ fontSize: 10.5, color: $.mute, marginTop: 2 }}>High contest + active video volume</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {A.opps.slice(0, 6).map((k, i) => (
                    <div key={k.keyword} style={{ padding: '10px 12px', borderRadius: 8, background: '#05966906', border: '1px solid #05966918' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: $.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={k.keyword}>{k.keyword}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 10, color: $.sec }}>
                        <span>{k.videos} videos</span>
                        <span>{k.bc} brands</span>
                        <span style={{ fontWeight: 700, color: $.green }}>CS {k.cs.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  {A.opps.length > 6 && <div style={{ fontSize: 10, color: $.mute, textAlign: 'center' }}>+{A.opps.length - 6} more</div>}
                </div>
              </Blk>
            )}
          </div>

          {/* ── Main Viz ── */}
          {vm === 'chart' ? (
            <Blk style={{ padding: '22px 20px', marginBottom: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: $.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={14} style={{ color: $.blue }} /> Keyword-wise Brand SOV
                </div>
                <div style={{ fontSize: 10.5, color: $.mute, marginTop: 2 }}>Stacked horizontal bars — each row = 100% of attributed views. Corrected: no double-counting.</div>
              </div>
              <div style={{ height: ch }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: any) => `${v}%`} />
                    <YAxis
                      dataKey="keyword"
                      type="category"
                      tick={({ x, y, payload }) => {
                        const m = data.find(d => d.keyword === payload.value)
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={-10} y={0} dy={4} textAnchor="end" fill="#1E293B" fontSize={11} fontWeight={600}>
                              {payload.value.length > 28 ? payload.value.slice(0, 28) + '…' : payload.value}
                            </text>
                            {m?.total_videos !== undefined && (
                              <text x={-10} y={13} dy={4} textAnchor="end" fill="#94A3B8" fontSize={9}>{m.total_videos} videos</text>
                            )}
                          </g>
                        )
                      }}
                      axisLine={false} tickLine={false} width={250}
                    />
                    <Tooltip content={<Tip />} cursor={{ fill: 'rgba(26,115,232,0.02)' }} />
                    <Legend iconType="circle" layout="horizontal" verticalAlign="top" align="right" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                    {brands.map((b, i) => (
                      <Bar key={b} dataKey={b} name={b} stackId="a" fill={bc(b, i)} barSize={14}
                        radius={i === brands.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                    ))}
                    <Bar dataKey="Other" name="Other" stackId="a" fill="#E2E8F0" barSize={14} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Blk>
          ) : vm === 'heatmap' ? (
            <Blk style={{ padding: '18px', marginBottom: 20, overflowX: 'auto' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: $.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={14} style={{ color: $.blue }} /> Keyword × Brand Heatmap
                </div>
                <div style={{ fontSize: 10.5, color: $.mute, marginTop: 2 }}>Darker = higher SOV%. Each row sums to 100%.</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3, minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: $.mute, textTransform: 'uppercase', minWidth: 130 }}>Keyword</th>
                    {brands.map((b, bi) => (
                      <th key={b} style={{ padding: '8px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: bc(b, bi), minWidth: 68 }} title={b}>{b.length > 10 ? b.slice(0, 10) + '…' : b}</th>
                    ))}
                    <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: $.mute, minWidth: 50 }}>Other</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(kw => (
                    <tr key={kw.keyword}>
                      <td style={{ padding: '6px 12px', fontWeight: 600, fontSize: 12, color: $.text, whiteSpace: 'nowrap' }}>
                        <div>{kw.keyword}</div>
                        {kw.total_videos !== undefined && <div style={{ fontSize: 9.5, color: $.mute }}>{kw.total_videos} videos</div>}
                      </td>
                      {brands.map((b, bi) => {
                        const val = Number(kw[b]??0)
                        const color = bc(b, bi)
                        const w = `${Math.round(Math.max(0.04, Math.min(1, val / 100)) * 100)}%`
                        return (
                          <td key={b} style={{ padding: '6px 8px', textAlign: 'center' }} title={`${b}: ${val.toFixed(1)}%`}>
                            <div style={{ width: '100%', height: 30, borderRadius: 6, background: $.bg, display: 'flex', alignItems: 'center' }}>
                              <div style={{ height: '76%', borderRadius: 6, background: color, width: w, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 10 }}>
                                {val > 5 ? `${val.toFixed(0)}%` : ''}
                              </div>
                            </div>
                          </td>
                        )
                      })}
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <div style={{ width: '100%', height: 30, borderRadius: 6, background: Number(kw.Other??0) > 0 ? '#94A3B820' : $.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: $.mute }}>
                          {Number(kw.Other??0) > 0 ? `${Number(kw.Other).toFixed(0)}%` : '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Blk>
          ) : (
            <Blk style={{ padding: '18px', marginBottom: 20, overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: $.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BarChart3 size={14} style={{ color: $.blue }} /> Keyword Table
                  </div>
                  <div style={{ fontSize: 10.5, color: $.mute, marginTop: 2 }}>Click column headers to sort. Exact SOV% — corrected attribution.</div>
                </div>
                <button onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: $.sec, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Download size={13} /> CSV
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
                <thead>
                                      <tr>
                    {[{ k: 'keyword', l: 'Keyword', a: 'left' as const }, { k: 'total_videos', l: 'Videos', a: 'right' as const }, ...brands.map(b => ({ k: b, l: b.length > 10 ? b.slice(0, 10) + '…' : b, a: 'right' as const })), { k: 'Other', l: 'Other', a: 'right' as const }, { k: 'edit', l: '', a: 'center' as const }].map(th => (
                      <th key={th.k} onClick={th.k !== 'edit' && th.k !== 'Other' ? sortCb(th.k) : undefined}
                        style={{ textAlign: th.a, padding: '10px 12px', fontSize: 10, fontWeight: 700, color: $.mute, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${$.line}`,
                          cursor: th.k !== 'edit' && th.k !== 'Other' ? 'pointer' : 'default', userSelect: 'none' }} title={th.k}>
                        {th.l} {sk === th.k ? (sd ? '▼' : '▲') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((kw: any) => (
                    <tr key={kw.keyword} className="hv">
                      <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, color: $.text, borderBottom: `1px solid ${$.line}` }}>{kw.keyword}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: $.text, borderBottom: `1px solid ${$.line}` }}>{kw.total_videos ?? 0}</td>
                      {brands.map(b => (
                        <td key={b} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: $.text, borderBottom: `1px solid ${$.line}` }}>{(Number(kw[b]??0)).toFixed(1)}%</td>
                      ))}
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: $.mute, borderBottom: `1px solid ${$.line}` }}>{(Number(kw.Other??0)).toFixed(1)}%</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: `1px solid ${$.line}` }}>
                        <button onClick={() => openModal(kw)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: $.bg, color: $.sec, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = $.blue; e.currentTarget.style.color = $.blue }}
                          onMouseLeave={e => { e.currentTarget.style.background = $.bg; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = $.sec }}>
                          <Pencil size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Blk>
          )}
        </>
      )}

      {/* ── Edit Modal ── */}
      {modal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} onClick={() => setModal({ open: false, kw: null })}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: $.text }}>Edit Keyword</div>
                <div style={{ fontSize: 12, color: $.sec, marginTop: 3 }}>Update text, language, or type</div>
              </div>
              <button onClick={() => setModal({ open: false, kw: null })} style={{ padding: 6, borderRadius: 8, border: 'none', background: $.bg, cursor: 'pointer', display: 'flex' }}>
                <X size={16} style={{ color: $.sec }} />
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: $.sec, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Keyword Text</label>
              <input type="text" value={et} onChange={e => setEt(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13.5, fontWeight: 500, color: $.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                placeholder="e.g. best water purifier 2026" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: $.sec, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Language</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ELANG.map(o => (
                  <button key={o.v} onClick={() => setEl(o.v)}
                    style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                      background: el === o.v ? '#0F172A' : $.bg, color: el === o.v ? '#FFF' : '#475569',
                      border: `1.5px solid ${el === o.v ? '#0F172A' : '#E2E8F0'}` }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: $.sec, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['generic','branded','comparison'].map(v => (
                  <button key={v} onClick={() => setECat(v)}
                    style={{ padding: '7px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                      background: eCat === v ? '#0F172A' : $.bg, color: eCat === v ? '#FFF' : '#475569',
                      border: `1.5px solid ${eCat === v ? '#0F172A' : '#E2E8F0'}` }}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveEdit} disabled={eSaving || !et.trim()}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.12s',
                  cursor: eSaving || !et.trim() ? 'not-allowed' : 'pointer',
                  background: eSaving || !et.trim() ? '#CBD5E1' : $.blue, color: '#FFF', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {eSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : '✓'} {eSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setModal({ open: false, kw: null })}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: $.bg, color: '#475569', border: '1px solid #E2E8F0', transition: 'all 0.12s' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
