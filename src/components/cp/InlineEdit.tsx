'use client'

import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'

interface InlineEditProps {
  value: string | number
  type?: 'text' | 'number' | 'textarea' | 'select'
  options?: Array<{ value: string; label: string }>
  onSave: (value: string | number) => Promise<void>
  onCancel?: () => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  validate?: (value: string) => string | null
}

export default function InlineEdit({
  value,
  type = 'text',
  options,
  onSave,
  onCancel,
  placeholder = 'Click to edit',
  className = '',
  style,
  validate,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string | number>(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (type === 'text' || type === 'number') {
        (inputRef.current as HTMLInputElement).select()
      }
    }
  }, [editing, type])

  const handleSave = async () => {
    if (validate) {
      const err = validate(String(draft))
      if (err) {
        setError(err)
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraft(value)
    setEditing(false)
    setError(null)
    onCancel?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className={`inline-edit ${className}`}
        style={{
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 6,
          border: '1.5px dashed transparent',
          transition: 'all 0.15s',
          minHeight: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          ...style,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--blue)'
          e.currentTarget.style.background = 'var(--blue-dim)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <span style={{ flex: 1, color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {value || placeholder}
        </span>
        <Pencil size={12} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
      </div>
    )
  }

  return (
    <div className={`inline-edit--active ${className}`} style={{ position: 'relative', ...style }}>
      {type === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: `1.5px solid ${error ? 'var(--red)' : 'var(--blue)'}`,
            background: '#FFF', fontSize: 13, fontFamily: 'inherit',
            resize: 'vertical', outline: 'none',
            boxShadow: '0 0 0 3px rgba(26,115,232,0.1)',
          }}
        />
      ) : type === 'select' ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: `1.5px solid ${error ? 'var(--red)' : 'var(--blue)'}`,
            background: '#FFF', fontSize: 13, fontFamily: 'inherit',
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(26,115,232,0.1)',
          }}
        >
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={draft}
          onChange={e => setDraft(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: `1.5px solid ${error ? 'var(--red)' : 'var(--blue)'}`,
            background: '#FFF', fontSize: 13, fontFamily: 'inherit',
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(26,115,232,0.1)',
          }}
        />
      )}

      {/* Error */}
      {error && (
        <div style={{
          fontSize: 11, color: 'var(--red)', marginTop: 4,
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 4, marginTop: 6,
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleCancel}
          disabled={saving}
          style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11,
            border: '1px solid var(--border-1)', background: '#FFF',
            cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
            color: 'var(--text-secondary)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11,
            border: 'none', background: 'var(--blue)',
            cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
            color: '#FFF', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {saving ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={10} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Keyboard hint */}
      <div style={{
        fontSize: 10, color: 'var(--text-muted)', marginTop: 4,
        display: 'flex', gap: 8,
      }}>
        <span><kbd style={{ padding: '1px 4px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-1)', fontSize: 9 }}>Enter</kbd> to save</span>
        <span><kbd style={{ padding: '1px 4px', borderRadius: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-1)', fontSize: 9 }}>Esc</kbd> to cancel</span>
      </div>
    </div>
  )
}
