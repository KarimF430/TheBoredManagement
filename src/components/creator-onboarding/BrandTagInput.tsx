'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface BrandTag {
  name: string
  provenance: 'self_reported' | 'verified' | 'enriched'
}

interface BrandTagInputProps {
  brands: BrandTag[]
  onChange: (brands: BrandTag[]) => void
  verifiedBrands?: BrandTag[]
}

const MAX_BRANDS = 5

export default function BrandTagInput({ brands, onChange, verifiedBrands = [] }: BrandTagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addBrand = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed || brands.length >= MAX_BRANDS) return

    // Dedupe
    const exists = brands.some(b => b.name.toLowerCase() === trimmed.toLowerCase())
    if (exists) return

    // Simple noise filter
    if (trimmed.length < 2 || /^\d+$/.test(trimmed)) return

    onChange([...brands, { name: trimmed, provenance: 'self_reported' }])
    setInput('')
  }, [brands, onChange])

  const removeBrand = useCallback((index: number) => {
    onChange(brands.filter((_, i) => i !== index))
  }, [brands, onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addBrand(input)
    }
    if (e.key === 'Backspace' && !input && brands.length > 0) {
      removeBrand(brands.length - 1)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="onb-label">Brands you've worked with</div>
        <p style={{ fontSize: 12, color: 'var(--onb-text-muted)', fontFamily: 'var(--onb-font-body)' }}>
          Optional — type a brand name and press enter
        </p>
      </div>

      {/* Tag input area */}
      <div
        className="onb-input flex flex-wrap items-center gap-2"
        style={{ minHeight: 44, cursor: 'text' }}
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence>
          {brands.map((brand, i) => (
            <motion.span
              key={`${brand.name}-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{
                background: brand.provenance === 'verified' || brand.provenance === 'enriched'
                  ? 'var(--onb-green-dim)' : 'var(--onb-violet-dim)',
                color: brand.provenance === 'verified' || brand.provenance === 'enriched'
                  ? 'var(--onb-green)' : 'var(--onb-violet)',
                fontFamily: 'var(--onb-font-body)',
              }}
            >
              {brand.name}
              {brand.provenance === 'verified' && (
                <span style={{ fontSize: 8 }}>✓</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); removeBrand(i) }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', opacity: 0.6 }}
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        {brands.length < MAX_BRANDS && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (input.trim()) addBrand(input) }}
            placeholder={brands.length === 0 ? 'Type a brand, press enter' : 'Add more...'}
            style={{
              flex: 1,
              minWidth: 80,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--onb-text)',
              fontFamily: 'var(--onb-font-body)',
              fontSize: 13,
            }}
          />
        )}
      </div>

      {/* Cap hint */}
      <div style={{ fontSize: 10, color: 'var(--onb-text-muted)', fontFamily: 'var(--onb-font-body)' }}>
        {brands.length}/{MAX_BRANDS} brands
      </div>

      {/* Verified brands (from enrichment) */}
      {verifiedBrands.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--onb-green)', fontWeight: 600, marginBottom: 6, fontFamily: 'var(--onb-font-body)' }}>
            Verified collaborations
          </div>
          <div className="flex flex-wrap gap-2">
            {verifiedBrands.map((brand, i) => (
              <span
                key={`verified-${i}`}
                className="onb-verified"
              >
                {brand.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
