import { Pool, types as pgTypes, type PoolConfig } from 'pg'

/**
 * Return BIGINT/NUMERIC as JS numbers, matching what the exec_sql RPC path
 * produced.
 *
 * node-postgres defaults these to *strings* (int8 can exceed Number.MAX_SAFE_
 * INTEGER, so it refuses to guess). The RPC path went through JSON, where they
 * arrived as numbers. Callers all over the app do `sum + row.total_views`, so
 * strings turn addition into concatenation — "147..." + "147..." produced view
 * counts like 9.16e+124 on the Creators page.
 *
 * Safe here: the values are view counts and row counts (~1e10 at most), far
 * below the 2^53 precision limit. Anything that could genuinely exceed that
 * would have been broken on the JSON path too.
 */
const OID_INT8 = 20
const OID_NUMERIC = 1700

const toNumber = (v: string | null) => (v === null ? null : Number(v))
pgTypes.setTypeParser(OID_INT8, toNumber)
pgTypes.setTypeParser(OID_NUMERIC, toNumber)

/**
 * Direct pooled Postgres access.
 *
 * Everything used to go through Supabase's PostgREST `exec_sql` RPC, which
 * makes each raw SQL statement a separate HTTPS round-trip. `/api/dashboard`
 * issues 21 of them and `/api/dashboard/kpis` another 10, so a single Overview
 * load paid ~31 TLS round-trips before any SQL even ran.
 *
 * DATABASE_URL already points at Supabase's transaction pooler (port 6543),
 * which is the right target for serverless: many short-lived function
 * instances sharing a small server-side connection pool.
 *
 * Two constraints matter for pgBouncer transaction mode:
 *  - No *named* prepared statements. node-postgres only uses named statements
 *    when a query is given a `name`, so the default unnamed extended-protocol
 *    path is safe. Never add `name:` to a query here.
 *  - Keep `max` small. Each warm instance holds its own pool, so a large max
 *    multiplied across instances exhausts the pooler.
 */

const DATABASE_URL = process.env.DATABASE_URL

let _pool: Pool | null = null

/**
 * Circuit breaker.
 *
 * A misconfigured DATABASE_URL (e.g. the retired `db.<ref>.supabase.co` host,
 * which no longer resolves) would otherwise make every single query pay a
 * failed connection attempt before falling back to the RPC path — strictly
 * slower than not trying at all. After a couple of connection-level failures
 * we stop attempting direct pg for the lifetime of this instance.
 */
let connectionFailures = 0
const MAX_CONNECTION_FAILURES = 2

export function hasDirectPg(): boolean {
  return !!DATABASE_URL && connectionFailures < MAX_CONNECTION_FAILURES
}

export function reportPgConnectionFailure(): void {
  connectionFailures++
  if (connectionFailures === MAX_CONNECTION_FAILURES) {
    console.error(
      `[pg] Disabling direct Postgres after ${MAX_CONNECTION_FAILURES} connection failures; ` +
      `all SQL will use the slower exec_sql RPC path. Fix DATABASE_URL to restore performance ` +
      `(Supabase Dashboard > Project Settings > Database > Connection string > Transaction pooler).`
    )
  }
}

export function getPool(): Pool {
  if (_pool) return _pool
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

  const config: PoolConfig = {
    connectionString: DATABASE_URL,
    // Supabase terminates TLS with a cert chain Node doesn't ship a root for.
    ssl: { rejectUnauthorized: false },
    // Routes fan out heavily — /api/dashboard alone issues 21 queries in
    // parallel. A small pool serialises them into waves: measured against this
    // project, max=3 took 540ms for that burst vs 123ms at max=15, which is
    // where it plateaus (Supavisor's own default pool size). Supavisor
    // multiplexes many client connections onto far fewer server ones, so a
    // pool this size per instance is safe.
    max: Number(process.env.PG_POOL_MAX ?? 15),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Don't let one pathological query pin a pooled connection.
    statement_timeout: 25_000,
    query_timeout: 25_000,
    application_name: 'sov-dashboard',
  }

  _pool = new Pool(config)

  // A pool error (e.g. server closed an idle connection) must not take the
  // process down — the next acquire will just open a fresh connection.
  _pool.on('error', (err) => {
    console.error('pg pool error (recovering):', err.message)
  })

  return _pool
}

export async function pgQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const res = await getPool().query(sql, params)
  return res.rows as T[]
}
