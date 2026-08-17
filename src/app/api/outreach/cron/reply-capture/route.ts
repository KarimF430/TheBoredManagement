import { NextResponse } from 'next/server'
import { captureAllReplies } from '@/workers/replyCapture'

export async function GET() {
  try {
    const result = await captureAllReplies()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
