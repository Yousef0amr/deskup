import React, { useEffect, useState } from 'react'
import { Download, RefreshCw, RotateCcw } from 'lucide-react'
import type { Settings, UpdateStatus } from '../../../../shared/types'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'

interface SettingsUpdatesSectionProps {
  settings: Settings
  onUpdate: (patch: Partial<Settings>) => void
}

function describe(status: UpdateStatus): string {
  switch (status.state) {
    case 'checking':
      return 'Checking for updates…'
    case 'up-to-date':
      return 'You have the latest version.'
    case 'available':
      return `Version ${status.version} is available.`
    case 'downloading':
      return `Downloading version ${status.version ?? ''}… ${status.percent ?? 0}%`
    case 'downloaded':
      return `Version ${status.version} is ready. Restart Deskup to finish updating.`
    case 'error':
      return `Could not check for updates: ${status.message ?? 'unknown error'}`
    case 'unsupported':
      return status.message ?? 'Updates are only available in the installed app.'
    default:
      return status.message ?? 'Deskup checks for updates automatically.'
  }
}

export default function SettingsUpdatesSection({ settings, onUpdate }: SettingsUpdatesSectionProps): React.JSX.Element {
  const [status, setStatus] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    void window.deskup.updates.getStatus().then(setStatus)
    return window.deskup.updates.onStatus(setStatus)
  }, [])

  const busy = status?.state === 'checking' || status?.state === 'downloading'

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text">Updates</h3>
          <p className="text-xs text-muted">
            Deskup {status?.currentVersion ?? ''} · {status ? describe(status) : 'Loading…'}
          </p>
        </div>
        {status?.state === 'downloaded' ? (
          <Button size="sm" onClick={() => void window.deskup.updates.install()}>
            <RotateCcw className="h-3.5 w-3.5" />
            Restart to update
          </Button>
        ) : status?.state === 'available' ? (
          <Button size="sm" onClick={() => void window.deskup.updates.download()}>
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busy || status?.state === 'unsupported'}
            onClick={() => void window.deskup.updates.check().then(setStatus)}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${status?.state === 'checking' ? 'animate-spin' : ''}`} />
            Check now
          </Button>
        )}
      </div>

      {status?.state === 'downloading' && (
        <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-elevated">
          <div className="h-full bg-indigo-600 transition-[width]" style={{ width: `${status.percent ?? 0}%` }} />
        </div>
      )}

      <div className="flex max-w-md items-center justify-between rounded-xl border border-border/50 bg-elevated/40 p-3">
        <div>
          <div className="text-xs font-medium text-text">Download updates automatically</div>
          <div className="text-[11px] text-muted">Updates install the next time Deskup restarts</div>
        </div>
        <Switch checked={settings.autoUpdate} onCheckedChange={(checked) => onUpdate({ autoUpdate: checked })} />
      </div>
    </Card>
  )
}
