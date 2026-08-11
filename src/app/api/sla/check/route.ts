import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'
import { generateSLAAlerts, buildSLADashboard } from '@/lib/sla-monitor'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaign_id')

    const client = getCPClient()

    let query = client
      .from('cp_deliverables')
      .select('id, campaign_id, status, created_at, updated_at')

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data: deliverables, error: delError } = await query
    if (delError) throw delError

    const campaignIds = [...new Set((deliverables || []).map((d: Record<string, unknown>) => d.campaign_id as string))]

    const configs: Record<string, Record<string, number>> = {}
    if (campaignIds.length > 0) {
      const { data: campaigns } = await client
        .from('cp_campaigns')
        .select('id, sla_client_feedback_hours, sla_script_days, sla_content_days, sla_onboard_to_live_days')
        .in('id', campaignIds)

      for (const c of campaigns || []) {
        configs[c.id] = {
          clientFeedbackHours: c.sla_client_feedback_hours || 48,
          scriptDays: c.sla_script_days || 3,
          contentDays: c.sla_content_days || 5,
          onboardToLiveDays: c.sla_onboard_to_live_days || 7,
        }
      }
    }

    const defaultConfig = {
      clientFeedbackHours: 48,
      scriptDays: 3,
      contentDays: 5,
      onboardToLiveDays: 7,
    }

    const enrichedDeliverables = (deliverables || []).map((d: Record<string, unknown>) => ({
      id: String(d.id),
      campaign_id: String(d.campaign_id),
      status: String(d.status),
      creator: null as { channel_name: string } | null,
    }))

    const config = campaignId && configs[campaignId] ? configs[campaignId] : defaultConfig
    const alerts = generateSLAAlerts(enrichedDeliverables, config as never)
    const dashboard = buildSLADashboard(deliverables || [], alerts)

    return NextResponse.json({ dashboard })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
