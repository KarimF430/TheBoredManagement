'use client'

import { create } from 'zustand'

export type OwnershipFilter = 'all' | 'ours' | 'theirs'
export type FormatFilter = 'all' | 'long' | 'short'
export type DateRangePreset = '24h' | '48h' | '1W' | '1M' | 'All' | 'Custom'

interface FilterStore {
  search: string
  ownership: OwnershipFilter
  format: FormatFilter
  dateRange: DateRangePreset
  customDateFrom: string
  customDateTo: string
  setSearch: (s: string) => void
  setOwnership: (o: OwnershipFilter) => void
  setFormat: (f: FormatFilter) => void
  setDateRange: (d: DateRangePreset) => void
  setCustomDateFrom: (d: string) => void
  setCustomDateTo: (d: string) => void
  resetFilters: () => void
}

export const useFilterStore = create<FilterStore>()((set) => ({
  search: '',
  ownership: 'all',
  format: 'all',
  dateRange: 'All',
  customDateFrom: '',
  customDateTo: '',
  setSearch: (search) => set({ search }),
  setOwnership: (ownership) => set({ ownership }),
  setFormat: (format) => set({ format }),
  setDateRange: (dateRange) => set({ dateRange }),
  setCustomDateFrom: (customDateFrom) => set({ customDateFrom }),
  setCustomDateTo: (customDateTo) => set({ customDateTo }),
  resetFilters: () => set({ search: '', ownership: 'all', format: 'all', dateRange: 'All', customDateFrom: '', customDateTo: '' }),
}))
