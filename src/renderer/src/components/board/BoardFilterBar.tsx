import React from 'react'
import { Filter, X, ArrowUpDown, AlertCircle } from 'lucide-react'
import type { CardPriority, CardSort, CardType } from '../../../../shared/board'
import { CARD_PRIORITIES, CARD_TYPES } from '../../../../shared/board'
import { PRIORITY_META, TYPE_META, labelTone } from './boardMeta'
import { cn } from '../../lib/utils'

interface BoardFilterBarProps {
  types: CardType[]
  priorities: CardPriority[]
  label: string
  allLabels: string[]
  overdueOnly: boolean
  overdueCount: number
  sort: CardSort
  filtersActive: boolean
  onToggleType: (t: CardType) => void
  onTogglePriority: (p: CardPriority) => void
  onToggleLabel: (l: string) => void
  onToggleOverdue: () => void
  onSortChange: (sort: CardSort) => void
  onClearAll: () => void
}

const SORT_LABELS: { value: CardSort; label: string }[] = [
  { value: 'manual', label: 'Manual order' },
  { value: 'priority', label: 'Priority' },
  { value: 'due', label: 'Due date' },
  { value: 'newest', label: 'Newest' }
]

export default function BoardFilterBar({
  types,
  priorities,
  label,
  allLabels,
  overdueOnly,
  overdueCount,
  sort,
  filtersActive,
  onToggleType,
  onTogglePriority,
  onToggleLabel,
  onToggleOverdue,
  onSortChange,
  onClearAll
}: BoardFilterBarProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      <Filter className="mr-1 h-3.5 w-3.5 text-muted" aria-hidden />
      {CARD_TYPES.map((t) => {
        const meta = TYPE_META[t]
        const on = types.includes(t)
        return (
          <button
            key={t}
            type="button"
            onClick={() => onToggleType(t)}
            aria-pressed={on}
            className={cn(
              'flex h-6 items-center gap-1 rounded-md border px-2 transition-colors',
              on ? 'border-border bg-surface font-medium text-text shadow-2xs' : 'border-transparent text-muted hover:bg-elevated/60 hover:text-text'
            )}
          >
            <meta.icon className={cn('h-3 w-3', meta.tone)} />
            {meta.label}
          </button>
        )
      })}
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      {CARD_PRIORITIES.map((p) => {
        const meta = PRIORITY_META[p]
        const on = priorities.includes(p)
        return (
          <button
            key={p}
            type="button"
            onClick={() => onTogglePriority(p)}
            aria-pressed={on}
            className={cn(
              'flex h-6 items-center gap-1 rounded-md border px-2 transition-colors',
              on ? 'border-border bg-surface font-medium text-text shadow-2xs' : 'border-transparent text-muted hover:bg-elevated/60 hover:text-text'
            )}
          >
            <meta.icon className={cn('h-3 w-3', meta.tone)} />
            {meta.label}
          </button>
        )
      })}

      {(overdueCount > 0 || overdueOnly) && (
        <>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={onToggleOverdue}
            aria-pressed={overdueOnly}
            className={cn(
              'flex h-6 items-center gap-1 rounded-md border px-2 transition-colors',
              overdueOnly
                ? 'border-rose-500/40 bg-rose-500/10 font-medium text-rose-600 dark:text-rose-400'
                : 'border-transparent text-rose-600/80 hover:bg-rose-500/10 dark:text-rose-400/80'
            )}
          >
            <AlertCircle className="h-3 w-3" />
            Overdue
            <span className="tabular-nums opacity-80">{overdueCount}</span>
          </button>
        </>
      )}

      {allLabels.length > 0 && (
        <>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          {allLabels.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onToggleLabel(l)}
              aria-pressed={label === l}
              className={cn(
                'h-6 rounded-md px-2 font-medium transition-opacity',
                labelTone(l),
                label && label !== l ? 'opacity-40' : 'opacity-100',
                label === l && 'ring-1 ring-inset ring-current/30'
              )}
            >
              {l}
            </button>
          ))}
        </>
      )}

      {filtersActive && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-1 flex h-6 items-center gap-1 rounded-md px-2 text-muted hover:bg-elevated hover:text-text"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}

      <div className="ml-auto flex items-center gap-3">
        <label className="flex items-center gap-1 text-[11px] text-muted">
          <ArrowUpDown className="h-3 w-3" aria-hidden />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as CardSort)}
            aria-label="Sort cards"
            className="h-6 cursor-pointer rounded-md border border-transparent bg-transparent px-1 text-[11px] text-muted hover:border-border hover:bg-surface hover:text-text focus:outline-none"
          >
            {SORT_LABELS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <span className="hidden text-[11px] text-muted xl:inline">
          <kbd className="font-mono">N</kbd> new card · <kbd className="font-mono">/</kbd> search · drag to move
        </span>
      </div>
    </div>
  )
}
