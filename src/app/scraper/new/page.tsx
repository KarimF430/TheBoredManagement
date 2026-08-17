'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Loader2, AlertCircle, Check, Info } from 'lucide-react'

export default function NewScrapeJob() {
  const router = useRouter()
  const [seedHandle, setSeedHandle] = useState('')
  const [depth, setDepth] = useState('2')
  const [maxProfiles, setMaxProfiles] = useState('500')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!seedHandle.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed_handle: seedHandle.trim().replace(/^@/, ''),
          depth: Number(depth),
          max_profiles: Number(maxProfiles),
        }),
      })
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setResult({ success: true, message: `Scrape job started for @${seedHandle.trim().replace(/^@/, '')}` })
      setSeedHandle('')
    } catch (err: unknown) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Failed to start job' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="accent">New</span> Scrape Job
          </h1>
          <p className="page-subtitle">
            Enter a seed Instagram profile to discover similar creators
          </p>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: result.success ? 'var(--green-dim)' : 'var(--red-dim)',
          border: `1px solid ${result.success ? 'rgba(0,200,83,0.2)' : 'rgba(255,45,85,0.2)'}`,
        }}>
          {result.success ? <Check size={16} style={{ color: 'var(--green)' }} /> : <AlertCircle size={16} style={{ color: 'var(--red)' }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: result.success ? 'var(--green)' : 'var(--red)' }}>
            {result.message}
          </span>
          {result.success && (
            <button
              onClick={() => router.push('/scraper/jobs')}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              View Jobs →
            </button>
          )}
        </div>
      )}

      {/* Form */}
      <div className="card-interactive" style={{ padding: 24, maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Seed Handle */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.4px' }}>
                Seed Handle *
              </label>
              <input
                className="input"
                placeholder="@username or username"
                value={seedHandle}
                onChange={e => setSeedHandle(e.target.value)}
                autoFocus
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Enter an Instagram handle to start discovering similar creators.
              </p>
            </div>

            {/* Depth & Max Profiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.4px' }}>
                  Crawl Depth
                </label>
                <select className="input" value={depth} onChange={e => setDepth(e.target.value)}>
                  <option value="1">1 — Seed only</option>
                  <option value="2">2 — Seed + suggested</option>
                  <option value="3">3 — Deep crawl</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.4px' }}>
                  Max Profiles
                </label>
                <input
                  className="input"
                  type="number"
                  value={maxProfiles}
                  onChange={e => setMaxProfiles(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Rules Info */}
            <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 700, marginBottom: 8 }}>
                <Info size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Two-Pass Filtering Rules:
              </p>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <p><strong>Pass 1 (Profile):</strong> Followers 5K–2M, posts ≥ 10, follower/following ratio ≥ 5, not private, has bio or business account</p>
                <p style={{ marginTop: 4 }}><strong>Pass 2 (Posts):</strong> Fetch last 10 reels → avg views. Tier thresholds: &lt;10K: 30%, 10–50K: 40%, 50–500K: 20%, 500K+: 10%</p>
                <p style={{ marginTop: 4 }}><strong>Resume:</strong> Checkpoint saved after every profile. Survives server restarts.</p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !seedHandle.trim()}
              className="btn btn-blue"
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
              {loading ? 'Starting...' : 'Start Scrape Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
