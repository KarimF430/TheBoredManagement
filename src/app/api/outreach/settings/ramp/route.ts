import { NextResponse } from 'next/server'
import { outreachSelect, outreachUpdate } from '@/lib/outreach/db'

export async function GET() {
  try {
    const rows = await outreachSelect<any>('outreach_ramp_state', { limit: 1 })
    return NextResponse.json({ ramp: rows[0] || null })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    const rows = await outreachSelect<any>('outreach_ramp_state', { limit: 1 })
    if (!rows.length) return NextResponse.json({ error: 'No ramp state found' }, { status: 404 })

    const ramp = rows[0]

    if (action === 'reset') {
      await outreachUpdate('outreach_ramp_state', 'id', ramp.id, {
        current_step: 0,
        current_daily_budget: 200,
        sent_today_global: 0,
        last_advanced_at: null,
        updated_at: new Date().toISOString(),
      })
      return NextResponse.json({ ok: true, current_daily_budget: 200 })
    }

    if (action === 'advance') {
      const BUDGET_LADDER = [200, 400, 700, 1100, 1600, 2100, 2500]
      const nextStep = ramp.current_step + 1
      if (nextStep >= BUDGET_LADDER.length) {
        return NextResponse.json({ advanced: false, reason: 'Already at max budget' })
      }
      await outreachUpdate('outreach_ramp_state', 'id', ramp.id, {
        current_step: nextStep,
        current_daily_budget: BUDGET_LADDER[nextStep],
        last_advanced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      return NextResponse.json({ advanced: true, newBudget: BUDGET_LADDER[nextStep] })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
