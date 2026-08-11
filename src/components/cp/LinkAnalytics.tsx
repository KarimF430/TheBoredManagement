'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, MousePointer, Globe, Smartphone, Monitor, RefreshCw, MapPin, Compass, Laptop } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#0052CC', '#00875A', '#FF8B00', '#6554C0', '#00B8D9', '#DE350B']

interface LinkData {
  id: string
  short_code: string
  short_url: string
  original_url: string
  clicks: number
  unique_clicks: number
  conversions: number
  conversion_rate: number
  utm_source: string
  utm_campaign: string
  created_at: string
  analytics: {
    totalClicks: number
    uniqueClicks: number
    conversions: number
    conversionRate: number
    clicksByDay: Array<{ date: string; clicks: number }>
    clicksByCountry: Array<{ country: string; country_code: string; clicks: number }>
    clicksByCity: Array<{ city: string; country: string; clicks: number }>
    clicksByDevice: Array<{ device: string; clicks: number }>
    clicksByBrowser: Array<{ browser: string; clicks: number }>
    clicksByOS: Array<{ os: string; clicks: number }>
    topReferers: Array<{ referer: string; clicks: number }>
    uniqueCountries: number
    uniqueCities: number
    recentClicks: Array<{ clicked_at: string; ip_address: string; country: string; city: string; device: string; browser: string; os: string; user_agent: string }>
  }
}

interface LinkAnalyticsProps {
  campaignId: string
}

export default function LinkAnalytics({ campaignId }: LinkAnalyticsProps) {
  const [links, setLinks] = useState<LinkData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [geoTab, setGeoTab] = useState<'country' | 'city' | 'device' | 'browser'>('country')

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/links/analytics`)
      const data = await res.json()
      setLinks(data.links || [])
      if (data.links?.length > 0 && !selectedLink) setSelectedLink(data.links[0])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [campaignId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const totalClicks = links.reduce((s, l) => s + (l.analytics?.totalClicks || 0), 0)
  const totalUnique = links.reduce((s, l) => s + (l.analytics?.uniqueClicks || 0), 0)
  const totalConversions = links.reduce((s, l) => s + (l.analytics?.conversions || 0), 0)
  const totalCountries = selectedLink?.analytics?.uniqueCountries || 0
  const totalCities = selectedLink?.analytics?.uniqueCities || 0

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading link analytics...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Clicks', value: totalClicks.toLocaleString() },
            { label: 'Unique Clicks', value: totalUnique.toLocaleString() },
            { label: 'Conversions', value: totalConversions.toLocaleString() },
            { label: 'Links', value: links.length.toString() },
            { label: 'Countries', value: totalCountries.toString() },
            { label: 'Cities', value: totalCities.toString() },
          ].map(kpi => (
            <div key={kpi.label} className="kpi-card" style={{ padding: '10px 14px', minWidth: 100 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-bright)' }} className="text-mono">{kpi.value}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{kpi.label}</div>
            </div>
          ))}
        </div>
        <button onClick={handleRefresh} className="btn btn-ghost btn-sm" disabled={refreshing}>
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {links.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <MousePointer size={32} style={{ margin: '0 auto 12px', opacity: 0.4, display: 'block' }} />
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>No tracked links yet</p>
          <p style={{ fontSize: 12 }}>Create tracked links from the Tracking page to start monitoring clicks.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          {/* Links list */}
          <div style={{ border: '1px solid var(--border-1)', borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: 600, overflowY: 'auto' }}>
            {links.map(link => (
              <div key={link.id} onClick={() => setSelectedLink(link)} style={{
                padding: '12px 14px', borderBottom: '1px solid var(--border-1)', cursor: 'pointer',
                background: selectedLink?.id === link.id ? 'var(--blue-dim)' : 'transparent',
                borderLeft: selectedLink?.id === link.id ? '3px solid var(--blue)' : '3px solid transparent',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {link.short_url}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {link.original_url}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)' }} className="text-mono">{link.analytics?.totalClicks || 0} clicks</span>
                  <span style={{ fontSize: 10, color: '#00875A', fontWeight: 600 }} className="text-mono">{link.analytics?.conversions || 0} conv</span>
                </div>
              </div>
            ))}
          </div>

          {/* Analytics detail */}
          {selectedLink && selectedLink.analytics && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>{selectedLink.short_url}</h4>
                <a href={selectedLink.original_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={10} /> {selectedLink.original_url}
                </a>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Conversion Rate: <strong style={{ color: '#00875A' }}>{selectedLink.analytics.conversionRate?.toFixed(1) || 0}%</strong></span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Countries: <strong>{selectedLink.analytics.uniqueCountries}</strong></span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cities: <strong>{selectedLink.analytics.uniqueCities}</strong></span>
                </div>
              </div>

              {selectedLink.analytics.clicksByDay?.length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <h5 className="section-title">Clicks Over Time</h5>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={selectedLink.analytics.clicksByDay.slice(-14)} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EBECF0" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6B778C' }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: '#6B778C' }} />
                      <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 6, fontSize: 11 }} />
                      <Bar dataKey="clicks" fill="#0052CC" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Geo Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {[
                  { id: 'country' as const, label: 'Countries', icon: Globe },
                  { id: 'city' as const, label: 'Cities', icon: MapPin },
                  { id: 'device' as const, label: 'Devices', icon: Smartphone },
                  { id: 'browser' as const, label: 'Browsers', icon: Compass },
                ].map(tab => {
                  const Icon = tab.icon
                  return (
                    <button key={tab.id} onClick={() => setGeoTab(tab.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid', borderColor: geoTab === tab.id ? 'var(--blue)' : 'var(--border-1)', background: geoTab === tab.id ? 'rgba(26,115,232,0.06)' : 'transparent', color: geoTab === tab.id ? 'var(--blue)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                      <Icon size={12} /> {tab.label}
                    </button>
                  )
                })}
              </div>

              <div className="card" style={{ marginBottom: 12 }}>
                {geoTab === 'country' && selectedLink.analytics.clicksByCountry?.length > 0 && (
                  <>
                    <h5 className="section-title">Clicks by Country</h5>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={selectedLink.analytics.clicksByCountry.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 4, left: 60, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EBECF0" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#6B778C' }} />
                        <YAxis type="category" dataKey="country" tick={{ fontSize: 10, fill: '#6B778C' }} width={60} />
                        <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 6, fontSize: 11 }} />
                        <Bar dataKey="clicks" fill="#0052CC" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                )}

                {geoTab === 'city' && selectedLink.analytics.clicksByCity?.length > 0 && (
                  <>
                    <h5 className="section-title">Top Cities</h5>
                    {selectedLink.analytics.clicksByCity.slice(0, 10).map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-1)' }}>
                        <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>{c.city}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.country}</span>
                        <span style={{ fontWeight: 700, fontSize: 12 }} className="text-mono">{c.clicks}</span>
                      </div>
                    ))}
                  </>
                )}

                {geoTab === 'device' && selectedLink.analytics.clicksByDevice?.length > 0 && (
                  <>
                    <h5 className="section-title">By Device</h5>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={selectedLink.analytics.clicksByDevice} dataKey="clicks" nameKey="device" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}
                          label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}>
                          {selectedLink.analytics.clicksByDevice.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 6, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                )}

                {geoTab === 'browser' && selectedLink.analytics.clicksByBrowser?.length > 0 && (
                  <>
                    <h5 className="section-title">By Browser</h5>
                    {selectedLink.analytics.clicksByBrowser.slice(0, 8).map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-1)' }}>
                        <Compass size={12} style={{ color: COLORS[i % COLORS.length] }} />
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>{b.browser}</span>
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--border-1)' }}>
                          <div style={{ width: `${Math.min(100, (b.clicks / (selectedLink.analytics.clicksByBrowser[0]?.clicks || 1)) * 100)}%`, height: '100%', borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 12 }} className="text-mono">{b.clicks}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Recent Clicks */}
              {selectedLink.analytics.recentClicks?.length > 0 && (
                <div className="card">
                  <h5 className="section-title">Recent Clicks</h5>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ fontSize: 11 }}>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Country</th>
                          <th>City</th>
                          <th>Device</th>
                          <th>Browser</th>
                          <th>OS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLink.analytics.recentClicks.slice(0, 10).map((c, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(c.clicked_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                            <td>{c.country || 'Unknown'}</td>
                            <td>{c.city || 'Unknown'}</td>
                            <td style={{ textTransform: 'capitalize' }}>{c.device || 'Unknown'}</td>
                            <td>{c.browser || 'Unknown'}</td>
                            <td>{c.os || 'Unknown'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
