'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'

interface ContextMenuItem {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  onAction: (id: string) => void
  children: ReactNode
}

export default function ContextMenu({ items, onAction, children }: ContextMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false)
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = document.documentElement.getBoundingClientRect()
    const x = Math.min(e.clientX, rect.width - 200)
    const y = Math.min(e.clientY, rect.height - items.length * 36)

    setPosition({ x, y })
    setOpen(true)
  }

  return (
    <>
      <div onContextMenu={handleContextMenu} style={{ display: 'contents' }}>
        {children}
      </div>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 9999,
            minWidth: 180,
            background: '#FFF',
            borderRadius: 10,
            border: '1.5px solid var(--border-2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            padding: '4px',
            animation: 'scaleIn 0.15s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {items.map(item => {
            if (item.divider) {
              return <div key={item.id} style={{ height: 1, background: 'var(--border-1)', margin: '4px 0' }} />
            }
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.disabled) {
                    onAction(item.id)
                    setOpen(false)
                  }
                }}
                disabled={item.disabled}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  border: 'none', cursor: item.disabled ? 'default' : 'pointer',
                  background: 'transparent',
                  fontSize: 12, fontWeight: 500,
                  color: item.danger ? 'var(--red)' : 'var(--text-primary)',
                  opacity: item.disabled ? 0.4 : 1,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!item.disabled) {
                    e.currentTarget.style.background = item.danger ? 'rgba(255,45,85,0.06)' : 'var(--bg-elevated)'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {item.icon && <span style={{ width: 16, display: 'flex', justifyContent: 'center' }}>{item.icon}</span>}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && (
                  <span style={{
                    fontSize: 10, color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}>
                    {item.shortcut}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
