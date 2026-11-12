import { globalShortcut, BrowserWindow } from 'electron'
import { store, defaultSettings } from './store'
import { toggleClipboardPopup } from './clipboardPopup'
import { startSnipping } from './snipper'

let currentMainHotkey: string | null = null
let currentClipboardHotkey: string | null = null

export function registerGlobalShortcuts(getMainWindow: () => BrowserWindow | null): void {
  const settings = store.get('settings', defaultSettings)
  const mainHotkey = settings.hotkey || defaultSettings.hotkey
  const clipboardHotkey = settings.clipboard?.hotkey || defaultSettings.clipboard.hotkey

  // Unregister existing registered shortcuts
  if (currentMainHotkey) {
    try {
      globalShortcut.unregister(currentMainHotkey)
    } catch {
      // Ignore
    }
  }

  if (currentClipboardHotkey) {
    try {
      globalShortcut.unregister(currentClipboardHotkey)
    } catch {
      // Ignore
    }
  }

  // Check for conflict
  if (mainHotkey.toLowerCase() === clipboardHotkey.toLowerCase()) {
    console.warn(`Hotkey conflict detected: "${mainHotkey}" is assigned to multiple actions!`)
  }

  // 1. Main window shortcut
  currentMainHotkey = mainHotkey
  try {
    const success = globalShortcut.register(mainHotkey, () => {
      const win = getMainWindow()
      if (!win) return

      if (win.isVisible() && win.isFocused()) {
        win.hide()
      } else {
        win.show()
        win.focus()
      }
    })

    if (!success) {
      console.warn(`Failed to register global hotkey: ${mainHotkey}`)
    }
  } catch (err) {
    console.error(`Error registering main hotkey ${mainHotkey}:`, err)
  }

  // 2. Clipboard popup shortcut
  if (settings.clipboard?.enabled) {
    currentClipboardHotkey = clipboardHotkey
    try {
      const success = globalShortcut.register(clipboardHotkey, () => {
        toggleClipboardPopup()
      })

      if (!success) {
        console.warn(`Failed to register clipboard popup hotkey: ${clipboardHotkey}`)
      }
    } catch (err) {
      console.error(`Error registering clipboard hotkey ${clipboardHotkey}:`, err)
    }
  }

  // 3. Snipping tool shortcut
  try {
    globalShortcut.register('CommandOrControl+Shift+S', () => {
      void startSnipping()
    })
  } catch (err) {
    console.error('Error registering snipping hotkey:', err)
  }
}

export function unregisterGlobalShortcuts(): void {
  try {
    globalShortcut.unregisterAll()
  } catch {
    // Ignore cleanup error
  }
}
