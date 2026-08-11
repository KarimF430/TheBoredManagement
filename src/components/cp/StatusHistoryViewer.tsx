'use client'

import { useState, useEffect } from 'react'
import { History, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'

interface StatusChange {
  id: string
  campaign_id: string
  entity_type: string
  entity_id: string
  old_status: string
  new_status: string
  changed_by: string
  changed_by_name: string
  change_reason: string
  created_at: string
}

interface StatusHistoryViewerProps {
  campaignId: string
  entityType?: string
  entityId?: string
  maxHeight?: number
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  draft: 'Draft',
  cancelled: 'Cancelled',
  pending: 'Pending',
  script_pending: 'Script Pending',
  script_approved: 'Script Approved',
  filming: 'Filming',
  in_review: 'In Review',
  approved: 'Approved',
  live: 'Live',
  on_track: 'On Track',
  at_risk: 'At Risk',
  breached: 'Breached',
}

const STATUS_COLORS: Record<string, string> = {
  active: '#00875A',
  completed: '#00875A',
  live: '#FF2D55',
  approved: '#00C853',
  script_approved: '#00C853',
  on_track: '#00875A',
  at_risk: '#FF8B00',
  breached: '#DE350B',
  paused: '#FF8B00',
  draft: '#94A3B8',
  cancelled: '#94A3B8',
  pending: '#94A3B8',
  script_pending: '#7C3AED',
  filming: '#FF6D00',
  in_review: '#0052CC',
}

export default function StatusHistoryViewer({ campaignId, entityType, entityId, maxHeight = 300 }: StatusHistoryViewerProps) {
  const [history, setHistory] = useState<StatusChange[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (expanded) fetchHistory()
  }, [campaignId, entityType, entityId, expanded])

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams()
      if (entityType) params.set('entity_type', entityType)
      if (entityId) params.set('entity_id', entityId)
      const res = await fetch(`/api/campaigns/${campaignId}/status-history?${params}`)
      const data = await res.json()
      setHistory(data.history || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="btn-subtle btn-xs" style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <History size={12} />
          Status History ({history.length})
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="card" style={{ padding: 12, marginTop: 8, maxHeight, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>No status changes recorded</div>
          ) : (
            history.map((h, i) => (
              <div key={h.id} style={{ padding: '6px 0', borderBottom: i < history.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: STATUS_COLORS[h.old_status] || 'var(--text-muted)' }}>
                    {STATUS_LABELS[h.old_status] || h.old_status}
                  </span>
                  <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[h.new_status] || 'var(--text-bright)' }}>
                    {STATUS_LABELS[h.new_status] || h.new_status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>by {h.changed_by_name || 'System'}</span>
                  {h.change_reason && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({h.change_reason})</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
