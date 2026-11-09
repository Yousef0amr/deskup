import React, { useMemo, useState } from 'react'
import { Search, Plus, Pin, Trash2, X, Folder } from 'lucide-react'
import type { NoteItem } from '../../../shared/types'
import { formatTimeAgo } from '../utils/clipboardUtils'
import { getFolderStyle, NOTE_COLORS } from '../utils/notesUtils'
import NotesFolderFilter from './NotesFolderFilter'

interface NotesSidebarListProps {
  notes: NoteItem[]
  activeNoteId: string | null
  search: string
  isLoading: boolean
  onSearchChange: (val: string) => void
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onTogglePin: (id: string, e: React.MouseEvent) => void
  onDeleteNote: (id: string, e: React.MouseEvent) => void
}

export default function NotesSidebarList({
  notes,
  activeNoteId,
  search,
  isLoading,
  onSearchChange,
  onSelectNote,
  onCreateNote,
  onTogglePin,
  onDeleteNote
}: NotesSidebarListProps): React.JSX.Element {
  const [activeFolder, setActiveFolder] = useState<string>('All')

  const filteredNotes = useMemo(() => {
    let result = [...notes].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.updatedAt - a.updatedAt
    })

    if (activeFolder === 'Pinned') {
      result = result.filter((n) => n.pinned)
    } else if (activeFolder !== 'All') {
      result = result.filter((n) => (n.folder || 'General') === activeFolder)
    }

    if (!search.trim()) return result
    const q = search.toLowerCase()
    return result.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.folder && n.folder.toLowerCase().includes(q))
    )
  }, [notes, search, activeFolder])

  return (
    <div className="md:col-span-4 bg-surface/60 border border-border rounded-2xl p-4 shadow-lg flex flex-col justify-between">
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes or folders..."
            className="w-full pl-8 pr-7 py-2 bg-elevated/70 border border-border rounded-xl text-xs text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Note Grouping (Folder) Filter Bar */}
        <NotesFolderFilter
          notes={notes}
          activeFolder={activeFolder}
          onSelectFolder={setActiveFolder}
        />

        {/* Notes List */}
        <div className="space-y-1.5 overflow-y-auto max-h-[440px] pr-1">
          {isLoading ? (
            <p className="text-xs text-muted py-8 text-center">Loading notes...</p>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-10 text-muted text-xs space-y-1.5 border border-dashed border-border/60 rounded-xl p-3">
              <Folder className="w-6 h-6 text-indigo-500/40 mx-auto" />
              <p className="font-semibold text-text">No notes in this group</p>
              <p className="text-[11px]">
                {activeFolder !== 'All' ? `No notes in "${activeFolder}".` : 'Create your first note.'}
              </p>
              <button
                onClick={onCreateNote}
                className="text-indigo-600 dark:text-indigo-400 font-semibold underline text-xs pt-1"
              >
                + New Note
              </button>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = note.id === activeNoteId
              const preview = note.content.trim().replace(/\s+/g, ' ') || 'No content yet...'
              const folderStyle = getFolderStyle(note.folder)
              const colorDot = NOTE_COLORS.find((c) => c.id === note.color)?.dot || 'bg-indigo-500'

              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className={`group p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-elevated border-indigo-500/60 shadow-sm'
                      : 'bg-surface/40 border-border/40 hover:bg-elevated/60 hover:border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full ${colorDot} shrink-0`} />
                      {note.pinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                      <h4
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-text'
                        }`}
                      >
                        {note.title || 'Untitled Note'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => onTogglePin(note.id, e)}
                        className="p-1 text-muted hover:text-amber-500 rounded"
                        title={note.pinned ? 'Unpin' : 'Pin note'}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      {notes.length > 1 && (
                        <button
                          onClick={(e) => onDeleteNote(note.id, e)}
                          className="p-1 text-muted hover:text-rose-500 rounded"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted truncate font-mono mb-2">{preview}</p>

                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${folderStyle.bg} ${folderStyle.text} ${folderStyle.border}`}
                    >
                      {note.folder || 'General'}
                    </span>
                    <span>{formatTimeAgo(note.updatedAt)}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border/50 text-[11px] text-muted flex justify-between items-center">
        <span>{filteredNotes.length} notes shown</span>
        <button
          onClick={onCreateNote}
          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" />
          <span>Add Note</span>
        </button>
      </div>
    </div>
  )
}
