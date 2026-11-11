import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Search, X, AppWindow, FolderOpen, ArrowRight, Loader2 } from 'lucide-react'
import type { InstalledApp } from '../../../shared/types'

interface AppPickerModalProps {
  isOpen: boolean
  onSelect: (app: InstalledApp) => void
  onClose: () => void
  onBrowseCustomFile: () => void
}

export default function AppPickerModal({
  isOpen,
  onSelect,
  onClose,
  onBrowseCustomFile
}: AppPickerModalProps): React.JSX.Element | null {
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    async function load() {
      setIsLoading(true)
      try {
        const list = await window.deskup.apps.list()
        if (isMounted) {
          setApps(list)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Failed to load apps:', err)
        if (isMounted) setIsLoading(false)
      }
    }

    load()
    setSearch('')
    setTimeout(() => inputRef.current?.focus(), 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      isMounted = false
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps
    const q = search.toLowerCase()
    return apps.filter(
      (a) => a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q)
    )
  }, [apps, search])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <AppWindow className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text leading-tight">Select Application</h3>
              <p className="text-xs text-muted">
                Choose an installed desktop application to launch with your workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text hover:bg-elevated rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-border/70 bg-elevated/30">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search installed apps (e.g. Brave, Cursor, VS Code, Discord)..."
              className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl text-xs text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-muted">
            <span>
              {isLoading
                ? 'Scanning installed programs...'
                : `${filteredApps.length} ${filteredApps.length === 1 ? 'application' : 'applications'} found`}
            </span>
            <span className="font-mono text-[10px]">ESC to close</span>
          </div>
        </div>

        {/* App List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 min-h-[240px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-xs">Scanning system applications...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted space-y-3">
              <AppWindow className="w-10 h-10 opacity-30" />
              <div>
                <p className="text-sm font-semibold text-text">No apps matching &quot;{search}&quot;</p>
                <p className="text-xs text-muted mt-1">
                  Try a different name or browse for a custom executable.
                </p>
              </div>
              <button
                type="button"
                onClick={onBrowseCustomFile}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Browse Executable (.exe)</span>
              </button>
            </div>
          ) : (
            filteredApps.map((app) => (
              <button
                key={app.path}
                type="button"
                onClick={() => onSelect(app)}
                className="group w-full flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-elevated/40 hover:bg-elevated hover:border-indigo-500/50 transition-all text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                  <div className="w-9 h-9 rounded-xl bg-surface border border-border/80 flex items-center justify-center text-text font-bold text-xs shrink-0 group-hover:border-indigo-500/40 shadow-sm">
                    {app.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-text truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {app.name}
                    </h4>
                    <p className="text-[10px] text-muted truncate font-mono mt-0.5">
                      {app.path}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-muted group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0">
                  <span className="hidden sm:inline text-[11px]">Select</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-elevated/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onBrowseCustomFile}
            className="text-xs font-medium text-muted hover:text-text flex items-center gap-1.5 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Browse custom executable (.exe, .lnk)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-muted hover:text-text hover:bg-elevated rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

