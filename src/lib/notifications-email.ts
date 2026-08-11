import { Resend } from 'resend'

let resend: Resend | null = null
function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Campaign Panel <auth@theboredmonkey.com>'

export async function sendSLABreachEmail(params: {
  to: string[]
  campaignName: string
  creatorName: string
  stage: string
  hoursOverdue: number
  severity: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const severityColor = {
      critical: '#DE350B',
      high: '#FF8B00',
      medium: '#FF8B00',
      low: '#6B778C',
    }[params.severity] || '#6B778C'

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `[${params.severity.toUpperCase()}] SLA Breach: ${params.campaignName} — ${params.creatorName}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:'Inter',-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#FFF;border-radius:8px;border:1px solid #DFE1E6;overflow:hidden;">
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid #DFE1E6;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;color:#6B778C;text-transform:uppercase;">Campaign Panel</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;">
            <div style="display:inline-block;padding:4px 10px;border-radius:3px;background:${severityColor}12;color:${severityColor};font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:12px;">
              ${params.severity} SLA Breach
            </div>
            <h2 style="font-size:18px;font-weight:700;color:#172B4D;margin:0 0 8px;">SLA has been breached</h2>
            <p style="font-size:14px;color:#6B778C;margin:0 0 20px;line-height:1.6;">
              The <strong>${params.stage.replace(/_/g, ' ')}</strong> stage for <strong>${params.creatorName}</strong> in campaign <strong>${params.campaignName}</strong> is <strong>${params.hoursOverdue}h overdue</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:6px;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:12px;color:#6B778C;padding-bottom:6px;">Campaign</td>
                      <td style="font-size:12px;color:#172B4D;font-weight:600;text-align:right;padding-bottom:6px;">${params.campaignName}</td>
                    </tr>
                    <tr>
                      <td style="font-size:12px;color:#6B778C;padding-bottom:6px;">Creator</td>
                      <td style="font-size:12px;color:#172B4D;font-weight:600;text-align:right;padding-bottom:6px;">${params.creatorName}</td>
                    </tr>
                    <tr>
                      <td style="font-size:12px;color:#6B778C;padding-bottom:6px;">Stage</td>
                      <td style="font-size:12px;color:#172B4D;font-weight:600;text-align:right;padding-bottom:6px;">${params.stage.replace(/_/g, ' ')}</td>
                    </tr>
                    <tr>
                      <td style="font-size:12px;color:#6B778C;">Overdue by</td>
                      <td style="font-size:12px;color:${severityColor};font-weight:700;text-align:right;">${params.hoursOverdue} hours</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="font-size:12px;color:#97A0AF;margin:0;">This is an automated escalation from Campaign Panel.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    return { ok: false, error: message }
  }
}

export async function sendTeamInviteEmail(params: {
  to: string
  campaignName: string
  invitedByName: string
  role: string
  inviteUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `You've been invited to ${params.campaignName}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:'Inter',-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#FFF;border-radius:8px;border:1px solid #DFE1E6;overflow:hidden;">
        <tr>
          <td style="padding:24px 32px;">
            <h2 style="font-size:18px;font-weight:700;color:#172B4D;margin:0 0 8px;">Campaign Invitation</h2>
            <p style="font-size:14px;color:#6B778C;margin:0 0 20px;line-height:1.6;">
              <strong>${params.invitedByName}</strong> has invited you to join <strong>${params.campaignName}</strong> as <strong>${params.role.replace(/_/g, ' ')}</strong>.
            </p>
            <a href="${params.inviteUrl}" style="display:inline-block;padding:10px 20px;background:#0052CC;color:#FFF;border-radius:4px;font-size:13px;font-weight:600;text-decoration:none;">
              Accept Invitation
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    return { ok: false, error: message }
  }
}
