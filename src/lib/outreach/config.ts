/**
 * Outreach System Configuration
 *
 * All thresholds, caps, and secrets for the smart outreach pipeline.
 * No process.env reads outside this file.
 */

function num(name: string, fallback: number): number {
  const v = process.env[name]
  return v === undefined || v === '' ? fallback : Number(v)
}

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export const outreachConfig = {
  llm: {
    apiKey: required('OPENAI_API_KEY'),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    timeoutMs: num('LLM_TIMEOUT_MS', 20000),
    maxRetries: num('LLM_MAX_RETRIES', 3),
    minConfidenceToAct: num('LLM_MIN_CONFIDENCE', 0.7),
  },

  followup: {
    maxFollowups: num('MAX_FOLLOWUPS', 4),
    gapDaysBetween: num('FOLLOWUP_GAP_DAYS', 3),
    priorityPenalty: num('FOLLOWUP_PRIORITY_PENALTY', 1000),
  },

  thresholds: {
    minSendsForScoring: num('MIN_SENDS_FOR_SCORING', 50),
    domainSpamRateWarn: num('DOMAIN_SPAM_WARN', 0.0008),
    domainSpamRateThrottle: num('DOMAIN_SPAM_THROTTLE', 0.001),
    domainSpamRateHardPause: num('DOMAIN_SPAM_PAUSE', 0.002),
    mailboxBounceRateThrottle: num('MAILBOX_BOUNCE_THROTTLE', 0.015),
    mailboxBounceRateHardPause: num('MAILBOX_BOUNCE_PAUSE', 0.02),
    mailboxComplaintProxyPause: num('MAILBOX_COMPLAINT_PAUSE', 0.001),
    replyRateFloor: num('REPLY_RATE_FLOOR', 0.01),
    warmupRampCaps: (process.env.WARMUP_RAMP_CAPS || '10,15,20,30,40,50')
      .split(',').map((n) => Number(n.trim())),
  },

  ramp: {
    budgetLadder: (process.env.RAMP_BUDGET_LADDER || '200,400,700,1100,1600,2100,2500')
      .split(',').map((n) => Number(n.trim())),
    trailingWindowDays: num('RAMP_WINDOW_DAYS', 3),
    minDaysBetweenAdvances: num('RAMP_MIN_DAYS', 4),
  },

  ses: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback',
  },

  alerts: {
    whatsappUrl: process.env.WHATSAPP_WEBHOOK_URL || null,
  },

  reconciler: {
    stuckClaimTimeoutMs: num('RECONCILER_STUCK_TIMEOUT_MS', 5 * 60 * 1000),
    stuckSendingTimeoutMs: num('RECONCILER_STUCK_SENDING_MS', 10 * 60 * 1000),
  },

  enqueue: {
    apiKey: required('OUTREACH_ENQUEUE_API_KEY'),
  },

  cron: {
    secret: process.env.CRON_SECRET || null,
  },
}

export type OutreachConfig = typeof outreachConfig
