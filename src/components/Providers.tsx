'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/CustomThemeProvider'
import { getQueryClient } from '@/lib/queryClient'

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
