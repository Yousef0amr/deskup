import React from 'react'
import { X, Flame, BarChart2, Zap } from 'lucide-react'
import type { FocusSessionEntry } from '../../../shared/types'
import { computeProductivitySummary } from '../utils/analyticsUtils'

interface ProductivityAnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  entries: FocusSessionEntry[]
}

export default function ProductivityAnalyticsModal({
  isOpen,
  onClose,
  entries
}: ProductivityAnalyticsModalProps): React.JSX.Element | null {
  if (!isOpen) return null

  const summary = computeProductivitySummary(entries)
  const hours = Math.floor(summary.totalWeeklyMinutes / 60)
  const remainingMins = summary.totalWeeklyMinutes % 60

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/80 bg-elevated/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-text">Productivity & Streaks</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>{summary.currentStreakDays} Day Streak</span>
                </span>
              </div>
              <p className="text-xs text-muted">Weekly focus habits and performance analytics.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Pillar Summary Cards */}
        <div className="grid grid-cols-3 divide-x divide-border/60 bg-surface/80 border-b border-border/60 text-center py-4">
          <div>
            <div className="text-xs text-muted font-medium">Focus Streak</div>
            <div className="text-lg font-bold text-amber-500 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span>{summary.currentStreakDays} {summary.currentStreakDays === 1 ? 'Day' : 'Days'}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted font-medium">7-Day Total</div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {hours}h {remainingMins}m
            </div>
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Daily Avg</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {summary.dailyAverageMinutes}m/day
            </div>
          </div>
        </div>

        {/* Visual 7-Day Bar Chart */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text">Past 7 Days Focus Activity</span>
            <span className="text-muted flex items-center gap-1 text-[11px]">
              <Zap className="w-3 h-3 text-indigo-500" />
              <span>Top day: {summary.mostProductiveDay}</span>
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 bg-elevated/40 border border-border/60 rounded-xl">
            {summary.dayStats.map((ds) => (
              <div key={ds.dayName} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-mono text-muted group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {ds.minutes}m
                </div>
                <div className="w-full max-w-[28px] bg-elevated h-full rounded-t-lg overflow-hidden flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-t-lg transition-all duration-500 shadow-sm shadow-indigo-500/20 group-hover:brightness-110"
                    style={{ height: `${Math.max(6, ds.percent)}%` }}
                  />
                </div>
                <div className="text-[11px] font-medium text-text group-hover:text-indigo-500 transition-colors">
                  {ds.dayName}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-border/80 bg-elevated/30">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

