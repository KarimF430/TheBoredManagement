// Shared brand color utility — single source of truth across all components
// Deterministic hash-based assignment ensures "Aquaguard" always gets the same color
// regardless of which tab or page renders it.

const PALETTE = [
  '#4C78A8', '#54A24B', '#E45756', '#2F7D7A', '#B45309',
  '#7E4D74', '#C94A5E', '#9D755D', '#6B645C', '#A8476F',
  '#CC5800', '#4C78A8', '#54A24B', '#E45756', '#2F7D7A',
  '#1D6BD6', '#3E8E5F', '#C4643A', '#8A63A8', '#A16207',
]

// Global cache — persists across all components in the same page
const GLOBAL_CACHE: Record<string, string> = {}

export function brandColor(name: string): string {
  if (GLOBAL_CACHE[name]) return GLOBAL_CACHE[name]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  const c = PALETTE[Math.abs(hash) % PALETTE.length]
  GLOBAL_CACHE[name] = c
  return c
}

// For cases where you need the palette index (e.g., for chart Cell colors)
export function brandColorIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return Math.abs(hash) % PALETTE.length
}

export { PALETTE }
