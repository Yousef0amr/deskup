import React from 'react'
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Group,
  Ungroup,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Grid3x3,
  ChevronUp,
  ChevronDown,
  X,
  Pencil,
  Square,
  Circle,
  Diamond,
  ArrowUpRight,
  Minus,
  Type,
  StickyNote
} from 'lucide-react'
import type { WbElement } from '../../../../shared/whiteboard'
import { cn } from '../../lib/utils'

export type AlignKind = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'distH' | 'distV'

interface WbLayersPanelProps {
  open: boolean
  onToggleOpen: () => void
  elements: WbElement[]
  selected: Set<string>
  snapToGrid: boolean
  onToggleSnap: () => void
  onSelect: (ids: Set<string>) => void
  onToggleHidden: (id: string) => void
  onToggleLocked: (id: string) => void
  onMoveLayer: (id: string, dir: 'up' | 'down') => void
  onGroup: () => void
  onUngroup: () => void
  onAlign: (kind: AlignKind) => void
}

function elementIcon(el: WbElement) {
  switch (el.type) {
    case 'path': return Pencil
    case 'rect': return Square
    case 'ellipse': return Circle
    case 'diamond': return Diamond
    case 'arrow': return ArrowUpRight
    case 'line': return Minus
    case 'text': return Type
    case 'sticky': return StickyNote
  }
}

function elementLabel(el: WbElement, index: number): string {
  if ('text' in el && el.text?.trim()) return el.text.trim().slice(0, 22)
  const names: Record<WbElement['type'], string> = {
    path: 'Stroke',
    rect: 'Rectangle',
    ellipse: 'Ellipse',
    diamond: 'Diamond',
    arrow: 'Arrow',
    line: 'Line',
    text: 'Text',
    sticky: 'Sticky'
  }
  return `${names[el.type]} ${index + 1}`
}

export default function WbLayersPanel({
  open,
  onToggleOpen,
  elements,
  selected,
  snapToGrid,
  onToggleSnap,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onMoveLayer,
  onGroup,
  onUngroup,
  onAlign
}: WbLayersPanelProps): React.JSX.Element {
  const selectedEls = elements.filter((el) => selected.has(el.id))
  const hasGroupedSelected = selectedEls.some((el) => !!el.groupId)

  if (!open) {
    return (
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleSnap}
          title="Snap to grid (24px)"
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium shadow-sm transition-colors',
            snapToGrid ? 'border-indigo-500/60 bg-indigo-600 text-white' : 'border-border bg-surface text-muted hover:bg-elevated hover:text-text'
          )}
        >
          <Grid3x3 className="h-3.5 w-3.5" />
          <span>Snap</span>
        </button>
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-text shadow-sm hover:bg-elevated"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Layers</span>
          {elements.length > 0 && <span className="rounded bg-elevated px-1.5 py-0.2 font-mono text-[10px] text-muted">{elements.length}</span>}
        </button>
      </div>
    )
  }

  // Render top-most layer first (Photoshop convention)
  const reversed = [...elements].map((el, i) => ({ el, i })).reverse()

  return (
    <div className="absolute right-3 top-3 flex max-h-[calc(100%-1.5rem)] w-60 flex-col rounded-xl border border-border bg-surface/95 shadow-xl backdrop-blur-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
          <Layers className="h-3.5 w-3.5 text-indigo-400" />
          <span>Layers & Layout</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSnap}
            title="Snap to grid (24px)"
            className={cn(
              'flex h-6 items-center gap-1 rounded px-1.5 text-[10px] font-medium transition-colors',
              snapToGrid ? 'bg-indigo-600 text-white' : 'text-muted hover:bg-elevated hover:text-text'
            )}
          >
            <Grid3x3 className="h-3 w-3" /> Snap
          </button>
          <button type="button" onClick={onToggleOpen} className="rounded p-1 text-muted hover:bg-elevated hover:text-text" aria-label="Close layers">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Align & Group tools */}
      {selectedEls.length > 0 && (
        <div className="space-y-2 border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-1">
            {selectedEls.length >= 2 && (
              <button
                type="button"
                onClick={onGroup}
                className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-border bg-elevated/60 text-[11px] font-medium text-text hover:bg-elevated"
                title="Group (Ctrl+G)"
              >
                <Group className="h-3 w-3" /> Group
              </button>
            )}
            {hasGroupedSelected && (
              <button
                type="button"
                onClick={onUngroup}
                className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-border bg-elevated/60 text-[11px] font-medium text-text hover:bg-elevated"
                title="Ungroup (Ctrl+Shift+G)"
              >
                <Ungroup className="h-3 w-3" /> Ungroup
              </button>
            )}
          </div>

          {selectedEls.length >= 2 && (
            <div className="space-y-1">
              <div className="text-[10px] font-medium text-muted">Align & Distribute</div>
              <div className="grid grid-cols-6 gap-0.5 rounded-md border border-border bg-elevated/40 p-0.5">
                {([
                  ['left', AlignHorizontalJustifyStart, 'Align left'],
                  ['centerH', AlignHorizontalJustifyCenter, 'Align center'],
                  ['right', AlignHorizontalJustifyEnd, 'Align right'],
                  ['top', AlignVerticalJustifyStart, 'Align top'],
                  ['centerV', AlignVerticalJustifyCenter, 'Align middle'],
                  ['bottom', AlignVerticalJustifyEnd, 'Align bottom']
                ] as [AlignKind, React.ComponentType<{ className?: string }>, string][]).map(([kind, Icon, title]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => onAlign(kind)}
                    title={title}
                    className="flex h-6 items-center justify-center rounded text-muted hover:bg-surface hover:text-text"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              {selectedEls.length >= 3 && (
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => onAlign('distH')}
                    className="flex h-6 items-center justify-center gap-1 rounded border border-border bg-elevated/40 text-[10px] text-muted hover:bg-elevated hover:text-text"
                  >
                    <AlignHorizontalSpaceAround className="h-3 w-3" /> Distribute H
                  </button>
                  <button
                    type="button"
                    onClick={() => onAlign('distV')}
                    className="flex h-6 items-center justify-center gap-1 rounded border border-border bg-elevated/40 text-[10px] text-muted hover:bg-elevated hover:text-text"
                  >
                    <AlignVerticalSpaceAround className="h-3 w-3" /> Distribute V
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Layer list */}
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {reversed.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-muted">No layers yet</p>
        ) : (
          reversed.map(({ el, i }) => {
            const Icon = elementIcon(el)
            const isSel = selected.has(el.id)
            return (
              <div
                key={el.id}
                onClick={(e) => {
                  if (!e.altKey && el.groupId) {
                    const groupIds = elements.filter((x) => x.groupId === el.groupId).map((x) => x.id)
                    if (e.shiftKey) {
                      const next = new Set(selected)
                      groupIds.forEach((id) => next.add(id))
                      onSelect(next)
                    } else {
                      onSelect(new Set(groupIds))
                    }
                    return
                  }
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    const next = new Set(selected)
                    if (next.has(el.id)) next.delete(el.id)
                    else next.add(el.id)
                    onSelect(next)
                  } else {
                    onSelect(new Set([el.id]))
                  }
                }}
                className={cn(
                  'group flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors',
                  isSel ? 'bg-indigo-500/15 text-text' : 'text-muted hover:bg-elevated/70 hover:text-text',
                  el.hidden && 'opacity-50'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[11px]">{elementLabel(el, i)}</span>
                {el.groupId && <span className="rounded bg-indigo-500/20 px-1 text-[9px] text-indigo-400">G</span>}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 data-[active=true]:opacity-100" data-active={!!el.locked || !!el.hidden}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveLayer(el.id, 'up')
                    }}
                    title="Move layer up"
                    className="rounded p-0.5 hover:bg-surface"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMoveLayer(el.id, 'down')
                    }}
                    title="Move layer down"
                    className="rounded p-0.5 hover:bg-surface"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleLocked(el.id)
                    }}
                    title={el.locked ? 'Unlock' : 'Lock'}
                    className={cn('rounded p-0.5 hover:bg-surface', el.locked && 'text-amber-400')}
                  >
                    {el.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleHidden(el.id)
                    }}
                    title={el.hidden ? 'Show' : 'Hide'}
                    className="rounded p-0.5 hover:bg-surface"
                  >
                    {el.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

