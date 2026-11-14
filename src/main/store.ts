import { app } from 'electron'
import Store from 'electron-store'
import type { Profile, Todo, Habit, Settings, ClipItem, NoteItem, FocusSessionEntry, MusicTrack } from '../shared/types'

export interface AppStoreSchema {
  focusState?: import('../shared/types').FocusState
  focusHistory: FocusSessionEntry[]
  profiles: Profile[]
  todos: Todo[]
  habits: Habit[]
  boardData: import('../shared/board').BoardData
  whiteboards: import('../shared/whiteboard').Whiteboard[]
  notes: string
  notesList: NoteItem[]
  clipboardHistory: ClipItem[]
  musicTracks: MusicTrack[]
  settings: Settings
  /** Device-local sync configuration (never synced or exported). */
  syncConfig?: import('../shared/types').SyncConfig
  /** Last merged sync records (see src/main/sync.ts). */
  syncState?: { records: import('../shared/syncMerge').CollectionMaps; lastSyncAt?: number; lastWrittenHash?: string }
}

export { defaultSettings } from '../shared/settings'
import { defaultSettings, mergeSettings } from '../shared/settings'

export const store = new Store<AppStoreSchema>({
  name: 'deskup-config',
  cwd: app.getPath('userData'),
  defaults: {
    focusHistory: [],
    profiles: [],
    todos: [],
    habits: [],
    boardData: { boards: [], cards: [] },
    whiteboards: [],
    notes: '',
    notesList: [],
    clipboardHistory: [],
    musicTracks: [],
    settings: defaultSettings
  }
})

store.set('settings', mergeSettings(store.get('settings')))
