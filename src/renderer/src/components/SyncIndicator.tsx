import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Cloud, CloudOff, Lock, RefreshCw, Settings2, ShieldCheck, User, Users } from 'lucide-react'
import type { SyncMode, SyncStatus } from '../../../shared/types'
import { cn } from '../lib/utils'

export function timeAgo(ms: number | undefined, nowMs: number): string {
  if (!ms) return 'never'
  const s = Math.max(0, Math.round((nowMs - ms) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function describeSync(status: SyncStatus, nowMs: number): { label: string; detail: string; tone: 'ok' | 'muted' | 'warn' | 'error' } {
  switch (status.state) {
    case 'local':
      return { label: 'Local only', detail: 'All data stays on this device', tone: 'ok' }
    case 'syncing':
      return { label: 'Syncing…', detail: 'Merging changes with the sync folder', tone: 'muted' }
    case 'idle':
      return {
        label: `Synced ${timeAgo(status.lastSyncAt, nowMs)}`,
        detail: `Folder: ${status.folderPath?.split(/[\\/]/).filter(Boolean).pop() ?? ''}`,
        tone: 'ok'
      }
    case 'offline':
      return {
        label: status.pending ? `Offline · ${status.pending} waiting` : 'Offline',
        detail: 'Changes are kept on this device until you go online',
        tone: 'muted'
      }
    case 'waiting':
      return { label: 'Waiting for folder', detail: status.error ?? 'The sync folder is not reachable right now', tone: 'warn' }
    case 'error':
      return { label: 'Sync error', detail: status.error ?? 'Sync failed', tone: 'error' }
    case 'locked':
      return { label: 'Sync locked', detail: 'Enter the passphrase in Settings to unlock sync on this PC', tone: 'warn' }
  }
}

const MODES: { id: SyncMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Sync whenever the folder is reachable' },
  { id: 'online', label: 'Online', hint: 'Always sync; report every problem' },
  { id: 'offline', label: 'Offline', hint: 'Work locally; sync later' }
]

export function useSyncStatus(): SyncStatus | null {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  useEffect(() => {
    void window.deskup.sync.getStatus().then(setStatus)
    return window.deskup.sync.onStatus(setStatus)
  }, [])
  return status
}

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function SyncStatusIcon({ status, className }: { status: SyncStatus; className?: string }): React.JSX.Element {
  const cls = cn('h-3.5 w-3.5 shrink-0', className)
  switch (status.state) {
    case 'local':
      return <ShieldCheck className={cn(cls, 'text-emerald-600 dark:text-emerald-400')} />
    case 'syncing':
      return <RefreshCw className={cn(cls, 'animate-spin text-muted')} />
    case 'idle':
      return <Cloud className={cn(cls, 'text-emerald-600 dark:text-emerald-400')} />
    case 'offline':
      return <CloudOff className={cn(cls, 'text-muted')} />
    case 'waiting':
      return <CloudOff className={cn(cls, 'text-amber-600 dark:text-amber-400')} />
    case 'error':
      return <AlertTriangle className={cn(cls, 'text-rose-600 dark:text-rose-400')} />
    case 'locked':
      return <Lock className={cn(cls, 'text-amber-600 dark:text-amber-400')} />
  }
}

/** Sidebar footer: sync state at a glance, with quick mode switching. */
export default function SyncIndicator({
  collapsed,
  onOpenSettings
}: {
  collapsed: boolean
  onOpenSettings: () => void
}): React.JSX.Element {
  const status = useSyncStatus()
  const now = useNow()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  if (!status) return <div className="h-6" />
  const info = describeSync(status, now)
  const isFolder = status.provider === 'folder'

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`${info.label} — ${info.detail}`}
        aria-label={`Sync: ${info.label}`}
        aria-expanded={open}
        className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-muted transition-colors hover:bg-elevated hover:text-text"
      >
        <SyncStatusIcon status={status} />
        {!collapsed && <span className="truncate">{info.label}</span>}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-border bg-surface p-2 text-xs shadow-lg">
          <div className="flex items-start gap-2 px-1.5 pb-2 pt-1">
            <SyncStatusIcon status={status} className="mt-0.5" />
            <div className="min-w-0">
              <div className="font-medium text-text">{info.label}</div>
              <div className="break-words text-[11px] text-muted" title={status.folderPath}>
                {info.detail}
              </div>
              {isFolder && <WorkspaceLine status={status} />}
            </div>
          </div>

          {isFolder && (
            <>
              <div className="mx-1.5 mb-1 mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">Network mode</div>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void window.deskup.sync.setMode(m.id)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-elevated"
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center">
                    {status.mode === m.id && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-text">{m.label}</span>
                    <span className="block text-[11px] text-muted">{m.hint}</span>
                  </span>
                </button>
              ))}
              <div className="my-1.5 h-px bg-border" />
              <button
                type="button"
                disabled={status.mode === 'offline' || status.state === 'syncing'}
                onClick={() => void window.deskup.sync.syncNow()}
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-text hover:bg-elevated disabled:opacity-40"
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted" />
                Sync now
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onOpenSettings()
            }}
            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-text hover:bg-elevated"
          >
            <Settings2 className="h-3.5 w-3.5 text-muted" />
            {isFolder ? 'Sync settings…' : 'Set up sync…'}
          </button>
        </div>
      )}
    </div>
  )
}

/** "Acme · 3 members [lock]" for a team, "My devices · 2 devices" for personal sync. */
export function WorkspaceLine({ status }: { status: SyncStatus }): React.JSX.Element {
  const team = status.workspaceKind === 'team'
  const count = team ? status.members.length : status.members.reduce((n, m) => n + m.devices.length, 0)
  const unit = team ? (count === 1 ? 'member' : 'members') : count === 1 ? 'device' : 'devices'
  const Icon = team ? Users : User
  return (
    <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">
        {status.workspaceName ?? (team ? 'Team' : 'My devices')}
        {count > 0 && ` · ${count} ${unit}`}
      </span>
      {status.encrypted && <Lock className="h-3 w-3 shrink-0" aria-label="Encrypted" />}
    </div>
  )
}
