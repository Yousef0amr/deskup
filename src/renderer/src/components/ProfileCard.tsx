import React, { useState } from 'react'
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Edit2,
  Trash2,
  AppWindow,
  FolderOpen,
  Globe,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import type { Profile, LaunchResult } from '../../../shared/types'

interface ProfileCardProps {
  profile: Profile
  onEdit: (profile: Profile) => void
  onDuplicate: (profile: Profile) => void
  onDelete: (id: string) => void
}

export default function ProfileCard({
  profile,
  onEdit,
  onDuplicate,
  onDelete
}: ProfileCardProps): React.JSX.Element {
  const [isLaunching, setIsLaunching] = useState(false)
  const [results, setResults] = useState<Record<string, LaunchResult>>({})
  const [showItems, setShowItems] = useState(true)

  const handleLaunch = async () => {
    setIsLaunching(true)
    setResults({})

    try {
      const launchResults = await window.deskup.profiles.launch(profile.id)
      const resultMap: Record<string, LaunchResult> = {}
      for (const res of launchResults) {
        resultMap[res.itemId] = res
      }
      setResults(resultMap)
    } catch (err) {
      console.error('Launch failed:', err)
    } finally {
      setIsLaunching(false)
    }
  }

  const hasErrors = Object.values(results).some((r) => !r.ok)
  const allSuccess =
    Object.keys(results).length > 0 && Object.values(results).every((r) => r.ok)

  return (
    <div
      className="bg-surface/80 border border-border rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-border transition-all relative overflow-hidden group"
      style={{
        borderTopColor: profile.color,
        borderTopWidth: 3
      }}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner select-none"
              style={{
                backgroundColor: `${profile.color}20`,
                borderColor: `${profile.color}40`,
                borderWidth: 1
              }}
            >
              {profile.icon}
            </span>
            <div>
              <h3 className="font-semibold text-text text-base leading-tight">
                {profile.name}
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {profile.items.length} {profile.items.length === 1 ? 'item' : 'items'}
                {profile.launchDelayMs > 0 && ` • ${profile.launchDelayMs}ms delay`}
              </p>
            </div>
          </div>

          {/* Quick Action Icons */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onDuplicate(profile)}
              title="Duplicate Profile"
              className="p-1.5 text-muted hover:text-text hover:bg-elevated rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(profile)}
              title="Edit Profile"
              className="p-1.5 text-muted hover:text-text hover:bg-elevated rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(profile.id)}
              title="Delete Profile"
              className="p-1.5 text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status banner if launched */}
        {allSuccess && (
          <div className="mb-3 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Workspace launched successfully!</span>
          </div>
        )}
        {hasErrors && (
          <div className="mb-3 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Some items failed to launch. Check details below.</span>
          </div>
        )}

        {/* Items List */}
        {profile.items.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowItems(!showItems)}
              className="text-[11px] font-medium text-muted hover:text-text flex items-center gap-1 mb-2"
            >
              <span>{showItems ? 'Hide Items' : 'Show Items'}</span>
              {showItems ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showItems && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {profile.items.map((it) => {
                  const res = results[it.id]
                  return (
                    <div
                      key={it.id}
                      className="px-2.5 py-1.5 rounded-lg bg-elevated/60 border border-border text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {it.type === 'app' && (
                          <AppWindow className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        )}
                        {it.type === 'folder' && (
                          <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        {it.type === 'url' && (
                          <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate text-text font-medium">
                          {it.label || it.target}
                        </span>
                      </div>

                      {/* Launch Result Tag */}
                      {res && (
                        <div className="shrink-0 flex items-center gap-1">
                          {res.ok ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Ok
                            </span>
                          ) : (
                            <span
                              className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-0.5 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20"
                              title={res.error}
                            >
                              <AlertCircle className="w-3 h-3" />
                              <span className="max-w-[120px] truncate">{res.error || 'Failed'}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Launch Action */}
      <div className="pt-2">
        <button
          onClick={handleLaunch}
          disabled={isLaunching || profile.items.length === 0}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-elevated disabled:text-muted text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {isLaunching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-text" />
              <span>Launching Workspace...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white text-text" />
              <span>Launch Workspace</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

