import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { store, defaultSettings } from './store'
import { launchProfileItems } from './launcher'
import { toggleClipboardPause } from './clipboard'
import type { Profile } from '../shared/types'

let tray: Tray | null = null

// Guaranteed fallback 32x32 Deskup icon (rendered from resources/icon.svg)
const FALLBACK_ICON_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAyVJREFUWEfNl1tI01Ecx79nM+d0ltmWFFQmWmKw1Mx5KbIswjIRlR56jIIeMn2ILAhv9VBIkPrSg489RBT0UJq9lFl5qYmXLGXiJgbmnBWy/f/b2nbi/x+7iez/36as8/Rn+10+v8v5nXMI/FZZmU62LI+pI0AlJEQNShP8/w/7mxALXHScAi+2sY72np4Mm8cW8Xxoqg1nQF2PQMiusB2JUaR0HkRyZeh5ajcnzgPwzkFfidFfPxlyloMgXNp/yaW6DY98NTml88msM4PkV+lvEIL76xeZeEuUooFoqvSfQFAoXm0dJSkGiKbGYA6n26US4FxpImx2ijf9ZjhdYYARYiGaaj0NVXWzQoLGq0ocyYvnVT9oGbR2mrBiDp0iZIAdqhg01iqRkxUXwD363YqWThMWjI6Q4gkJIH1PLJpqlchIjeWdcOmnFIiTucfJzJwdLR0m6ObsoiFEAxzMlKG5TgUuA9wy/Xai/u4iHE6K9tspSFG6f/+55EBzhwlcRsQsUQBFuXK01qmgSJDwNvU//uL6vUUYl50ABZKTpGhr2I59e92ZMTMuNLUv4aOWFWQQBOCMd3f5pvP4tA232oxQJktRoomHywW8/8xg0eTEnXolDqvlXqfll+f5TAVbggBc3R8/2Mnb4CJqfLiEtN2bcLwg8Jx6N2SBzmBH8zUVjuW7d8fFmwv4NuM9d9bkEASQxRKUn1CAYSl6+8189xcfcjtYvQZGGGgnragoTQRrdaFvmIHVFnyXCwL4OynKkSPPL8XjU1a+BNl+W1L7lRVVe49d0QBcvdWZvr3v74ire2GOr/YT01a8HWQEG5ATEAVw+mgC9qfJvAYHR1kMjwV2uDpThhKNry+mZ23o7bcIQggCKLdKcaFii9dQ3xCDsam193hWugwni30QT16uwLgcfDIKAijiJag8lcgDfJlgMTUbfMpxs6AgW8433+v3ZsHzQRBAMIcRCvz/AJfOJyH3QODJJzbokUkrup7+iWwSDj5LFetvTbmCGkNkABufgTCvZBGlxTsGuStZtC+lUb+WR/1hwpUjqk8zTz9E9XHqgYjG8/wfchtuPAsw8p4AAAAASUVORK5CYII='

export function getWindowIconPath(): string | undefined {
  const possiblePaths = [
    join(process.resourcesPath, 'icon.ico'),
    join(process.resourcesPath, 'icon.png'),
    join(process.resourcesPath, 'resources', 'icon.ico'),
    join(process.resourcesPath, 'resources', 'icon.png'),
    join(app.getAppPath(), 'resources', 'icon.ico'),
    join(app.getAppPath(), 'resources', 'icon.png'),
    join(__dirname, '../../resources', 'icon.ico'),
    join(__dirname, '../../resources', 'icon.png'),
    join(__dirname, '../resources', 'icon.ico'),
    join(__dirname, '../resources', 'icon.png'),
    join(process.cwd(), 'resources', 'icon.ico'),
    join(process.cwd(), 'resources', 'icon.png')
  ]

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      // Continue
    }
  }
  return undefined
}

export function getTrayIcon(): Electron.NativeImage {
  const possiblePaths = [
    join(process.resourcesPath, 'tray-icon.png'),
    join(process.resourcesPath, 'tray-icon-16.png'),
    join(process.resourcesPath, 'icon.ico'),
    join(process.resourcesPath, 'icon.png'),
    join(process.resourcesPath, 'resources', 'tray-icon.png'),
    join(process.resourcesPath, 'resources', 'tray-icon-16.png'),
    join(process.resourcesPath, 'resources', 'icon.ico'),
    join(process.resourcesPath, 'resources', 'icon.png'),
    join(app.getAppPath(), 'resources', 'tray-icon.png'),
    join(app.getAppPath(), 'resources', 'tray-icon-16.png'),
    join(app.getAppPath(), 'resources', 'icon.ico'),
    join(app.getAppPath(), 'resources', 'icon.png'),
    join(__dirname, '../../resources/tray-icon.png'),
    join(__dirname, '../../resources/tray-icon-16.png'),
    join(__dirname, '../../resources/icon.ico'),
    join(__dirname, '../../resources/icon.png'),
    join(__dirname, '../resources/tray-icon.png'),
    join(__dirname, '../resources/tray-icon-16.png'),
    join(__dirname, '../resources/icon.ico'),
    join(__dirname, '../resources/icon.png'),
    join(process.cwd(), 'resources', 'tray-icon.png'),
    join(process.cwd(), 'resources', 'tray-icon-16.png'),
    join(process.cwd(), 'resources', 'icon.ico'),
    join(process.cwd(), 'resources', 'icon.png')
  ]

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const img = nativeImage.createFromPath(p)
        if (!img.isEmpty()) {
          return img
        }
      }
    } catch {
      // Continue to next path
    }
  }

  return nativeImage.createFromDataURL(`data:image/png;base64,${FALLBACK_ICON_B64}`)
}

export function getWindowIcon(): Electron.NativeImage {
  const iconPath = getWindowIconPath()
  if (iconPath) {
    try {
      const img = nativeImage.createFromPath(iconPath)
      if (!img.isEmpty()) return img
    } catch {
      // Continue to fallback
    }
  }

  return nativeImage.createFromDataURL(`data:image/png;base64,${FALLBACK_ICON_B64}`)
}

export function createTray(
  getMainWindow: () => BrowserWindow | null,
  onQuit: () => void
): Tray {
  if (tray) {
    destroyTray()
  }

  const icon = getTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('Deskup — One-Click Workspace')

  tray.on('click', () => {
    const win = getMainWindow()
    if (!win) {
      updateTrayMenu(getMainWindow, onQuit)
      tray?.popUpContextMenu()
      return
    }
    if (win.isVisible()) {
      if (win.isFocused()) {
        win.hide()
      } else {
        win.focus()
      }
    } else {
      win.show()
      win.focus()
    }
  })

  tray.on('double-click', () => {
    const win = getMainWindow()
    if (win) {
      win.show()
      win.focus()
    }
  })

  updateTrayMenu(getMainWindow, onQuit)
  return tray
}

export function destroyTray(): void {
  if (tray) {
    try {
      tray.destroy()
    } catch {
      // Ignore
    }
    tray = null
  }
}

export function updateTrayMenu(
  getMainWindow: () => BrowserWindow | null,
  onQuit: () => void
): void {
  if (!tray) return

  const profiles: Profile[] = store.get('profiles', [])
  const settings = store.get('settings', defaultSettings)
  const isClipboardPaused = Boolean(settings.clipboard?.isPaused)

  const profileMenuItems: Electron.MenuItemConstructorOptions[] =
    profiles.length > 0
      ? profiles.map((p) => ({
          label: `${p.icon} Launch: ${p.name}`,
          click: () => {
            launchProfileItems(p.items, p.launchDelayMs)
          }
        }))
      : [{ label: 'No workspaces created yet', enabled: false }]

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Deskup — Workspace Launcher',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show Deskup',
      click: () => {
        const win = getMainWindow()
        if (win) {
          win.show()
          win.focus()
        }
      }
    },
    {
      label: 'Hide to Tray',
      click: () => {
        const win = getMainWindow()
        if (win) win.hide()
      }
    },
    { type: 'separator' },
    {
      label: 'Launch Workspaces',
      submenu: profileMenuItems
    },
    { type: 'separator' },
    {
      label: isClipboardPaused ? '▶ Resume Clipboard Tracking' : '⏸ Pause Clipboard Tracking',
      click: () => {
        toggleClipboardPause()
        updateTrayMenu(getMainWindow, onQuit)
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Deskup',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        onQuit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}
