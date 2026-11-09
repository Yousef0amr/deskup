import type { FocusSessionEntry } from '../../../shared/types'

export interface ClockifyCategory {
  id: string
  name: string
  color: 'indigo' | 'purple' | 'rose' | 'amber' | 'cyan' | 'emerald'
}

export const CLOCKIFY_CATEGORIES: ClockifyCategory[] = [
  { id: 'coding', name: 'Coding', color: 'indigo' },
  { id: 'deep-work', name: 'Deep Work', color: 'purple' },
  { id: 'design', name: 'Design', color: 'rose' },
  { id: 'writing', name: 'Writing', color: 'amber' },
  { id: 'research', name: 'Research', color: 'cyan' },
  { id: 'meeting', name: 'Meeting', color: 'emerald' }
]

export function getCategoryStyle(category?: string): {
  bg: string
  text: string
  dot: string
  border: string
} {
  const cat = category?.toLowerCase() || ''
  if (cat.includes('cod') || cat.includes('dev')) {
    return {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      dot: 'bg-indigo-500',
      border: 'border-indigo-500/30'
    }
  }
  if (cat.includes('deep') || cat.includes('focus')) {
    return {
      bg: 'bg-purple-500/10 dark:bg-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      dot: 'bg-purple-500',
      border: 'border-purple-500/30'
    }
  }
  if (cat.includes('design') || cat.includes('ui') || cat.includes('ux')) {
    return {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400',
      dot: 'bg-rose-500',
      border: 'border-rose-500/30'
    }
  }
  if (cat.includes('writ') || cat.includes('doc') || cat.includes('note')) {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
      border: 'border-amber-500/30'
    }
  }
  if (cat.includes('meet') || cat.includes('call') || cat.includes('sync')) {
    return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
      border: 'border-emerald-500/30'
    }
  }
  return {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    dot: 'bg-cyan-500',
    border: 'border-cyan-500/30'
  }
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds > 0 ? `${seconds}s` : ''}`
  }
  return `${seconds}s`
}

export function formatTimeRange(start: number, end: number): string {
  const startStr = new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const endStr = new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${startStr} – ${endStr}`
}

export function calculateTodayTotalMs(entries: FocusSessionEntry[]): number {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const threshold = startOfDay.getTime()

  return entries
    .filter((e) => e.startedAt >= threshold)
    .reduce((acc, curr) => acc + curr.durationMs, 0)
}

export interface DayGroup {
  dateLabel: string
  entries: FocusSessionEntry[]
  totalMs: number
}

export function groupEntriesByDate(entries: FocusSessionEntry[]): DayGroup[] {
  const now = new Date()
  const todayDateStr = now.toDateString()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayDateStr = yesterday.toDateString()

  const map = new Map<string, { dateLabel: string; entries: FocusSessionEntry[]; totalMs: number }>()

  for (const entry of entries) {
    const entryDate = new Date(entry.startedAt)
    const dateStr = entryDate.toDateString()

    let dateLabel = entryDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })

    if (dateStr === todayDateStr) {
      dateLabel = 'Today'
    } else if (dateStr === yesterdayDateStr) {
      dateLabel = 'Yesterday'
    }

    if (!map.has(dateStr)) {
      map.set(dateStr, { dateLabel, entries: [], totalMs: 0 })
    }

    const group = map.get(dateStr)!
    group.entries.push(entry)
    group.totalMs += entry.durationMs
  }

  return Array.from(map.values())
}
