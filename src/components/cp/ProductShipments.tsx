'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Truck, CheckCircle, Clock, X } from 'lucide-react'

interface Shipment {
  id: string
  product_name: string
  tracking_number: string | null
  carrier: string | null
  status: string
  shipped_at: string
  delivered_at: string | null
  expected_delivery: string | null
  creator_name?: string
}

interface ProductShipmentsProps {
  campaignId: string
}

const STATUS_CONFIG: Record<string, { icon: typeof Package; color: string; label: string }> = {
  shipped: { icon: Truck, color: 'var(--blue)', label: 'Shipped' },
  in_transit: { icon: Truck, color: 'var(--orange)', label: 'In Transit' },
  delivered: { icon: CheckCircle, color: 'var(--green)', label: 'Delivered' },
  pending: { icon: Clock, color: 'var(--text-muted)', label: 'Pending' },
}

export default function ProductShipments({ campaignId }: ProductShipmentsProps) {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ product_name: '', tracking_number: '', carrier: '', expected_delivery: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/shipments`)
      const data = await res.json()
      setShipments(data.shipments || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [campaignId])

  const handleCreate = async () => {
    if (!form.product_name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: form.product_name,
          tracking_number: form.tracking_number || null,
          carrier: form.carrier || null,
          expected_delivery: form.expected_delivery || null,
        }),
      })
      const data = await res.json()
      if (!data.error) {
        setShipments(prev => [data.shipment, ...prev])
        setForm({ product_name: '', tracking_number: '', carrier: '', expected_delivery: '' })
        setShowForm(false)
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleStatusUpdate = async (shipmentId: string, status: string) => {
    const res = await fetch(`/api/campaigns/${campaignId}/shipments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipment_id: shipmentId, status, delivered_at: status === 'delivered' ? new Date().toISOString() : undefined }),
    })
    const data = await res.json()
    if (!data.error) {
      setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status, delivered_at: status === 'delivered' ? new Date().toISOString() : s.delivered_at } : s))
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>Loading shipments...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 className="section-title" style={{ margin: 0 }}>Product Shipments</h4>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-ghost btn-sm">
          <Plus size={14} /> Add Shipment
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 12, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <input className="input" placeholder="Product name *" value={form.product_name} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} />
            <input className="input" placeholder="Tracking number" value={form.tracking_number} onChange={e => setForm(p => ({ ...p, tracking_number: e.target.value }))} />
            <input className="input" placeholder="Carrier" value={form.carrier} onChange={e => setForm(p => ({ ...p, carrier: e.target.value }))} />
            <input className="input" type="date" placeholder="Expected delivery" value={form.expected_delivery} onChange={e => setForm(p => ({ ...p, expected_delivery: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !form.product_name.trim()} className="btn btn-blue btn-sm">
              {saving ? 'Saving...' : 'Add Shipment'}
            </button>
          </div>
        </div>
      )}

      {shipments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 12, border: '1px solid var(--border-1)', borderRadius: 'var(--radius)' }}>
          <Package size={18} style={{ margin: '0 auto 8px', opacity: 0.4, display: 'block' }} />
          No shipments yet. Add product shipments to track delivery to creators.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shipments.map(s => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending
            const Icon = cfg.icon
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid var(--border-1)', borderRadius: 'var(--radius)', background: 'var(--bg-card)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius)', background: `${cfg.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} style={{ color: cfg.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)' }}>{s.product_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                    {s.carrier && <span>{s.carrier}</span>}
                    {s.tracking_number && <span className="text-mono">#{s.tracking_number}</span>}
                    {s.expected_delivery && <span>ETA: {new Date(s.expected_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                </div>
                <span className="badge" style={{ background: `${cfg.color}12`, color: cfg.color }}>{cfg.label}</span>
                {s.status !== 'delivered' && (
                  <select
                    className="input"
                    style={{ width: 'auto', padding: '4px 24px 4px 8px', fontSize: 11 }}
                    value={s.status}
                    onChange={e => handleStatusUpdate(s.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                  </select>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
