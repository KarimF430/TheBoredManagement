/**
 * Creator Onboarding — Email Template
 * Used by outreach system to send onboarding links to creators
 */

export function creatorOnboardingEmailTemplate(
  creatorName: string,
  onboardingUrl: string,
  expiryDays: number = 7
): string {
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
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <div style="font-size:13px;font-weight:800;letter-spacing:1.2px;color:#F58220;text-transform:uppercase;margin-bottom:12px;">
                TheBoredMonkey
              </div>
              <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;letter-spacing:-0.5px;">
                Complete Your Creator Profile
              </h1>
              <p style="font-size:14px;color:#64748B;margin:0 0 28px;line-height:1.6;">
                Hi ${creatorName}, we'd love to have you on our creator network! Complete your profile in just 2 minutes to get matched with brands.
              </p>
            </td>
          </tr>

          <!-- Features -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px;background:#F8FAFC;border-radius:8px;margin-bottom:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width:32px;height:32px;background:#DBEAFE;border-radius:8px;text-align:center;line-height:32px;font-size:16px;">🇮🇳</div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="font-size:13px;font-weight:600;color:#0F172A;margin:0;">Get matched with Indian brands</p>
                          <p style="font-size:11px;color:#64748B;margin:2px 0 0;">Access exclusive brand campaigns in your niche</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="8"></td></tr>
                <tr>
                  <td style="padding:12px;background:#F8FAFC;border-radius:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width:32px;height:32px;background:#D1FAE5;border-radius:8px;text-align:center;line-height:32px;font-size:16px;">💰</div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="font-size:13px;font-weight:600;color:#0F172A;margin:0;">Earn in INR</p>
                          <p style="font-size:11px;color:#64748B;margin:2px 0 0;">Set your own rates and get paid directly</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="8"></td></tr>
                <tr>
                  <td style="padding:12px;background:#F8FAFC;border-radius:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width:32px;height:32px;background:#FEF3C7;border-radius:8px;text-align:center;line-height:32px;font-size:16px;">🎯</div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="font-size:13px;font-weight:600;color:#0F172A;margin:0;">AI-powered matching</p>
                          <p style="font-size:11px;color:#64748B;margin:2px 0 0;">Our algorithm finds the best brand fits for you</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:0 40px 32px;">
              <a href="${onboardingUrl}" style="
                display:inline-block;
                background:linear-gradient(135deg, #2563EB 0%, #4F46E5 100%);
                color:#FFFFFF;
                text-decoration:none;
                font-size:14px;
                font-weight:700;
                padding:14px 32px;
                border-radius:12px;
                box-shadow:0 4px 12px rgba(37,99,235,0.3);
                letter-spacing:0.3px;
              ">
                Complete Your Profile →
              </a>
            </td>
          </tr>

          <!-- What you'll need -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="font-size:12px;color:#64748B;margin:0 0 12px;text-align:center;font-weight:600;">
                What you'll need:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="font-size:11px;color:#64748B;padding:4px 0;">
                    ✓ Basic info (name, location)
                  </td>
                  <td width="50%" style="font-size:11px;color:#64748B;padding:4px 0;">
                    ✓ Your content niche
                  </td>
                </tr>
                <tr>
                  <td style="font-size:11px;color:#64748B;padding:4px 0;">
                    ✓ Social media links
                  </td>
                  <td style="font-size:11px;color:#64748B;padding:4px 0;">
                    ✓ Your rates
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="padding:0 40px 24px;">
              <div style="padding:12px;background:#FEF3C7;border-radius:8px;text-align:center;">
                <p style="font-size:11px;color:#92400E;margin:0;font-weight:500;">
                  ⏰ Your invitation expires in ${expiryDays} days
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px;background:#F8FAFC;border-top:1px solid rgba(37,99,235,0.06);">
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

export function creatorOnboardingReminderTemplate(
  creatorName: string,
  onboardingUrl: string,
  daysRemaining: number
): string {
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
                TheBoredMonkey
              </div>
              <h1 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px;letter-spacing:-0.5px;">
                Don't Miss Out, ${creatorName}!
              </h1>
              <p style="font-size:14px;color:#64748B;margin:0 0 28px;line-height:1.6;">
                Your creator profile invitation expires in <strong>${daysRemaining} days</strong>. Complete it now to start receiving brand opportunities.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 32px;">
              <a href="${onboardingUrl}" style="
                display:inline-block;
                background:linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
                color:#FFFFFF;
                text-decoration:none;
                font-size:14px;
                font-weight:700;
                padding:14px 32px;
                border-radius:12px;
                box-shadow:0 4px 12px rgba(220,38,38,0.3);
              ">
                Complete Profile Now →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px;background:#F8FAFC;border-top:1px solid rgba(37,99,235,0.06);">
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
