'use client'

import { useState } from 'react'
import { Brain, Check, X, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

export interface AnalysisState {
  /** Videos queued for this run (excludes ones already analysed). */
  total: number
  /** Every distinct video in the campaign for the current format. */
  totalUnique: number
  /** Already had brand_analysis rows before this run started. */
  alreadyAnalyzed: number
  processed: number
  success: number
  skipped: number
  failed: number
  currentVideo: string
  phase: 'starting' | 'analyzing' | 'complete' | 'cancelled' | 'error'
  message?: string
  errors: { youtube_id: string; title: string; error: string }[]
}

const PHASE_LABEL: Record<AnalysisState['phase'], string> = {
  starting:  'Preparing queue',
  analyzing: 'Analyzing transcripts',
  complete:  'Analysis complete',
  cancelled: 'Analysis stopped',
  error:     'Analysis failed',
}

/**
 * Progress for a brand-analysis run.
 *
 * Deliberately states the denominator two ways: the run's own queue drives the
 * bar, while "N of M unique videos" keeps the campaign-wide total visible — a
 * run of 12 is very different depending on whether the campaign holds 20
 * videos or 1,300, and the old text-only label never said which.
 */
export default function AnalysisProgress({
  state,
  onCancel,
  onDismiss,
}: {
  state: AnalysisState
  onCancel?: () => void
  onDismiss?: () => void
}) {
  const [showErrors, setShowErrors] = useState(false)

  const running = state.phase === 'starting' || state.phase === 'analyzing'
  const pct = state.total > 0 ? Math.min(100, Math.round((state.processed / state.total) * 100)) : 0
  const doneOverall = state.alreadyAnalyzed + state.processed

  const accent =
    state.phase === 'error' ? 'var(--red)'
    : state.phase === 'cancelled' ? 'var(--text-muted)'
    : state.phase === 'complete' ? 'var(--green)'
    : 'var(--violet)'

  return (
    <div
      className="card"
      role="status"
      aria-live="polite"
      style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: state.phase === 'error' ? 'var(--red-dim)' : state.phase === 'complete' ? 'var(--green-dim)' : 'var(--violet-dim)',
            color: accent,
          }}
        >
          {running ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
            : state.phase === 'complete' ? <Check size={17} />
            : state.phase === 'error' ? <AlertCircle size={17} />
            : <Brain size={17} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>
              {PHASE_LABEL[state.phase]}
            </span>
            <span
              style={{
                fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600,
                fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"',
              }}
            >
              {doneOverall.toLocaleString()} of {state.totalUnique.toLocaleString()} unique videos
            </span>
          </div>

          <div
            style={{
              fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title={state.currentVideo || undefined}
          >
            {state.message
              || (state.currentVideo ? state.currentVideo : running ? 'Waiting for the next batch…' : '')}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {running && onCancel && (
            <button className="btn btn-ghost btn-xs" onClick={onCancel}>Stop</button>
          )}
          {!running && onDismiss && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={onDismiss}
              aria-label="Dismiss analysis summary"
              style={{ width: 26, padding: 0, justifyContent: 'center' }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Determinate bar — the run's own queue, not the campaign total. */}
      <div>
        <div
          style={{ height: 5, borderRadius: 99, background: 'var(--border-1)', overflow: 'hidden' }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Brand analysis progress"
        >
          <div
            style={{
              width: `${pct}%`, height: '100%', borderRadius: 99, background: accent,
              transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap',
            fontSize: 11, fontWeight: 600,
            fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            {state.processed.toLocaleString()}/{state.total.toLocaleString()} this run
          </span>
          <span style={{ color: 'var(--green)' }}>{state.success.toLocaleString()} with brands</span>
          <span style={{ color: 'var(--text-muted)' }}>{state.skipped.toLocaleString()} none found</span>
          {state.failed > 0 && (
            <button
              onClick={() => setShowErrors(v => !v)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'var(--red)', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}
              aria-expanded={showErrors}
            >
              {state.failed.toLocaleString()} failed
              {showErrors ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
      </div>

      {showErrors && state.errors.length > 0 && (
        <div
          style={{
            maxHeight: 132, overflowY: 'auto', borderTop: '1px solid var(--border-1)',
            paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5,
          }}
        >
          {state.errors.map((e, i) => (
            <div key={`${e.youtube_id}-${i}`} style={{ fontSize: 11, lineHeight: 1.4 }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {e.title.length > 60 ? e.title.slice(0, 60) + '…' : e.title}
              </span>
              <span style={{ color: 'var(--red)', marginLeft: 6 }}>{e.error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
