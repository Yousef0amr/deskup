import React from 'react'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'

interface PomodoroControlsProps {
  isRunning: boolean
  sessionsCompleted: number
  onReset: () => void
  onTogglePlay: () => void
  onSkip: () => void
}

export default function PomodoroControls({
  isRunning,
  sessionsCompleted,
  onReset,
  onTogglePlay,
  onSkip
}: PomodoroControlsProps): React.JSX.Element {
  return (
    <div>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={onReset}
          className="p-2.5 text-muted hover:text-text hover:bg-elevated rounded-xl transition-colors border border-transparent hover:border-border/60"
          title="Reset Session"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onTogglePlay}
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
          onClick={onSkip}
          className="p-2.5 text-muted hover:text-text hover:bg-elevated rounded-xl transition-colors border border-transparent hover:border-border/60"
          title="Skip to next phase"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-muted text-center mt-2.5">
        {sessionsCompleted} completed today · Tracks automatically in background
      </p>
    </div>
  )
}

