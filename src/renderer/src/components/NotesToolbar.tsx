import React, { useState } from 'react'
import {
  Bold,
  Italic,
  Code,
  CheckSquare,
  List,
  Heading,
  Eye,
  Edit2,
  Download,
  LayoutTemplate,
  Folder
} from 'lucide-react'
import type { NoteItem } from '../../../shared/types'
import { DEFAULT_FOLDERS, NOTE_COLORS, NOTE_TEMPLATES, exportNoteAsFile } from '../utils/notesUtils'
import { Button } from './ui/button'

interface NotesToolbarProps {
  note: NoteItem
  viewMode: 'edit' | 'preview'
  onViewModeChange: (mode: 'edit' | 'preview') => void
  onInsertMarkdown: (prefix: string, suffix?: string) => void
  onUpdateNote: (patch: Partial<NoteItem>) => void
  onApplyTemplate: (templateId: string) => void
}

export default function NotesToolbar({
  note,
  viewMode,
  onViewModeChange,
  onInsertMarkdown,
  onUpdateNote,
  onApplyTemplate
}: NotesToolbarProps): React.JSX.Element {
  const [isTemplateOpen, setIsTemplateOpen] = useState(false)
  const [isFolderOpen, setIsFolderOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-border/60 text-xs">
      {/* Left: View Mode & Formatting */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Edit / Preview Tabs */}
        <div className="flex items-center bg-elevated rounded-lg p-0.5 border border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('edit')}
            className={`h-7 px-2.5 text-xs font-semibold gap-1 ${
              viewMode === 'edit'
                ? 'bg-surface text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('preview')}
            className={`h-7 px-2.5 text-xs font-semibold gap-1 ${
              viewMode === 'preview'
                ? 'bg-surface text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </Button>
        </div>

        {viewMode === 'edit' && (
          <div className="flex items-center gap-0.5 border-l border-border/60 pl-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onInsertMarkdown('**', '**')}
              className="h-7 w-7 text-muted hover:text-text"
              title="Bold (**text**)"
            >
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onInsertMarkdown('*', '*')}
              className="h-7 w-7 text-muted hover:text-text"
              title="Italic (*text*)"
            >
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onInsertMarkdown('### ')}
              className="h-7 w-7 text-muted hover:text-text"
              title="Heading"
            >
              <Heading className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onInsertMarkdown('- [ ] ')}
              className="h-7 w-7 text-muted hover:text-text"
              title="Checklist Task"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onInsertMarkdown('- ')}
              className="h-7 w-7 text-muted hover:text-text"
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onInsertMarkdown('```\n', '\n```')}
              className="h-7 w-7 text-muted hover:text-text"
              title="Code Block"
            >
              <Code className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Right: Group / Folder, Color, Templates, Export */}
      <div className="flex items-center gap-2">
        {/* Folder / Group Selector */}
        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsFolderOpen(!isFolderOpen)}
            className="h-7 px-2 text-xs gap-1 font-medium"
            title="Change Note Group / Folder"
          >
            <Folder className="w-3 h-3 text-indigo-500" />
            <span>{note.folder || 'General'}</span>
          </Button>

          {isFolderOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsFolderOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-xl shadow-xl z-40 p-1 space-y-0.5 animate-fade-in">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted">Select Group</div>
                {DEFAULT_FOLDERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      onUpdateNote({ folder: f })
                      setIsFolderOpen(false)
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      (note.folder || 'General') === f
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'hover:bg-elevated text-text'
                    }`}
                  >
                    <span>{f}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Color Dot Picker */}
        <div className="flex items-center gap-1 border-l border-border/60 pl-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => onUpdateNote({ color: c.id })}
              className={`w-3.5 h-3.5 rounded-full ${c.dot} transition-transform ${
                (note.color || 'indigo') === c.id ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : 'opacity-60 hover:opacity-100'
              }`}
              title={`Color: ${c.name}`}
            />
          ))}
        </div>

        {/* Templates Dropdown */}
        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsTemplateOpen(!isTemplateOpen)}
            className="h-7 px-2 text-xs gap-1 text-muted hover:text-text"
            title="Apply Template"
          >
            <LayoutTemplate className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Templates</span>
          </Button>

          {isTemplateOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsTemplateOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-64 bg-surface border border-border rounded-xl shadow-xl z-40 p-1.5 space-y-1 animate-fade-in">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted">Insert Template</div>
                {NOTE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      onApplyTemplate(tpl.id)
                      setIsTemplateOpen(false)
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-elevated transition-colors"
                  >
                    <div className="font-semibold text-xs text-text">{tpl.title}</div>
                    <div className="text-[10px] text-muted">{tpl.description}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Export File Button */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => exportNoteAsFile(note)}
          className="h-7 w-7 text-muted hover:text-text"
          title="Download as .md file"
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
