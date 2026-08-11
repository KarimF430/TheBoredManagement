'use client'

import { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle } from 'lucide-react'

interface ParsedCreator {
  channel_name: string
  channel_url: string
  platform: string
  followers?: number
  engagement_rate?: number
  category?: string
  notes?: string
  _valid: boolean
  _error?: string
}

interface BulkImportProps {
  campaignId: string
  onImported: () => void
  onClose: () => void
}

function parseCSV(text: string): ParsedCreator[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const creators: ParsedCreator[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''))
    if (values.length < 2 || !values[0]) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })
    const name = row['channel_name'] || row['name'] || row['creator'] || values[0] || ''
    const url = row['channel_url'] || row['url'] || row['link'] || values[1] || ''
    const platform = row['platform'] || row['type'] || ''
    let detectedPlatform = platform || 'youtube_long'
    if (!platform) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) detectedPlatform = 'youtube_long'
      else if (url.includes('instagram.com')) detectedPlatform = 'instagram_reels'
    }
    const creator: ParsedCreator = {
      channel_name: name, channel_url: url, platform: detectedPlatform,
      followers: parseInt(row['followers'] || row['subscribers'] || '0') || 0,
      engagement_rate: parseFloat(row['engagement_rate'] || row['engagement'] || '0') || 0,
      category: row['category'] || row['niche'] || '',
      notes: row['notes'] || row['description'] || '',
      _valid: true,
    }
    if (!creator.channel_name) { creator._valid = false; creator._error = 'Missing channel name' }
    else if (!creator.channel_url) { creator._valid = false; creator._error = 'Missing channel URL' }
    creators.push(creator)
  }
  return creators
}

export default function BulkImport({ campaignId, onImported, onClose }: BulkImportProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [creators, setCreators] = useState<ParsedCreator[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => { setCreators(parseCSV(e.target?.result as string)) }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) handleFile(file)
  }

  const handleImport = async () => {
    const valid = creators.filter(c => c._valid)
    if (valid.length === 0) return
    setImporting(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/creators/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creators: valid.map(({ _valid, _error, ...c }) => c) }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult({ inserted: data.inserted, errors: [] })
      onImported()
    } catch (err: unknown) {
      setResult({ inserted: 0, errors: [err instanceof Error ? err.message : 'Import failed'] })
    } finally { setImporting(false) }
  }

  const validCount = creators.filter(c => c._valid).length
  const errorCount = creators.filter(c => !c._valid).length

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()} style={{ animation: 'slideIn 0.2s ease' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-bright)' }}>Bulk Import Creators</h2>
          <button onClick={onClose} className="btn-subtle" style={{ padding: 4 }}><X size={14} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {!result ? (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? 'var(--blue)' : 'var(--border-1)'}`, borderRadius: 'var(--radius)', padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'var(--blue-dim)' : 'var(--bg-elevated)', transition: 'all 0.15s', marginBottom: 16 }}
              >
                <Upload size={20} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Drop CSV file or click to browse</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Headers: channel_name, channel_url, platform, followers, engagement_rate, category</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {creators.length > 0 && (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, fontWeight: 600 }}>
                    <span style={{ color: 'var(--green)' }}>{validCount} valid</span>
                    {errorCount > 0 && <span style={{ color: 'var(--red)' }}>{errorCount} errors</span>}
                  </div>
                  <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--border-1)', borderRadius: 'var(--radius)' }}>
                    <table className="data-table" style={{ fontSize: 12 }}>
                      <thead><tr><th>Name</th><th>URL</th><th>Platform</th><th>Status</th></tr></thead>
                      <tbody>
                        {creators.map((c, i) => (
                          <tr key={i} style={{ opacity: c._valid ? 1 : 0.5 }}>
                            <td style={{ fontWeight: 600 }}>{c.channel_name}</td>
                            <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.channel_url}</td>
                            <td><span className="badge badge-blue">{c.platform}</span></td>
                            <td>{c._valid ? <Check size={14} style={{ color: 'var(--green)' }} /> : <span style={{ fontSize: 10, color: 'var(--red)' }}>{c._error}</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              {result.errors.length > 0 ? <AlertCircle size={40} style={{ color: 'var(--red)', margin: '0 auto 12px', display: 'block' }} /> : <Check size={40} style={{ color: 'var(--green)', margin: '0 auto 12px', display: 'block' }} />}
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-bright)', marginBottom: 4 }}>{result.errors.length > 0 ? 'Import Failed' : 'Import Complete'}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{result.inserted > 0 && `${result.inserted} creators imported. `}{result.errors.length > 0 && result.errors.join(', ')}</p>
            </div>
          )}
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
          {!result && (
            <button onClick={handleImport} disabled={importing || validCount === 0} className="btn btn-blue btn-sm">
              {importing ? 'Importing...' : `Import ${validCount} creators`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
