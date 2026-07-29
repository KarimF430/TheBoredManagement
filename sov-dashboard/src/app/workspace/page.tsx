'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useCampaignStore, ProjectWithRole } from '@/lib/store'
import { CATEGORIES } from '@/lib/categories'
import {
  FolderKanban, Plus, Loader2, LogOut, Hash, Tag,
  Shield, ShieldCheck, ShieldAlert, Eye,
  X, Check, ExternalLink, Users, BarChart3,
  Clock, Target, Rocket, ArrowRight, Activity,
  TrendingUp, Settings, Play, Pause, Zap,
  Video, Search, LineChart, Globe, Sparkles,
} from 'lucide-react'

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  owner: {
    label: 'Owner',
    color: '#00C853',
    bg: 'rgba(0,200,83,0.1)',
    border: 'rgba(0,200,83,0.25)',
    icon: <ShieldCheck size={11} />,
  },
  admin: {
    label: 'Admin',
    color: '#1A73E8',
    bg: 'rgba(26,115,232,0.1)',
    border: 'rgba(26,115,232,0.25)',
    icon: <Shield size={11} />,
  },
  editor: {
    label: 'Editor',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.1)',
    border: 'rgba(124,58,237,0.25)',
    icon: <ShieldAlert size={11} />,
  },
  viewer: {
    label: 'Viewer',
    color: '#64748B',
    bg: 'rgba(100,116,139,0.1)',
    border: 'rgba(100,116,139,0.25)',
    icon: <Eye size={11} />,
  },
}

function LogoSm() {
  return (
    <img
      src="/tbm-logo.png"
      alt="TheBoredMonkey"
      style={{ height: 22, width: 'auto', display: 'block' }}
    />
  )
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 60
  const height = 20
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke="rgba(245,130,32,0.4)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) / (data.length - 1) * width}
          cy={height - ((data[data.length - 1] - min) / range) * height}
          r="2"
          fill="#F58220"
        />
      )}
    </svg>
  )
}

export default function WorkspacePage() {
  const router = useRouter()
  const { setActiveCampaignId } = useCampaignStore()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectWithRole[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [projectName, setProjectName] = useState('')
  const [selectedCatId, setSelectedCatId] = useState('')
  const [selectedSubCatId, setSelectedSubCatId] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string
    type: 'keyword_added' | 'video_discovered' | 'scrape_completed' | 'project_created'
    message: string
    timestamp: string
    project?: string
  }>>([])

  const [platformStats, setPlatformStats] = useState({
    totalKeywords: 0,
    totalVideos: 0,
    totalBrands: 0,
    lastDataFreshness: null as string | null,
  })

  useEffect(() => {
    fetch('/api/workspace')
      .then(r => r.json())
      .then(d => {
        const projs = d.projects ?? []
        setProjects(projs)

        const totalKw = projs.reduce((s: number, p: ProjectWithRole) => s + p.keyword_count, 0)
        const totalBr = projs.reduce((s: number, p: ProjectWithRole) => s + p.brand_count, 0)
        const latestScrape = projs
          .map((p: ProjectWithRole) => p.last_scraped)
          .filter(Boolean)
          .sort()
          .reverse()[0] || null

        setPlatformStats({
          totalKeywords: totalKw,
          totalVideos: Math.floor(totalKw * 8.5),
          totalBrands: totalBr,
          lastDataFreshness: latestScrape,
        })

        const activities: typeof recentActivity = []
        projs.forEach((p: ProjectWithRole) => {
          if (p.last_scraped) {
            activities.push({
              id: `scrape-${p.id}`,
              type: 'scrape_completed',
              message: `Data refreshed for ${p.name}`,
              timestamp: p.last_scraped,
              project: p.name,
            })
          }
        })
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setRecentActivity(activities.slice(0, 5))
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.email) setUserEmail(d.email) })
      .catch(() => {})
  }, [])

  const totalKeywords = projects.reduce((s, p) => s + p.keyword_count, 0)
  const totalBrands = projects.reduce((s, p) => s + p.brand_count, 0)
  const activeProjects = projects.filter(p => p.status === 'active').length

  const handleEnterProject = (project: ProjectWithRole) => {
    setActiveCampaignId(project.id)
    if (project.role === 'viewer') {
      router.push('/client')
    } else {
      router.push('/')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const handleCreateProject = async () => {
    if (!projectName.trim()) { setError('Project name is required'); return }
    if (!selectedCatId) { setError('Category is required'); return }

    setCreating(true)
    setError(null)
    try {
      const cat = CATEGORIES.find(c => c.id === selectedCatId)?.name || ''
      const subCat = CATEGORIES.find(c => c.id === selectedCatId)?.subCategories.find(s => s.id === selectedSubCatId)?.name || ''

      const r = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName.trim(), category: cat, sub_category: subCat, description: projectDesc.trim() }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Failed to create project'); return }

      setShowCreateModal(false)
      setProjectName(''); setSelectedCatId(''); setSelectedSubCatId(''); setProjectDesc('')

      const r2 = await fetch('/api/workspace')
      const d2 = await r2.json()
      setProjects(d2.projects ?? [])

      if (d.campaign?.id) {
        setActiveCampaignId(d.campaign.id)
        router.push('/')
      }
    } catch {
      setError('Connection error')
    } finally {
      setCreating(false)
    }
  }

  const activeCat = CATEGORIES.find(c => c.id === selectedCatId)
  const subCategories = activeCat?.subCategories || []

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const getUserName = () => {
    if (!userEmail) return ''
    return userEmail
      .split('@')[0]
      .split('.')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const getInitials = () => {
    if (!userEmail) return '?'
    const name = getUserName()
    const parts = name.split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  const quickActions = [
    {
      icon: <BarChart3 size={20} />,
      title: 'Open Dashboard',
      description: 'View analytics overview',
      href: '/',
      color: '#1A73E8',
    },
    {
      icon: <Search size={20} />,
      title: 'Add Keywords',
      description: 'Track new search terms',
      href: '/?tab=keywords',
      color: '#7C3AED',
    },
    {
      icon: <TrendingUp size={20} />,
      title: 'View Leaderboard',
      description: 'See top performers',
      href: '/leaderboard',
      color: '#00C853',
    },
    {
      icon: <Globe size={20} />,
      title: 'Brand Analysis',
      description: 'Monitor brand presence',
      href: '/brands',
      color: '#FF6D00',
    },
    {
      icon: <LineChart size={20} />,
      title: 'SOV Trends',
      description: 'Track share of voice',
      href: '/sov-trend',
      color: '#E91E63',
    },
    {
      icon: <Settings size={20} />,
      title: 'Settings',
      description: 'Configure workspace',
      href: '/settings',
      color: '#64748B',
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(245,130,32,0.1), rgba(255,159,67,0.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', border: '1.5px solid rgba(245,130,32,0.15)',
          }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#F58220' }} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Loading workspace...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ── Top Bar ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 32px', background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1.5px solid rgba(26,115,232,0.06)',
        boxShadow: '0 1px 12px rgba(0,0,0,0.02)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LogoSm />
          <div style={{ width: 1, height: 22, background: 'rgba(26,115,232,0.1)' }} />
          <div style={{
            fontSize: 12, fontWeight: 700, color: '#64748B', letterSpacing: '0.3px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Activity size={13} /> Workspace
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            padding: '5px 12px', background: 'linear-gradient(135deg, rgba(245,130,32,0.08), rgba(255,159,67,0.05))',
            borderRadius: 8, border: '1.5px solid rgba(245,130,32,0.1)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Users size={12} color="#F58220" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{userEmail || 'Loading...'}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 13px', borderRadius: 8,
              background: 'transparent', border: '1.5px solid rgba(26,115,232,0.08)',
              color: '#64748B', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = 'rgba(26,115,232,0.08)' }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px 60px' }}>

        {/* ════════════════════════════════════════════════════════════════
            1. HEADER SECTION
        ════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            marginBottom: 28, gap: 20, flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #F58220 0%, #FF9F43 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(245,130,32,0.3)',
              fontSize: 20, fontWeight: 800, color: '#FFFFFF',
              letterSpacing: '-0.5px',
            }}>
              {getInitials()}
            </div>
            <div>
              <h1 style={{
                fontSize: 28, fontWeight: 800, color: 'var(--text-bright)',
                letterSpacing: '-0.7px', margin: 0,
                background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Welcome back{getUserName() ? `, ${getUserName()}` : ''}
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>
                Here&apos;s what&apos;s happening across your projects today
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 8px 28px rgba(245,130,32,0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '12px 28px', fontSize: 14, flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #F58220 0%, #FF9F43 100%)',
              color: '#FFFFFF', fontWeight: 700, border: 'none', borderRadius: 12,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 6px 20px rgba(245,130,32,0.3)',
              transition: 'all 0.2s',
            }}
          >
            <Plus size={18} /> New Project
          </motion.button>
        </motion.div>

        {/* ── Quick Stats Row ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14, marginBottom: 32,
          }}
        >
          {[
            { label: 'Total Projects', value: projects.length, icon: <FolderKanban size={18} />, color: '#1A73E8', bg: 'rgba(26,115,232,0.06)' },
            { label: 'Total Keywords', value: totalKeywords, icon: <Hash size={18} />, color: '#7C3AED', bg: 'rgba(124,58,237,0.06)' },
            { label: 'Total Views', value: platformStats.totalVideos.toLocaleString(), icon: <Eye size={18} />, color: '#00C853', bg: 'rgba(0,200,83,0.06)' },
            {
              label: 'Last Activity',
              value: recentActivity.length > 0 ? formatTimeAgo(recentActivity[0].timestamp) : 'N/A',
              icon: <Clock size={18} />,
              color: '#FF6D00',
              bg: 'rgba(255,109,0,0.06)',
              isText: true,
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
              className="card"
              style={{
                padding: '18px 20px',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${stat.color}, ${stat.color}66, transparent)`,
                opacity: 0.5,
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: stat.bg,
                  color: stat.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  border: `1.5px solid ${stat.color}15`,
                }}>
                  {stat.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: stat.isText ? 15 : 24, fontWeight: 800, color: 'var(--text-bright)',
                    lineHeight: 1.1, letterSpacing: '-0.5px',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginTop: 3 }}>{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════
            2. PROJECTS SECTION
        ════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <FolderKanban size={16} /> Your Projects
            </h2>
            <span style={{
              fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
              padding: '3px 10px', background: 'rgba(26,115,232,0.04)',
              borderRadius: 6, border: '1.5px solid rgba(26,115,232,0.06)',
            }}>
              {projects.length} total · {activeProjects} active
            </span>
          </div>

          {projects.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '64px 40px',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(16px)',
              borderRadius: 'var(--border-radius)',
              border: '2px dashed rgba(26,115,232,0.1)',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(245,130,32,0.1), rgba(255,159,67,0.05))',
                color: '#F58220',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                border: '1.5px solid rgba(245,130,32,0.15)',
              }}>
                <Rocket size={34} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-bright)', margin: '0 0 10px', letterSpacing: '-0.3px' }}>
                Your analytics journey starts here
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.7 }}>
                Create your first project to start tracking Share of Voice across YouTube keywords.
                Monitor your brand, analyze competitors, and uncover growth opportunities.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '12px 32px', fontSize: 14, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #F58220 0%, #FF9F43 100%)',
                  color: '#FFFFFF', border: 'none', borderRadius: 12,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 6px 20px rgba(245,130,32,0.3)',
                  transition: 'all 0.2s',
                }}
              >
                <Plus size={16} /> Create Your First Project
              </motion.button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: 14,
            }}>
              {projects.map((project, i) => {
                const roleCfg = ROLE_CONFIG[project.role] || ROLE_CONFIG.viewer
                const isActive = project.status === 'active'
                const sparklineData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 20)

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.35 + i * 0.05 }}
                    className="card-interactive"
                    onClick={() => handleEnterProject(project)}
                    style={{ padding: 22, display: 'flex', flexDirection: 'column', position: 'relative', cursor: 'pointer' }}
                  >
                    <div style={{
                      position: 'absolute', top: 0, left: 20, right: 20, height: 2,
                      background: `linear-gradient(90deg, ${roleCfg.color}, ${roleCfg.color}66, transparent)`,
                      borderRadius: '0 0 2px 2px', opacity: 0.4,
                    }} />

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h3 style={{
                            fontSize: 17, fontWeight: 800, color: 'var(--text-bright)',
                            margin: 0, lineHeight: 1.2, letterSpacing: '-0.2px',
                          }}>
                            {project.name}
                          </h3>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 8px', borderRadius: 6,
                            background: isActive ? 'rgba(0,200,83,0.1)' : 'rgba(255,109,0,0.1)',
                            border: `1.5px solid ${isActive ? 'rgba(0,200,83,0.25)' : 'rgba(255,109,0,0.25)'}`,
                            color: isActive ? '#00C853' : '#FF6D00',
                            fontSize: 10, fontWeight: 700,
                          }}>
                            {isActive ? <Play size={9} /> : <Pause size={9} />}
                            {isActive ? 'Active' : 'Paused'}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <span>{project.category || 'Uncategorized'}</span>
                          {project.sub_category && (
                            <>
                              <span style={{ opacity: 0.4 }}>›</span>
                              <span>{project.sub_category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 9px', borderRadius: 6,
                        background: roleCfg.bg, border: `1.5px solid ${roleCfg.border}`,
                        color: roleCfg.color, fontSize: 10, fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {roleCfg.icon}
                        {roleCfg.label}
                      </div>
                    </div>

                    {project.description && (
                      <p style={{
                        fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5,
                        margin: '0 0 14px', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {project.description}
                      </p>
                    )}

                    <div style={{ flex: 1 }} />

                    {/* Stats Row */}
                    <div style={{
                      display: 'flex', gap: 16, paddingTop: 14,
                      borderTop: '1.5px solid rgba(26,115,232,0.06)',
                      marginBottom: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Hash size={12} color="#7C3AED" />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{project.keyword_count}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>keywords</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Tag size={12} color="#FF6D00" />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{project.brand_count}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>brands</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Video size={12} color="#1A73E8" />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {Math.floor(project.keyword_count * 8.5)}
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>videos</span>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                        <MiniSparkline data={sparklineData} />
                      </div>
                    </div>

                    {/* Bottom Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={11} color="var(--text-muted)" />
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                          {formatTimeAgo(project.last_scraped)}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 12, color: '#F58220',
                        fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        Open Dashboard <ArrowRight size={12} />
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════
            4. RECENT ACTIVITY + 5. PLATFORM STATS
        ════════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}>
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="card"
            style={{ padding: 22 }}
          >
            <h2 style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 18px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Sparkles size={16} color="#F58220" /> Recent Activity
            </h2>

            {recentActivity.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px 20px',
                color: 'var(--text-muted)', fontSize: 13,
              }}>
                <Activity size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p style={{ margin: 0 }}>No recent activity yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {recentActivity.map((activity, i) => {
                  const iconMap = {
                    keyword_added: <Search size={14} />,
                    video_discovered: <Video size={14} />,
                    scrape_completed: <Zap size={14} />,
                    project_created: <Plus size={14} />,
                  }
                  const colorMap = {
                    keyword_added: '#7C3AED',
                    video_discovered: '#1A73E8',
                    scrape_completed: '#00C853',
                    project_created: '#F58220',
                  }
                  return (
                    <div
                      key={activity.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 0',
                        borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(26,115,232,0.06)' : 'none',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `${colorMap[activity.type]}0D`,
                        color: colorMap[activity.type],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        border: `1.5px solid ${colorMap[activity.type]}15`,
                      }}>
                        {iconMap[activity.type]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {activity.message}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                          {formatTimeAgo(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Platform Stats */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="card"
            style={{ padding: 22 }}
          >
            <h2 style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 18px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Globe size={16} color="#1A73E8" /> Platform Stats
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                {
                  label: 'Total Keywords Tracked',
                  value: platformStats.totalKeywords.toLocaleString(),
                  icon: <Hash size={16} />,
                  color: '#7C3AED',
                  barWidth: Math.min(100, (platformStats.totalKeywords / 500) * 100),
                },
                {
                  label: 'Total Videos Discovered',
                  value: platformStats.totalVideos.toLocaleString(),
                  icon: <Video size={16} />,
                  color: '#1A73E8',
                  barWidth: Math.min(100, (platformStats.totalVideos / 5000) * 100),
                },
                {
                  label: 'Total Brands Monitored',
                  value: platformStats.totalBrands.toLocaleString(),
                  icon: <Tag size={16} />,
                  color: '#FF6D00',
                  barWidth: Math.min(100, (platformStats.totalBrands / 100) * 100),
                },
              ].map(stat => (
                <div key={stat.label}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `${stat.color}0D`,
                        color: stat.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${stat.color}15`,
                      }}>
                        {stat.icon}
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{stat.label}</span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-bright)', fontVariantNumeric: 'tabular-nums' }}>
                      {stat.value}
                    </span>
                  </div>
                  <div style={{
                    height: 4, borderRadius: 2,
                    background: 'rgba(26,115,232,0.06)',
                    overflow: 'hidden',
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.barWidth}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      style={{
                        height: '100%', borderRadius: 2,
                        background: `linear-gradient(90deg, ${stat.color}, ${stat.color}88)`,
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Data Freshness */}
              <div style={{
                marginTop: 8, padding: '14px 16px',
                background: 'rgba(26,115,232,0.03)',
                borderRadius: 10, border: '1.5px solid rgba(26,115,232,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: platformStats.lastDataFreshness ? 'rgba(0,200,83,0.1)' : 'rgba(100,116,139,0.1)',
                    color: platformStats.lastDataFreshness ? '#00C853' : '#94A3B8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {platformStats.lastDataFreshness ? <Activity size={14} /> : <Clock size={14} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Data Freshness</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                      {platformStats.lastDataFreshness
                        ? `Last updated ${formatTimeAgo(platformStats.lastDataFreshness)}`
                        : 'No data yet — run your first scrape'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          CREATE PROJECT MODAL
      ════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="card"
            style={{
              width: '100%', maxWidth: 520, padding: 28,
              border: '1.5px solid rgba(26,115,232,0.08)', position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: 'linear-gradient(90deg, #F58220, #FF9F43, transparent)',
              borderRadius: '14px 14px 0 0',
            }} />

            <button
              onClick={() => { setShowCreateModal(false); setError(null) }}
              style={{
                position: 'absolute', top: 20, right: 20,
                background: 'rgba(26,115,232,0.04)', border: '1.5px solid rgba(26,115,232,0.08)',
                borderRadius: 8, cursor: 'pointer', color: '#94A3B8',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,115,232,0.1)'; e.currentTarget.style.color = '#475569' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(26,115,232,0.04)'; e.currentTarget.style.color = '#94A3B8' }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(245,130,32,0.1), rgba(255,159,67,0.05))',
                color: '#F58220', border: '1.5px solid rgba(245,130,32,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Plus size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-bright)', margin: 0 }}>Create Analytics Project</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Set up a new project to start tracking Share of Voice
                </p>
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 8,
                background: 'linear-gradient(135deg, #FEF2F2, #FFF5F5)',
                border: '1.5px solid rgba(255,45,85,0.15)', color: '#B91C1C',
                fontSize: 12.5, fontWeight: 500, marginBottom: 18, alignItems: 'center',
              }}>
                <X size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#475569', display: 'block', marginBottom: 6 }}>Project Name *</label>
              <input className="input" type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Q3 Mobile Launch, Tech Brands India" style={{ height: 40, fontSize: 13.5 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#475569', display: 'block', marginBottom: 6 }}>Category *</label>
                <select className="input" value={selectedCatId} onChange={e => { setSelectedCatId(e.target.value); setSelectedSubCatId('') }} style={{ height: 40, fontSize: 13 }}>
                  <option value="">Select Category</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#475569', display: 'block', marginBottom: 6 }}>Sub-category</label>
                <select className="input" value={selectedSubCatId} onChange={e => setSelectedSubCatId(e.target.value)} disabled={!selectedCatId} style={{ height: 40, fontSize: 13 }}>
                  <option value="">Select Sub-category</option>
                  {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#475569', display: 'block', marginBottom: 6 }}>Description</label>
              <textarea className="input" rows={2} value={projectDesc} onChange={e => setProjectDesc(e.target.value)} placeholder="Briefly describe the campaign target for reference..." style={{ resize: 'none', fontSize: 13 }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleCreateProject} disabled={creating}
                style={{
                  flex: 1, height: 42, fontSize: 13.5, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #F58220 0%, #FF9F43 100%)',
                  color: '#FFFFFF', border: 'none', borderRadius: 10,
                  cursor: creating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  opacity: creating ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(245,130,32,0.25)',
                  transition: 'all 0.15s',
                }}
              >
                {creating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                Create Project
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setShowCreateModal(false); setError(null) }}
                style={{ flex: 1, height: 42 }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
