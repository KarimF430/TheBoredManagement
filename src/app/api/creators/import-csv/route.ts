import { NextRequest, NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

export async function POST(req: NextRequest) {
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
    const ytIdx = headers.indexOf('youtube_url')
    const igIdx = headers.indexOf('instagram_url')
    const subIdx = headers.indexOf('subscribers')
    const viewsIdx = headers.indexOf('avg_views')
    const engIdx = headers.indexOf('avg_engagement')
    const tierIdx = headers.indexOf('tier')
    const nicheIdx = headers.indexOf('niche')
    const notesIdx = headers.indexOf('notes')

    const client = getCPClient()

    // Get existing emails for dedupe
    const { data: existing } = await client.from('cp_creator_pool').select('email')
    const existingEmails = new Set((existing || []).map((c: any) => c.email?.toLowerCase()))

    let imported = 0
    let skipped = 0

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim())
      const email = cols[emailIdx]?.toLowerCase()
      if (!email || !email.includes('@')) { skipped++; continue }
      if (existingEmails.has(email)) { skipped++; continue }

      const nicheRaw = nicheIdx >= 0 ? cols[nicheIdx] || '' : ''
      const niche = nicheRaw ? nicheRaw.split(';').map((s: string) => s.trim()).filter(Boolean) : []

      try {
        await client.from('cp_creator_pool').insert({
          name: nameIdx >= 0 ? cols[nameIdx] || null : null,
          email,
          youtube_url: ytIdx >= 0 ? cols[ytIdx] || null : null,
          instagram_url: igIdx >= 0 ? cols[igIdx] || null : null,
          subscribers: subIdx >= 0 ? parseInt(cols[subIdx]) || 0 : 0,
          avg_views: viewsIdx >= 0 ? parseInt(cols[viewsIdx]) || 0 : 0,
          avg_engagement: engIdx >= 0 ? parseFloat(cols[engIdx]) || 0 : 0,
          tier: tierIdx >= 0 ? cols[tierIdx] || 'micro' : 'micro',
          niche,
          notes: notesIdx >= 0 ? cols[notesIdx] || null : null,
          source: 'csv_import',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        existingEmails.add(email)
        imported++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({ imported, skipped, total: lines.length - 1 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
