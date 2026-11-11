import React from 'react'
import { Folder, Pin, Layers } from 'lucide-react'
import type { NoteItem } from '../../../shared/types'
import { DEFAULT_FOLDERS } from '../utils/notesUtils'
import { Button } from './ui/button'

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
    <div className="flex flex-wrap items-center gap-1">
      {allFolders.map((folder) => {
        const count = getCount(folder)
        if (folder !== 'All' && folder !== 'Pinned' && count === 0 && !DEFAULT_FOLDERS.slice(0, 3).includes(folder)) {
          return null
        }
        const isSelected = activeFolder === folder

        return (
          <Button
            key={folder}
            type="button"
            variant={isSelected ? 'default' : 'secondary'}
            size="sm"
            onClick={() => onSelectFolder(folder)}
            className="h-7 px-2.5 text-xs gap-1 whitespace-nowrap shrink-0"
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
          </Button>
        )
      })}
    </div>
  )
}
