'use client'

import { Filter, RefreshCw } from 'lucide-react'
import { useFilterStore } from '@/lib/filter-store'

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

export default function SharedFilterBar({ children, hasActiveFilters, onReset, showViewsUpdate, onViewsUpdate, isViewsUpdating, style }: SharedFilterBarProps) {
  const {
    ownership, format, dateRange, customDateFrom, customDateTo,
    setOwnership, setFormat, setDateRange, setCustomDateFrom, setCustomDateTo,
    resetFilters,
  } = useFilterStore()
  const globalActive = ownership !== 'all' || format !== 'all' || dateRange !== 'All' || customDateFrom !== '' || customDateTo !== ''
  const showReset = globalActive || hasActiveFilters

  const handleReset = () => {
    resetFilters()
    onReset?.()
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', ...style }}>
      {/* Format Toggle */}
      <div style={{ display: 'flex', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
        {FORMAT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFormat(opt.value as any)}
            style={{
              padding: '6px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              background: format === opt.value ? '#1A73E8' : 'transparent',
              color: format === opt.value ? '#FFF' : '#64748B',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Ownership */}
      <div style={{ minWidth: 140 }}>
        <select
          className="input"
          value={ownership}
          onChange={e => setOwnership(e.target.value as any)}
          style={{ cursor: 'pointer', padding: '6px 12px', borderColor: ownership !== 'all' ? '#EF4444' : undefined }}
        >
          <option value="all">All Videos</option>
          <option value="ours">Our Videos</option>
          <option value="theirs">Not Our Videos</option>
        </select>
      </div>

      {/* Date Range Toggle */}
      <div style={{ display: 'flex', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
        {DATE_RANGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setDateRange(opt.value as any)}
            style={{
              padding: '6px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              background: dateRange === opt.value ? '#1A73E8' : 'transparent',
              color: dateRange === opt.value ? '#FFF' : '#64748B',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {dateRange === 'Custom' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>From</span>
            <input
              type="date"
              value={customDateFrom}
              onChange={e => setCustomDateFrom(e.target.value)}
              style={{ padding: '6px 8px', fontSize: 11.5, border: '1px solid #E2E8F0', borderRadius: 6, background: '#FFF', color: '#475569', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>To</span>
            <input
              type="date"
              value={customDateTo}
              onChange={e => setCustomDateTo(e.target.value)}
              style={{ padding: '6px 8px', fontSize: 11.5, border: '1px solid #E2E8F0', borderRadius: 6, background: '#FFF', color: '#475569', fontFamily: 'inherit' }}
            />
          </div>
        </>
      )}

      {/* Page-specific filters */}
      {children}

      {/* Views Update */}
      {showViewsUpdate && (
        <button onClick={onViewsUpdate} disabled={isViewsUpdating}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFF', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={12} style={{ animation: isViewsUpdating ? 'spin 1s linear infinite' : 'none' }} />
          {isViewsUpdating ? 'Updating…' : 'Views Update'}
        </button>
      )}

      {/* Active filter highlight badge */}
      {globalActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 10, fontWeight: 700, color: '#DC2626', whiteSpace: 'nowrap' }}>
          <Filter size={11} />
          {[ownership !== 'all' && 'ownership', format !== 'all' && 'format', dateRange !== 'All' && 'date'].filter(Boolean).length} active
        </div>
      )}

      {/* Reset */}
      {showReset && (
        <button className="btn btn-ghost btn-sm" onClick={handleReset} style={{ color: '#EF4444' }}>
          Reset Filters
        </button>
      )}
    </div>
  )
}
