import React from 'react'
import { Folder, Pin, Layers } from 'lucide-react'
import type { NoteItem } from '../../../shared/types'
import { DEFAULT_FOLDERS } from '../utils/notesUtils'

interface NotesFolderFilterProps {
  notes: NoteItem[]
  activeFolder: string
  onSelectFolder: (folder: string) => void
}

export default function NotesFolderFilter({
  notes,
  activeFolder,
  onSelectFolder
}: NotesFolderFilterProps): React.JSX.Element {
  // Extract all existing unique folders from notes
  const userFolders = Array.from(
    new Set(notes.map((n) => n.folder || 'General').filter(Boolean))
  )
  const allFolders = Array.from(new Set(['All', 'Pinned', ...DEFAULT_FOLDERS, ...userFolders]))

  const getCount = (folder: string): number => {
    if (folder === 'All') return notes.length
    if (folder === 'Pinned') return notes.filter((n) => n.pinned).length
    return notes.filter((n) => (n.folder || 'General') === folder).length
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
      {allFolders.map((folder) => {
        const count = getCount(folder)
        if (folder !== 'All' && folder !== 'Pinned' && count === 0 && !DEFAULT_FOLDERS.slice(0, 3).includes(folder)) {
          return null
        }
        const isSelected = activeFolder === folder

        return (
          <button
            key={folder}
            onClick={() => onSelectFolder(folder)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
              isSelected
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-elevated/70 text-muted hover:text-text hover:bg-hover border border-border/50'
            }`}
          >
            {folder === 'All' ? (
              <Layers className="w-3 h-3" />
            ) : folder === 'Pinned' ? (
              <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
            ) : (
              <Folder className="w-3 h-3 opacity-70" />
            )}
            <span>{folder}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-surface text-muted'
              }`}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

