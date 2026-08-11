'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  selectable?: boolean
  onRowClick?: (item: T) => void
  emptyMessage?: string
  keyExtractor: (item: T) => string
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize = 10,
  selectable = false,
  onRowClick,
  emptyMessage = 'No data found',
  keyExtractor,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }, [data, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleSelectAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(paged.map(keyExtractor)))
    }
  }

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 40 }}>
                  <button
                    onClick={toggleSelectAll}
                    style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: `1.5px solid ${selected.size === paged.length && paged.length > 0 ? 'var(--blue)' : 'var(--border-2)'}`,
                      background: selected.size === paged.length && paged.length > 0 ? 'var(--blue)' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    {selected.size === paged.length && paged.length > 0 && (
                      <Check size={12} style={{ color: '#FFF' }} />
                    )}
                  </button>
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.sortable ? 'table-sortable' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left',
                    cursor: col.sortable ? 'pointer' : 'default',
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                  }}>
                    {col.label}
                    {col.sortable && (
                      <span className="sort-icon" style={{ display: 'flex', flexDirection: 'column', lineHeight: 0 }}>
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : (
                          <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                  {emptyMessage}
                </td>
              </tr>
            )}
            {paged.map(item => {
              const key = keyExtractor(item)
              const isSelected = selected.has(key)
              return (
                <tr
                  key={key}
                  className={`table-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => onRowClick?.(item)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {selectable && (
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelect(key)}
                        style={{
                          width: 18, height: 18, borderRadius: 4,
                          border: `1.5px solid ${isSelected ? 'var(--blue)' : 'var(--border-2)'}`,
                          background: isSelected ? 'var(--blue)' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        {isSelected && <Check size={12} style={{ color: '#FFF' }} />}
                      </button>
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? col.render(item) : String(item[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)',
        }}>
          <span>
            {selected.size > 0 ? `${selected.size} selected` : `${sorted.length} items`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-1)',
                background: page === 0 ? 'transparent' : '#FFF',
                cursor: page === 0 ? 'default' : 'pointer',
                opacity: page === 0 ? 0.4 : 1,
                fontSize: 12, fontFamily: 'inherit',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontWeight: 600 }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-1)',
                background: page >= totalPages - 1 ? 'transparent' : '#FFF',
                cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.4 : 1,
                fontSize: 12, fontFamily: 'inherit',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
