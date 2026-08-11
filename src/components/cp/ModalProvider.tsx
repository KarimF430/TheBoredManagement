'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

interface ModalOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
}

interface ModalContextType {
  confirm: (options: ModalOptions) => void
}

const ModalContext = createContext<ModalContextType>({ confirm: () => {} })

export function useModal() {
  return useContext(ModalContext)
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null)
  const [loading, setLoading] = useState(false)

  const confirm = useCallback((options: ModalOptions) => {
    setModal(options)
    setLoading(false)
  }, [])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await modal?.onConfirm()
    } finally {
      setLoading(false)
      setModal(null)
    }
  }

  const handleCancel = () => {
    modal?.onCancel?.()
    setModal(null)
  }

  const typeConfig = {
    danger: { icon: <AlertTriangle size={16} />, color: '#FF2D55', bg: 'rgba(255,45,85,0.06)' },
    warning: { icon: <AlertTriangle size={16} />, color: '#FF6D00', bg: 'rgba(255,109,0,0.06)' },
    info: { icon: <Info size={16} />, color: '#1A73E8', bg: 'rgba(26,115,232,0.06)' },
    success: { icon: <CheckCircle2 size={16} />, color: '#00C853', bg: 'rgba(0,200,83,0.06)' },
  }

  return (
    <ModalContext.Provider value={{ confirm }}>
      {children}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={handleCancel}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 420, maxWidth: '90vw',
              background: '#FFF', borderRadius: 16,
              border: '1.5px solid var(--border-2)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
              animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px 0',
              display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: typeConfig[modal.type || 'info'].bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: typeConfig[modal.type || 'info'].color,
                flexShrink: 0,
              }}>
                {typeConfig[modal.type || 'info'].icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-bright)', margin: 0 }}>
                  {modal.title}
                </h3>
                {modal.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
                    {modal.description}
                  </p>
                )}
              </div>
              <button
                onClick={handleCancel}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4, borderRadius: 6,
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Actions */}
            <div style={{
              padding: '20px 24px',
              display: 'flex', gap: 10, justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCancel}
                disabled={loading}
                style={{
                  padding: '9px 18px', borderRadius: 10,
                  fontSize: 13, fontWeight: 600,
                  background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                  border: '1.5px solid var(--border-1)', cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {modal.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '9px 18px', borderRadius: 10,
                  fontSize: 13, fontWeight: 600,
                  background: (modal.type || 'info') === 'danger' ? '#FF2D55' : 'var(--blue)',
                  color: '#FFF',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {loading ? 'Processing...' : (modal.confirmLabel || 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  )
}
