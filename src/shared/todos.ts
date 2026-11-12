import type { Todo } from './types'

export type TodoFilter = 'all' | 'active' | 'today' | 'upcoming' | 'high' | 'done'

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00`)
  return !Number.isNaN(parsed.getTime()) && localDateKey(parsed) === value
}

export function validateTodos(value: unknown): Todo[] {
  if (!Array.isArray(value)) throw new Error('Tasks must be a list')
  const ids = new Set<string>()
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid task')
    if (typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error('Missing or duplicate task ID')
    ids.add(item.id)
    if (typeof item.text !== 'string' || !item.text.trim()) throw new Error('Task text is required')
    if (typeof item.done !== 'boolean') throw new Error('Invalid task done status')
    if (typeof item.order !== 'number' || !Number.isFinite(item.order)) throw new Error('Invalid task order')
    if (item.priority !== undefined && !['high', 'medium', 'low'].includes(item.priority)) throw new Error('Invalid task priority')
    if (item.dueDate !== undefined && !isDateKey(item.dueDate)) throw new Error('Invalid task due date')
    return {
      id: item.id, text: item.text.trim(), done: item.done, order: item.order,
      ...(item.priority !== undefined ? { priority: item.priority } : {}),
      ...(item.dueDate !== undefined ? { dueDate: item.dueDate } : {})
    }
  })
}

export function filterTodos(todos: Todo[], filter: TodoFilter, today = localDateKey()): Todo[] {
  return todos.filter(todo => {
    if (filter === 'active') return !todo.done
    if (filter === 'today') return !todo.done && !!todo.dueDate && todo.dueDate <= today
    if (filter === 'upcoming') return !todo.done && !!todo.dueDate && todo.dueDate > today
    if (filter === 'high') return !todo.done && todo.priority === 'high'
    if (filter === 'done') return todo.done
    return true
  })
}

export function moveTodo(todos: Todo[], id: string, neighborId: string): Todo[] {
  const from = todos.findIndex(todo => todo.id === id)
  const to = todos.findIndex(todo => todo.id === neighborId)
  if (from < 0 || to < 0) return todos
  const updated = [...todos]
  ;[updated[from], updated[to]] = [updated[to], updated[from]]
  return updated.map((todo, order) => ({ ...todo, order }))
}
