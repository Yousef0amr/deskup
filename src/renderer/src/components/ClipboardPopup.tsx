import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Search, Pin, X, CornerDownLeft } from 'lucide-react'
import { clipImageUrl, copyClip } from '../utils/clipboardUtils'
import type { ClipItem } from '../../../shared/types'

export default function ClipboardPopup(): React.JSX.Element {
  const [clips, setClips] = useState<ClipItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const list = await window.deskup.clipboard.list()
        setClips(list)
      } catch (err) {
        console.error('Failed to load popup clips:', err)
      }
    }
    load()

    const unsubscribe = window.deskup.clipboard.onChanged((updated) => {
      setClips(updated)
    })
    return () => unsubscribe()
  }, [])

  // Auto-focus search input whenever window opens
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return clips
    const q = search.toLowerCase()
    return clips.filter((c) => c.text.toLowerCase().includes(q))
  }, [clips, search])

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleSelect = async (item: ClipItem) => {
    await copyClip(item)
    await window.deskup.clipboard.closePopup()
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        window.deskup.clipboard.closePopup()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (filtered.length === 0 ? 0 : Math.min(filtered.length - 1, prev + 1)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(0, prev - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          handleSelect(filtered[selectedIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtered, selectedIndex])

  // Scroll selected item into view
  useEffect(() => {
    const activeEl = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  return (
    <div className="h-screen w-screen bg-background text-text flex flex-col overflow-hidden border border-border rounded-xl select-none shadow-2xl">
      {/* Title & Search bar */}
      <div className="p-3 border-b border-border/80 bg-surface/80 flex items-center gap-2">
        <Search className="w-4 h-4 text-muted shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clippings (Enter to copy, Esc to close)..."
          className="flex-1 bg-transparent border-none text-xs text-text placeholder-muted focus:outline-none"
        />
        <button
          onClick={() => window.deskup.clipboard.closePopup()}
          className="p-1 text-muted hover:text-text rounded-lg hover:bg-elevated transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted text-xs py-10">
            <p>{search ? 'No clippings matched search' : 'No clipboard history yet'}</p>
          </div>
        ) : (
          filtered.map((item, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`p-2.5 rounded-xl cursor-pointer text-xs transition-all flex items-start justify-between gap-2 border ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-text'
                    : 'bg-surface/40 border-border/60 text-text hover:bg-surface'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {item.pinned && (
                      <Pin className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 fill-indigo-400 shrink-0" />
                    )}
                    <span className="text-[10px] text-muted font-mono">
                      #{idx + 1} • {item.image ? `${item.image.width}×${item.image.height}` : `${item.text.length} chars`}
                    </span>
                  </div>
                  {item.image ? (
                    <img src={clipImageUrl(item.id)} alt={item.text} draggable={false} className="max-h-20 max-w-full rounded border border-border object-contain" />
                  ) : (
                    <div className="font-mono text-xs line-clamp-2 leading-relaxed text-text">{item.text}</div>
                  )}
                </div>

                {isSelected && (
                  <div className="shrink-0 flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 font-mono">
                    <span>Enter</span>
                    <CornerDownLeft className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 bg-surface/90 border-t border-border/80 text-[10px] text-muted flex items-center justify-between">
        <span>↑↓ Navigate</span>
        <span>Enter: Copy & Close</span>
        <span>Esc: Dismiss</span>
      </div>
    </div>
  )
}

