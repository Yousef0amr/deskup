import React, { useState, useEffect } from 'react'
import {
  ClipboardList,
  Copy,
  Check,
  Pin,
  ExternalLink,
  Code,
  Link as LinkIcon,
  FileText,
  Image as ImageIcon
} from 'lucide-react'
import type { ClipItem } from '../../../shared/types'
import { Card } from './ui/card'
import { clipImageUrl, copyClip } from '../utils/clipboardUtils'
import { WidgetHeader } from './ui/widget-header'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Skeleton } from './ui/skeleton'

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
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())
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
    void loadData()

    const unsubscribe = window.deskup.clipboard.onChanged((updated) => {
      setClips(updated.slice(0, 4))
    })
    return () => unsubscribe()
  }, [])

  const handleCopy = async (id: string, text: string) => {
    await copyClip(clips.find((c) => c.id === id), text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  return (
    <Card className="flex h-full flex-col p-4">
      <WidgetHeader
        icon={ClipboardList}
        title="Recent clips"
        actions={onNavigateToClipboard && (
          <Button type="button" variant="ghost" size="sm" onClick={onNavigateToClipboard} className="text-muted">
            View all
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      />

      {/* Clips List */}
      <div className="flex-1 flex flex-col justify-between">
        {loading ? (
          <div role="status" aria-label="Loading recent clips" className="space-y-2.5 flex-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-elevated/30">
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <Skeleton className="h-8 w-8 rounded shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-2.5 w-14" />
                  </div>
                </div>
                <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        ) : clips.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted text-xs py-6 space-y-2 rounded-lg border border-dashed border-border">
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
                    {clip.image ? (
                      brokenImages.has(clip.id) ? (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-elevated text-muted">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      ) : (
                        <img
                          src={clipImageUrl(clip.id)}
                          alt=""
                          draggable={false}
                          onError={() => setBrokenImages((prev) => new Set(prev).add(clip.id))}
                          className="h-8 w-8 shrink-0 rounded border border-border object-cover"
                        />
                      )
                    ) : (
                      getClipIcon(clip.text)
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-text truncate leading-tight">
                        {clip.image ? `Image · ${clip.image.width}×${clip.image.height}` : clip.text.replace(/\s+/g, ' ').trim()}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted font-sans">
                          {formatTimeAgo(clip.createdAt)}
                        </span>
                        {clip.pinned && (
                          <Badge variant="warning" className="gap-0.5 text-[9px] px-1.5 py-0 font-medium">
                            <Pin className="w-2.5 h-2.5 fill-amber-500" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant={isCopied ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => handleCopy(clip.id, clip.text)}
                    className={`h-8 w-8 shrink-0 ${
                      isCopied ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'text-muted hover:text-text'
                    }`}
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
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
    </Card>
  )
}
