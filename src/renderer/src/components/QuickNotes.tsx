import React, { useState, useEffect, useRef } from 'react'
import {
  StickyNote,
  Check,
  Trash2,
  Copy,
  Plus,
  ExternalLink,
  Edit3
} from 'lucide-react'
import type { NoteItem } from '../../../shared/types'
import QuickNotesDropdown from './QuickNotesDropdown'

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
        if (list.length > 0) {
          setActiveNoteId(list[0].id)
        }
      } catch (err) {
        setSaveStatus('error')
        console.error('Failed to load notes list:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
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
    saveTimer.current = setTimeout(() => {
      void persistNote(updated)
    }, 400)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeNote) return
    const updated = { ...activeNote, title: e.target.value, updatedAt: Date.now() }
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))

    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => {
      void persistNote(updated)
    }, 400)
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
    <div className="bg-surface/60 border border-border rounded-2xl p-5 shadow-lg flex flex-col h-full min-h-[320px]">
      {/* Top Header & Note Switcher */}
          <div className="flex items-center justify-between mb-3 relative gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <StickyNote className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />

                {/* Switch Note Dropdown */}
                <QuickNotesDropdown
                  notes={notes}
                  activeNote={activeNote}
                  isOpen={isDropdownOpen}
                  onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
                  onClose={() => setIsDropdownOpen(false)}
                  onSelect={(id) => setActiveNoteId(id)}
                  onCreate={handleCreateNew}
                />

              {/* Prominent + New Note Button */}
              <button
                type="button"
                onClick={handleCreateNew}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs shadow-sm transition-colors shrink-0"
                title="Create a new note"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New Note</span>
              </button>
            </div>

            {/* Right Status & Tools */}
            <div className="flex items-center gap-2 text-xs shrink-0">
              {saveStatus === 'saving' && (
                <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px] animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}

              <div className="h-3 w-px bg-border/60 mx-0.5" />

              {activeNote && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="text-muted hover:text-text p-1 rounded transition-colors"
                    title="Copy note content"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {notes.length > 1 && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="text-muted hover:text-rose-500 p-1 rounded transition-colors"
                      title="Delete this note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}

              {onNavigateToNotes && (
                <button
                  type="button"
                  onClick={onNavigateToNotes}
                  className="text-muted hover:text-amber-600 dark:hover:text-amber-400 p-1 rounded transition-colors"
                  title="Open full Notes studio"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

            {/* Note Title Input with Clear Label & Folder Badge */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <label className="text-[11px] font-semibold text-muted flex items-center gap-1 shrink-0 uppercase tracking-wider">
                <Edit3 className="w-3 h-3 text-amber-500" />
                <span>Title:</span>
              </label>
              <input
                disabled={loading || !activeNote}
                type="text"
                value={activeNote?.title || ''}
                onChange={handleTitleChange}
                placeholder="Give this note a title (e.g. Project Plan, Meeting Notes)..."
                className="flex-1 px-2.5 py-1 bg-surface border border-border/80 rounded-lg text-xs font-semibold text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
              />
              {activeNote && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-elevated border border-border/60 text-muted font-medium shrink-0">
                  📁 {activeNote.folder || 'General'}
                </span>
              )}
            </div>

            {/* Note Content Editor */}
            <div className="flex-1 flex flex-col min-h-0">
              <textarea
                disabled={loading || !activeNote}
                value={activeNote?.content || ''}
                onChange={handleContentChange}
                placeholder="Type notes, links, code snippets or thoughts here... Auto-saves automatically."
                className="flex-1 w-full p-3.5 bg-elevated/50 border border-border/60 rounded-xl text-xs text-text placeholder-muted font-mono resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed min-h-[170px]"
              />
              <div className="flex justify-between items-center text-[10px] text-muted pt-2 px-1">
                <span>Markdown & plain text supported</span>
                <span>
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'} · {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
                </span>
              </div>
            </div>
          </div>
          )
}
