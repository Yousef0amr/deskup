import React from 'react'
import { Trash2, FolderOpen, AppWindow, Globe, Edit3 } from 'lucide-react'
import type { ProfileItem } from '../../../shared/types'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'

interface ProfileEditorItemRowProps {
  item: ProfileItem
  index: number
  isManualEdit: boolean
  onUpdate: (patch: Partial<ProfileItem>) => void
  onRemove: () => void
  onOpenPicker: () => void
  onPickFile: () => void
  onPickFolder: () => void
  onToggleManualEdit: () => void
}

export default function ProfileEditorItemRow({
  item,
  index,
  isManualEdit,
  onUpdate,
  onRemove,
  onOpenPicker,
  onPickFile,
  onPickFolder,
  onToggleManualEdit
}: ProfileEditorItemRowProps): React.JSX.Element {
  return (
    <div className="p-3 bg-elevated/60 border border-border/60 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted w-4">{index + 1}.</span>
          <Badge variant="secondary" className="gap-1 uppercase tracking-wider text-[10px]">
            {item.type === 'app' && <AppWindow className="w-3 h-3 text-sky-400" />}
            {item.type === 'folder' && <FolderOpen className="w-3 h-3 text-amber-500" />}
            {item.type === 'url' && <Globe className="w-3 h-3 text-emerald-500" />}
            {item.type}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-7 w-7 text-muted hover:text-rose-400"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input
          type="text"
          value={item.label || ''}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Label (optional)"
          className="h-8 text-xs"
        />

        {item.type === 'app' && !isManualEdit ? (
          <div className="sm:col-span-2 flex items-center gap-1.5">
            {item.target ? (
              <div className="flex-1 flex items-center justify-between px-3 py-1 bg-surface border border-border rounded-lg min-w-0 h-8">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <AppWindow className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-xs font-semibold text-text truncate">
                    {item.label || item.target.split(/[\\/]/).pop()?.replace(/\.lnk$/i, '') || item.target}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onOpenPicker}
                    className="h-6 px-2 text-xs text-indigo-500 hover:text-indigo-600"
                  >
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onToggleManualEdit}
                    className="h-6 w-6 text-muted hover:text-text"
                    title="Edit custom path or command"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenPicker}
                className="flex-1 h-8 text-indigo-500 gap-1.5"
              >
                <AppWindow className="w-4 h-4" />
                <span>Select an Application...</span>
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onPickFile}
              className="h-8 text-xs whitespace-nowrap"
              title="Browse files for custom .exe or .lnk"
            >
              Browse
            </Button>
          </div>
        ) : (
          <div className="sm:col-span-2 flex items-center gap-1.5">
            <Input
              type="text"
              value={item.target}
              onChange={(e) => onUpdate({ target: e.target.value })}
              placeholder={
                item.type === 'url'
                  ? 'https://github.com'
                  : item.type === 'folder'
                  ? 'C:\\projects\\my-app'
                  : 'Path or command (e.g. code)'
              }
              className="flex-1 h-8 font-mono text-xs"
            />
            {item.type === 'app' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenPicker}
                  className="h-8 text-xs whitespace-nowrap"
                >
                  Select App
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onPickFile}
                  className="h-8 text-xs whitespace-nowrap"
                >
                  Browse
                </Button>
              </>
            )}
            {item.type === 'folder' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onPickFolder}
                className="h-8 text-xs whitespace-nowrap"
              >
                Browse
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
