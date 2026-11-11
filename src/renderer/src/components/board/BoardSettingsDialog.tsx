import React, { useEffect, useState } from 'react'
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react'
import type { Board, BoardColumn } from '../../../../shared/board'
import { normalizeKey } from '../../../../shared/board'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { newId } from './boardMeta'
import { cn } from '../../lib/utils'

interface BoardSettingsDialogProps {
  open: boolean
  /** null = create a new board */
  board: Board | null
  /** Cards per column, so columns that still hold cards can't be deleted. */
  cardCounts: Record<string, number>
  canDelete: boolean
  onClose: () => void
  onSave: (draft: { name: string; key: string; columns: BoardColumn[] }) => void
  onDelete: () => void
}

export default function BoardSettingsDialog({ open, board, cardCounts, canDelete, onClose, onSave, onDelete }: BoardSettingsDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [columns, setColumns] = useState<BoardColumn[]>([])

  useEffect(() => {
    if (!open) return
    setName(board?.name ?? '')
    setKey(board?.key ?? '')
    setColumns(board?.columns ?? [])
  }, [open, board])

  const isNew = !board
  const validKey = normalizeKey(key)
  const canSave = name.trim().length > 0 && validKey.length >= 2 && (isNew || (columns.length > 0 && columns.every((c) => c.name.trim())))

  const updateColumn = (id: string, patch: Partial<BoardColumn>) => setColumns((cols) => cols.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const moveColumn = (index: number, delta: number) =>
    setColumns((cols) => {
      const next = [...cols]
      const [col] = next.splice(index, 1)
      next.splice(index + delta, 0, col)
      return next
    })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New board' : 'Board settings'}</DialogTitle>
          <DialogDescription>{isNew ? 'Each board has its own card numbering, e.g. API-1, API-2.' : 'Rename the board and shape its workflow.'}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSave) onSave({ name: name.trim(), key: validKey, columns: columns.map((c) => ({ ...c, name: c.name.trim() })) })
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">Name</span>
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Product" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Key</span>
              <Input
                value={key}
                onChange={(e) => setKey(normalizeKey(e.target.value))}
                placeholder="DSK"
                className="font-mono uppercase"
                title="2–6 letters or digits used in card keys"
              />
            </label>
          </div>
          {!isNew && board && validKey !== board.key && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">Card keys will change to {validKey}-N. Existing branch names won’t be renamed.</p>
          )}

          {!isNew && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Columns · WIP limit · done</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted"
                  disabled={columns.length >= 12}
                  onClick={() => setColumns((cols) => [...cols.slice(0, -1), { id: newId(), name: 'New column' }, ...cols.slice(-1)])}
                >
                  <Plus className="h-3.5 w-3.5" /> Column
                </Button>
              </div>
              <ul className="space-y-1">
                {columns.map((col, i) => {
                  const count = cardCounts[col.id] ?? 0
                  return (
                    <li key={col.id} className="flex items-center gap-1.5">
                      <Input value={col.name} maxLength={40} onChange={(e) => updateColumn(col.id, { name: e.target.value })} className="h-7 flex-1" aria-label="Column name" />
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={col.wipLimit ?? ''}
                        placeholder="∞"
                        onChange={(e) => updateColumn(col.id, { wipLimit: Number(e.target.value) > 0 ? Math.min(99, Math.floor(Number(e.target.value))) : undefined })}
                        className="h-7 w-14 text-center font-mono"
                        aria-label={`WIP limit for ${col.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => setColumns((cols) => cols.map((c) => ({ ...c, done: c.id === col.id ? !col.done : c.done })))}
                        aria-pressed={!!col.done}
                        title="Cards here count as done"
                        className={cn('h-7 rounded-md px-2 text-[11px] font-medium', col.done ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'text-muted hover:bg-elevated')}
                      >
                        Done
                      </button>
                      <button type="button" disabled={i === 0} onClick={() => moveColumn(i, -1)} className="rounded p-1 text-muted hover:text-text disabled:opacity-30" aria-label="Move earlier" title="Move earlier">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" disabled={i === columns.length - 1} onClick={() => moveColumn(i, 1)} className="rounded p-1 text-muted hover:text-text disabled:opacity-30" aria-label="Move later" title="Move later">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={count > 0 || columns.length <= 1}
                        title={count > 0 ? `Move its ${count} card(s) first` : 'Delete column'}
                        onClick={() => setColumns((cols) => cols.filter((c) => c.id !== col.id))}
                        className="rounded p-1 text-muted hover:text-rose-500 disabled:opacity-30"
                        aria-label={`Delete ${col.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {!isNew && canDelete && (
              <Button type="button" variant="ghost" className="text-rose-600 hover:bg-rose-500/10 dark:text-rose-400" onClick={onDelete}>
                Delete board
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={!canSave}>{isNew ? 'Create board' : 'Save'}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
