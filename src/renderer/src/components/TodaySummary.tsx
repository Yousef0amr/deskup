import React, { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, Flame } from 'lucide-react'
import type { FocusSessionEntry, Habit, Todo } from '../../../shared/types'
import { localDateKey } from '../../../shared/todos'
import { currentStreak } from '../../../shared/habits'
import { onDataChanged, requestTodoFilter, revealSection } from '../lib/events'
import { cn } from '../lib/utils'

interface TodaySummaryProps {
  focusGoalMin: number
}

interface Snapshot {
  focusMin: number
  dueOpen: number
  overdue: number
  openTotal: number
  total: number
  habitsDone: number
  habitsTotal: number
  bestLiveStreak: number
}

function focusMinutesToday(entries: FocusSessionEntry[]): number {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const ms = entries
    .filter(e => e.mode === 'work' && e.endedAt >= start.getTime())
    // Only count the part of a session that falls on today.
    .reduce((sum, e) => sum + Math.min(e.durationMs, e.endedAt - start.getTime()), 0)
  return Math.round(ms / 60_000)
}

function summarize(history: FocusSessionEntry[], todos: Todo[], habits: Habit[]): Snapshot {
  const today = localDateKey()
  const open = todos.filter(t => !t.done)
  return {
    focusMin: focusMinutesToday(history),
    dueOpen: open.filter(t => t.dueDate === today).length,
    overdue: open.filter(t => !!t.dueDate && t.dueDate < today).length,
    openTotal: open.length,
    total: todos.length,
    habitsDone: habits.filter(h => h.completions.includes(today)).length,
    habitsTotal: habits.length,
    bestLiveStreak: habits.reduce((max, h) => Math.max(max, currentStreak(h, today)), 0)
  }
}

const formatMinutes = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`)

function Tile({ label, onClick, actionHint, children, footer }: {
  label: string
  onClick: () => void
  actionHint: string
  children: React.ReactNode
  footer: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={actionHint}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-hover hover:bg-elevated/40"
    >
      <div className="flex w-full items-center justify-between text-xs font-medium text-muted">
        <span>{label}</span>
        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      {children}
      <div className="text-xs text-muted">{footer}</div>
    </button>
  )
}

function Bar({ value, tone }: { value: number; tone: string }): React.JSX.Element {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tone)} style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  )
}

export default function TodaySummary({ focusGoalMin }: TodaySummaryProps): React.JSX.Element {
  const [snap, setSnap] = useState<Snapshot | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [history, todos, habits] = await Promise.all([
        window.deskup.focus.getHistory(),
        window.deskup.todos.list(),
        window.deskup.habits.list()
      ])
      setSnap(summarize(history, todos, habits))
    } catch (err) {
      console.error('Failed to load today summary:', err)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const offData = onDataChanged(() => void refresh())
    // Focus sessions are recorded by the main process; re-read when the timer changes mode.
    let lastMode: string | null = null
    const offFocus = window.deskup.focus.onChanged(state => {
      if (state.mode !== lastMode) {
        lastMode = state.mode
        void refresh()
      }
    })
    const timer = setInterval(() => void refresh(), 60_000)
    return () => {
      offData()
      offFocus()
      clearInterval(timer)
    }
  }, [refresh])

  const goal = Math.max(1, focusGoalMin)
  const focusProgress = snap ? snap.focusMin / goal : 0
  const habitProgress = snap && snap.habitsTotal ? snap.habitsDone / snap.habitsTotal : 0
  const value = 'text-2xl font-semibold tracking-tight tabular-nums text-text'

  return (
    <section aria-label="Today" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Tile label="Focus today" actionHint="Go to the focus timer" onClick={() => revealSection('dash-focus')} footer={
        !snap ? ' ' : focusProgress >= 1 ? 'Daily goal reached' : `${formatMinutes(Math.max(0, goal - snap.focusMin))} to your ${formatMinutes(goal)} goal`
      }>
        <div className={value}>{snap ? formatMinutes(snap.focusMin) : '—'}</div>
        <Bar value={focusProgress} tone={focusProgress >= 1 ? 'bg-emerald-500' : 'bg-indigo-500'} />
      </Tile>

      <Tile
        label="Tasks"
        actionHint="Show today's tasks"
        onClick={() => {
          requestTodoFilter('today')
          revealSection('dash-tasks')
        }}
        footer={
          !snap ? ' ' : snap.overdue > 0
            ? <span className="text-rose-600 dark:text-rose-400">{snap.overdue} overdue · {snap.openTotal} open</span>
            : `${snap.total - snap.openTotal} of ${snap.total} completed`
        }
      >
        <div className={value}>
          {snap ? snap.dueOpen + snap.overdue : '—'}
          <span className="ml-1.5 text-sm font-normal text-muted">due today</span>
        </div>
        <Bar value={snap && snap.total ? (snap.total - snap.openTotal) / snap.total : 0} tone="bg-sky-500" />
      </Tile>

      <Tile label="Habits" actionHint="Go to habits" onClick={() => revealSection('dash-habits')} footer={
        !snap ? ' ' : snap.bestLiveStreak > 0
          ? <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" />Longest active streak: {snap.bestLiveStreak} days</span>
          : snap.habitsTotal ? 'Tick one off to start a streak' : 'Add a habit to start tracking'
      }>
        <div className={value}>
          {snap ? (snap.habitsTotal ? `${snap.habitsDone}/${snap.habitsTotal}` : '0') : '—'}
          <span className="ml-1.5 text-sm font-normal text-muted">done</span>
        </div>
        <Bar value={habitProgress} tone="bg-emerald-500" />
      </Tile>
    </section>
  )
}
