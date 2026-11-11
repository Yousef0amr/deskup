import type { Habit } from './types'
import { isDateKey, localDateKey } from './todos'

export const MAX_HABITS = 30
const MAX_COMPLETIONS = 1000

function shiftDay(key: string, delta: number): string {
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() + delta)
  return localDateKey(date)
}

export function validateHabits(value: unknown): Habit[] {
  if (!Array.isArray(value)) throw new Error('Habits must be a list')
  if (value.length > MAX_HABITS) throw new Error(`At most ${MAX_HABITS} habits are supported`)
  const ids = new Set<string>()
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid habit')
    if (typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error('Missing or duplicate habit ID')
    ids.add(item.id)
    if (typeof item.name !== 'string' || !item.name.trim()) throw new Error('Habit name is required')
    if (typeof item.icon !== 'string' || item.icon.length > 16) throw new Error('Invalid habit icon')
    if (typeof item.createdAt !== 'number' || !Number.isFinite(item.createdAt)) throw new Error('Invalid habit creation time')
    if (!Array.isArray(item.completions) || !item.completions.every(isDateKey)) throw new Error('Invalid habit completion date')
    const completions = [...new Set<string>(item.completions)].sort().slice(-MAX_COMPLETIONS)
    return { id: item.id, name: item.name.trim().slice(0, 80), icon: item.icon || '✅', createdAt: item.createdAt, completions }
  })
}

export function toggleHabitDay(habit: Habit, day = localDateKey()): Habit {
  const done = habit.completions.includes(day)
  const completions = done ? habit.completions.filter(d => d !== day) : [...habit.completions, day].sort()
  return { ...habit, completions }
}

/** Consecutive completed days ending today, or ending yesterday if today is not done yet. */
export function currentStreak(habit: Habit, today = localDateKey()): number {
  const done = new Set(habit.completions)
  let day = done.has(today) ? today : shiftDay(today, -1)
  let streak = 0
  while (done.has(day)) {
    streak++
    day = shiftDay(day, -1)
  }
  return streak
}

export function bestStreak(habit: Habit): number {
  let best = 0
  let run = 0
  let previous: string | null = null
  for (const day of [...new Set(habit.completions)].sort()) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }
  return best
}

/** The last `count` date keys, oldest first, ending with `today`. */
export function lastDays(count: number, today = localDateKey()): string[] {
  return Array.from({ length: count }, (_, i) => shiftDay(today, i - count + 1))
}
