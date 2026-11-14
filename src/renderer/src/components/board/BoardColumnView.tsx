import React, { useMemo, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Board, BoardCard, BoardColumn } from '../../../../shared/board'
import { parseQuickAdd } from '../../../../shared/board'
import BoardCardItem from './BoardCardItem'
import { PRIORITY_META, QUICK_ADD_TOKENS, TYPE_META, columnAccent, labelTone } from './boardMeta'
import { cn } from '../../lib/utils'

interface BoardColumnViewProps {
  board: Board
  column: BoardColumn
  columnIndex: number
  nextColumnName: string | null
  cards: BoardCard[]
  /** Total cards in the column before filters (WIP limits count everything). */
  totalCount: number
  points: number
  selectedId: string | null
  draggingId: string | null
  quickAddOpen: boolean
  onQuickAddOpenChange: (open: boolean) => void
  onQuickAdd: (columnId: string, text: string) => void
  onClearDone?: (columnId: string) => void
  onOpenCard: (id: string) => void
  onCopyKey: (key: string) => void
  onCopyBranch: (card: BoardCard) => void
  onAdvance: (card: BoardCard) => void
  onFocus: (card: BoardCard) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDrop: (cardId: string, columnId: string, index: number) => void
}

export default function BoardColumnView({
  board,
  column,
  columnIndex,
  nextColumnName,
  cards,
  totalCount,
  points,
  selectedId,
  draggingId,
  quickAddOpen,
  onQuickAddOpenChange,
  onQuickAdd,
  onClearDone,
  onOpenCard,
  onCopyKey,
  onCopyBranch,
  onAdvance,
  onFocus,
  onDragStart,
  onDragEnd,
  onDrop
}: BoardColumnViewProps): React.JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const overLimit = !!column.wipLimit && totalCount > column.wipLimit
  const atLimit = !!column.wipLimit && totalCount === column.wipLimit

  const parsed = useMemo(() => (draft.trim() ? parseQuickAdd(draft) : null), [draft])
  const hasParsedTokens =
    !!parsed && (!!parsed.type || !!parsed.priority || parsed.labels.length > 0 || parsed.estimate !== undefined)

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
    if (!draft.trim()) return
    onQuickAdd(column.id, draft)
    setDraft('')
  }

  const insertToken = (token: string) => {
    const isPrefix = token.endsWith(':')
    setDraft((prev) => {
      if (isPrefix) {
        const stripped = prev.replace(/^[a-z]+(\([^)]*\))?:\s*/i, '')
        return `${token} ${stripped}`.trimStart()
      }
      const sep = prev && !prev.endsWith(' ') ? ' ' : ''
      return `${prev}${sep}${token} `
    })
    inputRef.current?.focus()
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
        'flex max-h-full min-w-[248px] flex-1 max-w-[340px] flex-col rounded-xl border bg-elevated/40 transition-colors',
        dropIndex !== null ? 'border-indigo-500/50 bg-indigo-500/[0.04]' : 'border-border'
      )}
    >
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', columnAccent(column, columnIndex))} aria-hidden />
        <h3 className="truncate text-[13px] font-semibold text-text">{column.name}</h3>
        <span
          className={cn(
            'rounded-full px-1.5 text-[11px] font-medium tabular-nums',
            overLimit
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              : atLimit
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'text-muted'
          )}
          title={column.wipLimit ? `WIP limit ${column.wipLimit}${overLimit ? ' — over limit' : ''}` : undefined}
        >
          {totalCount}
          {column.wipLimit ? `/${column.wipLimit}` : ''}
        </span>
        {points > 0 && (
          <span className="rounded bg-surface/80 px-1.5 py-px font-mono text-[10px] text-muted tabular-nums" title="Story points">
            {points} pts
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          {column.done && totalCount > 0 && onClearDone && (
            <button
              type="button"
              onClick={() => onClearDone(column.id)}
              className="rounded-md p-1 text-muted transition-colors hover:bg-hover hover:text-text"
              aria-label={`Clear completed cards in ${column.name}`}
              title="Clear done cards (Undo available)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onQuickAddOpenChange(true)}
            className="rounded-md p-1 text-muted transition-colors hover:bg-hover hover:text-text"
            aria-label={`Add card to ${column.name}`}
            title="Add card"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {column.wipLimit && (
        <div className="mx-3 mb-2 h-0.5 overflow-hidden rounded-full bg-border/80" aria-hidden>
          <div
            className={cn(
              'h-full rounded-full transition-[width]',
              overLimit ? 'bg-rose-500' : atLimit ? 'bg-amber-500' : 'bg-indigo-500/70'
            )}
            style={{ width: `${Math.min(100, (totalCount / column.wipLimit) * 100)}%` }}
          />
        </div>
      )}

      <div ref={listRef} className="flex min-h-[48px] flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2">
        {cards.map((card) => (
          <div key={card.id} className={cn(card.id === draggingId && 'opacity-40')}>
            {indicatorBefore.get(card.id) && <div className="mb-1.5 h-0.5 rounded-full bg-indigo-500" aria-hidden />}
            <BoardCardItem
              board={board}
              card={card}
              done={!!column.done}
              selected={selectedId === card.id}
              nextColumnName={nextColumnName}
              onOpen={onOpenCard}
              onCopyKey={onCopyKey}
              onCopyBranch={onCopyBranch}
              onAdvance={onAdvance}
              onFocus={onFocus}
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
          <div className="rounded-lg border border-indigo-500/60 bg-surface p-2 shadow-sm">
            <textarea
              ref={inputRef}
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
                if (!draft.trim()) onQuickAddOpenChange(false)
              }}
              placeholder="bug: login fails #auth !high ~3"
              className="w-full resize-none bg-transparent px-0.5 text-[13px] text-text placeholder:text-muted focus:outline-none"
            />
            {hasParsedTokens && parsed && (
              <div className="mt-1 flex flex-wrap items-center gap-1 border-t border-border/60 pt-1.5">
                {parsed.type && (
                  <span className="flex items-center gap-1 rounded bg-elevated px-1.5 py-px text-[10px] font-medium text-text">
                    {React.createElement(TYPE_META[parsed.type].icon, { className: cn('h-2.5 w-2.5', TYPE_META[parsed.type].tone) })}
                    {TYPE_META[parsed.type].label}
                  </span>
                )}
                {parsed.priority && (
                  <span className="flex items-center gap-1 rounded bg-elevated px-1.5 py-px text-[10px] font-medium text-text">
                    {React.createElement(PRIORITY_META[parsed.priority].icon, { className: cn('h-2.5 w-2.5', PRIORITY_META[parsed.priority].tone) })}
                    {PRIORITY_META[parsed.priority].label}
                  </span>
                )}
                {parsed.labels.map((l) => (
                  <span key={l} className={cn('rounded px-1.5 py-px text-[10px] font-medium', labelTone(l))}>
                    #{l}
                  </span>
                ))}
                {parsed.estimate !== undefined && (
                  <span className="rounded bg-elevated px-1.5 py-px font-mono text-[10px] text-text">{parsed.estimate} pts</span>
                )}
              </div>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {QUICK_ADD_TOKENS.map((token) => (
                <button
                  key={token}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(token)}
                  className="rounded border border-border bg-elevated/60 px-1.5 py-px font-mono text-[10px] text-muted transition-colors hover:border-hover hover:text-text"
                >
                  {token}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted">Enter to add · Esc to close</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setDraft('')
                    onQuickAddOpenChange(false)
                  }}
                  className="rounded px-2 py-1 text-[11px] text-muted hover:bg-elevated hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!parsed?.title}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={submit}
                  className="rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ) : (
          cards.length === 0 &&
          dropIndex === null && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 px-3 py-8 text-center">
              <p className="text-xs text-muted">
                {column.done ? 'Completed cards land here' : 'Drop cards here or add one'}
              </p>
              <button
                type="button"
                onClick={() => onQuickAddOpenChange(true)}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-hover hover:bg-elevated"
              >
                <Plus className="h-3 w-3 text-muted" />
                Add card
              </button>
            </div>
          )
        )}
      </div>
    </section>
  )
}
