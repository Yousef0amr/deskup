import { contextBridge, ipcRenderer } from 'electron'
import type {
  DeskupAPI,
  Profile,
  Todo,
  Habit,
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
  whiteboards: {
    list: () => ipcRenderer.invoke('whiteboards:list'),
    save: (boards) => ipcRenderer.invoke('whiteboards:save', boards)
  },
  board: {
    get: () => ipcRenderer.invoke('board:get'),
    save: (data) => ipcRenderer.invoke('board:save', data)
  },
  habits: {
    list: () => ipcRenderer.invoke('habits:list'),
    save: (habits: Habit[]) => ipcRenderer.invoke('habits:save', habits)
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
  music: {
    list: () => ipcRenderer.invoke('music:list'),
    add: () => ipcRenderer.invoke('music:add'),
    remove: (id: string) => ipcRenderer.invoke('music:remove', id),
    onChanged: callback => {
      const handler = (_: unknown, tracks: import('../shared/types').MusicTrack[]) => callback(tracks)
      ipcRenderer.on('music:changed', handler)
      return () => { ipcRenderer.removeListener('music:changed', handler) }
    }
  },
  clipboard: {
    list: () => ipcRenderer.invoke('clipboard:list'),
    copy: (text: string) => ipcRenderer.invoke('clipboard:copy', text),
    copyImage: (id: string) => ipcRenderer.invoke('clipboard:copyImage', id),
    copyImageData: (dataUrl: string) => ipcRenderer.invoke('clipboard:copyImageData', dataUrl),
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
  },
  sync: {
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    onStatus: callback => {
      const handler = (_: unknown, status: import('../shared/types').SyncStatus) => callback(status)
      ipcRenderer.on('sync:status', handler)
      return () => { ipcRenderer.removeListener('sync:status', handler) }
    },
    onApplied: callback => {
      const handler = (_: unknown, info: { collections: string[] }) => callback(info)
      ipcRenderer.on('sync:applied', handler)
      return () => { ipcRenderer.removeListener('sync:applied', handler) }
    },
    getConfig: () => ipcRenderer.invoke('sync:getConfig'),
    chooseFolder: () => ipcRenderer.invoke('sync:chooseFolder'),
    inspectFolder: (folderPath: string) => ipcRenderer.invoke('sync:inspectFolder', folderPath),
    setup: options => ipcRenderer.invoke('sync:setup', options),
    unlock: (passphrase: string) => ipcRenderer.invoke('sync:unlock', passphrase),
    setMemberName: (name: string) => ipcRenderer.invoke('sync:setMemberName', name),
    useLocal: () => ipcRenderer.invoke('sync:useLocal'),
    setMode: mode => ipcRenderer.invoke('sync:setMode', mode),
    setDeviceName: (name: string) => ipcRenderer.invoke('sync:setDeviceName', name),
    syncNow: () => ipcRenderer.invoke('sync:syncNow'),
    viewsRefreshed: () => ipcRenderer.send('sync:viewsRefreshed')
  },
  updates: {
    getStatus: () => ipcRenderer.invoke('update:getStatus'),
    onStatus: callback => {
      const handler = (_: unknown, status: import('../shared/types').UpdateStatus) => callback(status)
      ipcRenderer.on('update:status', handler)
      return () => { ipcRenderer.removeListener('update:status', handler) }
    },
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install')
  },
  snip: {
    start: () => ipcRenderer.invoke('snip:start'),
    ready: () => ipcRenderer.send('snip:ready'),
    onBegin: callback => {
      const handler = (_: unknown, begin: import('../shared/types').SnipBegin) => callback(begin)
      ipcRenderer.on('snip:begin', handler)
      return () => { ipcRenderer.removeListener('snip:begin', handler) }
    },
    painted: (session: number) => ipcRenderer.send('snip:painted', session),
    onFrame: callback => {
      const handler = (_: unknown, frame: import('../shared/types').SnipFrame) => callback(frame)
      ipcRenderer.on('snip:frame', handler)
      return () => { ipcRenderer.removeListener('snip:frame', handler) }
    },
    onReset: callback => {
      const handler = () => callback()
      ipcRenderer.on('snip:reset', handler)
      return () => { ipcRenderer.removeListener('snip:reset', handler) }
    },
    copyImage: (dataUrl: string) => ipcRenderer.invoke('snip:copyImage', dataUrl),
    saveImage: (dataUrl: string) => ipcRenderer.invoke('snip:saveImage', dataUrl),
    pin: (dataUrl: string, rect: { x: number; y: number; width: number; height: number }) =>
      ipcRenderer.invoke('snip:pin', dataUrl, rect),
    copyText: (dataUrl: string) => ipcRenderer.invoke('snip:copyText', dataUrl),
    close: () => ipcRenderer.invoke('snip:close')
  }
}

try {
  contextBridge.exposeInMainWorld('deskup', api)
} catch (error) {
  console.error('Failed to expose deskup API via contextBridge:', error)
}
