'use client'

interface MetricStatProps {
  label: string
  value: number | string
  provenance: 'verified' | 'self_reported' | 'enriched' | 'unknown'
  format?: 'number' | 'views' | 'rate'
}

function formatValue(value: number | string, format: string): string {
  if (typeof value === 'string') return value
  if (format === 'rate') return `${value}%`
  if (format === 'views') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
    return value.toLocaleString('en-IN')
  }
  return value.toLocaleString('en-IN')
}

export default function MetricStat({ label, value, provenance, format = 'number' }: MetricStatProps) {
  const isVerified = provenance === 'verified' || provenance === 'enriched'

  return (
    <div
      className="flex items-center justify-between p-3 rounded-xl"
      style={{
        background: 'rgba(22,20,40,0.4)',
        border: '1px solid var(--onb-border)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--onb-font-body)',
          fontSize: 12,
          color: 'var(--onb-text-dim)',
        }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span
          style={{
            fontFamily: 'var(--onb-font-mono)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--onb-text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatValue(value, format)}
        </span>
        {isVerified ? (
          <span className="onb-verified">Verified</span>
        ) : provenance === 'self_reported' ? (
          <span className="onb-provisional">Self-reported</span>
        ) : null}
      </div>
    </div>
  )
}
