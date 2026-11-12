import React from 'react'
import { CheckSquare, Link2, CalendarDays, AlignLeft } from 'lucide-react'
import type { Board, BoardCard } from '../../../../shared/board'
import { cardKey } from '../../../../shared/board'
import { localDateKey } from '../../../../shared/todos'
import { PRIORITY_META, TYPE_META, labelTone } from './boardMeta'
import { cn } from '../../lib/utils'

interface BoardCardItemProps {
  board: Board
  card: BoardCard
  done: boolean
  selected: boolean
  onOpen: (id: string) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
}

function BoardCardItem({ board, card, done, selected, onOpen, onDragStart, onDragEnd }: BoardCardItemProps): React.JSX.Element {
  const type = TYPE_META[card.type]
  const priority = PRIORITY_META[card.priority]
  const TypeIcon = type.icon
  const PriorityIcon = priority.icon
  const checked = card.checklist.filter((i) => i.done).length
  const today = localDateKey()
  const overdue = !done && !!card.dueDate && card.dueDate < today

  return (
    <article
      data-card-id={card.id}
      draggable
      tabIndex={0}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/deskup-card', card.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(card.id)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(card.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(card.id)}
      className={cn(
        'group cursor-pointer rounded-lg border bg-surface p-2.5 text-left transition-[border-color,box-shadow] hover:border-hover hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
        selected ? 'border-indigo-500/70 shadow-sm' : 'border-border',
        done && 'opacity-70'
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
        <TypeIcon className={cn('h-3.5 w-3.5', type.tone)} />
        <span className="font-mono">{cardKey(board, card)}</span>
        <span className="ml-auto" title={`${priority.label} priority`}>
          <PriorityIcon className={cn('h-3.5 w-3.5', priority.tone)} />
        </span>
      </div>

      <p className={cn('text-[13px] leading-snug text-text', done && 'line-through decoration-muted/60')}>{card.title}</p>

      {card.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {card.labels.map((l) => (
            <span key={l} className={cn('rounded px-1.5 py-px text-[10px] font-medium', labelTone(l))}>
              {l}
            </span>
          ))}
        </div>
      )}

      {(card.estimate !== undefined || card.checklist.length > 0 || card.dueDate || card.links.length > 0 || card.description) && (
        <div className="mt-2 flex items-center gap-2.5 text-[11px] text-muted">
          {card.estimate !== undefined && (
            <span className="rounded bg-elevated px-1.5 font-mono tabular-nums text-text" title="Story points">
              {card.estimate}
            </span>
          )}
          {card.checklist.length > 0 && (
            <span className={cn('flex items-center gap-0.5 tabular-nums', checked === card.checklist.length && 'text-emerald-600 dark:text-emerald-400')}>
              <CheckSquare className="h-3 w-3" />
              {checked}/{card.checklist.length}
            </span>
          )}
          {card.dueDate && (
            <span className={cn('flex items-center gap-0.5', overdue && 'text-rose-600 dark:text-rose-400')}>
              <CalendarDays className="h-3 w-3" />
              {card.dueDate === today ? 'Today' : new Date(`${card.dueDate}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}
          {card.links.length > 0 && (
            <span className="flex items-center gap-0.5">
              <Link2 className="h-3 w-3" />
              {card.links.length}
            </span>
          )}
          {card.description && <AlignLeft className="h-3 w-3" aria-label="Has description" />}
        </div>
      )}
    </article>
  )
}

export default React.memo(BoardCardItem)
