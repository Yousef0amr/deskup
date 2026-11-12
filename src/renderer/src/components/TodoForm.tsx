import React from 'react'
import { Plus, CalendarDays, X } from 'lucide-react'
import { localDateKey } from '../../../shared/todos'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

type Priority = 'high' | 'medium' | 'low'

interface TodoFormProps {
  newText: string
  newPriority: Priority
  newDueDate: string
  editingId: string | null
  isLoading: boolean
  loadFailed: boolean
  onTextChange: (text: string) => void
  onPriorityChange: (priority: Priority) => void
  onDueDateChange: (date: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancelEdit: () => void
}

const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: 'high', label: 'High', dot: 'bg-rose-500' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-500' },
  { value: 'low', label: 'Low', dot: 'bg-emerald-500' }
]

function tomorrowKey(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return localDateKey(d)
}

export default function TodoForm({
  newText,
  newPriority,
  newDueDate,
  editingId,
  isLoading,
  loadFailed,
  onTextChange,
  onPriorityChange,
  onDueDateChange,
  onSubmit,
  onCancelEdit
}: TodoFormProps): React.JSX.Element {
  const disabled = isLoading || loadFailed
  // Options appear once there's something to add, keeping the idle card calm.
  const expanded = newText.trim().length > 0 || !!editingId
  const today = localDateKey()
  const tomorrow = tomorrowKey()

  const quickDate = (label: string, value: string) => (
    <button
      type="button"
      onClick={() => onDueDateChange(newDueDate === value ? '' : value)}
      aria-pressed={newDueDate === value}
      className={cn(
        'h-6 rounded-md px-2 text-[11px] font-medium transition-colors',
        newDueDate === value ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-muted hover:bg-elevated hover:text-text'
      )}
    >
      {label}
    </button>
  )

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(e) => e.key === 'Escape' && editingId && onCancelEdit()}
      className={cn(
        'rounded-lg border bg-surface transition-colors',
        editingId ? 'border-indigo-500/60' : 'border-border focus-within:border-indigo-500/60'
      )}
    >
      <div className="flex items-center gap-2 pl-3 pr-1.5">
        <Plus className="h-3.5 w-3.5 shrink-0 text-muted" />
        <input
          type="text"
          aria-label="Task name"
          id="task-name"
          disabled={disabled}
          value={newText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={editingId ? 'Edit task…' : 'Add a task and press Enter'}
          className="h-9 min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-muted focus:outline-none disabled:opacity-50"
        />
        {editingId && (
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCancelEdit} aria-label="Cancel editing" title="Cancel (Esc)">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border px-2 py-1.5 animate-fade-in">
          <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={newPriority === p.value}
                onClick={() => onPriorityChange(p.value)}
                className={cn(
                  'flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors',
                  newPriority === p.value ? 'bg-elevated text-text' : 'text-muted hover:text-text'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', p.dot)} />
                {p.label}
              </button>
            ))}
          </div>

          <span className="mx-1 h-4 w-px bg-border" aria-hidden />

          {quickDate('Today', today)}
          {quickDate('Tomorrow', tomorrow)}
          <label
            className={cn(
              'relative flex h-6 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors',
              newDueDate && newDueDate !== today && newDueDate !== tomorrow
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                : 'text-muted hover:bg-elevated hover:text-text'
            )}
            title="Pick a due date"
          >
            <CalendarDays className="h-3 w-3" />
            {newDueDate && newDueDate !== today && newDueDate !== tomorrow
              ? new Date(`${newDueDate}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })
              : 'Date'}
            <input
              type="date"
              aria-label="Task due date"
              value={newDueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>

          <Button type="submit" size="sm" disabled={!newText.trim() || disabled} className="ml-auto h-6 px-2.5 text-[11px]">
            {editingId ? 'Save' : 'Add task'}
          </Button>
        </div>
      )}
    </form>
  )
}
