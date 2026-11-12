import { join } from 'path'
import { startFocusService, stopFocusService } from './focus'
import { registerIpcHandlers } from './ipc'
import { store, defaultSettings } from './store'
import { createTray, updateTrayMenu, getWindowIcon, getWindowIconPath, destroyTray } from './tray'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts'
import { startClipboardWatcher, stopClipboardWatcher } from './clipboard'
import { createClipboardPopupWindow } from './clipboardPopup'
import { registerMediaProtocol, registerMusicIpc } from './media'
import { registerSnipIpc } from './snipper'
import { applyLoginItem } from './loginItem'
import { BrowserWindow } from 'electron'
import { app } from 'electron/main'
import { shell } from 'electron/common'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 740,
    minWidth: 840,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#020617',
    icon: getWindowIconPath() ?? getWindowIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Minimize to tray if enabled
  mainWindow.on('close', (event) => {
    const settings = store.get('settings', defaultSettings)
    if (settings.minimizeToTray && !isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // Prevent navigation to unknown protocols and open allowed external links in browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url.startsWith('https://') || details.url.startsWith('http://')) {
      shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const isDev = Boolean(process.env.ELECTRON_RENDERER_URL)
    if (!isDev || !navigationUrl.startsWith(process.env.ELECTRON_RENDERER_URL!)) {
      event.preventDefault()
      if (navigationUrl.startsWith('https://') || navigationUrl.startsWith('http://')) {
        shell.openExternal(navigationUrl)
      }
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// App lifecycle
app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  destroyTray()
  stopFocusService()
  stopClipboardWatcher()
  unregisterGlobalShortcuts()
})

app.whenReady().then(() => {
  const handleQuit = () => {
    isQuitting = true
    destroyTray()
    app.quit()
  }

  registerMediaProtocol()
  registerSnipIpc()
  // Keep the OS startup entry in sync with the setting (also repairs stale entries).
  applyLoginItem(store.get('settings', defaultSettings).launchAtLogin)
  registerMusicIpc(() => mainWindow)
  startFocusService()
  createWindow()

  // Initialize clipboard popup window
  createClipboardPopupWindow()

  // Start polling clipboard
  startClipboardWatcher()

  // Initialize System Tray
  createTray(() => mainWindow, handleQuit)

  // Initialize Global Shortcuts
  registerGlobalShortcuts(() => mainWindow)

  // Register validated IPC handlers with reactive hooks
  registerIpcHandlers(() => mainWindow, {
    onProfilesChanged: () => {
      updateTrayMenu(() => mainWindow, handleQuit)
    },
    onSettingsChanged: (settings) => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('settings:changed', settings)
      }
      registerGlobalShortcuts(() => mainWindow)
      updateTrayMenu(() => mainWindow, handleQuit)
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    const settings = store.get('settings', defaultSettings)
    if (!settings.minimizeToTray) {
      app.quit()
    }
  }
})
