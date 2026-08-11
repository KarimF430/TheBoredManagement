'use client'

import { useState } from 'react'
import { Package, Truck, CheckCircle2, Camera, Rocket, Upload, Clock, Edit3, Save, X } from 'lucide-react'

interface Deliverable {
  id: string
  product_status: string
  product_name: string
  product_tracking_number: string | null
  product_carrier: string | null
  product_ordered_at: string | null
  product_shipped_at: string | null
  product_delivered_at: string | null
  shoot_scheduled_at: string | null
  shoot_completed_at: string | null
  brief_approved_at: string | null
  script_approved_at: string | null
  status: string
}

interface ProductTimelineProps {
  deliverable: Deliverable
  onUpdate: (updates: Record<string, unknown>) => void
}

const STAGES = [
  { id: 'brief_approved', label: 'Brief Approved', icon: CheckCircle2, color: '#6554C0', field: 'brief_approved_at' },
  { id: 'product_ordered', label: 'Product Ordered', icon: Package, color: '#FF8B00', field: 'product_ordered_at' },
  { id: 'product_shipped', label: 'Product Shipped', icon: Truck, color: '#0052CC', field: 'product_shipped_at' },
  { id: 'product_delivered', label: 'Product Delivered', icon: Package, color: '#00875A', field: 'product_delivered_at' },
  { id: 'script_approved', label: 'Script Approved', icon: CheckCircle2, color: '#6554C0', field: 'script_approved_at' },
  { id: 'shoot_completed', label: 'Shoot Done', icon: Camera, color: '#FF8B00', field: 'shoot_completed_at' },
  { id: 'content_submitted', label: 'Content Submitted', icon: Upload, color: '#0052CC', field: null },
  { id: 'live', label: 'Live', icon: Rocket, color: '#DE350B', field: null },
]

export default function ProductTimeline({ deliverable, onUpdate }: ProductTimelineProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleMarkStage = (stageId: string) => {
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = {}

    switch (stageId) {
      case 'brief_approved': updates.brief_approved_at = now; break
      case 'product_ordered': updates.product_ordered_at = now; updates.product_status = 'ordered'; break
      case 'product_shipped': updates.product_shipped_at = now; updates.product_status = 'shipped'; break
      case 'product_delivered': updates.product_delivered_at = now; updates.product_status = 'delivered'; break
      case 'script_approved': updates.script_approved_at = now; break
      case 'shoot_completed': updates.shoot_completed_at = now; break
      case 'live': updates.status = 'live'; break
    }

    onUpdate(updates)
    setEditing(null)
  }

  const handleSaveTracking = () => {
    onUpdate({
      product_tracking_number: editValue,
      product_status: 'shipped',
      product_shipped_at: deliverable.product_shipped_at || new Date().toISOString(),
    })
    setEditing(null)
  }

  const getStageStatus = (stage: typeof STAGES[0]) => {
    if (stage.field) {
      const val = deliverable[stage.field as keyof Deliverable]
      if (val) return 'completed'
    }
    if (stage.id === 'content_submitted') return 'pending'
    if (stage.id === 'live') return deliverable.status === 'live' ? 'completed' : 'pending'
    return 'pending'
  }

  const currentIdx = STAGES.findIndex(s => getStageStatus(s) === 'pending')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 className="section-title" style={{ margin: 0 }}>Product & Content Timeline</h4>
        {deliverable.product_status !== 'not_required' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tracking:</span>
            {editing === 'tracking' ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <input className="input" style={{ width: 140, padding: '3px 8px', fontSize: 11 }} value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Number" />
                <button onClick={handleSaveTracking} className="btn btn-blue btn-xs"><Save size={10} /></button>
                <button onClick={() => setEditing(null)} className="btn-subtle btn-xs"><X size={10} /></button>
              </div>
            ) : (
              <button onClick={() => { setEditing('tracking'); setEditValue(deliverable.product_tracking_number || '') }} className="btn-subtle btn-xs" style={{ fontSize: 11 }}>
                {deliverable.product_tracking_number || <><Edit3 size={10} /> Add</>}
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ position: 'relative', paddingLeft: 24 }}>
        <div style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 2, background: 'var(--border-1)' }} />

        {STAGES.map((stage, i) => {
          const status = getStageStatus(stage)
          const isCurrent = i === currentIdx
          const Icon = stage.icon
          const timestamp = stage.field ? deliverable[stage.field as keyof Deliverable] as string | null : null

          return (
            <div key={stage.id} style={{ position: 'relative', marginBottom: i < STAGES.length - 1 ? 4 : 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                position: 'absolute', left: -24, width: 22, height: 22, borderRadius: '50%',
                background: status === 'completed' ? stage.color : isCurrent ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                border: status === 'completed' ? 'none' : `2px solid ${isCurrent ? stage.color : 'var(--border-1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
              }}>
                <Icon size={11} style={{ color: status === 'completed' ? '#FFF' : isCurrent ? stage.color : 'var(--text-muted)' }} />
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', opacity: status === 'completed' || isCurrent ? 1 : 0.5 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: status === 'completed' ? 'var(--text-bright)' : 'var(--text-primary)' }}>
                    {stage.label}
                  </span>
                  {timestamp && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {status === 'pending' && isCurrent && (
                  <button onClick={() => handleMarkStage(stage.id)} className="btn btn-blue btn-xs" style={{ fontSize: 10 }}>
                    Mark Done
                  </button>
                )}
                {status === 'completed' && (
                  <span style={{ fontSize: 10, color: stage.color, fontWeight: 600 }}>Done</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
