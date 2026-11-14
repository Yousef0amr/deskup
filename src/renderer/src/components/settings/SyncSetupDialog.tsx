import React, { useEffect, useState } from 'react'
import { FolderOpen, Lock, User, Users } from 'lucide-react'
import type { SyncFolderInfo, SyncStatus, WorkspaceKind } from '../../../../shared/types'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { cn } from '../../lib/utils'

export function errorText(err: unknown): string {
  return ((err as Error)?.message ?? String(err)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

interface SyncSetupDialogProps {
  folderPath: string | null
  info: SyncFolderInfo | null
  defaultMemberName: string
  onClose: () => void
  onDone: (status: SyncStatus) => void
}

/**
 * Create a new workspace in a folder (personal or team, optional passphrase) or join the
 * one already there. Everything here is local: Deskup has no accounts or servers.
 */
export default function SyncSetupDialog({ folderPath, info, defaultMemberName, onClose, onDone }: SyncSetupDialogProps): React.JSX.Element {
  const isNew = !info?.exists
  const [kind, setKind] = useState<WorkspaceKind>('personal')
  const [teamName, setTeamName] = useState('')
  const [memberName, setMemberName] = useState(defaultMemberName)
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [shareExisting, setShareExisting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setKind('personal')
    setTeamName('')
    setPassphrase('')
    setConfirm('')
    setError(null)
    setMemberName(defaultMemberName)
    // Joining keeps your existing items private by default; picking "My team" when
    // creating one turns sharing on (see the kind buttons below).
    setShareExisting(false)
  }, [folderPath, info, defaultMemberName])

  const effectiveKind: WorkspaceKind = isNew ? kind : info?.kind ?? 'personal'
  const team = effectiveKind === 'team'
  const needsPassphrase = !isNew && info?.encrypted

  const problem = (): string | null => {
    if (team && !memberName.trim()) return 'Enter your name so teammates know who made changes.'
    if (isNew && team && !teamName.trim()) return 'Give the team a name.'
    if (needsPassphrase && !passphrase) return 'Enter the passphrase for this folder.'
    if (isNew && passphrase && passphrase.length < 8) return 'Use at least 8 characters for the passphrase.'
    if (isNew && passphrase !== confirm) return 'The passphrases do not match.'
    return null
  }

  const submit = async () => {
    const p = problem()
    if (p || !folderPath) return setError(p)
    setBusy(true)
    setError(null)
    try {
      const status = await window.deskup.sync.setup({
        folderPath,
        create: isNew ? { kind, name: team ? teamName : 'My devices' } : undefined,
        passphrase: passphrase || undefined,
        memberName: team ? memberName : undefined,
        shareExisting: team && shareExisting
      })
      onDone(status)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const title = isNew ? 'Set up sync' : info?.kind === 'team' ? `Join ${info.name ?? 'team'}` : 'Join your synced devices'

  return (
    <Dialog open={Boolean(folderPath && info)} onOpenChange={(o) => !o && !busy && onClose()}>
      {/* minmax(0,1fr): long folder paths must truncate instead of widening the dialog */}
      <DialogContent className="max-w-md grid-cols-[minmax(0,1fr)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 truncate text-xs" title={folderPath ?? ''}>
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{folderPath}</span>
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          {isNew ? (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-text">Who is this for?</div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Workspace type">
                {(
                  [
                    ['personal', User, 'Just me', 'Everything syncs between my own PCs.'],
                    ['team', Users, 'My team', 'Share workspaces, boards and whiteboards. Tasks, habits and notes stay private.']
                  ] as const
                ).map(([id, Icon, label, hint]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={kind === id}
                    onClick={() => {
                      setKind(id)
                      setShareExisting(id === 'team')
                    }}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                      kind === id ? 'border-indigo-500 bg-indigo-500/5' : 'border-border/60 hover:bg-elevated/60'
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted" />
                    <span className="text-xs font-medium text-text">{label}</span>
                    <span className="text-[11px] leading-snug text-muted">{hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-elevated/40 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-text">
                {info?.kind === 'team' ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                {info?.kind === 'team' ? `Team “${info.name ?? 'Team'}”` : 'Personal sync'}
                {info?.encrypted && <Lock className="h-3 w-3 text-muted" aria-label="Protected by a passphrase" />}
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {info?.members.length
                  ? `Already here: ${info.members.join(', ')}`
                  : `${info?.deviceCount ?? 0} device${info?.deviceCount === 1 ? '' : 's'} already use this folder`}
                {info?.kind === 'team' && ' · Shares workspaces, boards and whiteboards; your tasks, habits and notes stay private.'}
              </div>
            </div>
          )}

          {isNew && team && (
            <Field label="Team name" htmlFor="sync-team-name">
              <Input id="sync-team-name" value={teamName} maxLength={60} onChange={(e) => setTeamName(e.target.value)} placeholder="Design team" className="h-9 text-xs" autoFocus />
            </Field>
          )}

          {team && (
            <Field label="Your name" htmlFor="sync-member-name" hint="Shown to teammates next to your devices.">
              <Input id="sync-member-name" value={memberName} maxLength={60} onChange={(e) => setMemberName(e.target.value)} placeholder="Alex" className="h-9 text-xs" autoFocus={!isNew} />
            </Field>
          )}

          {needsPassphrase && (
            <Field label="Passphrase" htmlFor="sync-pass" hint="Ask whoever set up this folder.">
              <Input id="sync-pass" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="h-9 text-xs" autoFocus={!team} />
            </Field>
          )}

          {isNew && (
            <div className="space-y-2">
              <Field
                label={team ? 'Passphrase (recommended)' : 'Passphrase (optional)'}
                htmlFor="sync-new-pass"
                hint="Encrypts everything in the folder, so the cloud provider can't read it. Each PC asks once."
              >
                <Input id="sync-new-pass" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="At least 8 characters" className="h-9 text-xs" />
              </Field>
              {passphrase && (
                <Input aria-label="Confirm passphrase" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type it again" className="h-9 text-xs" />
              )}
              {passphrase && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  There is no reset. If everyone forgets it, new PCs can't join (data already on each PC stays there).
                </p>
              )}
            </div>
          )}

          {team && (
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-elevated/40 p-3">
              <span>
                <span className="block text-xs font-medium text-text">Share what's already on this PC</span>
                <span className="block text-[11px] text-muted">Your existing workspaces, boards and whiteboards. Off keeps them private.</span>
              </span>
              <Switch checked={shareExisting} onCheckedChange={setShareExisting} />
            </label>
          )}

          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Setting up…' : isNew ? (team ? 'Create team' : 'Start syncing') : 'Join'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-text">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  )
}
