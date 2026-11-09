import React from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import type { NoteItem } from '../../../shared/types'

interface QuickNotesDropdownProps {
  notes: NoteItem[]
  activeNote?: NoteItem
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onSelect: (id: string) => void
  onCreate: () => void
}

export default function QuickNotesDropdown({
  notes,
  activeNote,
  isOpen,
  onToggle,
  onClose,
  onSelect,
  onCreate
}: QuickNotesDropdownProps): React.JSX.Element {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-elevated/90 hover:bg-hover border border-border/70 text-xs font-semibold text-text transition-colors max-w-[170px]"
        title="Switch active note"
      >
        <span className="truncate">{activeNote?.title || 'Select Note'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute left-0 top-full mt-1.5 w-60 bg-surface border border-border rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-fade-in max-h-56 overflow-y-auto">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted flex justify-between items-center border-b border-border/50 pb-1.5 mb-1">
              <span>All Notes ({notes.length})</span>
              <button
                type="button"
                onClick={onCreate}
                className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold text-[11px]"
              >
                <Plus className="w-3 h-3" />
                <span>+ New Note</span>
              </button>
            </div>

            {notes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  onSelect(n.id)
                  onClose()
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                  n.id === activeNote?.id
                    ? 'bg-amber-500 text-white font-semibold'
                    : 'text-text hover:bg-elevated'
                }`}
              >
                <span className="truncate flex-1 pr-1">{n.title || 'Untitled Note'}</span>
                <span
                  className={`text-[10px] shrink-0 ${
                    n.id === activeNote?.id ? 'text-amber-100' : 'text-muted'
                  }`}
                >
                  {n.content.trim().split(/\s+/).filter(Boolean).length}w
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

