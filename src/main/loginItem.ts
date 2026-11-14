import { app } from 'electron'
import { AUTOSTART_ARG } from '../shared/profiles'

/**
 * Register (or remove) Deskup as a login item.
 *
 * Only the packaged app registers itself. In development `process.execPath` is the bare
 * electron.exe, and a login entry pointing at it opens Electron's default window (or a
 * stale dev build) every time Windows starts. So in dev we only clean up such entries.
 */
export function applyLoginItem(openAtLogin: boolean): void {
  try {
    if (app.isPackaged) {
      if (openAtLogin) {
        app.setLoginItemSettings({ openAtLogin: true, name: 'Deskup', args: [AUTOSTART_ARG] })
      } else {
        app.setLoginItemSettings({ openAtLogin: false, name: 'Deskup', args: [AUTOSTART_ARG] })
        app.setLoginItemSettings({ openAtLogin: false, name: 'Deskup' })
      }
      return
    }
    // Remove entries older dev runs may have left: the project-path one and the
    // default-named one Electron creates when no name is passed.
    app.setLoginItemSettings({ openAtLogin: false, name: 'Deskup', path: process.execPath, args: [app.getAppPath()] })
    app.setLoginItemSettings({ openAtLogin: false, path: process.execPath })
  } catch (error) {
    console.warn('Could not update login item settings:', error)
  }
}
