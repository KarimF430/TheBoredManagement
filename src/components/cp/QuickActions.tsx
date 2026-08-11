'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, FileText, Users, Package, Radio, X, BarChart3 } from 'lucide-react'

export default function QuickActions() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const campaignMatch = pathname.match(/\/campaigns\/([a-f0-9-]+)/)
  const campaignId = campaignMatch?.[1] || null

  if (!campaignId) return null

  const actions = [
    { icon: Users, label: 'Add Creator', color: '#FF6D00', action: () => router.push(`/campaigns/${campaignId}/shortlist`) },
    { icon: Package, label: 'Content', color: '#00C853', action: () => router.push(`/campaigns/${campaignId}/content`) },
    { icon: Radio, label: 'Tracking', color: '#1A73E8', action: () => router.push(`/campaigns/${campaignId}/tracking`) },
    { icon: BarChart3, label: 'Report', color: '#7C3AED', action: () => router.push(`/campaigns/${campaignId}/report`) },
  ]

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 90 }}>
      {/* Action Items */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 64, right: 0,
          display: 'flex', flexDirection: 'column', gap: 8,
          animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {actions.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => { action.action(); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderRadius: 12,
                  background: '#FFF', border: '1.5px solid var(--border-2)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  animation: 'slideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
                  animationDelay: `${i * 0.05}s`,
                  animationFillMode: 'backwards',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = action.color
                  e.currentTarget.style.boxShadow = `0 4px 16px ${action.color}20`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-2)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: `${action.color}10`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: action.color,
                }}>
                  <Icon size={14} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <button
        className="fab"
        onClick={() => setOpen(!open)}
        style={{
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {open ? <X size={16} /> : <Plus size={16} />}
      </button>
    </div>
  )
}
