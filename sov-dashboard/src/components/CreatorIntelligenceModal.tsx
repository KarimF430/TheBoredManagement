'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X, Download, Eye, Star, TrendingUp, Search, Video, ExternalLink,
  ChevronDown, ChevronRight, Hash, Award, Loader2, AlertCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const COLORS = ['#1A73E8', '#00C853', '#FF6D00', '#7C3AED', '#FF2D55', '#06B6D4', '#EC4899', '#14B8A6']

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

function rankColor(n: number) {
  return n <= 3 ? 'badge-green' : n <= 5 ? 'badge-blue' : n <= 10 ? 'badge-purple' : 'badge-orange'
}

interface CreatorIntelligenceModalProps {
  isOpen: boolean
  onClose: () => void
  creatorId: string
  creatorName: string
  campaignId: string | null
  format: string
}

export default function CreatorIntelligenceModal({
  isOpen, onClose, creatorId, creatorName, campaignId, format
}: CreatorIntelligenceModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kwTab, setKwTab] = useState<'top5' | 'top10' | 'beyond10'>('top5')
  const [expandedKws, setExpandedKws] = useState<Set<string>>(new Set())
  const [kwSort, setKwSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'rank', dir: 'asc' })

  useEffect(() => {
    if (!isOpen || !creatorId || !campaignId) return
    setLoading(true)
    setError(null)
    fetch(`/api/creators/${encodeURIComponent(creatorId)}?campaign_id=${campaignId}&format=${format}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError('Failed to load creator intelligence'))
      .finally(() => setLoading(false))
  }, [isOpen, creatorId, campaignId, format])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const toggleKw = (kw: string) => {
    setExpandedKws(prev => { const n = new Set(prev); if (n.has(kw)) n.delete(kw); else n.add(kw); return n })
  }

  const sortedKeywords = useMemo(() => {
    if (!data) return []
    const kws = data.keywordRankings?.[kwTab] || []
    return [...kws].sort((a: any, b: any) => {
      const va = kwSort.key === 'keyword' ? a.keyword : kwSort.key === 'videos' ? (a.videos?.length || a.videoCount || 0) : kwSort.key === 'totalViews' ? a.totalViews : a.rank
      const vb = kwSort.key === 'keyword' ? b.keyword : kwSort.key === 'videos' ? (b.videos?.length || b.videoCount || 0) : kwSort.key === 'totalViews' ? b.totalViews : b.rank
      if (typeof va === 'string') return kwSort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return kwSort.dir === 'asc' ? va - vb : vb - va
    })
  }, [data, kwTab, kwSort])

  const brandChartData = useMemo(() => {
    if (!data?.brandPerformance) return []
    return data.brandPerformance.slice(0, 8).map((b: any, i: number) => ({
      name: b.name.length > 14 ? b.name.slice(0, 14) + '…' : b.name,
      views: b.totalViews,
      fill: COLORS[i % COLORS.length]
    }))
  }, [data])

  if (!isOpen) return null

  return (
    <div className="drawer-overlay" style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="drawer-content" style={{ width: '96vw', maxWidth: 1500, borderRadius: 16, margin: '2vh auto', height: '96vh', animation: 'fadeUp 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1.5px solid rgba(26,115,232,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="kpi-icon-wrap" style={{ background: 'var(--blue-gradient)', color: '#FFF', width: 40, height: 40, borderRadius: 10, fontSize: 18, fontWeight: 800 }}>
              {creatorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="chart-title">Creator Intelligence</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{creatorName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              if (!data) return
              const rows = [['Metric', 'Value'], ['Creator', data.name], ['Total Views', data.totalViews], ['Avg Views', data.avgViews], ['Videos', data.videoCount], ['Best Rank', data.bestRank], ['Top 5', data.top5_hits], ['Top 10', data.top10_hits], [], ['Keyword', 'Rank', 'Videos', 'Views']]
              ;(data.keywordRankings?.top5 || []).forEach((kw: any) => rows.push([kw.keyword, kw.rank, kw.videos?.length || 0, kw.totalViews]))
              ;(data.keywordRankings?.top10 || []).forEach((kw: any) => rows.push([kw.keyword, kw.rank, kw.videos?.length || 0, kw.totalViews]))
              const csv = rows.map(r => r.join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `${data.name.replace(/[^a-zA-Z0-9]/g, '_')}_intelligence.csv`; a.click()
              URL.revokeObjectURL(url)
            }}><Download size={13} /> Export CSV</button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 16 }}>
              <Loader2 size={32} style={{ color: 'var(--blue)', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Loading creator intelligence…</div>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 12 }}>
              <AlertCircle size={40} color="#FF2D55" />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-bright)' }}>Error Loading Data</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{error}</div>
            </div>
          ) : data ? (
            <div className="anim-fade-up">

              {/* Profile Header */}
              <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--blue-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, color: '#FFF', flexShrink: 0, boxShadow: '0 8px 28px var(--blue-glow)' }}>
                  {data.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '-0.5px' }}>{data.name}</div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Video size={14} /> {data.videoCount} campaign videos</span>
                    <span style={{ color: '#E2E8F0' }}>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Search size={14} /> {data.kwCount} search queries</span>
                    <span style={{ color: '#E2E8F0' }}>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Award size={14} /> {data.brandCount} brands</span>
                  </div>
                </div>
                {data.channelId && (
                  <a href={`https://youtube.com/channel/${data.channelId}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', borderColor: 'rgba(255,45,85,0.25)', background: 'var(--red-dim)' }}>
                    View on YouTube <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {/* KPI Strip */}
              <div className="grid-kpi" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                {[
                  { icon: <Eye size={18} />, label: 'Total views', value: fmt(data.totalViews), sub: 'All indexed videos', color: 'var(--blue)' },
                  { icon: <TrendingUp size={18} />, label: 'Avg views / video', value: fmt(data.avgViews), sub: 'Quality metric', color: 'var(--green)' },
                  { icon: <Star size={18} />, label: 'Top 5 hits', value: data.top5_hits, sub: 'Keywords in top 5', color: 'var(--orange)' },
                  { icon: <Hash size={18} />, label: 'Top 10 hits', value: data.top10_hits, sub: 'Keywords in top 10', color: 'var(--violet)' },
                  { icon: <Award size={18} />, label: 'Best rank', value: data.bestRank ? `#${data.bestRank}` : '—', sub: 'Highest position', color: 'var(--orange)' },
                  { icon: <TrendingUp size={18} />, label: 'Daily growth', value: `${data.dailyGrowthPct > 0 ? '+' : ''}${data.dailyGrowthPct}%`, sub: 'Avg daily view growth', color: data.dailyGrowthPct > 5 ? 'var(--green)' : 'var(--blue)' },
                ].map((kpi, i) => (
                  <div key={i} className="kpi-card">
                    <div className="kpi-icon-wrap" style={{ background: `${kpi.color}10`, color: kpi.color }}>{kpi.icon}</div>
                    <div className="kpi-label">{kpi.label}</div>
                    <div className="kpi-value mono">{kpi.value}</div>
                    {kpi.sub && <div className="kpi-sub">{kpi.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Two Column: Keywords + Brands */}
              <div className="grid-2" style={{ marginBottom: 20 }}>

                {/* Left: Keyword Rankings */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px 14px', borderBottom: '1.5px solid rgba(26,115,232,0.06)' }}>
                    <div className="chart-title" style={{ marginBottom: 12 }}>Keyword Rankings</div>
                    <div className="toggle-group" style={{ display: 'flex', gap: 4, background: 'rgba(26,115,232,0.03)', border: '1.5px solid rgba(26,115,232,0.08)', borderRadius: 10, padding: 4 }}>
                      {[
                        { id: 'top5', label: 'Top 5', count: data.keywordRankings?.top5?.length || 0 },
                        { id: 'top10', label: 'Top 6-10', count: data.keywordRankings?.top10?.length || 0 },
                        { id: 'beyond10', label: 'Beyond 10', count: data.keywordRankings?.beyond10?.length || 0 },
                      ].map(tab => (
                        <button key={tab.id} className={`toggle-btn${kwTab === tab.id ? ' active' : ''}`} onClick={() => setKwTab(tab.id as any)} style={{ flex: 1, justifyContent: 'center' }}>
                          {tab.label}
                          <span className={`badge ${kwTab === tab.id ? 'badge-blue' : 'badge-gray'}`} style={{ marginLeft: 4 }}>{tab.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {[
                            { label: 'Keyword', key: 'keyword' },
                            { label: 'Rank', key: 'rank' },
                            { label: 'Videos', key: 'videos' },
                            { label: 'Views', key: 'totalViews' },
                            { label: '', key: '' },
                          ].map(h => (
                            <th key={h.label} className={h.key ? 'sortable' : ''} onClick={() => h.key && setKwSort(p => ({ key: h.key, direction: p.key === h.key && p.dir === 'desc' ? 'asc' : 'desc', dir: p.key === h.key && p.dir === 'desc' ? 'asc' : 'desc' }))} style={{ textAlign: h.key === 'rank' || h.key === 'videos' || h.key === 'totalViews' ? 'center' : 'left' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: h.key === 'rank' || h.key === 'videos' || h.key === 'totalViews' ? 'center' : 'flex-start', gap: 4 }}>
                                {h.label}
                                {kwSort.key === h.key && <span style={{ fontSize: 8 }}>{kwSort.dir === 'desc' ? '▼' : '▲'}</span>}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedKeywords.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px 14px', color: 'var(--text-muted)' }}>No keywords in this category</td></tr>
                        ) : sortedKeywords.map((kw: any) => (
                          <React.Fragment key={kw.keyword}>
                            <tr className="row-hover" style={{ cursor: 'pointer' }} onClick={() => toggleKw(kw.keyword)}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Search size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{kw.keyword}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}><span className={`badge ${rankColor(kw.rank)}`}>#{kw.rank}</span></td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }} className="mono">{kw.videos?.length || kw.videoCount || 0}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--blue)' }} className="mono">{fmt(kw.totalViews)}</td>
                              <td style={{ textAlign: 'center' }}>{expandedKws.has(kw.keyword) ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}</td>
                            </tr>
                            {expandedKws.has(kw.keyword) && kw.videos && (
                              <tr style={{ background: 'var(--bg-elevated)' }}>
                                <td colSpan={5} style={{ padding: '0 14px 12px' }}>
                                  <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid var(--border-2)', overflow: 'hidden' }}>
                                    {kw.videos.map((v: any, vi: number) => (
                                      <a key={v.id} href={`https://www.youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noopener noreferrer" className="row-hover" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', textDecoration: 'none', borderBottom: vi < kw.videos.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-1)' }}>
                                          {v.thumbnail_url && <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                                          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginTop: 3, alignItems: 'center' }}>
                                            <span className="mono" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{fmtIndian(v.view_count)} views</span>
                                            {v.is_short && <span className="badge badge-red" style={{ fontSize: 9 }}>Short</span>}
                                          </div>
                                        </div>
                                        <span className={`badge ${rankColor(v.rank)}`}>#{v.rank}</span>
                                      </a>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: Brand Performance */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px 14px', borderBottom: '1.5px solid rgba(26,115,232,0.06)' }}>
                    <div className="chart-title">Brand Performance</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Views distribution across brands</div>
                  </div>

                  {brandChartData.length > 0 ? (
                    <>
                      <div style={{ padding: '18px 22px', borderBottom: '1.5px solid rgba(26,115,232,0.06)' }}>
                        <div style={{ height: 200 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={brandChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v: any) => fmt(v)} axisLine={false} tickLine={false} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-primary)', fontWeight: 600 }} axisLine={false} tickLine={false} width={100} />
                              <Tooltip
                                formatter={(value: any) => [fmtIndian(value), 'Views']}
                                contentStyle={{ background: 'var(--text-bright)', borderRadius: 10, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.35)', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", padding: '10px 14px' }}
                                labelStyle={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, marginBottom: 4 }}
                                itemStyle={{ color: '#FFF', fontWeight: 700 }}
                                cursor={{ fill: 'rgba(26,115,232,0.04)' }}
                              />
                              <Bar dataKey="views" radius={[0, 4, 4, 0]} maxBarSize={28}>
                                {brandChartData.map((entry: any, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div style={{ padding: '14px 22px 18px' }}>
                        <div className="kpi-label" style={{ marginBottom: 10 }}>Brand Details</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {data.brandPerformance.map((brand: any, i: number) => (
                            <div key={brand.name} className="row-hover card-interactive" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 5, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{brand.name}</div>
                                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                                  {brand.videoCount} videos · Top: {brand.topKeyword.length > 22 ? brand.topKeyword.slice(0, 22) + '…' : brand.topKeyword}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--blue)' }}>{fmt(brand.totalViews)}</div>
                                <span className={`badge ${rankColor(brand.topKeywordRank)}`} style={{ marginTop: 2 }}>#{brand.topKeywordRank}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '40px 22px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Award size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <div style={{ fontSize: 13 }}>No brand tags assigned</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: Top Keywords by Views */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1.5px solid rgba(26,115,232,0.06)' }}>
                  <div className="chart-title">Top Keywords by Views</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Keywords driving the most total views</div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: 40 }}>#</th>
                      <th>Keyword</th>
                      <th style={{ textAlign: 'center' }}>Rank</th>
                      <th style={{ textAlign: 'center' }}>Videos</th>
                      <th>Total Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.topKeywordsByViews || []).map((kw: any, i: number) => (
                      <tr key={kw.keyword} className="row-hover">
                        <td style={{ textAlign: 'center', fontWeight: 800, color: COLORS[i % COLORS.length] }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Search size={11} style={{ color: 'var(--text-muted)' }} />
                            {kw.keyword}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}><span className={`badge ${rankColor(kw.avgRank)}`}>#{kw.avgRank}</span></td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }} className="mono">{kw.videoCount}</td>
                        <td style={{ fontWeight: 700, color: 'var(--blue)' }} className="mono">{fmtIndian(kw.totalViews)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
