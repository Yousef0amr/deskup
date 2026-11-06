import { app } from 'electron'
import Store from 'electron-store'
import type { Profile, Todo, Settings, ClipItem } from '../shared/types'

export interface AppStoreSchema {
  focusState?: import('../shared/types').FocusState
  profiles: Profile[]
  todos: Todo[]
  notes: string
  clipboardHistory: ClipItem[]
  settings: Settings
}

export { defaultSettings } from '../shared/settings'
import { defaultSettings, mergeSettings } from '../shared/settings'

export const store = new Store<AppStoreSchema>({
  name: 'deskup-config',
  cwd: app.getPath('userData'),
  defaults: {
    profiles: [],
    todos: [],
    notes: '',
    clipboardHistory: [],
    settings: defaultSettings
  }
})

store.set('settings', mergeSettings(store.get('settings')))
