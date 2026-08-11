'use client'

import { ReactNode } from 'react'

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Client portal header */}
      <header style={{
        padding: '12px 24px',
        background: '#FFF',
        borderBottom: '1.5px solid var(--border-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--blue-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFF', fontSize: 14, fontWeight: 800,
          }}>
            TB
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-bright)' }}>The Bored Monkey</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Client Dashboard</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 99,
            background: 'rgba(26,115,232,0.06)',
            fontSize: 11, fontWeight: 700, color: 'var(--blue)',
          }}>
            CLIENT VIEW
          </span>
        </div>
      </header>

      <main style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
