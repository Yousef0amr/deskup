import React from 'react'
import { CLOCKIFY_CATEGORIES, getCategoryStyle } from '../utils/focusUtils'

interface ClockifyTaskBarProps {
  taskName: string
  category: string
  isRunning: boolean
  onTaskNameChange: (val: string) => void
  onCategoryChange: (val: string) => void
}

export default function ClockifyTaskBar({
  taskName,
  category,
  isRunning,
  onTaskNameChange,
  onCategoryChange
}: ClockifyTaskBarProps): React.JSX.Element {
  const catStyle = getCategoryStyle(category)

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-1.5 bg-elevated/70 border border-border/70 rounded-xl px-2.5 py-1 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
        <input
          disabled={isRunning}
          type="text"
          value={taskName}
          onChange={(e) => onTaskNameChange(e.target.value)}
          placeholder="What are you working on? (Clockify style)..."
          className="flex-1 bg-transparent border-none text-xs text-text placeholder-muted focus:outline-none"
        />
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border} shrink-0`}
        >
          #{category}
        </span>
      </div>

      {!isRunning && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {CLOCKIFY_CATEGORIES.slice(0, 4).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCategoryChange(c.name)}
              className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors shrink-0 ${
                category === c.name
                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                  : 'bg-surface/80 text-muted border-border/60 hover:bg-elevated'
              }`}
            >
              #{c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

