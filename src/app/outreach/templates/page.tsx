'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Edit3, Trash2, FileText, Eye, Copy,
  CheckCircle, XCircle, AlertCircle, Loader2
} from 'lucide-react'
import { StatusBadge, Toast, EmptyState, ErrorState, KPISkeleton } from '@/components/cp/CampaignUI'

interface Template {
  id: string
  name: string
  tier: string
  stage: string
  subject: string
  body_text: string
  body_html: string | null
  active: boolean
  created_at: string
}

const STAGE_LABELS: Record<string, string> = {
  first_touch: 'First Touch',
  followup_1: 'Follow-up 1',
  followup_2: 'Follow-up 2',
  followup_3: 'Follow-up 3',
  followup_4: 'Follow-up 4',
}

const STAGE_ORDER = ['first_touch', 'followup_1', 'followup_2', 'followup_3', 'followup_4']

export default function OutreachTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/outreach/templates')
      const data = await res.json()
      if (data.error) setError(data.error)
      else setTemplates(data.templates || [])
    } catch {
      setError('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  const handleSave = async (template: Partial<Template>) => {
    try {
      const method = template.id ? 'PUT' : 'POST'
      const url = template.id ? `/api/outreach/templates/${template.id}` : '/api/outreach/templates'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })
      const data = await res.json()
      if (data.error) showToast(data.error, 'error')
      else {
        showToast(template.id ? 'Template updated' : 'Template created')
        setShowAddModal(false)
        setEditingTemplate(null)
        loadTemplates()
      }
    } catch {
      showToast('Failed to save', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    try {
      await fetch(`/api/outreach/templates/${id}`, { method: 'DELETE' })
      showToast('Template deleted')
      loadTemplates()
    } catch {
      showToast('Failed to delete', 'error')
    }
  }

  const handleToggleActive = async (template: Template) => {
    try {
      await fetch(`/api/outreach/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !template.active }),
      })
      showToast(template.active ? 'Template deactivated' : 'Template activated')
      loadTemplates()
    } catch {
      showToast('Failed to update', 'error')
    }
  }

  const handleDuplicate = async (template: Template) => {
    try {
      await fetch('/api/outreach/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (copy)`,
          tier: template.tier,
          stage: template.stage,
          subject: template.subject,
          body_text: template.body_text,
          body_html: template.body_html,
          active: false,
        }),
      })
      showToast('Template duplicated')
      loadTemplates()
    } catch {
      showToast('Failed to duplicate', 'error')
    }
  }

  if (loading) return <KPISkeleton />
  if (error) return <ErrorState title="Failed to load templates" description={error} onRetry={loadTemplates} />

  const grouped = STAGE_ORDER.map(stage => ({
    stage,
    label: STAGE_LABELS[stage] || stage,
    templates: templates.filter(t => t.stage === stage),
  }))

  return (
    <div className="anim-fade-up">
      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">
            <span className="accent">Templates</span>
          </h1>
          <p className="page-subtitle">{templates.length} templates · {templates.filter(t => t.active).length} active</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-blue btn-sm">
          <Plus size={13} /> New Template
        </button>
      </div>

      {/* Templates by Stage */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {grouped.map(group => (
          <div key={group.stage} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-purple">{group.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{group.templates.length} template{group.templates.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            {group.templates.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No templates for this stage</div>
                <button
                  onClick={() => { setShowAddModal(true) }}
                  className="btn btn-ghost btn-xs"
                  style={{ marginTop: 6 }}
                >
                  <Plus size={10} /> Create One
                </button>
              </div>
            ) : (
              <div style={{ padding: 8 }}>
                {group.templates.map(t => (
                  <div key={t.id} style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-1)',
                    marginBottom: 6,
                    background: t.active ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                    opacity: t.active ? 1 : 0.7,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</span>
                        <StatusBadge status={t.active ? 'active' : 'paused'} label={t.active ? 'Active' : 'Inactive'} />
                        <span className={`badge ${t.tier === 'tier1' ? 'badge-blue' : 'badge-purple'}`}>{t.tier}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setPreviewTemplate(t)} className="btn-subtle btn-xs" title="Preview"><Eye size={11} /></button>
                        <button onClick={() => handleDuplicate(t)} className="btn-subtle btn-xs" title="Duplicate"><Copy size={11} /></button>
                        <button onClick={() => setEditingTemplate(t)} className="btn-subtle btn-xs" title="Edit"><Edit3 size={11} /></button>
                        <button onClick={() => handleToggleActive(t)} className="btn-subtle btn-xs" title={t.active ? 'Deactivate' : 'Activate'}>
                          {t.active ? <XCircle size={11} style={{ color: 'var(--orange)' }} /> : <CheckCircle size={11} style={{ color: 'var(--green)' }} />}
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="btn-subtle btn-xs" title="Delete"><Trash2 size={11} style={{ color: 'var(--red)' }} /></button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      <strong>Subject:</strong> {t.subject}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4, maxHeight: 40, overflow: 'hidden' }}>
                      {t.body_text.slice(0, 150)}{t.body_text.length > 150 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingTemplate) && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => { setShowAddModal(false); setEditingTemplate(null) }}
          onSave={handleSave}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <PreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}

function TemplateModal({ template, onClose, onSave }: { template: Template | null; onClose: () => void; onSave: (t: Partial<Template>) => void }) {
  const [form, setForm] = useState({
    name: template?.name || '',
    tier: template?.tier || 'tier2' as 'tier1' | 'tier2',
    stage: template?.stage || 'first_touch',
    subject: template?.subject || '',
    body_text: template?.body_text || '',
    active: template?.active ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.subject || !form.body_text) return
    onSave({ ...form, id: template?.id })
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>{template ? 'Edit Template' : 'New Template'}</h3>
          <button onClick={onClose} className="btn-subtle btn-xs">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="section-title">Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. First Touch - Tech" />
            </div>
            <div>
              <label className="section-title">Stage *</label>
              <select className="input" value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="section-title">Tier</label>
              <select className="input" value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value as 'tier1' | 'tier2' })}>
                <option value="tier1">Tier 1 (Gmail)</option>
                <option value="tier2">Tier 2 (SES)</option>
              </select>
            </div>
            <div>
              <label className="section-title">Status</label>
              <select className="input" value={form.active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, active: e.target.value === 'active' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="section-title">Subject *</label>
            <input className="input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Email subject line" />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              <strong>Variables:</strong> <code style={{ background: 'var(--bg-elevated)', padding: '1px 4px', borderRadius: 3 }}>{'{{onboarding_link}}'}</code> — per-creator onboarding URL (auto-creates session if needed). The link will be resolved when the campaign sends emails.
            </div>
          </div>
          <div>
            <label className="section-title">Body Text *</label>
            <textarea className="textarea" required rows={8} value={form.body_text} onChange={e => setForm({ ...form, body_text: e.target.value })} placeholder="Plain text email body..." />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{form.body_text.length} characters · {form.body_text.split(/\s+/).filter(Boolean).length} words</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              <strong>Variables:</strong> <code style={{ background: 'var(--bg-elevated)', padding: '1px 4px', borderRadius: 3 }}>{'{{onboarding_link}}'}</code> — per-creator onboarding URL (auto-creates session if needed). The link will be resolved when the campaign sends emails.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-blue" style={{ flex: 1 }}>{template ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PreviewModal({ template, onClose }: { template: Template; onClose: () => void }) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Preview: {template.name}</h3>
          <button onClick={onClose} className="btn-subtle btn-xs">✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <div className="card" style={{ background: 'var(--bg-surface)', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Subject</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{template.subject}</div>
          </div>
          <div className="card" style={{ background: 'var(--bg-surface)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>Body</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{template.body_text}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <span className={`badge ${template.tier === 'tier1' ? 'badge-blue' : 'badge-purple'}`}>{template.tier}</span>
            <span className="badge badge-purple">{STAGE_LABELS[template.stage] || template.stage}</span>
            <StatusBadge status={template.active ? 'active' : 'paused'} label={template.active ? 'Active' : 'Inactive'} />
          </div>
        </div>
      </div>
    </div>
  )
}
