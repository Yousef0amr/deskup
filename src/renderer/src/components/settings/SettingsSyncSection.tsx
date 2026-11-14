import React, { useEffect, useState } from 'react'
import { FolderSync, HardDrive, Lock, LogOut, RefreshCw } from 'lucide-react'
import type { SyncFolderInfo, SyncMode } from '../../../../shared/types'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useToast } from '../ui/toast'
import { cn } from '../../lib/utils'
import { SyncStatusIcon, WorkspaceLine, describeSync, useNow, useSyncStatus } from '../SyncIndicator'
import SyncSetupDialog, { errorText } from './SyncSetupDialog'

const MODES: { id: SyncMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Sync whenever the folder is reachable; wait quietly when it is not.' },
  { id: 'online', label: 'Online', hint: 'Always sync and report every problem right away.' },
  { id: 'offline', label: 'Offline', hint: 'Never touch the folder. Changes wait on this device until you go back online.' }
]

export default function SettingsSyncSection(): React.JSX.Element {
  const status = useSyncStatus()
  const now = useNow(15_000)
  const toast = useToast()
  const [deviceName, setDeviceName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [pending, setPending] = useState<{ folder: string; info: SyncFolderInfo } | null>(null)
  const [unlockPass, setUnlockPass] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void window.deskup.sync.getConfig().then((c) => {
      setDeviceName(c.deviceName)
      setMemberName(c.memberName)
    })
  }, [status?.provider])

  if (!status) return <Card className="h-48 p-6" />

  const isFolder = status.provider === 'folder'
  const team = status.workspaceKind === 'team'
  const info = describeSync(status, now)

  const pickFolder = async () => {
    const folder = await window.deskup.sync.chooseFolder()
    if (!folder) return
    try {
      setPending({ folder, info: await window.deskup.sync.inspectFolder(folder) })
    } catch (err) {
      toast(`Could not open that folder: ${errorText(err)}`, 'error')
    }
  }

  const leave = async () => {
    await window.deskup.sync.useLocal()
    toast(team ? `Left ${status.workspaceName}. Everything stays on this PC.` : 'Sync turned off. Your data stays on this PC.')
  }

  const unlock = async () => {
    setBusy(true)
    try {
      await window.deskup.sync.unlock(unlockPass)
      setUnlockPass('')
      toast('Sync unlocked')
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const saveName = async (kind: 'device' | 'member') => {
    try {
      if (kind === 'device' && deviceName.trim()) await window.deskup.sync.setDeviceName(deviceName)
      if (kind === 'member' && memberName.trim()) await window.deskup.sync.setMemberName(memberName)
    } catch (err) {
      toast(errorText(err), 'error')
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <div>
        <h3 className="text-sm font-semibold text-text">Sync &amp; storage</h3>
        <p className="text-xs text-muted">
          Deskup has no accounts and never stores your data on its own servers. Keep it on this PC, or sync through a
          folder you choose — OneDrive, Dropbox, Google Drive, a NAS or a network share — across your PCs or with a team.
        </p>
      </div>

      {/* Where data lives */}
      <div className="grid max-w-xl gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => isFolder && void leave()}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
            !isFolder ? 'border-indigo-500 bg-indigo-500/5' : 'border-border/60 hover:bg-elevated/60'
          )}
        >
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <span>
            <span className="block text-xs font-medium text-text">This PC only</span>
            <span className="block text-[11px] text-muted">Nothing leaves this PC.</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => void pickFolder()}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
            isFolder ? 'border-indigo-500 bg-indigo-500/5' : 'border-border/60 hover:bg-elevated/60'
          )}
        >
          <FolderSync className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-text">Sync through a folder</span>
            <span className="block truncate text-[11px] text-muted" title={status.folderPath}>
              {isFolder ? status.folderPath : 'Just me on several PCs, or a team.'}
            </span>
          </span>
        </button>
      </div>

      {isFolder && (
        <>
          {/* Locked: this PC has no key for an encrypted folder */}
          {status.state === 'locked' && (
            <form
              className="flex max-w-xl flex-wrap items-end gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
              onSubmit={(e) => {
                e.preventDefault()
                void unlock()
              }}
            >
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <label htmlFor="sync-unlock" className="flex items-center gap-1.5 text-xs font-medium text-text">
                  <Lock className="h-3.5 w-3.5" /> Enter the passphrase to unlock sync on this PC
                </label>
                <Input id="sync-unlock" type="password" value={unlockPass} onChange={(e) => setUnlockPass(e.target.value)} className="h-9 text-xs" />
              </div>
              <Button type="submit" size="sm" disabled={busy || !unlockPass}>
                Unlock
              </Button>
            </form>
          )}

          {/* Workspace + status */}
          <div className="max-w-xl space-y-3 rounded-xl border border-border/50 bg-elevated/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <SyncStatusIcon status={status} className="mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-text">{info.label}</div>
                  <WorkspaceLine status={status} />
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => void leave()} title={team ? 'Leave the team' : 'Stop syncing'}>
                  <LogOut className="h-3.5 w-3.5" />
                  {team ? 'Leave' : 'Stop'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={status.mode === 'offline' || status.state === 'syncing' || status.state === 'locked'}
                  onClick={() => void window.deskup.sync.syncNow()}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', status.state === 'syncing' && 'animate-spin')} />
                  Sync now
                </Button>
              </div>
            </div>

            {status.error && status.state !== 'locked' && <p className="text-[11px] text-amber-600 dark:text-amber-400">{status.error}</p>}

            {status.members.length > 0 && (
              <ul className="space-y-1 border-t border-border/50 pt-2.5">
                {status.members.map((m) => (
                  <li key={m.name} className="flex items-baseline justify-between gap-3 text-[11px]">
                    <span className="font-medium text-text">
                      {m.name}
                      {team && m.you && <span className="font-normal text-muted"> (you)</span>}
                    </span>
                    <span className="truncate text-muted">{m.devices.join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
            {status.state === 'idle' && status.members.length <= 1 && (
              <p className="text-[11px] text-muted">
                {team
                  ? 'Share this folder with teammates (e.g. a shared OneDrive or Dropbox folder), then they choose it in Deskup.'
                  : 'Choose the same folder in Deskup on your other PCs.'}
              </p>
            )}
          </div>

          {/* Network mode */}
          <div className="max-w-xl space-y-1.5">
            <div className="text-xs font-medium text-text">Network mode</div>
            <div className="inline-flex rounded-lg border border-border/60 bg-elevated/40 p-0.5" role="radiogroup" aria-label="Network mode">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={status.mode === m.id}
                  onClick={() => void window.deskup.sync.setMode(m.id)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs transition-colors',
                    status.mode === m.id ? 'bg-surface font-medium text-text shadow-sm' : 'text-muted hover:text-text'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted">{MODES.find((m) => m.id === status.mode)?.hint}</p>
          </div>

          {/* Names */}
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            {team && (
              <NameField
                id="sync-member"
                label="Your name"
                hint="Shown to your teammates."
                value={memberName}
                onChange={setMemberName}
                onSave={() => void saveName('member')}
              />
            )}
            <NameField
              id="sync-device"
              label="This PC's name"
              hint={team ? 'Helps you tell your own PCs apart.' : 'Shown on your other PCs.'}
              value={deviceName}
              onChange={setDeviceName}
              onSave={() => void saveName('device')}
            />
          </div>
        </>
      )}

      <p className="max-w-xl text-[11px] text-muted">
        {isFolder && team
          ? 'Shared with the team: workspaces, boards and whiteboards. Private to you: tasks, habits, notes, focus history, settings, clipboard and music.'
          : 'Synced between your PCs: workspaces, tasks, habits, boards, whiteboards, notes and focus history. Settings, clipboard history and music stay on each PC.'}
      </p>

      <SyncSetupDialog
        folderPath={pending?.folder ?? null}
        info={pending?.info ?? null}
        defaultMemberName={memberName}
        onClose={() => setPending(null)}
        onDone={(s) => {
          setPending(null)
          if (s.state === 'error' || s.state === 'waiting') toast(`Set up, but syncing failed: ${s.error}`, 'error')
          else toast(s.workspaceKind === 'team' ? `You're in ${s.workspaceName}` : 'Sync is on')
        }}
      />
    </Card>
  )
}

function NameField(props: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void; onSave: () => void }): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <label htmlFor={props.id} className="text-xs font-medium text-text">
        {props.label}
      </label>
      <Input
        id={props.id}
        value={props.value}
        maxLength={60}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onSave}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="h-9 text-xs"
      />
      <p className="text-[11px] text-muted">{props.hint}</p>
    </div>
  )
}
