// Lightweight in-renderer signals so dashboard widgets can talk to each other
// without lifting all of their state into a shared parent.
import type { TodoFilter } from '../../../shared/todos'

export type DataTopic = 'todos' | 'habits'

const DATA_EVENT = 'deskup:data-changed'
const TODO_FILTER_EVENT = 'deskup:todo-filter'

export function emitDataChanged(topic: DataTopic): void {
  window.dispatchEvent(new CustomEvent<DataTopic>(DATA_EVENT, { detail: topic }))
}

export function onDataChanged(callback: (topic: DataTopic) => void): () => void {
  const handler = (event: Event) => callback((event as CustomEvent<DataTopic>).detail)
  window.addEventListener(DATA_EVENT, handler)
  return () => window.removeEventListener(DATA_EVENT, handler)
}

/** Ask the task planner to switch filter (e.g. from the Today summary). */
export function requestTodoFilter(filter: TodoFilter): void {
  window.dispatchEvent(new CustomEvent<TodoFilter>(TODO_FILTER_EVENT, { detail: filter }))
}

export function onTodoFilterRequest(callback: (filter: TodoFilter) => void): () => void {
  const handler = (event: Event) => callback((event as CustomEvent<TodoFilter>).detail)
  window.addEventListener(TODO_FILTER_EVENT, handler)
  return () => window.removeEventListener(TODO_FILTER_EVENT, handler)
}

/** Smoothly bring a dashboard section into view and briefly highlight it. */
export function revealSection(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.classList.remove('animate-highlight')
  void el.offsetWidth // restart the animation
  el.classList.add('animate-highlight')
}
