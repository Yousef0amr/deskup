// Developer Kanban board: data model, validation and pure helpers (shared by main + renderer).
import { isDateKey, localDateKey } from './todos'

export type CardType = 'feature' | 'bug' | 'chore' | 'refactor' | 'docs' | 'spike'
export type CardPriority = 'urgent' | 'high' | 'medium' | 'low'

export interface BoardColumn {
  id: string
  name: string
  /** Max cards before the column is flagged as over its WIP limit. */
  wipLimit?: number
  /** Cards moved here count as finished (completedAt is set). */
  done?: boolean
}

export interface Board {
  id: string
  name: string
  /** Short uppercase prefix for card keys, e.g. DSK → DSK-12. */
  key: string
  nextNumber: number
  columns: BoardColumn[]
  createdAt: number
}

export interface CardLink {
  id: string
  label: string
  url: string
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface BoardCard {
  id: string
  boardId: string
  number: number
  columnId: string
  order: number
  title: string
  description: string
  type: CardType
  priority: CardPriority
  labels: string[]
  estimate?: number
  dueDate?: string
  links: CardLink[]
  checklist: ChecklistItem[]
  createdAt: number
  updatedAt: number
  completedAt?: number
}

export interface BoardData {
  boards: Board[]
  cards: BoardCard[]
}

export const CARD_TYPES: CardType[] = ['feature', 'bug', 'chore', 'refactor', 'docs', 'spike']
export const CARD_PRIORITIES: CardPriority[] = ['urgent', 'high', 'medium', 'low']
export const ESTIMATES = [1, 2, 3, 5, 8, 13]

/** Conventional Commits type for each card type. */
export const COMMIT_PREFIX: Record<CardType, string> = {
  feature: 'feat',
  bug: 'fix',
  chore: 'chore',
  refactor: 'refactor',
  docs: 'docs',
  spike: 'chore'
}

/** Git branch folder for each card type. */
const BRANCH_PREFIX: Record<CardType, string> = {
  feature: 'feat',
  bug: 'fix',
  chore: 'chore',
  refactor: 'refactor',
  docs: 'docs',
  spike: 'spike'
}

const LIMITS = { boards: 50, cards: 5000, title: 200, description: 20000, labels: 12, label: 32, links: 20, checklist: 100 }

export function emptyBoardData(): BoardData {
  return { boards: [], cards: [] }
}

export function createBoard(name: string, key: string, id: string, now = Date.now()): Board {
  return {
    id,
    name: name.trim() || 'Board',
    key: normalizeKey(key) || 'DEV',
    nextNumber: 1,
    createdAt: now,
    columns: [
      { id: `${id}-backlog`, name: 'Backlog' },
      { id: `${id}-todo`, name: 'To do' },
      { id: `${id}-progress`, name: 'In progress', wipLimit: 3 },
      { id: `${id}-review`, name: 'Review', wipLimit: 3 },
      { id: `${id}-done`, name: 'Done', done: true }
    ]
  }
}

export function normalizeKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

export function cardKey(board: Pick<Board, 'key'>, card: Pick<BoardCard, 'number'>): string {
  return `${board.key}-${card.number}`
}

export function slugify(text: string, max = 48): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.slice(0, max).replace(/-+$/g, '')
}

/** e.g. feat/DSK-12-add-oauth-login */
export function branchName(board: Pick<Board, 'key'>, card: Pick<BoardCard, 'number' | 'title' | 'type'>): string {
  const slug = slugify(card.title)
  return `${BRANCH_PREFIX[card.type]}/${cardKey(board, card)}${slug ? `-${slug}` : ''}`
}

/** Conventional commit subject, e.g. feat(DSK-12): add OAuth login */
export function commitMessage(board: Pick<Board, 'key'>, card: Pick<BoardCard, 'number' | 'title' | 'type'>): string {
  const subject = card.title.trim().replace(/\s+/g, ' ')
  const lowered = subject.charAt(0).toLowerCase() + subject.slice(1)
  return `${COMMIT_PREFIX[card.type]}(${cardKey(board, card)}): ${lowered}`
}

/** Cards of one column, in display order. */
export function columnCards(cards: BoardCard[], columnId: string): BoardCard[] {
  return cards.filter((c) => c.columnId === columnId).sort((a, b) => a.order - b.order)
}

/**
 * Move a card to `toColumnId` at position `toIndex` (index within that column, after removing
 * the card). Re-numbers `order` in the affected columns and maintains completedAt.
 */
export function moveCard(
  cards: BoardCard[],
  board: Board,
  cardId: string,
  toColumnId: string,
  toIndex: number,
  now = Date.now()
): BoardCard[] {
  const card = cards.find((c) => c.id === cardId)
  const target = board.columns.find((c) => c.id === toColumnId)
  if (!card || !target) return cards

  const fromColumnId = card.columnId
  const destination = columnCards(cards, toColumnId).filter((c) => c.id !== cardId)
  const index = Math.max(0, Math.min(toIndex, destination.length))
  const wasDone = !!board.columns.find((c) => c.id === fromColumnId)?.done
  const moved: BoardCard = {
    ...card,
    columnId: toColumnId,
    updatedAt: fromColumnId === toColumnId ? card.updatedAt : now,
    completedAt: target.done ? (wasDone ? card.completedAt ?? now : now) : undefined
  }
  destination.splice(index, 0, moved)

  const newOrder = new Map<string, number>()
  destination.forEach((c, i) => newOrder.set(c.id, i))
  if (fromColumnId !== toColumnId) {
    columnCards(cards, fromColumnId)
      .filter((c) => c.id !== cardId)
      .forEach((c, i) => newOrder.set(c.id, i))
  }

  return cards.map((c) => {
    const base = c.id === cardId ? moved : c
    const order = newOrder.get(c.id)
    return order === undefined || order === base.order ? base : { ...base, order }
  })
}

export type CardSort = 'manual' | 'priority' | 'due' | 'newest'

const PRIORITY_RANK: Record<CardPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export interface CardFilter {
  query?: string
  types?: CardType[]
  priorities?: CardPriority[]
  label?: string
  overdueOnly?: boolean
  today?: string
}

export function filterCards(cards: BoardCard[], board: Pick<Board, 'key'>, filter: CardFilter): BoardCard[] {
  const q = filter.query?.trim().toLowerCase()
  const today = filter.today ?? (filter.overdueOnly ? localDateKey() : '')
  return cards.filter((c) => {
    if (filter.types?.length && !filter.types.includes(c.type)) return false
    if (filter.priorities?.length && !filter.priorities.includes(c.priority)) return false
    if (filter.label && !c.labels.includes(filter.label)) return false
    if (filter.overdueOnly && (!!c.completedAt || !c.dueDate || c.dueDate >= today)) return false
    if (!q) return true
    return (
      cardKey(board, c).toLowerCase() === q ||
      cardKey(board, c).toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.labels.some((l) => l.toLowerCase().includes(q))
    )
  })
}

export function sortCards(cards: BoardCard[], sort: CardSort): BoardCard[] {
  if (sort === 'manual') return [...cards].sort((a, b) => a.order - b.order)
  return [...cards].sort((a, b) => {
    if (sort === 'priority') {
      const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      if (diff !== 0) return diff
    } else if (sort === 'due') {
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate !== b.dueDate) return a.dueDate ? -1 : 1
    } else if (sort === 'newest') {
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt
    }
    return a.order - b.order
  })
}

export function nextColumnId(board: Pick<Board, 'columns'>, currentColumnId: string): string | null {
  const idx = board.columns.findIndex((c) => c.id === currentColumnId)
  if (idx < 0 || idx >= board.columns.length - 1) return null
  return board.columns[idx + 1].id
}

export function columnStats(cards: BoardCard[], column: BoardColumn): { count: number; points: number; overLimit: boolean } {
  const inColumn = cards.filter((c) => c.columnId === column.id)
  return {
    count: inColumn.length,
    points: inColumn.reduce((sum, c) => sum + (c.estimate ?? 0), 0),
    overLimit: !!column.wipLimit && inColumn.length > column.wipLimit
  }
}

/** Markdown snapshot of a board, grouped by column — handy for stand-ups and PR descriptions. */
export function boardToMarkdown(board: Board, cards: BoardCard[]): string {
  const lines = [`# ${board.name}`, '']
  for (const column of board.columns) {
    const list = columnCards(cards, column.id)
    if (!list.length) continue
    lines.push(`## ${column.name} (${list.length})`, '')
    for (const c of list) {
      const meta = [c.type, c.priority !== 'medium' ? c.priority : '', c.estimate ? `${c.estimate} pts` : '']
        .filter(Boolean)
        .join(' · ')
      lines.push(`- ${column.done ? '[x]' : '[ ]'} **${cardKey(board, c)}** ${c.title}${meta ? ` _(${meta})_` : ''}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim() + '\n'
}

/** Concise daily standup update: recently completed + currently in flight. */
export function boardToStandup(board: Board, cards: BoardCard[], now = Date.now()): string {
  const cutoff = now - 2 * 86_400_000
  const doneCols = new Set(board.columns.filter((c) => c.done).map((c) => c.id))
  const activeCols = board.columns.filter((c) => !c.done && !/^backlog$/i.test(c.name.trim()))
  const recentDone = cards
    .filter((c) => doneCols.has(c.columnId) && (c.completedAt ?? 0) >= cutoff)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  const lines = [`**${board.name} — Standup**`, '']
  lines.push('**Done recently**')
  if (recentDone.length) {
    for (const c of recentDone) lines.push(`- **${cardKey(board, c)}** ${c.title}`)
  } else {
    lines.push('- _None_')
  }
  lines.push('', '**Up next / In progress**')
  let activeCount = 0
  for (const col of activeCols) {
    for (const c of columnCards(cards, col.id)) {
      lines.push(`- **${cardKey(board, c)}** ${c.title} _(${col.name})_`)
      activeCount++
    }
  }
  if (activeCount === 0) lines.push('- _None_')
  return lines.join('\n') + '\n'
}

/** Active git branch names for non-done cards, in column order. */
export function boardBranches(board: Board, cards: BoardCard[]): string {
  const lines: string[] = []
  for (const col of board.columns) {
    if (col.done) continue
    for (const c of columnCards(cards, col.id)) {
      lines.push(branchName(board, c))
    }
  }
  return lines.join('\n')
}

const TYPE_ALIASES: Record<string, CardType> = {
  feat: 'feature', feature: 'feature', fix: 'bug', bug: 'bug', chore: 'chore',
  refactor: 'refactor', docs: 'docs', doc: 'docs', spike: 'spike'
}
const PRIORITY_ALIASES: Record<string, CardPriority> = {
  urgent: 'urgent', p0: 'urgent', high: 'high', p1: 'high', medium: 'medium', med: 'medium', p2: 'medium', low: 'low', p3: 'low'
}

/**
 * Quick-add syntax for power users:
 *   `bug: crash on save #auth #api !high ~3`
 *   → type bug, labels [auth, api], priority high, estimate 3, title "crash on save"
 */
export function parseQuickAdd(input: string): {
  title: string
  type?: CardType
  priority?: CardPriority
  labels: string[]
  estimate?: number
} {
  let text = input.trim()
  let type: CardType | undefined
  const prefix = text.match(/^([a-z]+)(\([^)]*\))?:\s*/i)
  if (prefix && TYPE_ALIASES[prefix[1].toLowerCase()]) {
    type = TYPE_ALIASES[prefix[1].toLowerCase()]
    text = text.slice(prefix[0].length)
  }
  const labels: string[] = []
  let priority: CardPriority | undefined
  let estimate: number | undefined
  const words = text.split(/\s+/).filter((word) => {
    const label = word.match(/^#([\w-]{1,32})$/)
    if (label) return labels.push(label[1].toLowerCase()), false
    const prio = word.match(/^!(\w+)$/)
    if (prio && PRIORITY_ALIASES[prio[1].toLowerCase()]) return (priority = PRIORITY_ALIASES[prio[1].toLowerCase()]), false
    const points = word.match(/^~(\d{1,3})$/)
    if (points) return (estimate = Number(points[1])), false
    return true
  })
  return { title: words.join(' ').trim(), type, priority, labels: [...new Set(labels)], estimate }
}

// ---------------------------------------------------------------------------
// Validation (data crosses the IPC boundary and comes back from backups)
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>
function obj(value: unknown, what: string): Raw {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${what}`)
  return value as Raw
}
function str(value: unknown, what: string, max: number, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) throw new Error(`Invalid ${what}`)
  return value.slice(0, max)
}
function num(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${what}`)
  return value
}
function uniqueIds<T extends { id: string }>(items: T[], what: string): T[] {
  const seen = new Set<string>()
  for (const item of items) {
    if (!item.id || seen.has(item.id)) throw new Error(`Missing or duplicate ${what} ID`)
    seen.add(item.id)
  }
  return items
}
function safeUrl(value: unknown): string {
  const url = str(value, 'link URL', 2000)
  const protocol = new URL(url).protocol
  if (protocol !== 'http:' && protocol !== 'https:') throw new Error('Links must use http or https')
  return url
}

export function validateBoardData(value: unknown): BoardData {
  const raw = obj(value, 'board data')
  if (!Array.isArray(raw.boards) || !Array.isArray(raw.cards)) throw new Error('Board data needs boards and cards lists')
  if (raw.boards.length > LIMITS.boards || raw.cards.length > LIMITS.cards) throw new Error('Too many boards or cards')

  const boards = uniqueIds(
    raw.boards.map((b): Board => {
      const row = obj(b, 'board')
      if (!Array.isArray(row.columns) || row.columns.length === 0 || row.columns.length > 12) throw new Error('A board needs 1–12 columns')
      const key = normalizeKey(str(row.key, 'board key', 12))
      if (!key) throw new Error('Invalid board key')
      return {
        id: str(row.id, 'board ID', 64),
        name: str(row.name, 'board name', 60).trim(),
        key,
        nextNumber: Math.max(1, Math.floor(num(row.nextNumber, 'next card number'))),
        createdAt: num(row.createdAt, 'board creation time'),
        columns: uniqueIds(
          row.columns.map((c): BoardColumn => {
            const col = obj(c, 'column')
            const wip = col.wipLimit === undefined || col.wipLimit === null ? undefined : Math.floor(num(col.wipLimit, 'WIP limit'))
            return {
              id: str(col.id, 'column ID', 80),
              name: str(col.name, 'column name', 40).trim(),
              ...(wip && wip > 0 ? { wipLimit: Math.min(wip, 99) } : {}),
              ...(col.done === true ? { done: true } : {})
            }
          }),
          'column'
        )
      }
    }),
    'board'
  )

  const columnsByBoard = new Map(boards.map((b) => [b.id, new Set(b.columns.map((c) => c.id))]))
  const cards = uniqueIds(
    raw.cards.map((c): BoardCard => {
      const row = obj(c, 'card')
      const boardId = str(row.boardId, 'card board', 64)
      const columnId = str(row.columnId, 'card column', 80)
      if (!columnsByBoard.get(boardId)?.has(columnId)) throw new Error('Card points to a missing board or column')
      if (!CARD_TYPES.includes(row.type as CardType)) throw new Error('Invalid card type')
      if (!CARD_PRIORITIES.includes(row.priority as CardPriority)) throw new Error('Invalid card priority')
      if (row.dueDate !== undefined && !isDateKey(row.dueDate)) throw new Error('Invalid card due date')
      if (!Array.isArray(row.labels) || !Array.isArray(row.links) || !Array.isArray(row.checklist)) throw new Error('Invalid card lists')
      const estimate = row.estimate === undefined ? undefined : num(row.estimate, 'estimate')
      return {
        id: str(row.id, 'card ID', 64),
        boardId,
        columnId,
        number: Math.max(1, Math.floor(num(row.number, 'card number'))),
        order: num(row.order, 'card order'),
        title: str(row.title, 'card title', LIMITS.title).trim(),
        description: str(row.description ?? '', 'card description', LIMITS.description, true),
        type: row.type as CardType,
        priority: row.priority as CardPriority,
        labels: [...new Set(row.labels.slice(0, LIMITS.labels).map((l) => str(l, 'label', LIMITS.label).trim().toLowerCase()))].filter(Boolean),
        ...(estimate !== undefined && estimate >= 0 ? { estimate: Math.min(estimate, 100) } : {}),
        ...(row.dueDate !== undefined ? { dueDate: row.dueDate as string } : {}),
        links: uniqueIds(
          row.links.slice(0, LIMITS.links).map((l) => {
            const link = obj(l, 'link')
            return { id: str(link.id, 'link ID', 64), label: str(link.label ?? '', 'link label', 80, true), url: safeUrl(link.url) }
          }),
          'link'
        ),
        checklist: uniqueIds(
          row.checklist.slice(0, LIMITS.checklist).map((i) => {
            const item = obj(i, 'checklist item')
            if (typeof item.done !== 'boolean') throw new Error('Invalid checklist state')
            return { id: str(item.id, 'checklist ID', 64), text: str(item.text, 'checklist text', 300).trim(), done: item.done }
          }),
          'checklist item'
        ),
        createdAt: num(row.createdAt, 'card creation time'),
        updatedAt: num(row.updatedAt, 'card update time'),
        ...(row.completedAt !== undefined ? { completedAt: num(row.completedAt, 'completion time') } : {})
      }
    }),
    'card'
  )

  // Keep numbering monotonic even if a backup was edited by hand.
  for (const board of boards) {
    const highest = cards.filter((c) => c.boardId === board.id).reduce((max, c) => Math.max(max, c.number), 0)
    board.nextNumber = Math.max(board.nextNumber, highest + 1)
  }
  return { boards, cards }
}
