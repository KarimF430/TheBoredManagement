'use client'

function Bar({ width = '100%', height = 12, radius = 6, style = {} }: { width?: string | number; height?: string | number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="skeleton-line"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  )
}

/* Deterministic variation so the skeleton reads as varied but never changes
   between renders (Math.random here would be impure). */
const jitter = (i: number, span: number) => (i * 37 + 13) % span

export function PageSkeleton({ rows = 3, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Bar width={220} height={24} radius={6} style={{ marginBottom: 8 }} />
          <Bar width={320} height={12} radius={4} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Bar width={80} height={32} radius={8} />
          <Bar width={80} height={32} radius={8} />
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 24 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="card" style={{ padding: '16px 18px' }}>
            <Bar width={60} height={10} radius={4} style={{ marginBottom: 10 }} />
            <Bar width={100} height={22} radius={6} style={{ marginBottom: 6 }} />
            <Bar width={70} height={10} radius={4} />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
        <Bar width={180} height={14} radius={4} style={{ marginBottom: 6 }} />
        <Bar width={280} height={10} radius={4} style={{ marginBottom: 20 }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Bar key={i} width="100%" height={`${30 + jitter(i, 70)}%`} radius={4} />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
          <Bar width={160} height={14} radius={4} />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: i < rows - 1 ? '1px solid var(--border-light)' : 'none' }}>
            <Bar width={32} height={32} radius={8} />
            <Bar width={`${40 + jitter(i, 30)}%`} height={12} radius={4} />
            <div style={{ flex: 1 }} />
            <Bar width={60} height={12} radius={4} />
            <Bar width={50} height={12} radius={4} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <Bar width={200} height={14} radius={4} style={{ marginBottom: 6 }} />
      <Bar width={300} height={10} radius={4} style={{ marginBottom: 20 }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 240 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <Bar key={i} width="100%" height={`${20 + jitter(i, 80)}%`} radius={4} />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < rows - 1 ? '1px solid var(--border-light)' : 'none' }}>
          <Bar width={36} height={36} radius={8} />
          <div style={{ flex: 1 }}>
            <Bar width={`${50 + jitter(i, 30)}%`} height={12} radius={4} style={{ marginBottom: 6 }} />
            <Bar width={`${30 + jitter(i, 20)}%`} height={10} radius={4} />
          </div>
          <Bar width={60} height={12} radius={4} />
          <Bar width={50} height={24} radius={12} />
        </div>
      ))}
    </div>
  )
}
