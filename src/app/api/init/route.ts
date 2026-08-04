import { NextRequest, NextResponse } from 'next/server'
import { ensureWorkersStarted } from '@/lib/worker-startup'
import { runAllMigrations } from '@/lib/migrations'

let initialized = false

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const expected = process.env.CRON_SECRET

  // Allow unauthenticated access for pre-warm (GET without secret)
  // CRON_SECRET only required for authenticated cron operations
  if (secret && expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (initialized) {
    return NextResponse.json({ ok: true, message: 'Already initialized' })
  }

  try {
    const migrationResult = await runAllMigrations()

    await ensureWorkersStarted()
    initialized = true

    return NextResponse.json({
      ok: true,
      message: 'App initialized successfully',
      migrations: migrationResult,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
