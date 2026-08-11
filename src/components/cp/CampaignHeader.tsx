'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, LogOut, ChevronDown, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import CommandPalette from './CommandPalette'
import NotificationsDropdown from './NotificationsDropdown'

interface SessionUser {
  name: string
  email: string
  role: string
}

export default function CampaignHeader({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)

  const campaignMatch = pathname.match(/\/campaigns\/([a-f0-9-]+)/)
  const campaignId = campaignMatch?.[1] || null

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {}
  }

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      brand_solutions: 'Brand Solutions',
      campaign_manager: 'Campaign Manager',
      ir_manager: 'IR Manager',
      ir_executive: 'IR Executive',
      client: 'Client',
    }
    return labels[role] || role
  }

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 'var(--header-h)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {children}
          <button
            onClick={() => setCmdOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px',
              color: 'var(--text-muted)',
              fontSize: 12,
              maxWidth: 260, flex: 1,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-1)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-1)' }}
          >
            <Search size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Search...</span>
            <kbd className="kbd" style={{ marginLeft: 'auto', flexShrink: 0 }}>/</kbd>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="btn-subtle"
            style={{ padding: 4, borderRadius: 'var(--radius-sm)' }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <NotificationsDropdown campaignId={campaignId} />

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-1)',
                background: 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-1)' }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFF', fontSize: 9, fontWeight: 700,
                flexShrink: 0,
              }}>
                {user?.name?.charAt(0) || '?'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {user?.name || 'Loading...'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.2 }}>
                  {user ? roleLabel(user.role) : ''}
                </div>
              </div>
              <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0,
                marginTop: 2, width: 180,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 100, overflow: 'hidden',
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 11, fontWeight: 500,
                    color: 'var(--red)', transition: 'background 0.1s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut size={12} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}
