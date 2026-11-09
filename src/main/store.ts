import { app } from 'electron'
import Store from 'electron-store'
import type { Profile, Todo, Settings, ClipItem, NoteItem, FocusSessionEntry } from '../shared/types'

export interface AppStoreSchema {
  focusState?: import('../shared/types').FocusState
  focusHistory: FocusSessionEntry[]
  profiles: Profile[]
  todos: Todo[]
  notes: string
  notesList: NoteItem[]
  clipboardHistory: ClipItem[]
  settings: Settings
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
    notes: '',
    notesList: [],
    clipboardHistory: [],
    settings: defaultSettings
  }
})

store.set('settings', mergeSettings(store.get('settings')))
