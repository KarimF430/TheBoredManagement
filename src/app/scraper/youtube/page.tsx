'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Play, Loader2, AlertCircle, Check, Search, Filter,
  RefreshCw, Video, Users, BarChart3, ArrowDownToLine,
  Globe, Eye, Trash2
} from 'lucide-react'
import { StatusBadge, Toast, EmptyState, KPISkeleton } from '@/components/cp/CampaignUI'

interface YouTubeJob {
  id: string
  seed_handle: string
  status: string
  progress: number
  profiles_found: number
  profiles_passed: number
  profiles_failed: number
  checkpoint: Record<string, unknown>
  created_at: string
  started_at: string | null
  completed_at: string | null
}

interface YouTubeResult {
  id: string
  handle: string
  full_name: string
  bio: string
  profile_pic_url: string
  followers: number
  avg_views: number
  avg_likes: number
  avg_comments: number
  engagement_rate: number
  email: string | null
  category: string | null
  source: string
  country?: string
  created_at: string
}

interface YouTubeStats {
  rawCount: number
  filteredCount: number
  jobCount: number
}

export default function YouTubeScraperPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'jobs' | 'results'>('search')
  const [stats, setStats] = useState<YouTubeStats | null>(null)
  const [jobs, setJobs] = useState<YouTubeJob[]>([])
  const [results, setResults] = useState<YouTubeResult[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Search form
  const [keyword, setKeyword] = useState('')
  const [mode, setMode] = useState<'keyword_channels' | 'keyword_videos' | 'channel_crawl'>('keyword_videos')
  const [maxChannels, setMaxChannels] = useState('200')
  const [regionCode, setRegionCode] = useState('IN')
  const [minSubs, setMinSubs] = useState('5000')
  const [maxSubs, setMaxSubs] = useState('5000000')
  const [minViews, setMinViews] = useState('1000')
  const [minEngagement, setMinEngagement] = useState('1.0')
  const [searching, setSearching] = useState(false)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper/youtube?action=stats')
      const data = await res.json()
      setStats(data)
    } catch {}
  }, [])

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper/youtube?action=jobs')
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch {}
  }, [])

  const loadResults = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper/youtube?action=results&limit=100')
      const data = await res.json()
      setResults(data.results || [])
    } catch {}
  }, [])

  useEffect(() => {
    Promise.all([loadStats(), loadJobs(), loadResults()]).finally(() => setLoading(false))
  }, [loadStats, loadJobs, loadResults])

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setSearching(true)
    try {
      const res = await fetch('/api/scraper/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          mode,
          maxChannels: parseInt(maxChannels),
          regionCode,
          filter: {
            minSubscribers: parseInt(minSubs),
            maxSubscribers: parseInt(maxSubs),
            minAvgViews: parseInt(minViews),
            minEngagement: parseFloat(minEngagement),
          },
        }),
      })
      const data = await res.json()
      if (data.error) {
        showToast(data.error, 'error')
      } else {
        showToast(`YouTube scrape job started for "${keyword.trim()}"`)
        setKeyword('')
        setActiveTab('jobs')
        loadJobs()
        loadStats()
      }
    } catch {
      showToast('Failed to start YouTube scrape', 'error')
    } finally {
      setSearching(false)
    }
  }

  const handlePushToOutreach = async () => {
    try {
      const res = await fetch('/api/outreach/creators/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'scraper' }),
      })
      const data = await res.json()
      if (data.error) showToast(data.error, 'error')
      else showToast(`Pushed ${data.pushed} creators to Outreach (${data.skipped} already exist)`)
    } catch {
      showToast('Failed to push to outreach', 'error')
    }
  }

  if (loading) return <KPISkeleton />

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Video size={14} style={{ color: '#FFF' }} />
            </div>
            <h1 className="page-title">
              <span className="accent">YouTube</span> Scraper
            </h1>
          </div>
          <p className="page-subtitle">
            Discover YouTube creators via keyword search and channel analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handlePushToOutreach} className="btn btn-ghost btn-sm">
            <ArrowDownToLine size={13} /> Push to Outreach
          </button>
          <button onClick={() => { loadStats(); loadJobs(); loadResults() }} className="btn btn-ghost btn-sm">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid-kpi" style={{ marginBottom: 16 }}>
          <div className="kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'var(--red-dim)' }}>
              <Video size={16} style={{ color: 'var(--red)' }} />
            </div>
            <div className="kpi-value">{stats.rawCount}</div>
            <div className="kpi-label">Channels Found</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'var(--green-dim)' }}>
              <Check size={16} style={{ color: 'var(--green)' }} />
            </div>
            <div className="kpi-value">{stats.filteredCount}</div>
            <div className="kpi-label">Passed Filter</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'var(--blue-dim)' }}>
              <BarChart3 size={16} style={{ color: 'var(--blue)' }} />
            </div>
            <div className="kpi-value">{stats.jobCount}</div>
            <div className="kpi-label">Jobs Run</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon-wrap" style={{ background: 'var(--purple-light)' }}>
              <Users size={16} style={{ color: 'var(--purple)' }} />
            </div>
            <div className="kpi-value">{results.filter(r => r.email).length}</div>
            <div className="kpi-label">With Email</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-group" style={{ marginBottom: 16 }}>
        {[
          { id: 'search', label: 'New Search', icon: Search },
          { id: 'jobs', label: 'Jobs', icon: BarChart3 },
          { id: 'results', label: 'Results', icon: Users },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="tab-btn"
              data-active={activeTab === tab.id}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 12 }}>
              YouTube Channel Discovery
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="section-title">Keyword / Seed Channel *</label>
                <input
                  className="input"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="e.g. tech review, beauty tips, gaming"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="section-title">Search Mode</label>
                  <select className="input" value={mode} onChange={e => setMode(e.target.value as any)}>
                    <option value="keyword_videos">Keyword → Videos → Channels</option>
                    <option value="keyword_channels">Keyword → Direct Channels</option>
                    <option value="channel_crawl">Channel Crawl (BFS)</option>
                  </select>
                </div>
                <div>
                  <label className="section-title">Region</label>
                  <select className="input" value={regionCode} onChange={e => setRegionCode(e.target.value)}>
                    <option value="IN">India</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="">Global</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="section-title">Max Channels</label>
                <input
                  className="input"
                  type="number"
                  value={maxChannels}
                  onChange={e => setMaxChannels(e.target.value)}
                  min="10"
                  max="1000"
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={13} /> Filter Thresholds
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="section-title">Min Subscribers</label>
                <input className="input" type="number" value={minSubs} onChange={e => setMinSubs(e.target.value)} />
              </div>
              <div>
                <label className="section-title">Max Subscribers</label>
                <input className="input" type="number" value={maxSubs} onChange={e => setMaxSubs(e.target.value)} />
              </div>
              <div>
                <label className="section-title">Min Avg Views</label>
                <input className="input" type="number" value={minViews} onChange={e => setMinViews(e.target.value)} />
              </div>
              <div>
                <label className="section-title">Min Engagement %</label>
                <input className="input" type="number" step="0.1" value={minEngagement} onChange={e => setMinEngagement(e.target.value)} />
              </div>
            </div>

            <div className="card" style={{ marginTop: 12, background: 'var(--blue-dim)', borderColor: 'var(--blue-light)', padding: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>Quota cost:</strong> Each search uses ~100-200 quota units. YouTube daily limit is 10,000 units.
                Channels with subscribers between {parseInt(minSubs).toLocaleString()} and {parseInt(maxSubs).toLocaleString()} will be kept.
              </div>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={!keyword.trim() || searching}
            className="btn btn-blue"
            style={{ alignSelf: 'flex-start', opacity: !keyword.trim() || searching ? 0.5 : 1 }}
          >
            {searching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
            {searching ? 'Starting...' : 'Start YouTube Scrape'}
          </button>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-wrap" style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Found</th>
                  <th>Passed</th>
                  <th>Failed</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: 'center' }}>
                      <EmptyState
                        icon={<Video size={20} />}
                        title="No YouTube scrape jobs yet"
                        description="Run your first YouTube search to discover creators."
                      />
                    </td>
                  </tr>
                ) : jobs.map(job => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{job.seed_handle}</td>
                    <td><span className="chip">{(job.checkpoint as any)?.mode || 'keyword_videos'}</span></td>
                    <td><StatusBadge status={job.status} /></td>
                    <td className="text-mono">{job.profiles_found}</td>
                    <td className="text-mono" style={{ color: 'var(--green)' }}>{job.profiles_passed}</td>
                    <td className="text-mono" style={{ color: 'var(--red)' }}>{job.profiles_failed}</td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-wrap" style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Subscribers</th>
                  <th>Avg Views</th>
                  <th>Engagement</th>
                  <th>Email</th>
                  <th>Country</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: 'center' }}>
                      <EmptyState
                        icon={<Users size={20} />}
                        title="No YouTube results yet"
                        description="Run a YouTube scrape to see results here."
                      />
                    </td>
                  </tr>
                ) : results.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Video size={12} style={{ color: 'var(--red)' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{r.full_name || r.handle}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-mono">{r.followers.toLocaleString()}</td>
                    <td className="text-mono">{r.avg_views.toLocaleString()}</td>
                    <td>
                      <span style={{ color: r.engagement_rate > 3 ? 'var(--green)' : r.engagement_rate > 1 ? 'var(--orange)' : 'var(--text-muted)' }}>
                        {r.engagement_rate.toFixed(2)}%
                      </span>
                    </td>
                    <td>
                      {r.email ? (
                        <span className="badge badge-green" style={{ fontSize: 10 }}>{r.email}</span>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td><span className="chip">{r.country || '—'}</span></td>
                    <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
