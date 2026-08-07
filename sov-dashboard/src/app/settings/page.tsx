'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import {
  Settings as SettingsIcon, Shield, Key, Globe, BookOpen, Bell,
  Plus, Trash2, X, Check, Loader2, AlertTriangle, CheckCircle, XCircle,
  Eye, EyeOff, RefreshCw,
  ToggleLeft, ToggleRight, Webhook, Mail, Zap,   FolderKanban,
} from 'lucide-react'
import { AMAZON_INDIA_CATEGORIES } from '@/lib/amazon-india'
import { useCampaignStore } from '@/lib/store'
import { canAccess, type ProjectRole, ALL_FEATURES, FEATURE_LABELS, type Feature } from '@/lib/permissions'

type SettingsTab = 'general' | 'projects' | 'access' | 'api-keys' | 'users' | 'backup' | 'alerts'

interface AppSettings {
  app_name?: string
  app_tagline?: string
  timezone?: string
  date_format?: string
  items_per_page?: number
  auto_refresh_interval?: number
  default_currency?: string
}

interface AlertRule {
  id: string
  campaign_id: string
  campaign_name?: string
  brand_name: string
  metric: 'sov_percent' | 'view_growth' | 'frequency_growth'
  threshold: number
  direction: 'above' | 'below'
  webhook_url: string | null
  email: string | null
  is_active: boolean
  last_triggered_at: string | null
  created_at: string
}

const SETTINGS_NAV: { id: SettingsTab; label: string; icon: React.ReactNode; feature?: string }[] = [
  { id: 'general', label: 'General', icon: <SettingsIcon size={15} /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban size={15} /> },
  { id: 'access', label: 'Access Control', icon: <Shield size={15} /> },
  { id: 'api-keys', label: 'API Keys', icon: <Key size={15} />, feature: 'api-keys' },
  { id: 'users', label: 'Client Logins', icon: <Globe size={15} />, feature: 'manage-access' },
  { id: 'backup', label: 'Backup & Sync', icon: <BookOpen size={15} />, feature: 'backup' },
  { id: 'alerts', label: 'Alerts', icon: <Bell size={15} /> },
]

const METRIC_LABELS: Record<string, string> = {
  sov_percent: 'SOV %',
  view_growth: 'View Growth',
  frequency_growth: 'Frequency Growth',
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  general: <SettingsIcon size={13} />,
  projects: <FolderKanban size={13} />,
  access: <Shield size={13} />,
  'api-keys': <Key size={13} />,
  users: <Globe size={13} />,
  backup: <BookOpen size={13} />,
  alerts: <Bell size={13} />,
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info' | 'warning'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  const bg = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : type === 'warning' ? 'var(--warning)' : 'var(--accent)'
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 20px', borderRadius: 'var(--radius-lg)', minWidth: 280,
      background: bg, color: 'var(--surface)', fontWeight: 600, fontSize: 'var(--fs-body)',
      boxShadow: 'var(--shadow-modal)',
      animation: 'fadeUp 0.25s ease',
    }}>
      {type === 'success' && <CheckCircle size={16} />}
      {type === 'error' && <XCircle size={16} />}
      {type === 'info' && <Zap size={16} />}
      {type === 'warning' && <AlertTriangle size={16} />}
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--surface)', padding: 2 }}><X size={14} /></button>
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('general')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => setToast({ msg, type }), [])

  const { getActiveProjectRole, getActivePagePermissions } = useCampaignStore()
  const activeRole = getActiveProjectRole()
  const activePermissions = getActivePagePermissions()

  // Filter tabs based on role + per-member overrides
  const visibleTabs = SETTINGS_NAV.filter(item => {
    if (!item.feature) return true
    return canAccess(activeRole, item.feature as any, activePermissions)
  })

  // Auto-switch to a permitted tab if current is restricted
  useEffect(() => {
    if (tab !== 'general' && !canAccess(activeRole, tab as any, activePermissions)) {
      const firstAllowed = visibleTabs[0]
      if (firstAllowed) setTab(firstAllowed.id)
    }
  }, [activeRole])

  // ═══ General Settings ═══
  const [appSettings, setAppSettings] = useState<AppSettings>({})
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)

  // ═══ API Keys ═══
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [apiKeyStats, setApiKeyStats] = useState<any>(null)
  const [showAddKey, setShowAddKey] = useState(false)
  const [newKey, setNewKey] = useState({ label: '', api_key: '', units_limit: '10000' })
  const [keyVisible, setKeyVisible] = useState<Record<string, boolean>>({})

  // ═══ Users ═══
  const [users, setUsers] = useState<any[]>([])
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'brand' as 'admin' | 'brand', campaign_id: '', brand_name: '' })

  // ═══ Access Control ═══
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [memberCampaignId, setMemberCampaignId] = useState('')
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<ProjectRole>('viewer')
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [createMode, setCreateMode] = useState<'existing' | 'new'>('existing')
  const [newUserPassword, setNewUserPassword] = useState('')

  // ═══ Backup ═══
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)

  // ═══ Projects ═══
  const [editingProject, setEditingProject] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ name: '', category: '', sub_category: '', description: '', status: 'active' })
  const [editCatId, setEditCatId] = useState('')
  const [editSubCatId, setEditSubCatId] = useState('')
  const [savingProject, setSavingProject] = useState(false)
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<any | null>(null)
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState('')
  const [deletingProject, setDeletingProject] = useState(false)

  // ═══ Alerts ═══
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [showAddAlert, setShowAddAlert] = useState(false)
  const [newAlert, setNewAlert] = useState({ campaign_id: '', brand_name: '', metric: 'sov_percent' as AlertRule['metric'], threshold: '10', direction: 'above' as 'above' | 'below', email: '', webhook_url: '' })

  // ── Fetch all data ──
  useEffect(() => {
    fetchSettings()
    fetchApiKeys()
    fetchUsers()
    fetchAlerts()
    fetchCampaigns()
    fetchSyncStatus()
    fetchAllUsers()
  }, [])

  const fetchSettings = async () => {
    setSettingsLoading(true)
    try {
      const r = await fetch('/api/settings')
      const d = await r.json()
      setAppSettings(d.settings || {})
    } catch {} finally { setSettingsLoading(false) }
  }

  const saveSettings = async () => {
    setSettingsSaving(true)
    try {
      const r = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appSettings),
      })
      if (!r.ok) throw new Error()
      showToast('Settings saved')
    } catch { showToast('Failed to save settings', 'error') } finally { setSettingsSaving(false) }
  }

  const fetchApiKeys = async () => {
    try {
      const r = await fetch('/api/api-keys')
      const d = await r.json()
      setApiKeys(d.keys ?? [])
      setApiKeyStats(d.stats ?? null)
    } catch {}
  }

  const addApiKey = async () => {
    if (!newKey.api_key.trim()) return showToast('API key required', 'error')
    try {
      const r = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newKey.label, api_key: newKey.api_key, units_limit: parseInt(newKey.units_limit) || 10000 }),
      })
      if (!r.ok) { const d = await r.json(); return showToast(d.error || 'Failed', 'error') }
      setShowAddKey(false); setNewKey({ label: '', api_key: '', units_limit: '10000' })
      await fetchApiKeys()
      showToast('API key added')
    } catch { showToast('Failed', 'error') }
  }

  const toggleKey = async (id: string) => {
    try { await fetch('/api/api-keys', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'toggle' }) }); await fetchApiKeys() } catch {}
  }

  const resetKey = async (id: string) => {
    try { await fetch('/api/api-keys', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'reset' }) }); await fetchApiKeys(); showToast('Quota reset') } catch {}
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Remove this API key?')) return
    try { await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' }); await fetchApiKeys(); showToast('Key removed') } catch {}
  }

  const fetchUsers = async () => {
    try { const r = await fetch('/api/users'); const d = await r.json(); setUsers(d.users ?? []) } catch {}
  }

  const createUser = async () => {
    if (!newUser.email.trim() || !newUser.password.trim()) return showToast('Email and password required', 'error')
    try {
      const r = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed', 'error')
      setNewUser({ email: '', password: '', role: 'brand', campaign_id: '', brand_name: '' })
      await fetchUsers()
      showToast('User created')
    } catch { showToast('Failed', 'error') }
  }

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Delete "${email}"?`)) return
    try { await fetch(`/api/users?id=${id}`, { method: 'DELETE' }); await fetchUsers(); showToast('User deleted') } catch { showToast('Failed', 'error') }
  }

  const fetchCampaigns = async () => {
    try { const r = await fetch('/api/campaigns'); const d = await r.json(); setCampaigns(d.campaigns ?? []) } catch {}
  }

  const openEditProject = (p: any) => {
    const cat = AMAZON_INDIA_CATEGORIES.find(c => c.name === p.category)
    const sub = cat?.subCategories.find(s => s.name === p.sub_category)
    setEditForm({ name: p.name, category: p.category || '', sub_category: p.sub_category || '', description: p.description || '', status: p.status || 'active' })
    setEditCatId(cat?.id || '')
    setEditSubCatId(sub?.id || '')
    setEditingProject(p)
  }

  const saveProject = async () => {
    if (!editingProject || !editForm.name.trim()) return showToast('Project name required', 'error')
    setSavingProject(true)
    const catName = editCatId ? AMAZON_INDIA_CATEGORIES.find(c => c.id === editCatId)?.name || editForm.category : editForm.category
    const subName = editSubCatId && editCatId ? AMAZON_INDIA_CATEGORIES.find(c => c.id === editCatId)?.subCategories.find(s => s.id === editSubCatId)?.name || editForm.sub_category : editForm.sub_category
    try {
      const r = await fetch(`/api/campaigns/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, category: catName, sub_category: subName }),
      })
      if (!r.ok) throw new Error()
      setEditingProject(null); await fetchCampaigns(); showToast('Project updated')
    } catch { showToast('Failed to save', 'error') } finally { setSavingProject(false) }
  }

  const confirmDeleteProject = async () => {
    if (!deleteProjectTarget) return
    if (deleteProjectConfirm !== deleteProjectTarget.name) return showToast('Type the project name to confirm', 'error')
    setDeletingProject(true)
    try {
      await fetch(`/api/campaigns/${deleteProjectTarget.id}`, { method: 'DELETE' })
      setDeleteProjectTarget(null); setDeleteProjectConfirm(''); await fetchCampaigns(); showToast('Project deleted')
    } catch { showToast('Delete failed', 'error') } finally { setDeletingProject(false) }
  }

  const fetchMembers = async (campaignId: string) => {
    if (!campaignId) { setMembers([]); return }
    try { const r = await fetch(`/api/workspace/members?campaign_id=${campaignId}`); const d = await r.json(); setMembers(d.members ?? []) } catch {}
  }

  const fetchAllMembers = async () => {
    try { const r = await fetch('/api/workspace/members?campaign_id=all'); const d = await r.json(); setMembers(d.members ?? []) } catch {}
  }

  const fetchAllUsers = async () => {
    try { const r = await fetch('/api/users'); const d = await r.json(); setAllUsers(d.users ?? []) } catch {}
  }

  const addMember = async () => {
    if (!memberCampaignId) return showToast('Select a project', 'error')

    if (createMode === 'new') {
      if (!newMemberEmail.trim() || !newUserPassword.trim()) return showToast('Email and password required', 'error')
      try {
        const r = await fetch('/api/users', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newMemberEmail, password: newUserPassword, role: 'brand' }),
        })
        const d = await r.json()
        if (!r.ok) return showToast(d.error || 'Failed to create user', 'error')
        await fetchAllUsers()
        const newUser = allUsers.find((u: any) => u.email === newMemberEmail) || { id: d.user_id }
        const r2 = await fetch('/api/workspace/members', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_id: memberCampaignId, user_id: newUser.id, role: newMemberRole }),
        })
        if (!r2.ok) { const d2 = await r2.json(); return showToast(d2.error || 'User created but failed to add to project', 'error') }
      } catch { showToast('Failed', 'error') }
    } else {
      if (!newMemberEmail.trim()) return showToast('Select a user', 'error')
      const user = allUsers.find((u: any) => u.email === newMemberEmail)
      if (!user) return showToast('User not found', 'error')
      try {
        const r = await fetch('/api/workspace/members', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_id: memberCampaignId, user_id: user.id, role: newMemberRole }),
        })
        if (!r.ok) { const d = await r.json(); return showToast(d.error || 'Failed', 'error') }
      } catch { showToast('Failed', 'error') }
    }

    setShowAddMember(false); setNewMemberEmail(''); setNewMemberRole('viewer'); setNewUserPassword(''); setCreateMode('existing')
    await fetchMembers(memberCampaignId)
    showToast('Member added')
  }

  const updateMemberRole = async (userId: string, newRole: ProjectRole) => {
    if (!memberCampaignId) return
    try {
      await fetch('/api/workspace/members', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: memberCampaignId, user_id: userId, role: newRole }),
      })
      await fetchMembers(memberCampaignId)
      showToast('Role updated')
    } catch { showToast('Failed', 'error') }
  }

  const toggleMemberPermission = async (userId: string, feature: Feature, currentValue: boolean) => {
    if (!memberCampaignId) return
    const member = members.find((m: any) => m.user_id === userId)
    if (!member || member.role === 'owner') return

    const current = member.page_permissions || {}
    const updated = { ...current, [feature]: !currentValue }

    setSavingPermissions(true)
    try {
      await fetch('/api/workspace/members', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: memberCampaignId, user_id: userId, page_permissions: updated }),
      })
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, page_permissions: updated } : m))
    } catch { showToast('Failed to update permissions', 'error') }
    finally { setSavingPermissions(false) }
  }

  const getMemberEffectiveAccess = (member: any): Record<string, boolean> => {
    const roleDefaults = ALL_FEATURES.reduce((acc, f) => {
      acc[f] = canAccess(member.role, f)
      return acc
    }, {} as Record<string, boolean>)

    if (member.page_permissions) {
      return { ...roleDefaults, ...member.page_permissions }
    }
    return roleDefaults
  }

  const fetchSyncStatus = async () => {
    try { const r = await fetch('/api/sync'); const d = await r.json(); setSyncStatus(d) } catch {}
  }

  const runSync = async () => {
    setSyncing(true)
    try { const r = await fetch('/api/sync', { method: 'POST' }); const d = await r.json(); showToast(d.message || 'Sync completed'); await fetchSyncStatus() } catch { showToast('Sync failed', 'error') } finally { setSyncing(false) }
  }

  const fetchAlerts = async () => {
    try { const r = await fetch('/api/alerts'); const d = await r.json(); setAlertRules(d.rules ?? []) } catch {}
  }

  const addAlert = async () => {
    if (!newAlert.campaign_id || !newAlert.threshold) return showToast('Campaign and threshold required', 'error')
    try {
      const r = await fetch('/api/alerts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newAlert, threshold: parseFloat(newAlert.threshold) }),
      })
      if (!r.ok) throw new Error()
      setShowAddAlert(false); setNewAlert({ campaign_id: '', brand_name: '', metric: 'sov_percent', threshold: '10', direction: 'above', email: '', webhook_url: '' })
      await fetchAlerts()
      showToast('Alert rule created')
    } catch { showToast('Failed', 'error') }
  }

  const toggleAlert = async (id: string, is_active: boolean) => {
    try { await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: !is_active }) }); await fetchAlerts() } catch {}
  }

  const deleteAlert = async (id: string) => {
    if (!confirm('Delete this alert rule?')) return
    try { await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' }); await fetchAlerts(); showToast('Alert deleted') } catch { showToast('Failed', 'error') }
  }

  const sectionTitle = (label: string) => (
    <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>
      {TAB_ICONS[tab]} {label}
    </div>
  )

  const sectionDesc = (text: string) => (
    <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 20, fontWeight: 500 }}>{text}</p>
  )

  return (
    <div className="anim-fade-up">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your workspace, manage access, and customize alerts</p>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div style={{ display: 'grid', gridTemplateColumns: 'var(--sidebar-w) 1fr', gap: 20, alignItems: 'start' }}>
        {/* ── Settings Nav ── */}
        <div className="card" style={{ padding: 8, position: 'sticky', top: 20 }}>
          {visibleTabs.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 12px', border: 'none',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'inherit',
                background: tab === item.id ? 'var(--warning-dim)' : 'transparent',
                color: tab === item.id ? 'var(--brand-amazon)' : 'var(--text-secondary)',
                fontWeight: tab === item.id ? 700 : 500,
                fontSize: 'var(--fs-sm)', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (tab !== item.id) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-bright)' } }}
              onMouseLeave={e => { if (tab !== item.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* ── Active Section ── */}
        <div>
          {/* ═══════════════════════════════════════
              GENERAL SETTINGS
          ═══════════════════════════════════════ */}
          {tab === 'general' && (
            <div className="card">
              {sectionTitle('General Settings')}
              {sectionDesc('Configure global application preferences and defaults')}

              {settingsLoading ? (
                <div style={{ textAlign: 'center', padding: 32 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} /></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label className="field-label">Application Name</label>
                      <input className="input" value={appSettings.app_name || ''} onChange={e => setAppSettings(p => ({ ...p, app_name: e.target.value }))} placeholder="SOV Panel" style={{ height: 38 }} />
                    </div>
                    <div>
                      <label className="field-label">Tagline</label>
                      <input className="input" value={appSettings.app_tagline || ''} onChange={e => setAppSettings(p => ({ ...p, app_tagline: e.target.value }))} placeholder="YouTube Share-of-Voice Analytics" style={{ height: 38 }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div>
                      <label className="field-label">Timezone</label>
                      <select className="input" value={appSettings.timezone || 'UTC'} onChange={e => setAppSettings(p => ({ ...p, timezone: e.target.value }))} style={{ height: 38 }}>
                        {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'].map(tz => (
                          <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Date Format</label>
                      <select className="input" value={appSettings.date_format || 'MMM DD, YYYY'} onChange={e => setAppSettings(p => ({ ...p, date_format: e.target.value }))} style={{ height: 38 }}>
                        <option value="MMM DD, YYYY">Jan 15, 2026</option>
                        <option value="DD/MM/YYYY">15/01/2026</option>
                        <option value="YYYY-MM-DD">2026-01-15</option>
                        <option value="MM/DD/YYYY">01/15/2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Items Per Page</label>
                      <select className="input" value={appSettings.items_per_page || 25} onChange={e => setAppSettings(p => ({ ...p, items_per_page: parseInt(e.target.value) }))} style={{ height: 38 }}>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ paddingTop: 12, borderTop: '1.5px solid var(--accent-dim)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-blue btn-sm" onClick={saveSettings} disabled={settingsSaving}>
                      {settingsSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                      Save Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════
              ACCESS CONTROL
          ═══════════════════════════════════════ */}
          {tab === 'access' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                {sectionTitle('Access Control')}
                {sectionDesc('Manage project-level membership and role-based permissions')}

                <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, maxWidth: 320 }}>
                    <label className="field-label">Select Project</label>
                    <select className="input" value={memberCampaignId} onChange={e => { const v = e.target.value; setMemberCampaignId(v); if (v === 'all') fetchAllMembers(); else if (v) fetchMembers(v); else setMembers([]) }} style={{ height: 38 }}>
                      <option value="all">All Projects</option>
                      <option value="">-- Select Project --</option>
                      {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {memberCampaignId && memberCampaignId !== 'all' && (
                    <button className="btn btn-blue btn-sm" onClick={() => setShowAddMember(!showAddMember)}>
                      <Plus size={12} /> Add Member
                    </button>
                  )}
                </div>

                {/* Add Member Form */}
                {showAddMember && memberCampaignId && memberCampaignId !== 'all' && (
                  <div style={{ marginBottom: 16, padding: 14, borderRadius: 'var(--radius-md)', background: 'var(--accent-dim)', border: '1.5px solid var(--accent-dim)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <button onClick={() => setCreateMode('existing')} style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-label)', fontWeight: 600, border: '1.5px solid var(--accent-dim)', background: createMode === 'existing' ? 'var(--accent)' : 'var(--surface)', color: createMode === 'existing' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>Existing User</button>
                      <button onClick={() => setCreateMode('new')} style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-label)', fontWeight: 600, border: '1.5px solid var(--accent-dim)', background: createMode === 'new' ? 'var(--accent)' : 'var(--surface)', color: createMode === 'new' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>New User</button>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label className="field-label">Email</label>
                        {createMode === 'existing' ? (
                          <select className="input" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} style={{ height: 36 }}>
                            <option value="">-- Select User --</option>
                            {allUsers.filter((u: any) => !members.some((m: any) => m.user_id === u.id)).map((u: any) => (
                              <option key={u.id} value={u.email}>{u.email}</option>
                            ))}
                          </select>
                        ) : (
                          <input className="input" type="email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} placeholder="user@example.com" style={{ height: 36 }} />
                        )}
                      </div>
                      {createMode === 'new' && (
                        <div style={{ flex: 1 }}>
                          <label className="field-label">Password</label>
                          <input className="input" type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Min 6 characters" style={{ height: 36 }} />
                        </div>
                      )}
                      <div style={{ width: 130 }}>
                        <label className="field-label">Role</label>
                        <select className="input" value={newMemberRole} onChange={e => setNewMemberRole(e.target.value as ProjectRole)} style={{ height: 36 }}>
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <button className="btn btn-blue btn-sm" onClick={addMember}><Check size={12} /> Add</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddMember(false); setNewMemberEmail(''); setNewUserPassword(''); setCreateMode('existing') }}>Cancel</button>
                    </div>
                  </div>
                )}

                {memberCampaignId ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Access</th>
                          <th>Joined</th>
                          <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--neutral-300)' }}>No members in this project.</td></tr>
                        ) : members.map((m: any) => {
                          const access = getMemberEffectiveAccess(m)
                          const accessCount = Object.values(access).filter(Boolean).length
                          const totalFeatures = ALL_FEATURES.length
                          const isExpanded = expandedMember === m.user_id
                          const isOwner = m.role === 'owner'

                          return (
                            <Fragment key={m.user_id}>
                              <tr>
                                <td style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{m.email}</td>
                                <td>
                                  <select value={m.role} onChange={e => updateMemberRole(m.user_id, e.target.value as ProjectRole)} style={{
                                    padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-label)', fontWeight: 700,
                                    border: '1.5px solid var(--accent-dim)', background: 'var(--surface)', cursor: isOwner ? 'default' : 'pointer', fontFamily: 'inherit',
                                    color: m.role === 'owner' ? 'var(--success)' : m.role === 'admin' ? 'var(--accent)' : m.role === 'editor' ? 'var(--info)' : 'var(--text-secondary)',
                                  }} disabled={isOwner}>
                                    <option value="owner" disabled>Owner</option>
                                    <option value="admin">Admin</option>
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                  </select>
                                </td>
                                <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                                  {isOwner ? 'Everything' : `${accessCount}/${totalFeatures} pages`}
                                </td>
                                <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>{new Date(m.joined_at).toLocaleDateString()}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                    {!isOwner && (
                                      <button onClick={() => setExpandedMember(isExpanded ? null : m.user_id)} className="btn btn-xs btn-ghost" title="Customize access" style={{ color: 'var(--accent)' }}>
                                        <Shield size={11} />
                                      </button>
                                    )}
                                    {!isOwner && (
                                      <button onClick={() => {
                                        if (!confirm(`Remove ${m.email}?`)) return
                                        fetch(`/api/workspace/members?campaign_id=${memberCampaignId}&user_id=${m.user_id}`, { method: 'DELETE' })
                                          .then(() => { fetchMembers(memberCampaignId); showToast('Member removed') })
                                          .catch(() => showToast('Failed', 'error'))
                                      }} style={{ background: 'var(--danger-dim)', border: '1.5px solid var(--danger-dim)', borderRadius: 'var(--radius-sm)', padding: '4px 7px', cursor: 'pointer', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center' }}>
                                        <Trash2 size={11} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && !isOwner && (
                                <tr key={`${m.user_id}-perms`}>
                                  <td colSpan={5} style={{ padding: '8px 16px 16px', background: 'var(--bg-secondary, var(--accent-dim))' }}>
                                    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                      Page Access for {m.email}
                                      {m.page_permissions && <span style={{ marginLeft: 8, color: 'var(--warning)', fontWeight: 600 }}>(custom overrides active)</span>}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
                                      {ALL_FEATURES.map(feature => {
                                        const isChecked = access[feature]
                                        const hasOverride = m.page_permissions && feature in m.page_permissions
                                        return (
                                          <label key={feature} style={{
                                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                                            background: hasOverride ? 'var(--warning-dim)' : isChecked ? 'var(--success-dim)' : 'var(--danger-dim)',
                                            border: `1.5px solid ${hasOverride ? 'var(--warning-border)' : isChecked ? 'var(--success-border)' : 'var(--danger-border)'}`,
                                            cursor: 'pointer', fontSize: 'var(--fs-sm)', fontWeight: 500, color: 'var(--text-bright)',
                                          }}>
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              disabled={savingPermissions}
                                              onChange={() => toggleMemberPermission(m.user_id, feature, isChecked)}
                                              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                                            />
                                            <span>{FEATURE_LABELS[feature]}</span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                    <div style={{ marginTop: 8, fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>
                                      Checked = granted, unchecked = denied. Overrides role defaults. Yellow = custom override active.
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 'var(--fs-body)' }}>Select a project to manage its members.</div>
                )}
              </div>

              {/* Permissions Legend */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1.5px solid var(--accent-dim)' }}>
                  <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-bright)' }}>Role Permissions</span>
                  <span style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)', marginLeft: 8, fontWeight: 500 }}>Default access per role (owner can override per member)</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table" style={{ minWidth: 580 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 200 }}>Page / Feature</th>
                        <th style={{ textAlign: 'center' }}>Owner</th>
                        <th style={{ textAlign: 'center' }}>Admin</th>
                        <th style={{ textAlign: 'center' }}>Editor</th>
                        <th style={{ textAlign: 'center' }}>Viewer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_FEATURES.map(feature => (
                        <tr key={feature}>
                          <td style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-bright)' }}>{FEATURE_LABELS[feature]}</td>
                          {(['owner', 'admin', 'editor', 'viewer'] as ProjectRole[]).map(role => (
                            <td key={role} style={{ textAlign: 'center' }}>
                              {canAccess(role, feature)
                                ? <Check size={13} style={{ color: 'var(--success)' }} />
                                : <X size={13} style={{ color: 'var(--neutral-300)' }} />
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              API KEYS
          ═══════════════════════════════════════ */}
          {tab === 'api-keys' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Stats strip */}
              {apiKeyStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Total Keys', value: apiKeyStats.total, color: '#1A73E8' },
                    { label: 'Active', value: apiKeyStats.active, color: '#00C853' },
                    { label: 'Used Units', value: (apiKeyStats.total_used || 0).toLocaleString(), color: '#7C3AED' },
                    { label: 'Capacity', value: (apiKeyStats.total_capacity || 0).toLocaleString(), color: '#FF6D00' },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 'var(--fs-h1)', fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                      <div style={{ fontSize: 'var(--fs-label)', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1.5px solid var(--accent-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-bright)' }}>API Keys ({apiKeys.length})</span>
                  <button className="btn btn-blue btn-sm" onClick={() => setShowAddKey(true)}><Plus size={12} /> Add Key</button>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Key</th>
                        <th>Status</th>
                        <th>Usage</th>
                        <th>Bucket</th>
                        <th style={{ width: 100, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiKeys.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--neutral-300)' }}>No API keys configured.</td></tr>
                      ) : apiKeys.map((k: any) => (
                        <tr key={k.id}>
                          <td style={{ fontWeight: 600 }}>{k.label}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
                            {keyVisible[k.id] ? k.api_key_masked : k.api_key_masked.slice(0, 12) + '••••••••'}
                            <button onClick={() => setKeyVisible(p => ({ ...p, [k.id]: !p[k.id] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: 6, verticalAlign: 'middle' }}>
                              {keyVisible[k.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </td>
                          <td>
                            <span className={`badge ${k.is_active ? 'badge-green' : 'badge-gray'}`}>
                              {k.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ minWidth: 140 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--border-2)', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(k.usage_pct, 100)}%`, height: '100%', borderRadius: 99, background: k.usage_pct > 80 ? '#FF2D55' : k.usage_pct > 60 ? '#FF6D00' : '#00C853' }} />
                              </div>
                              <span style={{ fontSize: 'var(--fs-label)', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                                {k.usage_pct}%
                              </span>
                            </div>
                          </td>
                          <td style={{ fontSize: 'var(--fs-sm)' }}>Bucket {k.bucket}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button onClick={() => toggleKey(k.id)} className="btn btn-xs btn-ghost" title={k.is_active ? 'Disable' : 'Enable'}>
                                {k.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                              </button>
                              <button onClick={() => resetKey(k.id)} className="btn btn-xs btn-ghost" title="Reset quota">
                                <RefreshCw size={11} />
                              </button>
                              <button onClick={() => deleteKey(k.id)} className="btn btn-xs btn-danger">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Key Modal */}
              {showAddKey && (
                <div className="modal-scrim">
                  <div className="modal-panel" style={{ maxWidth: 460 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--brand-amazon), #FF9F43, transparent)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }} />
                    <button onClick={() => setShowAddKey(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--accent-dim)', border: '1.5px solid var(--accent-dim)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
                    <h3 style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-bright)', margin: '0 0 16px' }}>Add YouTube API Key</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="field-label">Label</label>
                        <input className="input" value={newKey.label} onChange={e => setNewKey(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Main Key Bucket 1" style={{ height: 38 }} />
                      </div>
                      <div>
                        <label className="field-label">API Key</label>
                        <input className="input" value={newKey.api_key} onChange={e => setNewKey(p => ({ ...p, api_key: e.target.value }))} placeholder="AIza..." style={{ height: 38, fontFamily: 'var(--font-mono)' }} />
                      </div>
                      <div>
                        <label className="field-label">Daily Quota Limit</label>
                        <input className="input" type="number" value={newKey.units_limit} onChange={e => setNewKey(p => ({ ...p, units_limit: e.target.value }))} style={{ height: 38 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                      <button className="btn btn-blue btn-sm" onClick={addApiKey} style={{ flex: 1 }}><Check size={13} /> Add Key</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowAddKey(false)} style={{ flex: 1 }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════
              CLIENT LOGINS
          ═══════════════════════════════════════ */}
          {tab === 'users' && (
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
              <div className="card" style={{ padding: 18 }}>
                {sectionTitle('Create Login')}
                {sectionDesc('Register a new dashboard user account')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label className="field-label">Email</label>
                    <input className="input" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="user@company.com" style={{ height: 36 }} />
                  </div>
                  <div>
                    <label className="field-label">Password</label>
                    <input className="input" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" style={{ height: 36 }} />
                  </div>
                  <div>
                    <label className="field-label">Role</label>
                    <select className="input" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as 'admin' | 'brand' }))} style={{ height: 36 }}>
                      <option value="brand">Brand Client (restricted)</option>
                      <option value="admin">Administrator (full access)</option>
                    </select>
                  </div>
                  <button className="btn btn-blue btn-sm" onClick={createUser} style={{ width: '100%' }}><Plus size={12} /> Register Account</button>
                </div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1.5px solid var(--accent-dim)' }}>
                  <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-bright)' }}>Registered Users ({users.length})</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Scope</th>
                        <th style={{ width: 60, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--neutral-300)' }}>No users registered.</td></tr>
                      ) : users.map((u: any) => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{u.email}</td>
                          <td><span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-purple'}`}>{u.role}</span></td>
                          <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>{u.campaign_name || u.brand_name || 'All'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button onClick={() => deleteUser(u.id, u.email)} className="btn btn-xs btn-danger"><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              BACKUP & SYNC
          ═══════════════════════════════════════ */}
          {tab === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                {sectionTitle('Backup & Sync')}
                {sectionDesc('Sync campaign data to Google Sheets for external backup and reporting')}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: syncStatus?.configured ? 'var(--success-dim)' : 'var(--warning-dim)', border: `1.5px solid ${syncStatus?.configured ? 'var(--success-border)' : 'var(--warning-border)'}` }}>
                    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: syncStatus?.configured ? 'var(--success)' : 'var(--warning)', marginBottom: 4 }}>
                      {syncStatus?.configured ? 'Connected' : 'Not Configured'}
                    </div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                      {syncStatus?.configured ? 'Google Sheets integration is active' : 'Set up GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY'}
                    </div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--accent-dim)', border: '1.5px solid var(--accent-dim)' }}>
                    <div style={{ fontSize: 'var(--fs-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', marginBottom: 4 }}>Last Sync</div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                      {syncStatus?.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString() : 'Never'}
                    </div>
                  </div>
                </div>

                <button className="btn btn-blue btn-sm" onClick={runSync} disabled={syncing || !syncStatus?.configured}>
                  {syncing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>

              <div className="card">
                <div style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>Data Export</div>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 500 }}>Export raw data for offline analysis</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-ghost btn-sm" disabled>Export Campaigns (CSV)</button>
                  <button className="btn btn-ghost btn-sm" disabled>Export Keywords (CSV)</button>
                  <button className="btn btn-ghost btn-sm" disabled>Export Rankings (CSV)</button>
                </div>
                <div style={{ fontSize: 'var(--fs-label)', color: 'var(--text-muted)', marginTop: 10, fontWeight: 500 }}>CSV export coming soon</div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              PROJECTS
          ═══════════════════════════════════════ */}
          {tab === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1.5px solid var(--accent-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-bright)' }}>All Projects</span>
                    <span style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)', marginLeft: 8, fontWeight: 500 }}>{campaigns.length} total</span>
                  </div>
                </div>
                <div className="table-wrap" style={{ maxHeight: 500, overflowY: 'auto' }}>
                  <table className="data-table" style={{ position: 'relative' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2 }}>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Subcategory</th>
                        <th>Keywords</th>
                        <th>Status</th>
                        <th style={{ width: 110, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--neutral-300)' }}>No projects yet.</td></tr>
                      ) : campaigns.map((p: any) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{p.name}</td>
                          <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>{p.category || <span style={{ color: 'var(--neutral-300)' }}>—</span>}</td>
                          <td style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>{p.sub_category || <span style={{ color: 'var(--neutral-300)' }}>—</span>}</td>
                          <td style={{ fontSize: 'var(--fs-sm)' }}>{p.keyword_count ?? 0}</td>
                          <td><span className={`badge ${p.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{p.status}</span></td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button onClick={() => openEditProject(p)} className="btn btn-xs btn-ghost" title="Edit">
                                <SettingsIcon size={11} />
                              </button>
                              <button onClick={() => setDeleteProjectTarget(p)} className="btn btn-xs btn-danger" title="Delete">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit Project Modal */}
              {editingProject && (
                <div className="modal-scrim">
                  <div className="modal-panel" style={{ maxWidth: 520 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--brand-amazon), #FF9F43, transparent)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }} />
                    <button onClick={() => setEditingProject(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--accent-dim)', border: '1.5px solid var(--accent-dim)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
                    <h3 style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-bright)', margin: '0 0 16px' }}>Edit Project</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="field-label">Project Name</label>
                        <input className="input" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ height: 38 }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="field-label">Category</label>
                          <select value={editCatId} onChange={e => { setEditCatId(e.target.value); setEditSubCatId('') }} style={{ height: 38, fontSize: 'var(--fs-body)', padding: '6px 12px', border: '1.5px solid var(--accent-dim)', borderRadius: 'var(--radius-md)', background: 'var(--surface)', fontFamily: 'inherit', color: 'var(--text-bright)', cursor: 'pointer', width: '100%' }}>
                            <option value="">— None —</option>
                            {AMAZON_INDIA_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="field-label">Subcategory</label>
                          <select value={editSubCatId} onChange={e => setEditSubCatId(e.target.value)} style={{ height: 38, fontSize: 'var(--fs-body)', padding: '6px 12px', border: '1.5px solid var(--accent-dim)', borderRadius: 'var(--radius-md)', background: 'var(--surface)', fontFamily: 'inherit', color: 'var(--text-bright)', cursor: 'pointer', width: '100%' }} disabled={!editCatId}>
                            <option value="">— None —</option>
                            {AMAZON_INDIA_CATEGORIES.find(c => c.id === editCatId)?.subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="field-label">Description</label>
                        <textarea className="input" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ resize: 'none' }} />
                      </div>
                      <div>
                        <label className="field-label">Status</label>
                        <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={{ height: 38, fontSize: 'var(--fs-body)', padding: '6px 12px', border: '1.5px solid var(--accent-dim)', borderRadius: 'var(--radius-md)', background: 'var(--surface)', fontFamily: 'inherit', color: 'var(--text-bright)', cursor: 'pointer', width: '100%' }}>
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                      <button className="btn btn-blue btn-sm" onClick={saveProject} disabled={savingProject} style={{ flex: 1 }}>
                        {savingProject ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />} Save Changes
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingProject(null)} style={{ flex: 1 }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Project Confirmation */}
              {deleteProjectTarget && (
                <div className="modal-scrim">
                  <div className="modal-panel" style={{ maxWidth: 420 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--danger-dim)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={18} /></div>
                      <div><h3 style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-bright)', margin: 0 }}>Delete Project</h3><p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', margin: '2px 0 0' }}>This permanently removes all data including keywords and scrape results</p></div>
                    </div>
                    <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                      Type <strong style={{ color: 'var(--danger)' }}>{deleteProjectTarget.name}</strong> below to confirm.
                    </p>
                    <input className="input" value={deleteProjectConfirm} onChange={e => setDeleteProjectConfirm(e.target.value)} placeholder={deleteProjectTarget.name} style={{ height: 38, marginBottom: 12 }} />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-danger btn-sm" onClick={confirmDeleteProject} disabled={deleteProjectConfirm !== deleteProjectTarget.name || deletingProject} style={{ flex: 1, opacity: deleteProjectConfirm !== deleteProjectTarget.name ? 0.5 : 1 }}>
                        {deletingProject ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />} Delete Permanently
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setDeleteProjectTarget(null); setDeleteProjectConfirm('') }} style={{ flex: 1 }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════
              ALERTS
          ═══════════════════════════════════════ */}
          {tab === 'alerts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1.5px solid var(--accent-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-bright)' }}>Alert Rules</span>
                    <span style={{ fontSize: 'var(--fs-label)', color: 'var(--text-secondary)', marginLeft: 8, fontWeight: 500 }}>Get notified when metrics cross thresholds</span>
                  </div>
                  <button className="btn btn-blue btn-sm" onClick={() => setShowAddAlert(true)}><Plus size={12} /> New Alert</button>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Brand</th>
                        <th>Metric</th>
                        <th>Condition</th>
                        <th>Notify</th>
                        <th>Status</th>
                        <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertRules.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--neutral-300)' }}>No alert rules configured.</td></tr>
                      ) : alertRules.map(rule => (
                        <tr key={rule.id}>
                          <td style={{ fontWeight: 600 }}>{rule.campaign_name || rule.campaign_id.slice(0, 8)}</td>
                          <td style={{ fontSize: 'var(--fs-sm)' }}>{rule.brand_name || 'All'}</td>
                          <td><span className="badge badge-blue">{METRIC_LABELS[rule.metric] || rule.metric}</span></td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
                            {rule.direction === 'above' ? '>' : '<'} {rule.threshold}{rule.metric === 'sov_percent' ? '%' : ''}
                          </td>
                          <td style={{ fontSize: 'var(--fs-sm)' }}>
                            {rule.email && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={10} /> {rule.email}</span>}
                            {rule.webhook_url && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)', fontSize: 'var(--fs-micro)', marginTop: 2 }}><Webhook size={10} /> Webhook</span>}
                          </td>
                          <td>
                            <button onClick={() => toggleAlert(rule.id, rule.is_active)} className={`badge ${rule.is_active ? 'badge-green' : 'badge-gray'}`} style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
                              {rule.is_active ? 'Active' : 'Disabled'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button onClick={() => deleteAlert(rule.id)} className="btn btn-xs btn-danger"><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Alert Modal */}
              {showAddAlert && (
                <div className="modal-scrim">
                  <div className="modal-panel" style={{ maxWidth: 480 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--brand-amazon), #FF9F43, transparent)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }} />
                    <button onClick={() => setShowAddAlert(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--accent-dim)', border: '1.5px solid var(--accent-dim)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
                    <h3 style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: 'var(--text-bright)', margin: '0 0 16px' }}>New Alert Rule</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="field-label">Campaign</label>
                        <select className="input" value={newAlert.campaign_id} onChange={e => setNewAlert(p => ({ ...p, campaign_id: e.target.value }))} style={{ height: 38 }}>
                          <option value="">-- Select Campaign --</option>
                          {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="field-label">Metric</label>
                          <select className="input" value={newAlert.metric} onChange={e => setNewAlert(p => ({ ...p, metric: e.target.value as AlertRule['metric'] }))} style={{ height: 38 }}>
                            <option value="sov_percent">SOV %</option>
                            <option value="view_growth">View Growth</option>
                            <option value="frequency_growth">Frequency Growth</option>
                          </select>
                        </div>
                        <div>
                          <label className="field-label">Direction</label>
                          <select className="input" value={newAlert.direction} onChange={e => setNewAlert(p => ({ ...p, direction: e.target.value as 'above' | 'below' }))} style={{ height: 38 }}>
                            <option value="above">Above threshold</option>
                            <option value="below">Below threshold</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="field-label">Threshold</label>
                          <input className="input" type="number" value={newAlert.threshold} onChange={e => setNewAlert(p => ({ ...p, threshold: e.target.value }))} style={{ height: 38 }} />
                        </div>
                        <div>
                          <label className="field-label">Brand (optional)</label>
                          <input className="input" value={newAlert.brand_name} onChange={e => setNewAlert(p => ({ ...p, brand_name: e.target.value }))} placeholder="e.g. Atomberg" style={{ height: 38 }} />
                        </div>
                      </div>
                      <div>
                        <label className="field-label">Email Notification</label>
                        <input className="input" type="email" value={newAlert.email} onChange={e => setNewAlert(p => ({ ...p, email: e.target.value }))} placeholder="you@company.com" style={{ height: 38 }} />
                      </div>
                      <div>
                        <label className="field-label">Webhook URL (optional)</label>
                        <input className="input" value={newAlert.webhook_url} onChange={e => setNewAlert(p => ({ ...p, webhook_url: e.target.value }))} placeholder="https://hooks.slack.com/..." style={{ height: 38 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                      <button className="btn btn-blue btn-sm" onClick={addAlert} style={{ flex: 1 }}><Bell size={13} /> Create Alert</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowAddAlert(false)} style={{ flex: 1 }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
