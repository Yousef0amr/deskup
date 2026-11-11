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
import type { CardPriority, CardType } from '../../../../shared/board'

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
