import React, { useState, useEffect } from 'react'
import type { FocusState, FocusAction, FocusSessionEntry } from '../../../shared/types'
import { Coffee, Flame, Clock, BarChart2 } from 'lucide-react'
import FocusHistoryModal from './FocusHistoryModal'
import ClockifyTaskBar from './ClockifyTaskBar'
import AmbientSoundPlayer from './AmbientSoundPlayer'
import PomodoroControls from './PomodoroControls'
import ProductivityAnalyticsModal from './ProductivityAnalyticsModal'

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
    <div className="bg-surface/60 border border-border rounded-2xl p-5 shadow-lg flex flex-col justify-between h-full min-h-[320px]">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {mode === 'work' ? (
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Flame className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Coffee className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-text text-base leading-tight">
                {mode === 'work' ? 'Focus Session' : 'Rest Break'}
              </h3>
              <p className="text-[11px] text-muted">
                {mode === 'work' ? `${workMinutes}m target` : `${breakMinutes}m pause`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAnalyticsOpen(true)}
              className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-full border border-amber-500/30 flex items-center gap-1 transition-colors"
              title="View Weekly Focus Analytics & Streaks"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Streaks</span>
            </button>

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1.5 transition-colors"
              title="Open Clockify Focus History"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>History ({history.length})</span>
            </button>
          </div>
        </div>

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
      <div className="flex flex-col items-center justify-center my-auto py-2">
        <div className="text-6xl font-mono font-bold tracking-tight text-text mb-2.5 select-none">
          {formattedTime}
        </div>

        {/* Progress Bar & Subtext */}
        <div className="w-full space-y-1.5">
          <div className="w-full bg-elevated h-2.5 rounded-full overflow-hidden p-0.5 border border-border/40">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                mode === 'work'
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 shadow-sm shadow-indigo-500/50'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted px-0.5 font-medium">
            <span>{isRunning ? `Focusing on "${taskName}"` : 'Ready to focus'}</span>
            <span>{Math.round(progressPercent)}% elapsed</span>
          </div>
        </div>
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
    </div>
  )
}
