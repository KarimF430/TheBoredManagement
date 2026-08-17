'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Settings, Zap, Shield, Mail, Globe, AlertTriangle,
  CheckCircle, Save, RefreshCw, Loader2
} from 'lucide-react'
import { StatusBadge, Toast, ErrorState, KPISkeleton } from '@/components/cp/CampaignUI'

interface RampState {
  id: string
  current_step: number
  current_daily_budget: number
  sent_today_global: number
  last_advanced_at: string | null
  last_gate_result: Record<string, unknown> | null
}

interface Thresholds {
  domainSpamRateWarn: number
  domainSpamRateThrottle: number
  domainSpamRateHardPause: number
  mailboxBounceRateThrottle: number
  mailboxBounceRateHardPause: number
  mailboxComplaintProxyPause: number
  replyRateFloor: number
  warmupRampCaps: number[]
}

export default function OutreachSettingsPage() {
  const [ramp, setRamp] = useState<RampState | null>(null)
  const [thresholds, setThresholds] = useState<Thresholds | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [rRes, tRes] = await Promise.all([
        fetch('/api/outreach/settings/ramp').then(r => r.json()),
        fetch('/api/outreach/settings/thresholds').then(r => r.json()),
      ])
      if (rRes.error) setError(rRes.error)
      else setRamp(rRes.ramp)
      if (tRes.error) setError(tRes.error)
      else setThresholds(tRes.thresholds)
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleResetRamp = async () => {
    if (!confirm('Reset ramp to step 0 (200/day)? This cannot be undone.')) return
    try {
      await fetch('/api/outreach/settings/ramp/reset', { method: 'POST' })
      showToast('Ramp reset to 200/day')
      loadData()
    } catch {
      showToast('Failed to reset ramp', 'error')
    }
  }

  const handleAdvanceRamp = async () => {
    try {
      const res = await fetch('/api/outreach/settings/ramp/advance', { method: 'POST' })
      const data = await res.json()
      if (data.error) showToast(data.error, 'error')
      else {
        showToast(data.advanced ? `Ramp advanced to ${data.newBudget}/day` : `Ramp held: ${data.reason}`)
        loadData()
      }
    } catch {
      showToast('Failed to advance ramp', 'error')
    }
  }

  if (loading) return <KPISkeleton />
  if (error) return <ErrorState title="Failed to load settings" description={error} onRetry={loadData} />

  const BUDGET_LADDER = [200, 400, 700, 1100, 1600, 2100, 2500]

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">
            <span className="accent">Settings</span>
          </h1>
          <p className="page-subtitle">Ramp configuration, thresholds, and system controls</p>
        </div>
      </div>

      {/* Ramp Configuration */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={13} style={{ color: 'var(--blue)' }} />
          <span className="section-title" style={{ marginBottom: 0 }}>Ramp Configuration</span>
        </div>
        <div style={{ padding: 16 }}>
          {/* Current State */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div className="kpi-card">
              <div className="kpi-label">Current Step</div>
              <div className="kpi-value">{ramp?.current_step ?? 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Daily Budget</div>
              <div className="kpi-value" style={{ fontSize: 16 }}>{ramp?.current_daily_budget ?? 200}/day</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Sent Today</div>
              <div className="kpi-value">{ramp?.sent_today_global ?? 0}</div>
            </div>
          </div>

          {/* Budget Ladder */}
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">Budget Ladder</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'end' }}>
              {BUDGET_LADDER.map((budget, i) => {
                const isCurrent = ramp && i === ramp.current_step
                const isPast = ramp && i < ramp.current_step
                return (
                  <div key={budget} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      height: 40,
                      background: isCurrent ? 'var(--blue)' : isPast ? 'var(--blue-dim)' : 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-xs) var(--radius-xs) 0 0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isCurrent ? '#FFF' : 'var(--text-muted)',
                      fontSize: 10,
                      fontWeight: isCurrent ? 700 : 500,
                      transition: 'all 0.2s ease',
                    }}>
                      {budget}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Step {i}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdvanceRamp} className="btn btn-blue btn-sm">
              <Zap size={12} /> Advance Ramp
            </button>
            <button onClick={handleResetRamp} className="btn btn-danger btn-sm">
              <RefreshCw size={12} /> Reset to 200/day
            </button>
          </div>
        </div>
      </div>

      {/* Deliverability Thresholds */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={13} style={{ color: 'var(--orange)' }} />
          <span className="section-title" style={{ marginBottom: 0 }}>Deliverability Thresholds</span>
        </div>
        <div style={{ padding: 16 }}>
          {thresholds && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <ThresholdRow label="Domain Spam Warn" value={thresholds.domainSpamRateWarn} format="percent" color="var(--orange)" />
              <ThresholdRow label="Domain Spam Throttle" value={thresholds.domainSpamRateThrottle} format="percent" color="var(--orange)" />
              <ThresholdRow label="Domain Spam Hard Pause" value={thresholds.domainSpamRateHardPause} format="percent" color="var(--red)" />
              <ThresholdRow label="Mailbox Bounce Throttle" value={thresholds.mailboxBounceRateThrottle} format="percent" color="var(--orange)" />
              <ThresholdRow label="Mailbox Bounce Hard Pause" value={thresholds.mailboxBounceRateHardPause} format="percent" color="var(--red)" />
              <ThresholdRow label="Mailbox Complaint Pause" value={thresholds.mailboxComplaintProxyPause} format="percent" color="var(--red)" />
              <ThresholdRow label="Reply Rate Floor" value={thresholds.replyRateFloor} format="percent" color="var(--blue)" />
              <ThresholdRow label="Warmup Ramp Caps" value={thresholds.warmupRampCaps.join(' → ')} format="text" color="var(--purple)" />
            </div>
          )}
          <div className="card" style={{ marginTop: 16, background: 'var(--blue-dim)', borderColor: 'var(--blue-light)', padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>2026 Gmail/Yahoo Rules</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              • Operate spam complaint rate <strong>under 0.10%</strong> — 0.08% is the danger line<br />
              • <strong>0.30% is the cliff</strong> — cross it and Gmail stops mitigating delivery<br />
              • Pause at <strong>0.20%</strong> (well before the cliff)<br />
              • Bounce target under 1.5% — pull at 2.0%<br />
              • Reply rate below 1% = ramp holds/cuts, not climbs
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={13} style={{ color: 'var(--text-muted)' }} />
          <span className="section-title" style={{ marginBottom: 0 }}>System Information</span>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <InfoRow label="LLM Model" value="gpt-4o-mini" />
            <InfoRow label="LLM Min Confidence" value="0.70" />
            <InfoRow label="Max Follow-ups" value="4" />
            <InfoRow label="Follow-up Gap" value="3 days" />
            <InfoRow label="Ramp Trailing Window" value="3 days" />
            <InfoRow label="Min Days Between Advances" value="4 days" />
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}

function ThresholdRow({ label, value, format, color }: { label: string; value: number | string; format: 'percent' | 'text'; color: string }) {
  const display = format === 'percent' ? `${(Number(value) * 100).toFixed(2)}%` : value
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-1)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'JetBrains Mono, monospace' }}>{display}</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-1)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
