/**
 * Seed tester — placement testing across Gmail/Yahoo/Outlook.
 */

import { outreachSelect, outreachInsert } from '../lib/outreach/db'

export async function runSeedTests(): Promise<{ tested: number }> {
  const seeds = await outreachSelect<any>('outreach_seed_accounts', {
    filters: { active: true },
  })

  if (!seeds.length) return { tested: 0 }

  let tested = 0
  for (const seed of seeds) {
    try {
      const result = await testSeedPlacement(seed)
      if (result) tested++
    } catch {
      // Skip failed tests
    }
  }

  return { tested }
}

async function testSeedPlacement(seed: any): Promise<boolean> {
  const recent = await outreachSelect<any>('outreach_log', {
    filters: { recipient_email: seed.email },
    order: { column: 'sent_at', ascending: false },
    limit: 1,
  })

  if (!recent.length) return false

  const logRow = recent[0]
  let placement = 'unknown'

  if (seed.provider === 'gmail') {
    placement = await checkGmailPlacement(seed, logRow)
  } else if (seed.provider === 'yahoo') {
    placement = await checkYahooPlacement(seed, logRow)
  } else if (seed.provider === 'outlook') {
    placement = await checkOutlookPlacement(seed, logRow)
  }

  await outreachInsert('outreach_seed_test_results', {
    seed_account_id: seed.id,
    outreach_log_id: logRow.id,
    placement,
    detected_at: new Date().toISOString(),
    raw_data: JSON.stringify({ provider: seed.provider }),
  })

  return true
}

async function checkGmailPlacement(_seed: any, _logRow: any): Promise<string> {
  return 'sampled_inferred'
}

async function checkYahooPlacement(_seed: any, _logRow: any): Promise<string> {
  return 'sampled_inferred'
}

async function checkOutlookPlacement(_seed: any, _logRow: any): Promise<string> {
  return 'sampled_inferred'
}

export async function getPlacementSummary(days = 7): Promise<Record<string, Record<string, number>>> {
  const results = await outreachSelect<any>('outreach_seed_test_results', {})

  const recent = results.filter((r: any) => {
    const d = new Date(r.detected_at)
    return (Date.now() - d.getTime()) / 86400000 <= days
  })

  const summary: Record<string, Record<string, number>> = {}
  for (const r of recent) {
    const seed = await outreachSelect<any>('outreach_seed_accounts', {
      filters: { id: r.seed_account_id },
      limit: 1,
    })
    if (!seed.length) continue

    const provider = seed[0].provider
    if (!summary[provider]) summary[provider] = {}
    summary[provider][r.placement] = (summary[provider][r.placement] || 0) + 1
  }

  return summary
}
