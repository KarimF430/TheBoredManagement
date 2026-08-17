'use client'

import { Loader2 } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════
// SKELETON LOADING
// ═══════════════════════════════════════════════════════════════════

export function SkeletonLine({ width = '100%', height = 10, style }: { width?: string | number; height?: number; style?: React.CSSProperties }) {
  return (
    <div className="skeleton" style={{ width, height, ...style }} />
  )
}

export function SkeletonCard({ children }: { children?: React.ReactNode }) {
  return (
    <div className="skeleton-card" style={{ animation: 'fadeIn 0.2s ease' }}>
      {children}
    </div>
  )
}

export function KPISkeleton() {
  return (
    <div className="grid-kpi">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="skeleton-card" style={{ padding: 12 }}>
          <SkeletonLine width={26} height={26} style={{ borderRadius: 'var(--radius-sm)', marginBottom: 6 }} />
          <SkeletonLine width="50%" height={18} style={{ marginBottom: 4 }} />
          <SkeletonLine width="70%" height={9} />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-elevated)', display: 'flex', gap: 10 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width={`${100 / cols}%`} height={9} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-1)', display: 'flex', gap: 10 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={`${100 / cols}%`} height={9} style={{ animationDelay: `${r * 0.04}s` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      <SkeletonLine width={100} height={9} style={{ marginBottom: 10 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <SkeletonLine width={160} height={18} style={{ marginBottom: 4 }} />
          <SkeletonLine width={240} height={10} />
        </div>
        <SkeletonLine width={100} height={28} style={{ borderRadius: 'var(--radius-sm)' }} />
      </div>
      <KPISkeleton />
      <div style={{ marginTop: 14 }}>
        <TableSkeleton />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// STATE PANELS (Empty, Error, Loading)
// ═══════════════════════════════════════════════════════════════════

interface StatePanelProps {
  icon: React.ReactNode
  iconBg?: string
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, iconBg = 'rgba(37,99,235,0.06)', title, description, action }: StatePanelProps) {
  return (
    <div className="state-panel anim-fade-up">
      <div className="state-panel__icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="state-panel__title">{title}</div>
      <div className="state-panel__desc">{description}</div>
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="state-panel anim-fade-up">
      <div className="state-panel__icon" style={{ background: 'rgba(220,38,38,0.06)' }}>
        <span style={{ fontSize: 18, color: 'var(--red)' }}>!</span>
      </div>
      <div className="state-panel__title">{title}</div>
      <div className="state-panel__desc">{description || 'Please try again later.'}</div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
          Retry
        </button>
      )}
    </div>
  )
}

export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="state-panel anim-fade-up">
      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)', marginBottom: 8 }} />
      <div className="state-panel__desc">{text}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════

interface ToastProps {
  message: string
  type: 'success' | 'error'
}

export function Toast({ message, type }: ToastProps) {
  return (
    <div className={`toast toast--${type}`}>
      {message}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGES
// ═══════════════════════════════════════════════════════════════════

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  active: { bg: 'var(--green-dim)', color: 'var(--green)' },
  paused: { bg: 'var(--orange-dim)', color: 'var(--orange)' },
  completed: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  archived: { bg: 'var(--bg-elevated)', color: 'var(--text-muted)' },
  shortlisted: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  client_review: { bg: 'var(--purple-light)', color: 'var(--purple)' },
  negotiating: { bg: 'var(--orange-dim)', color: 'var(--orange)' },
  onboarded: { bg: 'var(--green-dim)', color: 'var(--green)' },
  rejected: { bg: 'var(--red-dim)', color: 'var(--red)' },
  pending: { bg: 'var(--bg-elevated)', color: 'var(--text-muted)' },
  live: { bg: 'var(--red-dim)', color: 'var(--red)' },
  approved: { bg: 'var(--green-dim)', color: 'var(--green)' },
  brand_solutions: { bg: 'var(--blue-dim)', color: 'var(--blue)' },
  campaign_manager: { bg: 'var(--purple-light)', color: 'var(--purple)' },
  ir_manager: { bg: 'var(--orange-dim)', color: 'var(--orange)' },
  ir_executive: { bg: 'var(--green-dim)', color: 'var(--green)' },
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const colors = BADGE_COLORS[status] || BADGE_COLORS.draft
  return (
    <span className="badge" style={{ background: colors.bg, color: colors.color }}>
      {label || status.replace(/_/g, ' ')}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
