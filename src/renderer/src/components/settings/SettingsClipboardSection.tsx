import React from 'react'
import { ClipboardList, ShieldCheck, Pause, Keyboard, Trash2 } from 'lucide-react'
import type { Settings } from '../../../../shared/types'
import { Card } from '../ui/card'
import { Switch } from '../ui/switch'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

interface SettingsClipboardSectionProps {
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
  onClearClipboard: () => void
}

export default function SettingsClipboardSection({
  settings,
  onUpdate,
  onClearClipboard
}: SettingsClipboardSectionProps): React.JSX.Element {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Clipboard History</span>
          </h3>
          <p className="text-xs text-muted">Remember and search copied text and code</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={settings.clipboard?.enabled ?? true}
            onCheckedChange={(checked) =>
              onUpdate({
                clipboard: {
                  ...settings.clipboard,
                  enabled: checked
                }
              })
            }
          />
        </div>
      </div>

      {/* Security / Privacy notice */}
      <div className="p-3 bg-elevated/50 border border-border/60 rounded-xl flex items-center gap-2.5 text-xs text-text">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Clipboard history is stored locally on this machine and is never sent over any network.</span>
      </div>

      <div className="space-y-4 max-w-md pt-1">
        {/* Pause Toggle */}
        <div className="flex items-center justify-between p-3 bg-elevated/40 border border-border/50 rounded-xl">
          <div className="flex items-center gap-2.5">
            <Pause className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="text-xs font-medium text-text">Pause tracking</div>
              <div className="text-[11px] text-muted">Temporarily stop capturing copied items</div>
            </div>
          </div>
          <Switch
            checked={settings.clipboard?.isPaused ?? false}
            onCheckedChange={(checked) =>
              onUpdate({
                clipboard: {
                  ...settings.clipboard,
                  isPaused: checked
                }
              })
            }
          />
        </div>

        {/* Image capture */}
        <div className="flex items-center justify-between p-3 bg-elevated/40 border border-border/50 rounded-xl">
          <div>
            <div className="text-xs font-medium text-text">Save copied images</div>
            <div className="text-[11px] text-muted">Keep screenshots and copied pictures in history (stored on this device)</div>
          </div>
          <Switch
            checked={settings.clipboard?.captureImages ?? true}
            onCheckedChange={(checked) =>
              onUpdate({
                clipboard: {
                  ...settings.clipboard,
                  captureImages: checked
                }
              })
            }
          />
        </div>

        {/* Max Items */}
        <div className="p-3 bg-elevated/40 border border-border/50 rounded-xl space-y-1.5">
          <label className="text-xs font-medium text-text">Maximum saved items</label>
          <Input
            type="number"
            min="10"
            max="1000"
            step="10"
            value={settings.clipboard?.maxItems ?? 100}
            onChange={(e) =>
              onUpdate({
                clipboard: {
                  ...settings.clipboard,
                  maxItems: Math.max(10, parseInt(e.target.value) || 100)
                }
              })
            }
            className="h-8 font-mono text-xs"
          />
          <p className="text-[10px] text-muted">Pinned items are always protected and never auto-removed.</p>
        </div>

        {/* Popup Hotkey */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Clipboard Popup Shortcut</span>
          </label>
          <Input
            type="text"
            value={settings.clipboard?.hotkey ?? 'CommandOrControl+Shift+V'}
            onChange={(e) =>
              onUpdate({
                clipboard: {
                  ...settings.clipboard,
                  hotkey: e.target.value
                }
              })
            }
            placeholder="CommandOrControl+Shift+V"
            className="h-9 font-mono text-xs"
          />
          <p className="text-[11px] text-muted">
            Default: <code className="text-muted">CommandOrControl+Shift+V</code>
          </p>
        </div>

        {/* Clear Clipboard Button */}
        <div className="pt-1">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onClearClipboard}
            className="gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Clipboard History</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}
