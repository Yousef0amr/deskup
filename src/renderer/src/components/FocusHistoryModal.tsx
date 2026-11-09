import React from 'react'
import { X, Clock, Trash2, Flame } from 'lucide-react'
import type { FocusSessionEntry } from '../../../shared/types'
import {
  formatDurationMs,
  calculateTodayTotalMs,
  groupEntriesByDate
} from '../utils/focusUtils'
import FocusHistoryItem from './FocusHistoryItem'
import FocusManualEntryForm from './FocusManualEntryForm'

interface FocusHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  entries: FocusSessionEntry[]
  onDeleteEntry: (id: string) => void
  onClearHistory: () => void
  onReRunTask: (taskName: string, category?: string) => void
  onAddManualEntry: (entry: Omit<FocusSessionEntry, 'id'>) => void
}

export default function FocusHistoryModal({
  isOpen,
  onClose,
  entries,
  onDeleteEntry,
  onClearHistory,
  onReRunTask,
  onAddManualEntry
}: FocusHistoryModalProps): React.JSX.Element | null {
  if (!isOpen) return null

  const todayTotalMs = calculateTodayTotalMs(entries)
  const grouped = groupEntriesByDate(entries)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/80 bg-elevated/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-text">Focus History & Time Log</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Clockify Mode
                </span>
              </div>
              <p className="text-xs text-muted">Tracked pomodoro sessions and manual time logs.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 divide-x divide-border/60 bg-surface/80 border-b border-border/60 text-center py-3">
          <div>
            <div className="text-xs text-muted font-medium">Today&apos;s Focus</div>
            <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              {formatDurationMs(todayTotalMs) || '0m'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Logged Sessions</div>
            <div className="text-base font-bold text-text">{entries.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Top Category</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {entries[0]?.category || 'Coding'}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <FocusManualEntryForm onAddManualEntry={onAddManualEntry} />

          {/* Grouped Entries List */}
          {grouped.length === 0 ? (
            <div className="text-center py-12 text-muted border border-dashed border-border/70 rounded-2xl space-y-2">
              <Flame className="w-8 h-8 text-indigo-500/40 mx-auto" />
              <p className="text-sm font-semibold text-text">No focus sessions recorded yet</p>
              <p className="text-xs max-w-sm mx-auto">
                Start a session on the dashboard or log an entry above to track your Clockify focus history.
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.dateLabel} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted px-1 uppercase tracking-wider">
                  <span>{group.dateLabel}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {formatDurationMs(group.totalMs)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {group.entries.map((entry) => (
                    <FocusHistoryItem
                      key={entry.id}
                      entry={entry}
                      onReRunTask={(t, c) => {
                        onReRunTask(t, c)
                        onClose()
                      }}
                      onDeleteEntry={onDeleteEntry}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border/80 bg-elevated/30">
          {entries.length > 0 ? (
            <button
              onClick={() => {
                if (confirm('Clear all focus history?')) onClearHistory()
              }}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-elevated hover:bg-hover border border-border/80 text-xs font-semibold text-text rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
