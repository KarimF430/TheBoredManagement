'use client'

import KeywordsTab from '@/components/tabs/KeywordsTab'
import { motion } from 'framer-motion'

export default function KeywordsPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} style={{ padding: '6px 0' }}>
      <KeywordsTab />
    </motion.div>
  )
}
