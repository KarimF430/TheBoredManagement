'use client'

import { useState } from 'react'
import {
  Sparkles, CheckCircle2, AlertCircle, Loader2, X, ChevronDown, ChevronUp,
  VolumeX, ShieldAlert, Globe, Radio, Database, Check, Film, Tv,
  PauseCircle, PlayCircle
} from 'lucide-react'

export interface ScrapeProgressItem {
  keywordId: string
  text: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  message?: string
  ranked?: number
  long_form?: number
  short_form?: number
  pages_fetched?: number
  rejected_foreign?: number
  rejected_brand?: number
  rejected_irrelevant?: number
  saved?: number
  error?: string
}

export interface PreFilterProgressBoxProps {
  items: ScrapeProgressItem[]
  isScraping: boolean
  isPaused?: boolean
  onStop?: () => void
  onResume?: () => void
  onDismiss?: () => void
}

export default function PreFilterProgressBox({
  items,
  isScraping,
  isPaused,
  onStop,
  onResume,
  onDismiss,
}: PreFilterProgressBoxProps) {
  const [expanded, setExpanded] = useState(true)

  if (!items || items.length === 0) return null

  const completed = items.filter(i => i.status === 'completed')
  const running = items.find(i => i.status === 'running')
  const failed = items.filter(i => i.status === 'failed')
  const total = items.length
  const finishedCount = completed.length + failed.length
  const pct = Math.min(100, Math.round((finishedCount / total) * 100))

  // Aggregate totals across all completed keywords in this session
  const totalRanked = completed.reduce((sum, i) => sum + (i.ranked || 0), 0)
  const totalLong = completed.reduce((sum, i) => sum + (i.long_form || 0), 0)
  const totalShort = completed.reduce((sum, i) => sum + (i.short_form || 0), 0)
  const totalIgnoredIrrelevant = completed.reduce((sum, i) => sum + (i.rejected_irrelevant || 0), 0)
  const totalIgnoredForeign = completed.reduce((sum, i) => sum + (i.rejected_foreign || 0), 0)
  const totalIgnoredBrand = completed.reduce((sum, i) => sum + (i.rejected_brand || 0), 0)
  const totalIgnoredSum = totalIgnoredIrrelevant + totalIgnoredForeign + totalIgnoredBrand
  const totalSaved = completed.reduce((sum, i) => sum + (i.saved || 0), 0)

  const isDone = !isScraping && finishedCount === total

  return (
    <div
      className="card"
      style={{
        padding: '16px 20px',
        marginBottom: 20,
        background: 'var(--surface-elevated, #ffffff)',
        border: '1.5px solid var(--border-color, #E2E8F0)',
        borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06), 0 2px 6px -1px rgba(0,0,0,0.04)',
        animation: 'fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Accent Line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: isDone
            ? 'linear-gradient(90deg, #10B981, #059669)'
            : 'linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899)',
        }}
      />

      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
              color: isDone ? '#10B981' : '#3B82F6',
              flexShrink: 0,
            }}
          >
            {isScraping ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : isPaused ? (
              <AlertCircle size={18} style={{ color: '#F59E0B' }} />
            ) : isDone ? (
              <CheckCircle2 size={18} />
            ) : (
              <Sparkles size={18} />
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright, #0F172A)' }}>
                {isScraping ? 'AI Pre-Filtering & Scraping Keywords...' : isPaused ? 'Scraping Paused' : 'Scrape & AI Pre-Filter Complete'}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: '#7C3AED',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={10} /> Groq AI Whisper Pre-Filter
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted, #64748B)', marginTop: 2 }}>
              {isScraping && running ? (
                <span>
                  Active keyword: <strong style={{ color: 'var(--accent, #3B82F6)' }}>"{running.text}"</strong> (Fetching top 10 long & 10 short valid videos)
                </span>
              ) : isPaused ? (
                <span style={{ color: '#D97706', fontWeight: 600 }}>
                  Paused at {finishedCount} of {total} keywords • Click "Resume Scrape" to continue
                </span>
              ) : isDone ? (
                <span>Processed {total} keyword{total > 1 ? 's' : ''} • AI Pre-Filter validated videos</span>
              ) : (
                <span>Preparing keyword batch...</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {isScraping && onStop && (
            <button
              onClick={onStop}
              style={{
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#DC2626',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Stop scraping job after current keyword finishes"
            >
              <PauseCircle size={14} /> Stop Scrape
            </button>
          )}

          {isPaused && onResume && (
            <button
              onClick={onResume}
              style={{
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Resume scraping remaining pending keywords"
            >
              <PlayCircle size={14} /> Resume Scrape
            </button>
          )}

          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setExpanded(!expanded)}
            style={{ fontSize: 12, gap: 4, padding: '4px 8px' }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>

          {!isScraping && !isPaused && onDismiss && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={onDismiss}
              style={{ width: 26, padding: 0, justifyContent: 'center' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #64748B)', marginBottom: 4 }}>
          <span>Keywords Processed: {finishedCount} / {total}</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'var(--border-light, #E2E8F0)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: 99,
              background: isDone
                ? '#10B981'
                : 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Summary KPI Badges Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 8,
          marginTop: 14,
          padding: 10,
          background: 'var(--surface-dim, #F8FAFC)',
          borderRadius: 8,
          border: '1px solid var(--border-light, #F1F5F9)',
        }}
      >
        {/* Metric 1: Valid Videos Ranked */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
            Valid Ranked
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#10B981', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Film size={13} /> {totalRanked}
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              ({totalLong}L / {totalShort}S)
            </span>
          </span>
        </div>

        {/* Metric 2: AI Filtered / Ignored */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
            AI Filtered / Ignored
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#EF4444', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <VolumeX size={13} /> {totalIgnoredSum} videos
          </span>
        </div>

        {/* Metric 3: Music/No Speech Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
            No Speech / Music
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#F59E0B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Radio size={13} /> {totalIgnoredIrrelevant} dropped
          </span>
        </div>

        {/* Metric 4: Foreign / Brand Ignored */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
            Channel Filtered
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#6366F1', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Globe size={13} /> {totalIgnoredForeign + totalIgnoredBrand} channels
          </span>
        </div>

        {/* Metric 5: Saved to DB */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
            Saved to Pool
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#3B82F6', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Database size={13} /> {totalSaved} videos
          </span>
        </div>
      </div>

      {/* Expandable Per-Keyword Log */}
      {expanded && (
        <div
          style={{
            marginTop: 12,
            maxHeight: 180,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            paddingRight: 4,
          }}
        >
          {items.map(item => (
            <div
              key={item.keywordId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 6,
                background: item.status === 'running'
                  ? 'rgba(59, 130, 246, 0.08)'
                  : item.status === 'failed'
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'var(--surface-dim, #F8FAFC)',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                {item.status === 'running' && (
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: '#3B82F6', flexShrink: 0 }} />
                )}
                {item.status === 'completed' && (
                  <Check size={12} style={{ color: '#10B981', flexShrink: 0 }} />
                )}
                {item.status === 'failed' && (
                  <AlertCircle size={12} style={{ color: '#EF4444', flexShrink: 0 }} />
                )}
                {item.status === 'pending' && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} />
                )}

                <span style={{ fontWeight: 600, color: 'var(--text-bright, #0F172A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.text}
                </span>
              </div>

              {/* Status details & metrics */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, fontSize: 11 }}>
                {item.status === 'completed' && (
                  <>
                    <span style={{ color: '#10B981', fontWeight: 600 }}>
                      ✓ {item.ranked ?? 0} valid ({item.long_form ?? 0}L/{item.short_form ?? 0}S)
                    </span>
                    {(item.rejected_irrelevant ?? 0) > 0 && (
                      <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                        🛡️ {item.rejected_irrelevant} music/no-speech dropped
                      </span>
                    )}
                  </>
                )}
                {item.status === 'failed' && (
                  <span style={{ color: '#EF4444', fontWeight: 600 }}>
                    {item.error || item.message || 'Scrape failed'}
                  </span>
                )}
                {item.status === 'running' && (
                  <span style={{ color: '#3B82F6', fontWeight: 600 }}>Evaluating AI Pre-Filter...</span>
                )}
                {item.status === 'pending' && (
                  <span style={{ color: '#94A3B8' }}>Queued</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
