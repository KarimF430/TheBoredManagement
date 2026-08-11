import fs from 'fs'
import path from 'path'

const content = `'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Clock } from 'lucide-react'
import { LoadingState, Toast } from '@/components/cp/CampaignUI'

interface Campaign {
  id: string
  name: string
  brand: string
  status: string
  objective: string
  brief_mandatories: string
  campaign_type: string
  platform_mix: string[]
  deliverable_types: string[]
  budget: number
  go_live_date: string
  brief_last_edited_at: string | null
}

export default function BriefPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [objective, setObjective] = useState('')
  const [mandatories, setMandatories] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(\`/api/campaigns/\${campaignId}\`)
      const data = await res.json()
      if (data.campaign) {
        setCampaign(data.campaign)
        setObjective(data.campaign.objective || '')
        setMandatories(data.campaign.brief_mandatories || '')
      }
    } catch {
      showToast('Failed to load campaign', 'error')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(\`/api/campaigns/\${campaignId}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective, brief_mandatories: mandatories }),
      })
      if (res.ok) {
        showToast('Brief saved successfully')
        setHasChanges(false)
        fetchData()
      } else {
        showToast('Failed to save brief', 'error')
      }
    } catch {
      showToast('Failed to save brief', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState text="Loading brief..." />
  if (!campaign) return null

  return (
    <div className="anim-fade-up">
      <button
        onClick={() => router.push(\`/campaigns/\${campaignId}\`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 16,
        }}
      >
        <ArrowLeft size={14} /> Back to overview
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="text-gradient-blue">Campaign</span> Brief
          </h1>
          <p className="page-subtitle">{campaign.name} — {campaign.brand}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasChanges && (
            <span style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600 }}>
              Unsaved changes
            </span>
          )}
          <button onClick={handleSave} disabled={saving || !hasChanges} className="btn btn-blue">
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Brief'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="section-title">Campaign Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Brand', value: campaign.brand },
            { label: 'Type', value: campaign.campaign_type?.replace(/_/g, ' ') },
            { label: 'Budget', value: \`₹\${campaign.budget?.toLocaleString('en-IN')}\` },
            { label: 'Go Live', value: new Date(campaign.go_live_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)', textTransform: 'capitalize' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {campaign.platform_mix && campaign.platform_mix.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Platform Mix
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {campaign.platform_mix.map(p => (
                <span key={p} className="badge badge-blue">{p.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        )}

        {campaign.deliverable_types && campaign.deliverable_types.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Deliverable Types
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {campaign.deliverable_types.map(d => (
                <span key={d} className="badge badge-green">{d.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Objective</h3>
        <textarea
          value={objective}
          onChange={e => { setObjective(e.target.value); setHasChanges(true) }}
          className="textarea"
          rows={4}
          placeholder="Describe the campaign objective, target audience, and key messaging..."
        />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Mandatories</h3>
        <textarea
          value={mandatories}
          onChange={e => { setMandatories(e.target.value); setHasChanges(true) }}
          className="textarea"
          rows={6}
          placeholder="List all mandatory requirements for creators (product mentions, hashtags, disclosures, etc.)..."
        />
      </div>

      {campaign.brief_last_edited_at && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          <Clock size={12} />
          Last edited {new Date(campaign.brief_last_edited_at).toLocaleString('en-IN')}
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
`

const target = path.join(__dirname, '..', 'src', 'app', 'campaigns', '[id]', 'brief', 'page.tsx')
fs.writeFileSync(target, content, 'utf8')
console.log('Brief page written successfully')
