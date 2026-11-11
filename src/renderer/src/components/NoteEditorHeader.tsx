import React from 'react'
import { Check, Copy, Pin, Trash2 } from 'lucide-react'
import type { NoteItem } from '../../../shared/types'
import { NOTE_COLORS } from '../utils/notesUtils'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

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
          <Badge variant="warning" className="gap-1 animate-pulse text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Saving...
          </Badge>
        )}
        {saveStatus === 'saved' && (
          <Badge variant="success" className="gap-1 text-xs">
            <Check className="w-3 h-3" /> Saved
          </Badge>
        )}

        <div className="h-4 w-px bg-border/60 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCopyContent}
          className="text-muted hover:text-text h-8 w-8"
          title="Copy note content"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onTogglePin}
          className={`h-8 w-8 ${
            note.pinned ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' : 'text-muted hover:text-text'
          }`}
          title={note.pinned ? 'Unpin note' : 'Pin note to top'}
        >
          <Pin className={`w-4 h-4 ${note.pinned ? 'fill-amber-500' : ''}`} />
        </Button>

        {notesCount > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDeleteNote}
            className="text-muted hover:text-rose-500 hover:bg-rose-500/10 h-8 w-8"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
