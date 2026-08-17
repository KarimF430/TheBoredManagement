/**
 * Outreach Database Client
 *
 * Uses the existing Supabase client from cp-db.ts for all outreach tables.
 * All outreach tables use the `outreach_` prefix to avoid collisions.
 */

import { getCPClient } from '../cp-db'
import type { SupabaseClient } from '@supabase/supabase-js'

export function getOutreachClient(): SupabaseClient {
  return getCPClient()
}

/** Generic select with optional filters */
export async function outreachSelect<T = Record<string, unknown>>(
  table: string,
  opts?: {
    select?: string
    filters?: Record<string, unknown>
    order?: { column: string; ascending?: boolean }
    limit?: number
  }
): Promise<T[]> {
  const client = getOutreachClient()
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

  const { data, error } = await query
  if (error) throw new Error(`Select error on ${table}: ${error.message}`)
  return (data as T[]) || []
}

/** Insert and return row */
export async function outreachInsert<T = Record<string, unknown>>(
  table: string,
  row: Record<string, unknown>
): Promise<T | null> {
  const client = getOutreachClient()
  const { data, error } = await client.from(table).insert(row).select().single()
  if (error) throw new Error(`Insert error on ${table}: ${error.message}`)
  return data as T
}

/** Insert with upsert on conflict */
export async function outreachUpsert<T = Record<string, unknown>>(
  table: string,
  row: Record<string, unknown>,
  onConflict: string
): Promise<T | null> {
  const client = getOutreachClient()
  const { data, error } = await client
    .from(table)
    .upsert(row, { onConflict, ignoreDuplicates: false })
    .select()
    .single()
  if (error) throw new Error(`Upsert error on ${table}: ${error.message}`)
  return data as T
}

/** Update by column */
export async function outreachUpdate<T = Record<string, unknown>>(
  table: string,
  column: string,
  value: unknown,
  updates: Record<string, unknown>
): Promise<T[]> {
  const client = getOutreachClient()
  const { data, error } = await client
    .from(table)
    .update(updates)
    .eq(column, value)
    .select()
  if (error) throw new Error(`Update error on ${table}: ${error.message}`)
  return data || []
}

/** Update with custom filter */
export async function outreachUpdateWhere<T = Record<string, unknown>>(
  table: string,
  filters: Record<string, unknown>,
  updates: Record<string, unknown>
): Promise<T[]> {
  const client = getOutreachClient()
  let query = client.from(table).update(updates).select()
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value)
  }
  const { data, error } = await query
  if (error) throw new Error(`Update error on ${table}: ${error.message}`)
  return data || []
}

/** Delete by column */
export async function outreachDelete(
  table: string,
  column: string,
  value: unknown
): Promise<void> {
  const client = getOutreachClient()
  const { error } = await client.from(table).delete().eq(column, value)
  if (error) throw new Error(`Delete error on ${table}: ${error.message}`)
}

/** Count rows */
export async function outreachCount(
  table: string,
  filters?: Record<string, unknown>
): Promise<number> {
  const client = getOutreachClient()
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

/** Raw SQL via RPC (exec_sql must exist in Supabase) */
export async function outreachRawSQL<T = Record<string, unknown>>(
  sql: string
): Promise<T[]> {
  const client = getOutreachClient()
  const { data, error } = await client.rpc('exec_sql', { _sql: sql })
  if (error) throw new Error(`SQL error: ${error.message}`)
  return data as T[]
}
