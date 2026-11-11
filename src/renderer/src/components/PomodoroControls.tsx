import React from 'react'
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react'
import { Button } from './ui/button'

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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReset}
          className="text-muted hover:text-text h-9 w-9"
          title="Reset Session"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          onClick={onTogglePlay}
          className={`h-9 rounded-lg px-6 text-xs font-semibold gap-2 ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
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
              <span>Start</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onSkip}
          className="text-muted hover:text-text h-9 w-9"
          title="Skip to next phase"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-[11px] text-muted text-center mt-2.5">
        {sessionsCompleted} {sessionsCompleted === 1 ? 'session' : 'sessions'} today · keeps running in the background
      </p>
    </div>
  )
}
