'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Send, Save, Globe, Video, List, DollarSign, Calendar } from 'lucide-react'

const PLATFORM_OPTIONS = [
  { value: 'youtube_long', label: 'YouTube Long Form', icon: Video },
  { value: 'youtube_shorts', label: 'YouTube Shorts', icon: Video },
  { value: 'instagram_reels', label: 'Instagram Reels', icon: Globe },
  { value: 'instagram_stories', label: 'Instagram Stories', icon: Globe },
  { value: 'instagram_posts', label: 'Instagram Posts', icon: Globe },
]

const DELIVERABLE_OPTIONS = [
  { value: 'dedicated_video', label: 'Dedicated Video' },
  { value: 'integrated_video', label: 'Integrated Video' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
  { value: 'post', label: 'Post' },
]

const CAMPAIGN_TYPES = [
  { value: 'product_launch', label: 'Product Launch' },
  { value: 'brand_awareness', label: 'Brand Awareness' },
  { value: 'festival_sale', label: 'Festival Sale' },
  { value: 'always_on', label: 'Always On' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'crisis_mgmt', label: 'Crisis Management' },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [campaignType, setCampaignType] = useState('brand_awareness')
  const [objective, setObjective] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [deliverables, setDeliverables] = useState<string[]>([])
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [goLiveDate, setGoLiveDate] = useState('')
  const [mandatories, setMandatories] = useState('')

  const togglePlatform = (v: string) => {
    setPlatforms(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const toggleDeliverable = (v: string) => {
    setDeliverables(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const handleCreate = async (activate: boolean) => {
    if (!name.trim()) return setError('Campaign name is required')
    if (!brand.trim()) return setError('Brand name is required')
    if (platforms.length === 0) return setError('Select at least one platform')
    if (!goLiveDate) return setError('Go live date is required')

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim(),
          campaign_type: campaignType,
          objective: objective.trim(),
          platform_mix: platforms,
          deliverable_types: deliverables,
          budget: parseFloat(budget) || 0,
          start_date: startDate,
          go_live_date: goLiveDate,
          brief_mandatories: mandatories.trim(),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create campaign')
        return
      }

      // If activating, update status
      if (activate && data.campaign?.id) {
        await fetch(`/api/campaigns/${data.campaign.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        })
      }

      router.push(data.campaign ? `/campaigns/${data.campaign.id}` : '/campaigns')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="anim-fade-up" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={() => router.push('/campaigns')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
          marginBottom: 16, transition: 'color 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-bright)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <ArrowLeft size={15} />
        Back to campaigns
      </button>

      <div className="page-header" style={{ borderBottom: 'none', marginBottom: 20, paddingBottom: 0 }}>
        <div>
          <h1 className="page-title">
            Create <span className="text-gradient-blue">New Campaign</span>
          </h1>
          <p className="page-subtitle">
            Fill the brief once. It becomes the locked SLA reference for the entire campaign workflow.
          </p>
        </div>
      </div>

      {error && (
        <div className="badge-red" style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 20,
          fontSize: 12.5, fontWeight: 600, display: 'block', width: '100%'
        }}>
          {error}
        </div>
      )}

      {/* Main glassmorphic card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Row 1: Name & Brand & Type */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
              Campaign Name *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Monsoon Campaign 2026"
              className="input"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
              Brand Name *
            </label>
            <input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="Aquaguard"
              className="input"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
              Campaign Type
            </label>
            <select
              value={campaignType}
              onChange={e => setCampaignType(e.target.value)}
              className="input"
            >
              {CAMPAIGN_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Objective */}
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
            Campaign Objective
          </label>
          <textarea
            value={objective}
            onChange={e => setObjective(e.target.value)}
            placeholder="Outline the main targets, brand messages, or conversion metrics..."
            rows={3}
            className="input"
            style={{ resize: 'vertical', minHeight: 70 }}
          />
        </div>

        {/* Row 3: Platform Mix (Pills) */}
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
            Platform Mix *
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PLATFORM_OPTIONS.map(p => {
              const active = platforms.includes(p.value)
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePlatform(p.value)}
                  className="btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    borderRadius: 20,
                    background: active ? 'var(--blue-gradient)' : 'var(--bg-elevated)',
                    color: active ? '#FFFFFF' : 'var(--text-secondary)',
                    border: '1px solid transparent',
                    borderColor: active ? 'var(--blue)' : 'var(--border-1)',
                    boxShadow: active ? '0 4px 10px var(--blue-glow)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <p.icon size={13} style={{ opacity: active ? 1 : 0.7 }} />
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 4: Deliverables Type (Pills) */}
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
            Deliverable Formats
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DELIVERABLE_OPTIONS.map(d => {
              const active = deliverables.includes(d.value)
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDeliverable(d.value)}
                  className="btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    borderRadius: 20,
                    background: active ? 'var(--violet-gradient)' : 'var(--bg-elevated)',
                    color: active ? '#FFFFFF' : 'var(--text-secondary)',
                    border: '1px solid transparent',
                    borderColor: active ? 'var(--violet)' : 'var(--border-1)',
                    boxShadow: active ? '0 4px 10px rgba(124,58,237,0.15)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <List size={13} style={{ opacity: active ? 1 : 0.7 }} />
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 5: Budget & Timelines */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
              Allocated Budget (₹)
            </label>
            <div style={{ position: 'relative' }}>
              <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="Budget value"
                className="input"
                style={{ paddingLeft: 30 }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
              Start Date
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="input"
                style={{ paddingLeft: 30 }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
              Go Live Date *
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="date"
                value={goLiveDate}
                onChange={e => setGoLiveDate(e.target.value)}
                className="input"
                style={{ paddingLeft: 30 }}
              />
            </div>
          </div>
        </div>

        {/* Row 6: Mandatories */}
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
            Mandatories & Brand Guidelines
          </label>
          <textarea
            value={mandatories}
            onChange={e => setMandatories(e.target.value)}
            placeholder="Do's & don'ts, primary hashtag mentions, specific URL redirections..."
            rows={4}
            className="input"
            style={{ resize: 'vertical', minHeight: 90 }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, borderTop: '1.5px solid var(--border-1)', paddingTop: 20, marginTop: 10 }}>
          <button
            onClick={() => handleCreate(false)}
            disabled={loading}
            className="btn btn-ghost"
            style={{
              flex: 1, padding: '12px 20px', borderRadius: 10,
              fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            Save as Draft
          </button>
          
          <button
            onClick={() => handleCreate(true)}
            disabled={loading}
            className="btn btn-blue"
            style={{
              flex: 1, padding: '12px 20px', borderRadius: 10,
              fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
            Save & Activate
          </button>
        </div>
      </div>
    </div>
  )
}
