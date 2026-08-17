import { NextResponse } from 'next/server'
import { processBatch } from '@/workers/processor'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const batchSize = parseInt(searchParams.get('batch') || '50')

  try {
    const result = await processBatch(batchSize)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
