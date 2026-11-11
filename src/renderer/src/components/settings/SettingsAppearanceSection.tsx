import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import type { Settings } from '../../../../shared/types'
import { Card } from '../ui/card'
import { Button } from '../ui/button'

interface SettingsAppearanceSectionProps {
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
}

export default function SettingsAppearanceSection({
  settings,
  onUpdate
}: SettingsAppearanceSectionProps): React.JSX.Element {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text">Appearance</h3>
        <p className="text-xs text-muted">Choose your preferred visual theme</p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        <Button
          type="button"
          variant={settings.theme === 'light' ? 'default' : 'secondary'}
          onClick={() => onUpdate({ theme: 'light' })}
          className={`h-auto p-3 flex flex-col items-center gap-2 ${
            settings.theme === 'light' ? 'bg-indigo-600/20 border-indigo-500 text-text hover:bg-indigo-600/30' : ''
          }`}
        >
          <Sun className="w-5 h-5 text-amber-500" />
          <span>Light</span>
        </Button>

        <Button
          type="button"
          variant={settings.theme === 'dark' ? 'default' : 'secondary'}
          onClick={() => onUpdate({ theme: 'dark' })}
          className={`h-auto p-3 flex flex-col items-center gap-2 ${
            settings.theme === 'dark' ? 'bg-indigo-600/20 border-indigo-500 text-text hover:bg-indigo-600/30' : ''
          }`}
        >
          <Moon className="w-5 h-5 text-indigo-400" />
          <span>Dark</span>
        </Button>

        <Button
          type="button"
          variant={settings.theme === 'system' ? 'default' : 'secondary'}
          onClick={() => onUpdate({ theme: 'system' })}
          className={`h-auto p-3 flex flex-col items-center gap-2 ${
            settings.theme === 'system' ? 'bg-indigo-600/20 border-indigo-500 text-text hover:bg-indigo-600/30' : ''
          }`}
        >
          <Monitor className="w-5 h-5 text-cyan-400" />
          <span>System</span>
        </Button>
      </div>
    </Card>
  )
}
