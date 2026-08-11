'use client'

import { useMemo } from 'react'
import { AlertTriangle, Clock, CheckCircle2, Shield, TrendingUp, Users, X } from 'lucide-react'
import { generateSLAAlerts, buildSLADashboard, type SLAConfig, type SLAAlert } from '@/lib/sla-monitor'
import { useCampaignStore } from '@/lib/store'

interface Props {
  campaignId?: string
  config?: SLAConfig
}

const DEFAULT_CONFIG: SLAConfig = {
  clientFeedbackHours: 48,
  scriptDays: 3,
  contentDays: 5,
  onboardToLiveDays: 14,
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; color: string; icon: typeof AlertTriangle }> = {
  critical: { bg: 'rgba(255,45,85,0.06)', border: 'rgba(255,45,85,0.2)', color: '#FF2D55', icon: AlertTriangle },
  high: { bg: 'rgba(255,109,0,0.06)', border: 'rgba(255,109,0,0.2)', color: '#FF6D00', icon: AlertTriangle },
  medium: { bg: 'rgba(255,193,7,0.06)', border: 'rgba(255,193,7,0.2)', color: '#FFC107', icon: Clock },
  low: { bg: 'rgba(0,200,83,0.06)', border: 'rgba(0,200,83,0.2)', color: '#00C853', icon: CheckCircle2 },
}

export default function SLADashboard({ campaignId, config = DEFAULT_CONFIG }: Props) {
  const { deliverables } = useCampaignStore()

  const filteredDeliverables = campaignId
    ? deliverables.filter(d => d.campaign_id === campaignId)
    : deliverables

  const alerts = useMemo(() => generateSLAAlerts(filteredDeliverables, config), [filteredDeliverables, config])
  const dashboard = useMemo(() => buildSLADashboard(filteredDeliverables, alerts), [filteredDeliverables, alerts])

  const complianceColor = dashboard.slaComplianceRate >= 90 ? '#00C853'
    : dashboard.slaComplianceRate >= 70 ? '#FFC107' : '#FF2D55'

  return (
    <div>
      {/* SLA Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active SLAs', value: dashboard.totalActive, icon: Shield, color: '#1A73E8', bg: 'rgba(26,115,232,0.06)' },
          { label: 'On Track', value: dashboard.onTrack, icon: CheckCircle2, color: '#00C853', bg: 'rgba(0,200,83,0.06)' },
          { label: 'Warnings', value: dashboard.warning, icon: Clock, color: '#FFC107', bg: 'rgba(255,193,7,0.06)' },
          { label: 'Breached', value: dashboard.breached, icon: AlertTriangle, color: '#FF2D55', bg: 'rgba(255,45,85,0.06)' },
          { label: 'Compliance', value: `${dashboard.slaComplianceRate.toFixed(0)}%`, icon: TrendingUp, color: complianceColor, bg: `${complianceColor}10` },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: kpi.bg }}>
                <Icon size={14} style={{ color: kpi.color }} />
              </div>
              <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          )
        })}
      </div>

      {/* Compliance bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>SLA Compliance</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: complianceColor }} className="text-mono">{dashboard.slaComplianceRate.toFixed(1)}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${Math.min(dashboard.slaComplianceRate, 100)}%`,
            background: `linear-gradient(90deg, ${complianceColor}, ${complianceColor}CC)`,
            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
      </div>

      {/* Alerts list */}
      {alerts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.slice(0, 10).map(alert => (
            <SLAAlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <div style={{
          padding: 32, textAlign: 'center',
          background: 'var(--bg-elevated)', borderRadius: 12,
        }}>
          <CheckCircle2 size={32} style={{ color: '#00C853', marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)' }}>All SLAs on track</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>No warnings or breaches detected</div>
        </div>
      )}
    </div>
  )
}

function SLAAlertRow({ alert }: { alert: SLAAlert }) {
  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium
  const Icon = style.icon

  const timeLabel = alert.hoursOverdue
    ? `${Math.round(alert.hoursOverdue)}h overdue`
    : alert.hoursRemaining
      ? `${Math.round(alert.hoursRemaining)}h remaining`
      : ''

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 10,
      background: style.bg, border: `1.5px solid ${style.border}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${style.color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={14} style={{ color: style.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>{alert.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {alert.creatorName && <span>{alert.creatorName} · </span>}
          {alert.message}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: style.color }} className="text-mono">{timeLabel}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {alert.stage.replace(/_/g, ' ')}
        </div>
      </div>
    </div>
  )
}
