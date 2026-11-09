import { contextBridge, ipcRenderer } from 'electron'
import type {
  DeskupAPI,
  Profile,
  Todo,
  Settings,
  ClipItem
} from '../shared/types'

const api: DeskupAPI = {
  focus: {
    get: () => ipcRenderer.invoke('focus:get'),
    action: (action, payload) => ipcRenderer.invoke('focus:action', action, payload),
    onChanged: callback => {
      const handler = (_: unknown, state: import('../shared/types').FocusState) => callback(state)
      ipcRenderer.on('focus:changed', handler)
      return () => { ipcRenderer.removeListener('focus:changed', handler) }
    },
    getHistory: () => ipcRenderer.invoke('focus:getHistory'),
    addHistory: (entry) => ipcRenderer.invoke('focus:addHistory', entry),
    deleteHistoryItem: (id) => ipcRenderer.invoke('focus:deleteHistoryItem', id),
    clearHistory: () => ipcRenderer.invoke('focus:clearHistory')
  },
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list'),
    save: (profile: Profile) => ipcRenderer.invoke('profiles:save', profile),
    delete: (id: string) => ipcRenderer.invoke('profiles:delete', id),
    launch: (id: string) => ipcRenderer.invoke('profiles:launch', id)
  },
  todos: {
    list: () => ipcRenderer.invoke('todos:list'),
    save: (todos: Todo[]) => ipcRenderer.invoke('todos:save', todos)
  },
  notes: {
    get: () => ipcRenderer.invoke('notes:get'),
    save: (text: string) => ipcRenderer.invoke('notes:save', text),
    list: () => ipcRenderer.invoke('notes:list'),
    saveNote: (note: import('../shared/types').NoteItem) => ipcRenderer.invoke('notes:saveNote', note),
    saveAll: (notes: import('../shared/types').NoteItem[]) => ipcRenderer.invoke('notes:saveAll', notes),
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
    create: (title?: string, content?: string, folder?: string, color?: string) =>
      ipcRenderer.invoke('notes:create', title, content, folder, color)
  },
  system: {
    getStats: () => ipcRenderer.invoke('system:getStats')
  },
  clipboard: {
    list: () => ipcRenderer.invoke('clipboard:list'),
    copy: (text: string) => ipcRenderer.invoke('clipboard:copy', text),
    pin: (id: string) => ipcRenderer.invoke('clipboard:pin', id),
    delete: (id: string) => ipcRenderer.invoke('clipboard:delete', id),
    clear: (includePinned?: boolean) => ipcRenderer.invoke('clipboard:clear', includePinned),
    togglePause: () => ipcRenderer.invoke('clipboard:togglePause'),
    closePopup: () => ipcRenderer.invoke('clipboard:closePopup'),
    onChanged: (callback: (clips: ClipItem[]) => void) => {
      const handler = (_: unknown, clips: ClipItem[]) => callback(clips)
      ipcRenderer.on('clipboard:changed', handler)
      return () => {
        ipcRenderer.removeListener('clipboard:changed', handler)
      }
    }
  },
  settings: {
    onChanged: callback => {
      const handler = (_: unknown, settings: Settings) => callback(settings)
      ipcRenderer.on('settings:changed', handler)
      return () => { ipcRenderer.removeListener('settings:changed', handler) }
    },
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch: Partial<Settings>) => ipcRenderer.invoke('settings:update', patch)
  },
  dialog: {
    pickFile: () => ipcRenderer.invoke('dialog:pickFile'),
    pickFolder: () => ipcRenderer.invoke('dialog:pickFolder')
  },
  apps: {
    list: () => ipcRenderer.invoke('apps:list')
  },
  data: {
    onImported: callback => {
      ipcRenderer.on('data:imported', callback)
      return () => { ipcRenderer.removeListener('data:imported', callback) }
    },
    exportAll: () => ipcRenderer.invoke('data:exportAll'),
    importAll: () => ipcRenderer.invoke('data:importAll')
  }
}

try {
  contextBridge.exposeInMainWorld('deskup', api)
} catch (error) {
  console.error('Failed to expose deskup API via contextBridge:', error)
}
