import React, { useState, useEffect } from 'react'
import {
  CheckSquare,
  Square,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  ListTodo,
  Sparkles
} from 'lucide-react'
import type { Todo } from '../../../shared/types'

type FilterMode = 'all' | 'active' | 'done'

export default function TodoList(): React.JSX.Element {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newText, setNewText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('all')

  useEffect(() => {
    async function load() {
      try {
        const list = await window.deskup.todos.list()
        setTodos(list.sort((a, b) => a.order - b.order))
      } catch (err) {
        console.error('Failed to load todos:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const saveTodos = async (updated: Todo[]) => {
    setTodos(updated)
    try {
      await window.deskup.todos.save(updated)
    } catch (err) {
      console.error('Failed to save todos:', err)
    }
  }

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim()) return

    const newTodo: Todo = {
      id: 'todo_' + Date.now() + Math.random().toString(36).substring(2, 5),
      text: newText.trim(),
      done: false,
      order: todos.length
    }

    const updated = [...todos, newTodo]
    setNewText('')
    saveTodos(updated)
  }

  const handleToggle = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    saveTodos(updated)
  }

  const handleDelete = (id: string) => {
    const updated = todos
      .filter((t) => t.id !== id)
      .map((t, idx) => ({ ...t, order: idx }))
    saveTodos(updated)
  }

  const handleClearCompleted = () => {
    const updated = todos
      .filter((t) => !t.done)
      .map((t, idx) => ({ ...t, order: idx }))
    saveTodos(updated)
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= todos.length) return

    const reordered = [...todos]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    const updated = reordered.map((t, idx) => ({ ...t, order: idx }))
    saveTodos(updated)
  }

  const completedCount = todos.filter((t) => t.done).length
  const totalCount = todos.length
  const percentDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const filteredTodos = todos.filter((t) => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  return (
    <div className="bg-surface/60 border border-border rounded-2xl p-5 shadow-lg flex flex-col h-full min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-text text-base">To-Do List</h3>
        </div>

        {totalCount > 0 && (
          <span className="text-xs font-medium text-muted bg-elevated px-2.5 py-1 rounded-full border border-border/60 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{completedCount}/{totalCount} done ({percentDone}%)</span>
          </span>
        )}
      </div>

      {/* Filter Tabs & Add Form */}
      <div className="space-y-2.5 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex bg-elevated/60 p-0.5 rounded-lg border border-border/40 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${filter === 'all'
                  ? 'bg-surface text-text shadow-sm font-semibold'
                  : 'text-muted hover:text-text'
                }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-2.5 py-1 rounded-md transition-all ${filter === 'active'
                  ? 'bg-surface text-text shadow-sm font-semibold'
                  : 'text-muted hover:text-text'
                }`}
            >
              Active ({totalCount - completedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('done')}
              className={`px-2.5 py-1 rounded-md transition-all ${filter === 'done'
                  ? 'bg-surface text-text shadow-sm font-semibold'
                  : 'text-muted hover:text-text'
                }`}
            >
              Done ({completedCount})
            </button>
          </div>

          {completedCount > 0 && (
            <button
              type="button"
              onClick={handleClearCompleted}
              className="text-[11px] text-muted hover:text-rose-500 transition-colors"
            >
              Clear done
            </button>
          )}
        </div>

        {/* Add Todo Input */}
        <form onSubmit={handleAddTodo} className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add a new task (Press Enter)..."
            className="min-w-0 flex-1 px-3.5 py-2 bg-elevated/80 border border-border/80 rounded-xl text-xs text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newText.trim()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>
      </div>

      {/* Todo Items */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[260px]">
        {isLoading ? (
          <p className="text-xs text-muted py-8 text-center">Loading tasks...</p>
        ) : filteredTodos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted text-xs py-8 space-y-1.5 border border-dashed border-border/40 rounded-xl">
            {filter === 'done' ? (
              <p>No completed tasks yet. Keep focusing!</p>
            ) : filter === 'active' ? (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <Sparkles className="w-4 h-4" />
                <span>All caught up! Zero pending tasks.</span>
              </div>
            ) : (
              <p>No tasks yet. Take a breath or add one above!</p>
            )}
          </div>
        ) : (
          filteredTodos.map((todo, index) => (
            <div
              key={todo.id}
              className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${todo.done
                  ? 'bg-surface/40 border-border/40 text-muted line-through'
                  : 'bg-elevated/50 border-border/50 text-text hover:border-border'
                }`}
            >
              <button
                type="button"
                onClick={() => handleToggle(todo.id)}
                className="flex items-center gap-2.5 flex-1 text-left min-w-0"
              >
                {todo.done ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-muted group-hover:text-indigo-400 shrink-0" />
                )}
                <span className="text-xs truncate font-medium">{todo.text}</span>
              </button>

              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-muted hover:text-text disabled:opacity-20 rounded"
                  title="Move Up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === filteredTodos.length - 1}
                  className="p-1 text-muted hover:text-text disabled:opacity-20 rounded"
                  title="Move Down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(todo.id)}
                  className="p-1 text-muted hover:text-rose-400 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
