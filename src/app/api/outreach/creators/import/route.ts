import { NextResponse } from 'next/server'
import { outreachInsert, outreachSelect } from '@/lib/outreach/db'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 })
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const emailIdx = headers.indexOf('email')
    if (emailIdx === -1) {
      return NextResponse.json({ error: 'CSV must have an "email" column' }, { status: 400 })
    }

    const nameIdx = headers.indexOf('name')
    const nicheIdx = headers.indexOf('niche')
    const tierIdx = headers.indexOf('size_tier')
    const jurIdx = headers.indexOf('jurisdiction')
    const srcIdx = headers.indexOf('source')

    // Get existing emails for dedupe
    const existing = await outreachSelect<any>('outreach_creators', {})
    const existingEmails = new Set(existing.map((c: any) => c.email))

    let imported = 0
    let skipped = 0

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim())
      const email = cols[emailIdx]?.toLowerCase()
      if (!email) { skipped++; continue }
      if (existingEmails.has(email)) { skipped++; continue }

      try {
        await outreachInsert('outreach_creators', {
          email,
          name: nameIdx >= 0 ? cols[nameIdx] || null : null,
          niche: nicheIdx >= 0 ? cols[nicheIdx] || null : null,
          size_tier: tierIdx >= 0 ? cols[tierIdx] || null : null,
          jurisdiction: jurIdx >= 0 ? cols[jurIdx] || null : null,
          source: srcIdx >= 0 ? cols[srcIdx] || 'csv_import' : 'csv_import',
        })
        existingEmails.add(email)
        imported++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({ imported, skipped, total: lines.length - 1 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
