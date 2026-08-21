'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { NICHE_CLUSTERS, type Cluster, type NicheItem } from '@/lib/creator-onboarding-taxonomy'

interface NicheSelectorProps {
  selectedCluster: string | null
  selectedPrimary: string | null
  selectedSecondary: string[]
  onSelectCluster: (clusterId: string) => void
  onSelectPrimary: (niche: string) => void
  onSelectSecondary: (niches: string[]) => void
  onBack: () => void
}

export default function NicheSelector({
  selectedCluster,
  selectedPrimary,
  selectedSecondary,
  onSelectCluster,
  onSelectPrimary,
  onSelectSecondary,
  onBack,
}: NicheSelectorProps) {
  const [view, setView] = useState<'clusters' | 'niches'>(selectedCluster ? 'niches' : 'clusters')
  const [activeCluster, setActiveCluster] = useState<Cluster | null>(
    selectedCluster ? NICHE_CLUSTERS.find(c => c.id === selectedCluster) || null : null
  )

  const handleClusterClick = useCallback((cluster: Cluster) => {
    setActiveCluster(cluster)
    onSelectCluster(cluster.id)
    setView('niches')
  }, [onSelectCluster])

  const handleBack = useCallback(() => {
    setView('clusters')
    setActiveCluster(null)
    onBack()
  }, [onBack])

  const handleNicheClick = useCallback((nicheName: string) => {
    if (nicheName === selectedPrimary) {
      onSelectPrimary(null as unknown as string)
    } else if (!selectedPrimary) {
      onSelectPrimary(nicheName)
    } else {
      const isSelected = selectedSecondary.includes(nicheName)
      if (isSelected) {
        onSelectSecondary(selectedSecondary.filter((n) => n !== nicheName))
      } else if (selectedSecondary.length < 4) {
        onSelectSecondary([...selectedSecondary, nicheName])
      }
    }
  }, [selectedPrimary, selectedSecondary, onSelectPrimary, onSelectSecondary])

  const hasSelection = !!selectedPrimary || selectedSecondary.length > 0

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      {view === 'niches' && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
          style={{ color: 'var(--onb-text-muted)', fontFamily: 'var(--onb-font-body)' }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All clusters
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* ── Cluster Grid (Screen A) ── */}
        {view === 'clusters' && (
          <motion.div
            key="clusters"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
          >
            <div className="onb-label">Choose a cluster</div>
            <div className="grid grid-cols-2 gap-3">
              {NICHE_CLUSTERS.map((cluster) => {
                const clusterHasSelected = cluster.niches.some(
                  n => n.niche_name === selectedPrimary || selectedSecondary.includes(n.niche_name)
                )
                return (
                  <motion.button
                    key={cluster.id}
                    onClick={() => handleClusterClick(cluster)}
                    className="onb-cluster-card"
                    data-selected={clusterHasSelected}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="onb-cluster-card__emoji">{cluster.emoji}</span>
                    <div className="onb-cluster-card__name">{cluster.name}</div>
                    <div className="onb-cluster-card__vibe">{cluster.vibe}</div>
                    <div className="onb-cluster-card__count">{cluster.niches.length} niches</div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── Niche Grid (Screen B) ── */}
        {view === 'niches' && activeCluster && (
          <motion.div
            key="niches"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Cluster header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{activeCluster.emoji}</span>
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--onb-text)', fontFamily: 'var(--onb-font-display)' }}
              >
                {activeCluster.name}
              </span>
            </div>

            {/* Selection instruction */}
            <div className="onb-label" style={{ marginTop: 12 }}>
              {!selectedPrimary ? 'Pick your primary niche' : 'Add secondary niches (optional)'}
            </div>

            {/* Niche chips — all niches in cluster */}
            <div className="flex flex-wrap gap-2">
              {activeCluster.niches.map((niche) => {
                const isPrimary = selectedPrimary === niche.niche_name
                const isSecondary = selectedSecondary.includes(niche.niche_name)
                return (
                  <motion.button
                    key={niche.id}
                    onClick={() => handleNicheClick(niche.niche_name)}
                    className="onb-chip"
                    data-selected={isSecondary}
                    data-primary={isPrimary}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{ gap: 8 }}
                  >
                    <span>{niche.icon}</span>
                    <span>{niche.niche_name}</span>
                    {isPrimary && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        background: 'var(--onb-coral)',
                        color: '#FFF',
                        padding: '1px 5px',
                        borderRadius: 4,
                      }}>P</span>
                    )}
                    {isSecondary && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        background: 'var(--onb-violet)',
                        color: '#FFF',
                        padding: '1px 5px',
                        borderRadius: 4,
                      }}>
                        {selectedSecondary.indexOf(niche.niche_name) + 1}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>

            {/* Sub-niches hint */}
            {selectedPrimary && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 rounded-xl"
                style={{
                  background: 'var(--onb-coral-dim)',
                  border: '1px solid rgba(255,90,95,0.15)',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--onb-text-dim)', fontFamily: 'var(--onb-font-body)' }}>
                  Sub-niches for <strong style={{ color: 'var(--onb-coral)' }}>{selectedPrimary}</strong>:{' '}
                  {activeCluster.niches
                    .find(n => n.niche_name === selectedPrimary)
                    ?.sub_niches.join(', ') || '—'}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected summary */}
      {hasSelection && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {selectedPrimary && (
            <span
              className="onb-chip"
              data-primary="true"
              style={{ cursor: 'default', fontSize: 12, padding: '6px 10px' }}
            >
              {selectedPrimary}
            </span>
          )}
          {selectedSecondary.map((niche, i) => (
            <span
              key={niche}
              className="onb-chip"
              data-selected="true"
              style={{ cursor: 'default', fontSize: 12, padding: '6px 10px' }}
            >
              {niche}
            </span>
          ))}
        </motion.div>
      )}
    </div>
  )
}
