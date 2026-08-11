'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Send, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface NegotiationRound {
  id: string
  creator_id: string
  campaign_id: string
  round_number: number
  offered_amount: number
  counter_amount: number | null
  final_amount: number | null
  status: string
  internal_remark: string
  created_at: string
  updated_at: string
}

interface NegotiationHistoryProps {
  campaignId: string
  creatorId: string
  creatorName: string
  internalCost: number
  onUpdate: () => void
}

export default function NegotiationHistory({ campaignId, creatorId, creatorName, internalCost, onUpdate }: NegotiationHistoryProps) {
  const [rounds, setRounds] = useState<NegotiationRound[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newOffer, setNewOffer] = useState(internalCost.toString())
  const [newRemark, setNewRemark] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (expanded) fetchRounds()
  }, [campaignId, creatorId, expanded])

  const fetchRounds = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creators/${creatorId}/negotiations`)
      const data = await res.json()
      setRounds(data.rounds || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const handleAddRound = async () => {
    if (!newOffer || Number(newOffer) <= 0) return
    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creators/${creatorId}/negotiations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offered_amount: Number(newOffer),
          internal_remark: newRemark,
        }),
      })
      if (res.ok) {
        setNewOffer('')
        setNewRemark('')
        setShowAdd(false)
        await fetchRounds()
        onUpdate()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateRound = async (roundId: string, updates: Partial<NegotiationRound>) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creators/${creatorId}/negotiations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round_id: roundId, ...updates }),
      })
      if (res.ok) {
        await fetchRounds()
        onUpdate()
      }
    } catch {
      // silent
    }
  }

  const latestRound = rounds[0]
  const currentOffer = latestRound?.final_amount || latestRound?.counter_amount || latestRound?.offered_amount || internalCost

  const statusColors: Record<string, string> = {
    pending: '#FF8B00',
    accepted: '#00875A',
    rejected: '#DE350B',
    countered: '#0052CC',
  }

  const statusIcons: Record<string, typeof CheckCircle2> = {
    pending: Clock,
    accepted: CheckCircle2,
    rejected: XCircle,
    countered: Send,
  }

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="btn-subtle btn-xs" style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={12} />
          Negotiation — {creatorName}
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>₹{currentOffer.toLocaleString('en-IN')}</span>
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="card" style={{ padding: 12, marginTop: 8 }}>
          {loading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>Loading...</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rounds.length} round{rounds.length !== 1 ? 's' : ''}</span>
                <button onClick={() => setShowAdd(!showAdd)} className="btn btn-blue btn-xs">
                  <Plus size={10} /> New Round
                </button>
              </div>

              {showAdd && (
                <div className="card" style={{ padding: 10, marginBottom: 8, background: 'var(--bg-subtle)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <label className="label" style={{ fontSize: 10, marginBottom: 2, display: 'block' }}>Offer Amount (₹)</label>
                      <input className="input" style={{ width: '100%' }} type="number" value={newOffer} onChange={e => setNewOffer(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <label className="label" style={{ fontSize: 10, marginBottom: 2, display: 'block' }}>Internal Remark</label>
                    <input className="input" style={{ width: '100%' }} value={newRemark} onChange={e => setNewRemark(e.target.value)} placeholder="Note for team..." />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleAddRound} disabled={!newOffer || saving} className="btn btn-blue btn-xs">
                      {saving ? 'Saving...' : 'Add Round'}
                    </button>
                    <button onClick={() => setShowAdd(false)} className="btn-subtle btn-xs">Cancel</button>
                  </div>
                </div>
              )}

              {rounds.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>No negotiation rounds yet</div>
              ) : (
                <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                  {rounds.map((r, i) => {
                    const StatusIcon = statusIcons[r.status] || Clock
                    return (
                      <div key={r.id} style={{ padding: '8px 0', borderBottom: i < rounds.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-bright)' }}>Round {r.round_number}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-bright)' }}>₹{r.offered_amount.toLocaleString('en-IN')}</span>
                            {r.counter_amount && (
                              <span style={{ fontSize: 11, color: 'var(--color-blue)' }}>→ ₹{r.counter_amount.toLocaleString('en-IN')}</span>
                            )}
                            {r.final_amount && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-green)' }}>✓ ₹{r.final_amount.toLocaleString('en-IN')}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <StatusIcon size={12} style={{ color: statusColors[r.status] || '#94A3B8' }} />
                            <span style={{ fontSize: 10, color: statusColors[r.status] || 'var(--text-muted)', textTransform: 'capitalize' }}>{r.status}</span>
                          </div>
                        </div>
                        {r.internal_remark && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{r.internal_remark}</div>
                        )}
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {r.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                            <button onClick={() => handleUpdateRound(r.id, { status: 'accepted', final_amount: r.counter_amount || r.offered_amount })} className="btn btn-green btn-xs" style={{ fontSize: 10 }}>Accept</button>
                            <button onClick={() => handleUpdateRound(r.id, { status: 'rejected' })} className="btn btn-red btn-xs" style={{ fontSize: 10 }}>Reject</button>
                            <button onClick={() => {
                              const counter = prompt('Counter amount (₹):')
                              if (counter) handleUpdateRound(r.id, { status: 'countered', counter_amount: Number(counter) })
                            }} className="btn btn-blue btn-xs" style={{ fontSize: 10 }}>Counter</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
