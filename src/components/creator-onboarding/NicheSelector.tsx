'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Search } from 'lucide-react'

interface NicheOption {
  name: string
  icon: string
  sub_niches: string[]
  content_types: string[]
}

interface NicheSelectorProps {
  niches: NicheOption[]
  selectedPrimary: string | null
  selectedSecondary: string[]
  onSelectPrimary: (niche: string) => void
  onSelectSecondary: (niches: string[]) => void
}

export default function NicheSelector({
  niches,
  selectedPrimary,
  selectedSecondary,
  onSelectPrimary,
  onSelectSecondary,
}: NicheSelectorProps) {
  const [search, setSearch] = useState('')
  const [hoveredNiche, setHoveredNiche] = useState<string | null>(null)

  const filteredNiches = niches.filter((niche) =>
    niche.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggleSecondary = useCallback(
    (nicheName: string) => {
      if (nicheName === selectedPrimary) return
      
      const isSelected = selectedSecondary.includes(nicheName)
      if (isSelected) {
        onSelectSecondary(selectedSecondary.filter((n) => n !== nicheName))
      } else if (selectedSecondary.length < 3) {
        onSelectSecondary([...selectedSecondary, nicheName])
      }
    },
    [selectedPrimary, selectedSecondary, onSelectSecondary]
  )

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search niches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Primary Niche Label */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Primary Niche (Required)
        </span>
      </div>

      {/* Niche Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <AnimatePresence mode="popLayout">
          {filteredNiches.map((niche) => {
            const isPrimary = selectedPrimary === niche.name
            const isSecondary = selectedSecondary.includes(niche.name)
            const isHovered = hoveredNiche === niche.name

            return (
              <motion.button
                key={niche.name}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => {
                  if (isPrimary) {
                    onSelectPrimary(null as unknown as string)
                  } else if (isSecondary) {
                    handleToggleSecondary(niche.name)
                  } else if (!selectedPrimary) {
                    onSelectPrimary(niche.name)
                  } else {
                    handleToggleSecondary(niche.name)
                  }
                }}
                onMouseEnter={() => setHoveredNiche(niche.name)}
                onMouseLeave={() => setHoveredNiche(null)}
                className={`
                  relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center
                  ${isPrimary
                    ? 'border-blue-500 bg-blue-950/30 text-blue-400 shadow-lg shadow-blue-500/10'
                    : isSecondary
                    ? 'border-indigo-500 bg-indigo-950/30 text-indigo-400'
                    : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Selection Badge */}
                {(isPrimary || isSecondary) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      isPrimary ? 'bg-blue-500' : 'bg-indigo-500'
                    }`}
                  >
                    {isPrimary ? 'P' : selectedSecondary.indexOf(niche.name) + 1}
                  </motion.div>
                )}

                {/* Icon */}
                <span className="text-2xl">{niche.icon || '📁'}</span>

                {/* Name */}
                <span className={`text-xs font-medium ${isPrimary ? 'text-blue-400' : isSecondary ? 'text-indigo-400' : 'text-slate-200'}`}>
                  {niche.name}
                </span>

                {/* Sub-niches count */}
                <span className="text-[10px] text-slate-500">
                  {niche.sub_niches.length} sub-niches
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Selected Summary */}
      {(selectedPrimary || selectedSecondary.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl"
        >
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Selected:</div>
          <div className="flex flex-wrap gap-2">
            {selectedPrimary && (
              <span className="px-2 py-1 bg-blue-950/40 border border-blue-800/50 text-blue-400 rounded-lg text-xs font-medium">
                P: {selectedPrimary}
              </span>
            )}
            {selectedSecondary.map((niche, index) => (
              <span
                key={niche}
                className="px-2 py-1 bg-indigo-950/40 border border-indigo-800/50 text-indigo-400 rounded-lg text-xs font-medium"
              >
                {index + 1}: {niche}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
