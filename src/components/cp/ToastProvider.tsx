'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, XCircle, X, Info } from 'lucide-react'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3500) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type, duration }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const icons = {
    success: <CheckCircle2 size={16} />,
    error: <XCircle size={16} />,
    info: <Info size={16} />,
  }

  const colors = {
    success: { bg: '#00C853', glow: 'rgba(0,200,83,0.3)' },
    error: { bg: '#FF2D55', glow: 'rgba(255,45,85,0.3)' },
    info: { bg: '#1A73E8', glow: 'rgba(26,115,232,0.3)' },
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 10000,
        display: 'flex', flexDirection: 'column-reverse', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map((t, i) => (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 12,
              background: colors[t.type].bg,
              color: '#FFF', fontWeight: 600, fontSize: 13,
              boxShadow: `0 8px 24px ${colors[t.type].glow}, 0 2px 8px rgba(0,0,0,0.1)`,
              animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              minWidth: 280,
            }}
            onClick={() => removeToast(t.id)}
          >
            {icons[t.type]}
            <span style={{ flex: 1 }}>{t.message}</span>
            <X size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
