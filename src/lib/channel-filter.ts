/**
 * Channel eligibility filter for keyword scraping.
 *
 * Two independent checks, both applied to every search hit before it can be ranked:
 *
 *  1. Geography — the video must come from an Indian channel. YouTube exposes an
 *     optional `snippet.country` on channels.list. The rule is deliberately lenient:
 *     a channel is rejected only when it *declares* a country that is not IN.
 *     Channels that never set a country (a large share of genuine Indian creators)
 *     are kept. Countries are cached in `channel_profiles` so a channel costs quota
 *     at most once every CHANNEL_TTL_DAYS.
 *
 *  2. Ownership — brand-owned channels are excluded, because SOV measures what
 *     *creators* say about brands, not what brands say about themselves. Brand names
 *     come from the Amazon India brand master (data/brand-gazetteer.json, built from
 *     Amazon_India_Category_Brand_Master.csv) plus the brands attached to the campaign.
 *
 * Every DB interaction here is best-effort: if `channel_profiles` does not exist yet
 * the filter degrades to "fetch from API, don't cache" rather than failing the scrape.
 */

import { queryAll } from './supabase'
import { getChannelDetailsOAuth } from './youtube-oauth'
import { BRAND_MASTER_NAMES } from './brand-master'

const CHANNEL_TTL_DAYS = 30

/** Words that mark a channel as a brand's own presence rather than a creator. */
const OFFICIAL_MARKERS = [
  'official', 'india', 'global', 'electronics', 'store', 'support', 'care',
  'hq', 'corporate', 'company', 'brand', 'worldwide', 'group',
]

/** Suffixes that, combined with an exact brand name, still mean "the brand's channel". */
const BRAND_SUFFIXES = [
  ...OFFICIAL_MARKERS,
  'in', 'tv', 'music', 'audio', 'mobile', 'mobiles', 'tech', 'gaming',
  'home', 'appliances', 'world', 'channel', 'official channel', 'shorts',
]

// ── Name normalisation ─────────────────────────────────────────────────────

export function normalizeChannelName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Brand master (Amazon India CSV → gazetteer JSON) ───────────────────────

let _brandNames: string[] | null = null

/**
 * Canonical brand names only — never aliases. Aliases like "galaxy" or "iphone"
 * would wrongly exclude creator channels ("Galaxy Tech Reviews" is not Samsung).
 */
export function loadBrandMaster(): string[] {
  if (_brandNames) return _brandNames

  _brandNames = BRAND_MASTER_NAMES
  if (_brandNames.length === 0) {
    console.warn('[channel-filter] brand master is empty — brand-channel exclusion limited to campaign brands')
  }
  return _brandNames
}

/** Test-only: drop the memoised brand list. */
export function resetBrandMaster(): void {
  _brandNames = null
}

function tokenMatchAtStart(haystackTokens: string[], brandTokens: string[]): boolean {
  if (brandTokens.length === 0 || brandTokens.length > haystackTokens.length) return false
  return brandTokens.every((t, i) => haystackTokens[i] === t)
}

/**
 * Is this channel the brand's own channel?
 *
 * Conservative by design — a false positive silently deletes a legitimate creator
 * from every keyword they rank on:
 *   - exact name match                         → "Samsung"          = brand
 *   - brand + a single brand-ish suffix        → "Samsung India"    = brand
 *   - name starts with brand AND carries an
 *     official marker word                     → "boAt Lifestyle Official" = brand
 *   - short brand names (< 4 chars) only ever
 *     match exactly or with one suffix         → "MI" ≠ "Mi Tech Bros Vlogs"
 */
export function isBrandChannel(channelName: string, extraBrandNames: string[] = []): boolean {
  const channel = normalizeChannelName(channelName)
  if (!channel) return false

  const channelTokens = channel.split(' ')
  const brands = [...loadBrandMaster(), ...extraBrandNames]

  for (const rawBrand of brands) {
    const brand = normalizeChannelName(rawBrand)
    if (brand.length < 2) continue

    // 1. exact
    if (channel === brand) return true

    const brandTokens = brand.split(' ')

    // 2. brand + one suffix, in either order
    for (const suffix of BRAND_SUFFIXES) {
      if (channel === `${brand} ${suffix}` || channel === `${suffix} ${brand}`) return true
    }

    // 3. leading brand + an official marker somewhere in the name.
    //    Only for brand names long enough to be unambiguous.
    if (brand.length >= 4 && tokenMatchAtStart(channelTokens, brandTokens)) {
      const rest = channelTokens.slice(brandTokens.length)
      if (rest.some(t => OFFICIAL_MARKERS.includes(t))) return true
    }
  }

  return false
}

// ── Channel country, with a persistent cache ───────────────────────────────

export interface ChannelProfile {
  channel_id: string
  country: string | null
}

async function loadCachedCountries(channelIds: string[]): Promise<Map<string, string | null>> {
  const cached = new Map<string, string | null>()
  if (channelIds.length === 0) return cached

  try {
    const rows = await queryAll<{ channel_id: string; country: string | null }>(
      `SELECT channel_id, country FROM channel_profiles
       WHERE channel_id = ANY($1) AND checked_at > NOW() - INTERVAL '${CHANNEL_TTL_DAYS} days'`,
      [channelIds]
    )
    for (const r of rows) cached.set(r.channel_id, r.country)
  } catch {
    // channel_profiles not migrated yet — behave as a cold cache.
  }
  return cached
}

async function saveCachedCountries(
  entries: Array<{ channel_id: string; channel_name: string; country: string | null }>
): Promise<void> {
  if (entries.length === 0) return

  try {
    const values = entries.map(e => {
      const id = e.channel_id.replace(/'/g, "''")
      const name = (e.channel_name || '').replace(/'/g, "''")
      const country = e.country ? `'${e.country.replace(/'/g, "''")}'` : 'NULL'
      return `('${id}', '${name}', ${country}, NOW())`
    })
    await queryAll(
      `INSERT INTO channel_profiles (channel_id, channel_name, country, checked_at)
       VALUES ${values.join(', ')}
       ON CONFLICT (channel_id) DO UPDATE SET
         channel_name = EXCLUDED.channel_name,
         country = EXCLUDED.country,
         checked_at = EXCLUDED.checked_at`
    )
  } catch {
    // Cache writes are an optimisation — never fail a scrape over one.
  }
}

/**
 * Resolve the declared country for each channel.
 * Returns `null` for channels that declare nothing (or that could not be fetched).
 */
export async function resolveChannelCountries(
  channels: Array<{ channel_id: string; channel_name: string }>
): Promise<{ countries: Map<string, string | null>; quotaCost: number }> {
  const unique = new Map<string, string>()
  for (const c of channels) {
    if (c.channel_id) unique.set(c.channel_id, c.channel_name || '')
  }

  const ids = Array.from(unique.keys())
  const countries = await loadCachedCountries(ids)
  const missing = ids.filter(id => !countries.has(id))

  let quotaCost = 0
  const toCache: Array<{ channel_id: string; channel_name: string; country: string | null }> = []

  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50)
    try {
      const fetched = await getChannelDetailsOAuth(batch)
      quotaCost += 1
      for (const id of batch) {
        const country = fetched.get(id) ?? null
        countries.set(id, country)
        toCache.push({ channel_id: id, channel_name: unique.get(id) ?? '', country })
      }
    } catch (err) {
      console.error('[channel-filter] channel country lookup failed:', err)
      // Unknown country ⇒ keep the channel. Do not cache a failed lookup.
      for (const id of batch) countries.set(id, null)
    }
  }

  await saveCachedCountries(toCache)

  return { countries, quotaCost }
}

export type RejectReason = 'foreign_channel' | 'brand_channel'

export interface EligibilityResult<T> {
  eligible: T[]
  rejected: Array<{ hit: T; reason: RejectReason }>
  quotaCost: number
}

/**
 * Split search hits into creator-eligible and rejected, preserving input order.
 * Order matters: callers rely on it to keep true YouTube result positions.
 */
export async function filterEligibleChannels<
  T extends { channel_id: string; channel_name: string }
>(hits: T[], campaignBrandNames: string[] = []): Promise<EligibilityResult<T>> {
  if (hits.length === 0) return { eligible: [], rejected: [], quotaCost: 0 }

  const { countries, quotaCost } = await resolveChannelCountries(hits)

  const eligible: T[] = []
  const rejected: Array<{ hit: T; reason: RejectReason }> = []

  for (const hit of hits) {
    const country = countries.get(hit.channel_id) ?? null
    if (country && country !== 'IN') {
      rejected.push({ hit, reason: 'foreign_channel' })
      continue
    }
    if (isBrandChannel(hit.channel_name, campaignBrandNames)) {
      rejected.push({ hit, reason: 'brand_channel' })
      continue
    }
    eligible.push(hit)
  }

  return { eligible, rejected, quotaCost }
}
