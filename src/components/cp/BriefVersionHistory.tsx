'use client'

import { useState, useEffect } from 'react'
import { History, ChevronDown, ChevronUp, Clock, GitBranch, Save } from 'lucide-react'

interface BriefVersion {
  id: string
  version_number: number
  objective: string
  mandatories: string
  platform_mix: string[]
  deliverable_types: string[]
  budget: number
  go_live_date: string | null
  notes: string
  changed_by_name: string
  change_reason: string
  created_at: string
}

interface BriefVersionHistoryProps {
  campaignId: string
  currentBrief: {
    objective: string
    mandatories: string
    platform_mix: string[]
    deliverable_types: string[]
    budget: number
    go_live_date: string | null
  }
  onSaveVersion: (reason: string) => Promise<void>
}

export default function BriefVersionHistory({ campaignId, currentBrief, onSaveVersion }: BriefVersionHistoryProps) {
  const [versions, setVersions] = useState<BriefVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveReason, setSaveReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    fetchVersions()
  }, [campaignId])

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/brief-versions`)
      const data = await res.json()
      setVersions(data.versions || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!saveReason.trim()) return
    setSaving(true)
    try {
      await onSaveVersion(saveReason)
      setSaveReason('')
      setShowSaveDialog(false)
      await fetchVersions()
    } finally {
      setSaving(false)
    }
  }

  const diffFields = (a: BriefVersion, b: BriefVersion | Record<string, unknown>) => {
    const diffs: string[] = []
    if (a.objective !== b.objective) diffs.push('Objective')
    if (a.mandatories !== b.mandatories) diffs.push('Mandatories')
    if (JSON.stringify(a.platform_mix) !== JSON.stringify(b.platform_mix)) diffs.push('Platform Mix')
    if (JSON.stringify(a.deliverable_types) !== JSON.stringify(b.deliverable_types)) diffs.push('Deliverable Types')
    if (a.budget !== b.budget) diffs.push('Budget')
    if (a.go_live_date !== b.go_live_date) diffs.push('Go-Live Date')
    return diffs
  }

  const latestVersion = versions[0]
  const hasChanges = latestVersion ? diffFields(latestVersion, currentBrief).length > 0 : true

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setShowHistory(!showHistory)} className="btn-subtle btn-xs" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GitBranch size={12} />
          {versions.length > 0 ? `v${versions[0].version_number}` : 'v0'} — Version History
          {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {hasChanges && (
          <button onClick={() => setShowSaveDialog(true)} className="btn btn-blue btn-xs">
            <Save size={10} /> Save Version
          </button>
        )}
      </div>

      {showSaveDialog && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <h4 className="section-title" style={{ marginBottom: 8 }}>Save Brief Version</h4>
          {latestVersion && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Changed since v{latestVersion.version_number}:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {diffFields(latestVersion, currentBrief).map(f => (
                  <span key={f} className="badge badge-purple" style={{ fontSize: 10 }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          <input
            className="input"
            style={{ width: '100%', marginBottom: 8 }}
            placeholder="What changed? (e.g. updated objective, added deliverable)"
            value={saveReason}
            onChange={e => setSaveReason(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={!saveReason.trim() || saving} className="btn btn-blue btn-sm">
              {saving ? 'Saving...' : 'Save Version'}
            </button>
            <button onClick={() => setShowSaveDialog(false)} className="btn-subtle btn-sm">Cancel</button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="card" style={{ padding: 12 }}>
          {loading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>Loading...</div>
          ) : versions.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>No versions saved yet. Click "Save Version" to create a snapshot.</div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {versions.map((v, i) => (
                <div key={v.id} style={{ padding: '8px 0', borderBottom: i < versions.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-bright)' }}>v{v.version_number}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.change_reason || 'No reason given'}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(v.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>by {v.changed_by_name}</span>
                    {i < versions.length - 1 && (
                      <span style={{ fontSize: 10, color: 'var(--color-blue)' }}>
                        {diffFields(v, versions[i + 1]).join(', ')} changed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
