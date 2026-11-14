import React, { useEffect, useRef, useState } from 'react'
import {
  Search,
  Settings2,
  Plus,
  ClipboardCopy,
  X,
  ChevronDown,
  Check,
  Columns3,
  List,
  GitBranch,
  FileText,
  MessageSquareText
} from 'lucide-react'
import type { Board } from '../../../../shared/board'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export type BoardViewMode = 'board' | 'list'

interface BoardHeaderProps {
  boards: Board[]
  activeBoard: Board
  boardCardCounts: Record<string, number>
  openCount: number
  pointsInFlight: number
  doneThisWeekCount: number
  viewMode: BoardViewMode
  onViewModeChange: (mode: BoardViewMode) => void
  query: string
  onQueryChange: (q: string) => void
  searchRef: React.RefObject<HTMLInputElement>
  onSelectBoard: (boardId: string) => void
  onOpenSettings: (mode: 'new' | 'edit') => void
  onCopyMarkdown: () => void
  onCopyStandup: () => void
  onCopyBranches: () => void
}

export default function BoardHeader({
  boards,
  activeBoard,
  boardCardCounts,
  openCount,
  pointsInFlight,
  doneThisWeekCount,
  viewMode,
  onViewModeChange,
  query,
  onQueryChange,
  searchRef,
  onSelectBoard,
  onOpenSettings,
  onCopyMarkdown,
  onCopyStandup,
  onCopyBranches
}: BoardHeaderProps): React.JSX.Element {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!switcherOpen && !exportOpen) return
    const onDown = (e: MouseEvent) => {
      if (switcherOpen && !switcherRef.current?.contains(e.target as Node)) setSwitcherOpen(false)
      if (exportOpen && !exportRef.current?.contains(e.target as Node)) setExportOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSwitcherOpen(false)
        setExportOpen(false)
      }
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [switcherOpen, exportOpen])

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* Board switcher + settings */}
      <div className="flex items-center gap-1.5">
        <div ref={switcherRef} className="relative">
          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            aria-expanded={switcherOpen}
            aria-label="Switch board"
            className="flex h-8 items-center gap-2 rounded-lg border border-transparent px-2 text-left transition-colors hover:border-border hover:bg-surface"
          >
            <span className="max-w-[180px] truncate text-xl font-semibold tracking-tight text-text">{activeBoard.name}</span>
            <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted">{activeBoard.key}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition-transform', switcherOpen && 'rotate-180')} />
          </button>

          {switcherOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-60 rounded-xl border border-border bg-surface p-1 shadow-lg">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Boards</div>
              {boards.map((b) => {
                const isCurrent = b.id === activeBoard.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelectBoard(b.id)
                      setSwitcherOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                      isCurrent ? 'bg-elevated font-medium text-text' : 'text-text hover:bg-elevated/60'
                    )}
                  >
                    <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted">{b.key}</span>
                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                    <span className="text-[11px] tabular-nums text-muted">{boardCardCounts[b.id] ?? 0}</span>
                    {isCurrent && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                )
              })}
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  setSwitcherOpen(false)
                  onOpenSettings('new')
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-500/10 dark:text-indigo-400"
              >
                <Plus className="h-3.5 w-3.5" />
                New board
              </button>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onOpenSettings('edit')}
          title="Board settings"
          aria-label="Board settings"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onOpenSettings('new')}
          title="New board"
          aria-label="New board"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-3 text-xs text-muted">
        <span>
          <b className="font-semibold text-text tabular-nums">{openCount}</b> open
        </span>
        <span>
          <b className="font-semibold text-text tabular-nums">{pointsInFlight}</b> pts in flight
        </span>
        <span>
          <b className="font-semibold text-text tabular-nums">{doneThisWeekCount}</b> done this week
        </span>
      </div>

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => onViewModeChange('board')}
            aria-pressed={viewMode === 'board'}
            className={cn(
              'flex h-6 items-center gap-1 rounded-md px-2 text-xs transition-colors',
              viewMode === 'board' ? 'bg-elevated font-medium text-text' : 'text-muted hover:text-text'
            )}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Board
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-pressed={viewMode === 'list'}
            className={cn(
              'flex h-6 items-center gap-1 rounded-md px-2 text-xs transition-colors',
              viewMode === 'list' ? 'bg-elevated font-medium text-text' : 'text-muted hover:text-text'
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={`Search or ${activeBoard.key}-12`}
            className="h-8 w-52 rounded-lg border border-border bg-surface pl-8 pr-7 text-xs text-text placeholder:text-muted hover:border-hover focus:border-indigo-500/60 focus:outline-none"
            aria-label="Search cards"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-text"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted">/</kbd>
          )}
        </div>

        <div ref={exportRef} className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            aria-expanded={exportOpen}
            onClick={() => setExportOpen((v) => !v)}
            title="Copy board as Markdown, standup update, or git branch names"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            Export
            <ChevronDown className="h-3 w-3 text-muted" />
          </Button>
          {exportOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false)
                  onCopyMarkdown()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-text hover:bg-elevated"
              >
                <FileText className="h-3.5 w-3.5 text-muted" />
                Copy board Markdown
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false)
                  onCopyStandup()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-text hover:bg-elevated"
              >
                <MessageSquareText className="h-3.5 w-3.5 text-muted" />
                Copy standup update
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false)
                  onCopyBranches()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-text hover:bg-elevated"
              >
                <GitBranch className="h-3.5 w-3.5 text-muted" />
                Copy active git branches
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
