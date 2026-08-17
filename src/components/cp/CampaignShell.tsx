'use client'

import { usePathname } from 'next/navigation'
import { useState, useCallback } from 'react'
import { Menu } from 'lucide-react'
import CampaignSidebar from './CampaignSidebar'
import CampaignHeader from './CampaignHeader'
import { ToastProvider } from './ToastProvider'
import { ModalProvider } from './ModalProvider'
import KeyboardShortcuts from './KeyboardShortcuts'
import QuickActions from './QuickActions'

const PUBLIC_PATHS = ['/login', '/client/login', '/client/accept', '/creator-onboarding']
const CLIENT_PATHS = ['/client']

export default function CampaignShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))
  const isClient = CLIENT_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  if (isPublic) {
    return <>{children}</>
  }

  if (isClient) {
    return (
      <ToastProvider>
        <ModalProvider>
          <KeyboardShortcuts />
          <div className="app-shell">
            <main className="main-content" style={{ marginLeft: 0 }}>
              <CampaignHeader />
              <div className="page-wrapper">{children}</div>
            </main>
          </div>
          <QuickActions />
        </ModalProvider>
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <ModalProvider>
        <KeyboardShortcuts />
        <div className="app-shell">
          {/* Mobile overlay */}
          <div
            className={`mobile-overlay${sidebarOpen ? ' active' : ''}`}
            onClick={closeSidebar}
          />

          {/* Sidebar — hidden on mobile by default, slides in when open */}
          <div className={sidebarOpen ? 'mobile-open' : ''}>
            <CampaignSidebar onNavigate={closeSidebar} />
          </div>

          <main className="main-content">
            <CampaignHeader>
              <button
                className="mobile-menu-btn"
                onClick={toggleSidebar}
                aria-label="Toggle menu"
              >
                <Menu size={16} />
              </button>
            </CampaignHeader>
            <div className="page-wrapper">{children}</div>
          </main>
        </div>
        <QuickActions />
      </ModalProvider>
    </ToastProvider>
  )
}
