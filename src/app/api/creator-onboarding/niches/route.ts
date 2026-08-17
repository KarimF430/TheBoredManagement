import { NextResponse } from 'next/server'
import { getNicheTaxonomy } from '@/lib/creator-onboarding'

export async function GET() {
  try {
    const niches = await getNicheTaxonomy()
    return NextResponse.json({ niches })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
