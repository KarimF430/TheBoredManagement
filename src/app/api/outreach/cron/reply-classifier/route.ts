import { NextResponse } from 'next/server'
import { classifyPending } from '@/workers/replyClassifier'

export async function GET() {
  try {
    const result = await classifyPending()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
