import React from 'react'
import { Globe, Code, FileText, Pin, Copy, Check, Trash2, Image as ImageIcon } from 'lucide-react'
import type { ClipItem } from '../../../shared/types'
import { formatTimeAgo, detectClipType, clipImageUrl } from '../utils/clipboardUtils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface ClipboardItemRowProps {
  clip: ClipItem
  isCopied: boolean
  isSelected: boolean
  selectionMode: boolean
  onCopy: (id: string, text: string) => void
  onToggleSelect: (id: string, shiftKey: boolean) => void
  onTogglePin: (e: React.MouseEvent, id: string) => void
  onDelete: (e: React.MouseEvent, id: string) => void
}

export default function ClipboardItemRow({
  clip,
  isCopied,
  isSelected,
  selectionMode,
  onCopy,
  onToggleSelect,
  onTogglePin,
  onDelete
}: ClipboardItemRowProps): React.JSX.Element {
  const clipType = clip.image ? 'image' : detectClipType(clip.text)
  const isMultiLine = clip.text.includes('\n')

  const handleRowClick = (e: React.MouseEvent) => {
    if (selectionMode || e.ctrlKey || e.metaKey || e.shiftKey) {
      onToggleSelect(clip.id, e.shiftKey)
      return
    }
    onCopy(clip.id, clip.text)
  }

  return (
    <div
      onClick={handleRowClick}
      className={`group p-3 px-4 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
        isSelected
          ? 'bg-indigo-500/10 border-indigo-500/60 shadow-sm'
          : clip.pinned
            ? 'bg-surface border-amber-500/40 hover:border-amber-500/70 shadow-sm'
            : 'bg-surface/70 border-border/70 hover:bg-elevated hover:border-indigo-500/40'
      }`}
    >
      {/* Selection Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={isSelected}
        aria-label={isSelected ? 'Deselect item' : 'Select item'}
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelect(clip.id, e.shiftKey)
        }}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
          isSelected
            ? 'border-indigo-500 bg-indigo-600 text-white opacity-100'
            : selectionMode
              ? 'border-border bg-surface text-transparent opacity-100 hover:border-indigo-400'
              : 'border-border bg-surface text-transparent opacity-0 group-hover:opacity-100 hover:border-indigo-400'
        }`}
      >
        <Check className="h-3 w-3 stroke-[3]" />
      </button>
      {/* Content Area */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2 mb-1">
          {clipType === 'url' && (
            <Badge variant="info" className="gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30">
              <Globe className="w-3 h-3" />
              <span>Link</span>
            </Badge>
          )}
          {clipType === 'code' && (
            <Badge variant="default" className="gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30 shadow-none">
              <Code className="w-3 h-3" />
              <span>Code</span>
            </Badge>
          )}
          {clipType === 'image' && (
            <Badge variant="secondary" className="gap-1 text-[10px] text-muted">
              <ImageIcon className="w-3 h-3" />
              <span>Image</span>
            </Badge>
          )}
          {clipType === 'text' && (
            <Badge variant="secondary" className="gap-1 text-[10px] text-muted">
              <FileText className="w-3 h-3" />
              <span>Text</span>
            </Badge>
          )}

          {clip.pinned && (
            <Badge variant="warning" className="gap-1 text-[10px]">
              <Pin className="w-2.5 h-2.5 fill-amber-500" />
              <span>Pinned</span>
            </Badge>
          )}

          <span className="text-[11px] text-muted font-sans">{formatTimeAgo(clip.createdAt)}</span>
          <span className="text-[10px] text-muted">• {clip.image ? `${clip.image.width}×${clip.image.height}` : `${clip.text.length} chars`}</span>
        </div>

        {clip.image ? (
          <img
            src={clipImageUrl(clip.id)}
            alt={clip.text}
            loading="lazy"
            draggable={false}
            className="mt-1 max-h-40 max-w-full rounded-md border border-border bg-[repeating-conic-gradient(rgb(var(--elevated))_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] object-contain"
          />
        ) : (
        <div
          className={`text-xs font-mono text-text select-text break-all leading-relaxed ${
            isMultiLine ? 'max-h-28 overflow-y-auto whitespace-pre-wrap pt-1' : 'truncate'
          }`}
        >
          {clip.text}
        </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        {isCopied ? (
          <Badge variant="success" className="px-2.5 py-1 text-xs gap-1 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Copied!</span>
          </Badge>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onCopy(clip.id, clip.text)
            }}
            className="opacity-0 group-hover:opacity-100 text-muted hover:text-text"
            title="Copy to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => onTogglePin(e, clip.id)}
          title={clip.pinned ? 'Unpin' : 'Pin item'}
          className={
            clip.pinned
              ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
              : 'opacity-0 group-hover:opacity-100 text-muted hover:text-text'
          }
        >
          <Pin className={`w-3.5 h-3.5 ${clip.pinned ? 'fill-amber-500' : ''}`} />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => onDelete(e, clip.id)}
          title="Delete item"
          className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-500 hover:bg-rose-500/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
