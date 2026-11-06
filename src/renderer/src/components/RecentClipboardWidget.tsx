import React, { useState, useEffect } from 'react'
import {
  ClipboardList,
  Copy,
  Check,
  Pin,
  ExternalLink,
  Code,
  Link as LinkIcon,
  FileText
} from 'lucide-react'
import type { ClipItem } from '../../../shared/types'

interface RecentClipboardWidgetProps {
  onNavigateToClipboard?: () => void
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}d ago`
}

function getClipIcon(text: string) {
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return <LinkIcon className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
  }
  if (text.includes('{') || text.includes('function') || text.includes('const ') || text.includes('import ')) {
    return <Code className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
  }
  return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
}

export default function RecentClipboardWidget({
  onNavigateToClipboard
}: RecentClipboardWidgetProps): React.JSX.Element {
  const [clips, setClips] = useState<ClipItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const loadedClips = await window.deskup.clipboard.list()
        setClips(loadedClips.slice(0, 4))
      } catch (err) {
        console.error('Failed to load recent clipboard clips:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()

    const unsubscribe = window.deskup.clipboard.onChanged((updated) => {
      setClips(updated.slice(0, 4))
    })
    return () => unsubscribe()
  }, [])

  const handleCopy = async (id: string, text: string) => {
    await window.deskup.clipboard.copy(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  return (
    <div className="bg-surface/60 border border-border rounded-2xl p-5 shadow-lg flex flex-col h-full min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-text text-base">Recent Clips</h3>
        </div>
        {onNavigateToClipboard && (
          <button
            onClick={onNavigateToClipboard}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Clips List */}
      <div className="flex-1 flex flex-col justify-between">
        {loading ? (
          <p className="text-xs text-muted py-8 text-center">Loading clipboard...</p>
        ) : clips.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted text-xs py-8 space-y-2 border border-dashed border-border/60 rounded-xl">
            <ClipboardList className="w-8 h-8 opacity-40" />
            <p className="font-medium text-text">No copied clips yet</p>
            <p className="text-[11px] text-muted text-center max-w-[220px]">
              Anything you copy with Ctrl+C will appear here for instant 1-click re-use.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 flex-1">
            {clips.map((clip) => {
              const isCopied = copiedId === clip.id
              return (
                <div
                  key={clip.id}
                  className="group flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-elevated/50 hover:bg-elevated/90 hover:border-border transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    {getClipIcon(clip.text)}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-text truncate leading-tight">
                        {clip.text.replace(/\s+/g, ' ').trim()}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted font-sans">
                          {formatTimeAgo(clip.createdAt)}
                        </span>
                        {clip.pinned && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-500 font-sans font-medium">
                            <Pin className="w-2.5 h-2.5 fill-amber-500" />
                            Pinned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(clip.id, clip.text)}
                    className={`p-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                      isCopied
                        ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                        : 'text-muted hover:text-text hover:bg-hover border border-transparent'
                    }`}
                    title="Copy to clipboard"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer tip */}
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted">
          <span>Press hotkey anywhere for popup</span>
          <span className="font-mono bg-elevated px-2 py-0.5 rounded border border-border/50">
            Ctrl+Shift+V
          </span>
        </div>
      </div>
    </div>
  )
}
