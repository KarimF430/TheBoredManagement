import type { Metadata } from 'next'
import './globals.css'
import CampaignShell from '@/components/cp/CampaignShell'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Campaign Management Panel | TheBoredMonkey',
  description: 'Enterprise Influencer Campaign CRM tracking workflow SLAs, creator status, and live post analytics — built by TheBoredMonkey.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <CampaignShell>{children}</CampaignShell>
        </Providers>
      </body>
    </html>
  )
}
