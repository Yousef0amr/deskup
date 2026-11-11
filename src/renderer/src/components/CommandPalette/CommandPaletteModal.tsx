import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Search, X, Command, Sparkles } from 'lucide-react'
import type { Profile, NoteItem, ClipItem, FocusState, AppTab } from '../../../../shared/types'
import { buildCommandList } from '../../utils/commandPaletteUtils'
import CommandPaletteItem from './CommandPaletteItem'

interface CommandPaletteModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (tab: AppTab) => void
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
}

export default function CommandPaletteModal({
  isOpen,
  onClose,
  onNavigate,
  onThemeChange
}: CommandPaletteModalProps): React.JSX.Element | null {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [clips, setClips] = useState<ClipItem[]>([])
  const [focusState, setFocusState] = useState<FocusState | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelectedIndex(0)
      return
    }

    async function loadData() {
      try {
        const [p, n, c, f] = await Promise.all([
          window.deskup.profiles.list().catch(() => []),
          window.deskup.notes.list().catch(() => []),
          window.deskup.clipboard.list().catch(() => []),
          window.deskup.focus.get().catch(() => null)
        ])
        setProfiles(p)
        setNotes(n)
        setClips(c)
        setFocusState(f)
      } catch {
        // Fallback
      }
    }
    void loadData()

    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }, [isOpen])

  const commands = useMemo(() => {
    return buildCommandList(query, {
      profiles,
      notes,
      clips,
      focusState,
      onNavigate: (tab) => {
        onNavigate(tab)
        onClose()
      },
      onOpenNote: () => {
        onNavigate('notes')
        onClose()
      },
      onLaunchProfile: (id) => {
        void window.deskup.profiles.launch(id)
        onClose()
      },
      onFocusAction: (action) => {
        void window.deskup.focus.action(action)
        onClose()
      },
      onThemeChange: (theme) => {
        onThemeChange(theme)
        onClose()
      },
      onCopyClip: (text) => {
        void navigator.clipboard.writeText(text)
        onClose()
      },
      onCreateNote: () => {
        void window.deskup.notes.create('Untitled Note', '')
        onNavigate('notes')
        onClose()
      }
    })
  }, [query, profiles, notes, clips, focusState, onNavigate, onThemeChange, onClose])

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1 < commands.length ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : commands.length - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (commands[selectedIndex]) {
          void commands[selectedIndex].action()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, commands, selectedIndex, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] z-10 animate-scale-up">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/80 bg-elevated/40">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspaces, notes, clipboard, actions, or themes..."
            className="flex-1 bg-transparent border-none text-sm text-text placeholder-muted focus:outline-none focus:ring-0"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-muted hover:text-text hover:bg-elevated"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="flex items-center gap-0.5 text-[10px] font-mono text-muted bg-elevated px-2 py-0.5 rounded border border-border/60">
              <Command className="w-3 h-3" />
              <span>K</span>
            </span>
          )}
        </div>

        {/* Command Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[380px]">
          {commands.length === 0 ? (
            <div className="text-center py-12 text-muted text-xs space-y-1.5">
              <Sparkles className="w-6 h-6 text-indigo-500/40 mx-auto" />
              <p className="font-semibold text-text">No matching commands</p>
              <p className="text-[11px]">Try searching for &quot;work&quot;, &quot;timer&quot;, &quot;dark&quot;, or a note title.</p>
            </div>
          ) : (
            commands.map((cmd, idx) => (
              <CommandPaletteItem
                key={cmd.id}
                command={cmd}
                isSelected={idx === selectedIndex}
                onSelect={() => void cmd.action()}
              />
            ))
          )}
        </div>

        {/* Footer Keyboard Hints */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/80 bg-elevated/30 text-[11px] text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-[10px] font-mono">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-[10px] font-mono">↵</kbd>
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-[10px] font-mono">esc</kbd>
              <span>Close</span>
            </span>
          </div>

          <span>{commands.length} commands</span>
        </div>
      </div>
    </div>
  )
}
