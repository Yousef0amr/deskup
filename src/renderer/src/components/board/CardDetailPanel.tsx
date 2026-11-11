import React, { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  X,
  Copy,
  Check,
  GitBranch,
  Terminal,
  GitCommitHorizontal,
  Link2,
  ExternalLink,
  Plus,
  Trash2,
  Play,
  CopyPlus,
  Hash
} from 'lucide-react'
import type { Board, BoardCard, CardPriority, CardType } from '../../../../shared/board'
import { CARD_PRIORITIES, CARD_TYPES, ESTIMATES, branchName, cardKey, commitMessage } from '../../../../shared/board'
import MarkdownPreview from '../MarkdownPreview'
import { PRIORITY_META, TYPE_META, copyText, labelTone, newId } from './boardMeta'
import { useToast } from '../ui/toast'
import { cn } from '../../lib/utils'

interface CardDetailPanelProps {
  board: Board
  card: BoardCard | null
  onClose: () => void
  onUpdate: (id: string, patch: Partial<BoardCard>) => void
  onMove: (id: string, columnId: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onFocus: (card: BoardCard) => void
}

/** Turn common PR / issue URLs into a short label. */
function autoLinkLabel(url: string): string {
  const gh = url.match(/github\.com\/[^/]+\/([^/]+)\/(pull|issues)\/(\d+)/i)
  if (gh) return `${gh[2].toLowerCase() === 'pull' ? 'PR' : 'Issue'} #${gh[3]} · ${gh[1]}`
  const gl = url.match(/gitlab\.[^/]+\/.+?\/([^/]+)\/-\/(merge_requests|issues)\/(\d+)/i)
  if (gl) return `${gl[2].startsWith('merge') ? 'MR' : 'Issue'} !${gl[3]} · ${gl[1]}`
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2 py-1">
      <span className="text-xs text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const selectClass =
  'h-7 w-full rounded-md border border-border bg-surface px-2 text-xs text-text hover:border-hover focus:border-indigo-500 focus:outline-none'

function CopyRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void copyText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        })
      }}
      title={`Copy ${label.toLowerCase()}`}
      className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-elevated"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
      <span className="w-16 shrink-0 text-[11px] text-muted">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-text">{value}</code>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100" />}
    </button>
  )
}

export default function CardDetailPanel({ board, card, onClose, onUpdate, onMove, onDelete, onDuplicate, onFocus }: CardDetailPanelProps): React.JSX.Element {
  const [tab, setTab] = useState<'write' | 'preview'>('preview')
  const [labelDraft, setLabelDraft] = useState('')
  const [checkDraft, setCheckDraft] = useState('')
  const [linkDraft, setLinkDraft] = useState('')
  const toast = useToast()

  // Fresh card: start in preview if there's content, otherwise in write mode.
  useEffect(() => {
    setTab(card?.description ? 'preview' : 'write')
    setLabelDraft('')
    setCheckDraft('')
    setLinkDraft('')
  }, [card?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<BoardCard>) => card && onUpdate(card.id, patch)

  const addLabel = () => {
    if (!card) return
    const label = labelDraft.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-').slice(0, 32)
    if (label && !card.labels.includes(label) && card.labels.length < 12) update({ labels: [...card.labels, label] })
    setLabelDraft('')
  }

  const addLink = () => {
    if (!card) return
    const raw = linkDraft.trim()
    if (!raw) return
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
    } catch {
      toast('Enter a valid http(s) link', 'error')
      return
    }
    update({ links: [...card.links, { id: newId(), label: autoLinkLabel(url), url }] })
    setLinkDraft('')
  }

  const doneCount = card?.checklist.filter((i) => i.done).length ?? 0
  const key = card ? cardKey(board, card) : ''

  return (
    <DialogPrimitive.Root open={!!card} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/20 animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col border-l border-border bg-surface shadow-2xl animate-slide-in-right focus:outline-none"
        >
          {card && (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                {React.createElement(TYPE_META[card.type].icon, { className: cn('h-4 w-4', TYPE_META[card.type].tone) })}
                <button
                  type="button"
                  onClick={() => void copyText(key).then(() => toast(`Copied ${key}`, 'info'))}
                  className="flex items-center gap-1 rounded px-1 font-mono text-xs text-muted hover:bg-elevated hover:text-text"
                  title="Copy key"
                >
                  <Hash className="h-3 w-3" />
                  {key}
                </button>
                <div className="ml-auto flex items-center gap-0.5">
                  <button type="button" onClick={() => onFocus(card)} className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400" title="Start a focus session on this card">
                    <Play className="h-3.5 w-3.5 fill-current" /> Focus
                  </button>
                  <button type="button" onClick={() => onDuplicate(card.id)} className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-text" title="Duplicate" aria-label="Duplicate card">
                    <CopyPlus className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onDelete(card.id)} className="rounded-md p-1.5 text-muted hover:bg-rose-500/10 hover:text-rose-500" title="Delete" aria-label="Delete card">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <DialogPrimitive.Close className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-text" aria-label="Close">
                    <X className="h-4 w-4" />
                  </DialogPrimitive.Close>
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                {/* Title */}
                <DialogPrimitive.Title asChild>
                  <textarea
                    value={card.title}
                    rows={1}
                    onChange={(e) => update({ title: e.target.value.replace(/\n/g, ' ').slice(0, 200) })}
                    onBlur={(e) => !e.target.value.trim() && update({ title: 'Untitled' })}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto'
                        el.style.height = `${el.scrollHeight}px`
                      }
                    }}
                    aria-label="Title"
                    className="w-full resize-none overflow-hidden bg-transparent text-lg font-semibold leading-snug tracking-tight text-text focus:outline-none"
                  />
                </DialogPrimitive.Title>

                {/* Properties */}
                <div>
                  <Field label="Status">
                    <select className={selectClass} value={card.columnId} onChange={(e) => onMove(card.id, e.target.value)}>
                      {board.columns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Type">
                    <div className="flex flex-wrap gap-0.5">
                      {CARD_TYPES.map((t) => {
                        const meta = TYPE_META[t]
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => update({ type: t as CardType })}
                            aria-pressed={card.type === t}
                            className={cn('flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors', card.type === t ? 'bg-elevated font-medium text-text' : 'text-muted hover:text-text')}
                          >
                            <meta.icon className={cn('h-3.5 w-3.5', meta.tone)} />
                            {meta.label}
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                  <Field label="Priority">
                    <div className="flex flex-wrap gap-0.5">
                      {CARD_PRIORITIES.map((p) => {
                        const meta = PRIORITY_META[p]
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => update({ priority: p as CardPriority })}
                            aria-pressed={card.priority === p}
                            className={cn('flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors', card.priority === p ? 'bg-elevated font-medium text-text' : 'text-muted hover:text-text')}
                          >
                            <meta.icon className={cn('h-3.5 w-3.5', meta.tone)} />
                            {meta.label}
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                  <Field label="Estimate">
                    <div className="flex flex-wrap gap-0.5">
                      {ESTIMATES.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => update({ estimate: card.estimate === n ? undefined : n })}
                          aria-pressed={card.estimate === n}
                          className={cn('h-7 w-8 rounded-md font-mono text-xs tabular-nums transition-colors', card.estimate === n ? 'bg-indigo-600 text-white' : 'text-muted hover:bg-elevated hover:text-text')}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Due">
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={card.dueDate ?? ''}
                        onChange={(e) => update({ dueDate: e.target.value || undefined })}
                        className={cn(selectClass, 'w-40')}
                      />
                      {card.dueDate && (
                        <button type="button" onClick={() => update({ dueDate: undefined })} className="rounded p-1 text-muted hover:text-text" aria-label="Clear due date">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </Field>
                  <Field label="Labels">
                    <div className="flex flex-wrap items-center gap-1">
                      {card.labels.map((l) => (
                        <span key={l} className={cn('flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', labelTone(l))}>
                          {l}
                          <button type="button" onClick={() => update({ labels: card.labels.filter((x) => x !== l) })} aria-label={`Remove label ${l}`} className="opacity-60 hover:opacity-100">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={labelDraft}
                        onChange={(e) => setLabelDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            addLabel()
                          } else if (e.key === 'Backspace' && !labelDraft && card.labels.length) {
                            update({ labels: card.labels.slice(0, -1) })
                          }
                        }}
                        onBlur={addLabel}
                        placeholder={card.labels.length ? 'Add…' : 'frontend, api…'}
                        className="h-6 min-w-[80px] flex-1 bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
                      />
                    </div>
                  </Field>
                </div>

                {/* Git */}
                <section>
                  <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Git</h4>
                  <div className="rounded-lg border border-border">
                    <CopyRow icon={GitBranch} label="Branch" value={branchName(board, card)} />
                    <CopyRow icon={Terminal} label="Checkout" value={`git checkout -b ${branchName(board, card)}`} />
                    <CopyRow icon={GitCommitHorizontal} label="Commit" value={commitMessage(board, card)} />
                  </div>
                </section>

                {/* Description */}
                <section>
                  <div className="mb-1 flex items-center justify-between">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Description</h4>
                    <div className="flex gap-0.5">
                      {(['write', 'preview'] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setTab(t)} className={cn('h-6 rounded px-2 text-[11px] font-medium capitalize', tab === t ? 'bg-elevated text-text' : 'text-muted hover:text-text')}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {tab === 'write' ? (
                    <textarea
                      value={card.description}
                      onChange={(e) => update({ description: e.target.value })}
                      placeholder={'## Context\n\n## Acceptance criteria\n- [ ] …\n\nMarkdown supported.'}
                      className="min-h-[160px] w-full resize-y rounded-lg border border-border bg-surface p-3 font-mono text-xs leading-relaxed text-text placeholder:text-muted focus:border-indigo-500/60 focus:outline-none"
                    />
                  ) : (
                    <div
                      onDoubleClick={() => setTab('write')}
                      className="min-h-[60px] cursor-text rounded-lg border border-border p-3 text-sm"
                      title="Double-click to edit"
                    >
                      {card.description.trim() ? <MarkdownPreview content={card.description} /> : <p className="text-xs text-muted">No description. Double-click to write one.</p>}
                    </div>
                  )}
                </section>

                {/* Checklist */}
                <section>
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Checklist</h4>
                    {card.checklist.length > 0 && (
                      <>
                        <span className="text-[11px] tabular-nums text-muted">{doneCount}/{card.checklist.length}</span>
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-elevated">
                          <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${(doneCount / card.checklist.length) * 100}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                  <ul className="space-y-px">
                    {card.checklist.map((item) => (
                      <li key={item.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-elevated/60">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => update({ checklist: card.checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)) })}
                          className="h-3.5 w-3.5 accent-indigo-600"
                          aria-label={item.text}
                        />
                        <span className={cn('flex-1 text-xs', item.done ? 'text-muted line-through' : 'text-text')}>{item.text}</span>
                        <button type="button" onClick={() => update({ checklist: card.checklist.filter((i) => i.id !== item.id) })} className="rounded p-0.5 text-muted opacity-0 hover:text-rose-500 group-hover:opacity-100" aria-label={`Remove ${item.text}`}>
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 flex items-center gap-2 px-1">
                    <Plus className="h-3.5 w-3.5 text-muted" />
                    <input
                      value={checkDraft}
                      onChange={(e) => setCheckDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && checkDraft.trim()) {
                          update({ checklist: [...card.checklist, { id: newId(), text: checkDraft.trim().slice(0, 300), done: false }] })
                          setCheckDraft('')
                        }
                      }}
                      placeholder="Add an item and press Enter"
                      className="h-7 flex-1 bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
                    />
                  </div>
                </section>

                {/* Links */}
                <section>
                  <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Links</h4>
                  <ul className="space-y-px">
                    {card.links.map((link) => (
                      <li key={link.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-elevated/60">
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-muted" />
                        <a href={link.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs text-indigo-600 hover:underline dark:text-indigo-400" title={link.url}>
                          {link.label || link.url}
                        </a>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted" />
                        <button type="button" onClick={() => update({ links: card.links.filter((l) => l.id !== link.id) })} className="rounded p-0.5 text-muted opacity-0 hover:text-rose-500 group-hover:opacity-100" aria-label="Remove link">
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 flex items-center gap-2 px-1">
                    <Plus className="h-3.5 w-3.5 text-muted" />
                    <input
                      value={linkDraft}
                      onChange={(e) => setLinkDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addLink()}
                      placeholder="Paste a PR, issue or doc URL"
                      className="h-7 flex-1 bg-transparent text-xs text-text placeholder:text-muted focus:outline-none"
                    />
                  </div>
                </section>
              </div>

              <footer className="border-t border-border px-5 py-2 text-[11px] text-muted">
                Created {new Date(card.createdAt).toLocaleString()} · Updated {new Date(card.updatedAt).toLocaleString()}
                {card.completedAt ? ` · Done ${new Date(card.completedAt).toLocaleDateString()}` : ''}
              </footer>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
