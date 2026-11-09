import React from 'react'
import { Check, Copy, Pin, Trash2 } from 'lucide-react'
import type { NoteItem } from '../../../shared/types'
import { NOTE_COLORS } from '../utils/notesUtils'

interface NoteEditorHeaderProps {
  note: NoteItem
  notesCount: number
  saveStatus: 'saved' | 'saving' | 'idle' | 'error'
  copied: boolean
  onUpdateTitle: (title: string) => void
  onTogglePin: () => void
  onCopyContent: () => void
  onDeleteNote: () => void
}

export default function NoteEditorHeader({
  note,
  notesCount,
  saveStatus,
  copied,
  onUpdateTitle,
  onTogglePin,
  onCopyContent,
  onDeleteNote
}: NoteEditorHeaderProps): React.JSX.Element {
  const activeColor = NOTE_COLORS.find((c) => c.id === note.color)?.dot || 'bg-indigo-500'

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={`w-3 h-3 rounded-full ${activeColor} shrink-0`} />
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Note Title..."
          className="flex-1 text-xl font-bold bg-transparent border-none text-text placeholder-muted focus:outline-none focus:ring-0 truncate"
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {saveStatus === 'saving' && (
          <span className="text-amber-600 dark:text-amber-400 text-xs font-medium animate-pulse">
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}

        <div className="h-4 w-px bg-border/60 mx-1" />

        <button
          onClick={onCopyContent}
          className="p-2 text-muted hover:text-text hover:bg-elevated rounded-xl transition-colors"
          title="Copy note content"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>

        <button
          onClick={onTogglePin}
          className={`p-2 rounded-xl transition-colors ${
            note.pinned ? 'text-amber-500 bg-amber-500/10' : 'text-muted hover:text-text hover:bg-elevated'
          }`}
          title={note.pinned ? 'Unpin note' : 'Pin note to top'}
        >
          <Pin className={`w-4 h-4 ${note.pinned ? 'fill-amber-500' : ''}`} />
        </button>

        {notesCount > 1 && (
          <button
            onClick={onDeleteNote}
            className="p-2 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

