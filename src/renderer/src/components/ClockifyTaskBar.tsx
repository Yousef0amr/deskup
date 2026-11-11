import React from 'react'
import { CLOCKIFY_CATEGORIES, getCategoryStyle } from '../utils/focusUtils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

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
        <Badge
          variant="outline"
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border} shrink-0`}
        >
          #{category}
        </Badge>
      </div>

      {!isRunning && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {CLOCKIFY_CATEGORIES.slice(0, 4).map((c) => (
            <Button
              key={c.id}
              type="button"
              variant={category === c.name ? 'default' : 'secondary'}
              size="sm"
              onClick={() => onCategoryChange(c.name)}
              className="h-6 px-2 text-[10px] rounded-lg shrink-0"
            >
              #{c.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
