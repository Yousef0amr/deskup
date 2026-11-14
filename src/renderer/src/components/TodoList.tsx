import React, { useState, useEffect, useRef } from 'react'
import { ListTodo, CheckCircle2 } from 'lucide-react'
import type { Todo } from '../../../shared/types'
import TodoItemRow from './TodoItemRow'
import TodoForm from './TodoForm'
import TodoFilterBar from './TodoFilterBar'
import { filterTodos, moveTodo, type TodoFilter } from '../../../shared/todos'
import { WidgetHeader } from './ui/widget-header'
import { useToast } from './ui/toast'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'
import { emitDataChanged, onTodoFilterRequest, revealSection } from '../lib/events'

type FilterMode = TodoFilter

export default function TodoList(): React.JSX.Element {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newText, setNewText] = useState('')
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>('active')
  const [newDueDate, setNewDueDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loadFailed, setLoadFailed] = useState(false)
  const toast = useToast()
  const todosRef = useRef<Todo[]>([])
  todosRef.current = todos
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const revision = useRef(0)

  useEffect(() => {
    async function load() {
      try {
        const list = await window.deskup.todos.list()
        setTodos(list.sort((a, b) => a.order - b.order))
      } catch (err) {
        console.error('Failed to load todos:', err)
        setLoadFailed(true)
        setError('Could not load tasks. Reopen the dashboard to retry.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
    return onTodoFilterRequest(setFilter)
  }, [])

  const saveTodos = async (updated: Todo[]) => {
    setTodos(updated)
    const version = ++revision.current
    setError('')
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => window.deskup.todos.save(updated))
    try {
      await saveQueue.current
      emitDataChanged('todos')
    } catch (err) {
      console.error('Failed to save todos:', err)
      if (version === revision.current) {
        setError('Changes are not saved. Retry before leaving.')
      }
    }
  }

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim() || isLoading || loadFailed) return

    const newTodo: Todo = {
      id: 'todo_' + Date.now() + Math.random().toString(36).substring(2, 5),
      text: newText.trim(),
      done: false,
      order: todos.length,
      priority: newPriority,
      dueDate: newDueDate || undefined
    }

    const updated = editingId
      ? todos.map((t) => (t.id === editingId ? { ...t, text: newTodo.text, priority: newPriority, dueDate: newTodo.dueDate } : t))
      : [...todos, newTodo]
    setNewText('')
    setNewDueDate('')
    setEditingId(null)
    void saveTodos(updated)
  }

  const handleToggle = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    void saveTodos(updated)
  }

  // Removed tasks can be restored from the toast's Undo button.
  const offerUndo = (removed: Todo[], message: string) => {
    toast(message, 'info', {
      label: 'Undo',
      onClick: () => {
        const restored = [...todosRef.current]
        for (const todo of [...removed].sort((a, b) => a.order - b.order)) {
          if (!restored.some((item) => item.id === todo.id)) {
            restored.splice(Math.min(todo.order, restored.length), 0, todo)
          }
        }
        void saveTodos(restored.map((todo, order) => ({ ...todo, order })))
      }
    })
  }

  const handleDelete = (id: string) => {
    const removed = todos.filter((t) => t.id === id)
    if (removed.length) offerUndo(removed, `Deleted “${removed[0].text}”`)
    if (editingId === id) { setEditingId(null); setNewText(''); setNewDueDate('') }
    const updated = todos.filter((t) => t.id !== id).map((t, idx) => ({ ...t, order: idx }))
    void saveTodos(updated)
  }

  const handleClearCompleted = () => {
    const removed = todos.filter((t) => t.done)
    offerUndo(removed, `Cleared ${removed.length} completed ${removed.length === 1 ? 'task' : 'tasks'}`)
    if (todos.some((t) => t.id === editingId && t.done)) { setEditingId(null); setNewText(''); setNewDueDate('') }
    const updated = todos.filter((t) => !t.done).map((t, idx) => ({ ...t, order: idx }))
    void saveTodos(updated)
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const visible = filterTodos(todos, filter)
    if (!visible[index] || !visible[targetIndex]) return
    void saveTodos(moveTodo(todos, visible[index].id, visible[targetIndex].id))
  }

  const handleFocusOnTask = (taskText: string) => {
    window.deskup.focus
      .action('start', { taskName: taskText, category: 'Deep Work' })
      .then(() => {
        toast(`Focusing on “${taskText}”`, 'info')
        revealSection('dash-focus')
      })
      .catch(() => toast('Could not start focus. Try again.', 'error'))
  }

  const completedCount = todos.filter((t) => t.done).length
  const totalCount = todos.length
  const percentDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const filteredTodos = filterTodos(todos, filter)

  return (
    <Card className="flex h-full flex-col p-4">
      <WidgetHeader
        icon={ListTodo}
        title="Tasks"
        subtitle={totalCount > 0 ? `${completedCount} of ${totalCount} done` : undefined}
        actions={totalCount > 0 && (
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-elevated" aria-label={`${percentDone}% complete`}>
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${percentDone}%` }} />
          </div>
        )}
      />

      {error && <p role="alert" className="text-xs text-rose-500 mb-2">{error} {!loadFailed && <button onClick={() => void saveTodos(todos)} className="underline cursor-pointer">Retry save</button>}</p>}
      <div className="mb-2 space-y-2">
        <TodoForm
          newText={newText}
          newPriority={newPriority}
          newDueDate={newDueDate}
          editingId={editingId}
          isLoading={isLoading}
          loadFailed={loadFailed}
          onTextChange={setNewText}
          onPriorityChange={setNewPriority}
          onDueDateChange={setNewDueDate}
          onSubmit={handleAddTodo}
          onCancelEdit={() => { setEditingId(null); setNewText(''); setNewDueDate('') }}
        />

        <TodoFilterBar
          filter={filter}
          todos={todos}
          completedCount={completedCount}
          totalCount={totalCount}
          onFilterChange={setFilter}
          onClearCompleted={handleClearCompleted}
        />
      </div>

      {/* Todo Items */}
      <div className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
        {isLoading ? (
          <div className="space-y-1.5 py-1" role="status" aria-label="Loading tasks">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-elevated/30 px-3 py-2">
                <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-4 w-12 rounded-md" />
              </div>
            ))}
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-center text-xs text-muted">
            {filter === 'active' && totalCount > 0 ? (
              <>
                <CheckCircle2 className="mb-1 h-5 w-5 text-emerald-500" />
                <p className="font-medium text-text">All caught up</p>
                <p>Every task is done. Add the next one above.</p>
              </>
            ) : filter === 'today' ? (
              <p>Nothing due today or overdue.</p>
            ) : filter === 'upcoming' ? (
              <p>No upcoming tasks with a due date.</p>
            ) : filter === 'high' ? (
              <p>No open high-priority tasks.</p>
            ) : filter === 'done' ? (
              <p>Completed tasks will show up here.</p>
            ) : (
              <>
                <p className="font-medium text-text">No tasks yet</p>
                <p>Type above and press Enter to add your first task.</p>
              </>
            )}
          </div>
        ) : (
          filteredTodos.map((todo, index) => (
            <TodoItemRow
              key={todo.id}
              todo={todo}
              index={index}
              totalCount={filteredTodos.length}
              onToggle={handleToggle}
              onMove={handleMove}
              onDelete={handleDelete}
              onFocusTask={handleFocusOnTask}
              onEdit={(item) => {
                setEditingId(item.id)
                setNewText(item.text)
                setNewPriority(item.priority ?? 'medium')
                setNewDueDate(item.dueDate ?? '')
                document.getElementById('task-name')?.focus()
              }}
            />
          ))
        )}
      </div>
    </Card>
  )
}
