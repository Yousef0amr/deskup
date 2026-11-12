import React, { useState } from 'react'
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Pencil,
  Trash2,
  AppWindow,
  FolderOpen,
  Globe,
  Loader2
} from 'lucide-react'
import type { Profile, LaunchResult, ItemType } from '../../../shared/types'
import { Button } from './ui/button'
import { useToast } from './ui/toast'
import { cn } from '../lib/utils'

interface ProfileCardProps {
  profile: Profile
  onEdit: (profile: Profile) => void
  onDuplicate: (profile: Profile) => void
  onDelete: (id: string) => void
}

const ITEM_ICON: Record<ItemType, React.ComponentType<{ className?: string }>> = {
  app: AppWindow,
  folder: FolderOpen,
  url: Globe
}
const MAX_PREVIEW = 4

export default function ProfileCard({
  profile,
  onEdit,
  onDuplicate,
  onDelete
}: ProfileCardProps): React.JSX.Element {
  const [isLaunching, setIsLaunching] = useState(false)
  const [results, setResults] = useState<Record<string, LaunchResult>>({})
  const [expanded, setExpanded] = useState(false)
  const toast = useToast()

  const handleLaunch = async () => {
    setIsLaunching(true)
    setResults({})
    try {
      const launchResults = await window.deskup.profiles.launch(profile.id)
      setResults(Object.fromEntries(launchResults.map((r) => [r.itemId, r])))
      const failed = launchResults.filter((r) => !r.ok).length
      if (failed) toast(`${failed} of ${launchResults.length} items in “${profile.name}” didn't open`, 'error')
      else toast(`${profile.icon} “${profile.name}” is open`, 'success')
    } catch (err) {
      toast('Launch failed: ' + (err as Error).message, 'error')
    } finally {
      setIsLaunching(false)
    }
  }

  const visibleItems = expanded ? profile.items : profile.items.slice(0, MAX_PREVIEW)
  const hidden = profile.items.length - visibleItems.length

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-hover">
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-lg text-xl"
          style={{ backgroundColor: `${profile.color}1f` }}
          aria-hidden
        >
          {profile.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold text-text" title={profile.name}>
            {profile.name}
          </h3>
          <p className="text-xs text-muted">
            {profile.items.length} {profile.items.length === 1 ? 'item' : 'items'}
            {profile.launchDelayMs > 0 && ` · ${profile.launchDelayMs} ms apart`}
          </p>
        </div>
        <div className="-mr-1 -mt-1 flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(profile)} title="Edit" aria-label={`Edit ${profile.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(profile)} title="Duplicate" aria-label={`Duplicate ${profile.name}`}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:bg-rose-500/10 hover:text-rose-500" onClick={() => onDelete(profile.id)} title="Delete" aria-label={`Delete ${profile.name}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Items */}
      {profile.items.length === 0 ? (
        <button
          type="button"
          onClick={() => onEdit(profile)}
          className="mb-3 rounded-lg border border-dashed border-border py-4 text-xs text-muted transition-colors hover:border-hover hover:text-text"
        >
          Add apps, folders or links
        </button>
      ) : (
        <ul className="mb-3 space-y-0.5">
          {visibleItems.map((it) => {
            const res = results[it.id]
            const Icon = ITEM_ICON[it.type]
            return (
              <li key={it.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs" title={it.target}>
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-text">{it.label || it.target}</span>
                {res &&
                  (res.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="Opened" />
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400" title={res.error}>
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="max-w-[110px] truncate">{res.error || 'Failed'}</span>
                    </span>
                  ))}
              </li>
            )
          })}
          {(hidden > 0 || expanded) && profile.items.length > MAX_PREVIEW && (
            <li>
              <button type="button" onClick={() => setExpanded(!expanded)} className="px-1.5 py-1 text-[11px] font-medium text-muted hover:text-text">
                {expanded ? 'Show less' : `+${hidden} more`}
              </button>
            </li>
          )}
        </ul>
      )}

      {/* Launch */}
      <Button
        type="button"
        variant="secondary"
        onClick={handleLaunch}
        disabled={isLaunching || profile.items.length === 0}
        className={cn('mt-auto w-full', !isLaunching && 'hover:bg-indigo-600 hover:text-white')}
      >
        {isLaunching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
        {isLaunching ? 'Opening…' : 'Launch'}
      </Button>
    </article>
  )
}
