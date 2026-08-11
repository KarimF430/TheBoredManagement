'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Radio, IndianRupee, TrendingUp,
  Eye, Clock, AlertTriangle, ChevronRight, Package,
  BarChart3, Shield, Activity, Target, Flame
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

import { KPISkeleton, StatusBadge, Toast } from '@/components/cp/CampaignUI'

const PIE_COLORS = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DC2626', '#DB2777']

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString('en-IN')
}

function formatCurrency(n: number): string {
  if (n >= 1_00_000) return '₹' + (n / 1_00_000).toFixed(1) + 'L'
  if (n >= 1_000) return '₹' + (n / 1_000).toFixed(1) + 'K'
  return '₹' + n.toLocaleString('en-IN')
}

interface CampaignSummary {
  id: string
  name: string
  brand: string
  status: string
  go_live_date: string
  budget: number
  total_creators: number
  total_deliverables: number
  total_views: number
  engagement_rate: number
  total_spend: number
  internal_spend: number
  margin: number
  blended_cpv: number
  days_remaining: number
  active_breaches: number
  progress_pct: number
}

interface GlobalKPIs {
  totalCampaigns: number
  activeCampaigns: number
  totalRevenue: number
  totalCost: number
  totalMargin: number
  marginPct: number
  totalViews: number
  totalCreators: number
  totalDeliverables: number
  avgCPV: number
  slaCompliance: number
  activeBreaches: number
}

interface EmployeeSummary {
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

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [kpis, setKpis] = useState<GlobalKPIs | null>(null)
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    try {
      const [campRes, empRes] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch('/api/admin/employees'),
      ])
      const campData = await campRes.json()
      const empData = await empRes.json()
      if (campData.campaigns) setCampaigns(campData.campaigns)
      if (campData.kpis) setKpis(campData.kpis)
      if (empData.employees) setEmployees(empData.employees)
    } catch {
      showToast('Failed to load admin data', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="skeleton-card" style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} />
        </div>
      </div>
    )
  }

  const statusPieData = campaigns.reduce((acc, c) => {
    const existing = acc.find(a => a.name === c.status)
    if (existing) existing.value++
    else acc.push({ name: c.status, value: 1 })
    return acc
  }, [] as { name: string; value: number }[])

  const spendByCampaign = campaigns
    .filter(c => c.total_spend > 0)
    .sort((a, b) => b.total_spend - a.total_spend)
    .slice(0, 8)
    .map(c => ({
      name: c.brand.substring(0, 12),
      spend: c.total_spend,
      margin: c.margin,
    }))

  const topPerformers = [...campaigns]
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, 5)

  return (
    <div className="anim-fade-up" style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="text-gradient-blue"><LayoutDashboard size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Command</span> Centre
          </h1>
          <p className="page-subtitle">All campaigns, all metrics, one view</p>
        </div>
        <button onClick={() => router.push('/admin/employees')} className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={14} /> Team View
        </button>
      </div>

      {/* Global KPIs */}
      {kpis && (
        <div className="grid-kpi" style={{ marginBottom: 24 }}>
          {[
            { icon: Flame, label: 'Active Campaigns', value: kpis.activeCampaigns.toString(), color: 'var(--orange)', bg: 'var(--orange-dim)' },
            { icon: IndianRupee, label: 'Total Revenue', value: formatCurrency(kpis.totalRevenue), color: 'var(--green)', bg: 'var(--green-dim)' },
            { icon: Target, label: 'Total Margin', value: formatCurrency(kpis.totalMargin), color: 'var(--blue)', bg: 'var(--blue-dim)' },
            { icon: Eye, label: 'Total Views', value: formatNumber(kpis.totalViews), color: 'var(--purple)', bg: 'var(--purple-light)' },
            { icon: Users, label: 'Total Creators', value: kpis.totalCreators.toString(), color: 'var(--teal)', bg: 'var(--blue-dim)' },
            { icon: Package, label: 'Deliverables', value: kpis.totalDeliverables.toString(), color: 'var(--pink)', bg: 'var(--purple-light)' },
            { icon: BarChart3, label: 'Avg CPV', value: `₹${kpis.avgCPV.toFixed(2)}`, color: 'var(--purple)', bg: 'var(--purple-light)' },
            { icon: Shield, label: 'SLA Compliance', value: `${kpis.slaCompliance.toFixed(0)}%`, color: kpis.slaCompliance > 80 ? 'var(--green)' : 'var(--red)', bg: kpis.slaCompliance > 80 ? 'var(--green-dim)' : 'var(--red-dim)' },
            { icon: AlertTriangle, label: 'Active Breaches', value: kpis.activeBreaches.toString(), color: kpis.activeBreaches > 0 ? 'var(--red)' : 'var(--green)', bg: kpis.activeBreaches > 0 ? 'var(--red-dim)' : 'var(--green-dim)' },
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
      )}

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Spend by Campaign */}
        <div className="card">
          <h3 className="section-title">Revenue by Campaign</h3>
          {spendByCampaign.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={spendByCampaign} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}
                  formatter={(value) => [formatCurrency(Number(value)), '']} />
                <Bar dataKey="spend" fill="#2563EB" radius={[4, 4, 0, 0]} name="Client Spend" />
                <Bar dataKey="margin" fill="#059669" radius={[4, 4, 0, 0]} name="Margin" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No campaign data yet.</div>
          )}
        </div>

        {/* Campaign Status Pie */}
        <div className="card">
          <h3 className="section-title">Campaign Status</h3>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}>
                  {statusPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No campaigns yet.</div>
          )}
        </div>
      </div>

      {/* Top Performing Campaigns */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Top Campaigns by Views</h3>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Brand</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Creators</th>
                <th style={{ textAlign: 'right' }}>Views</th>
                <th style={{ textAlign: 'right' }}>Engagement</th>
                <th style={{ textAlign: 'right' }}>Spend</th>
                <th style={{ textAlign: 'right' }}>Margin</th>
                <th>Progress</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {topPerformers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.brand}</td>
                  <td>
                    <span className={`badge ${c.status === 'active' ? 'badge-green' : c.status === 'completed' ? 'badge-blue' : 'badge-gray'}`}
                      style={{ fontSize: 10 }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{c.total_creators}</td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{formatNumber(c.total_views)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ color: c.engagement_rate > 5 ? 'var(--green)' : 'var(--text-secondary)' }} className="text-mono">
                      {c.engagement_rate?.toFixed(2) || '0.00'}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{formatCurrency(c.total_spend)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--green)' }} className="text-mono">{formatCurrency(c.margin)}</span>
                  </td>
                  <td>
                    <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--border-1)' }}>
                      <div style={{ width: `${c.progress_pct}%`, height: '100%', borderRadius: 3, background: c.progress_pct > 80 ? 'var(--green)' : c.progress_pct > 50 ? 'var(--orange)' : 'var(--blue)' }} />
                    </div>
                  </td>
                  <td>
                    <button onClick={() => router.push(`/campaigns/${c.id}`)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {topPerformers.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No campaigns found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Performance Quick View */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Team Overview</h3>
          <button onClick={() => router.push('/admin/employees')} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            View All <ChevronRight size={12} />
          </button>
        </div>
        <div className="data-table-wrap">
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
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 6).map(e => (
                <tr key={e.user_id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</td>
                  <td>
                    <span className="badge badge-gray" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                      {e.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{e.campaigns_assigned}</td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{e.active_tasks}</td>
                  <td style={{ textAlign: 'right' }} className="text-mono">{e.completed_tasks}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ color: e.avg_tat_hours > 48 ? 'var(--red)' : e.avg_tat_hours > 24 ? 'var(--orange)' : 'var(--green)' }}
                      className="text-mono">
                      {e.avg_tat_hours.toFixed(0)}h
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {e.bottlenecks > 0 ? (
                      <span style={{ color: 'var(--red)', fontWeight: 700 }} className="text-mono">{e.bottlenecks}</span>
                    ) : (
                      <span style={{ color: 'var(--green)' }} className="text-mono">0</span>
                    )}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No team data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
