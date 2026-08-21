/**
 * Email syntax + MX validation with TTL cache.
 */

import dns from 'dns'
import { outreachInsert, outreachSelect, outreachUpdate } from './db'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getResolver(): dns.promises.Resolver {
  const resolver = new (dns.promises as any).Resolver()
  resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4'])
  return resolver as dns.promises.Resolver
}

interface ValidationResult {
  email: string
  syntax_valid: boolean
  mx_found: boolean
  is_valid: boolean
}

export async function validateEmail(email: string): Promise<ValidationResult> {
  const lower = email.toLowerCase().trim()

  const cached = await getCached(lower)
  if (cached) return cached

  const syntaxValid = EMAIL_RE.test(lower)
  if (!syntaxValid) {
    const result: ValidationResult = {
      email: lower,
      syntax_valid: false,
      mx_found: false,
      is_valid: false,
    }
    await cacheResult(result)
    return result
  }

  const domain = lower.split('@')[1]
  let mxFound = false
  try {
    const resolver = getResolver()
    const records = await resolver.resolveMx(domain)
    mxFound = Array.isArray(records) && records.length > 0
  } catch {
    mxFound = false
  }

  const result: ValidationResult = {
    email: lower,
    syntax_valid: true,
    mx_found: mxFound,
    is_valid: mxFound,
  }
  await cacheResult(result)
  return result
}

async function getCached(email: string): Promise<ValidationResult | null> {
  const rows = await outreachSelect<any>('outreach_validations', {
    filters: { email },
    limit: 1,
  })

  if (rows.length > 0) {
    const row = rows[0]
    const checkedAt = new Date(row.checked_at).getTime()
    if (Date.now() - checkedAt < CACHE_TTL_MS) {
      return {
        email: row.email,
        syntax_valid: row.syntax_valid,
        mx_found: row.mx_found,
        is_valid: row.is_valid,
      }
    }
  }
  return null
}

async function cacheResult(result: ValidationResult): Promise<void> {
  await outreachInsert('outreach_validations', {
    email: result.email,
    syntax_valid: result.syntax_valid,
    mx_found: result.mx_found,
    is_valid: result.is_valid,
    checked_at: new Date().toISOString(),
  }).catch(() => {
    // Duplicate email — update instead
    outreachUpdate('outreach_validations', 'email', result.email, {
      syntax_valid: result.syntax_valid,
      mx_found: result.mx_found,
      is_valid: result.is_valid,
      checked_at: new Date().toISOString(),
    }).catch(() => {})
  })
}
