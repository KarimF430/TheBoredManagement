'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          if (d.user.role === 'client') {
            router.push('/client')
          } else {
            router.push('/campaigns')
          }
        } else {
          router.push('/login')
        }
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'var(--bg-base)',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(26,115,232,0.1)',
          borderTopColor: 'var(--blue)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Redirecting...</span>
      </div>
    </div>
  )
}
