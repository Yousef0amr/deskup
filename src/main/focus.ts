import { BrowserWindow, ipcMain, Notification } from 'electron'
import { store } from './store'
import { advanceFocus, changeFocus } from '../shared/focus'
import type { FocusAction, FocusState } from '../shared/types'

let timer: NodeJS.Timeout | undefined
let unsubscribeSettings: (() => void) | undefined
export function startFocusService(): void {
  let state: FocusState = store.get('focusState') ?? {
    mode: 'work', remainingMs: store.get('settings').pomodoro.workMin * 60000,
    endsAt: null, sessionsCompleted: 0
  }
  const publish = () => {
    store.set('focusState', state)
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('focus:changed', state)
    }
  }
  const tick = () => {
    const next = advanceFocus(state, store.get('settings').pomodoro, Date.now())
    if (next === state) return
    state = next
    publish()
    if (Notification.isSupported()) new Notification({
      title: state.mode === 'break' ? 'Focus session complete' : 'Break complete',
      body: 'Your next session is ready. Start it when you are ready.'
    }).show()
  }
  ipcMain.handle('focus:get', () => { tick(); return state })
  ipcMain.handle('focus:action', (_, action: unknown) => {
    if (!['start', 'pause', 'reset', 'skip'].includes(action as string)) throw new Error('Invalid focus action')
    tick()
    state = changeFocus(state, action as FocusAction, store.get('settings').pomodoro, Date.now())
    publish()
    return state
  })
  tick()
  unsubscribeSettings = store.onDidChange('settings', (settings, previous) => {
    if (!settings || !previous || state.endsAt !== null) return
    const key = state.mode === 'work' ? 'workMin' : 'breakMin'
    if (state.remainingMs !== previous.pomodoro[key] * 60000) return
    state = { ...state, remainingMs: settings.pomodoro[key] * 60000 }
    publish()
  })
  timer = setInterval(tick, 1000)
}

export function stopFocusService(): void {
  if (timer) clearInterval(timer)
  unsubscribeSettings?.()
}
