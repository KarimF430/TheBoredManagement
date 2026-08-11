'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Clock, CheckCircle2, Undo2 } from 'lucide-react'
import { LoadingState, Toast } from '@/components/cp/CampaignUI'
import BriefVersionHistory from '@/components/cp/BriefVersionHistory'

interface Campaign {
  id: string
  name: string
  brand: string
  objective: string
  platform_mix: string[]
  deliverable_types: string[]
  budget: number
  start_date: string
  go_live_date: string
  brief_mandatories: string
  brief_last_edited_by: string | null
  brief_last_edited_at: string | null
}

export default function BriefPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [mandatories, setMandatories] = useState('')
  const [objective, setObjective] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [undoStack, setUndoStack] = useState<{ objective: string; mandatories: string }[]>([])
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(d => {
        if (d.campaign) {
          setCampaign(d.campaign)
          setMandatories(d.campaign.brief_mandatories || '')
          setObjective(d.campaign.objective || '')
        }
      })
      .catch(() => setError('Failed to load campaign'))
      .finally(() => setLoading(false))
  }, [campaignId])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const markUnsaved = useCallback(() => {
    setHasUnsaved(true)
    setSaved(false)
  }, [])

  const handleObjectiveChange = (val: string) => {
    if (!hasUnsaved) {
      setUndoStack(prev => [...prev, { objective, mandatories }])
    }
    setObjective(val)
    markUnsaved()
  }

  const handleMandatoriesChange = (val: string) => {
    if (!hasUnsaved) {
      setUndoStack(prev => [...prev, { objective, mandatories }])
    }
    setMandatories(val)
    markUnsaved()
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const last = undoStack[undoStack.length - 1]
    setObjective(last.objective)
    setMandatories(last.mandatories)
    setUndoStack(prev => prev.slice(0, -1))
    markUnsaved()
  }

  const handleSave = async (showToastMsg = true) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective, brief_mandatories: mandatories }),
      })
      if (!res.ok) throw new Error('Save failed')
      setHasUnsaved(false)
      setUndoStack([])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (showToastMsg) showToast('Brief saved')
    } catch {
      if (showToastMsg) showToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveVersion = async (reason: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/brief-versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          mandatories,
          platform_mix: campaign?.platform_mix || [],
          deliverable_types: campaign?.deliverable_types || [],
          budget: campaign?.budget || 0,
          go_live_date: campaign?.go_live_date || null,
          change_reason: reason,
        }),
      })
      if (res.ok) showToast('Version saved')
    } catch {
      showToast('Failed to save version', 'error')
    }
  }

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!hasUnsaved) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => handleSave(false), 2000)
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [objective, mandatories, hasUnsaved])

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsaved])

  if (loading) return <LoadingState text="Loading brief..." />
  if (!campaign) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>Campaign not found</div>

  return (
    <div style={{ maxWidth: 640, animation: 'fadeUp 0.3s ease both' }}>
      <button onClick={() => router.push(`/campaigns/${campaignId}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 500, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to overview
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Brief</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{campaign.name} · {campaign.brand}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {undoStack.length > 0 && (
            <button onClick={handleUndo} className="btn btn-ghost btn-sm" title="Undo changes">
              <Undo2 size={14} />
            </button>
          )}
          {hasUnsaved && (
            <span style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)' }} /> Unsaved
            </span>
          )}
          {saved && (
            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={12} /> Saved
            </span>
          )}
          {campaign.brief_last_edited_at && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-elevated)', fontSize: 11, color: 'var(--text-muted)' }}>
              <Clock size={12} /> Last edited {new Date(campaign.brief_last_edited_at).toLocaleDateString('en-IN')}
            </div>
          )}
        </div>
      </div>

      {/* Read-only brief fields */}
      <div style={{ padding: 20, borderRadius: 12, background: '#FFFFFF', border: '1.5px solid var(--border-1)', marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Campaign Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Brand</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{campaign.brand}</p>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Budget</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>₹{campaign.budget?.toLocaleString('en-IN') || '0'}</p>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Platforms</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{campaign.platform_mix?.join(', ') || '—'}</p>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Go Live</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {campaign.go_live_date ? new Date(campaign.go_live_date).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Version History */}
      <div style={{ padding: 20, borderRadius: 12, background: '#FFFFFF', border: '1.5px solid var(--border-1)', marginBottom: 16 }}>
        <BriefVersionHistory
          campaignId={campaignId}
          currentBrief={{
            objective,
            mandatories,
            platform_mix: campaign?.platform_mix || [],
            deliverable_types: campaign?.deliverable_types || [],
            budget: campaign?.budget || 0,
            go_live_date: campaign?.go_live_date || null,
          }}
          onSaveVersion={handleSaveVersion}
        />
      </div>

      {/* Editable objective */}
      <div style={{ padding: 20, borderRadius: 12, background: '#FFFFFF', border: `1.5px solid ${hasUnsaved ? 'rgba(255,109,0,0.3)' : 'var(--border-1)'}`, marginBottom: 16, transition: 'border-color 0.2s' }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Objective</label>
        <textarea value={objective} onChange={e => handleObjectiveChange(e.target.value)}
          placeholder="What is this campaign for?" rows={3}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border-2)', background: 'var(--bg-input)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }} />
      </div>

      {/* Editable mandatories */}
      <div style={{ padding: 20, borderRadius: 12, background: '#FFFFFF', border: `1.5px solid ${hasUnsaved ? 'rgba(255,109,0,0.3)' : 'var(--border-1)'}`, marginBottom: 16, transition: 'border-color 0.2s' }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Mandatories & Brand Guidelines</label>
        <textarea value={mandatories} onChange={e => handleMandatoriesChange(e.target.value)}
          placeholder="Dos, don'ts, brand guidelines, mandatory mentions..." rows={6}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border-2)', background: 'var(--bg-input)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }} />
      </div>

      {/* Save */}
      <button onClick={() => handleSave(true)} disabled={saving || !hasUnsaved}
        style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: hasUnsaved ? 'var(--blue-gradient)' : 'var(--bg-elevated)', color: hasUnsaved ? '#FFF' : 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: hasUnsaved ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}>
        {saving ? <span>Saving...</span> : <Save size={14} />}
        Save Brief
      </button>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
