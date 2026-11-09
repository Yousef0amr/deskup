import React from 'react'
import { CheckSquare, Square, Trash2, ChevronUp, ChevronDown, Play } from 'lucide-react'
import type { Todo } from '../../../shared/types'

interface TodoItemRowProps {
  todo: Todo
  index: number
  totalCount: number
  onToggle: (id: string) => void
  onMove: (index: number, direction: 'up' | 'down') => void
  onDelete: (id: string) => void
  onFocusTask?: (taskText: string) => void
}

export default function TodoItemRow({
  todo,
  index,
  totalCount,
  onToggle,
  onMove,
  onDelete,
  onFocusTask
}: TodoItemRowProps): React.JSX.Element {
  const getPriorityBadge = () => {
    switch (todo.priority) {
      case 'high':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
            HIGH
          </span>
        )
      case 'medium':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            MED
          </span>
        )
      case 'low':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            LOW
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
        todo.done
          ? 'bg-surface/40 border-border/40 text-muted line-through'
          : 'bg-elevated/50 border-border/50 text-text hover:border-border'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(todo.id)}
        className="flex items-center gap-2 flex-1 text-left min-w-0 pr-2"
      >
        {todo.done ? (
          <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <Square className="w-4 h-4 text-muted group-hover:text-indigo-400 shrink-0" />
        )}
        <span className="text-xs truncate font-medium flex-1">{todo.text}</span>
        {getPriorityBadge()}
      </button>

      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
        {!todo.done && onFocusTask && (
          <button
            type="button"
            onClick={() => onFocusTask(todo.text)}
            className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors flex items-center gap-0.5 text-[10px] font-bold"
            title="Start Focus Timer on this task"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">Focus</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onMove(index, 'up')}
          disabled={index === 0}
          className="p-1 text-muted hover:text-text disabled:opacity-20 rounded"
          title="Move Up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onMove(index, 'down')}
          disabled={index === totalCount - 1}
          className="p-1 text-muted hover:text-text disabled:opacity-20 rounded"
          title="Move Down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(todo.id)}
          className="p-1 text-muted hover:text-rose-400 rounded"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

