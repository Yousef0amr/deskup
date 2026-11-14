import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, Settings2, Plus, ClipboardCopy, X, Filter } from 'lucide-react'
import type { Board, BoardCard, BoardColumn, BoardData, CardPriority, CardType } from '../../../shared/board'
import {
  CARD_PRIORITIES,
  CARD_TYPES,
  boardToMarkdown,
  cardKey,
  columnCards,
  columnStats,
  createBoard,
  filterCards,
  moveCard,
  parseQuickAdd
} from '../../../shared/board'
import BoardColumnView from '../components/board/BoardColumnView'
import CardDetailPanel from '../components/board/CardDetailPanel'
import BoardSettingsDialog from '../components/board/BoardSettingsDialog'
import { PRIORITY_META, TYPE_META, copyText, labelTone, newId } from '../components/board/boardMeta'
import { Button } from '../components/ui/button'
import { BoardSkeleton } from '../components/ui/skeletons'
import { useToast } from '../components/ui/toast'
import { cn } from '../lib/utils'

const ACTIVE_BOARD_KEY = 'deskup.activeBoard'
const SAVE_DELAY_MS = 350

function readActiveBoard(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BOARD_KEY)
  } catch {
    return null
  }
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export default function BoardPage(): React.JSX.Element {
  const [data, setData] = useState<BoardData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(readActiveBoard)
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState<CardType[]>([])
  const [priorities, setPriorities] = useState<CardPriority[]>([])
  const [label, setLabel] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null)
  const [settings, setSettings] = useState<'new' | 'edit' | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const dataRef = useRef<BoardData | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toast = useToast()

  // ---- persistence: optimistic state + debounced save (typing in the panel is frequent)
  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = null
    const snapshot = dataRef.current
    if (snapshot) void window.deskup.board.save(snapshot).catch((err) => toast('Board not saved: ' + (err as Error).message, 'error'))
  }, [toast])

  const commit = useCallback(
    (updater: (d: BoardData) => BoardData) => {
      setData((prev) => {
        if (!prev) return prev
        const next = updater(prev)
        dataRef.current = next
        return next
      })
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(flush, SAVE_DELAY_MS)
    },
    [flush]
  )

  useEffect(() => {
    window.deskup.board
      .get()
      .then((loaded) => {
        if (loaded.boards.length === 0) {
          // First run: a ready-to-use board with a sensible dev workflow.
          const first = createBoard('Product', 'DSK', newId())
          loaded = { boards: [first], cards: [] }
          void window.deskup.board.save(loaded)
        }
        dataRef.current = loaded
        setData(loaded)
      })
      .catch((err) => setLoadError((err as Error).message))
    return () => flush()
  }, [flush])

  const board: Board | undefined = useMemo(
    () => data?.boards.find((b) => b.id === activeId) ?? data?.boards[0],
    [data, activeId]
  )

  useEffect(() => {
    if (!board) return
    try {
      localStorage.setItem(ACTIVE_BOARD_KEY, board.id)
    } catch {
      // Convenience only.
    }
  }, [board])

  const boardCards = useMemo(() => (data && board ? data.cards.filter((c) => c.boardId === board.id) : []), [data, board])
  const visibleCards = useMemo(
    () => (board ? filterCards(boardCards, board, { query, types, priorities, label: label || undefined }) : []),
    [boardCards, board, query, types, priorities, label]
  )
  const allLabels = useMemo(() => [...new Set(boardCards.flatMap((c) => c.labels))].sort(), [boardCards])
  const selected = useMemo(() => boardCards.find((c) => c.id === selectedId) ?? null, [boardCards, selectedId])
  const filtersActive = !!query || types.length > 0 || priorities.length > 0 || !!label

  // ---- card actions
  const addCard = useCallback(
    (columnId: string, text: string) => {
      if (!board) return
      const parsed = parseQuickAdd(text)
      if (!parsed.title) return
      const column = board.columns.find((c) => c.id === columnId)
      const now = Date.now()
      commit((d) => {
        const current = d.boards.find((b) => b.id === board.id)!
        const card: BoardCard = {
          id: newId(),
          boardId: board.id,
          number: current.nextNumber,
          columnId,
          order: d.cards.filter((c) => c.columnId === columnId).length,
          title: parsed.title.slice(0, 200),
          description: '',
          type: parsed.type ?? 'feature',
          priority: parsed.priority ?? 'medium',
          labels: parsed.labels,
          ...(parsed.estimate !== undefined ? { estimate: parsed.estimate } : {}),
          links: [],
          checklist: [],
          createdAt: now,
          updatedAt: now,
          ...(column?.done ? { completedAt: now } : {})
        }
        return {
          boards: d.boards.map((b) => (b.id === board.id ? { ...b, nextNumber: b.nextNumber + 1 } : b)),
          cards: [...d.cards, card]
        }
      })
    },
    [board, commit]
  )

  const updateCard = useCallback(
    (id: string, patch: Partial<BoardCard>) =>
      commit((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)) })),
    [commit]
  )

  // `index` is a position among the *visible* (filtered) cards; translate it to a position in
  // the full column so dropping "above card X" still lands above X when filters hide others.
  const dropCard = useCallback(
    (cardId: string, columnId: string, index: number) => {
      if (!board) return
      commit((d) => {
        const full = columnCards(d.cards, columnId).filter((c) => c.id !== cardId)
        const shown = columnCards(visibleCards, columnId).filter((c) => c.id !== cardId)
        const anchor = shown[index]
        const fullIndex = anchor
          ? full.findIndex((c) => c.id === anchor.id)
          : shown.length
            ? full.findIndex((c) => c.id === shown[shown.length - 1].id) + 1
            : full.length
        return { ...d, cards: moveCard(d.cards, board, cardId, columnId, fullIndex) }
      })
    },
    [board, commit, visibleCards]
  )

  const moveToColumn = useCallback(
    (cardId: string, columnId: string) => {
      if (!board || !data) return
      dropCard(cardId, columnId, columnCards(data.cards, columnId).length)
    },
    [board, data, dropCard]
  )

  const deleteCard = useCallback(
    (id: string) => {
      const card = data?.cards.find((c) => c.id === id)
      if (!card || !board) return
      setSelectedId(null)
      commit((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) }))
      toast(`Deleted ${cardKey(board, card)}`, 'info', {
        label: 'Undo',
        onClick: () => commit((d) => ({ ...d, cards: d.cards.some((c) => c.id === id) ? d.cards : [...d.cards, card] }))
      })
    },
    [data, board, commit, toast]
  )

  const duplicateCard = useCallback(
    (id: string) => {
      const source = data?.cards.find((c) => c.id === id)
      if (!source || !board) return
      const copyId = newId()
      const now = Date.now()
      commit((d) => {
        const current = d.boards.find((b) => b.id === board.id)!
        const copy: BoardCard = {
          ...source,
          id: copyId,
          number: current.nextNumber,
          title: `${source.title} (copy)`.slice(0, 200),
          order: source.order + 0.5,
          links: source.links.map((l) => ({ ...l, id: newId() })),
          checklist: source.checklist.map((i) => ({ ...i, id: newId(), done: false })),
          createdAt: now,
          updatedAt: now
        }
        return {
          boards: d.boards.map((b) => (b.id === board.id ? { ...b, nextNumber: b.nextNumber + 1 } : b)),
          cards: moveCard([...d.cards, copy], current, copyId, source.columnId, source.order + 1)
        }
      })
      setSelectedId(copyId)
    },
    [data, board, commit]
  )

  const focusOnCard = useCallback(
    (card: BoardCard) => {
      if (!board) return
      const task = `${cardKey(board, card)} ${card.title}`
      window.deskup.focus
        .action('start', { taskName: task.slice(0, 120), category: card.type === 'bug' ? 'Coding' : 'Deep Work' })
        .then(() => toast(`Focus started: ${task}`, 'info'))
        .catch(() => toast('Could not start focus', 'error'))
    },
    [board, toast]
  )

  // ---- board actions
  const saveBoardSettings = (draft: { name: string; key: string; columns: BoardColumn[] }) => {
    if (settings === 'new') {
      const created = { ...createBoard(draft.name, draft.key, newId()) }
      commit((d) => ({ ...d, boards: [...d.boards, created] }))
      setActiveId(created.id)
      toast(`Created board “${created.name}”`)
    } else if (board) {
      commit((d) => ({ ...d, boards: d.boards.map((b) => (b.id === board.id ? { ...b, name: draft.name, key: draft.key, columns: draft.columns } : b)) }))
    }
    setSettings(null)
  }

  const deleteBoard = () => {
    if (!board || !data || data.boards.length <= 1) return
    const count = boardCards.length
    if (!confirm(`Delete board “${board.name}”${count ? ` and its ${count} card(s)` : ''}? This cannot be undone.`)) return
    commit((d) => ({ boards: d.boards.filter((b) => b.id !== board.id), cards: d.cards.filter((c) => c.boardId !== board.id) }))
    setActiveId(null)
    setSettings(null)
  }

  // ---- keyboard: N = new card, / = search, Esc = clear search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || selectedId || settings) return
      if (isTyping(e.target)) {
        if (e.key === 'Escape' && e.target === searchRef.current) {
          setQuery('')
          searchRef.current?.blur()
        }
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key.toLowerCase() === 'n' && board) {
        e.preventDefault()
        const target = board.columns.find((c) => /to ?do/i.test(c.name)) ?? board.columns.find((c) => !c.done) ?? board.columns[0]
        setQuickAddColumn(target.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [board, selectedId, settings])

  if (loadError) return <p className="py-12 text-center text-sm text-rose-600">Could not load the board: {loadError}</p>
  if (!data || !board) return <BoardSkeleton />

  const doneColumnIds = new Set(board.columns.filter((c) => c.done).map((c) => c.id))
  const openCards = boardCards.filter((c) => !doneColumnIds.has(c.columnId))
  const weekAgo = Date.now() - 7 * 86_400_000
  const doneThisWeek = boardCards.filter((c) => c.completedAt && c.completedAt >= weekAgo)
  const cardCounts = Object.fromEntries(board.columns.map((c) => [c.id, boardCards.filter((x) => x.columnId === c.id).length]))

  const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-4">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <select
            value={board.id}
            onChange={(e) => {
              setActiveId(e.target.value)
              setSelectedId(null)
            }}
            className="h-8 max-w-[220px] cursor-pointer rounded-lg bg-transparent pr-1 text-xl font-semibold tracking-tight text-text hover:bg-elevated focus:outline-none"
            aria-label="Board"
          >
            {data.boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-muted">{board.key}</span>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettings('edit')} title="Board settings" aria-label="Board settings">
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettings('new')} title="New board" aria-label="New board">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span><b className="font-semibold text-text tabular-nums">{openCards.length}</b> open</span>
          <span><b className="font-semibold text-text tabular-nums">{openCards.reduce((s, c) => s + (c.estimate ?? 0), 0)}</b> pts in flight</span>
          <span><b className="font-semibold text-text tabular-nums">{doneThisWeek.length}</b> done this week</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or DSK-12"
              className="h-8 w-52 rounded-lg border border-border bg-surface pl-8 pr-7 text-xs text-text placeholder:text-muted hover:border-hover focus:border-indigo-500/60 focus:outline-none"
              aria-label="Search cards"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted">/</kbd>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => void copyText(boardToMarkdown(board, boardCards)).then(() => toast('Board copied as Markdown'))}
            title="Copy the board as Markdown (stand-ups, PR descriptions)"
          >
            <ClipboardCopy className="h-3.5 w-3.5" /> Markdown
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <Filter className="mr-1 h-3.5 w-3.5 text-muted" aria-hidden />
        {CARD_TYPES.map((t) => {
          const meta = TYPE_META[t]
          const on = types.includes(t)
          return (
            <button key={t} type="button" onClick={() => setTypes((v) => toggle(v, t))} aria-pressed={on} className={cn('flex h-6 items-center gap-1 rounded-md px-2 transition-colors', on ? 'bg-elevated font-medium text-text' : 'text-muted hover:text-text')}>
              <meta.icon className={cn('h-3 w-3', meta.tone)} />
              {meta.label}
            </button>
          )
        })}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {CARD_PRIORITIES.map((p) => {
          const meta = PRIORITY_META[p]
          const on = priorities.includes(p)
          return (
            <button key={p} type="button" onClick={() => setPriorities((v) => toggle(v, p))} aria-pressed={on} className={cn('flex h-6 items-center gap-1 rounded-md px-2 transition-colors', on ? 'bg-elevated font-medium text-text' : 'text-muted hover:text-text')}>
              <meta.icon className={cn('h-3 w-3', meta.tone)} />
              {meta.label}
            </button>
          )
        })}
        {allLabels.length > 0 && (
          <>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            {allLabels.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLabel(label === l ? '' : l)}
                aria-pressed={label === l}
                className={cn('h-6 rounded-md px-2 font-medium transition-opacity', labelTone(l), label && label !== l ? 'opacity-40' : 'opacity-100')}
              >
                {l}
              </button>
            ))}
          </>
        )}
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setTypes([])
              setPriorities([])
              setLabel('')
            }}
            className="ml-1 flex h-6 items-center gap-1 rounded-md px-2 text-muted hover:text-text"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        <span className="ml-auto hidden text-[11px] text-muted lg:inline">
          <kbd className="font-mono">N</kbd> new card · <kbd className="font-mono">/</kbd> search · drag to move
        </span>
      </div>

      {/* Columns */}
      <div className="-mx-2 flex min-h-0 flex-1 gap-3 overflow-x-auto px-2 pb-2">
        {board.columns.map((column) => {
          const stats = columnStats(boardCards, column)
          return (
            <BoardColumnView
              key={column.id}
              board={board}
              column={column}
              cards={columnCards(visibleCards, column.id)}
              totalCount={stats.count}
              points={stats.points}
              selectedId={selectedId}
              draggingId={draggingId}
              quickAddOpen={quickAddColumn === column.id}
              onQuickAddOpenChange={(open) => setQuickAddColumn(open ? column.id : null)}
              onQuickAdd={addCard}
              onOpenCard={setSelectedId}
              onDragStart={setDraggingId}
              onDragEnd={() => setDraggingId(null)}
              onDrop={dropCard}
            />
          )
        })}
      </div>

      <CardDetailPanel
        board={board}
        card={selected}
        onClose={() => {
          setSelectedId(null)
          flush()
        }}
        onUpdate={updateCard}
        onMove={moveToColumn}
        onDelete={deleteCard}
        onDuplicate={duplicateCard}
        onFocus={focusOnCard}
      />

      <BoardSettingsDialog
        open={settings !== null}
        board={settings === 'edit' ? board : null}
        cardCounts={cardCounts}
        canDelete={data.boards.length > 1}
        onClose={() => setSettings(null)}
        onSave={saveBoardSettings}
        onDelete={deleteBoard}
      />
    </div>
  )
}
