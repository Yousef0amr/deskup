import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { store, defaultSettings } from './store'
import { launchProfileItems } from './launcher'
import { toggleClipboardPause } from './clipboard'
import type { Profile } from '../shared/types'

let tray: Tray | null = null

// Guaranteed fallback 32x32 valid Deskup icon (Indigo-to-Cyan gradient with crisp centered sparkle star)
const FALLBACK_ICON_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADo0lEQVR42u3X2UtUURwH8N7anip6KnOgqDRtnNEZc6lGyzQDiYp2ooiwBaNFW6aJxjIzK6bI9mi3fdFcsqKGeoigLKMgnQkiLecuR880wkwb840TtHnu6L2gPfX7B+6H33pPjx7/QyF6DwzXDZ1mtcdYq5yJRxpp8jkvEkspxpyniL9IYb5MYb5KYbpBEVdOEVvhRWyVF8YaL4x3vDDe88L44CMMNe/piIO3nIOzbfZeg8J1qj4eMafYMe4wRXyJDPMBCabDEuKOSog7LiH2hAzjKRmGszIMpTJiLsjQX5KhvyJj9HWC6DKC6JsEUZUEo6oJIm8TRN4liLzfCv0jH3Trdjk6/visnY4kB8EYh4T4fRLM+6UuQ0Tca8GohzQ0os+AcF2KoxUJxSIS9kjdhmCZUCzH8EyrPWmHhMQisVsRrBysJziAaXmlM6lARFKh2CUI29O2kAjWmBwgNf8dTc4X0RWImbcpfF+CKH/3SRHBpoMDpG1vxdgtIrQgUk7JsJwhfyGmlLXiifgFLBhCKRNsRHlAPsHYzaImxNJyiuwKqpgJhmCZUOoJtid4wBaCcZsETYjK1wFUNAQQs/sNh2CZCNWYbFnxABvB+I2CasTUky3wfQrC9zmIjBK3pulgG5MDTLISWNYJqhBpJTJc0lf8jNfNfliOCaoRbG3zgA0EllyhU8T0QwQu8ffHf0aD/BVZpS2qEOx2cID0PIKUNYIiYvIOCTmnKapfBNAWCCJUsHKwnmCN2X46/kSwA8bvgZUCUlcJiojM7RJyTlJU13UCCHxDWW0LFpc2wXKi40xwgAkrPOgIwTIRn+tG1lYX6pv83MfrP/iRXvQKURufIcpWB32RC8b9TSERHGDiMg/UIFhPpBd64BJ+90H9ez+SbS8wOu8ZjAVvVG1MHpDtgRbEjH3kRzl8/m/I3PoS+tW1MG17q3pt83tgiQdaEawnyh8TxKyshcnm1nQ7+DFc7EF7RNZ6EXXuz2jzB1F06SOHYI259FAjDDnPNR8wfgwXetAeUXzW+6vODKE0HRmFIsy5DZqvKD8Fs+tpe8Q8m/QLwDIRqhyJ1kZNV9Sw182fY3PaNWf6Ag+UECwTrByd9YRaxMg1ZfwPybDotfaM+c1QQmhpTDWIQZl5/C9Z775huslzm/EvED37hym/ESKM+Y7uRoRPLejkbdCNCF3WNoe6p1nfMB3rCdaYStOhFpGw3kWjF91wDknNs/fsF6b7/+hViu9LnRb82AICOgAAAABJRU5ErkJggg=='

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
