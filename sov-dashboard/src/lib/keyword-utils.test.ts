import { describe, it, expect } from 'vitest'
import { normalizeKeyword, keywordDupeKey, dedupeKeywords } from './keyword-utils'

describe('normalizeKeyword', () => {
  it('collapses case, surrounding space and repeated whitespace', () => {
    expect(normalizeKeyword('  Best   Mixer Grinder ')).toBe('best mixer grinder')
  })

  it('treats full-width and composed forms as equal via NFKC', () => {
    expect(normalizeKeyword('ｍｉｘｅｒ')).toBe('mixer')
  })

  it('preserves non-latin scripts', () => {
    expect(normalizeKeyword('  मिक्सर ग्राइंडर  ')).toBe('मिक्सर ग्राइंडर')
  })
})

describe('keywordDupeKey', () => {
  it('scopes by language so the same text in two languages is distinct', () => {
    expect(keywordDupeKey('mixer grinder', 'en')).not.toBe(keywordDupeKey('mixer grinder', 'hi'))
  })
})

describe('dedupeKeywords', () => {
  it('drops case/whitespace variants that the DB unique constraint would miss', () => {
    const { unique, duplicates } = dedupeKeywords([
      { text: 'best mixer', language: 'en' },
      { text: 'Best  Mixer ', language: 'en' },
    ])
    expect(unique).toHaveLength(1)
    expect(duplicates).toEqual([{ text: 'Best  Mixer ', reason: 'within-input' }])
  })

  it('keeps the same text when the language differs', () => {
    const { unique, duplicates } = dedupeKeywords([
      { text: 'mixer grinder', language: 'en' },
      { text: 'mixer grinder', language: 'ta' },
    ])
    expect(unique).toHaveLength(2)
    expect(duplicates).toHaveLength(0)
  })

  it('flags collisions against keywords the campaign already has', () => {
    const { unique, duplicates } = dedupeKeywords(
      [{ text: 'BEST MIXER', language: 'en' }],
      [{ text: 'best mixer', language: 'en' }]
    )
    expect(unique).toHaveLength(0)
    expect(duplicates).toEqual([{ text: 'BEST MIXER', reason: 'already-exists' }])
  })

  it('trims stored text and skips blank lines', () => {
    const { unique } = dedupeKeywords([
      { text: '  spaced out  ', language: 'en' },
      { text: '   ', language: 'en' },
    ])
    expect(unique).toEqual([{ text: 'spaced out', language: 'en' }])
  })

  it('preserves extra fields such as type', () => {
    const { unique } = dedupeKeywords([{ text: 'a', language: 'en', type: 'branded' }])
    expect(unique[0]).toMatchObject({ type: 'branded' })
  })
})
