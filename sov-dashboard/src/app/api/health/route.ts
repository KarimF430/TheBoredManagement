import { NextResponse } from 'next/server'
import { hasDirectPg, getPool } from '@/lib/pg'
import { redis } from '@/lib/cache'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Infrastructure health probe.
 *
 * Both the direct Postgres connection and the Redis L2 cache degrade
 * *silently* when misconfigured — the app keeps working, just far slower,
 * which is exactly how a dead DATABASE_URL and a deleted Upstash instance
 * went unnoticed. This endpoint makes that state visible.
 *
 * GET /api/health
 */
export async function GET() {
  const checks: Record<string, unknown> = {}

  // ── Direct Postgres (fast path for all raw SQL) ──
  const pgStart = Date.now()
  if (!process.env.DATABASE_URL) {
    checks.postgres = { status: 'not_configured', impact: 'All SQL falls back to exec_sql RPC (~10-20x slower)' }
  } else if (!hasDirectPg()) {
    checks.postgres = { status: 'circuit_open', impact: 'Disabled after repeated connection failures; using exec_sql RPC' }
  } else {
    try {
      await getPool().query('SELECT 1')
      checks.postgres = { status: 'ok', latency_ms: Date.now() - pgStart }
    } catch (e: any) {
      checks.postgres = {
        status: 'error',
        code: e.code,
        message: e.message,
        impact: 'All SQL falls back to exec_sql RPC (~10-20x slower)',
        hint: 'Supabase Dashboard > Project Settings > Database > Connection string > Transaction pooler (port 6543)',
      }
    }
  }

  // ── Redis L2 cache (shared across serverless instances) ──
  const redisStart = Date.now()
  if (!redis) {
    checks.redis = {
      status: 'not_configured',
      impact: 'Only per-instance L1 memory cache; cold on most serverless invocations, so cached routes recompute constantly',
    }
  } else {
    try {
      await redis.set('sov:healthcheck', Date.now(), { ex: 30 })
      await redis.get('sov:healthcheck')
      checks.redis = { status: 'ok', latency_ms: Date.now() - redisStart }
    } catch (e: any) {
      checks.redis = {
        status: 'error',
        message: e.message,
        impact: 'Only per-instance L1 memory cache; cached routes recompute constantly',
        hint: 'Verify the Upstash database still exists and UPSTASH_REDIS_REST_URL/TOKEN are current',
      }
    }
  }

  // ── Supabase REST (the fallback transport, must always work) ──
  const restStart = Date.now()
  try {
    const { error } = await supabase.from('campaigns').select('id', { count: 'exact', head: true })
    checks.supabase_rest = error
      ? { status: 'error', message: error.message }
      : { status: 'ok', latency_ms: Date.now() - restStart }
  } catch (e: any) {
    checks.supabase_rest = { status: 'error', message: e.message }
  }

  const degraded = Object.values(checks).some(
    (c) => (c as any).status !== 'ok'
  )

  return NextResponse.json(
    { status: degraded ? 'degraded' : 'ok', checks },
    { status: degraded ? 503 : 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
