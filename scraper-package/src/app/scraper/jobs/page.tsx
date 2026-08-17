'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertCircle, Play, Pause, RotateCcw, X, Clock, AlertTriangle, RefreshCw } from 'lucide-react'

interface ScrapeJob {
  id: string
  seed_handle: string
  status: string
  progress: number
  profiles_found: number
  profiles_passed: number
  profiles_failed: number
  profiles_filtered: number
  error_message: string | null
  can_resume: boolean
  checkpoint: any
  started_at: string | null
  paused_at: string | null
  completed_at: string | null
  created_at: string
}

export default function ScrapeJobs() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper?action=jobs')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setJobs(data.jobs || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  // Auto-refresh running jobs
  useEffect(() => {
    const hasRunning = jobs.some(j => j.status === 'running')
    if (!hasRunning) return
    const interval = setInterval(loadJobs, 5000)
    return () => clearInterval(interval)
  }, [jobs, loadJobs])

  const handleAction = async (action: string, jobId: string) => {
    setActionLoading(jobId)
    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, worker_id: jobId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      loadJobs()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (job: ScrapeJob) => {
    const colors: Record<string, { bg: string; color: string }> = {
      running: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
      paused: { bg: 'var(--orange-dim)', color: 'var(--orange)' },
      completed: { bg: 'var(--green-dim)', color: 'var(--green)' },
      failed: { bg: 'var(--red-dim)', color: 'var(--red)' },
      cancelled: { bg: 'var(--bg-elevated)', color: 'var(--text-muted)' },
      pending: { bg: 'var(--bg-elevated)', color: 'var(--text-muted)' },
    }
    const c = colors[job.status] || colors.pending
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
        {job.status === 'running' && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
        {job.status === 'paused' && <Pause size={10} />}
        {job.status === 'completed' && <span>✓</span>}
        {job.status === 'failed' && <X size={10} />}
        {job.status}
      </span>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} />
      </div>
    )
  }

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="accent">Scrape</span> Jobs
          </h1>
          <p className="page-subtitle">
            Monitor and manage all scraping jobs
          </p>
        </div>
        <button onClick={loadJobs} className="btn btn-ghost btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="state-panel" style={{ maxWidth: 500, marginBottom: 16 }}>
          <AlertCircle size={28} style={{ color: 'var(--red)', marginBottom: 10 }} />
          <div className="state-panel__title">Failed to load</div>
          <div className="state-panel__desc">{error}</div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="state-panel">
          <Clock size={30} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div className="state-panel__title">No jobs yet</div>
          <div className="state-panel__desc">Start a scrape job to see it here.</div>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Seed Handle</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Found</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Filtered</th>
                <th>Resume</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td style={{ fontWeight: 600 }}>@{job.seed_handle}</td>
                  <td>{getStatusBadge(job)}</td>
                  <td>
                    {job.status === 'running' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, height: 6, width: 80, overflow: 'hidden' }}>
                          <div style={{ width: `${job.progress}%`, height: '100%', background: 'var(--blue)', transition: 'width 0.3s ease' }} />
                        </div>
                        <span style={{ fontSize: 11 }}>{job.progress}%</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>{job.profiles_found}</td>
                  <td style={{ color: 'var(--green)' }}>{job.profiles_passed}</td>
                  <td style={{ color: 'var(--red)' }}>{job.profiles_failed}</td>
                  <td style={{ color: 'var(--blue)' }}>{job.profiles_filtered}</td>
                  <td>
                    {job.can_resume ? (
                      <span style={{ fontSize: 11, color: 'var(--green)' }}>Yes</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {job.status === 'running' && (
                        <>
                          <button onClick={() => handleAction('pause', job.id)} className="btn-subtle btn-xs" title="Pause" disabled={actionLoading === job.id}>
                            <Pause size={10} />
                          </button>
                          <button onClick={() => handleAction('cancel', job.id)} className="btn-subtle btn-xs" style={{ color: 'var(--red)' }} title="Cancel" disabled={actionLoading === job.id}>
                            <X size={10} />
                          </button>
                        </>
                      )}
                      {(job.status === 'paused' || job.status === 'failed') && job.can_resume && (
                        <button onClick={() => handleAction('resume', job.id)} className="btn-subtle btn-xs" style={{ color: 'var(--green)' }} title="Resume" disabled={actionLoading === job.id}>
                          <Play size={10} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
