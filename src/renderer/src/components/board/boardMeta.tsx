import type React from 'react'
import {
  Lightbulb,
  Bug,
  Wrench,
  RefreshCcw,
  BookOpen,
  FlaskConical,
  ChevronsUp,
  ChevronUp,
  Equal,
  ChevronDown
} from 'lucide-react'
import type { Board, BoardCard, BoardColumn, CardPriority, CardType } from '../../../../shared/board'

type Icon = React.ComponentType<{ className?: string }>

export const TYPE_META: Record<CardType, { label: string; icon: Icon; tone: string }> = {
  feature: { label: 'Feature', icon: Lightbulb, tone: 'text-indigo-600 dark:text-indigo-400' },
  bug: { label: 'Bug', icon: Bug, tone: 'text-rose-600 dark:text-rose-400' },
  chore: { label: 'Chore', icon: Wrench, tone: 'text-muted' },
  refactor: { label: 'Refactor', icon: RefreshCcw, tone: 'text-violet-600 dark:text-violet-400' },
  docs: { label: 'Docs', icon: BookOpen, tone: 'text-sky-600 dark:text-sky-400' },
  spike: { label: 'Spike', icon: FlaskConical, tone: 'text-amber-600 dark:text-amber-400' }
}

export const PRIORITY_META: Record<CardPriority, { label: string; icon: Icon; tone: string }> = {
  urgent: { label: 'Urgent', icon: ChevronsUp, tone: 'text-rose-600 dark:text-rose-400' },
  high: { label: 'High', icon: ChevronUp, tone: 'text-orange-500' },
  medium: { label: 'Medium', icon: Equal, tone: 'text-muted' },
  low: { label: 'Low', icon: ChevronDown, tone: 'text-sky-500' }
}

// Muted, stable colours for free-form labels (hash of the label text).
const LABEL_TONES = [
  'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  'bg-teal-500/10 text-teal-700 dark:text-teal-300'
]

export function labelTone(label: string): string {
  let hash = 0
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return LABEL_TONES[hash % LABEL_TONES.length]
}

export function newId(): string {
  return crypto.randomUUID()
}

export async function copyText(text: string): Promise<void> {
  // Goes through Deskup's clipboard service so it also lands in clipboard history.
  await window.deskup.clipboard.copy(text)
}

/** Subtle status dot colour for each column based on its role/name. */
export function columnAccent(column: BoardColumn, index: number): string {
  if (column.done) return 'bg-emerald-500'
  const n = column.name.toLowerCase()
  if (n.includes('backlog')) return 'bg-zinc-400 dark:bg-zinc-500'
  if (n.includes('to do') || n.includes('todo')) return 'bg-sky-500'
  if (n.includes('progress') || n.includes('doing')) return 'bg-indigo-500'
  if (n.includes('review') || n.includes('qa') || n.includes('test')) return 'bg-amber-500'
  const fallback = ['bg-zinc-400', 'bg-sky-500', 'bg-indigo-500', 'bg-amber-500', 'bg-emerald-500']
  return fallback[index % fallback.length]
}

export const QUICK_ADD_TOKENS = ['feat:', 'fix:', 'refactor:', '!high', '~2', '~3', '~5'] as const

export const DESCRIPTION_TEMPLATES: { id: string; label: string; body: string }[] = [
  {
    id: 'bug',
    label: 'Bug report',
    body: '## Steps to reproduce\n1. \n\n## Expected\n\n## Actual\n\n## Notes\n'
  },
  {
    id: 'feature',
    label: 'Feature spec',
    body: '## Context\n\n## Acceptance criteria\n- [ ] \n- [ ] \n\n## Edge cases\n'
  },
  {
    id: 'spike',
    label: 'Tech spike',
    body: '## Goal\n\n## Options considered\n- \n\n## Decision / Next steps\n'
  }
]

/** Ready-made sample dev tasks for an empty board so developers can try the workflow immediately. */
export function buildStarterCards(board: Board, now = Date.now()): { cards: BoardCard[]; nextNumber: number } {
  const findCol = (pattern: RegExp, fallbackIdx: number) =>
    board.columns.find((c) => pattern.test(c.name)) ?? board.columns[Math.min(fallbackIdx, board.columns.length - 1)]

  const backlog = findCol(/backlog/i, 0)
  const todo = findCol(/to ?do/i, 1)
  const progress = findCol(/progress/i, 2)
  const done = board.columns.find((c) => c.done) ?? board.columns[board.columns.length - 1]

  const specs: Array<{
    col: BoardColumn
    title: string
    type: CardType
    priority: CardPriority
    labels: string[]
    estimate: number
    description: string
    checklist: string[]
  }> = [
    {
      col: progress,
      title: 'Fix auth token refresh race on concurrent requests',
      type: 'bug',
      priority: 'high',
      labels: ['auth', 'api'],
      estimate: 3,
      description: '## Context\nConcurrent 401 responses trigger duplicate refresh calls.\n\n## Acceptance criteria\n- [ ] Share one in-flight refresh promise',
      checklist: ['Reproduce with parallel requests', 'Add shared refresh lock', 'Verify retry queue']
    },
    {
      col: todo,
      title: 'Add health check endpoint and structured error logs',
      type: 'feature',
      priority: 'medium',
      labels: ['backend'],
      estimate: 2,
      description: '## Context\nExpose `/healthz` for uptime checks and include request IDs in error logs.',
      checklist: ['Add /healthz route', 'Attach requestId middleware']
    },
    {
      col: backlog,
      title: 'Extract shared HTTP retry helper across service clients',
      type: 'refactor',
      priority: 'low',
      labels: ['core'],
      estimate: 5,
      description: 'Consolidate exponential backoff logic into a single utility.',
      checklist: []
    },
    {
      col: done,
      title: 'Document local environment setup and test commands',
      type: 'docs',
      priority: 'low',
      labels: ['docs'],
      estimate: 1,
      description: 'Updated README with env vars and quick test commands.',
      checklist: []
    }
  ]

  let nextNumber = board.nextNumber
  const orderByCol = new Map<string, number>()
  const cards: BoardCard[] = specs.map((s) => {
    const order = orderByCol.get(s.col.id) ?? 0
    orderByCol.set(s.col.id, order + 1)
    const card: BoardCard = {
      id: newId(),
      boardId: board.id,
      number: nextNumber++,
      columnId: s.col.id,
      order,
      title: s.title,
      description: s.description,
      type: s.type,
      priority: s.priority,
      labels: s.labels,
      estimate: s.estimate,
      links: [],
      checklist: s.checklist.map((text) => ({ id: newId(), text, done: !!s.col.done })),
      createdAt: now,
      updatedAt: now,
      ...(s.col.done ? { completedAt: now } : {})
    }
    return card
  })
  return { cards, nextNumber }
}
