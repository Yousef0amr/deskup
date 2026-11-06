import React, { useState, useEffect, useMemo } from 'react'
import {
  ClipboardList,
  Search,
  Pin,
  Trash2,
  Copy,
  Check,
  Pause,
  Play,
  Clock
} from 'lucide-react'
import type { ClipItem } from '../../../shared/types'

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}d ago`
}

export default function ClipboardPage(): React.JSX.Element {
  const [clips, setClips] = useState<ClipItem[]>([])
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [loadedClips, settings] = await Promise.all([
          window.deskup.clipboard.list(),
          window.deskup.settings.get()
        ])
        setClips(loadedClips)
        setIsPaused(Boolean(settings.clipboard?.isPaused))
      } catch (err) {
        console.error('Failed to load clipboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()

    // Listen for live updates
    const unsubscribe = window.deskup.clipboard.onChanged((updated) => {
      setClips(updated)
    })
    return () => unsubscribe()
  }, [])

  const handleCopy = async (id: string, text: string) => {
    await window.deskup.clipboard.copy(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleTogglePin = async (id: string) => {
    await window.deskup.clipboard.pin(id)
  }

  const handleDelete = async (id: string) => {
    await window.deskup.clipboard.delete(id)
  }

  const handleTogglePause = async () => {
    const paused = await window.deskup.clipboard.togglePause()
    setIsPaused(paused)
  }

  const handleClear = async (includePinned = false) => {
    const msg = includePinned
      ? 'Clear ALL clipboard history, including pinned items?'
      : 'Clear all unpinned clipboard items?'
    if (confirm(msg)) {
      await window.deskup.clipboard.clear(includePinned)
    }
  }

  const filteredClips = useMemo(() => {
    if (!search.trim()) return clips
    const q = search.toLowerCase()
    return clips.filter((c) => c.text.toLowerCase().includes(q))
  }, [clips, search])

  const pinnedCount = clips.filter((c) => c.pinned).length

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-text">Clipboard History</h2>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 ${
                isPaused
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              {isPaused ? 'Tracking Paused' : 'Live Tracking'}
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Search, pin, and re-copy previously copied snippets. All data is kept strictly on your machine.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTogglePause}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl border flex items-center gap-1.5 transition-colors ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                : 'bg-elevated hover:bg-hover text-text border-border'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
            <span>{isPaused ? 'Resume Tracking' : 'Pause Tracking'}</span>
          </button>

          {clips.length > 0 && (
            <button
              onClick={() => handleClear(false)}
              className="px-3 py-1.5 bg-elevated hover:bg-rose-500/20 text-text hover:text-rose-300 border border-border hover:border-rose-500/30 text-xs font-medium rounded-xl transition-colors"
            >
              Clear Unpinned
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search copied text, URLs, code snippets..."
          className="w-full pl-10 pr-4 py-2.5 bg-surface/80 border border-border rounded-xl text-text placeholder-muted text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-muted hover:text-text absolute right-3 top-1/2 -translate-y-1/2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Quick stats ribbon */}
      <div className="flex items-center justify-between text-xs text-muted px-1">
        <span>
          Showing {filteredClips.length} {filteredClips.length === 1 ? 'item' : 'items'}
          {pinnedCount > 0 && ` (${pinnedCount} pinned)`}
        </span>
        <span className="text-[11px] font-mono text-muted">
          Press <kbd className="bg-elevated px-1 py-0.5 rounded text-muted">Ctrl+Shift+V</kbd> anywhere for popup
        </span>
      </div>

      {/* Clips List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted text-xs">Loading clipboard history...</div>
      ) : filteredClips.length === 0 ? (
        <div className="text-center py-16 px-4 border-2 border-dashed border-border rounded-3xl bg-surface/30 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-text">
            {search ? 'No Matching Clippings' : 'No Clipboard History Yet'}
          </h3>
          <p className="text-xs text-muted mt-1 max-w-sm">
            {search
              ? 'Try searching with a different keyword.'
              : 'Copy any text, code, or links from any application and they will automatically appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredClips.map((clip) => {
            const isCopied = copiedId === clip.id
            return (
              <div
                key={clip.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 group ${
                  clip.pinned
                    ? 'bg-surface/90 border-indigo-500/40 shadow-sm shadow-indigo-500/5'
                    : 'bg-surface/60 border-border hover:border-border'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    {clip.pinned && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5 fill-indigo-400" />
                        <span>Pinned</span>
                      </span>
                    )}
                    <span className="text-[11px] text-muted flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-muted" />
                      {formatTimeAgo(clip.createdAt)}
                    </span>
                    <span className="text-[10px] text-muted">
                      • {clip.text.length} chars
                    </span>
                  </div>

                  <pre className="text-xs text-text font-mono whitespace-pre-wrap break-all leading-relaxed max-h-24 overflow-y-auto bg-background/40 p-2.5 rounded-xl border border-border/80 select-text">
                    {clip.text}
                  </pre>
                </div>

                {/* Item Actions */}
                <div className="flex items-center gap-1 self-end sm:self-start shrink-0">
                  <button
                    onClick={() => handleCopy(clip.id, clip.text)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => handleTogglePin(clip.id)}
                    title={clip.pinned ? 'Unpin item' : 'Pin item (prevents auto-removal)'}
                    className={`p-2 rounded-xl transition-colors ${
                      clip.pinned
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
                        : 'text-muted hover:text-text hover:bg-elevated'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${clip.pinned ? 'fill-indigo-400' : ''}`} />
                  </button>

                  <button
                    onClick={() => handleDelete(clip.id)}
                    title="Delete item"
                    className="p-2 text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

