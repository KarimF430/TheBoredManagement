'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Clock, Users, UserPlus, Shield,
  Save, Trash2, CheckCircle2, Mail, X, Plus
} from 'lucide-react'
import { Toast } from '@/components/cp/CampaignUI'

interface CampaignSettings {
  id: string
  name: string
  brand: string
  status: string
  sla_client_feedback_hours: number
  sla_script_days: number
  sla_content_days: number
  sla_onboard_to_live_days: number
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  assigned_sections: string[]
  user: { id: string; email: string; name: string; role: string } | null
}

interface ClientUser {
  id: string
  email: string
  name: string
  brand_name: string
  is_active: boolean
  invite_accepted_at: string | null
  last_login_at: string | null
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  brand_solutions: 'Brand Solutions',
  campaign_manager: 'Campaign Manager',
  ir_manager: 'IR Manager',
  ir_executive: 'IR Executive',
  client: 'Client',
}

const SECTIONS = ['overview', 'brief', 'shortlist', 'content', 'tracking', 'report', 'settings', 'activity', 'notifications']

export default function SettingsPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<CampaignSettings | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [clients, setClients] = useState<ClientUser[]>([])
  const [activeTab, setActiveTab] = useState<'sla' | 'team' | 'clients'>('sla')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [editingSections, setEditingSections] = useState<string | null>(null)
  const [selectedSections, setSelectedSections] = useState<string[]>([])

  const [slaForm, setSlaForm] = useState({
    sla_client_feedback_hours: 48,
    sla_script_days: 5,
    sla_content_days: 7,
    sla_onboard_to_live_days: 15,
  })

  const [inviteForm, setInviteForm] = useState({ email: '', name: '', brand_name: '', password: '' })
  const [showInviteForm, setShowInviteForm] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/settings`)
      const data = await res.json()
      setSettings(data.campaign)
      setTeam(data.team || [])
      setClients(data.clients || [])
      if (data.campaign) {
        setSlaForm({
          sla_client_feedback_hours: data.campaign.sla_client_feedback_hours || 48,
          sla_script_days: data.campaign.sla_script_days || 5,
          sla_content_days: data.campaign.sla_content_days || 7,
          sla_onboard_to_live_days: data.campaign.sla_onboard_to_live_days || 15,
        })
      }
    } catch {
      showToast('Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSaveSLA = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slaForm),
      })
      if (res.ok) { showToast('SLA settings saved'); fetchData() }
      else showToast('Failed to save settings', 'error')
    } catch { showToast('Failed to save settings', 'error') }
    finally { setSaving(false) }
  }

  const startEditSections = (member: TeamMember) => {
    setEditingSections(member.id)
    setSelectedSections(member.assigned_sections || [])
  }

  const saveSections = async (memberId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/team`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, assigned_sections: selectedSections }),
      })
      if (res.ok) {
        setTeam(prev => prev.map(m => m.id === memberId ? { ...m, assigned_sections: selectedSections } : m))
        showToast('Sections updated')
      }
      setEditingSections(null)
    } catch { showToast('Failed to update sections', 'error') }
  }

  const handleInviteClient = async () => {
    if (!inviteForm.email || !inviteForm.name || !inviteForm.brand_name || !inviteForm.password) {
      showToast('All fields are required', 'error'); return
    }
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/clients`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      if (res.ok) {
        showToast('Client invited'); setInviteForm({ email: '', name: '', brand_name: '', password: '' })
        setShowInviteForm(false); fetchData()
      } else { const d = await res.json(); showToast(d.error || 'Failed', 'error') }
    } catch { showToast('Failed', 'error') }
  }

  const handleRemoveClient = async (clientId: string) => {
    if (!confirm('Remove this client user?')) return
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/clients`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      })
      if (res.ok) { showToast('Client removed'); fetchData() }
    } catch { showToast('Failed', 'error') }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} />
    </div>
  )

  return (
    <div style={{ animation: 'fadeUp 0.3s ease both' }}>
      <button onClick={() => router.push(`/campaigns/${campaignId}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to overview
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="accent">Campaign</span> Settings</h1>
          <p className="page-subtitle">{settings ? `${settings.name} — ${settings.brand}` : 'Configure SLA, team, and client access'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(26,115,232,0.03)', border: '1.5px solid var(--blue-dim)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[{ id: 'sla', label: 'SLA Config', icon: Clock }, { id: 'team', label: 'Team', icon: Users }, { id: 'clients', label: 'Client Access', icon: Shield }].map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent', color: activeTab === tab.id ? 'var(--blue)' : 'var(--text-secondary)', boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s' }}>
              <Icon size={14} /> {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'sla' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: 'var(--blue)' }} /> SLA Configuration
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'sla_client_feedback_hours', label: 'Client Feedback', suffix: 'hours', desc: 'Time allowed for client to respond to scripts/content' },
              { key: 'sla_script_days', label: 'Script Delivery', suffix: 'days', desc: 'Time to deliver script after creator onboarded' },
              { key: 'sla_content_days', label: 'Content Delivery', suffix: 'days', desc: 'Time to deliver final content after script approved' },
              { key: 'sla_onboard_to_live_days', label: 'Onboard to Live', suffix: 'days', desc: 'Total time from creator onboarded to content live' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>{field.label}</label>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{field.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" value={slaForm[field.key as keyof typeof slaForm]}
                    onChange={e => setSlaForm(prev => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))}
                    className="input" style={{ width: 120 }} min={0} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{field.suffix}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <button onClick={handleSaveSLA} disabled={saving} className="btn btn-blue">
              <Save size={14} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} style={{ color: 'var(--blue)' }} /> Team Members
          </h3>
          {team.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No team members assigned yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {team.map(member => (
                <div key={member.id} style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 13, fontWeight: 700 }}>
                      {member.user?.name?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{member.user?.name || 'Unknown'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{member.user?.email || ''}</div>
                    </div>
                    <span className={`badge ${member.role === 'brand_solutions' ? 'badge-blue' : member.role === 'campaign_manager' ? 'badge-purple' : 'badge-gray'}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                    <button onClick={() => startEditSections(member)} className="btn btn-ghost btn-xs" style={{ fontSize: 11 }}>
                      <Plus size={12} /> Sections
                    </button>
                  </div>

                  {editingSections === member.id && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#FFF', border: '1.5px solid var(--border-2)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Sections</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {SECTIONS.map(s => {
                          const active = selectedSections.includes(s)
                          return (
                            <button key={s} onClick={() => setSelectedSections(prev => active ? prev.filter(x => x !== s) : [...prev, s])}
                              style={{ padding: '5px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, border: `1.5px solid ${active ? 'var(--blue)' : 'var(--border-2)'}`, background: active ? 'var(--blue-dim)' : 'transparent', color: active ? 'var(--blue)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}>
                              {s}
                            </button>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveSections(member.id)} className="btn btn-sm btn-blue"><Save size={12} /> Save</button>
                        <button onClick={() => setEditingSections(null)} className="btn btn-sm btn-ghost">Cancel</button>
                      </div>
                    </div>
                  )}

                  {editingSections !== member.id && member.assigned_sections?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {member.assigned_sections.map(s => (
                        <span key={s} style={{ padding: '2px 8px', borderRadius: 12, background: 'var(--blue-dim)', fontSize: 10, fontWeight: 600, color: 'var(--blue)' }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} style={{ color: 'var(--blue)' }} /> Client Users
            </h3>
            <button onClick={() => setShowInviteForm(!showInviteForm)} className="btn btn-sm btn-blue"><UserPlus size={14} /> Invite Client</button>
          </div>

          {showInviteForm && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 20, marginBottom: 20, border: '1.5px solid var(--border-1)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Invite Client User</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[{ key: 'email', label: 'Email', placeholder: 'client@brand.com', type: 'email' },
                  { key: 'name', label: 'Name', placeholder: 'John Doe', type: 'text' },
                  { key: 'brand_name', label: 'Brand Name', placeholder: 'Brand Name', type: 'text' },
                  { key: 'password', label: 'Password', placeholder: 'Set initial password', type: 'password' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type} value={(inviteForm as any)[f.key]} onChange={e => setInviteForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="input" placeholder={f.placeholder} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={handleInviteClient} className="btn btn-sm btn-blue"><Mail size={12} /> Send Invite</button>
                <button onClick={() => setShowInviteForm(false)} className="btn btn-sm btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {clients.length === 0 && !showInviteForm ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No client users invited yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clients.map(client => (
                <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-1)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: client.is_active ? 'var(--green-gradient)' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 13, fontWeight: 700 }}>
                    {client.name?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{client.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{client.email} · {client.brand_name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {client.invite_accepted_at ? (
                      <span className="badge badge-green"><CheckCircle2 size={10} /> Active</span>
                    ) : (
                      <span className="badge badge-orange"><Clock size={10} /> Pending</span>
                    )}
                    <button onClick={() => handleRemoveClient(client.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }} title="Remove client">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
