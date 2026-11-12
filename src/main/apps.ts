import { promises as fs } from 'fs'
import path from 'path'
import type { InstalledApp } from '../shared/types'

let cachedApps: InstalledApp[] | null = null
let lastScanTime = 0
let pendingScan: Promise<InstalledApp[]> | null = null
const CACHE_TTL_MS = 60000 // Cache for 1 minute

async function scanWindowsShortcuts(dir: string, map: Map<string, InstalledApp>): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await scanWindowsShortcuts(full, map)
      } else if (entry.name.toLowerCase().endsWith('.lnk')) {
        const name = entry.name.slice(0, -4).trim()
        const lower = name.toLowerCase()
        if (
          !lower.includes('uninstall') &&
          !lower.includes('help') &&
          !lower.includes('readme') &&
          !lower.includes('license') &&
          !lower.includes('documentation') &&
          !lower.includes('website') &&
          !lower.includes('release notes')
        ) {
          if (!map.has(lower)) {
            map.set(lower, { name, path: full })
          }
        }
      }
    }
  } catch {
    // Ignore permissions or read errors
  }
}

async function scanMacApps(dir: string, map: Map<string, InstalledApp>): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.toLowerCase().endsWith('.app')) {
        const name = entry.name.slice(0, -4).trim()
        const lower = name.toLowerCase()
        if (!map.has(lower)) {
          map.set(lower, { name, path: path.join(dir, entry.name) })
        }
      }
    }
  } catch {
    // Ignore
  }
}

async function scanLinuxDesktopFiles(dir: string, map: Map<string, InstalledApp>): Promise<void> {
  try {
    const files = await fs.readdir(dir)
    for (const file of files) {
      if (file.toLowerCase().endsWith('.desktop')) {
        const full = path.join(dir, file)
        try {
          const content = await fs.readFile(full, 'utf8')
          const nameMatch = content.match(/^Name=(.+)$/m)
          const execMatch = content.match(/^Exec=(.+)$/m)
          if (nameMatch && execMatch) {
            const name = nameMatch[1].trim()
            const execCmd = execMatch[1].split(' ')[0].replace(/%[a-zA-Z]/g, '').trim()
            const lower = name.toLowerCase()
            if (!map.has(lower)) {
              map.set(lower, { name, path: execCmd })
            }
          }
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // Ignore
  }
}

export async function getInstalledApps(): Promise<InstalledApp[]> {
  const now = Date.now()
  if (cachedApps && now - lastScanTime < CACHE_TTL_MS) {
    return cachedApps
  }
  if (pendingScan) return pendingScan

  pendingScan = scanInstalledApps()
  try {
    cachedApps = await pendingScan
    lastScanTime = Date.now()
    return cachedApps
  } finally {
    pendingScan = null
  }
}

async function scanInstalledApps(): Promise<InstalledApp[]> {
  const map = new Map<string, InstalledApp>()

  if (process.platform === 'win32') {
    // Common Windows Built-ins
    const builtIns: InstalledApp[] = [
      { name: 'Command Prompt', path: 'cmd.exe' },
      { name: 'Windows PowerShell', path: 'powershell.exe' },
      { name: 'Windows Terminal', path: 'wt.exe' },
      { name: 'Notepad', path: 'notepad.exe' },
      { name: 'Calculator', path: 'calc.exe' },
      { name: 'File Explorer', path: 'explorer.exe' },
      { name: 'Task Manager', path: 'taskmgr.exe' }
    ]
    for (const b of builtIns) {
      map.set(b.name.toLowerCase(), b)
    }

    const startDirs = [
      path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join(process.env.ALLUSERSPROFILE || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join(process.env.ProgramData || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs')
    ]

    for (const d of new Set(startDirs)) {
      await scanWindowsShortcuts(d, map)
    }
  } else if (process.platform === 'darwin') {
    const macDirs = [
      '/Applications',
      '/System/Applications',
      path.join(process.env.HOME || '', 'Applications')
    ]
    for (const d of macDirs) {
      await scanMacApps(d, map)
    }
  } else {
    // Linux
    const linuxDirs = [
      '/usr/share/applications',
      '/usr/local/share/applications',
      path.join(process.env.HOME || '', '.local', 'share', 'applications')
    ]
    for (const d of linuxDirs) {
      await scanLinuxDesktopFiles(d, map)
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}
