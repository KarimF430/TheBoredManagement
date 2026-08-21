/**
 * Cron route auth helper.
 *
 * If CRON_SECRET is set, enforces Bearer token auth.
 * If CRON_SECRET is not set (local dev), allows all requests.
 */

import { NextResponse } from 'next/server'
import { outreachConfig } from './config'

export function verifyCronAuth(req: Request): NextResponse | null {
  const secret = outreachConfig.cron.secret
  if (!secret) return null // No secret configured — allow (local dev)

  const authHeader = req.headers.get('authorization')
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null // Authorized
}
