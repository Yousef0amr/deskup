import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { promises as fs } from 'fs'
import { store, defaultSettings } from './store'
import { mergeSettings } from '../shared/settings'
import { validateBackup } from '../shared/backup'
import { join } from 'path'
import { launchProfileItems } from './launcher'
import {
  copyClipText,
  toggleClipPin,
  deleteClipItem,
  clearClipboardHistory,
  toggleClipboardPause
} from './clipboard'
import { hideClipboardPopup } from './clipboardPopup'
import type {
  Profile,
  Todo,
  Settings,
  LaunchResult,
  ClipItem
} from '../shared/types'

export interface IpcCallbacks {
  onProfilesChanged?: () => void
  onSettingsChanged?: (newSettings: Settings) => void
}

export function registerIpcHandlers(
  getMainWindow: () => BrowserWindow | null,
  callbacks?: IpcCallbacks
): void {
  // Profiles
  ipcMain.handle('profiles:list', async (): Promise<Profile[]> => {
    return store.get('profiles', [])
  })

  ipcMain.handle('profiles:save', async (_, rawProfile: unknown): Promise<Profile> => {
    if (!rawProfile || typeof rawProfile !== 'object') {
      throw new Error('Invalid profile data')
    }

    const p = rawProfile as Partial<Profile>
    if (!p.id || typeof p.id !== 'string') throw new Error('Profile id is required')
    if (!p.name || typeof p.name !== 'string') throw new Error('Profile name is required')

    const cleanProfile: Profile = {
      id: p.id.trim(),
      name: p.name.trim(),
      icon: typeof p.icon === 'string' && p.icon ? p.icon : '💼',
      color: typeof p.color === 'string' && p.color ? p.color : '#6366f1',
      launchDelayMs: typeof p.launchDelayMs === 'number' && p.launchDelayMs >= 0 ? p.launchDelayMs : 300,
      items: Array.isArray(p.items)
        ? p.items.map((it) => ({
            id: String(it.id || Date.now() + Math.random().toString(36).substring(2, 6)),
            type: it.type === 'app' || it.type === 'folder' || it.type === 'url' ? it.type : 'url',
            target: String(it.target || '').trim(),
            label: it.label ? String(it.label).trim() : undefined
          }))
        : []
    }

    const profiles = store.get('profiles', [])
    const existingIndex = profiles.findIndex((item) => item.id === cleanProfile.id)

    if (existingIndex >= 0) {
      profiles[existingIndex] = cleanProfile
    } else {
      profiles.push(cleanProfile)
    }

    store.set('profiles', profiles)
    callbacks?.onProfilesChanged?.()
    return cleanProfile
  })

  ipcMain.handle('profiles:delete', async (_, id: unknown): Promise<void> => {
    if (typeof id !== 'string' || !id.trim()) throw new Error('Valid profile ID is required')
    const profiles = store.get('profiles', [])
    store.set('profiles', profiles.filter((p) => p.id !== id.trim()))
    callbacks?.onProfilesChanged?.()
  })

  ipcMain.handle('profiles:launch', async (_, id: unknown): Promise<LaunchResult[]> => {
    if (typeof id !== 'string') throw new Error('Valid profile ID is required')
    const profiles = store.get('profiles', [])
    const profile = profiles.find((p) => p.id === id)
    if (!profile) {
      throw new Error(`Profile not found: ${id}`)
    }
    return launchProfileItems(profile.items, profile.launchDelayMs)
  })

  // Todos
  ipcMain.handle('todos:list', async (): Promise<Todo[]> => {
    return store.get('todos', [])
  })

  ipcMain.handle('todos:save', async (_, rawTodos: unknown): Promise<void> => {
    if (!Array.isArray(rawTodos)) {
      throw new Error('Todos must be an array')
    }

    const cleanTodos: Todo[] = rawTodos.map((item, index) => ({
      id: String(item.id || Date.now() + index),
      text: String(item.text || '').trim(),
      done: Boolean(item.done),
      order: typeof item.order === 'number' ? item.order : index
    }))

    store.set('todos', cleanTodos)
  })

  // Notes
  ipcMain.handle('notes:get', async (): Promise<string> => {
    return store.get('notes', '')
  })

  ipcMain.handle('notes:save', async (_, text: unknown): Promise<void> => {
    if (typeof text !== 'string') {
      throw new Error('Notes must be a string')
    }
    store.set('notes', text)
  })

  // Clipboard
  ipcMain.handle('clipboard:list', async (): Promise<ClipItem[]> => {
    return store.get('clipboardHistory', [])
  })

  ipcMain.handle('clipboard:copy', async (_, text: unknown): Promise<void> => {
    if (typeof text !== 'string') throw new Error('Clip text must be a string')
    copyClipText(text)
  })

  ipcMain.handle('clipboard:pin', async (_, id: unknown): Promise<void> => {
    if (typeof id !== 'string' || !id) throw new Error('Clip ID must be a string')
    toggleClipPin(id)
  })

  ipcMain.handle('clipboard:delete', async (_, id: unknown): Promise<void> => {
    if (typeof id !== 'string' || !id) throw new Error('Clip ID must be a string')
    deleteClipItem(id)
  })

  ipcMain.handle('clipboard:clear', async (_, includePinned?: unknown): Promise<void> => {
    clearClipboardHistory(Boolean(includePinned))
  })

  ipcMain.handle('clipboard:togglePause', async (): Promise<boolean> => {
    return toggleClipboardPause()
  })

  ipcMain.handle('clipboard:closePopup', async (): Promise<void> => {
    hideClipboardPopup()
  })

  // Settings
  ipcMain.handle('settings:get', async (): Promise<Settings> => {
    return mergeSettings(store.get('settings', defaultSettings))
  })

  ipcMain.handle('settings:update', async (_, patch: unknown): Promise<Settings> => {
    if (!patch || typeof patch !== 'object') {
      throw new Error('Invalid settings patch')
    }

    const current = mergeSettings(store.get('settings', defaultSettings))
    const p = patch as Partial<Settings>

    const updated: Settings = {
      theme: p.theme === 'light' || p.theme === 'dark' || p.theme === 'system' ? p.theme : current.theme,
      pomodoro: {
        workMin:
          typeof p.pomodoro?.workMin === 'number' && p.pomodoro.workMin > 0
            ? Math.round(p.pomodoro.workMin)
            : current.pomodoro.workMin,
        breakMin:
          typeof p.pomodoro?.breakMin === 'number' && p.pomodoro.breakMin > 0
            ? Math.round(p.pomodoro.breakMin)
            : current.pomodoro.breakMin
      },
      hotkey: typeof p.hotkey === 'string' && p.hotkey.trim() ? p.hotkey.trim() : current.hotkey,
      launchAtLogin: typeof p.launchAtLogin === 'boolean' ? p.launchAtLogin : current.launchAtLogin,
      minimizeToTray: typeof p.minimizeToTray === 'boolean' ? p.minimizeToTray : current.minimizeToTray,
      clipboard: {
        enabled: typeof p.clipboard?.enabled === 'boolean' ? p.clipboard.enabled : current.clipboard?.enabled ?? true,
        maxItems:
          typeof p.clipboard?.maxItems === 'number' && p.clipboard.maxItems > 0
            ? Math.round(p.clipboard.maxItems)
            : current.clipboard?.maxItems ?? 100,
        isPaused: typeof p.clipboard?.isPaused === 'boolean' ? p.clipboard.isPaused : current.clipboard?.isPaused ?? false,
        hotkey:
          typeof p.clipboard?.hotkey === 'string' && p.clipboard.hotkey.trim()
            ? p.clipboard.hotkey.trim()
            : current.clipboard?.hotkey ?? 'CommandOrControl+Shift+V'
      }
    }

    store.set('settings', updated)

    try {
      app.setLoginItemSettings({ openAtLogin: updated.launchAtLogin })
    } catch (e) {
      console.warn('Could not update login item settings:', e)
    }

    callbacks?.onSettingsChanged?.(updated)
    return updated
  })

  // Dialogs
  ipcMain.handle('dialog:pickFile', async (): Promise<string | null> => {
    const win = getMainWindow()
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Select Application or File',
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:pickFolder', async (): Promise<string | null> => {
    const win = getMainWindow()
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Select Folder',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  // Data Export / Import
  ipcMain.handle('data:exportAll', async (): Promise<boolean> => {
    const win = getMainWindow()
    const { filePath, canceled } = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'Export Deskup Data',
      defaultPath: `deskup-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    })

    if (canceled || !filePath) return false

    const data = {
      version: 5,
      exportedAt: new Date().toISOString(),
      profiles: store.get('profiles', []),
      todos: store.get('todos', []),
      notes: store.get('notes', ''),
      clipboardHistory: store.get('clipboardHistory', []),
      settings: store.get('settings', defaultSettings)
    }

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  })

  ipcMain.handle('data:importAll', async (): Promise<boolean> => {
    const win = getMainWindow()
    const { filePaths, canceled } = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Import Deskup Data',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) return false

    const raw = await fs.readFile(filePaths[0], 'utf-8')
    const imported = validateBackup(JSON.parse(raw))
    const choice = await dialog.showMessageBox(getMainWindow() ?? undefined!, {
      type: 'question', buttons: ['Cancel', 'Replace included data'], defaultId: 0, cancelId: 0,
      title: 'Restore Deskup backup',
      message: 'Replace these sections: ' + Object.keys(imported).join(', ') + '?',
      detail: 'Absent sections stay unchanged. A recovery backup is saved in your Deskup data folder first.'
    })
    if (choice.response !== 1) return false
    const previous = store.store
    const recoveryPath = join(app.getPath('userData'), 'deskup-recovery-' + Date.now() + '.json')
    await fs.writeFile(recoveryPath, JSON.stringify({ ...previous, version: 5 }, null, 2), { encoding: 'utf-8', flag: 'wx' })
    store.store = { ...previous, ...imported }
    if (imported.settings) {
      try { app.setLoginItemSettings({ openAtLogin: imported.settings.launchAtLogin }) }
      catch (error) { console.warn('Could not apply startup setting:', error) }
      callbacks?.onSettingsChanged?.(imported.settings)
    }
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('clipboard:changed', store.get('clipboardHistory', []))
      win.webContents.send('data:imported')
    }

    callbacks?.onProfilesChanged?.()
    return true
  })
}
