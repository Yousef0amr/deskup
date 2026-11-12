import { BrowserWindow, ipcMain, Notification } from 'electron'
import { randomUUID } from 'crypto'
import { store } from './store'
import { getWindowIcon, getWindowIconPath } from './tray'
import { advanceFocus, changeFocus } from '../shared/focus'
import type { FocusAction, FocusState, FocusSessionEntry } from '../shared/types'

let timer: NodeJS.Timeout | undefined
let unsubscribeSettings: (() => void) | undefined
let activeTask: string = 'Deep Work'
let activeCategory: string = 'Coding'
let sessionStartedAt: number | null = null

export function startFocusService(): void {
  let durations = store.get('settings').pomodoro
  let state: FocusState = store.get('focusState') ?? {
    mode: 'work',
    remainingMs: durations.workMin * 60000,
    endsAt: null,
    sessionsCompleted: 0
  }

  const publish = () => {
    store.set('focusState', state)
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('focus:changed', state)
    }
  }

  const recordCompletedSession = () => {
    const history = store.get('focusHistory') ?? []
    const durationMs = durations.workMin * 60000
    const endedAt = Date.now()
    const startedAt = sessionStartedAt ?? (endedAt - durationMs)

    const entry: FocusSessionEntry = {
      id: randomUUID(),
      taskName: activeTask || 'Focus Session',
      category: activeCategory || 'Deep Work',
      startedAt,
      endedAt,
      durationMs,
      completed: true,
      mode: 'work'
    }

    store.set('focusHistory', [entry, ...history])
    sessionStartedAt = null
  }

  const tick = () => {
    const next = advanceFocus(state, durations, Date.now())
    if (next === state) return

    if (state.mode === 'work' && next.mode === 'break') {
      recordCompletedSession()
    }

    state = next
    publish()

    if (Notification.isSupported()) {
      new Notification({
        title: state.mode === 'break' ? 'Focus session complete' : 'Break complete',
        body: 'Your next session is ready. Start it when you are ready.',
        icon: getWindowIconPath() ?? getWindowIcon()
      }).show()
    }
  }

  ipcMain.handle('focus:get', () => {
    tick()
    return state
  })

  ipcMain.handle('focus:action', (_, action: unknown, payload?: { taskName?: string; category?: string }) => {
    if (!['start', 'pause', 'reset', 'skip'].includes(action as string)) {
      throw new Error('Invalid focus action')
    }
    tick()

    if (action === 'start') {
      if (payload?.taskName) activeTask = payload.taskName
      if (payload?.category) activeCategory = payload.category
      if (state.endsAt === null) sessionStartedAt = Date.now()
    }

    state = changeFocus(state, action as FocusAction, durations, Date.now())
    publish()
    return state
  })

  ipcMain.handle('focus:getHistory', () => {
    return store.get('focusHistory') ?? []
  })

  ipcMain.handle('focus:addHistory', (_, entry: Omit<FocusSessionEntry, 'id'>) => {
    const history = store.get('focusHistory') ?? []
    const newEntry: FocusSessionEntry = {
      ...entry,
      id: randomUUID()
    }
    store.set('focusHistory', [newEntry, ...history])
    return newEntry
  })

  ipcMain.handle('focus:deleteHistoryItem', (_, id: string) => {
    const history = (store.get('focusHistory') ?? []).filter((h) => h.id !== id)
    store.set('focusHistory', history)
  })

  ipcMain.handle('focus:clearHistory', () => {
    store.set('focusHistory', [])
  })

  tick()

  unsubscribeSettings = store.onDidChange('settings', (settings, previous) => {
    if (settings) durations = settings.pomodoro
    if (!settings || !previous || state.endsAt !== null) return
    const key = state.mode === 'work' ? 'workMin' : 'breakMin'
    if (settings.pomodoro[key] === previous.pomodoro[key]) return
    if (state.remainingMs !== previous.pomodoro[key] * 60000) return
    state = { ...state, remainingMs: settings.pomodoro[key] * 60000 }
    publish()
  })

  timer = setInterval(tick, 1000)
}

export function stopFocusService(): void {
  if (timer) clearInterval(timer)
  unsubscribeSettings?.()
  ipcMain.removeHandler('focus:get')
  ipcMain.removeHandler('focus:action')
  ipcMain.removeHandler('focus:getHistory')
  ipcMain.removeHandler('focus:addHistory')
  ipcMain.removeHandler('focus:deleteHistoryItem')
  ipcMain.removeHandler('focus:clearHistory')
}
