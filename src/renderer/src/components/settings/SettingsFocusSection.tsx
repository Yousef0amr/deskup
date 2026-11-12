import React from 'react'
import { Flame, Coffee, Target } from 'lucide-react'
import type { Settings } from '../../../../shared/types'
import { Card } from '../ui/card'
import { Input } from '../ui/input'

interface SettingsFocusSectionProps {
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
}

export default function SettingsFocusSection({
  settings,
  onUpdate
}: SettingsFocusSectionProps): React.JSX.Element {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text">Focus & Break Durations</h3>
        <p className="text-xs text-muted">Configure Pomodoro session lengths and your daily focus goal</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
        <div className="p-3 bg-elevated/50 border border-border/60 rounded-xl space-y-2">
          <label className="text-xs font-medium text-text flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Work Duration (minutes)</span>
          </label>
          <Input
            type="number"
            min="1"
            max="120"
            value={settings.pomodoro.workMin}
            onChange={(e) =>
              onUpdate({
                pomodoro: {
                  ...settings.pomodoro,
                  workMin: parseInt(e.target.value) || 25
                }
              })
            }
            className="h-8 font-mono text-xs"
          />
        </div>

        <div className="p-3 bg-elevated/50 border border-border/60 rounded-xl space-y-2">
          <label className="text-xs font-medium text-text flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Break Duration (minutes)</span>
          </label>
          <Input
            type="number"
            min="1"
            max="60"
            value={settings.pomodoro.breakMin}
            onChange={(e) =>
              onUpdate({
                pomodoro: {
                  ...settings.pomodoro,
                  breakMin: parseInt(e.target.value) || 5
                }
              })
            }
            className="h-8 font-mono text-xs"
          />
        </div>

        <div className="p-3 bg-elevated/50 border border-border/60 rounded-xl space-y-2">
          <label className="text-xs font-medium text-text flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Daily Focus Goal (minutes)</span>
          </label>
          <Input
            type="number"
            min="5"
            max="1440"
            step="5"
            value={settings.dailyFocusGoalMin}
            onChange={(e) => onUpdate({ dailyFocusGoalMin: parseInt(e.target.value) || 120 })}
            className="h-8 font-mono text-xs"
          />
        </div>
      </div>
    </Card>
  )
}
