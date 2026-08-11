'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Package, Plus,
  CheckCircle2, Clock, Send, Film, Eye, Rocket, ExternalLink,
  MessageSquare, FileText
} from 'lucide-react'
import { Toast } from '@/components/cp/CampaignUI'
import DragDropKanban from '@/components/cp/DragDropKanban'
import ProductTimeline from '@/components/cp/ProductTimeline'
import OnboardingLock from '@/components/cp/OnboardingLock'

interface Creator {
  id: string
  channel_name: string
  channel_url: string
  platform: string
  profile_image_url: string
}

interface Deliverable {
  id: string
  creator_id: string
  campaign_id: string
  platform: string
  status: string
  live_link: string | null
  live_link_added_at: string | null
  tracking_started_at: string | null
  views: number
  likes: number
  comments: number
  script_current_version: number
  script_approved_at: string | null
  creator: Creator | null
  created_at: string
  updated_at: string
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
  onboarded_at: string | null
  go_live_deadline: string | null
  go_live_deadline_extended: boolean
  extension_reason: string | null
  client_action: string | null
  client_remark: string | null
  client_action_at: string | null
}

interface Script {
  id: string
  deliverable_id: string
  version_number: number
  status: string
  content_text: string
  content_url: string
  feedback_remark: string
  created_at: string
}

const COLUMNS = [
  { id: 'pending', label: 'Pending', icon: Clock, color: '#94A3B8', bg: 'rgba(148,163,184,0.06)' },
  { id: 'script_pending', label: 'Script Pending', icon: FileText, color: 'var(--purple)', bg: 'rgba(124,58,237,0.06)' },
  { id: 'script_approved', label: 'Script Approved', icon: CheckCircle2, color: 'var(--green)', bg: 'rgba(0,200,83,0.06)' },
  { id: 'filming', label: 'Filming', icon: Film, color: 'var(--orange)', bg: 'rgba(255,109,0,0.06)' },
  { id: 'in_review', label: 'In Review', icon: Eye, color: 'var(--blue)', bg: 'var(--blue-dim)' },
  { id: 'approved', label: 'Approved', icon: CheckCircle2, color: 'var(--green)', bg: 'rgba(0,200,83,0.06)' },
  { id: 'live', label: 'Live', icon: Rocket, color: 'var(--red)', bg: 'var(--red-dim)' },
]

const PLATFORM_LABELS: Record<string, string> = {
  youtube_long: 'YT Long',
  youtube_shorts: 'YT Shorts',
  instagram_reels: 'IG Reels',
  instagram_stories: 'IG Stories',
  instagram_posts: 'IG Posts',
  twitter: 'Twitter',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#94A3B8',
  script_pending: 'var(--purple)',
  script_approved: 'var(--green)',
  filming: 'var(--orange)',
  in_review: 'var(--blue)',
  approved: 'var(--green)',
  live: 'var(--red)',
}

export default function ContentPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const [loading, setLoading] = useState(true)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [campaign, setCampaign] = useState<{ name: string; brand: string } | null>(null)
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [scripts, setScripts] = useState<Script[]>([])
  const [showAddScript, setShowAddScript] = useState(false)
  const [newScriptText, setNewScriptText] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    try {
      const [delRes, campRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}/deliverables`),
        fetch(`/api/campaigns/${campaignId}`),
      ])
      const delData = await delRes.json()
      const campData = await campRes.json()
      setDeliverables(delData.deliverables || [])
      setCampaign(campData.campaign ? { name: campData.campaign.name, brand: campData.campaign.brand } : null)
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchScripts = async (deliverableId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/scripts?deliverable_id=${deliverableId}`)
      const data = await res.json()
      setScripts(data.scripts || [])
    } catch {
      showToast('Failed to load scripts', 'error')
    }
  }

  const handleStatusChange = async (deliverableId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/deliverables`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverable_id: deliverableId, status: newStatus }),
      })
      if (res.ok) {
        showToast(`Status updated to ${newStatus.replace('_', ' ')}`)
        fetchData()
        if (selectedDeliverable?.id === deliverableId) {
          setSelectedDeliverable(prev => prev ? { ...prev, status: newStatus } : null)
        }
      } else {
        showToast('Failed to update status', 'error')
      }
    } catch {
      showToast('Failed to update status', 'error')
    }
  }

  const handleAddScript = async () => {
    if (!selectedDeliverable || !newScriptText.trim()) return
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliverable_id: selectedDeliverable.id,
          content_text: newScriptText.trim(),
        }),
      })
      if (res.ok) {
        showToast('Script submitted')
        setNewScriptText('')
        setShowAddScript(false)
        fetchScripts(selectedDeliverable.id)
        fetchData()
      } else {
        showToast('Failed to submit script', 'error')
      }
    } catch {
      showToast('Failed to submit script', 'error')
    }
  }

  const handleApproveScript = async (scriptId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/scripts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script_id: scriptId, status: 'approved' }),
      })
      if (res.ok) {
        showToast('Script approved')
        if (selectedDeliverable) fetchScripts(selectedDeliverable.id)
        fetchData()
      }
    } catch {
      showToast('Failed to approve script', 'error')
    }
  }

  const handleProductUpdate = async (updates: Record<string, unknown>) => {
    if (!selectedDeliverable) return
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/deliverables`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverable_id: selectedDeliverable.id, ...updates }),
      })
      if (res.ok) {
        showToast('Updated')
        fetchData()
        setSelectedDeliverable(prev => prev ? { ...prev, ...updates } : null)
      }
    } catch {
      showToast('Failed to update', 'error')
    }
  }

  const getDeliverablesByStatus = (status: string) =>
    deliverables.filter(d => d.status === status)

  const openDetail = async (d: Deliverable) => {
    setSelectedDeliverable(d)
    setShowDetail(true)
    await fetchScripts(d.id)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} />
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease both' }}>
      {/* Back */}
      <button
        onClick={() => router.push(`/campaigns/${campaignId}`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 16,
        }}
      >
        <ArrowLeft size={14} /> Back to overview
      </button>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="accent">Content</span> Pipeline
          </h1>
          <p className="page-subtitle">
            {campaign ? `${campaign.name} — ${campaign.brand}` : 'Manage content approval workflow'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropKanban
        columns={COLUMNS.map(c => ({
          id: c.id,
          label: c.label,
          icon: c.icon,
          color: c.color,
          bg: c.bg,
        }))}
        deliverables={deliverables}
        onStatusChange={handleStatusChange}
        onCardClick={openDetail}
        platformLabels={PLATFORM_LABELS}
      />

      {/* Detail Drawer */}
      {showDetail && selectedDeliverable && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
          background: '#FFF', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          zIndex: 200, display: 'flex', flexDirection: 'column',
          animation: 'slideIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Drawer Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1.5px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--blue-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFF', fontSize: 12, fontWeight: 700,
              }}>
                {selectedDeliverable.creator?.channel_name?.charAt(0) || '?'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedDeliverable.creator?.channel_name || 'Unknown'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {PLATFORM_LABELS[selectedDeliverable.platform] || selectedDeliverable.platform}
                </div>
              </div>
            </div>
            <button
              onClick={() => { setShowDetail(false); setSelectedDeliverable(null); setScripts([]) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 4 }}
            >
              ✕
            </button>
          </div>

          {/* Drawer Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {/* Status Change */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                Status
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {COLUMNS.map(col => (
                  <button
                    key={col.id}
                    onClick={() => handleStatusChange(selectedDeliverable.id, col.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      border: `1.5px solid ${selectedDeliverable.status === col.id ? col.color : 'var(--border-1)'}`,
                      background: selectedDeliverable.status === col.id ? col.color + '15' : 'transparent',
                      color: selectedDeliverable.status === col.id ? col.color : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Link */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                Live Link
              </label>
              {selectedDeliverable.live_link ? (
                <a
                  href={selectedDeliverable.live_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={12} />
                  {selectedDeliverable.live_link}
                </a>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No live link yet</span>
              )}
            </div>

            {/* Metrics */}
            {selectedDeliverable.tracking_started_at && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                  Metrics
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Views', value: selectedDeliverable.views },
                    { label: 'Likes', value: selectedDeliverable.likes },
                    { label: 'Comments', value: selectedDeliverable.comments },
                  ].map(m => (
                    <div key={m.label} style={{
                      background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-bright)' }}>
                        {m.value.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Timeline */}
            <div style={{ marginBottom: 20 }}>
              <ProductTimeline
                deliverable={selectedDeliverable}
                onUpdate={handleProductUpdate}
              />
            </div>

            {/* Onboarding Lock */}
            {selectedDeliverable.creator && (
              <div style={{ marginBottom: 20 }}>
                <OnboardingLock
                  creator={{
                    id: selectedDeliverable.creator_id,
                    channel_name: selectedDeliverable.creator.channel_name,
                    onboarded_at: selectedDeliverable.onboarded_at,
                    go_live_deadline: selectedDeliverable.go_live_deadline,
                    go_live_deadline_extended: selectedDeliverable.go_live_deadline_extended,
                    extension_reason: selectedDeliverable.extension_reason,
                    client_action: selectedDeliverable.client_action,
                    client_remark: selectedDeliverable.client_remark,
                    client_action_at: selectedDeliverable.client_action_at,
                    internal_cost: 0,
                  }}
                  campaignId={campaignId}
                  onUpdate={() => fetchData()}
                />
              </div>
            )}

            {/* Scripts */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Scripts ({scripts.length})
                </label>
                <button
                  onClick={() => setShowAddScript(!showAddScript)}
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: 11 }}
                >
                  <Plus size={12} /> New Script
                </button>
              </div>

              {showAddScript && (
                <div style={{
                  background: 'var(--bg-elevated)', borderRadius: 10, padding: 14, marginBottom: 12,
                  border: '1.5px solid var(--border-1)',
                }}>
                  <textarea
                    value={newScriptText}
                    onChange={e => setNewScriptText(e.target.value)}
                    placeholder="Paste script content..."
                    rows={4}
                    style={{
                      width: '100%', background: '#FFF', border: '1.5px solid var(--border-1)',
                      borderRadius: 8, padding: 10, fontSize: 12, fontFamily: 'inherit',
                      resize: 'vertical', outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowAddScript(false)} className="btn btn-sm btn-ghost">Cancel</button>
                    <button onClick={handleAddScript} className="btn btn-sm btn-blue">Submit</button>
                  </div>
                </div>
              )}

              {scripts.map(s => (
                <div key={s.id} style={{
                  background: '#FFF', borderRadius: 10, padding: 14, marginBottom: 8,
                  border: `1.5px solid ${s.status === 'approved' ? 'rgba(0,200,83,0.3)' : 'var(--border-1)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        v{s.version_number}
                      </span>
                      <span className={`badge ${s.status === 'approved' ? 'badge-green' : s.status === 'rejected' ? 'badge-red' : 'badge-gray'}`}>
                        {s.status}
                      </span>
                    </div>
                    {s.status === 'draft' && (
                      <button
                        onClick={() => handleApproveScript(s.id)}
                        className="btn btn-xs btn-blue"
                      >
                        <CheckCircle2 size={10} /> Approve
                      </button>
                    )}
                  </div>
                  {s.content_text && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {s.content_text.length > 200 ? s.content_text.substring(0, 200) + '...' : s.content_text}
                    </p>
                  )}
                  {s.feedback_remark && (
                    <div style={{
                      marginTop: 8, padding: '8px 10px', borderRadius: 6,
                      background: 'var(--orange-dim)', fontSize: 11, color: 'var(--orange)',
                    }}>
                      {s.feedback_remark}
                    </div>
                  )}
                </div>
              ))}

              {scripts.length === 0 && !showAddScript && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  No scripts submitted yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {showDetail && (
        <div
          onClick={() => { setShowDetail(false); setSelectedDeliverable(null); setScripts([]) }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)',
            zIndex: 199,
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} />}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
