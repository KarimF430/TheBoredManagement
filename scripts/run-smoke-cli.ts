import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables
dotenv.config()

interface CheckResult {
  name: string
  ok: boolean
  detail: string
  ms?: number
}

// ── Individual Checks ────────────────────────────────────────

const checkConfig = {
  name: 'config',
  fn: async (): Promise<string> => {
    const { outreachConfig } = await import('../src/lib/outreach/config')
    const budget = outreachConfig.ramp.budgetLadder
    const warmup = outreachConfig.thresholds.warmupRampCaps
    return `budgetLadder=${budget.join(',')}, warmupRampCaps=${warmup.join(',')}, model=${outreachConfig.llm.model}`
  },
}

const checkDb = {
  name: 'db',
  fn: async (): Promise<string> => {
    const { outreachCount } = await import('../src/lib/outreach/db')
    const creators = await outreachCount('outreach_creators')
    const queue = await outreachCount('outreach_send_queue')
    const log = await outreachCount('outreach_log')
    return `creators=${creators}, queue=${queue}, log=${log}`
  },
}

const checkRamp = {
  name: 'ramp',
  fn: async (): Promise<string> => {
    const { outreachSelect } = await import('../src/lib/outreach/db')
    const rows = await outreachSelect<any>('outreach_ramp_state', { limit: 1 })
    if (rows.length === 0) {
      return 'NO RAMP STATE ROW — run schema migration 018'
    }
    const r = rows[0]
    const budgetOk = r.current_daily_budget <= 2500
    const startOk = r.current_daily_budget >= 200
    if (!budgetOk) throw new Error(`current_daily_budget=${r.current_daily_budget} exceeds max 2500`)
    if (!startOk) throw new Error(`current_daily_budget=${r.current_daily_budget} below min 200`)
    return `step=${r.current_step}, budget=${r.current_daily_budget}, sent_today=${r.sent_today_global}`
  },
}

const checkMailboxes = {
  name: 'mailboxes',
  fn: async (): Promise<string> => {
    const { outreachSelect } = await import('../src/lib/outreach/db')
    const rows = await outreachSelect<any>('outreach_mailboxes', {})
    const active = rows.filter((r: any) => r.status === 'active')
    if (rows.length === 0) {
      return 'NO MAILBOXES — add at least one Gmail or SES mailbox'
    }
    const summary = rows.map((r: any) => `${r.email}(${r.provider}:${r.status})`).join(', ')
    return `total=${rows.length}, active=${active.length}: ${summary}`
  },
}

const checkDomains = {
  name: 'domains',
  fn: async (): Promise<string> => {
    const { outreachSelect } = await import('../src/lib/outreach/db')
    const rows = await outreachSelect<any>('outreach_sending_domains', {})
    const active = rows.filter((r: any) => r.status === 'active')
    if (rows.length === 0) {
      return 'NO DOMAINS — add at least one sending domain'
    }
    const summary = rows.map((r: any) => `${r.domain}(${r.status})`).join(', ')
    return `total=${rows.length}, active=${active.length}: ${summary}`
  },
}

const checkSuppressions = {
  name: 'suppressions',
  fn: async (): Promise<string> => {
    const { outreachInsert, outreachDelete, outreachCount } = await import('../src/lib/outreach/db')
    const testEmail = `_smoke_test_${Date.now()}@test.com`
    await outreachInsert('outreach_suppressions', {
      email: testEmail,
      reason: 'manual',
      source: 'smoke_test',
    })
    const count = await outreachCount('outreach_suppressions', { email: testEmail })
    await outreachDelete('outreach_suppressions', 'email', testEmail)
    if (count !== 1) throw new Error(`Insert/read failed: count=${count}`)
    return `insert+read+delete cycle passed (test row cleaned up)`
  },
}

const checkMime = {
  name: 'mime',
  fn: async (): Promise<string> => {
    const { buildMimeMessage } = await import('../src/lib/outreach/mimeBuilder')
    const { raw, rfcMessageId } = buildMimeMessage({
      from: 'test@domain.com',
      fromName: 'Test',
      to: 'recipient@example.com',
      subject: 'Smoke Test',
      bodyText: 'This is a smoke test email.',
      unsubscribeUrl: 'https://domain.com/unsubscribe?email=test@example.com',
    })

    const decoded = Buffer.from(raw, 'base64url').toString('utf8')
    const hasUnsub = decoded.includes('List-Unsubscribe:')
    const hasUnsubPost = decoded.includes('List-Unsubscribe-Post:')
    const hasMsgId = decoded.includes('Message-ID:')

    if (!hasUnsub) throw new Error('Missing List-Unsubscribe header')
    if (!hasUnsubPost) throw new Error('Missing List-Unsubscribe-Post header')
    if (!hasMsgId) throw new Error('Missing Message-ID header')

    return `rfcMessageId=${rfcMessageId.slice(0, 30)}..., List-Unsubscribe=${hasUnsub}, List-Unsubscribe-Post=${hasUnsubPost}, Message-ID=${hasMsgId}`
  },
}

const checkEmailValid = {
  name: 'email_valid',
  fn: async (): Promise<string> => {
    const { validateEmail } = await import('../src/lib/outreach/emailValidator')
    const good = await validateEmail('test@gmail.com')
    const bad = await validateEmail('not-an-email')
    const syntax = await validateEmail('fake@nonexistent12345xyz.com')
    return `valid(test@gmail.com)=${good.is_valid}, valid(not-an-email)=${bad.is_valid}, valid(fake@nonexistent)=${syntax.is_valid}`
  },
}

const checkLlm = {
  name: 'llm',
  fn: async (): Promise<string> => {
    const { safeParse } = await import('../src/lib/outreach/llm')
    const r1 = safeParse('{"key": "value"}')
    const r2 = safeParse('```json\n{"key": "value"}\n```')
    const r3 = safeParse(null)
    const r4 = safeParse('not json at all')
    if (!r1) throw new Error('safeParse failed on valid JSON')
    if (!r2) throw new Error('safeParse failed on markdown-wrapped JSON')
    if (r3 !== null) throw new Error('safeParse should return null for null input')
    if (r4 !== null) throw new Error('safeParse should return null for non-JSON input')
    return `safeParse: valid=${!!r1}, markdown=${!!r2}, null=${r3 === null}, invalid=${r4 === null}`
  },
}

const checkProviderLog = {
  name: 'provider_log',
  fn: async (): Promise<string> => {
    const processorCode = fs.readFileSync(path.join(__dirname, '../src/workers/processor.ts'), 'utf8')
    const hasOldBug = processorCode.includes("provider: mailboxId ? 'ses' : 'gmail'")
    const hasNewFix = processorCode.includes("const provider = mbRows[0]?.provider || 'ses'")

    if (hasOldBug) throw new Error('PROVIDER LOGGING BUG STILL PRESENT — processor.ts line ~193')
    if (!hasNewFix) throw new Error('Provider fix not found in processor.ts')

    return `provider reads from mailbox row (bug fixed)`
  },
}

const checkUnsubscribeEndpoint = {
  name: 'unsubscribe',
  fn: async (): Promise<string> => {
    const routePath = path.join(__dirname, '../src/app/api/outreach/unsubscribe/route.ts')
    if (!fs.existsSync(routePath)) throw new Error('Unsubscribe route does not exist')

    const routeCode = fs.readFileSync(routePath, 'utf8')
    const hasGet = routeCode.includes('export async function GET')
    const hasPost = routeCode.includes('export async function POST')
    const hasSuppression = routeCode.includes('outreach_suppressions')

    if (!hasGet) throw new Error('Missing GET handler (required for List-Unsubscribe mailto)')
    if (!hasPost) throw new Error('Missing POST handler (required for one-click unsubscribe)')
    if (!hasSuppression) throw new Error('Does not write to suppressions table')

    return `GET+POST handlers present, writes to suppressions`
  },
}

const checkOnboardingTables = {
  name: 'onboarding',
  fn: async (): Promise<string> => {
    const { outreachCount } = await import('../src/lib/outreach/db')
    const sessions = await outreachCount('creator_onboarding_sessions')
    const drafts = await outreachCount('creator_profile_drafts')
    const niches = await outreachCount('creator_niche_taxonomy')
    return `sessions=${sessions}, drafts=${drafts}, niches=${niches}`
  },
}

async function run() {
  const checks = [
    checkConfig,
    checkDb,
    checkRamp,
    checkMailboxes,
    checkDomains,
    checkSuppressions,
    checkMime,
    checkEmailValid,
    checkLlm,
    checkProviderLog,
    checkUnsubscribeEndpoint,
    checkOnboardingTables,
  ]

  console.log('Starting Outreach System Smoke Tests...')
  console.log('=======================================')

  const results: CheckResult[] = []
  const startTime = Date.now()

  for (const check of checks) {
    const t0 = Date.now()
    try {
      const result = await check.fn()
      results.push({ name: check.name, ok: true, detail: result, ms: Date.now() - t0 })
      console.log(`[PASS] ${check.name.padEnd(15)}: ${result} (${Date.now() - t0}ms)`)
    } catch (err) {
      const msg = (err as Error).message
      results.push({ name: check.name, ok: false, detail: msg, ms: Date.now() - t0 })
      console.log(`[FAIL] ${check.name.padEnd(15)}: ${msg} (${Date.now() - t0}ms)`)
    }
  }

  console.log('=======================================')
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  console.log(`Summary: ${passed}/${results.length} passed. Failed: ${failed}. Time: ${Date.now() - startTime}ms`)

  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('Fatal error during test execution:', err)
  process.exit(1)
})
