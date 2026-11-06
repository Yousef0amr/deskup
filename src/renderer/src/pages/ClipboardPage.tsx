import React, { useState, useEffect, useMemo } from 'react'
import {
  ClipboardList,
  Search,
  Pin,
  Pause,
  Play,
  Globe,
  Code,
  X
} from 'lucide-react'
import type { ClipItem } from '../../../shared/types'
import { detectClipType, ClipCategory } from '../utils/clipboardUtils'
import ClipboardItemRow from '../components/ClipboardItemRow'

export default function ClipboardPage(): React.JSX.Element {
  const [clips, setClips] = useState<ClipItem[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ClipCategory>('all')
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

    const unsubscribe = window.deskup.clipboard.onChanged(setClips)
    return () => unsubscribe()
  }, [])

  const handleCopy = async (id: string, text: string) => {
    await window.deskup.clipboard.copy(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleTogglePin = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await window.deskup.clipboard.pin(id)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await window.deskup.clipboard.delete(id)
  }

  const handleTogglePause = async () => {
    setIsPaused(await window.deskup.clipboard.togglePause())
  }

  const handleClear = async (includePinned = false) => {
    const msg = includePinned ? 'Clear ALL clipboard history, including pinned items?' : 'Clear all unpinned clipboard items?'
    if (confirm(msg)) await window.deskup.clipboard.clear(includePinned)
  }

  const filteredClips = useMemo(() => {
    let result = clips
    if (category === 'pinned') result = result.filter((c) => c.pinned)
    else if (category === 'links') result = result.filter((c) => detectClipType(c.text) === 'url')
    else if (category === 'code') result = result.filter((c) => detectClipType(c.text) === 'code')
    else if (category === 'text') result = result.filter((c) => detectClipType(c.text) === 'text')

    if (!search.trim()) return result
    const q = search.toLowerCase()
    return result.filter((c) => c.text.toLowerCase().includes(q))
  }, [clips, category, search])

  const pinnedCount = useMemo(() => clips.filter((c) => c.pinned).length, [clips])
  const linksCount = useMemo(() => clips.filter((c) => detectClipType(c.text) === 'url').length, [clips])
  const codeCount = useMemo(() => clips.filter((c) => detectClipType(c.text) === 'code').length, [clips])

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-text">Clipboard History</h2>
            <button
              type="button"
              onClick={handleTogglePause}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                isPaused
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
              }`}
              title={isPaused ? 'Click to resume tracking' : 'Click to pause tracking'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <span>{isPaused ? 'Tracking Paused' : 'Live Tracking'}</span>
            </button>
          </div>
          <p className="text-xs text-muted mt-1">
            Click any snippet to copy it. Automatically captures copied text, links, and code snippets.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTogglePause}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-elevated/70 hover:bg-hover text-text flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-500" /> : <Pause className="w-3.5 h-3.5 text-amber-500" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {clips.length > 0 && (
            <button
              type="button"
              onClick={() => handleClear(false)}
              className="px-3 py-1.5 bg-elevated/70 hover:bg-rose-500/10 text-muted hover:text-rose-500 border border-border/80 hover:border-rose-500/30 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              Clear Unpinned
            </button>
          )}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search copied text, URLs, code snippets..."
            className="w-full pl-10 pr-9 py-2.5 bg-surface/80 border border-border rounded-xl text-text placeholder-muted text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="p-1 text-muted hover:text-text absolute right-3 top-1/2 -translate-y-1/2 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                category === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-elevated/60 text-muted hover:text-text border border-border/40'
              }`}
            >
              All ({clips.length})
            </button>
            <button
              type="button"
              onClick={() => setCategory('pinned')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                category === 'pinned'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-elevated/60 text-muted hover:text-text border border-border/40'
              }`}
            >
              <Pin className="w-3 h-3" />
              <span>Pinned ({pinnedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setCategory('links')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                category === 'links'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-elevated/60 text-muted hover:text-text border border-border/40'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Links ({linksCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setCategory('code')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                category === 'code'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-elevated/60 text-muted hover:text-text border border-border/40'
              }`}
            >
              <Code className="w-3 h-3" />
              <span>Code ({codeCount})</span>
            </button>
          </div>

          <span className="text-[11px] text-muted hidden sm:inline font-mono">
            Press <kbd className="bg-elevated px-1.5 py-0.5 rounded border border-border/60">Ctrl+Shift+V</kbd> for popup
          </span>
        </div>
      </div>

      {/* Clips List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted text-xs">Loading clipboard history...</div>
      ) : filteredClips.length === 0 ? (
        <div className="text-center py-20 px-4 border border-dashed border-border/80 rounded-2xl bg-surface/30 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-text">
            {search ? `No clippings matching "${search}"` : 'No Clippings in this category'}
          </h3>
          <p className="text-xs text-muted mt-1 max-w-sm">
            {search
              ? 'Try searching with a different term or clearing the filter.'
              : 'Items you copy with Ctrl+C will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClips.map((clip) => (
            <ClipboardItemRow
              key={clip.id}
              clip={clip}
              isCopied={copiedId === clip.id}
              onCopy={handleCopy}
              onTogglePin={handleTogglePin}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
