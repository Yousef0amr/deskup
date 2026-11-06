import React, { useState, useEffect } from 'react'
import type { FocusState, FocusAction } from '../../../shared/types'
import { Play, Pause, RotateCcw, SkipForward, Coffee, Flame, Sparkles } from 'lucide-react'

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

  useEffect(() => {
    const unsubscribe = window.deskup.focus.onChanged(setState)
    window.deskup.focus
      .get()
      .then(setState)
      .catch(() => setError('Could not load timer. Reopen this page to retry.'))
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => {
      unsubscribe()
      clearInterval(timer)
    }
  }, [])

  const act = async (action: FocusAction) => {
    try {
      setState(await window.deskup.focus.action(action))
      setNow(Date.now())
      setError('')
    } catch {
      setError('Could not update timer. Please try again.')
    }
  }

  const mode = state?.mode ?? 'work'
  const isRunning = state?.endsAt != null
  const sessionsCompleted = state?.sessionsCompleted ?? 0
  const timeLeft = Math.ceil(
    Math.max(0, state?.endsAt != null ? state.endsAt - now : state?.remainingMs ?? workMinutes * 60000) / 1000
  )

  const toggleStartPause = () => {
    if (state) void act(isRunning ? 'pause' : 'start')
  }
  const handleReset = () => {
    if (state) void act('reset')
  }
  const handleSkip = () => {
    if (state) void act('skip')
  }

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
          <span className="text-[11px] font-medium text-muted bg-elevated px-2.5 py-1 rounded-full border border-border/60 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{sessionsCompleted} completed</span>
          </span>
        </div>

        {error && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 mt-1">
            {error}
          </p>
        )}
      </div>

      {/* Main Timer Display */}
      <div className="flex flex-col items-center justify-center my-auto py-2">
        <div className="text-6xl font-mono font-bold tracking-tight text-text mb-3 select-none">
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
            <span>{isRunning ? 'Session running' : 'Ready'}</span>
            <span>{Math.round(progressPercent)}% elapsed</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={handleReset}
            className="p-2.5 text-muted hover:text-text hover:bg-elevated rounded-xl transition-colors border border-transparent hover:border-border/60"
            title="Reset Session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleStartPause}
            className={`px-8 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 text-white shadow-lg transition-all active:scale-95 ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start Focus</span>
              </>
            )}
          </button>

          <button
            onClick={handleSkip}
            className="p-2.5 text-muted hover:text-text hover:bg-elevated rounded-xl transition-colors border border-transparent hover:border-border/60"
            title="Skip to next phase"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-muted text-center mt-3">
          Continues automatically in background and system tray.
        </p>
      </div>
    </div>
  )
}
