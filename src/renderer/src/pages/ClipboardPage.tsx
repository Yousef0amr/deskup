import React, { useState, useEffect, useMemo } from 'react'
import {
  ClipboardList,
  Search,
  Pin,
  Pause,
  Play,
  Globe,
  Code,
  X, Image as ImageIcon } from 'lucide-react'
import type { ClipItem } from '../../../shared/types'
import { detectClipType, ClipCategory, copyClip } from '../utils/clipboardUtils'
import ClipboardItemRow from '../components/ClipboardItemRow'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'

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
    await copyClip(clips.find((c) => c.id === id), text)
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
    else if (category === 'links') result = result.filter((c) => !c.image && detectClipType(c.text) === 'url')
    else if (category === 'code') result = result.filter((c) => !c.image && detectClipType(c.text) === 'code')
    else if (category === 'text') result = result.filter((c) => !c.image && detectClipType(c.text) === 'text')
    else if (category === 'images') result = result.filter((c) => !!c.image)

    if (!search.trim()) return result
    const q = search.toLowerCase()
    return result.filter((c) => c.text.toLowerCase().includes(q))
  }, [clips, category, search])

  const pinnedCount = useMemo(() => clips.filter((c) => c.pinned).length, [clips])
  const linksCount = useMemo(() => clips.filter((c) => detectClipType(c.text) === 'url').length, [clips])
  const codeCount = useMemo(() => clips.filter((c) => detectClipType(c.text) === 'code').length, [clips])
  const imageCount = useMemo(() => clips.filter((c) => !!c.image).length, [clips])

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-xl font-semibold tracking-tight text-text">Clipboard</h2>
            <Badge
              variant={isPaused ? 'warning' : 'success'}
              onClick={handleTogglePause}
              className="cursor-pointer gap-1.5 py-0.5 px-2"
              title={isPaused ? 'Click to resume tracking' : 'Click to pause tracking'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <span>{isPaused ? 'Paused' : 'Recording'}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            Everything you copy, searchable. Click a snippet to copy it again.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTogglePause}
            className="gap-1.5"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-500" /> : <Pause className="w-3.5 h-3.5 text-amber-500" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </Button>

          {clips.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleClear(false)}
              className="hover:text-rose-500 hover:border-rose-500/30"
            >
              Clear Unpinned
            </Button>
          )}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search copied text, URLs, code snippets..."
            className="pl-10 pr-9 h-10"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSearch('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted hover:text-text"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant={category === 'all' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setCategory('all')}
            >
              All ({clips.length})
            </Button>
            <Button
              type="button"
              variant={category === 'pinned' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setCategory('pinned')}
              className={category === 'pinned' ? 'bg-amber-600 hover:bg-amber-500' : 'gap-1'}
            >
              <Pin className="w-3 h-3" />
              <span>Pinned ({pinnedCount})</span>
            </Button>
            <Button
              type="button"
              variant={category === 'links' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setCategory('links')}
              className={category === 'links' ? 'bg-cyan-600 hover:bg-cyan-500' : 'gap-1'}
            >
              <Globe className="w-3 h-3" />
              <span>Links ({linksCount})</span>
            </Button>
            <Button
              type="button"
              variant={category === 'code' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setCategory('code')}
              className="gap-1"
            >
              <Code className="w-3 h-3" />
              <span>Code ({codeCount})</span>
            </Button>
            <Button
              type="button"
              variant={category === 'images' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setCategory('images')}
              className="gap-1"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Images ({imageCount})</span>
            </Button>
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
        <div className="text-center py-20 px-4 border border-dashed border-border/80 rounded-xl bg-surface/30 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
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
