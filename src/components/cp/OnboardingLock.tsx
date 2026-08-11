'use client'

import { useState } from 'react'
import { AlertTriangle, Clock, Calendar, Shield, CheckCircle2, XCircle, Edit3, Save } from 'lucide-react'

interface Creator {
  id: string
  channel_name: string
  onboarded_at: string | null
  go_live_deadline: string | null
  go_live_deadline_extended: boolean
  extension_reason: string | null
  client_action: string | null
  client_remark: string | null
  client_action_at: string | null
  internal_cost: number
}

interface OnboardingLockProps {
  creator: Creator
  campaignId: string
  onUpdate: () => void
}

export default function OnboardingLock({ creator, campaignId, onUpdate }: OnboardingLockProps) {
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [newDeadline, setNewDeadline] = useState(creator.go_live_deadline || '')
  const [extensionReason, setExtensionReason] = useState('')
  const [showExtension, setShowExtension] = useState(false)
  const [saving, setSaving] = useState(false)

  const DEADLINE_DAYS = 15
  const onboardedAt = creator.onboarded_at ? new Date(creator.onboarded_at) : null
  const deadline = creator.go_live_deadline ? new Date(creator.go_live_deadline) : null
  const now = new Date()
  const isLocked = creator.client_action === 'accepted'
  const isRejected = creator.client_action === 'rejected'
  const daysRemaining = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
  const isOverdue = daysRemaining !== null && daysRemaining < 0
  const isWarning = daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0

  const handleSetDeadline = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creators/${creator.id}/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ go_live_deadline: newDeadline }),
      })
      if (res.ok) {
        setEditingDeadline(false)
        onUpdate()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleExtendDeadline = async () => {
    if (!extensionReason.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creators/${creator.id}/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          go_live_deadline_extended: true,
          extension_reason: extensionReason,
        }),
      })
      if (res.ok) {
        setShowExtension(false)
        setExtensionReason('')
        onUpdate()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleOnboard = async () => {
    setSaving(true)
    try {
      const deadlineDate = new Date()
      deadlineDate.setDate(deadlineDate.getDate() + DEADLINE_DAYS)
      const res = await fetch(`/api/campaigns/${campaignId}/creators/${creator.id}/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboarded_at: new Date().toISOString(),
          go_live_deadline: deadlineDate.toISOString().split('T')[0],
        }),
      })
      if (res.ok) onUpdate()
    } finally {
      setSaving(false)
    }
  }

  if (!creator.onboarded_at) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not onboarded</span>
        </div>
        <button onClick={handleOnboard} disabled={saving} className="btn btn-blue btn-xs">
          Onboard (sets {DEADLINE_DAYS}-day deadline)
        </button>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {isLocked ? (
          <CheckCircle2 size={14} style={{ color: 'var(--color-green)' }} />
        ) : isRejected ? (
          <XCircle size={14} style={{ color: 'var(--color-red)' }} />
        ) : isOverdue ? (
          <AlertTriangle size={14} style={{ color: 'var(--color-red)' }} />
        ) : isWarning ? (
          <AlertTriangle size={14} style={{ color: '#FF8B00' }} />
        ) : (
          <Clock size={14} style={{ color: 'var(--color-blue)' }} />
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-bright)' }}>
          {isLocked ? 'Client Accepted' : isRejected ? 'Client Rejected' : isOverdue ? 'OVERDUE' : isWarning ? `${daysRemaining} days left` : `${daysRemaining} days remaining`}
        </span>
        {creator.go_live_deadline_extended && (
          <span className="badge badge-orange" style={{ fontSize: 9 }}>Extended</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Onboarded</span>
          <span style={{ fontSize: 11, fontWeight: 500 }}>
            {onboardedAt?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Go-Live Deadline</span>
          {editingDeadline ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <input className="input" style={{ width: 110, padding: '2px 6px', fontSize: 11 }} type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
              <button onClick={handleSetDeadline} disabled={saving} className="btn btn-blue btn-xs"><Save size={10} /></button>
            </div>
          ) : (
            <button onClick={() => setEditingDeadline(true)} className="btn-subtle btn-xs" style={{ fontSize: 11, padding: 0 }}>
              {deadline?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Set deadline'}
              <Edit3 size={10} style={{ marginLeft: 4 }} />
            </button>
          )}
        </div>
      </div>

      {creator.extension_reason && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 8px', background: 'var(--bg-subtle)', borderRadius: 4, marginBottom: 8 }}>
          Extension reason: {creator.extension_reason}
        </div>
      )}

      {!creator.go_live_deadline_extended && !isLocked && !isRejected && (
        <button onClick={() => setShowExtension(!showExtension)} className="btn-subtle btn-xs" style={{ fontSize: 10 }}>
          Request Deadline Extension
        </button>
      )}

      {showExtension && (
        <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-subtle)', borderRadius: 4 }}>
          <input className="input" style={{ width: '100%', marginBottom: 6 }} value={extensionReason} onChange={e => setExtensionReason(e.target.value)} placeholder="Reason for extension..." />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleExtendDeadline} disabled={!extensionReason.trim() || saving} className="btn btn-blue btn-xs">Submit</button>
            <button onClick={() => setShowExtension(false)} className="btn-subtle btn-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}