import { NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { getCampaignSession } from '@/lib/cp-auth'

export async function GET() {
  try {
    const client = getCPClient()

    // Fetch all campaigns with aggregated metrics
    const { data: campaigns, error: campError } = await client
      .from('cp_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (campError) throw campError

    const campaignSummaries = []
    let totalRevenue = 0
    let totalCost = 0
    let totalViews = 0
    let totalCreators = 0
    let totalDeliverables = 0
    let totalMargin = 0
    let activeBreaches = 0
    let activeCount = 0

    for (const camp of campaigns || []) {
      // Get creators count and costs
      const { data: creators } = await client
        .from('cp_creators')
        .select('id, internal_cost, quoted_cost, status')
        .eq('campaign_id', camp.id)

      // Get deliverables with metrics
      const { data: deliverables } = await client
        .from('cp_deliverables')
        .select('id, status, views, likes, comments, engagement_rate, tracking_started_at')
        .eq('campaign_id', camp.id)

      const creatorCount = creators?.length || 0
      const deliverableCount = deliverables?.length || 0
      const campaignViews = (deliverables || []).reduce((sum, d) => sum + (d.views || 0), 0)
      const campaignSpend = (creators || []).reduce((sum, c) => sum + (c.quoted_cost || 0), 0)
      const campaignInternalCost = (creators || []).reduce((sum, c) => sum + (c.internal_cost || 0), 0)
      const campaignMargin = campaignSpend - campaignInternalCost
      const avgEngagement = deliverableCount > 0
        ? (deliverables || []).reduce((sum, d) => sum + (d.engagement_rate || 0), 0) / deliverableCount
        : 0
      const blendedCPV = campaignViews > 0 ? campaignSpend / campaignViews : 0

      // Calculate days remaining
      const goLiveDate = new Date(camp.go_live_date || Date.now())
      const daysRemaining = Math.ceil((goLiveDate.getTime() - Date.now()) / 86400000)

      // Calculate progress
      const completedDeliverables = (deliverables || []).filter(d =>
        ['approved', 'live', 'completed'].includes(d.status)
      ).length
      const progressPct = deliverableCount > 0 ? Math.round((completedDeliverables / deliverableCount) * 100) : 0

      // Check for active SLA breaches
      const { count: breachCount } = await client
        .from('cp_activity_feed')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', camp.id)
        .eq('action_type', 'sla_breach')

      const breaches = breachCount || 0
      activeBreaches += breaches

      totalRevenue += campaignSpend
      totalCost += campaignInternalCost
      totalMargin += campaignMargin
      totalViews += campaignViews
      totalCreators += creatorCount
      totalDeliverables += deliverableCount
      if (camp.status === 'active') activeCount++

      campaignSummaries.push({
        id: camp.id,
        name: camp.name,
        brand: camp.brand,
        status: camp.status,
        go_live_date: camp.go_live_date,
        budget: camp.budget,
        total_creators: creatorCount,
        total_deliverables: deliverableCount,
        total_views: campaignViews,
        engagement_rate: Number(avgEngagement.toFixed(2)),
        total_spend: campaignSpend,
        internal_spend: campaignInternalCost,
        margin: campaignMargin,
        blended_cpv: Number(blendedCPV.toFixed(2)),
        days_remaining: daysRemaining,
        active_breaches: breaches,
        progress_pct: progressPct,
      })
    }

    const avgCPV = totalViews > 0 ? totalRevenue / totalViews : 0
    const slaCompliance = totalDeliverables > 0
      ? ((totalDeliverables - activeBreaches) / totalDeliverables) * 100
      : 100

    return NextResponse.json({
      campaigns: campaignSummaries,
      kpis: {
        totalCampaigns: campaigns?.length || 0,
        activeCampaigns: activeCount,
        totalRevenue,
        totalCost,
        totalMargin,
        marginPct: totalRevenue > 0 ? Number(((totalMargin / totalRevenue) * 100).toFixed(1)) : 0,
        totalViews,
        totalCreators,
        totalDeliverables,
        avgCPV: Number(avgCPV.toFixed(2)),
        slaCompliance: Number(slaCompliance.toFixed(1)),
        activeBreaches,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
