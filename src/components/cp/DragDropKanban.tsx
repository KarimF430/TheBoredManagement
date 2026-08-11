'use client'

import { useState, useRef, useCallback } from 'react'
import {
  GripVertical, ExternalLink, Clock, CheckCircle2,
  FileText, Film, Eye, Rocket, MoreVertical
} from 'lucide-react'

interface Column {
  id: string
  label: string
  icon: typeof Clock
  color: string
  bg: string
}

interface DragDropKanbanProps<T extends { id: string; status: string; platform: string; script_current_version: number; views: number; likes: number; live_link: string | null; creator: { channel_name: string } | null }> {
  columns: Column[]
  deliverables: T[]
  onStatusChange: (deliverableId: string, newStatus: string) => void
  onCardClick: (deliverable: T) => void | Promise<void>
  platformLabels: Record<string, string>
}

export default function DragDropKanban<T extends { id: string; status: string; platform: string; script_current_version: number; views: number; likes: number; live_link: string | null; creator: { channel_name: string } | null }>({
  columns,
  deliverables,
  onStatusChange,
  onCardClick,
  platformLabels,
}: DragDropKanbanProps<T>) {
  const [draggedItem, setDraggedItem] = useState<T | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragCounter = useRef<Record<string, number>>({})

  const getDeliverablesByStatus = (status: string) =>
    deliverables.filter(d => d.status === status)

  const handleDragStart = useCallback((e: React.DragEvent, deliverable: T) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', deliverable.id)
    setDraggedItem(deliverable)
    // Add dragging class after a tick to avoid flash
    requestAnimationFrame(() => {
      const el = e.currentTarget as HTMLElement
      el.classList.add('dragging')
    })
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.classList.remove('dragging')
    setDraggedItem(null)
    setDragOverColumn(null)
    setDragOverIndex(null)
    dragCounter.current = {}
  }, [])

  const handleDragEnterColumn = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) + 1
    setDragOverColumn(columnId)
  }, [])

  const handleDragLeaveColumn = useCallback((e: React.DragEvent, columnId: string) => {
    dragCounter.current[columnId] = (dragCounter.current[columnId] || 1) - 1
    if (dragCounter.current[columnId] <= 0) {
      dragCounter.current[columnId] = 0
      if (dragOverColumn === columnId) {
        setDragOverColumn(null)
      }
    }
  }, [dragOverColumn])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    const deliverableId = e.dataTransfer.getData('text/plain')
    if (deliverableId && draggedItem && draggedItem.status !== columnId) {
      onStatusChange(deliverableId, columnId)
    }
    setDraggedItem(null)
    setDragOverColumn(null)
    setDragOverIndex(null)
    dragCounter.current = {}
  }, [draggedItem, onStatusChange])

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return n.toLocaleString()
  }

  return (
    <div style={{
      display: 'flex', gap: 12,
      overflowX: 'auto', paddingBottom: 16, minHeight: 500,
    }}>
      {columns.map(col => {
        const items = getDeliverablesByStatus(col.id)
        const Icon = col.icon
        const isOver = dragOverColumn === col.id

        return (
          <div
            key={col.id}
            className={`kanban-column ${isOver ? 'drag-over' : ''}`}
            onDragEnter={e => handleDragEnterColumn(e, col.id)}
            onDragLeave={e => handleDragLeaveColumn(e, col.id)}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, col.id)}
            style={{
              minWidth: 300, maxWidth: 340, flex: '1 0 300px',
              background: isOver ? 'rgba(26,115,232,0.03)' : col.bg,
              borderRadius: 'var(--border-radius)',
              border: `1.5px solid ${isOver ? 'rgba(26,115,232,0.2)' : 'rgba(255,255,255,0.6)'}`,
              display: 'flex', flexDirection: 'column',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Column Header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: `1.5px solid ${col.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={14} style={{ color: col.color }} />
                <span style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {col.label}
                </span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, color: col.color,
                background: `${col.color}15`,
                padding: '2px 8px', borderRadius: 10,
              }}>
                {items.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{
              flex: 1, padding: 8, overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 6,
              minHeight: 100,
            }}>
              {items.map((d, index) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={e => handleDragStart(e, d)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onCardClick(d)}
                  className="kanban-card"
                  style={{
                    background: '#FFF',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1.5px solid rgba(255,255,255,0.8)',
                    padding: '12px 14px',
                    cursor: 'grab',
                    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    position: 'relative',
                  }}
                >
                  {/* Drag Handle */}
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    color: 'var(--text-muted)', opacity: 0.4,
                  }}>
                    <GripVertical size={14} />
                  </div>

                  {/* Creator + Platform */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: 'var(--blue-gradient)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#FFF', fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>
                      {d.creator?.channel_name?.charAt(0) || '?'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {d.creator?.channel_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {platformLabels[d.platform] || d.platform}
                      </div>
                    </div>
                  </div>

                  {/* Status + Version */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: col.color,
                      background: `${col.color}12`,
                      padding: '2px 8px', borderRadius: 10,
                    }}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                    {d.script_current_version > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        v{d.script_current_version}
                      </span>
                    )}
                  </div>

                  {/* Live link indicator */}
                  {d.live_link && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ExternalLink size={10} style={{ color: 'var(--green)' }} />
                      <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>Live</span>
                    </div>
                  )}

                  {/* Metrics preview */}
                  {d.views > 0 && (
                    <div style={{
                      marginTop: 6, display: 'flex', gap: 8,
                      fontSize: 10, color: 'var(--text-muted)',
                    }}>
                      <span>{formatNumber(d.views)} views</span>
                      <span>{formatNumber(d.likes)} likes</span>
                    </div>
                  )}
                </div>
              ))}

              {items.length === 0 && (
                <div style={{
                  padding: 24, textAlign: 'center',
                  color: 'var(--text-muted)', fontSize: 11,
                  border: '2px dashed var(--border-2)',
                  borderRadius: 10, marginTop: 4,
                }}>
                  {isOver ? 'Drop here' : 'No items'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
