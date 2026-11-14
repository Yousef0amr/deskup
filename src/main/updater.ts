import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '../shared/types'

/**
 * Auto-updates from GitHub Releases (see `publish` in electron-builder.yml).
 *
 * A release is made by running `npm run release` with GH_TOKEN set: electron-builder
 * uploads the installer plus `latest.yml`, which installed copies poll. Updates download
 * in the background (when the setting allows it) and install on the next quit, or right
 * away when the user clicks "Restart to update".
 */

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000
const FIRST_CHECK_DELAY_MS = 15_000

let status: UpdateStatus = { state: 'idle', currentVersion: app.getVersion() }
let timer: NodeJS.Timeout | null = null
let isAllowed: () => boolean = () => true

function setStatus(next: Partial<UpdateStatus> & Pick<UpdateStatus, 'state'>): void {
  status = { currentVersion: app.getVersion(), ...next }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('update:status', status)
  }
}

function setError(error: unknown): void {
  const message = (error as Error)?.message ?? String(error)
  // Before the first GitHub release exists there is simply nothing to update to.
  if (/No published versions/i.test(message)) {
    setStatus({ state: 'up-to-date', checkedAt: Date.now() })
  } else {
    setStatus({ state: 'error', message: message.split('\n')[0] })
  }
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    setStatus({ state: 'unsupported', message: 'Updates are only available in the installed app.' })
    return status
  }
  if (!isAllowed()) {
    setStatus({ state: 'idle', message: 'Update checks are paused while Deskup is offline.' })
    return status
  }
  if (status.state === 'checking' || status.state === 'downloading') return status
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    setError(error)
  }
  return status
}

/**
 * @param autoDownload whether a found update starts downloading on its own.
 * @param allowed      returns false while network use is not allowed (offline mode).
 */
export function initUpdater(options: { autoDownload: () => boolean; allowed?: () => boolean }): void {
  if (options.allowed) isAllowed = options.allowed

  ipcMain.handle('update:getStatus', () => status)
  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:download', async () => {
    if (status.state !== 'available') return
    await autoUpdater.downloadUpdate()
  })
  ipcMain.handle('update:install', () => {
    if (status.state === 'downloaded') autoUpdater.quitAndInstall()
  })

  if (!app.isPackaged) {
    status = { state: 'unsupported', currentVersion: app.getVersion(), message: 'Updates are only available in the installed app.' }
    return
  }

  autoUpdater.autoDownload = options.autoDownload()
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }))
  autoUpdater.on('update-not-available', () => setStatus({ state: 'up-to-date', checkedAt: Date.now() }))
  autoUpdater.on('update-available', (info) =>
    setStatus({ state: autoUpdater.autoDownload ? 'downloading' : 'available', version: info.version, percent: 0 })
  )
  autoUpdater.on('download-progress', (p) =>
    setStatus({ state: 'downloading', version: status.version, percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => setStatus({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', setError)

  setTimeout(() => {
    void checkForUpdates()
    timer = setInterval(() => {
      autoUpdater.autoDownload = options.autoDownload()
      void checkForUpdates()
    }, CHECK_EVERY_MS)
  }, FIRST_CHECK_DELAY_MS)
}

export function setAutoDownload(enabled: boolean): void {
  autoUpdater.autoDownload = enabled
}

export function stopUpdater(): void {
  if (timer) clearInterval(timer)
  timer = null
}
