'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Globe, Mail, Shield, CheckCircle, XCircle,
  AlertCircle, Loader2, RefreshCw, Zap, Eye
} from 'lucide-react'
import { StatusBadge, Toast, EmptyState, ErrorState, KPISkeleton } from '@/components/cp/CampaignUI'

interface Domain {
  id: string
  domain: string
  tier: string
  is_bulk_sender: boolean
  spf_status: string
  dkim_status: string
  dmarc_status: string
  status: string
  paused_reason: string | null
  created_at: string
}

interface Mailbox {
  id: string
  domain_id: string
  tier: string
  provider: string
  email: string
  display_name: string
  warmup_stage: number
  daily_cap: number
  sent_today: number
  status: string
  paused_reason: string | null
}

export default function OutreachDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showAddDomain, setShowAddDomain] = useState(false)
  const [showAddMailbox, setShowAddMailbox] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [dRes, mRes] = await Promise.all([
        fetch('/api/outreach/domains').then(r => r.json()),
        fetch('/api/outreach/domains/mailboxes').then(r => r.json()),
      ])
      if (dRes.error) setError(dRes.error)
      else setDomains(dRes.domains || [])
      if (mRes.error) setError(mRes.error)
      else setMailboxes(mRes.mailboxes || [])
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleVerifyDomain = async (domainId: string) => {
    setVerifying(domainId)
    try {
      const res = await fetch(`/api/outreach/domains/${domainId}/verify`, { method: 'POST' })
      const data = await res.json()
      if (data.error) showToast(data.error, 'error')
      else {
        showToast(data.allPass ? 'Domain verified — auth passing' : 'Domain paused — auth failed', data.allPass ? 'success' : 'error')
        loadData()
      }
    } catch {
      showToast('Verification failed', 'error')
    } finally {
      setVerifying(null)
    }
  }

  const handleAddDomain = async (domain: { domain: string; tier: string; is_bulk_sender: boolean }) => {
    try {
      const res = await fetch('/api/outreach/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(domain),
      })
      const data = await res.json()
      if (data.error) showToast(data.error, 'error')
      else {
        showToast('Domain added')
        setShowAddDomain(false)
        loadData()
      }
    } catch {
      showToast('Failed to add domain', 'error')
    }
  }

  const handleAddMailbox = async (mailbox: { domain_id: string; provider: string; email: string; display_name: string; daily_cap: number }) => {
    try {
      const res = await fetch('/api/outreach/domains/mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailbox),
      })
      const data = await res.json()
      if (data.error) showToast(data.error, 'error')
      else {
        showToast('Mailbox added')
        setShowAddMailbox(false)
        loadData()
      }
    } catch {
      showToast('Failed to add mailbox', 'error')
    }
  }

  if (loading) return <KPISkeleton />
  if (error) return <ErrorState title="Failed to load" description={error} onRetry={loadData} />

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">
            <span className="accent">Domains</span> & Mailboxes
          </h1>
          <p className="page-subtitle">{domains.length} domains · {mailboxes.length} mailboxes</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowAddMailbox(true)} className="btn btn-ghost btn-sm">
            <Mail size={13} /> Add Mailbox
          </button>
          <button onClick={() => setShowAddDomain(true)} className="btn btn-blue btn-sm">
            <Globe size={13} /> Add Domain
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--blue-dim)' }}>
            <Globe size={16} style={{ color: 'var(--blue)' }} />
          </div>
          <div className="kpi-value">{domains.length}</div>
          <div className="kpi-label">Domains</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'var(--green-dim)' }}>
            <Mail size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div className="kpi-value">{mailboxes.length}</div>
          <div className="kpi-label">Mailboxes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: domains.filter(d => d.status === 'active').length > 0 ? 'var(--green-dim)' : 'var(--red-dim)' }}>
            <CheckCircle size={16} style={{ color: domains.filter(d => d.status === 'active').length > 0 ? 'var(--green)' : 'var(--red)' }} />
          </div>
          <div className="kpi-value">{domains.filter(d => d.status === 'active').length}</div>
          <div className="kpi-label">Active</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: mailboxes.reduce((s, m) => s + m.daily_cap, 0) > 0 ? 'var(--purple-light)' : 'var(--bg-elevated)' }}>
            <Zap size={16} style={{ color: 'var(--purple)' }} />
          </div>
          <div className="kpi-value">{mailboxes.reduce((s, m) => s + m.daily_cap, 0)}</div>
          <div className="kpi-label">Total Cap/Day</div>
        </div>
      </div>

      {/* Domains Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Sending Domains</span>
          <span className="badge badge-gray">{domains.length} total</span>
        </div>
        {domains.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <EmptyState
              icon={<Globe size={20} />}
              title="No domains configured"
              description="Add a sending domain to start configuring mailboxes and auth verification."
              action={
                <button onClick={() => setShowAddDomain(true)} className="btn btn-blue btn-sm" style={{ marginTop: 10 }}>
                  <Plus size={12} /> Add Domain
                </button>
              }
            />
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Tier</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>SPF</th>
                  <th>DKIM</th>
                  <th>DMARC</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {domains.map(d => (
                  <tr key={d.id}>
                    <td className="text-mono" style={{ fontSize: 11, fontWeight: 600 }}>{d.domain}</td>
                    <td><span className={`badge ${d.tier === 'tier1' ? 'badge-blue' : 'badge-purple'}`}>{d.tier}</span></td>
                    <td><span className="chip">{d.is_bulk_sender ? 'Bulk (SES)' : 'Relationship (Gmail)'}</span></td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>
                      <span className={`badge ${d.spf_status === 'pass' ? 'badge-green' : d.spf_status === 'missing' ? 'badge-red' : 'badge-orange'}`}>
                        {d.spf_status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${d.dkim_status === 'pass' ? 'badge-green' : d.dkim_status === 'missing' ? 'badge-red' : 'badge-orange'}`}>
                        {d.dkim_status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${d.dmarc_status?.includes('pass') ? 'badge-green' : d.dmarc_status === 'missing' ? 'badge-red' : 'badge-orange'}`}>
                        {d.dmarc_status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleVerifyDomain(d.id)}
                        disabled={verifying === d.id}
                        className="btn btn-ghost btn-xs"
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        {verifying === d.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Shield size={11} />}
                        Verify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mailboxes Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Mailboxes</span>
          <span className="badge badge-gray">{mailboxes.length} total</span>
        </div>
        {mailboxes.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <EmptyState
              icon={<Mail size={20} />}
              title="No mailboxes configured"
              description="Add mailboxes to your domains to start sending emails."
              action={
                <button onClick={() => setShowAddMailbox(true)} className="btn btn-blue btn-sm" style={{ marginTop: 10 }}>
                  <Plus size={12} /> Add Mailbox
                </button>
              }
            />
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Domain</th>
                  <th>Provider</th>
                  <th>Display Name</th>
                  <th>Warmup</th>
                  <th>Cap</th>
                  <th>Sent Today</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mailboxes.map(m => {
                  const domain = domains.find(d => d.id === m.domain_id)
                  return (
                    <tr key={m.id}>
                      <td className="text-mono" style={{ fontSize: 11, fontWeight: 600 }}>{m.email}</td>
                      <td><span className="chip">{domain?.domain || '—'}</span></td>
                      <td>
                        <span className={`badge ${m.provider === 'gmail' ? 'badge-blue' : 'badge-purple'}`}>{m.provider}</span>
                      </td>
                      <td style={{ fontSize: 11 }}>{m.display_name || '—'}</td>
                      <td>
                        <span className="badge badge-gray">Stage {m.warmup_stage}</span>
                      </td>
                      <td className="text-mono">{m.daily_cap}/day</td>
                      <td className="text-mono">
                        <span style={{ color: m.sent_today >= m.daily_cap ? 'var(--red)' : 'var(--text-secondary)' }}>
                          {m.sent_today}
                        </span>
                      </td>
                      <td><StatusBadge status={m.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {showAddDomain && <AddDomainModal onClose={() => setShowAddDomain(false)} onSubmit={handleAddDomain} />}

      {/* Add Mailbox Modal */}
      {showAddMailbox && <AddMailboxModal domains={domains} onClose={() => setShowAddMailbox(false)} onSubmit={handleAddMailbox} />}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}

function AddDomainModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (d: { domain: string; tier: string; is_bulk_sender: boolean }) => void }) {
  const [form, setForm] = useState({ domain: '', tier: 'tier2' as 'tier1' | 'tier2', is_bulk_sender: true })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.domain) return
    onSubmit(form)
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Add Sending Domain</h3>
          <button onClick={onClose} className="btn-subtle btn-xs">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="section-title">Domain *</label>
            <input className="input" required value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value.toLowerCase().trim() })} placeholder="example.com" />
          </div>
          <div>
            <label className="section-title">Tier</label>
            <select className="input" value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value as 'tier1' | 'tier2' })}>
              <option value="tier1">Tier 1 — Relationship (Gmail)</option>
              <option value="tier2">Tier 2 — Bulk (SES)</option>
            </select>
          </div>
          <div>
            <label className="section-title">Type</label>
            <select className="input" value={form.is_bulk_sender ? 'bulk' : 'relationship'} onChange={e => setForm({ ...form, is_bulk_sender: e.target.value === 'bulk' })}>
              <option value="bulk">Bulk Sender (SES)</option>
              <option value="relationship">Relationship (Gmail)</option>
            </select>
          </div>
          <div className="card" style={{ background: 'var(--blue-dim)', borderColor: 'var(--blue-light)', padding: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>After adding:</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              1. Configure SPF, DKIM, DMARC DNS records<br />
              2. Click <strong>Verify</strong> to check auth alignment<br />
              3. Add mailboxes under this domain
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-blue" style={{ flex: 1 }}>Add Domain</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddMailboxModal({ domains, onClose, onSubmit }: { domains: Domain[]; onClose: () => void; onSubmit: (m: { domain_id: string; provider: string; email: string; display_name: string; daily_cap: number }) => void }) {
  const [form, setForm] = useState({ domain_id: domains[0]?.id || '', provider: 'gmail' as 'gmail' | 'ses', email: '', display_name: '', daily_cap: 10 })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.domain_id) return
    onSubmit(form)
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Add Mailbox</h3>
          <button onClick={onClose} className="btn-subtle btn-xs">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="section-title">Domain *</label>
            <select className="input" value={form.domain_id} onChange={e => setForm({ ...form, domain_id: e.target.value })}>
              {domains.map(d => <option key={d.id} value={d.id}>{d.domain} ({d.tier})</option>)}
            </select>
          </div>
          <div>
            <label className="section-title">Email *</label>
            <input className="input" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value.toLowerCase().trim() })} placeholder="sender@domain.com" />
          </div>
          <div>
            <label className="section-title">Display Name</label>
            <input className="input" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} placeholder="John from Company" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="section-title">Provider</label>
              <select className="input" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value as 'gmail' | 'ses' })}>
                <option value="gmail">Gmail</option>
                <option value="ses">SES</option>
              </select>
            </div>
            <div>
              <label className="section-title">Daily Cap</label>
              <input className="input" type="number" value={form.daily_cap} onChange={e => setForm({ ...form, daily_cap: parseInt(e.target.value) || 10 })} min={1} max={65} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-blue" style={{ flex: 1 }}>Add Mailbox</button>
          </div>
        </form>
      </div>
    </div>
  )
}
