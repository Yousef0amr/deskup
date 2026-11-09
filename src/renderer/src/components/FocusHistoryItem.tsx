import React from 'react'
import { Play, Trash2 } from 'lucide-react'
import type { FocusSessionEntry } from '../../../shared/types'
import { getCategoryStyle, formatDurationMs, formatTimeRange } from '../utils/focusUtils'

interface FocusHistoryItemProps {
  entry: FocusSessionEntry
  onReRunTask: (taskName: string, category?: string) => void
  onDeleteEntry: (id: string) => void
}

export default function FocusHistoryItem({
  entry,
  onReRunTask,
  onDeleteEntry
}: FocusHistoryItemProps): React.JSX.Element {
  const style = getCategoryStyle(entry.category)

  return (
    <div className="group flex items-center justify-between p-3 rounded-xl bg-surface/70 border border-border/70 hover:border-border hover:bg-elevated/60 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
        <button
          onClick={() => onReRunTask(entry.taskName, entry.category)}
          className="p-1.5 rounded-lg bg-elevated hover:bg-indigo-600 hover:text-white text-muted transition-colors shrink-0"
          title="Start timer with this task"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-text truncate">
              {entry.taskName}
            </span>
            {entry.category && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} shrink-0`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span>{entry.category}</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted mt-0.5">
            {formatTimeRange(entry.startedAt, entry.endedAt)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono font-bold text-xs text-text px-2.5 py-1 bg-elevated rounded-lg border border-border/60">
          {formatDurationMs(entry.durationMs)}
        </span>

        <button
          onClick={() => onDeleteEntry(entry.id)}
          className="p-1.5 text-muted hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

