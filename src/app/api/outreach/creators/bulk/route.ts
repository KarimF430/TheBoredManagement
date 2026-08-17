import { NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const ids = body.ids as string[]
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }

    const client = getCPClient()
    const { error } = await client.from('outreach_creators').delete().in('id', ids)
    if (error) throw new Error(error.message)

    return NextResponse.json({ deleted: ids.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
