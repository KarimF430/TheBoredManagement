import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

// GET /api/cron/sla-check — Check all campaigns for SLA breaches and send escalation emails
// Call via cron job: curl http://localhost:3000/api/cron/sla-check
export async function GET(req: NextRequest) {
  // Optional: verify cron secret header
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET || 'tbm-cron-2026'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = getCPClient()
  const now = new Date()
  const breaches: Array<{
    campaignId: string
    campaignName: string
    brand: string
    reason: string
    daysOverdue: number
    severity: string
  }> = []

  try {
    // 1. Check go-live deadline breaches
    const { data: overdueCampaigns } = await client
      .from('cp_campaigns')
      .select('id, name, brand, go_live_date, sla_go_live_warning_days')
      .not('go_live_date', 'is', null)
      .eq('status', 'active')

    for (const campaign of overdueCampaigns || []) {
      const goLive = new Date(campaign.go_live_date!)
      const warningDays = campaign.sla_go_live_warning_days || 7
      const daysUntilGoLive = Math.ceil((goLive.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilGoLive < 0) {
        breaches.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          brand: campaign.brand,
          reason: `Go-live date has passed (${Math.abs(daysUntilGoLive)} days overdue)`,
          daysOverdue: Math.abs(daysUntilGoLive),
          severity: 'critical',
        })
      } else if (daysUntilGoLive <= warningDays) {
        breaches.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          brand: campaign.brand,
          reason: `Go-live in ${daysUntilGoLive} days (warning threshold: ${warningDays})`,
          daysOverdue: 0,
          severity: 'warning',
        })
      }
    }

    // 2. Check deliverable SLA breaches (pending > 3 days)
    const { data: pendingDeliverables } = await client
      .from('cp_deliverables')
      .select('id, campaign_id, status, created_at, campaigns!inner(name, brand)')
      .in('status', ['pending', 'script_pending'])
      .lt('created_at', new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString())

    const deliverableCampaigns = new Map<string, { name: string; brand: string; count: number }>()
    for (const d of pendingDeliverables || []) {
      const key = d.campaign_id
      const existing = deliverableCampaigns.get(key) || { name: (d.campaigns as any).name, brand: (d.campaigns as any).brand, count: 0 }
      existing.count++
      deliverableCampaigns.set(key, existing)
    }

    for (const [campaignId, info] of deliverableCampaigns) {
      breaches.push({
        campaignId,
        campaignName: info.name,
        brand: info.brand,
        reason: `${info.count} deliverable(s) pending > 3 days`,
        daysOverdue: 3,
        severity: 'warning',
      })
    }

    // 3. Check onboarding deadline breaches (per creator)
    const { data: overdueOnboardings } = await client
      .from('cp_creators')
      .select('id, channel_name, go_live_deadline, campaign_id, campaigns!inner(name, brand)')
      .not('go_live_deadline', 'is', null)
      .not('onboarded_at', 'is', null)
      .lt('go_live_deadline', now.toISOString().split('T')[0])
      .is('client_action', null)

    for (const c of overdueOnboardings || []) {
      const deadline = new Date(c.go_live_deadline!)
      const daysOver = Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))
      breaches.push({
        campaignId: c.campaign_id,
        campaignName: (c.campaigns as any).name,
        brand: (c.campaigns as any).brand,
        reason: `Creator "${c.channel_name}" missed go-live deadline by ${daysOver} days`,
        daysOverdue: daysOver,
        severity: 'critical',
      })
    }

    // 4. Check script approval SLA (script pending > 2 days)
    const { data: overdueScripts } = await client
      .from('cp_script_versions')
      .select('id, campaign_id, deliverable_id, created_at, campaigns!inner(name, brand)')
      .eq('status', 'pending')
      .lt('created_at', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString())

    const scriptCampaigns = new Map<string, { name: string; brand: string; count: number }>()
    for (const s of overdueScripts || []) {
      const key = s.campaign_id
      const existing = scriptCampaigns.get(key) || { name: (s.campaigns as any).name, brand: (s.campaigns as any).brand, count: 0 }
      existing.count++
      scriptCampaigns.set(key, existing)
    }

    for (const [campaignId, info] of scriptCampaigns) {
      breaches.push({
        campaignId,
        campaignName: info.name,
        brand: info.brand,
        reason: `${info.count} script(s) pending approval > 2 days`,
        daysOverdue: 2,
        severity: 'warning',
      })
    }

    // 5. Log breaches to activity feed
    for (const breach of breaches) {
      await client.from('cp_activity_feed').insert({
        campaign_id: breach.campaignId,
        actor_id: null,
        actor_name: 'SLA Monitor',
        action: 'sla_breach',
        entity_type: 'sla_check',
        entity_id: breach.campaignId,
        metadata: {
          reason: breach.reason,
          severity: breach.severity,
          days_overdue: breach.daysOverdue,
          checked_at: now.toISOString(),
        },
      })
    }

    // 6. Try to send email notifications if Resend is configured
    let emailsSent = 0
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        for (const breach of breaches) {
          if (breach.severity === 'critical') {
            await resend.emails.send({
              from: 'Campaign Panel <noreply@theboredmonkey.com>',
              to: 'haji.karim@theboredmonkey.com',
              subject: `[SLA BREACH] ${breach.campaignName} — ${breach.reason}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #DE350B; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0; font-size: 16px;">⚠️ SLA Breach Alert</h2>
                  </div>
                  <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e1e4e8; border-top: none; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0 0 12px;"><strong>Campaign:</strong> ${breach.campaignName} (${breach.brand})</p>
                    <p style="margin: 0 0 12px;"><strong>Issue:</strong> ${breach.reason}</p>
                    <p style="margin: 0 0 12px;"><strong>Severity:</strong> <span style="color: #DE350B; font-weight: bold;">${breach.severity.toUpperCase()}</span></p>
                    ${breach.daysOverdue > 0 ? `<p style="margin: 0 0 12px;"><strong>Days Overdue:</strong> ${breach.daysOverdue}</p>` : ''}
                    <hr style="border: none; border-top: 1px solid #e1e4e8; margin: 16px 0;" />
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">This is an automated SLA breach notification from Campaign Panel.</p>
                  </div>
                </div>
              `,
            })
            emailsSent++
          }
        }
      } catch (emailErr) {
        console.error('Failed to send SLA breach emails:', emailErr)
      }
    }

    return NextResponse.json({
      checked_at: now.toISOString(),
      breaches_found: breaches.length,
      critical: breaches.filter(b => b.severity === 'critical').length,
      warnings: breaches.filter(b => b.severity === 'warning').length,
      emails_sent: emailsSent,
      breaches,
    })
  } catch (err) {
    console.error('SLA check error:', err)
    return NextResponse.json({ error: 'SLA check failed' }, { status: 500 })
  }
}
