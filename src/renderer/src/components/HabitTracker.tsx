import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Repeat, Plus, Flame, Trash2, Check, X } from 'lucide-react'
import type { Habit } from '../../../shared/types'
import { localDateKey } from '../../../shared/todos'
import { MAX_HABITS, bestStreak, currentStreak, lastDays, toggleHabitDay } from '../../../shared/habits'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useToast } from './ui/toast'
import { WidgetHeader } from './ui/widget-header'
import { Skeleton } from './ui/skeleton'
import { emitDataChanged } from '../lib/events'
import { cn } from '../lib/utils'

const ICON_CHOICES = ['✅', '💧', '📚', '🏃', '🧘', '💪', '🥗', '😴', '✍️', '🎯']
const WEEK = 7

function dayLabel(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString([], { weekday: 'narrow' })
}

export default function HabitTracker(): React.JSX.Element {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICON_CHOICES[0])
  const [today, setToday] = useState(localDateKey())
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const toast = useToast()

  useEffect(() => {
    window.deskup.habits.list()
      .then(setHabits)
      .catch(err => console.error('Failed to load habits:', err))
      .finally(() => setLoaded(true))
    // Roll the "today" column over at midnight without a reload.
    const timer = setInterval(() => setToday(localDateKey()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const days = useMemo(() => lastDays(WEEK, today), [today])

  const persist = (next: Habit[]) => {
    const previous = habits
    setHabits(next)
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => window.deskup.habits.save(next))
      .then(() => emitDataChanged('habits'))
      .catch(err => {
        setHabits(previous)
        toast('Could not save habits: ' + (err as Error).message, 'error')
      })
  }

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    persist([...habits, { id: crypto.randomUUID(), name: trimmed, icon, createdAt: Date.now(), completions: [] }])
    setName('')
    setAdding(false)
  }

  const toggle = (id: string, day: string) => {
    const next = habits.map(h => (h.id === id ? toggleHabitDay(h, day) : h))
    persist(next)
    const updated = next.find(h => h.id === id)
    if (updated && day === today && updated.completions.includes(today)) {
      const streak = currentStreak(updated, today)
      if (streak > 1 && streak % 7 === 0) toast(`${updated.icon} ${streak}-day streak on “${updated.name}”!`, 'success')
    }
  }

  const remove = (habit: Habit) => {
    const index = habits.findIndex(h => h.id === habit.id)
    persist(habits.filter(h => h.id !== habit.id))
    toast(`Deleted “${habit.name}”`, 'info', {
      label: 'Undo',
      onClick: () => setHabits(current => {
        if (current.some(h => h.id === habit.id)) return current
        const restored = [...current]
        restored.splice(Math.min(index, restored.length), 0, habit)
        void window.deskup.habits.save(restored).then(() => emitDataChanged('habits'))
        return restored
      })
    })
  }

  const doneToday = habits.filter(h => h.completions.includes(today)).length

  return (
    <Card className="flex h-full flex-col p-4">
      <WidgetHeader
        icon={Repeat}
        title="Habits"
        subtitle={habits.length ? `${doneToday} of ${habits.length} today` : undefined}
        actions={!adding && habits.length > 0 && habits.length < MAX_HABITS && (
          <Button type="button" variant="ghost" size="sm" className="text-muted" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        )}
      />

      {adding && (
        <form onSubmit={addHabit} className="mb-3 space-y-2 rounded-lg border border-border bg-elevated/40 p-2.5 animate-fade-in">
          <div className="flex gap-2">
            <Input
              autoFocus
              value={name}
              maxLength={80}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setAdding(false)}
              placeholder="e.g. Read 20 pages"
              aria-label="Habit name"
              className="h-8 text-xs"
            />
            <Button type="submit" size="sm" className="h-8" disabled={!name.trim()}>Save</Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => setAdding(false)} aria-label="Cancel">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Habit icon">
            {ICON_CHOICES.map(choice => (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={icon === choice}
                onClick={() => setIcon(choice)}
                className={cn(
                  'h-7 w-7 rounded-lg text-sm transition-colors',
                  icon === choice ? 'bg-indigo-500/15 ring-1 ring-indigo-500' : 'hover:bg-hover'
                )}
              >
                {choice}
              </button>
            ))}
          </div>
        </form>
      )}

      {!loaded ? (
        <div role="status" aria-label="Loading habits" className="space-y-2 py-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-elevated/30 px-2.5 py-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Skeleton className="h-5 w-5 rounded-md shrink-0" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                  <Skeleton key={d} className="h-5 w-5 rounded-md" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : habits.length === 0 && !adding ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-center">
          <span className="text-2xl">🌱</span>
          <p className="text-xs text-muted max-w-[16rem]">Track small daily routines and watch your streaks grow.</p>
          <Button type="button" size="sm" onClick={() => setAdding(true)} className="mt-1 gap-1">
            <Plus className="w-3.5 h-3.5" /> First habit
          </Button>
        </div>
      ) : (
        habits.length > 0 && (
          <div className="space-y-1 overflow-y-auto max-h-72 -mx-1 px-1">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-2 pb-1">
              <span />
              <div className="flex gap-1">
                {days.map(day => (
                  <span key={day} className={cn('w-6 text-center text-[10px] font-medium', day === today ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted')}>
                    {dayLabel(day)}
                  </span>
                ))}
                <span className="w-12" />
              </div>
            </div>
            {habits.map(habit => {
              const streak = currentStreak(habit, today)
              const done = new Set(habit.completions)
              return (
                <div key={habit.id} className="group grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-elevated/60">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-base">{habit.icon}</span>
                    <span className="truncate text-xs font-medium text-text" title={habit.name}>{habit.name}</span>
                    <button
                      type="button"
                      onClick={() => remove(habit)}
                      aria-label={`Delete ${habit.name}`}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded p-0.5 text-muted hover:text-rose-500 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {days.map(day => {
                      const checked = done.has(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggle(habit.id, day)}
                          aria-pressed={checked}
                          aria-label={`${habit.name} on ${day}`}
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-md border transition-all active:scale-90',
                            checked
                              ? 'border-indigo-500 bg-indigo-500 text-white'
                              : 'border-border bg-surface hover:border-indigo-400',
                            day === today && !checked && 'border-indigo-400/70 border-dashed'
                          )}
                        >
                          {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </button>
                      )
                    })}
                    <span
                      className={cn('flex w-12 items-center justify-end gap-0.5 text-[11px] font-semibold tabular-nums', streak ? 'text-orange-500' : 'text-muted/60')}
                      title={`Current streak ${streak} · Best ${bestStreak(habit)}`}
                    >
                      <Flame className="h-3.5 w-3.5" />
                      {streak}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </Card>
  )
}
