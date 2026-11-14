import React, { useState, useEffect } from 'react'
import type { FocusState, FocusAction, FocusSessionEntry } from '../../../shared/types'
import { Coffee, Flame, Clock, BarChart2 } from 'lucide-react'
import FocusHistoryModal from './FocusHistoryModal'
import ClockifyTaskBar from './ClockifyTaskBar'
import AmbientSoundPlayer from './AmbientSoundPlayer'
import PomodoroControls from './PomodoroControls'
import ProductivityAnalyticsModal from './ProductivityAnalyticsModal'
import { Card } from './ui/card'
import { WidgetHeader } from './ui/widget-header'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

interface PomodoroTimerProps {
  workMinutes?: number
  breakMinutes?: number
}

export default function PomodoroTimer({
  workMinutes = 25,
  breakMinutes = 5
}: PomodoroTimerProps): React.JSX.Element {
  const [state, setState] = useState<FocusState | null>(null)
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState('')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
  const [history, setHistory] = useState<FocusSessionEntry[]>([])
  const [taskName, setTaskName] = useState('Deep Work')
  const [category, setCategory] = useState('Coding')

  const loadHistory = async () => {
    try {
      const entries = await window.deskup.focus.getHistory()
      setHistory(entries)
    } catch {
      // Ignored
    }
  }

  useEffect(() => {
    const unsubscribe = window.deskup.focus.onChanged((nextState) => {
      setState(nextState)
      void loadHistory()
    })
    window.deskup.focus
      .get()
      .then(setState)
      .catch(() => setError('Could not load timer. Reopen this page to retry.'))
    void loadHistory()

    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => {
      unsubscribe()
      clearInterval(timer)
    }
  }, [])

  const act = async (action: FocusAction) => {
    try {
      const next = await window.deskup.focus.action(action, { taskName, category })
      setState(next)
      setNow(Date.now())
      setError('')
      void loadHistory()
    } catch {
      setError('Could not update timer. Please try again.')
    }
  }

  const handleDeleteHistory = async (id: string) => {
    await window.deskup.focus.deleteHistoryItem(id).catch(() => {})
    setHistory((prev) => prev.filter((h) => h.id !== id))
  }

  const handleClearHistory = async () => {
    await window.deskup.focus.clearHistory().catch(() => {})
    setHistory([])
  }

  const handleAddManual = async (entry: Omit<FocusSessionEntry, 'id'>) => {
    const created = await window.deskup.focus.addHistory(entry).catch(() => null)
    if (created) setHistory((prev) => [created, ...prev])
  }

  const handleReRunTask = (reTask: string, reCategory?: string) => {
    setTaskName(reTask)
    if (reCategory) setCategory(reCategory)
    void act('start')
  }

  const mode = state?.mode ?? 'work'
  const isRunning = state?.endsAt != null
  const sessionsCompleted = state?.sessionsCompleted ?? 0
  const timeLeft = Math.ceil(
    Math.max(0, state?.endsAt != null ? state.endsAt - now : state?.remainingMs ?? workMinutes * 60000) / 1000
  )

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const totalTime = (mode === 'work' ? workMinutes : breakMinutes) * 60
  const progressPercent = Math.max(0, Math.min(100, ((totalTime - timeLeft) / totalTime) * 100))

  return (
    <Card className="flex h-full flex-col p-4">
      <div>
        <WidgetHeader
          icon={mode === 'work' ? Flame : Coffee}
          title={mode === 'work' ? 'Focus' : 'Break'}
          subtitle={mode === 'work' ? `${workMinutes} min session` : `${breakMinutes} min break`}
          actions={
            <>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsAnalyticsOpen(true)} title="Weekly analytics & streaks" aria-label="Weekly analytics">
                <BarChart2 className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-muted" onClick={() => setIsHistoryOpen(true)} title="Focus history">
                <Clock className="h-3.5 w-3.5" />
                <span className="tabular-nums">{history.length}</span>
              </Button>
            </>
          }
        />

        {/* Clockify Task & Category Selector */}
        {mode === 'work' && (
          <ClockifyTaskBar
            taskName={taskName}
            category={category}
            isRunning={isRunning}
            onTaskNameChange={setTaskName}
            onCategoryChange={setCategory}
          />
        )}

        {error && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 mt-1">
            {error}
          </p>
        )}
      </div>

      {/* Main Timer Display */}
      <div className="flex flex-col items-center justify-center py-5">
        {!state && !error ? (
          <>
            <Skeleton className="mb-3 h-[56px] w-40 rounded-xl" />
            <div className="w-full space-y-1.5">
              <Skeleton className="h-1 w-full rounded-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={`mb-3 select-none font-mono text-[56px] font-medium leading-none tracking-tight tabular-nums ${isRunning ? 'text-text' : 'text-text/80'}`}>
              {formattedTime}
            </div>

            {/* Progress Bar & Subtext */}
            <div className="w-full space-y-1.5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-elevated">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${mode === 'work' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center gap-2 text-[11px] text-muted">
                <span className="truncate">{isRunning ? `On: ${taskName}` : mode === 'work' ? 'Ready when you are' : 'Take a breather'}</span>
                <span className="tabular-nums">{Math.round(progressPercent)}%</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ambient Sound Player & Controls */}
      <div className="space-y-2">
        <AmbientSoundPlayer />

        <PomodoroControls
          isRunning={isRunning}
          sessionsCompleted={sessionsCompleted}
          onReset={() => void act('reset')}
          onTogglePlay={() => void act(isRunning ? 'pause' : 'start')}
          onSkip={() => void act('skip')}
        />
      </div>

      {/* Clockify History Modal */}
      <FocusHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        entries={history}
        onDeleteEntry={handleDeleteHistory}
        onClearHistory={handleClearHistory}
        onReRunTask={handleReRunTask}
        onAddManualEntry={handleAddManual}
      />

      {/* Productivity Analytics Modal */}
      <ProductivityAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        entries={history}
      />
    </Card>
  )
}
