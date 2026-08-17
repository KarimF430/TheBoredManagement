import { NextResponse } from 'next/server'

export async function GET() {
  const thresholds = {
    domainSpamRateWarn: parseFloat(process.env.DOMAIN_SPAM_WARN || '0.0008'),
    domainSpamRateThrottle: parseFloat(process.env.DOMAIN_SPAM_THROTTLE || '0.001'),
    domainSpamRateHardPause: parseFloat(process.env.DOMAIN_SPAM_PAUSE || '0.002'),
    mailboxBounceRateThrottle: parseFloat(process.env.MAILBOX_BOUNCE_THROTTLE || '0.015'),
    mailboxBounceRateHardPause: parseFloat(process.env.MAILBOX_BOUNCE_PAUSE || '0.02'),
    mailboxComplaintProxyPause: parseFloat(process.env.MAILBOX_COMPLAINT_PAUSE || '0.001'),
    replyRateFloor: parseFloat(process.env.REPLY_RATE_FLOOR || '0.01'),
    warmupRampCaps: (process.env.WARMUP_RAMP_CAPS || '10,15,20,30,40,50').split(',').map(Number),
  }
  return NextResponse.json({ thresholds })
}
