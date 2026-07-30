'use client'

import { CheckCircle2, Loader2, AlertTriangle, X } from 'lucide-react'

export interface AnalysisProgress {
  total: number
  processed: number
  success: number
  failed: number
  skipped: number
  currentVideo: string
  currentStep: string
  phase: 'starting' | 'fetching_transcript' | 'transcribing' | 'matching' | 'classifying' | 'analyzing' | 'complete' | 'error'
  errors: Array<{ youtube_id: string; title: string; error: string }>
}

interface AnalysisProgressBarProps {
  progress: AnalysisProgress
  onCancel?: () => void
  onClose?: () => void
}

const STEP_LABELS: Record<string, string> = {
  starting: 'Preparing...',
  fetching_transcript: 'Fetching transcript...',
  transcribing: 'Processing audio...',
  matching: 'Detecting brands...',
  classifying: 'AI classifying...',
  analyzing: 'Analyzing...',
  complete: 'Done',
  error: 'Error',
}

export default function AnalysisProgressBar({ progress, onCancel, onClose }: AnalysisProgressBarProps) {
  const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
  const isComplete = progress.phase === 'complete'
  const isError = progress.phase === 'error'

  const stepLabel = progress.currentStep || STEP_LABELS[progress.phase] || 'Analyzing...'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 500,
        maxWidth: 'calc(100vw - 48px)',
        background: '#FFFFFF',
        borderRadius: 16,
        border: `1px solid ${isComplete ? '#22C55E' : isError ? '#EF4444' : '#E2E8F0'}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
        padding: '20px 24px',
        zIndex: 99999,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isComplete && !isError && (
            <Loader2 size={16} style={{ color: '#7C3AED', animation: 'sov-spin 1s linear infinite' }} />
          )}
          {isComplete && <CheckCircle2 size={16} style={{ color: '#22C55E' }} />}
          {isError && <AlertTriangle size={16} style={{ color: '#EF4444' }} />}
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>
            {isComplete ? 'Analysis complete' : isError ? 'Analysis stopped' : `${pct}%`}
          </span>
        </div>
        {onClose && !progress.phase.includes('analyzing') && progress.phase !== 'fetching_transcript' && progress.phase !== 'transcribing' && progress.phase !== 'matching' && progress.phase !== 'classifying' && progress.phase !== 'starting' && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={14} color="#94A3B8" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden', marginBottom: 10 }}>
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            background: isComplete ? '#22C55E' : isError ? '#EF4444' : 'linear-gradient(90deg, #7C3AED, #A78BFA)',
            width: `${pct}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Current step (large, prominent) */}
      {!isComplete && !isError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 8,
          background: '#F8FAFC', border: '1px solid #F1F5F9',
          marginBottom: 10,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#7C3AED',
            animation: 'sov-pulse 1.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
            {stepLabel}
          </span>
        </div>
      )}

      {/* Current video name */}
      {!isComplete && !isError && progress.currentVideo && (
        <div style={{
          fontSize: 11, color: '#94A3B8',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 8,
        }}>
          {progress.currentVideo}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748B', marginBottom: 8, flexWrap: 'wrap' }}>
        <span><strong style={{ color: '#1E293B' }}>{progress.processed}</strong>/{progress.total}</span>
        {progress.success > 0 && <span style={{ color: '#22C55E' }}>{progress.success} brands found</span>}
        {progress.skipped > 0 && <span style={{ color: '#F59E0B' }}>{progress.skipped} no brands</span>}
        {progress.failed > 0 && <span style={{ color: '#EF4444' }}>{progress.failed} failed</span>}
      </div>

      {/* Error details */}
      {progress.errors.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 11, color: '#EF4444', cursor: 'pointer', userSelect: 'none' }}>
            {progress.errors.length} error{progress.errors.length > 1 ? 's' : ''} (click to view)
          </summary>
          <div style={{ maxHeight: 80, overflow: 'auto', marginTop: 4 }}>
            {progress.errors.slice(0, 10).map((e, i) => (
              <div key={i} style={{ fontSize: 10, color: '#94A3B8', padding: '2px 0' }}>
                {e.title}: {e.error}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Cancel button */}
      {(progress.phase === 'fetching_transcript' || progress.phase === 'transcribing' || progress.phase === 'matching' || progress.phase === 'classifying' || progress.phase === 'analyzing' || progress.phase === 'starting') && onCancel && (
        <button
          onClick={onCancel}
          style={{
            marginTop: 8, width: '100%', padding: '6px 0', borderRadius: 8,
            border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#64748B',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sov-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sov-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}} />
    </div>
  )
}
