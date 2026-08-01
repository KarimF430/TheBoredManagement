'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import TutorialOverlay from '@/components/TutorialOverlay'

const PUBLIC_PATHS = ['/login', '/privacy-policy']
const STANDALONE_PATHS = ['/workspace']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))
  const isStandalone = STANDALONE_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))

  // Navigating closes the drawer — otherwise it stays open over the new page.
  useEffect(() => { setNavOpen(false) }, [pathname])

  // Escape closes it, and the page behind it must not scroll while it is open.
  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [navOpen])

  if (isPublic || isStandalone) {
    return <>{children}</>
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />

      <div
        className={`nav-scrim${navOpen ? ' open' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      <main className="main-content" id="main-content">
        <Header onMenuToggle={() => setNavOpen(o => !o)} navOpen={navOpen} />
        <div className="page-wrapper">
          {children}
        </div>
      </main>
      <TutorialOverlay />
    </div>
  )
}
