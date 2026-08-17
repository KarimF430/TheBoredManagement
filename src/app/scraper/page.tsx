'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Radar, Database, BadgeCheck, Zap, TrendingUp,
  Play, RefreshCw, Loader2, AlertCircle, ArrowRight
} from 'lucide-react'
import { formatNumber } from '@/components/cp/CampaignUI'

interface PipelineStats {
  total_jobs: number
  running_jobs: number
  completed_jobs: number
  total_profiles: number
  total_filtered: number
  total_errors: number
  circuit: {
    consecutive_failures: number
    total_requests: number
    total_errors: number
    error_rate: string
    paused_until: string | null
  }
  workers: Array<{
    worker_id: string
    status: string
    profiles_scraped: number
    profiles_passed: number
    profiles_failed: number
    started_at: string | null
  }>
}

export default function ScraperDashboard() {
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper?action=stats')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStats(data.stats)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh if jobs are running
  useEffect(() => {
    if (stats?.running_jobs && stats.running_jobs > 0) {
      const interval = setInterval(loadData, 5000)
      return () => clearInterval(interval)
    }
  }, [stats?.running_jobs, loadData])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="state-panel" style={{ maxWidth: 500 }}>
        <AlertCircle size={28} style={{ color: 'var(--red)', marginBottom: 10 }} />
        <div className="state-panel__title">Failed to load</div>
        <div className="state-panel__desc">{error}</div>
        <button onClick={loadData} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>Retry</button>
      </div>
    )
  }

  const kpis = [
    { icon: Database, label: 'Raw Profiles', value: stats?.total_profiles || 0, color: 'var(--blue)', bg: 'var(--blue-dim)' },
    { icon: BadgeCheck, label: 'Filtered Creators', value: stats?.total_filtered || 0, color: 'var(--green)', bg: 'var(--green-dim)' },
    { icon: Radar, label: 'Total Jobs', value: stats?.total_jobs || 0, color: 'var(--orange)', bg: 'var(--orange-dim)' },
    { icon: Zap, label: 'Active Workers', value: (stats?.workers || []).filter(w => w.status === 'running').length, color: 'var(--purple)', bg: 'var(--purple-light)' },
  ]

  const circuitHealthy = !(stats?.circuit?.paused_until) && (stats?.circuit?.total_errors || 0) === 0

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="accent">Scraper</span> Dashboard
          </h1>
          <p className="page-subtitle">
            Instagram creator discovery pipeline — seed profiles → scrape → filter → import
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/scraper/new" className="btn btn-blue btn-sm" style={{ textDecoration: 'none' }}>
            <Play size={14} /> New Scrape Job
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-kpi" style={{ marginBottom: 20 }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon" style={{ background: kpi.bg, color: kpi.color }}>
              <kpi.icon size={16} />
            </div>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{formatNumber(kpi.value)}</div>
          </div>
        ))}
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: circuitHealthy ? 'var(--green-dim)' : 'var(--red-dim)', color: circuitHealthy ? 'var(--green)' : 'var(--red)' }}>
            <TrendingUp size={16} />
          </div>
          <div className="kpi-label">Circuit Status</div>
          <div className="kpi-value" style={{ fontSize: 14 }}>
            {stats?.circuit?.paused_until ? 'Paused' : circuitHealthy ? 'Healthy' : `${stats?.circuit?.error_rate || 0} errors`}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        <Link href="/scraper/new" className="card-interactive" style={{ padding: 20, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', flexShrink: 0 }}>
            <Play size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)' }}>Start Scrape</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Input seed profiles and launch jobs</div>
          </div>
          <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </Link>

        <Link href="/scraper/jobs" className="card-interactive" style={{ padding: 20, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--orange-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', flexShrink: 0 }}>
            <Radar size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)' }}>Job Queue</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Monitor running and completed jobs</div>
          </div>
          <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </Link>

        <Link href="/scraper/results" className="card-interactive" style={{ padding: 20, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', flexShrink: 0 }}>
            <Database size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)' }}>Raw Profiles</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>All scraped profiles with Pass 1/2 filters</div>
          </div>
          <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </Link>

        <Link href="/scraper/filtered" className="card-interactive" style={{ padding: 20, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', flexShrink: 0 }}>
            <BadgeCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)' }}>Filtered Creators</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qualified creators ready for import</div>
          </div>
          <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </Link>

        <Link href="/scraper/cookies" className="card-interactive" style={{ padding: 20, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', flexShrink: 0 }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)' }}>Session Cookies</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Manage Instagram auth cookies</div>
          </div>
          <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </Link>
      </div>
    </div>
  )
}
