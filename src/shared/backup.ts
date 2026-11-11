import type { Profile, Todo, Habit, ClipItem, Settings, NoteItem, FocusSessionEntry } from './types'
import { defaultSettings, mergeSettings } from './settings'
import { validateTodos } from './todos'
import { validateHabits } from './habits'
import { validateBoardData, type BoardData } from './board'
import { validateWhiteboards, type Whiteboard } from './whiteboard'

interface Backup {
  profiles?: Profile[]
  todos?: Todo[]
  habits?: Habit[]
  boardData?: BoardData
  whiteboards?: Whiteboard[]
  notes?: string
  notesList?: NoteItem[]
  clipboardHistory?: ClipItem[]
  focusHistory?: FocusSessionEntry[]
  settings?: Settings
}
type RecordValue = Record<string, unknown>
function object(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object in backup')
  return value as RecordValue
}
function fields(value: unknown, required: Record<string, string>, optional: Record<string, string> = {}): void {
  const row = object(value)
  for (const [key, type] of Object.entries({ ...required, ...optional })) {
    if (row[key] === undefined && !(key in required)) continue
    if (typeof row[key] !== type || (type === 'number' && !Number.isFinite(row[key]))) {
      throw new Error(`Invalid backup field: ${key}`)
    }
  }
}
function rows(value: unknown, check: (row: RecordValue) => void): void {
  if (!Array.isArray(value)) throw new Error('Expected a list in backup')
  const ids = new Set<string>()
  for (const valueRow of value) {
    const row = object(valueRow)
    fields(row, { id: 'string' })
    if (!(row.id as string).trim() || ids.has(row.id as string)) throw new Error('Missing or duplicate backup ID')
    ids.add(row.id as string)
    check(row)
  }
}

export const BACKUP_VERSION = 6

export function validateBackup(value: unknown): Backup {
  const raw = object(value)
  if (!Number.isInteger(raw.version) || (raw.version as number) < 1 || (raw.version as number) > BACKUP_VERSION) {
    throw new Error(`Unsupported backup version (expected 1–${BACKUP_VERSION})`)
  }
  const result: RecordValue = {}
  const validators: Record<string, (value: unknown) => void> = {
    profiles: value => rows(value, row => {
      fields(row, { name: 'string', icon: 'string', color: 'string', launchDelayMs: 'number' })
      if (!(row.name as string).trim() || (row.launchDelayMs as number) < 0) throw new Error('Invalid profile')
      rows(row.items, item => {
        fields(item, { type: 'string', target: 'string' }, { label: 'string' })
        if (!['app', 'folder', 'url'].includes(item.type as string)) throw new Error('Invalid launch item type')
        if (item.type === 'url' && !['http:', 'https:'].includes(new URL(item.target as string).protocol)) throw new Error('Invalid launch URL')
      })
    }),
    todos: value => { validateTodos(value) },
    habits: value => { validateHabits(value) },
    boardData: value => { validateBoardData(value) },
    whiteboards: value => { validateWhiteboards(value) },
    clipboardHistory: value => rows(value, row => fields(row, { text: 'string', createdAt: 'number', pinned: 'boolean' })),
    notes: value => { if (typeof value !== 'string') throw new Error('Invalid notes') },
    notesList: value => rows(value, row => {
      fields(row, { title: 'string', content: 'string', createdAt: 'number', updatedAt: 'number' }, { pinned: 'boolean' })
    }),
    focusHistory: value => rows(value, row => {
      fields(row, { taskName: 'string', startedAt: 'number', endedAt: 'number', durationMs: 'number', completed: 'boolean', mode: 'string' }, { category: 'string' })
    }),
    settings: value => {
      const settings = object(value)
      // Validate every known nested field before filling defaults for older backups.
      for (const [key, example] of Object.entries(defaultSettings)) {
        if (settings[key] === undefined) continue
        if (typeof example === 'object') {
          const nested = object(settings[key])
          for (const [name, sample] of Object.entries(example)) {
            if (nested[name] === undefined) continue
            fields(nested, { [name]: typeof sample })
          }
        } else fields(settings, { [key]: typeof example })
      }
      const merged = mergeSettings(settings as Partial<Settings>)
      if (!['light', 'dark', 'system'].includes(merged.theme)) throw new Error('Invalid theme')
      for (const n of [merged.pomodoro.workMin, merged.pomodoro.breakMin, merged.clipboard.maxItems, merged.dailyFocusGoalMin]) {
        if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid settings range')
      }
    }
  }
  for (const [key, validate] of Object.entries(validators)) {
    if (raw[key] === undefined) continue
    validate(raw[key])
    result[key] = raw[key]
  }
  if (!Object.keys(result).length) throw new Error('Backup contains no supported data')
  if (result.settings) result.settings = mergeSettings(result.settings as Settings)
  return result as Backup
}
