import { app } from 'electron'

/**
 * Register (or remove) Deskup as a login item.
 *
 * In a packaged build `process.execPath` *is* Deskup. In development it is the bare
 * electron.exe, which on its own opens Electron's default welcome page — so we must also
 * pass the project folder as an argument, or "Launch at login" starts the wrong thing.
 * The same path/args must be used when disabling, so Windows finds the entry to remove.
 */
export function applyLoginItem(openAtLogin: boolean): void {
  try {
    const options: Electron.Settings = { openAtLogin, name: 'Deskup' }
    if (!app.isPackaged) {
      options.path = process.execPath
      options.args = [app.getAppPath()]
    }
    app.setLoginItemSettings(options)
  } catch (error) {
    console.warn('Could not update login item settings:', error)
  }
}
