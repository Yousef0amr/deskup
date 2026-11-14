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
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAehJREFUWEdjZEACnp632d9ysuQzMjAEMDAx6jH8/8+NLE82m5HxK8O//5f+MzBsEP7+Z+L27ao/YWYxwhjmwQ+8GP7/m8HAyChLtkXEaPz//zEDI1PGybUK20DKwQ4AW87wfysx+qmnhtEb5AhGULC/42S+TXOfo7v8///HQt//qjKaBd0vY2Rk6KSez4g36f9/hnJG86D7xxgYGSyJ10ZFlf8ZjjOahzz4Qo3UHuDKyyAiyIziupv3fzEcPv0Nt4sZGb8ymgff/0+pn7KiBRniAvmxGlPa+QqvI6jigGmNEgxG2hxYHTBn1QcGEMYFCDrAVI+DQUyYBUX/12//GE5c+M7w4yck8GjmAA0lNgYbEy6sjr/z8BfDgZOQ+KWZA0DBiiton7/+w7B1/5fB4YD6XBEGT3serCHVMfMtw4bdn8lLA8SGAD8vE0NBghCDuAhqWrly6yfDtKXv8WYyvImQWAdQko3xOkBeipXB1QZ7jXzxxg+G05d+UGI3WC/BbAhyhDBaCfft+z+GG/d+UWw5UQ6gii14DCEYAsQURMSoIaskJKYgIkYNvlCkOBdQmlNGHTC4Q4CYgogYNfgTIYEmGTEFETFqsDoC3CQb6EbpgDfLB7xjAoqbAe2awRLHgHZOYY4YiO45AHnTYjzBxwirAAAAAElFTkSuQmCC'

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
