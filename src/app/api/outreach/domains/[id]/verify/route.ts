import { NextResponse } from 'next/server'
import { verifyDomain } from '@/lib/outreach/authVerifier'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await verifyDomain(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[verify-domain] Error:', err)
    return NextResponse.json(
      { error: (err as Error).message, stack: (err as Error).stack },
      { status: 500 }
    )
  }
}
