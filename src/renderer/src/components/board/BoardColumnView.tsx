import React, { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Board, BoardCard, BoardColumn } from '../../../../shared/board'
import BoardCardItem from './BoardCardItem'
import { cn } from '../../lib/utils'

interface BoardColumnViewProps {
  board: Board
  column: BoardColumn
  cards: BoardCard[]
  /** Total cards in the column before filters (WIP limits count everything). */
  totalCount: number
  points: number
  selectedId: string | null
  draggingId: string | null
  quickAddOpen: boolean
  onQuickAddOpenChange: (open: boolean) => void
  onQuickAdd: (columnId: string, text: string) => void
  onOpenCard: (id: string) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDrop: (cardId: string, columnId: string, index: number) => void
}

export default function BoardColumnView({
  board,
  column,
  cards,
  totalCount,
  points,
  selectedId,
  draggingId,
  quickAddOpen,
  onQuickAddOpenChange,
  onQuickAdd,
  onOpenCard,
  onDragStart,
  onDragEnd,
  onDrop
}: BoardColumnViewProps): React.JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const overLimit = !!column.wipLimit && totalCount > column.wipLimit

  // Insert position = number of cards whose vertical midpoint is above the pointer.
  const indexFromPointer = (clientY: number): number => {
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-card-id]') ?? [])].filter(
      (el) => el.dataset.cardId !== draggingId
    )
    return items.filter((el) => {
      const rect = el.getBoundingClientRect()
      return rect.top + rect.height / 2 < clientY
    }).length
  }

  const submit = () => {
    if (draft.trim()) onQuickAdd(column.id, draft)
    setDraft('')
  }

  // The dragged card stays mounted (removing it would cancel the native drag); it is only
  // dimmed, and the drop indicator is positioned among the *other* cards.
  let slot = 0
  const indicatorBefore = new Map<string, boolean>()
  for (const card of cards) {
    if (card.id === draggingId) continue
    indicatorBefore.set(card.id, dropIndex === slot)
    slot++
  }
  const indicatorAtEnd = dropIndex !== null && dropIndex >= slot

  return (
    <section
      aria-label={column.name}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('text/deskup-card')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDropIndex(indexFromPointer(e.clientY))
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropIndex(null)
      }}
      onDrop={(e) => {
        e.preventDefault()
        const id = e.dataTransfer.getData('text/deskup-card')
        const index = indexFromPointer(e.clientY)
        setDropIndex(null)
        if (id) onDrop(id, column.id, index)
      }}
      className={cn(
        'flex max-h-full w-[272px] shrink-0 flex-col rounded-xl border bg-elevated/40 transition-colors',
        dropIndex !== null ? 'border-indigo-500/50 bg-indigo-500/[0.04]' : 'border-border'
      )}
    >
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <h3 className="truncate text-[13px] font-semibold text-text">{column.name}</h3>
        <span
          className={cn('rounded-full px-1.5 text-[11px] font-medium tabular-nums', overLimit ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'text-muted')}
          title={column.wipLimit ? `WIP limit ${column.wipLimit}${overLimit ? ' — over limit' : ''}` : undefined}
        >
          {totalCount}
          {column.wipLimit ? `/${column.wipLimit}` : ''}
        </span>
        {points > 0 && <span className="text-[11px] text-muted tabular-nums" title="Story points">{points} pts</span>}
        <button
          type="button"
          onClick={() => onQuickAddOpenChange(true)}
          className="ml-auto rounded-md p-1 text-muted transition-colors hover:bg-hover hover:text-text"
          aria-label={`Add card to ${column.name}`}
          title="Add card"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </header>

      <div ref={listRef} className="flex min-h-[48px] flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2">
        {cards.map((card) => (
          <div key={card.id} className={cn(card.id === draggingId && 'opacity-40')}>
            {indicatorBefore.get(card.id) && <div className="mb-1.5 h-0.5 rounded-full bg-indigo-500" aria-hidden />}
            <BoardCardItem
              board={board}
              card={card}
              done={!!column.done}
              selected={selectedId === card.id}
              onOpen={onOpenCard}
              onDragStart={onDragStart}
              onDragEnd={() => {
                setDropIndex(null)
                onDragEnd()
              }}
            />
          </div>
        ))}
        {indicatorAtEnd && <div className="h-0.5 rounded-full bg-indigo-500" aria-hidden />}

        {quickAddOpen ? (
          <div className="rounded-lg border border-indigo-500/60 bg-surface p-1.5">
            <textarea
              autoFocus
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                } else if (e.key === 'Escape') {
                  setDraft('')
                  onQuickAddOpenChange(false)
                }
              }}
              onBlur={() => {
                submit()
                onQuickAddOpenChange(false)
              }}
              placeholder="bug: login fails #auth !high ~3"
              className="w-full resize-none bg-transparent px-1 text-[13px] text-text placeholder:text-muted focus:outline-none"
            />
            <p className="px-1 text-[10px] leading-snug text-muted">
              Enter to add · <code>feat:</code> <code>fix:</code> type · <code>#label</code> · <code>!high</code> · <code>~3</code> points
            </p>
          </div>
        ) : (
          cards.length === 0 && dropIndex === null && (
            <button
              type="button"
              onClick={() => onQuickAddOpenChange(true)}
              className="rounded-lg border border-dashed border-border py-3 text-xs text-muted transition-colors hover:border-hover hover:text-text"
            >
              Add a card
            </button>
          )
        )}
      </div>
    </section>
  )
}
