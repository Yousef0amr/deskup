import { BrowserWindow, desktopCapturer, dialog, ipcMain, screen } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { getWindowIcon, getWindowIconPath } from './tray'

export interface SnipCapture {
  dataUrl: string
  width: number
  height: number
}

let snipWindow: BrowserWindow | null = null
let activeCapture: SnipCapture | null = null

export function closeSnipWindow(): void {
  if (snipWindow && !snipWindow.isDestroyed()) {
    snipWindow.close()
  }
  snipWindow = null
  activeCapture = null
}

export async function startSnipping(): Promise<void> {
  if (snipWindow && !snipWindow.isDestroyed()) {
    snipWindow.focus()
    return
  }

  const cursor = screen.getCursorScreenPoint()
  const allDisplays = screen.getAllDisplays()
  const display = screen.getDisplayNearestPoint(cursor)
  const displayIndex = Math.max(0, allDisplays.findIndex((d) => d.id === display.id))
  const maxW = Math.max(1, ...allDisplays.map((d) => Math.round(d.size.width * d.scaleFactor)))
  const maxH = Math.max(1, ...allDisplays.map((d) => Math.round(d.size.height * d.scaleFactor)))

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: maxW, height: maxH }
  })

  const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[displayIndex] ?? sources[0]
  if (!source || source.thumbnail.isEmpty()) {
    throw new Error('Could not capture screen')
  }

  activeCapture = {
    dataUrl: source.thumbnail.toDataURL(),
    width: display.bounds.width,
    height: display.bounds.height
  }

  snipWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    enableLargerThanScreen: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#000000',
    icon: getWindowIconPath() ?? getWindowIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  snipWindow.setBounds(display.bounds)
  snipWindow.setAlwaysOnTop(true, 'screen-saver')
  snipWindow.once('ready-to-show', () => {
    if (!snipWindow || snipWindow.isDestroyed()) return
    snipWindow.setBounds(display.bounds)
    snipWindow.show()
    snipWindow.focus()
  })
  snipWindow.on('closed', () => {
    snipWindow = null
    activeCapture = null
  })

  const hash = 'snip-overlay'
  if (process.env.ELECTRON_RENDERER_URL) {
    void snipWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${hash}`)
  } else {
    void snipWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
}

export function registerSnipIpc(): void {
  ipcMain.handle('snip:start', async () => {
    await startSnipping()
  })

  ipcMain.handle('snip:getCapture', (): SnipCapture | null => {
    return activeCapture
  })

  ipcMain.handle('snip:close', () => {
    closeSnipWindow()
  })

  ipcMain.handle('snip:saveImage', async (_, dataUrl: unknown): Promise<boolean> => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,') || dataUrl.length > 40_000_000) {
      throw new Error('Expected a PNG data URL')
    }
    const parent = snipWindow && !snipWindow.isDestroyed() ? snipWindow : undefined
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const result = await dialog.showSaveDialog(parent!, {
      title: 'Save screenshot',
      defaultPath: `snip-${stamp}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    })
    if (result.canceled || !result.filePath) return false
    const base64 = dataUrl.slice('data:image/png;base64,'.length)
    writeFileSync(result.filePath, Buffer.from(base64, 'base64'))
    return true
  })
}

