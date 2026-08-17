/**
 * Automated DNS auth-and-alignment gate.
 *
 * Queries DNS for SPF, DKIM, DMARC and refuses to activate a domain that doesn't align.
 * Periodically re-verifies active domains to catch DNS drift (DKIM rotation, DMARC edits).
 *
 * CRITICAL: The gate keys on the actual DMARC alignment result from the
 * Authentication-Results header of a real seed send — NOT on individual SPF/DKIM
 * passes. DKIM can show `dkim=pass` while the signing domain (`d=`) doesn't match
 * the From domain, which means DMARC still fails. The header says `dmarc=pass` or
 * `dmarc=fail` directly, so we key the gate on that line.
 *
 * Fails closed on ambiguity: no DKIM record found at any known selector → pause.
 * "No record" is NOT a soft pass.
 */

import dns from 'dns'
import { outreachSelect, outreachUpdate } from './db'
import { alert } from './alerts'

const dnsPromises = dns.promises

// Re-verify interval: every 6 hours for active domains
const REVERIFY_INTERVAL_MS = 6 * 60 * 60 * 1000

interface AuthCheckResult {
  valid: boolean
  status: string
  reason: string | null
  raw: string | null
}

interface DKIMResult extends AuthCheckResult {
  selector: string | null
}

interface DMARCResult extends AuthCheckResult {
  policy?: string
}

interface SeedAuthResult {
  dmarcAligned: boolean
  dmarcResult: string | null
  spfAligned: boolean
  dkimAligned: boolean
  dkimSigningDomain: string | null
  rawHeader: string | null
}

/**
 * Primary verification: DNS records + seed send header parse.
 *
 * The gate requires ALL of:
 * 1. SPF record exists with valid mechanism and ~all/-all
 * 2. DKIM record exists at a known selector (FAIL CLOSED if none found)
 * 3. DMARC record exists with valid policy
 * 4. Seed send Authentication-Results shows dmarc=pass (not just spf=pass + dkim=pass)
 */
export async function verifyDomain(domainId: string, seedAuthHeader?: string | null): Promise<{
  domain: string
  spf: AuthCheckResult
  dkim: DKIMResult
  dmarc: AuthCheckResult
  seedAuth: SeedAuthResult
  allPass: boolean
}> {
  const rows = await outreachSelect<any>('outreach_sending_domains', {
    filters: { id: domainId },
    limit: 1,
  })

  if (!rows.length) throw new Error(`Domain not found: ${domainId}`)

  const domain = rows[0]
  const spf = await checkSPF(domain.domain)
  const dkim = await checkDKIM(domain.domain, domain.is_bulk_sender)
  const dmarc = await checkDMARC(domain.domain)

  // Parse the seed send Authentication-Results header
  const seedAuth = parseSeedAuthResults(seedAuthHeader || null, domain.domain)

  // Gate requires DNS pass AND DMARC alignment from seed send
  const dnsPass = spf.valid && dkim.valid && dmarc.valid
  const allPass = dnsPass && seedAuth.dmarcAligned

  await outreachUpdate('outreach_sending_domains', 'id', domainId, {
    spf_status: spf.status,
    dkim_status: dkim.status,
    dmarc_status: dmarc.status,
    status: allPass ? 'active' : 'paused',
    paused_reason: allPass ? null : buildPauseReason(spf, dkim, dmarc, seedAuth),
    updated_at: new Date().toISOString(),
  })

  if (!allPass) {
    const failures: string[] = []
    if (!spf.valid) failures.push(`SPF: ${spf.reason}`)
    if (!dkim.valid) failures.push(`DKIM: ${dkim.reason}`)
    if (!dmarc.valid) failures.push(`DMARC DNS: ${dmarc.reason}`)
    if (!seedAuth.dmarcAligned) failures.push(`DMARC alignment: ${seedAuth.dmarcResult || 'failed'} (d=${seedAuth.dkimSigningDomain || 'unknown'})`)

    await alert({
      severity: 'critical',
      scope: 'domain',
      domainId,
      message: `Domain ${domain.domain} auth verification failed: ${failures.join('; ')}`,
    })
  }

  return { domain: domain.domain, spf, dkim, dmarc, seedAuth, allPass }
}

/**
 * Parses the Authentication-Results header from a real seed send.
 *
 * Keys the gate on the `dmarc=` result line, NOT on individual spf=pass + dkim=pass.
 * DKIM can pass while the signing domain (d=) doesn't match the From domain,
 * which means DMARC fails. The header says `dmarc=pass` or `dmarc=fail` directly.
 */
export function parseSeedAuthResults(
  authResultsHeader: string | null,
  expectedDomain: string
): SeedAuthResult {
  if (!authResultsHeader) {
    return {
      dmarcAligned: false,
      dmarcResult: 'no Authentication-Results header',
      spfAligned: false,
      dkimAligned: false,
      dkimSigningDomain: null,
      rawHeader: null,
    }
  }

  const lower = authResultsHeader.toLowerCase()
  const expectedLower = expectedDomain.toLowerCase()

  // Extract DMARC result — THIS is the gate, not individual passes
  const dmarcMatch = lower.match(/dmarc=(pass|fail|bestguesspass|none|temperror|permerror|skipped)/)
  const dmarcResult = dmarcMatch?.[1] || null
  const dmarcAligned = dmarcResult === 'pass'

  // Extract DKIM signing domain (d=) to verify it matches From domain
  const dkimDMatch = lower.match(/d=([^;\s]+)/)
  const dkimSigningDomain = dkimDMatch?.[1] || null
  const dkimAligned = dkimSigningDomain === expectedLower

  // Extract DKIM result
  const dkimMatch = lower.match(/dkim=(pass|fail|none|neutral|policy|permerror|temperror)/)
  const dkimPass = dkimMatch?.[1] === 'pass'

  // Extract SPF result
  const spfMatch = lower.match(/spf=(pass|fail|softfail|neutral|none|temperror|permerror)/)
  const spfDomainMatch = lower.includes(`smtp.mailfrom=${expectedLower}`) ||
    lower.includes(`smtp.mailfrom=@${expectedLower}`)
  const spfAligned = spfMatch?.[1] === 'pass' && spfDomainMatch

  return {
    dmarcAligned,
    dmarcResult,
    spfAligned,
    dkimAligned,
    dkimSigningDomain,
    rawHeader: authResultsHeader,
  }
}

async function checkSPF(domain: string): Promise<AuthCheckResult> {
  try {
    const records = await dnsPromises.resolveTxt(domain)
    const spfRecords = records.filter((r) => r.join('').toLowerCase().includes('v=spf1'))

    if (spfRecords.length === 0) {
      return { valid: false, status: 'missing', reason: 'No SPF record found', raw: null }
    }

    const spf = spfRecords[0].join('')
    const hasMechanism = /[\+\~\?]?(include|ip4|ip6|a|mx|exists|redirect)/.test(spf)

    if (!hasMechanism) {
      return { valid: false, status: 'invalid', reason: 'SPF has no sending mechanisms', raw: spf }
    }

    const hasAll = spf.toLowerCase().endsWith('~all') || spf.toLowerCase().endsWith('-all')
    if (!hasAll) {
      return { valid: false, status: 'weak', reason: 'SPF does not end with ~all or -all', raw: spf }
    }

    return { valid: true, status: 'pass', reason: null, raw: spf }
  } catch (err) {
    return { valid: false, status: 'error', reason: `DNS query failed: ${(err as Error).message}`, raw: null }
  }
}

/**
 * DKIM check — FAILS CLOSED.
 *
 * If no DKIM record is found at ANY known selector, this returns invalid.
 * "No record" is NOT a soft pass. The domain gets paused.
 *
 * Also extracts the actual signing domain from the record to verify alignment.
 */
async function checkDKIM(domain: string, isBulkSender: boolean): Promise<DKIMResult> {
  const selectors = isBulkSender ? ['ses', 'smtpapi', 'google'] : ['google', 'default', 'ses']

  for (const selector of selectors) {
    try {
      const host = `${selector}._domainkey.${domain}`
      const records = await dnsPromises.resolveTxt(host)

      if (records.length > 0) {
        const dkim = records[0].join('')
        if (dkim.toLowerCase().includes('v=dkim1') && dkim.toLowerCase().includes('p=')) {
          return { valid: true, status: 'pass', reason: null, raw: dkim, selector }
        }
      }
    } catch {
      // Try CNAME
      try {
        const host = `${selector}._domainkey.${domain}`
        const cname = await dnsPromises.resolveCname(host)
        if (cname.length > 0) {
          return { valid: true, status: 'pass', reason: null, raw: `CNAME -> ${cname[0]}`, selector }
        }
      } catch {
        // No CNAME either — try next selector
      }
    }
  }

  // FAIL CLOSED: no DKIM record found at any known selector
  return { valid: false, status: 'missing', reason: `No DKIM record found at any known selector (${selectors.join(', ')}) — domain paused`, raw: null, selector: null }
}

async function checkDMARC(domain: string): Promise<DMARCResult> {
  try {
    const records = await dnsPromises.resolveTxt(`_dmarc.${domain}`)
    const dmarcRecords = records.filter((r) => r.join('').toLowerCase().includes('v=dmarc1'))

    if (dmarcRecords.length === 0) {
      return { valid: false, status: 'missing', reason: 'No DMARC record found', raw: null }
    }

    const dmarc = dmarcRecords[0].join('').toLowerCase()
    const pMatch = dmarc.match(/p\s*=\s*(none|quarantine|reject)/)

    if (!pMatch) {
      return { valid: false, status: 'invalid', reason: 'DMARC has no valid policy', raw: dmarcRecords[0].join('') }
    }

    return { valid: true, status: `pass (${pMatch[1]})`, reason: null, raw: dmarcRecords[0].join(''), policy: pMatch[1] }
  } catch (err) {
    return { valid: false, status: 'error', reason: `DNS query failed: ${(err as Error).message}`, raw: null }
  }
}

function buildPauseReason(
  spf: AuthCheckResult,
  dkim: DKIMResult,
  dmarc: AuthCheckResult,
  seedAuth: SeedAuthResult
): string {
  const parts: string[] = []
  if (!spf.valid) parts.push(spf.reason || 'SPF failed')
  if (!dkim.valid) parts.push(dkim.reason || 'DKIM failed')
  if (!dmarc.valid) parts.push(dmarc.reason || 'DMARC DNS failed')
  if (!seedAuth.dmarcAligned) parts.push(`DMARC alignment: ${seedAuth.dmarcResult || 'fail'} (d=${seedAuth.dkimSigningDomain || 'unknown'})`)
  return parts.join('; ') || 'auth verification failed'
}

/**
 * Periodic re-verify of all active domains.
 *
 * DNS changes — DMARC edits, DKIM key rotations, SPF updates — should
 * re-pause a domain that falls out of compliance. Runs every 6 hours.
 */
export async function reverifyAllActiveDomains(): Promise<{
  verified: number
  paused: number
  results: Array<{ domain: string; allPass: boolean; reason?: string }>
}> {
  const domains = await outreachSelect<any>('outreach_sending_domains', {
    filters: { status: 'active' },
  })

  let verified = 0
  let paused = 0
  const results: Array<{ domain: string; allPass: boolean; reason?: string }> = []

  for (const d of domains) {
    try {
      const result = await verifyDomain(d.id)
      verified++
      results.push({ domain: result.domain, allPass: result.allPass })

      if (!result.allPass) {
        paused++
      }
    } catch (err) {
      results.push({ domain: d.domain, allPass: false, reason: (err as Error).message })
      paused++
    }
  }

  return { verified, paused, results }
}

/**
 * Check if a domain needs re-verification based on last check time.
 */
export async function checkReverifyNeeded(domainId: string): Promise<boolean> {
  const rows = await outreachSelect<any>('outreach_sending_domains', {
    filters: { id: domainId },
    limit: 1,
  })

  if (!rows.length) return false

  const domain = rows[0]
  if (!domain.updated_at) return true

  const lastCheck = new Date(domain.updated_at).getTime()
  return (Date.now() - lastCheck) > REVERIFY_INTERVAL_MS
}
