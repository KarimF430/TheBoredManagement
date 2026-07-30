/**
 * Language codes are interpolated into raw SQL by the dashboard queries, so
 * anything that isn't a plain ISO-639-1 code must be rejected here rather than
 * reaching the query builder. Returns null for 'all', absent, or malformed
 * input, which callers treat as "no language filter".
 */
export function parseLanguageParam(raw: string | null | undefined): string | null {
  if (!raw || raw === 'all') return null
  return /^[a-z]{2}$/.test(raw) ? raw : null
}

/**
 * Duplicate detection key for a keyword.
 *
 * The DB's UNIQUE(campaign_id, text) constraint is a byte-exact match, so
 * "Best Mixer" / "best  mixer" / "best mixer " all slip through as separate
 * rows. Callers compare normalizeKeyword() values instead, and must scope the
 * comparison by language: the same string is a legitimate separate target in
 * two languages.
 */
export function normalizeKeyword(text: string): string {
  return text
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function keywordDupeKey(text: string, language: string): string {
  return `${language}::${normalizeKeyword(text)}`
}

export interface DedupeResult<T> {
  unique: T[]
  duplicates: { text: string; reason: 'within-input' | 'already-exists' }[]
}

/**
 * Splits incoming keywords into those safe to insert and those that collide,
 * either with each other or with what the campaign already has.
 */
export function dedupeKeywords<T extends { text: string; language: string }>(
  incoming: T[],
  existing: { text: string; language: string }[] = []
): DedupeResult<T> {
  const seen = new Set(existing.map(k => keywordDupeKey(k.text, k.language)))
  const unique: T[] = []
  const duplicates: { text: string; reason: 'within-input' | 'already-exists' }[] = []

  for (const item of incoming) {
    if (!item.text.trim()) continue
    const key = keywordDupeKey(item.text, item.language)
    if (seen.has(key)) {
      duplicates.push({ text: item.text, reason: unique.some(u => keywordDupeKey(u.text, u.language) === key) ? 'within-input' : 'already-exists' })
      continue
    }
    seen.add(key)
    unique.push({ ...item, text: item.text.trim() })
  }

  return { unique, duplicates }
}
