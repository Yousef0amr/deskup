import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import type { FocusSessionEntry } from '../../../shared/types'
import { CLOCKIFY_CATEGORIES } from '../utils/focusUtils'

interface FocusManualEntryFormProps {
  onAddManualEntry: (entry: Omit<FocusSessionEntry, 'id'>) => void
}

export default function FocusManualEntryForm({
  onAddManualEntry
}: FocusManualEntryFormProps): React.JSX.Element {
  const [manualTask, setManualTask] = useState('')
  const [manualCategory, setManualCategory] = useState('Coding')
  const [manualMinutes, setManualMinutes] = useState(25)
  const [isAdding, setIsAdding] = useState(false)

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTask.trim() || manualMinutes <= 0) return
    const now = Date.now()
    const durationMs = manualMinutes * 60000
    onAddManualEntry({
      taskName: manualTask.trim(),
      category: manualCategory,
      startedAt: now - durationMs,
      endedAt: now,
      durationMs,
      completed: true,
      mode: 'work'
    })
    setManualTask('')
    setIsAdding(false)
  }

  return (
    <div className="bg-elevated/40 border border-border/60 rounded-xl p-3">
      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-between text-xs text-muted hover:text-text transition-colors"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Plus className="w-3.5 h-3.5 text-indigo-500" />
            <span>Log a past session manually</span>
          </span>
          <span className="text-[10px] bg-elevated px-2 py-0.5 rounded border border-border/60">
            + Add Entry
          </span>
        </button>
      ) : (
        <form onSubmit={handleCreateManual} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text">Manual Focus Entry</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              value={manualTask}
              onChange={(e) => setManualTask(e.target.value)}
              placeholder="What did you work on? (e.g. Code Review)"
              className="sm:col-span-6 px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            <select
              value={manualCategory}
              onChange={(e) => setManualCategory(e.target.value)}
              className="sm:col-span-3 px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {CLOCKIFY_CATEGORIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="sm:col-span-3 flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={480}
                value={manualMinutes}
                onChange={(e) => setManualMinutes(Number(e.target.value))}
                className="w-16 px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-text text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-muted">min</span>
              <button
                type="submit"
                disabled={!manualTask.trim()}
                className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

