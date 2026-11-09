import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, FileText } from 'lucide-react'
import type { NoteItem } from '../../../shared/types'
import { formatTimeAgo } from '../utils/clipboardUtils'
import { NOTE_TEMPLATES } from '../utils/notesUtils'
import NotesSidebarList from '../components/NotesSidebarList'
import NotesToolbar from '../components/NotesToolbar'
import NoteEditorHeader from '../components/NoteEditorHeader'
import MarkdownPreview from '../components/MarkdownPreview'

export default function NotesPage(): React.JSX.Element {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const list = await window.deskup.notes.list()
        setNotes(list)
        if (list.length > 0) setActiveNoteId(list[0].id)
      } catch (err) {
        console.error('Failed to load notes:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || notes[0],
    [notes, activeNoteId]
  )

  const persistNote = async (updatedNote: NoteItem) => {
    setSaveStatus('saving')
    try {
      await window.deskup.notes.saveNote(updatedNote)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  const handleUpdateActive = (patch: Partial<NoteItem>) => {
    if (!activeNote) return
    const updated: NoteItem = { ...activeNote, ...patch, updatedAt: Date.now() }
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))

    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => {
      void persistNote(updated)
    }, 400)
  }

  const handleCreateNote = async (title?: string, content?: string, folder?: string) => {
    try {
      const newNote = await window.deskup.notes.create(title || 'Untitled Note', content || '', folder || 'General')
      setNotes((prev) => [newNote, ...prev])
      setActiveNoteId(newNote.id)
      setViewMode('edit')
    } catch (err) {
      console.error('Failed to create note:', err)
    }
  }

  const handleApplyTemplate = (templateId: string) => {
    const tpl = NOTE_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    if (!activeNote || (activeNote.content.trim() && !confirm(`Replace current note with "${tpl.title}" template?`))) {
      void handleCreateNote(tpl.title, tpl.content, tpl.folder)
      return
    }
    handleUpdateActive({ title: tpl.title, content: tpl.content, folder: tpl.folder })
  }

  const handleInsertMarkdown = (prefix: string, suffix: string = '') => {
    const ta = textareaRef.current
    if (!ta || !activeNote) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = activeNote.content.substring(start, end)
    const newContent =
      activeNote.content.substring(0, start) + prefix + selected + suffix + activeNote.content.substring(end)
    handleUpdateActive({ content: newContent })
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + prefix.length, end + prefix.length)
    }, 50)
  }

  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const target = notes.find((n) => n.id === id)
    if (confirm(`Delete note "${target?.title || 'Untitled'}"?`)) {
      try {
        await window.deskup.notes.delete(id)
        const updatedList = await window.deskup.notes.list()
        setNotes(updatedList)
        setActiveNoteId(updatedList[0]?.id || null)
      } catch (err) {
        console.error('Failed to delete note:', err)
      }
    }
  }

  const handleCopyContent = async () => {
    if (!activeNote?.content) return
    try {
      await navigator.clipboard.writeText(activeNote.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback
    }
  }

  const wordCount = activeNote?.content.trim() ? activeNote.content.trim().split(/\s+/).filter(Boolean).length : 0
  const charCount = activeNote?.content.length || 0
  const lineCount = activeNote?.content ? activeNote.content.split('\n').length : 0

  return (
    <div className="space-y-6 pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-text">Workspace Notes</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Group notes by folder (Work, Personal, Dev, Ideas), apply templates, format with markdown, and auto-save.
          </p>
        </div>

        <button
          onClick={() => handleCreateNote()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Main 2-Column Studio */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[580px] items-stretch">
        <NotesSidebarList
          notes={notes}
          activeNoteId={activeNoteId}
          search={search}
          isLoading={isLoading}
          onSearchChange={setSearch}
          onSelectNote={setActiveNoteId}
          onCreateNote={() => handleCreateNote()}
          onTogglePin={(id, e) => {
            e.stopPropagation()
            const target = notes.find((n) => n.id === id)
            if (target) handleUpdateActive({ pinned: !target.pinned })
          }}
          onDeleteNote={handleDeleteNote}
        />

        {/* Right Column: Note Canvas & Toolbar */}
        <div className="md:col-span-8 bg-surface/60 border border-border rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          {activeNote ? (
            <>
              {/* Note Header */}
              <div className="space-y-3 pb-3 border-b border-border/60">
                <NoteEditorHeader
                  note={activeNote}
                  notesCount={notes.length}
                  saveStatus={saveStatus}
                  copied={copied}
                  onUpdateTitle={(title) => handleUpdateActive({ title })}
                  onTogglePin={() => handleUpdateActive({ pinned: !activeNote.pinned })}
                  onCopyContent={handleCopyContent}
                  onDeleteNote={() => handleDeleteNote(activeNote.id)}
                />

                <NotesToolbar
                  note={activeNote}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onInsertMarkdown={handleInsertMarkdown}
                  onUpdateNote={handleUpdateActive}
                  onApplyTemplate={handleApplyTemplate}
                />
              </div>

              {/* Editor / Preview Body */}
              <div className="flex-1 py-3 flex flex-col min-h-0">
                {viewMode === 'edit' ? (
                  <textarea
                    ref={textareaRef}
                    value={activeNote.content}
                    onChange={(e) => handleUpdateActive({ content: e.target.value })}
                    placeholder="Write markdown here... Use ## for headings, - [ ] for tasks, ``` for code."
                    className="flex-1 w-full bg-transparent border-none resize-none text-xs text-text placeholder-muted font-mono leading-relaxed focus:outline-none focus:ring-0 min-h-[350px]"
                  />
                ) : (
                  <MarkdownPreview content={activeNote.content} />
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted">
                <div className="flex items-center gap-3">
                  <span>{wordCount} words</span>
                  <span>{charCount} characters</span>
                  <span>{lineCount} lines</span>
                </div>
                <span>Updated {formatTimeAgo(activeNote.updatedAt)}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted text-xs space-y-2">
              <FileText className="w-8 h-8 opacity-40" />
              <p>Select or create a note to begin writing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
