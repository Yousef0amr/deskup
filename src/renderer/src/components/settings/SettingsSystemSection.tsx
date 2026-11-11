import React from 'react'
import { Keyboard, Power, Minimize2 } from 'lucide-react'
import type { Settings } from '../../../../shared/types'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'

interface SettingsSystemSectionProps {
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
}

export default function SettingsSystemSection({
  settings,
  onUpdate
}: SettingsSystemSectionProps): React.JSX.Element {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text">System Integration</h3>
        <p className="text-xs text-muted">Control system hotkeys and background behavior</p>
      </div>

      <div className="space-y-4 max-w-md">
        {/* Global Hotkey */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Global Show/Hide Shortcut</span>
          </label>
          <Input
            type="text"
            value={settings.hotkey}
            onChange={(e) => onUpdate({ hotkey: e.target.value })}
            placeholder="CommandOrControl+Shift+D"
            className="h-9 font-mono text-xs"
          />
          <p className="text-[11px] text-muted">
            Default: <code className="text-muted">CommandOrControl+Shift+D</code>
          </p>
        </div>

        {/* Launch at Login */}
        <div className="flex items-center justify-between p-3 bg-elevated/40 border border-border/50 rounded-xl">
          <div className="flex items-center gap-2.5">
            <Power className="w-4 h-4 text-muted" />
            <div>
              <div className="text-xs font-medium text-text">Launch at login</div>
              <div className="text-[11px] text-muted">Automatically start Deskup when you log in</div>
            </div>
          </div>
          <Switch
            checked={settings.launchAtLogin}
            onCheckedChange={(checked) => onUpdate({ launchAtLogin: checked })}
          />
        </div>

        {/* Minimize to Tray */}
        <div className="flex items-center justify-between p-3 bg-elevated/40 border border-border/50 rounded-xl">
          <div className="flex items-center gap-2.5">
            <Minimize2 className="w-4 h-4 text-muted" />
            <div>
              <div className="text-xs font-medium text-text">Minimize to tray on close</div>
              <div className="text-[11px] text-muted">Keep running in background when window is closed</div>
            </div>
          </div>
          <Switch
            checked={settings.minimizeToTray}
            onCheckedChange={(checked) => onUpdate({ minimizeToTray: checked })}
          />
        </div>
      </div>
    </Card>
  )
}
