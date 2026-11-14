import { BrowserWindow, clipboard, desktopCapturer, dialog, ipcMain, nativeImage, screen } from 'electron'
import { execFile } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { getWindowIcon, getWindowIconPath } from './tray'
import { OCR_PS1 } from './ocrScript'
import type { SnipBegin, SnipFrame } from '../shared/types'

/**
 * Snipping tool.
 *
 * Speed matters here, so the overlay window is created once (hidden) and reused:
 * pressing the hotkey only moves it onto the display under the cursor and shows it.
 * The screen is captured while the overlay is still hidden (so neither it nor the cursor
 * ends up in the shot), handed over as raw BGRA pixels (no PNG encode/decode), painted,
 * and only then shown — so it appears already frozen, with no flash.
 */

let snipWindow: BrowserWindow | null = null
let rendererReady: Promise<void> | null = null
let session = 0
let visible = false
let tempDir: string | null = null
let capturerWarmed = false

function getTempDir(): string {
  if (!tempDir) tempDir = mkdtempSync(join(tmpdir(), 'deskup-snip-'))
  return tempDir
}

function createSnipWindow(): BrowserWindow {
  const win = new BrowserWindow({
    show: false,
    frame: false,
    backgroundColor: '#000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    enableLargerThanScreen: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    icon: getWindowIconPath() ?? getWindowIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false
    }
  })
  win.setAlwaysOnTop(true, 'screen-saver')

  rendererReady = new Promise((resolve) => {
    const onReady = (e: Electron.IpcMainEvent): void => {
      if (e.sender !== win.webContents) return
      ipcMain.removeListener('snip:ready', onReady)
      resolve()
    }
    ipcMain.on('snip:ready', onReady)
  })

  win.on('closed', () => {
    snipWindow = null
    rendererReady = null
    visible = false
  })

  const hash = 'snip-overlay'
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${hash}`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
  return win
}

/** Create the hidden overlay ahead of time so the first snip is as fast as later ones. */
export function prewarmSnipWindow(): void {
  if (!snipWindow || snipWindow.isDestroyed()) snipWindow = createSnipWindow()
  if (!capturerWarmed) {
    capturerWarmed = true
    // The very first desktopCapturer call also initialises the OS capturer (1–3s).
    // Pay that once in the background shortly after launch, not on the first snip.
    setTimeout(() => {
      void desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }).catch(() => {})
    }, 4000)
  }
}

export function closeSnipWindow(): void {
  visible = false
  session++
  if (snipWindow && !snipWindow.isDestroyed()) {
    snipWindow.webContents.send('snip:reset')
    snipWindow.hide()
  }
  // Hiding the screen-saver-level overlay can drop pins out of the topmost band; restore them.
  for (const pin of pinWindows) if (!pin.isDestroyed() && pin.isVisible()) pin.setAlwaysOnTop(true, 'floating')
}

/**
 * Capture one display. desktopCapturer thumbnails leave out the mouse cursor and the
 * overlay (it is still hidden), which is exactly what a snip should contain.
 */
async function captureDisplay(display: Electron.Display): Promise<Electron.NativeImage> {
  const size = {
    width: Math.round(display.bounds.width * display.scaleFactor),
    height: Math.round(display.bounds.height * display.scaleFactor)
  }
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: size })
  const index = screen.getAllDisplays().findIndex((d) => d.id === display.id)
  const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[index] ?? sources[0]
  if (!source || source.thumbnail.isEmpty()) throw new Error('Could not capture screen')
  return source.thumbnail
}

/** Resolves when the overlay has painted the given session's frame (or after a timeout). */
function waitForPaint(win: BrowserWindow, forSession: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer)
      ipcMain.removeListener('snip:painted', onPainted)
      resolve()
    }
    const onPainted = (e: Electron.IpcMainEvent, painted: unknown): void => {
      if (e.sender === win.webContents && painted === forSession) done()
    }
    const timer = setTimeout(done, timeoutMs)
    ipcMain.on('snip:painted', onPainted)
  })
}

export async function startSnipping(): Promise<void> {
  if (visible && snipWindow && !snipWindow.isDestroyed()) {
    snipWindow.focus()
    return
  }
  prewarmSnipWindow()
  const win = snipWindow!
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const current = ++session
  visible = true

  try {
    const [image] = await Promise.all([captureDisplay(display), rendererReady])
    if (current !== session || win.isDestroyed()) return

    // Size the (still hidden) overlay first so the renderer lays out at the right size.
    win.setBounds(display.bounds)
    const begin: SnipBegin = {
      session: current,
      width: display.bounds.width,
      height: display.bounds.height,
      scaleFactor: display.scaleFactor
    }
    const { width, height } = image.getSize()
    // Raw BGRA pixels: no PNG encode here and no decode in the renderer.
    const frame: SnipFrame = { session: current, width, height, pixels: image.toBitmap() }
    const painted = waitForPaint(win, current, 250)
    win.webContents.send('snip:begin', begin)
    win.webContents.send('snip:frame', frame)
    await painted
    if (current !== session || win.isDestroyed()) return

    win.show()
    // A second setBounds fixes the size when moving between monitors with different DPI.
    win.setBounds(display.bounds)
    win.setAlwaysOnTop(true, 'screen-saver')
    win.focus()
  } catch (error) {
    console.error('Snip capture failed:', error)
    closeSnipWindow()
  }
}

function assertPngDataUrl(dataUrl: unknown): asserts dataUrl is string {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,') || dataUrl.length > 60_000_000) {
    throw new Error('Expected a PNG data URL')
  }
}

function pngBuffer(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64')
}

const pinWindows = new Set<BrowserWindow>()

/** Float the snip above all windows at the spot it was taken from. */
function pinImage(dataUrl: string, rect: { x: number; y: number; width: number; height: number }): void {
  const dir = getTempDir()
  const id = `${Date.now()}-${pinWindows.size}`
  const imgPath = join(dir, `pin-${id}.png`)
  const htmlPath = join(dir, `pin-${id}.html`)
  writeFileSync(imgPath, pngBuffer(dataUrl))
  writeFileSync(
    htmlPath,
    `<!doctype html><html><head><meta charset="utf-8"><title>Pinned snip</title><style>
html,body{margin:0;height:100%;overflow:hidden;background:#111}
img{display:block;width:100%;height:100%;object-fit:fill;-webkit-app-region:drag;user-select:none}
body{box-shadow:inset 0 0 0 1px rgba(55,83,223,.9)}
button{position:fixed;top:6px;right:6px;width:22px;height:22px;border:0;border-radius:6px;background:rgba(17,17,17,.75);color:#fff;font:14px/22px system-ui;cursor:pointer;opacity:0;transition:opacity .12s;-webkit-app-region:no-drag}
body:hover button{opacity:1}
</style></head><body><img src="./pin-${id}.png" draggable="false" alt=""><button title="Close (Esc)" onclick="window.close()">×</button>
<script>addEventListener('keydown',e=>{if(e.key==='Escape')window.close()})</script></body></html>`
  )

  const pin = new BrowserWindow({
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.max(40, Math.round(rect.width)),
    height: Math.max(40, Math.round(rect.height)),
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: true,
    title: 'Pinned snip',
    icon: getWindowIconPath() ?? getWindowIcon(),
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  pin.setAspectRatio(rect.width / rect.height)
  pin.once('ready-to-show', () => {
    pin.show()
    pin.setAlwaysOnTop(true, 'floating')
  })
  pinWindows.add(pin)
  pin.on('closed', () => {
    pinWindows.delete(pin)
    rmSync(imgPath, { force: true })
    rmSync(htmlPath, { force: true })
  })
  void pin.loadFile(htmlPath)
}

function runOcr(dataUrl: string): Promise<string> {
  if (process.platform !== 'win32') {
    return Promise.reject(new Error('Text recognition is only available on Windows'))
  }
  const dir = getTempDir()
  const scriptPath = join(dir, 'ocr.ps1')
  const imgPath = join(dir, `ocr-${Date.now()}.png`)
  writeFileSync(scriptPath, OCR_PS1, 'utf8')
  writeFileSync(imgPath, pngBuffer(dataUrl))
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Path', imgPath],
      { timeout: 30_000, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        rmSync(imgPath, { force: true })
        if (error) reject(new Error(stderr.trim() || error.message))
        else resolve(stdout.replace(/\r\n/g, '\n').trim())
      }
    )
  })
}

export function registerSnipIpc(): void {
  ipcMain.handle('snip:start', async () => {
    await startSnipping()
  })

  ipcMain.handle('snip:close', () => {
    closeSnipWindow()
  })

  ipcMain.handle('snip:copyImage', (_, dataUrl: unknown): void => {
    assertPngDataUrl(dataUrl)
    const img = nativeImage.createFromBuffer(pngBuffer(dataUrl))
    if (img.isEmpty()) throw new Error('Image is empty')
    clipboard.writeImage(img)
  })

  ipcMain.handle('snip:saveImage', async (_, dataUrl: unknown): Promise<boolean> => {
    assertPngDataUrl(dataUrl)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const options: Electron.SaveDialogOptions = {
      title: 'Save screenshot',
      defaultPath: `snip-${stamp}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    }
    const parent = snipWindow && !snipWindow.isDestroyed() ? snipWindow : null
    // The overlay is always-on-top at screen-saver level; drop it so the dialog is visible.
    parent?.setAlwaysOnTop(false)
    try {
      const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
      if (result.canceled || !result.filePath) return false
      writeFileSync(result.filePath, pngBuffer(dataUrl))
      return true
    } finally {
      if (parent && !parent.isDestroyed() && visible) parent.setAlwaysOnTop(true, 'screen-saver')
    }
  })

  ipcMain.handle('snip:pin', (e, dataUrl: unknown, rect: unknown): void => {
    assertPngDataUrl(dataUrl)
    const r = rect as { x?: unknown; y?: unknown; width?: unknown; height?: unknown }
    if (![r?.x, r?.y, r?.width, r?.height].every((v) => typeof v === 'number' && Number.isFinite(v))) {
      throw new Error('Invalid pin rectangle')
    }
    // Rect arrives in overlay coordinates; convert to screen coordinates.
    const origin = BrowserWindow.fromWebContents(e.sender)?.getBounds() ?? { x: 0, y: 0 }
    pinImage(dataUrl, {
      x: origin.x + (r.x as number),
      y: origin.y + (r.y as number),
      width: r.width as number,
      height: r.height as number
    })
  })

  ipcMain.handle('snip:copyText', async (_, dataUrl: unknown): Promise<string> => {
    assertPngDataUrl(dataUrl)
    const text = await runOcr(dataUrl)
    if (text) clipboard.writeText(text)
    return text
  })
}

export function disposeSnipper(): void {
  for (const pin of pinWindows) if (!pin.isDestroyed()) pin.destroy()
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
  tempDir = null
}
