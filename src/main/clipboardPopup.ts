import { BrowserWindow } from 'electron'
import { join } from 'path'
import { getWindowIconPath, getWindowIcon } from './tray'

let popupWindow: BrowserWindow | null = null

export function getClipboardPopupWindow(): BrowserWindow | null {
  return popupWindow
}

export function createClipboardPopupWindow(): BrowserWindow {
  if (popupWindow && !popupWindow.isDestroyed()) {
    return popupWindow
  }

  popupWindow = new BrowserWindow({
    width: 440,
    height: 520,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
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

  // Hide popup on blur
  popupWindow.on('blur', () => {
    popupWindow?.hide()
  })

  const hash = 'clipboard-popup'
  if (process.env.ELECTRON_RENDERER_URL) {
    popupWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${hash}`)
  } else {
    popupWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }

  return popupWindow
}

export function toggleClipboardPopup(): void {
  if (!popupWindow || popupWindow.isDestroyed()) {
    createClipboardPopupWindow()
  }

  if (popupWindow!.isVisible()) {
    popupWindow!.hide()
  } else {
    popupWindow!.center()
    popupWindow!.show()
    popupWindow!.focus()
  }
}

export function hideClipboardPopup(): void {
  if (popupWindow && !popupWindow.isDestroyed() && popupWindow.isVisible()) {
    popupWindow.hide()
  }
}

