'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Users, Clock, AlertTriangle, CheckCircle2,
  TrendingUp, BarChart3, Activity, Filter
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString('en-IN')
}

interface EmployeeDetail {
  user_id: string
  name: string
  email: string
  role: string
  campaigns_assigned: number
  active_tasks: number
  completed_tasks: number
  avg_tat_hours: number
  bottlenecks: number
}

import { Toast } from '@/components/cp/CampaignUI'

const ROLE_COLORS: Record<string, string> = {
  brand_solutions: 'var(--green)',
  campaign_manager: 'var(--blue)',
  ir_manager: 'var(--purple)',
  ir_executive: 'var(--orange)',
  client: 'var(--text-secondary)',
}

export default function EmployeePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<EmployeeDetail[]>([])
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/employees')
      const data = await res.json()
      if (data.employees) setEmployees(data.employees)
    } catch {
      showToast('Failed to load employee data', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Activity size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} />
      </div>
    )
  }

  const filtered = roleFilter === 'all' ? employees : employees.filter(e => e.role === roleFilter)

  const roles = [...new Set(employees.map(e => e.role))]

  const totalActive = employees.reduce((s, e) => s + e.active_tasks, 0)
  const totalCompleted = employees.reduce((s, e) => s + e.completed_tasks, 0)
  const totalBottlenecks = employees.reduce((s, e) => s + e.bottlenecks, 0)
  const avgTat = employees.length > 0 ? employees.reduce((s, e) => s + e.avg_tat_hours, 0) / employees.length : 0

  const tatByRole = roles.map(role => {
    const roleEmployees = employees.filter(e => e.role === role)
    const avgTat = roleEmployees.length > 0
      ? roleEmployees.reduce((s, e) => s + e.avg_tat_hours, 0) / roleEmployees.length
      : 0
    return { role: role.replace(/_/g, ' '), avgTat: Number(avgTat.toFixed(1)), count: roleEmployees.length }
  })

  const workloadByMember = filtered.map(e => ({
    name: e.name.substring(0, 12),
    active: e.active_tasks,
    completed: e.completed_tasks,
    bottlenecks: e.bottlenecks,
  }))

  return (
    <div className="anim-fade-up" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <button onClick={() => router.push('/admin')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to Command Centre
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="text-gradient-blue"><Users size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Team</span> Performance</h1>
          <p className="page-subtitle">Workload, TAT, and bottleneck tracking per team member</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-kpi" style={{ marginBottom: 24 }}>
        {[
          { icon: Users, label: 'Team Members', value: employees.length.toString(), color: 'var(--blue)', bg: 'var(--blue-dim)' },
          { icon: Activity, label: 'Active Tasks', value: totalActive.toString(), color: 'var(--orange)', bg: 'var(--orange-dim)' },
          { icon: CheckCircle2, label: 'Completed', value: totalCompleted.toString(), color: 'var(--green)', bg: 'var(--green-dim)' },
          { icon: Clock, label: 'Avg TAT', value: `${avgTat.toFixed(0)}h`, color: avgTat > 48 ? 'var(--red)' : 'var(--green)', bg: avgTat > 48 ? 'var(--red-dim)' : 'var(--green-dim)' },
          { icon: AlertTriangle, label: 'Bottlenecks', value: totalBottlenecks.toString(), color: totalBottlenecks > 0 ? 'var(--red)' : 'var(--green)', bg: totalBottlenecks > 0 ? 'var(--red-dim)' : 'var(--green-dim)' },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: kpi.bg }}><Icon size={18} style={{ color: kpi.color }} /></div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 className="section-title">Workload Distribution</h3>
          {workloadByMember.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={workloadByMember} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', fontSize: 12 }} />
                <Bar dataKey="active" fill="#D97706" radius={[4, 4, 0, 0]} name="Active" />
                <Bar dataKey="completed" fill="#059669" radius={[4, 4, 0, 0]} name="Completed" />
                <Bar dataKey="bottlenecks" fill="#DC2626" radius={[4, 4, 0, 0]} name="Bottlenecks" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No data.</div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Avg TAT by Role</h3>
          {tatByRole.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={tatByRole} layout="vertical" margin={{ top: 8, right: 8, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="role" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={80} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', fontSize: 12 }} />
                <Bar dataKey="avgTat" fill="#7C3AED" radius={[0, 4, 4, 0]} name="Avg TAT (hours)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No data.</div>
          )}
        </div>
      </div>

      {/* Role Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        <button onClick={() => setRoleFilter('all')}
          className={`toggle-btn ${roleFilter === 'all' ? 'active' : ''}`}>
          All ({employees.length})
        </button>
        {roles.map(role => (
          <button key={role} onClick={() => setRoleFilter(role)}
            className={`toggle-btn ${roleFilter === role ? 'active' : ''}`}>
            {role.replace(/_/g, ' ')} ({employees.filter(e => e.role === role).length})
          </button>
        ))}
      </div>

      {/* Employee Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th style={{ textAlign: 'right' }}>Campaigns</th>
              <th style={{ textAlign: 'right' }}>Active Tasks</th>
              <th style={{ textAlign: 'right' }}>Completed</th>
              <th style={{ textAlign: 'right' }}>Avg TAT</th>
              <th style={{ textAlign: 'right' }}>Bottlenecks</th>
              <th>Workload</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => {
              const maxTasks = Math.max(...filtered.map(x => x.active_tasks + x.completed_tasks), 1)
              const workloadPct = Math.round(((e.active_tasks + e.completed_tasks) / maxTasks) * 100)
              return (
                <tr key={e.user_id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{e.email}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${e.role === 'brand_solutions' ? 'green' : e.role === 'campaign_manager' ? 'blue' : e.role === 'ir_manager' ? 'purple' : e.role === 'ir_executive' ? 'orange' : 'gray'}`}
                      style={{ textTransform: 'capitalize' }}>
                      {e.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{e.campaigns_assigned}</td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{e.active_tasks}</td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{e.completed_tasks}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{
                      color: e.avg_tat_hours > 48 ? 'var(--red)' : e.avg_tat_hours > 24 ? 'var(--orange)' : 'var(--green)',
                      fontWeight: 700,
                    }} className="text-mono">
                      {e.avg_tat_hours.toFixed(0)}h
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {e.bottlenecks > 0 ? (
                      <span style={{ color: 'var(--red)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }} className="text-mono">
                        <AlertTriangle size={12} /> {e.bottlenecks}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--green)' }} className="text-mono">0</span>
                    )}
                  </td>
                  <td>
                    <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--border-1)' }}>
                      <div style={{
                        width: `${workloadPct}%`, height: '100%', borderRadius: 3,
                        background: workloadPct > 80 ? 'var(--red)' : workloadPct > 50 ? 'var(--orange)' : 'var(--green)',
                      }} />
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No team members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
