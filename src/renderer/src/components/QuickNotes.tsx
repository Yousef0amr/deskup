import React, { useState, useEffect, useRef } from 'react'
import {
  StickyNote,
  Check,
  Trash2,
  Copy,
  Plus,
  ExternalLink,
} from 'lucide-react'
import type { NoteItem } from '../../../shared/types'
import QuickNotesDropdown from './QuickNotesDropdown'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

interface QuickNotesProps {
  onNavigateToNotes?: () => void
}

export default function QuickNotes({ onNavigateToNotes }: QuickNotesProps): React.JSX.Element {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const list = await window.deskup.notes.list()
        setNotes(list)
        if (list.length > 0) setActiveNoteId(list[0].id)
      } catch (err) {
        setSaveStatus('error')
        console.error('Failed to load notes list:', err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0]

  const persistNote = async (updatedNote: NoteItem) => {
    setSaveStatus('saving')
    try {
      await window.deskup.notes.saveNote(updatedNote)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeNote) return
    const updated = { ...activeNote, content: e.target.value, updatedAt: Date.now() }
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))

    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => void persistNote(updated), 400)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeNote) return
    const updated = { ...activeNote, title: e.target.value, updatedAt: Date.now() }
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))

    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => void persistNote(updated), 400)
  }

  const handleCreateNew = async () => {
    try {
      const newNote = await window.deskup.notes.create('Untitled Note', '')
      setNotes((prev) => [newNote, ...prev])
      setActiveNoteId(newNote.id)
      setIsDropdownOpen(false)
    } catch (err) {
      console.error('Failed to create note:', err)
    }
  }

  const handleDelete = async () => {
    if (!activeNote) return
    if (confirm(`Delete note "${activeNote.title || 'Untitled'}"?`)) {
      try {
        await window.deskup.notes.delete(activeNote.id)
        const updatedList = await window.deskup.notes.list()
        setNotes(updatedList)
        setActiveNoteId(updatedList[0]?.id || null)
      } catch (err) {
        console.error('Failed to delete note:', err)
      }
    }
  }

  const handleCopyAll = async () => {
    if (!activeNote?.content) return
    try {
      await navigator.clipboard.writeText(activeNote.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback
    }
  }

  const wordCount = activeNote?.content.trim() ? activeNote.content.trim().split(/\s+/).length : 0
  const charCount = activeNote?.content.length || 0

  return (
    <Card className="flex h-full flex-col p-4">
      {/* Top Header & Note Switcher */}
      <div className="flex items-center justify-between mb-3 relative gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StickyNote className="h-4 w-4 shrink-0 text-muted" />

          <QuickNotesDropdown
            notes={notes}
            activeNote={activeNote}
            isOpen={isDropdownOpen}
            onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
            onClose={() => setIsDropdownOpen(false)}
            onSelect={(id) => setActiveNoteId(id)}
            onCreate={handleCreateNew}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCreateNew}
            className="h-7 w-7 shrink-0"
            title="New note"
            aria-label="New note"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Right Status & Tools */}
        <div className="flex items-center gap-1.5 text-xs shrink-0">
          <span className="min-w-[3.5rem] text-right text-[11px] text-muted" role="status">
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : ''}
          </span>

          {activeNote && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopyAll}
                className="h-7 w-7 text-muted hover:text-text"
                title="Copy note content"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>

              {notes.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-7 w-7 text-muted hover:text-rose-500 hover:bg-rose-500/10"
                  title="Delete this note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          )}

          {onNavigateToNotes && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onNavigateToNotes}
              className="h-7 w-7 text-muted hover:text-text"
              title="Open full Notes studio"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Editor: title + body in one surface */}
      {loading ? (
        <div role="status" aria-label="Loading notes" className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 h-9">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="flex-1 space-y-2.5 p-3 min-h-[90px]">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-surface transition-colors focus-within:border-indigo-500/60">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <input
              disabled={!activeNote}
              type="text"
              aria-label="Note title"
              value={activeNote?.title || ''}
              onChange={handleTitleChange}
              placeholder="Untitled"
              className="h-9 min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-text placeholder:text-muted focus:outline-none"
            />
            {activeNote && <span className="shrink-0 text-[11px] text-muted">{activeNote.folder || 'General'}</span>}
          </div>
          <textarea
            disabled={!activeNote}
            aria-label="Note content"
            value={activeNote?.content || ''}
            onChange={handleContentChange}
            placeholder="Jot something down — it saves as you type. Markdown works."
            className="min-h-[90px] w-full flex-1 resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-text placeholder:text-muted focus:outline-none"
          />
        </div>
      )}
      <div className="flex items-center justify-between px-1 pt-2 text-[11px] text-muted">
        {loading ? (
          <>
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <span>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
            <span className="tabular-nums">{wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars</span>
          </>
        )}
      </div>
    </Card>
  )
}
