'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, Calendar, IndianRupee, Clock, ArrowRight } from 'lucide-react'
import { EmptyState, ErrorState, KPISkeleton, StatusBadge, Toast, formatCurrency } from '@/components/cp/CampaignUI'
import { useCampaignStore } from '@/lib/store'

interface Campaign {
  id: string
  name: string
  brand: string
  campaign_type: string
  status: string
  budget: number
  start_date: string
  go_live_date: string
  created_at: string
}

export default function CampaignsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const { campaigns, setCampaigns } = useCampaignStore()

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(d => {
        if (d.campaigns) setCampaigns(d.campaigns)
        if (d.error) setError(d.error)
      })
      .catch(() => setError('Failed to load campaigns'))
      .finally(() => setLoading(false))
  }, [setCampaigns])

  const formatDate = (d: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatBudget = (b: number) => {
    if (!b) return '₹0'
    return formatCurrency(b)
  }

  const getDaysLeft = (goLiveDate: string) => {
    return Math.ceil((new Date(goLiveDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="anim-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="text-gradient-blue">All</span> Campaigns
          </h1>
          <p className="page-subtitle">
            {loading ? 'Loading campaigns...' : `${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <button onClick={() => router.push('/campaigns/new')} className="btn btn-blue">
          <Plus size={15} /> New Campaign
        </button>
      </div>

      {loading && <KPISkeleton />}

      {error && !loading && (
        <ErrorState title="Failed to load campaigns" description={error} onRetry={() => window.location.reload()} />
      )}

      {!loading && !error && campaigns.length === 0 && (
        <EmptyState
          icon={<FolderOpen size={28} style={{ color: 'var(--blue)' }} />}
          iconBg="rgba(26,115,232,0.08)"
          title="No campaigns yet"
          description="Create your first campaign to start tracking influencer workflows, content approvals, and performance metrics."
          action={<button onClick={() => router.push('/campaigns/new')} className="btn btn-blue"><Plus size={14} /> Create Campaign</button>}
        />
      )}

      {!loading && !error && campaigns.length > 0 && (
        <div className="grid-3" style={{ gap: 8 }}>
          {campaigns.map((campaign, i) => {
            const daysLeft = getDaysLeft(campaign.go_live_date)
            return (
              <div key={campaign.id} onClick={() => router.push(`/campaigns/${campaign.id}`)}
                className={`campaign-card anim-fade-up anim-delay-${Math.min(i + 1, 6)}`}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {campaign.name}
                    </h3>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{campaign.brand}</p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-elevated)', width: 'fit-content', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {campaign.campaign_type.replace(/_/g, ' ')}
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    <Calendar size={11} style={{ color: 'var(--blue)' }} /> {formatDate(campaign.go_live_date)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    <IndianRupee size={11} style={{ color: 'var(--green)' }} /> {formatBudget(campaign.budget)}
                  </div>
                </div>

                {campaign.status === 'active' && (
                  <div className={daysLeft < 0 ? 'delta-neg' : daysLeft < 7 ? 'delta-neg' : 'delta-pos'} style={{ width: 'fit-content' }}>
                    <Clock size={9} />
                    {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Go live today!' : `${daysLeft}d to go live`}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: 'var(--blue)', marginTop: 'auto', paddingTop: 2 }}>
                  View campaign <ArrowRight size={10} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  )
}
