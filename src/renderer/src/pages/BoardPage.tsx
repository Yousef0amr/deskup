import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Terminal, X } from 'lucide-react'
import type { Board, BoardCard, BoardColumn, BoardData, CardPriority, CardSort, CardType } from '../../../shared/board'
import {
  boardBranches,
  boardToMarkdown,
  boardToStandup,
  cardKey,
  branchName,
  columnCards,
  columnStats,
  createBoard,
  filterCards,
  moveCard,
  nextColumnId,
  parseQuickAdd,
  sortCards
} from '../../../shared/board'
import { localDateKey } from '../../../shared/todos'
import BoardColumnView from '../components/board/BoardColumnView'
import BoardFilterBar from '../components/board/BoardFilterBar'
import BoardHeader, { type BoardViewMode } from '../components/board/BoardHeader'
import BoardListView from '../components/board/BoardListView'
import BoardSettingsDialog from '../components/board/BoardSettingsDialog'
import CardDetailPanel from '../components/board/CardDetailPanel'
import { buildStarterCards, copyText, newId } from '../components/board/boardMeta'
import { BoardSkeleton } from '../components/ui/skeletons'
import { useToast } from '../components/ui/toast'

const ACTIVE_BOARD_KEY = 'deskup.activeBoard'
const BOARD_VIEW_KEY = 'deskup.boardView'
const SAVE_DELAY_MS = 350

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
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
  const [activeId, setActiveId] = useState<string | null>(() => readStorage(ACTIVE_BOARD_KEY))
  const [viewMode, setViewMode] = useState<BoardViewMode>(() => (readStorage(BOARD_VIEW_KEY) === 'list' ? 'list' : 'board'))
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState<CardType[]>([])
  const [priorities, setPriorities] = useState<CardPriority[]>([])
  const [label, setLabel] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [sort, setSort] = useState<CardSort>('manual')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null)
  const [listDraft, setListDraft] = useState('')
  const [settings, setSettings] = useState<'new' | 'edit' | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
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

  const changeViewMode = (mode: BoardViewMode) => {
    setViewMode(mode)
    setQuickAddColumn(null)
    try {
      localStorage.setItem(BOARD_VIEW_KEY, mode)
    } catch {
      // Convenience only.
    }
  }

  const today = localDateKey()
  const boardCards = useMemo(() => (data && board ? data.cards.filter((c) => c.boardId === board.id) : []), [data, board])
  const visibleCards = useMemo(
    () => (board ? filterCards(boardCards, board, { query, types, priorities, label: label || undefined, overdueOnly, today }) : []),
    [boardCards, board, query, types, priorities, label, overdueOnly, today]
  )
  const allLabels = useMemo(() => [...new Set(boardCards.flatMap((c) => c.labels))].sort(), [boardCards])
  const selected = useMemo(() => boardCards.find((c) => c.id === selectedId) ?? null, [boardCards, selectedId])
  const filtersActive = !!query || types.length > 0 || priorities.length > 0 || !!label || overdueOnly

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

  const advanceCard = useCallback(
    (card: BoardCard) => {
      if (!board) return
      const nextId = nextColumnId(board, card.columnId)
      if (!nextId) return
      const nextCol = board.columns.find((c) => c.id === nextId)
      moveToColumn(card.id, nextId)
      if (nextCol) toast(`Moved ${cardKey(board, card)} to ${nextCol.name}`, 'info')
    },
    [board, moveToColumn, toast]
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

  const clearDoneColumn = useCallback(
    (columnId: string) => {
      if (!board || !data) return
      const removed = data.cards.filter((c) => c.boardId === board.id && c.columnId === columnId)
      if (removed.length === 0) return
      const removedIds = new Set(removed.map((c) => c.id))
      if (selectedId && removedIds.has(selectedId)) setSelectedId(null)
      commit((d) => ({ ...d, cards: d.cards.filter((c) => !removedIds.has(c.id)) }))
      toast(`Cleared ${removed.length} completed card${removed.length === 1 ? '' : 's'}`, 'info', {
        label: 'Undo',
        onClick: () =>
          commit((d) => {
            const existing = new Set(d.cards.map((c) => c.id))
            return { ...d, cards: [...d.cards, ...removed.filter((c) => !existing.has(c.id))] }
          })
      })
    },
    [board, data, selectedId, commit, toast]
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

  const copyCardKey = useCallback((key: string) => void copyText(key).then(() => toast(`Copied ${key}`, 'info')), [toast])
  const copyCardBranch = useCallback(
    (card: BoardCard) => {
      if (!board) return
      const name = branchName(board, card)
      void copyText(name).then(() => toast(`Copied branch: ${name}`, 'info'))
    },
    [board, toast]
  )

  const seedStarterCards = useCallback(() => {
    if (!board) return
    const { cards: seeded, nextNumber } = buildStarterCards(board)
    const seededIds = new Set(seeded.map((c) => c.id))
    const prevNext = board.nextNumber
    commit((d) => ({
      boards: d.boards.map((b) => (b.id === board.id ? { ...b, nextNumber } : b)),
      cards: [...d.cards, ...seeded]
    }))
    toast('Added 4 starter developer cards', 'success', {
      label: 'Undo',
      onClick: () =>
        commit((d) => ({
          boards: d.boards.map((b) => (b.id === board.id ? { ...b, nextNumber: prevNext } : b)),
          cards: d.cards.filter((c) => !seededIds.has(c.id))
        }))
    })
  }, [board, commit, toast])

  // ---- board actions
  const saveBoardSettings = (draft: { name: string; key: string; columns: BoardColumn[] }) => {
    if (settings === 'new') {
      const created = { ...createBoard(draft.name, draft.key, newId()) }
      commit((d) => ({ ...d, boards: [...d.boards, created] }))
      setActiveId(created.id)
      toast(`Created board “${created.name}”`)
    } else if (board) {
      commit((d) => ({
        ...d,
        boards: d.boards.map((b) => (b.id === board.id ? { ...b, name: draft.name, key: draft.key, columns: draft.columns } : b))
      }))
    }
    setSettings(null)
  }

  const deleteBoard = () => {
    if (!board || !data || data.boards.length <= 1) return
    const removedBoard = board
    const removedCards = boardCards
    commit((d) => ({ boards: d.boards.filter((b) => b.id !== removedBoard.id), cards: d.cards.filter((c) => c.boardId !== removedBoard.id) }))
    setActiveId(null)
    setSelectedId(null)
    setSettings(null)
    toast(`Deleted board “${removedBoard.name}”`, 'info', {
      label: 'Undo',
      onClick: () => {
        commit((d) => ({
          boards: d.boards.some((b) => b.id === removedBoard.id) ? d.boards : [...d.boards, removedBoard],
          cards: [...d.cards, ...removedCards.filter((c) => !d.cards.some((x) => x.id === c.id))]
        }))
        setActiveId(removedBoard.id)
      }
    })
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
  const overdueCount = openCards.filter((c) => !!c.dueDate && c.dueDate < today).length
  const weekAgo = Date.now() - 7 * 86_400_000
  const doneThisWeek = boardCards.filter((c) => c.completedAt && c.completedAt >= weekAgo)
  const cardCounts = Object.fromEntries(board.columns.map((c) => [c.id, boardCards.filter((x) => x.columnId === c.id).length]))
  const boardCardCounts = Object.fromEntries(data.boards.map((b) => [b.id, data.cards.filter((c) => c.boardId === b.id).length]))

  const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-3.5">
      <BoardHeader
        boards={data.boards}
        activeBoard={board}
        boardCardCounts={boardCardCounts}
        openCount={openCards.length}
        pointsInFlight={openCards.reduce((s, c) => s + (c.estimate ?? 0), 0)}
        doneThisWeekCount={doneThisWeek.length}
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
        query={query}
        onQueryChange={setQuery}
        searchRef={searchRef}
        onSelectBoard={(id) => {
          setActiveId(id)
          setSelectedId(null)
        }}
        onOpenSettings={setSettings}
        onCopyMarkdown={() => void copyText(boardToMarkdown(board, boardCards)).then(() => toast('Board copied as Markdown'))}
        onCopyStandup={() => void copyText(boardToStandup(board, boardCards)).then(() => toast('Standup update copied'))}
        onCopyBranches={() => {
          const text = boardBranches(board, boardCards)
          if (!text) return toast('No active cards to copy branches from', 'info')
          void copyText(text).then(() => toast('Active git branch names copied'))
        }}
      />

      <BoardFilterBar
        types={types}
        priorities={priorities}
        label={label}
        allLabels={allLabels}
        overdueOnly={overdueOnly}
        overdueCount={overdueCount}
        sort={sort}
        filtersActive={filtersActive}
        onToggleType={(t) => setTypes((v) => toggle(v, t))}
        onTogglePriority={(p) => setPriorities((v) => toggle(v, p))}
        onToggleLabel={(l) => setLabel(label === l ? '' : l)}
        onToggleOverdue={() => setOverdueOnly((v) => !v)}
        onSortChange={setSort}
        onClearAll={() => {
          setQuery('')
          setTypes([])
          setPriorities([])
          setLabel('')
          setOverdueOnly(false)
        }}
      />

      {boardCards.length === 0 && !bannerDismissed && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs">
          <Terminal className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span className="text-text">
            Quick-add with <code className="rounded bg-elevated px-1 py-0.5 font-mono text-[11px]">fix: auth timeout #api !high ~3</code> or press{' '}
            <kbd className="rounded border border-border bg-elevated px-1 font-mono text-[10px]">N</kbd> anywhere.
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={seedStarterCards}
              className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Load sample cards
            </button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss tip"
              className="rounded p-1 text-muted hover:bg-elevated hover:text-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {viewMode === 'board' ? (
        <div className="-mx-2 flex min-h-0 flex-1 gap-3 overflow-x-auto px-2 pb-2">
          {board.columns.map((column, idx) => {
            const stats = columnStats(boardCards, column)
            const nextColId = nextColumnId(board, column.id)
            const nextColName = nextColId ? board.columns.find((c) => c.id === nextColId)?.name ?? null : null
            const colList = columnCards(visibleCards, column.id)
            const sortedList = sort === 'manual' ? colList : sortCards(colList, sort)

            return (
              <BoardColumnView
                key={column.id}
                board={board}
                column={column}
                columnIndex={idx}
                nextColumnName={nextColName}
                cards={sortedList}
                totalCount={stats.count}
                points={stats.points}
                selectedId={selectedId}
                draggingId={draggingId}
                quickAddOpen={quickAddColumn === column.id}
                onQuickAddOpenChange={(open) => setQuickAddColumn(open ? column.id : null)}
                onQuickAdd={addCard}
                onClearDone={clearDoneColumn}
                onOpenCard={setSelectedId}
                onCopyKey={copyCardKey}
                onCopyBranch={copyCardBranch}
                onAdvance={advanceCard}
                onFocus={focusOnCard}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                onDrop={dropCard}
              />
            )
          })}
        </div>
      ) : (
        <>
          {quickAddColumn && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (listDraft.trim()) {
                  addCard(quickAddColumn, listDraft)
                  setListDraft('')
                }
              }}
              className="flex items-center gap-2 rounded-xl border border-indigo-500/60 bg-surface px-3 py-2"
            >
              <select
                value={quickAddColumn}
                onChange={(e) => setQuickAddColumn(e.target.value)}
                aria-label="Target column"
                className="h-7 rounded border border-border bg-background px-2 text-xs text-text focus:outline-none"
              >
                {board.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                autoFocus
                value={listDraft}
                onChange={(e) => setListDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQuickAddColumn(null)}
                placeholder="feat: add webhook retries #api !high ~3"
                className="h-7 flex-1 bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
              />
              <button
                type="submit"
                disabled={!parseQuickAdd(listDraft).title}
                className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setListDraft('')
                  setQuickAddColumn(null)
                }}
                className="rounded p-1 text-muted hover:text-text"
                aria-label="Close quick add"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
          <BoardListView
            board={board}
            cards={visibleCards}
            sort={sort}
            selectedId={selectedId}
            onOpenCard={setSelectedId}
            onMoveColumn={moveToColumn}
            onCopyKey={copyCardKey}
            onCopyBranch={copyCardBranch}
            onFocus={focusOnCard}
            onQuickAddColumn={(colId) => setQuickAddColumn(colId)}
          />
        </>
      )}

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
