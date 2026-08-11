/**
 * Campaign Panel — Database Client
 *
 * Fresh Supabase client for campaign panel tables.
 * Uses service role key for server-side operations.
 * All queries prefixed with cp_ tables.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

let _client: SupabaseClient | null = null

export function getCPClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _client
}

// ── Query Helpers ──────────────────────────────────────────────────

/** Run raw SQL via Supabase RPC (exec_sql must exist in DB) */
export async function execSQL<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = getCPClient()
  const { data, error } = await client.rpc('exec_sql', { _sql: sql })
  if (error) throw new Error(`SQL error: ${error.message}`)
  return data as T[]
}

/** Generic select with optional filters */
export async function cpSelect<T = Record<string, unknown>>(
  table: string,
  opts?: {
    select?: string
    filters?: Record<string, unknown>
    order?: { column: string; ascending?: boolean }
    limit?: number
    offset?: number
  }
): Promise<T[]> {
  const client = getCPClient()
  let query = client.from(table).select(opts?.select || '*')

  if (opts?.filters) {
    for (const [key, value] of Object.entries(opts.filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value)
      }
    }
  }

  if (opts?.order) {
    query = query.order(opts.order.column, { ascending: opts.order.ascending ?? false })
  }

  if (opts?.limit) {
    query = query.limit(opts.limit)
  }

  if (opts?.offset) {
    query = query.range(opts.offset, opts.offset + (opts.limit || 50) - 1)
  }

  const { data, error } = await query
  if (error) throw new Error(`Select error on ${table}: ${error.message}`)
  return (data as T[]) || []
}

/** Insert and return single row */
export async function cpInsert<T = Record<string, unknown>>(
  table: string,
  row: Record<string, unknown>
): Promise<T> {
  const client = getCPClient()
  const { data, error } = await client.from(table).insert(row).select().single()
  if (error) throw new Error(`Insert error on ${table}: ${error.message}`)
  return data as T
}

/** Update and return single row */
export async function cpUpdate<T = Record<string, unknown>>(
  table: string,
  id: string,
  updates: Record<string, unknown>
): Promise<T> {
  const client = getCPClient()
  const { data, error } = await client.from(table).update(updates).eq('id', id).select().single()
  if (error) throw new Error(`Update error on ${table}: ${error.message}`)
  return data as T
}

/** Delete by id */
export async function cpDelete(table: string, id: string): Promise<void> {
  const client = getCPClient()
  const { error } = await client.from(table).delete().eq('id', id)
  if (error) throw new Error(`Delete error on ${table}: ${error.message}`)
}

/** Count rows */
export async function cpCount(
  table: string,
  filters?: Record<string, unknown>
): Promise<number> {
  const client = getCPClient()
  let query = client.from(table).select('*', { count: 'exact', head: true })

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value)
      }
    }
  }

  const { count, error } = await query
  if (error) throw new Error(`Count error on ${table}: ${error.message}`)
  return count || 0
}

/** Insert multiple rows */
export async function cpInsertMany<T = Record<string, unknown>>(
  table: string,
  rows: Record<string, unknown>[]
): Promise<T[]> {
  const client = getCPClient()
  const { data, error } = await client.from(table).insert(rows).select()
  if (error) throw new Error(`Bulk insert error on ${table}: ${error.message}`)
  return (data as T[]) || []
}
