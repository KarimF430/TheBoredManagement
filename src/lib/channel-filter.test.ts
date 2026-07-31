import { describe, it, expect } from 'vitest'
import { isBrandChannel, normalizeChannelName, loadBrandMaster } from './channel-filter'

describe('normalizeChannelName', () => {
  it('strips punctuation, casing and diacritics', () => {
    expect(normalizeChannelName('  boAt-Lifestyle™  ')).toBe('boat lifestyle')
    expect(normalizeChannelName('Tech & Tea')).toBe('tech and tea')
  })
})

describe('loadBrandMaster', () => {
  it('loads the Amazon India brand master', () => {
    const brands = loadBrandMaster()
    expect(brands.length).toBeGreaterThan(100)
    expect(brands).toContain('Samsung')
  })
})

describe('isBrandChannel', () => {
  it('excludes a brand’s own channel', () => {
    expect(isBrandChannel('Samsung')).toBe(true)
    expect(isBrandChannel('Samsung India')).toBe(true)
    expect(isBrandChannel('boAt Lifestyle Official')).toBe(true)
    expect(isBrandChannel('OnePlus India')).toBe(true)
  })

  it('excludes campaign brands that are not in the master list', () => {
    expect(isBrandChannel('Acme Widgets India', ['Acme Widgets'])).toBe(true)
    expect(isBrandChannel('Acme Widgets', ['Acme Widgets'])).toBe(true)
  })

  it('keeps creators who merely mention a brand', () => {
    expect(isBrandChannel('Technical Guruji')).toBe(false)
    expect(isBrandChannel('Samsung Galaxy Fan Reviews')).toBe(false)
    expect(isBrandChannel('Trakin Tech')).toBe(false)
    expect(isBrandChannel('Geekyranjit')).toBe(false)
    expect(isBrandChannel('C4ETech')).toBe(false)
  })

  it('does not let short brand names swallow creator channels', () => {
    // "Mi" / "HP" style names must not match by prefix alone
    expect(isBrandChannel('Mi Tech Bros Vlogs')).toBe(false)
    expect(isBrandChannel('HP Gaming Clips Daily')).toBe(false)
  })

  it('handles empty and junk input', () => {
    expect(isBrandChannel('')).toBe(false)
    expect(isBrandChannel('   ')).toBe(false)
    expect(isBrandChannel('!!!')).toBe(false)
  })
})
