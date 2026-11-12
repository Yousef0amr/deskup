import React from 'react'
import type { Todo } from '../../../shared/types'
import { filterTodos, type TodoFilter } from '../../../shared/todos'
import { cn } from '../lib/utils'

interface TodoFilterBarProps {
  filter: TodoFilter
  todos: Todo[]
  completedCount: number
  totalCount: number
  onFilterChange: (mode: TodoFilter) => void
  onClearCompleted: () => void
}

const FILTERS: { mode: TodoFilter; label: string }[] = [
  { mode: 'active', label: 'Open' },
  { mode: 'today', label: 'Today' },
  { mode: 'upcoming', label: 'Upcoming' },
  { mode: 'high', label: 'High' },
  { mode: 'done', label: 'Done' },
  { mode: 'all', label: 'All' }
]

export default function TodoFilterBar({
  filter,
  todos,
  completedCount,
  onFilterChange,
  onClearCompleted
}: TodoFilterBarProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap gap-0.5" role="tablist" aria-label="Task filter">
        {FILTERS.map(({ mode, label }) => {
          const count = filterTodos(todos, mode).length
          const active = filter === mode
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilterChange(mode)}
              className={cn(
                'flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors',
                active ? 'bg-elevated text-text' : 'text-muted hover:text-text'
              )}
            >
              {label}
              {count > 0 && (
                <span
                  className={cn(
                    'tabular-nums',
                    mode === 'today' && !active ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {completedCount > 0 && filter === 'done' && (
        <button
          type="button"
          onClick={onClearCompleted}
          className="h-6 rounded-md px-2 text-[11px] font-medium text-muted transition-colors hover:text-rose-500"
        >
          Clear done
        </button>
      )}
    </div>
  )
}
