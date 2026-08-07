'use client'

import { Suspense } from 'react'
import { LoadingState } from '@/components/StateViews'
import OurVideosTab from '@/components/tabs/OurVideosTab'

export default function OurVideosPage() {
  return (
    <Suspense fallback={<LoadingState title="Loading our videos..." />}>
      <div className="anim-fade-up">
        <OurVideosTab />
      </div>
    </Suspense>
  )
}
