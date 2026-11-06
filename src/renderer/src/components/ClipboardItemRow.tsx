import React from 'react'
import { Globe, Code, FileText, Pin, Copy, Check, Trash2 } from 'lucide-react'
import type { ClipItem } from '../../../shared/types'
import { formatTimeAgo, detectClipType } from '../utils/clipboardUtils'

interface ClipboardItemRowProps {
  clip: ClipItem
  isCopied: boolean
  onCopy: (id: string, text: string) => void
  onTogglePin: (e: React.MouseEvent, id: string) => void
  onDelete: (e: React.MouseEvent, id: string) => void
}

export default function ClipboardItemRow({
  clip,
  isCopied,
  onCopy,
  onTogglePin,
  onDelete
}: ClipboardItemRowProps): React.JSX.Element {
  const clipType = detectClipType(clip.text)
  const isMultiLine = clip.text.includes('\n')

  return (
    <div
      onClick={() => onCopy(clip.id, clip.text)}
      className={`group p-3 px-4 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
        clip.pinned
          ? 'bg-surface border-amber-500/40 hover:border-amber-500/70 shadow-sm'
          : 'bg-surface/70 border-border/70 hover:bg-elevated hover:border-indigo-500/40'
      }`}
    >
      {/* Content Area */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-2 mb-1">
          {clipType === 'url' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
              <Globe className="w-3 h-3" />
              <span>Link</span>
            </span>
          )}
          {clipType === 'code' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
              <Code className="w-3 h-3" />
              <span>Code</span>
            </span>
          )}
          {clipType === 'text' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted bg-elevated/80 px-2 py-0.5 rounded-md">
              <FileText className="w-3 h-3" />
              <span>Text</span>
            </span>
          )}

          {clip.pinned && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
              <Pin className="w-2.5 h-2.5 fill-amber-500" />
              <span>Pinned</span>
            </span>
          )}

          <span className="text-[11px] text-muted font-sans">{formatTimeAgo(clip.createdAt)}</span>
          <span className="text-[10px] text-muted">• {clip.text.length} chars</span>
        </div>

        <div
          className={`text-xs font-mono text-text select-text break-all leading-relaxed ${
            isMultiLine ? 'max-h-28 overflow-y-auto whitespace-pre-wrap pt-1' : 'truncate'
          }`}
        >
          {clip.text}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        {isCopied ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Copied!</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCopy(clip.id, clip.text)
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted hover:text-text hover:bg-hover transition-all"
            title="Copy to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => onTogglePin(e, clip.id)}
          title={clip.pinned ? 'Unpin' : 'Pin item'}
          className={`p-1.5 rounded-lg transition-colors ${
            clip.pinned
              ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
              : 'opacity-0 group-hover:opacity-100 text-muted hover:text-text hover:bg-hover'
          }`}
        >
          <Pin className={`w-3.5 h-3.5 ${clip.pinned ? 'fill-amber-500' : ''}`} />
        </button>

        <button
          type="button"
          onClick={(e) => onDelete(e, clip.id)}
          title="Delete item"
          className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

