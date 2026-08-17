import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Creator Onboarding | TheBoredMonkey',
  description: 'Complete your creator profile to get matched with brands',
}

export default function CreatorOnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
