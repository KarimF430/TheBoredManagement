'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertCircle, Zap, Play, Pause, X, RefreshCw } from 'lucide-react'

interface WorkerInfo {
  worker_id: string
  job_id: string | null
  status: string
  current_handle: string | null
  profiles_scraped: number
  profiles_passed: number
  profiles_failed: number
  started_at: string | null
  last_activity_at: string | null
}

export default function ScraperWorkers() {
  const [workers, setWorkers] = useState<WorkerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadWorkers = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper?action=status')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setWorkers(data.workers || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadWorkers() }, [loadWorkers])

  // Auto-refresh running workers
  useEffect(() => {
    const hasRunning = workers.some(w => w.status === 'running')
    if (!hasRunning) return
    const interval = setInterval(loadWorkers, 5000)
    return () => clearInterval(interval)
  }, [workers, loadWorkers])

  const handleAction = async (action: string, workerId: string) => {
    setActionLoading(workerId)
    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, worker_id: workerId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      loadWorkers()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
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
            <span className="accent">Workers</span>
          </h1>
          <p className="page-subtitle">
            Active scraper worker processes and their status
          </p>
        </div>
        <button onClick={loadWorkers} className="btn btn-ghost btn-sm">
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

      {workers.length === 0 ? (
        <div className="state-panel">
          <Zap size={30} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div className="state-panel__title">No active workers</div>
          <div className="state-panel__desc">Workers are spawned when you start a scrape job.</div>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Worker ID</th>
                <th>Status</th>
                <th>Scraped</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Started</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.worker_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{w.worker_id.slice(0, 20)}...</td>
                  <td>
                    <span style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                      background: w.status === 'running' ? 'var(--blue-dim)' : w.status === 'paused' ? 'var(--orange-dim)' : 'var(--bg-elevated)',
                      color: w.status === 'running' ? 'var(--blue)' : w.status === 'paused' ? 'var(--orange)' : 'var(--text-muted)',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {w.status === 'running' && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                      {w.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{w.profiles_scraped}</td>
                  <td style={{ color: 'var(--green)' }}>{w.profiles_passed}</td>
                  <td style={{ color: 'var(--red)' }}>{w.profiles_failed}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {w.started_at ? new Date(w.started_at).toLocaleString() : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {w.status === 'running' && (
                        <button onClick={() => handleAction('pause', w.worker_id)} className="btn-subtle btn-xs" disabled={actionLoading === w.worker_id}>
                          <Pause size={10} />
                        </button>
                      )}
                      {w.status === 'paused' && (
                        <button onClick={() => handleAction('resume', w.worker_id)} className="btn-subtle btn-xs" style={{ color: 'var(--green)' }} disabled={actionLoading === w.worker_id}>
                          <Play size={10} />
                        </button>
                      )}
                      {w.status !== 'idle' && (
                        <button onClick={() => handleAction('cancel', w.worker_id)} className="btn-subtle btn-xs" style={{ color: 'var(--red)' }} disabled={actionLoading === w.worker_id}>
                          <X size={10} />
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
