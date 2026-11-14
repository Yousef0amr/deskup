import { ipcMain, dialog, BrowserWindow, app, clipboard, nativeImage } from 'electron'
import { promises as fs } from 'fs'
import os from 'os'
import { store, defaultSettings } from './store'
import { mergeSettings } from '../shared/settings'
import { validateBackup, BACKUP_VERSION } from '../shared/backup'
import { validateTodos } from '../shared/todos'
import { validateHabits } from '../shared/habits'
import { validateBoardData, type BoardData } from '../shared/board'
import { validateWhiteboards, type Whiteboard } from '../shared/whiteboard'
import { join } from 'path'
import { launchProfileItems } from './launcher'
import { applyLoginItem } from './loginItem'
import { setAutoDownload } from './updater'
import { guardSave } from './sync'
import { getInstalledApps } from './apps'
import {
  copyClipText,
  copyClipImage,
  toggleClipPin,
  deleteClipItem,
  clearClipboardHistory,
  toggleClipboardPause
} from './clipboard'
import { hideClipboardPopup } from './clipboardPopup'
import type {
  Profile,
  Todo,
  Habit,
  Settings,
  LaunchResult,
  ClipItem,
  NoteItem,
  SystemStats
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
      autoLaunch: p.autoLaunch === true,
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
    store.set('todos', guardSave('todos', validateTodos(rawTodos)))
  })

  // Whiteboards
  ipcMain.handle('whiteboards:list', async (): Promise<Whiteboard[]> => store.get('whiteboards', []))
  ipcMain.handle('whiteboards:save', async (_, raw: unknown): Promise<void> => {
    store.set('whiteboards', guardSave('whiteboards', validateWhiteboards(raw)))
  })

  // Developer board
  ipcMain.handle('board:get', async (): Promise<BoardData> => {
    return store.get('boardData', { boards: [], cards: [] })
  })

  ipcMain.handle('board:save', async (_, raw: unknown): Promise<void> => {
    const data = validateBoardData(raw)
    store.set('boardData', { ...data, boards: guardSave('boards', data.boards), cards: guardSave('cards', data.cards) })
  })

  // Habits
  ipcMain.handle('habits:list', async (): Promise<Habit[]> => {
    return store.get('habits', [])
  })

  ipcMain.handle('habits:save', async (_, rawHabits: unknown): Promise<Habit[]> => {
    const habits = guardSave('habits', validateHabits(rawHabits))
    store.set('habits', habits)
    return habits
  })

  // Notes (Multi-note support + legacy fallback)
  const getOrInitNotesList = (): NoteItem[] => {
    let list = store.get('notesList', [])
    if (!list || list.length === 0) {
      const legacy = store.get('notes', '')
      const initial: NoteItem = {
        id: 'note_' + Date.now(),
        title: legacy.trim() ? 'Quick Scratchpad' : 'Welcome Note',
        content: legacy.trim()
          ? legacy
          : 'Welcome to Deskup Notes!\n\nYou can create multiple notes, name them, and organize your daily work.\n\n- Brainstorms & quick ideas\n- Code snippets & terminal commands\n- Meeting notes & daily tasks\n\nAuto-saves automatically as you type!',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      list = [initial]
      store.set({ notesList: list, notes: initial.content })
    }
    return list
  }

  ipcMain.handle('notes:list', async (): Promise<NoteItem[]> => {
    return getOrInitNotesList()
  })

  ipcMain.handle(
    'notes:create',
    async (
      _,
      title?: unknown,
      content?: unknown,
      folder?: unknown,
      color?: unknown
    ): Promise<NoteItem> => {
      const list = getOrInitNotesList()
      const newNote: NoteItem = {
        id: 'note_' + Date.now() + Math.random().toString(36).substring(2, 6),
        title: typeof title === 'string' && title.trim() ? title.trim() : 'Untitled Note',
        content: typeof content === 'string' ? content : '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        folder: typeof folder === 'string' && folder.trim() ? folder.trim() : 'General',
        color: typeof color === 'string' ? color : 'indigo'
      }
      const updated = [newNote, ...list]
      store.set({ notesList: updated, notes: updated[0]?.content ?? '' })
      return newNote
    }
  )

  ipcMain.handle('notes:saveNote', async (_, note: unknown): Promise<NoteItem> => {
    if (!note || typeof note !== 'object') throw new Error('Note must be an object')
    const n = note as NoteItem
    if (!n.id || typeof n.id !== 'string') throw new Error('Note ID is required')

    const list = getOrInitNotesList()
    const cleanNote: NoteItem = {
      id: n.id,
      title: typeof n.title === 'string' ? n.title : 'Untitled',
      content: typeof n.content === 'string' ? n.content : '',
      createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
      updatedAt: Date.now(),
      pinned: Boolean(n.pinned),
      folder: typeof n.folder === 'string' && n.folder.trim() ? n.folder.trim() : 'General',
      color: typeof n.color === 'string' ? n.color : 'indigo',
      tags: Array.isArray(n.tags) ? n.tags.filter((t) => typeof t === 'string') : []
    }

    const idx = list.findIndex((item) => item.id === cleanNote.id)
    let updated: NoteItem[]
    if (idx !== -1) {
      updated = [...list]
      updated[idx] = cleanNote
    } else {
      updated = [cleanNote, ...list]
    }

    store.set({ notesList: updated, notes: updated[0]?.content ?? '' })
    return cleanNote
  })

  ipcMain.handle('notes:saveAll', async (_, notesList: unknown): Promise<void> => {
    if (!Array.isArray(notesList)) throw new Error('Notes must be an array')
    const cleanList: NoteItem[] = guardSave('notesList', notesList.map((n) => ({
      id: String(n.id || 'note_' + Date.now()),
      title: String(n.title || 'Untitled'),
      content: String(n.content || ''),
      createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
      updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now(),
      pinned: Boolean(n.pinned)
    })))
    store.set({ notesList: cleanList, notes: cleanList[0]?.content ?? '' })
  })

  ipcMain.handle('notes:delete', async (_, id: unknown): Promise<void> => {
    if (typeof id !== 'string' || !id) throw new Error('Note ID is required')
    const list = getOrInitNotesList()
    let updated = list.filter((n) => n.id !== id)
    if (updated.length === 0) {
      updated = [
        {
          id: 'note_' + Date.now(),
          title: 'Scratchpad',
          content: '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    }
    store.set({ notesList: updated, notes: updated[0]?.content ?? '' })
  })

  // Legacy backwards compatibility
  ipcMain.handle('notes:get', async (): Promise<string> => {
    const list = getOrInitNotesList()
    return list[0]?.content ?? store.get('notes', '')
  })

  ipcMain.handle('notes:save', async (_, text: unknown): Promise<void> => {
    if (typeof text !== 'string') {
      throw new Error('Notes must be a string')
    }
    const list = getOrInitNotesList()
    if (list.length > 0) {
      list[0].content = text
      list[0].updatedAt = Date.now()
    }
    store.set({ notesList: list, notes: text })
  })

  // System Resource Stats
  ipcMain.handle('system:getStats', async (): Promise<SystemStats> => {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const memPercent = Math.round((usedMem / totalMem) * 100)
    const totalMemGb = Math.round((totalMem / (1024 * 1024 * 1024)) * 10) / 10
    const usedMemGb = Math.round((usedMem / (1024 * 1024 * 1024)) * 10) / 10
    const uptimeHours = Math.round((os.uptime() / 3600) * 10) / 10
    const appMemMb = Math.round(process.memoryUsage().rss / (1024 * 1024))

    const cpus = os.cpus()
    let totalIdle = 0
    let totalTick = 0
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times]
      }
      totalIdle += cpu.times.idle
    }
    const cpuPercent = totalTick > 0 ? Math.min(100, Math.max(1, Math.round(100 - (totalIdle / totalTick) * 100))) : 5

    return {
      cpuPercent,
      totalMemGb,
      usedMemGb,
      memPercent,
      uptimeHours,
      appMemMb
    }
  })

  // Clipboard
  ipcMain.handle('clipboard:list', async (): Promise<ClipItem[]> => {
    return store.get('clipboardHistory', [])
  })

  ipcMain.handle('clipboard:copy', async (_, text: unknown): Promise<void> => {
    if (typeof text !== 'string') throw new Error('Clip text must be a string')
    copyClipText(text)
  })

  ipcMain.handle('clipboard:copyImage', async (_, id: unknown): Promise<void> => {
    if (typeof id !== 'string' || !id) throw new Error('Clip ID must be a string')
    copyClipImage(id)
  })

  ipcMain.handle('clipboard:copyImageData', async (_, dataUrl: unknown): Promise<void> => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,') || dataUrl.length > 40_000_000) {
      throw new Error('Expected a PNG data URL')
    }
    const img = nativeImage.createFromDataURL(dataUrl)
    if (img.isEmpty()) throw new Error('Image is empty')
    clipboard.writeImage(img)
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
      dailyFocusGoalMin:
        typeof p.dailyFocusGoalMin === 'number' && p.dailyFocusGoalMin > 0
          ? Math.min(1440, Math.round(p.dailyFocusGoalMin))
          : current.dailyFocusGoalMin,
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
            : current.clipboard?.hotkey ?? 'CommandOrControl+Shift+V',
        captureImages:
          typeof p.clipboard?.captureImages === 'boolean' ? p.clipboard.captureImages : current.clipboard?.captureImages ?? true
      },
      autoUpdate: typeof p.autoUpdate === 'boolean' ? p.autoUpdate : current.autoUpdate
    }

    store.set('settings', updated)

    applyLoginItem(updated.launchAtLogin)
    setAutoDownload(updated.autoUpdate)

    callbacks?.onSettingsChanged?.(updated)
    return updated
  })

  // Applications
  ipcMain.handle('apps:list', async () => {
    return getInstalledApps()
  })

  // Dialogs
  ipcMain.handle('dialog:pickFile', async (): Promise<string | null> => {
    const win = getMainWindow()
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Select Application or Executable',
      properties: ['openFile'],
      filters: [
        {
          name: 'Applications & Shortcuts (*.exe, *.lnk)',
          extensions: ['exe', 'lnk', 'bat', 'cmd', 'app']
        },
        { name: 'All Files (*.*)', extensions: ['*'] }
      ]
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
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      profiles: store.get('profiles', []),
      todos: store.get('todos', []),
      habits: store.get('habits', []),
      boardData: store.get('boardData', { boards: [], cards: [] }),
      whiteboards: store.get('whiteboards', []),
      notes: store.get('notes', ''),
      notesList: store.get('notesList', []),
      clipboardHistory: store.get('clipboardHistory', []),
      focusHistory: store.get('focusHistory', []),
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
    await fs.writeFile(recoveryPath, JSON.stringify({ ...previous, version: BACKUP_VERSION }, null, 2), { encoding: 'utf-8', flag: 'wx' })
    store.store = { ...previous, ...imported }
    if (imported.settings) {
      applyLoginItem(imported.settings.launchAtLogin)
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
