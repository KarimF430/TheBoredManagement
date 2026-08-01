'use client'

import { Filter, RefreshCw } from 'lucide-react'
import { useFilterStore } from '@/lib/filter-store'

const LANG_LABELS: Record<string, string> = {
  en: 'English', hi: 'Hinglish', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', kn: 'Kannada',
  bn: 'Bengali', mr: 'Marathi', gu: 'Gujarati', pa: 'Punjabi', or: 'Odia', as: 'Assamese',
}

interface SharedFilterBarProps {
  children?: React.ReactNode
  /** Extra condition to show Reset beyond the global store's active filters */
  hasActiveFilters?: boolean
  /** Custom reset handler that also clears page-specific filters */
  onReset?: () => void
  /** Show Views Update button */
  showViewsUpdate?: boolean
  /** Callback when Views Update is clicked */
  onViewsUpdate?: () => void
  /** Whether Views Update is currently loading */
  isViewsUpdating?: boolean
  style?: React.CSSProperties
  /** Available languages from campaign data */
  languages?: string[]
  /** Hide the language filter (for pages that have their own) */
  hideLanguageFilter?: boolean
}

const FORMAT_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'long', label: 'Long Format' },
  { value: 'short', label: 'Short Format' },
]

const DATE_RANGE_OPTIONS = [
  { value: '24h', label: '24h' },
  { value: '48h', label: '48h' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: 'All', label: 'All' },
  { value: 'Custom', label: 'Custom' },
]

export default function SharedFilterBar({ children, hasActiveFilters, onReset, showViewsUpdate, onViewsUpdate, isViewsUpdating, style, languages = [], hideLanguageFilter }: SharedFilterBarProps) {
  const {
    ownership, format, dateRange, customDateFrom, customDateTo, language,
    setOwnership, setFormat, setDateRange, setCustomDateFrom, setCustomDateTo, setLanguage,
    resetFilters,
  } = useFilterStore()
  const globalActive = ownership !== 'all' || format !== 'all' || dateRange !== 'All' || customDateFrom !== '' || customDateTo !== '' || language !== 'all'
  const showReset = globalActive || hasActiveFilters

  const handleReset = () => {
    resetFilters()
    onReset?.()
  }

  return (
    <div className="filter-bar" style={style}>
      {/* Format Toggle */}
      <div className="toggle-group compact" style={{ flexShrink: 0 }}>
        {FORMAT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`toggle-btn${format === opt.value ? ' active' : ''}`}
            onClick={() => setFormat(opt.value as any)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Ownership */}
      <div style={{ minWidth: 140, flexShrink: 0 }}>
        <select
          className={`input${ownership !== 'all' ? ' is-filtered' : ''}`}
          value={ownership}
          onChange={e => setOwnership(e.target.value as any)}
          style={{ cursor: 'pointer', padding: '6px 12px' }}
        >
          <option value="all">All Videos</option>
          <option value="ours">Our Videos</option>
          <option value="theirs">Not Our Videos</option>
        </select>
      </div>

      {/* Date Range Toggle */}
      <div className="toggle-group compact" style={{ flexShrink: 0 }}>
        {DATE_RANGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`toggle-btn${dateRange === opt.value ? ' active' : ''}`}
            onClick={() => setDateRange(opt.value as any)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {dateRange === 'Custom' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 'var(--fs-label)', fontWeight: 600, color: 'var(--text-muted)' }}>From</span>
            <input
              type="date"
              value={customDateFrom}
              onChange={e => setCustomDateFrom(e.target.value)}
              className="input"
              style={{ padding: '6px 8px', fontSize: 11.5 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 'var(--fs-label)', fontWeight: 600, color: 'var(--text-muted)' }}>To</span>
            <input
              type="date"
              value={customDateTo}
              onChange={e => setCustomDateTo(e.target.value)}
              className="input"
              style={{ padding: '6px 8px', fontSize: 11.5 }}
            />
          </div>
        </>
      )}

      {/* Language Filter */}
      {!hideLanguageFilter && languages.length > 0 && (
        <div style={{ minWidth: 150, flexShrink: 0 }}>
          <select
            className={`input${language !== 'all' ? ' is-filtered' : ''}`}
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={{ cursor: 'pointer', padding: '6px 12px', fontSize: 12, fontWeight: 600 }}
          >
            <option value="all">🌐 All Languages</option>
            {languages.map(l => (
              <option key={l} value={l}>{LANG_LABELS[l] || l}</option>
            ))}
          </select>
        </div>
      )}

      {/* Page-specific filters */}
      {children}

      {/* Views Update */}
      {showViewsUpdate && (
        <button className="btn btn-ghost btn-sm" onClick={onViewsUpdate} disabled={isViewsUpdating} data-tutorial="views-update"
          style={{ flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={12} style={{ animation: isViewsUpdating ? 'spin 1s linear infinite' : 'none' }} />
          {isViewsUpdating ? 'Updating…' : 'Views Update'}
        </button>
      )}

      {/* Active filter highlight badge */}
      {globalActive && (
        <div className="filter-count">
          <Filter size={11} />
          {[ownership !== 'all' && 'ownership', format !== 'all' && 'format', dateRange !== 'All' && 'date', language !== 'all' && 'language'].filter(Boolean).length} active
        </div>
      )}

      {/* Reset */}
      {showReset && (
        <button className="btn btn-ghost btn-sm" onClick={handleReset} style={{ color: 'var(--danger)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          Reset Filters
        </button>
      )}
    </div>
  )
}
