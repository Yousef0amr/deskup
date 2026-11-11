import React from 'react'
import { Check, Trash2, ChevronUp, ChevronDown, Play, Pencil } from 'lucide-react'
import { localDateKey } from '../../../shared/todos'
import type { Todo } from '../../../shared/types'
import { cn } from '../lib/utils'

interface TodoItemRowProps {
  todo: Todo
  index: number
  totalCount: number
  onToggle: (id: string) => void
  onMove: (index: number, direction: 'up' | 'down') => void
  onDelete: (id: string) => void
  onFocusTask?: (taskText: string) => void
  onEdit?: (todo: Todo) => void
}

const PRIORITY_DOT: Record<NonNullable<Todo['priority']>, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500'
}

function dueLabel(dueDate: string, done: boolean): { text: string; tone: string } {
  const today = localDateKey()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const pretty = new Date(`${dueDate}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })
  if (done) return { text: pretty, tone: 'text-muted' }
  if (dueDate < today) return { text: `Overdue · ${pretty}`, tone: 'text-rose-600 dark:text-rose-400' }
  if (dueDate === today) return { text: 'Today', tone: 'text-indigo-600 dark:text-indigo-400' }
  if (dueDate === localDateKey(tomorrow)) return { text: 'Tomorrow', tone: 'text-muted' }
  return { text: pretty, tone: 'text-muted' }
}

function IconAction({ label, onClick, disabled, className, children }: {
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn('flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-text disabled:pointer-events-none disabled:opacity-30', className)}
    >
      {children}
    </button>
  )
}

export default function TodoItemRow({
  todo,
  index,
  totalCount,
  onToggle,
  onMove,
  onDelete,
  onFocusTask,
  onEdit
}: TodoItemRowProps): React.JSX.Element {
  const due = todo.dueDate ? dueLabel(todo.dueDate, todo.done) : null

  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-elevated/60">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={`${todo.done ? 'Reopen' : 'Complete'} ${todo.text}`}
        onClick={() => onToggle(todo.id)}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90',
          todo.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted/50 hover:border-indigo-500'
        )}
      >
        {todo.done && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
      </button>

      <div
        className="min-w-0 flex-1"
        onDoubleClick={() => onEdit?.(todo)}
        title={onEdit ? 'Double-click to edit' : undefined}
      >
        <span className={cn('block truncate text-[13px]', todo.done ? 'text-muted line-through' : 'text-text')}>
          {todo.text}
        </span>
        {due && <span className={cn('block text-[11px] leading-tight', due.tone)}>{due.text}</span>}
      </div>

      {todo.priority && !todo.done && (
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full group-hover:hidden', PRIORITY_DOT[todo.priority])}
          title={`${todo.priority} priority`}
        />
      )}

      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex group-focus-within:flex">
        {!todo.done && onFocusTask && (
          <button
            type="button"
            onClick={() => onFocusTask(todo.text)}
            title="Start a focus session on this task"
            className="flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-indigo-600 transition-colors hover:bg-indigo-500/10 dark:text-indigo-400"
          >
            <Play className="h-3 w-3 fill-current" /> Focus
          </button>
        )}
        {onEdit && (
          <IconAction label="Edit task" onClick={() => onEdit(todo)}>
            <Pencil className="h-3 w-3" />
          </IconAction>
        )}
        <IconAction label="Move up" onClick={() => onMove(index, 'up')} disabled={index === 0}>
          <ChevronUp className="h-3.5 w-3.5" />
        </IconAction>
        <IconAction label="Move down" onClick={() => onMove(index, 'down')} disabled={index === totalCount - 1}>
          <ChevronDown className="h-3.5 w-3.5" />
        </IconAction>
        <IconAction label="Delete task" onClick={() => onDelete(todo.id)} className="hover:bg-rose-500/10 hover:text-rose-500">
          <Trash2 className="h-3 w-3" />
        </IconAction>
      </div>
    </div>
  )
}
