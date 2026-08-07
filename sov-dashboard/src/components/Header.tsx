'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaignStore } from '@/lib/store'
import { CATEGORIES } from '@/lib/categories'
import { Plus, Search, X, Check, Loader2, Menu, ChevronDown } from 'lucide-react'

export default function Header({ onMenuToggle, navOpen }: { onMenuToggle?: () => void; navOpen?: boolean } = {}) {
  const router = useRouter()
  const { campaigns, activeCampaignId, setActiveCampaignId, fetchCampaigns } = useCampaignStore()

  // Modal States
  const [showKwModal, setShowKwModal] = useState(false)
  const [showProjModal, setShowProjModal] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)

  // Keyword Modal Form States
  const [keywordText, setKeywordText] = useState('')
  const [selectedLang, setSelectedLang] = useState('en')
  const [selectedType, setSelectedType] = useState('generic')

  // Project Modal Form States
  const [projectName, setProjectName] = useState('')
  const [selectedCatId, setSelectedCatId] = useState('')
  const [selectedSubCatId, setSelectedSubCatId] = useState('')
  const [projectDesc, setProjectDesc] = useState('')

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Handle Project Creation
  const handleCreateProject = async () => {
    if (!projectName.trim()) return showToast('Project Name is required', 'error')
    if (!selectedCatId) return showToast('Category is required', 'error')
    
    setLoading(true)
    try {
      const cat = CATEGORIES.find(c => c.id === selectedCatId)?.name || ''
      const subCat = CATEGORIES.find(c => c.id === selectedCatId)?.subCategories.find(s => s.id === selectedSubCatId)?.name || ''
      
      const r = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName.trim(),
          category: cat,
          sub_category: subCat,
          description: projectDesc.trim(),
        }),
      })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed to create project', 'error')
      
      showToast(`Project "${projectName}" created successfully!`)
      setProjectName('')
      setSelectedCatId('')
      setSelectedSubCatId('')
      setProjectDesc('')
      setShowProjModal(false)
      
      await fetchCampaigns(true)
      if (d.campaign?.id) {
        setActiveCampaignId(d.campaign.id)
        router.push('/control')
      }
    } catch {
      showToast('Connection error', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle Add Keywords
  const handleAddKeywords = async () => {
    if (!activeCampaignId) return showToast('Please select a project first', 'error')
    if (!keywordText.trim()) return showToast('Enter at least one keyword', 'error')
    
    setLoading(true)
    try {
      const lines = keywordText.split('\n').map(l => l.trim()).filter(Boolean)
      const list = lines.map(text => ({
        text,
        language: selectedLang,
        type: selectedType
      }))

      const r = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: activeCampaignId,
          keywords: list,
        }),
      })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed to add keywords', 'error')

      showToast(
        d.skipped > 0
          ? `Added ${d.added} keyword(s), skipped ${d.skipped} duplicate(s)`
          : `Added ${d.added} keyword(s) successfully!`
      )
      setKeywordText('')
      setShowKwModal(false)

      window.dispatchEvent(new CustomEvent('keyword-added', { detail: { campaignId: activeCampaignId } }))
      router.push('/control')
    } catch {
      showToast('Connection error', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Selected Category's Sub-categories
  const subCategories = CATEGORIES.find(c => c.id === selectedCatId)?.subCategories || []

  // Language Lists
  const LANGUAGES = [
    { code: 'hi', label: 'Hinglish' },
    { code: 'kn', label: 'Kannada' },
    { code: 'te', label: 'Telugu' },
    { code: 'ta', label: 'Tamil' },
    { code: 'ml', label: 'Malayalam' },
    { code: 'en', label: 'English' }
  ]

  // Keyword Types
  const TYPES = [
    { code: 'generic', label: 'Generic' },
    { code: 'branded', label: 'Branded' },
    { code: 'comparison', label: 'Comparison' }
  ]

  // Close project dropdown on outside click
  useEffect(() => {
    if (!showProjectDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showProjectDropdown])

  return (
    <header className="app-header">
      <button
        type="button"
        className="nav-toggle"
        onClick={onMenuToggle}
        aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={!!navOpen}
        aria-controls="primary-navigation"
      >
        <Menu size={18} />
      </button>
      {/* Left side: Branding / Title context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div>
          <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>Workspace</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <img src="/tbm-logo.png" alt="TheBoredMonkey" style={{ height: 22, width: 'auto', display: 'block' }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Analytics</span>
          </div>
        </div>
      </div>

      {/* Right side controls: Project Selector & Keyword Intake */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Trigger button */}
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              data-tutorial="campaign-selector"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                height: 38, padding: '0 14px 0 12px',
                background: '#fff', border: '1px solid #E2E8F0',
                borderRadius: 10, cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
                minWidth: 210, maxWidth: 240,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>
                  {campaigns.find(c => c.id === activeCampaignId)?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                {campaigns.find(c => c.id === activeCampaignId)?.name || 'Select Project'}
              </span>
              <ChevronDown size={14} style={{ color: '#94A3B8', flexShrink: 0, transition: 'transform 0.2s', transform: showProjectDropdown ? 'rotate(180deg)' : 'rotate(0)' }} />
            </button>

            {/* Dropdown menu */}
            {showProjectDropdown && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: '#fff', border: '1px solid #E2E8F0',
                borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                zIndex: 1000, overflow: 'hidden',
                animation: 'dropdownFadeIn 0.15s ease',
              }}>
                {/* Dropdown header */}
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Projects</span>
                </div>
                {/* Project list */}
                <div style={{ maxHeight: 280, overflowY: 'auto', padding: '4px' }}>
                  {campaigns.map(c => {
                    const isActive = c.id === activeCampaignId
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setActiveCampaignId(c.id); setShowProjectDropdown(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '9px 10px', border: 'none',
                          background: isActive ? 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)' : 'transparent',
                          borderRadius: 8, cursor: 'pointer',
                          transition: 'all 0.12s ease',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: isActive ? 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)' : '#F1F5F9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : '#64748B' }}>
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#4338CA' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name}
                          </div>
                        </div>
                        {isActive && (
                          <div style={{ width: 18, height: 18, borderRadius: 5, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={11} style={{ color: '#fff', strokeWidth: 3 }} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <style>{`
            @keyframes dropdownFadeIn {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <button
            onClick={() => setShowProjModal(true)}
            title="Create New Project"
            aria-label="Create New Project"
            className="icon-btn icon-btn--dashed"
          >
            <Plus size={16} />
          </button>
        </div>

        {activeCampaignId && (
          <button
            onClick={() => setShowKwModal(true)}
            className="btn btn-blue"
            style={{ padding: '0 16px', height: 36, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Search size={14} /> Add Keywords
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: ADD KEYWORDS
      ══════════════════════════════════════════════════════════════════ */}
      {showKwModal && (
        <div className="modal-scrim" onClick={() => setShowKwModal(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowKwModal(false)}
              className="modal-close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h3 className="modal-title">Add Keyword Target</h3>
            <p className="modal-subtitle">Insert terms to scrape first 10 long-form and first 10 short-form YouTube videos</p>

            {/* Keyword Input */}
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">
                Keywords (One per line for bulk)
              </label>
              <textarea
                className="input"
                rows={4}
                value={keywordText}
                onChange={e => setKeywordText(e.target.value)}
                placeholder="e.g. best smartphone under 30k&#10;samsung galaxy s24 ultra review"
                style={{ resize: 'none', fontSize: 13, fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Section 1: Language */}
            <div style={{ marginBottom: 16 }}>
              <label className="field-label" style={{ marginBottom: 8 }}>
                Language
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {LANGUAGES.map(lang => {
                  const active = selectedLang === lang.code
                  return (
                    <button
                      key={lang.code}
                      className={`choice${active ? ' active' : ''}`}
                      onClick={() => setSelectedLang(lang.code)}
                    >
                      {lang.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Section 2: Keyword Type */}
            <div style={{ marginBottom: 24 }}>
              <label className="field-label" style={{ marginBottom: 8 }}>
                Keyword Classification Type
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {TYPES.map(t => {
                  const active = selectedType === t.code
                  return (
                    <button
                      key={t.code}
                      className={`choice${active ? ' active' : ''}`}
                      style={{ flex: 1 }}
                      onClick={() => setSelectedType(t.code)}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-blue"
                onClick={handleAddKeywords}
                disabled={loading}
                style={{ flex: 1, height: 40 }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Add Target
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowKwModal(false)}
                style={{ flex: 1, height: 40 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: CREATE CAMPAIGN/PROJECT
      ══════════════════════════════════════════════════════════════════ */}
      {showProjModal && (
        <div className="modal-scrim" onClick={() => setShowProjModal(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowProjModal(false)}
              className="modal-close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h3 className="modal-title">Create Analytics Project</h3>
            <p className="modal-subtitle">Categorize your target keywords to benchmark Share-of-Voice correctly</p>

            {/* Project Name */}
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">
                Project Name *
              </label>
              <input
                className="input"
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. Q3 Mobile Launch, Tech Brands India"
                style={{ height: 38 }}
              />
            </div>

            {/* Category selection */}
            <div className="modal-grid-2" style={{ marginBottom: 16 }}>
              <div>
                <label className="field-label">
                  Category *
                </label>
                <select
                  className="input"
                  value={selectedCatId}
                  onChange={e => {
                    setSelectedCatId(e.target.value)
                    setSelectedSubCatId('')
                  }}
                  style={{ height: 38 }}
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">
                  Sub-category
                </label>
                <select
                  className="input"
                  value={selectedSubCatId}
                  onChange={e => setSelectedSubCatId(e.target.value)}
                  disabled={!selectedCatId}
                  style={{ height: 38 }}
                >
                  <option value="">Select Sub-category</option>
                  {subCategories.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project description */}
            <div style={{ marginBottom: 24 }}>
              <label className="field-label">
                Description / Benchmark Goal
              </label>
              <textarea
                className="input"
                rows={3}
                value={projectDesc}
                onChange={e => setProjectDesc(e.target.value)}
                placeholder="Briefly describe the campaign target for reference..."
                style={{ resize: 'none', fontSize: 13 }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-blue"
                onClick={handleCreateProject}
                disabled={loading}
                style={{ flex: 1, height: 40 }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Create Project
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowProjModal(false)}
                style={{ flex: 1, height: 40 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Message System ── */}
      {toast && (
        <div className={`toast toast--${toast.type}`} role="status">
          {toast.msg}
        </div>
      )}
    </header>
  )
}
