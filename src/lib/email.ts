import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SOV Panel <auth@theboredmonkey.com>'

export async function sendOTPEmail(
  email: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your SOV Panel login code',
      html: otpEmailTemplate(code),
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to send email' }
  }
}

function otpEmailTemplate(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F4F7FC;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:36px 40px 20px;">
              <div style="font-size:13px;font-weight:800;letter-spacing:1.2px;color:#F58220;text-transform:uppercase;margin-bottom:12px;">
                SOV Panel
              </div>
              <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;letter-spacing:-0.5px;">
                Your login code
              </h1>
              <p style="font-size:14px;color:#64748B;margin:0 0 28px;line-height:1.6;">
                Enter this 6-digit code to sign in to your workspace. It expires in 5 minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 32px;">
              <div style="
                display:inline-block;
                font-size:32px;
                font-weight:800;
                letter-spacing:8px;
                color:#0F172A;
                background:#F4F7FC;
                border:2px dashed rgba(26,115,232,0.2);
                border-radius:12px;
                padding:16px 28px;
              ">
                ${code}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 36px;">
              <p style="font-size:12px;color:#94A3B8;margin:0;line-height:1.6;">
                If you didn't request this, you can safely ignore this email. Only pre-approved email addresses can access SOV Panel.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px;background:#F8FAFC;border-top:1px solid rgba(26,115,232,0.06);">
              <p style="font-size:11px;color:#94A3B8;margin:0;text-align:center;">
                Powered by <strong style="color:#F58220;">TheBoredMonkey</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
