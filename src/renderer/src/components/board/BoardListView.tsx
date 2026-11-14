import React from 'react'
import { Plus, GitBranch, Play, CalendarDays, CheckSquare } from 'lucide-react'
import type { Board, BoardCard, CardSort } from '../../../../shared/board'
import { branchName, cardKey, columnCards, sortCards } from '../../../../shared/board'
import { localDateKey } from '../../../../shared/todos'
import { PRIORITY_META, TYPE_META, columnAccent, labelTone } from './boardMeta'
import { cn } from '../../lib/utils'

interface BoardListViewProps {
  board: Board
  cards: BoardCard[]
  sort: CardSort
  selectedId: string | null
  onOpenCard: (id: string) => void
  onMoveColumn: (cardId: string, columnId: string) => void
  onCopyKey: (key: string) => void
  onCopyBranch: (card: BoardCard) => void
  onFocus: (card: BoardCard) => void
  onQuickAddColumn: (columnId: string) => void
}

export default function BoardListView({
  board,
  cards,
  sort,
  selectedId,
  onOpenCard,
  onMoveColumn,
  onCopyKey,
  onCopyBranch,
  onFocus,
  onQuickAddColumn
}: BoardListViewProps): React.JSX.Element {
  const today = localDateKey()

  return (
    <div className="flex-1 space-y-3 overflow-y-auto pr-1 pb-2">
      {board.columns.map((column, idx) => {
        const raw = columnCards(cards, column.id)
        const list = sort === 'manual' ? raw : sortCards(raw, sort)
        const points = list.reduce((s, c) => s + (c.estimate ?? 0), 0)

        return (
          <section key={column.id} className="rounded-xl border border-border bg-surface">
            <header className="flex items-center gap-2 border-b border-border/70 bg-elevated/40 px-3.5 py-2">
              <span className={cn('h-2 w-2 rounded-full', columnAccent(column, idx))} aria-hidden />
              <h3 className="text-xs font-semibold text-text">{column.name}</h3>
              <span className="text-[11px] tabular-nums text-muted">{list.length}</span>
              {points > 0 && <span className="font-mono text-[10px] tabular-nums text-muted">· {points} pts</span>}
              <button
                type="button"
                onClick={() => onQuickAddColumn(column.id)}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-muted transition-colors hover:bg-hover hover:text-text"
              >
                <Plus className="h-3 w-3" /> Add card
              </button>
            </header>

            {list.length === 0 ? (
              <p className="px-3.5 py-3 text-xs text-muted">No matching cards in {column.name}.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {list.map((card) => {
                  const type = TYPE_META[card.type]
                  const priority = PRIORITY_META[card.priority]
                  const key = cardKey(board, card)
                  const checked = card.checklist.filter((i) => i.done).length
                  const overdue = !column.done && !!card.dueDate && card.dueDate < today

                  return (
                    <li
                      key={card.id}
                      onClick={() => onOpenCard(card.id)}
                      className={cn(
                        'group flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-xs transition-colors hover:bg-elevated/50',
                        selectedId === card.id && 'bg-indigo-500/[0.06]'
                      )}
                    >
                      <type.icon className={cn('h-3.5 w-3.5 shrink-0', type.tone)} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCopyKey(key)
                        }}
                        title={`Copy ${key}`}
                        className="w-14 shrink-0 text-left font-mono text-[11px] text-muted hover:text-text"
                      >
                        {key}
                      </button>
                      <span className={cn('min-w-0 flex-1 truncate font-medium text-text', column.done && 'font-normal text-muted line-through')}>
                        {card.title}
                      </span>

                      <div className="hidden items-center gap-1 sm:flex">
                        {card.labels.slice(0, 3).map((l) => (
                          <span key={l} className={cn('rounded px-1.5 py-px text-[10px] font-medium', labelTone(l))}>
                            {l}
                          </span>
                        ))}
                      </div>

                      {card.checklist.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] tabular-nums text-muted">
                          <CheckSquare className="h-3 w-3" />
                          {checked}/{card.checklist.length}
                        </span>
                      )}

                      {card.dueDate && (
                        <span className={cn('flex items-center gap-0.5 text-[11px]', overdue ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-muted')}>
                          <CalendarDays className="h-3 w-3" />
                          {card.dueDate === today ? 'Today' : card.dueDate}
                        </span>
                      )}

                      {card.estimate !== undefined && (
                        <span className="w-6 rounded bg-elevated py-px text-center font-mono text-[10px] tabular-nums text-text">
                          {card.estimate}
                        </span>
                      )}

                      <span title={`${priority.label} priority`}>
                        <priority.icon className={cn('h-3.5 w-3.5', priority.tone)} />
                      </span>

                      <select
                        value={card.columnId}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onMoveColumn(card.id, e.target.value)}
                        aria-label={`Column for ${key}`}
                        className="h-6 rounded border border-border bg-background px-1.5 text-[11px] text-text focus:outline-none"
                      >
                        {board.columns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCopyBranch(card)
                          }}
                          title={`Copy branch: ${branchName(board, card)}`}
                          aria-label={`Copy branch for ${key}`}
                          className="rounded p-1 text-muted hover:bg-elevated hover:text-text"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onFocus(card)
                          }}
                          title="Start focus session"
                          aria-label={`Start focus for ${key}`}
                          className="rounded p-1 text-muted hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
