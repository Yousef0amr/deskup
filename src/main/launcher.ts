import { shell } from 'electron'
import { spawn } from 'child_process'
import { existsSync, statSync } from 'fs'
import { dirname, isAbsolute } from 'path'
import { cleanLaunchEnv, windowsStartArgs } from './launchEnv'
import type { ProfileItem, LaunchResult } from '../shared/types'

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export async function launchItem(item: ProfileItem): Promise<LaunchResult> {
  const { id, type, target } = item

  if (!target || typeof target !== 'string' || !target.trim()) {
    return { itemId: id, ok: false, error: 'Target path or URL is empty' }
  }

  const cleanTarget = target.trim()

  switch (type) {
    case 'url': {
      try {
        const parsed = new URL(cleanTarget)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return {
            itemId: id,
            ok: false,
            error: 'Only http:// and https:// URLs are permitted for security'
          }
        }
        await shell.openExternal(cleanTarget)
        return { itemId: id, ok: true }
      } catch (err) {
        return {
          itemId: id,
          ok: false,
          error: (err as Error)?.message || 'Invalid URL'
        }
      }
    }

    case 'folder': {
      try {
        if (!existsSync(cleanTarget)) {
          return { itemId: id, ok: false, error: `Folder not found: ${cleanTarget}` }
        }

        const stat = statSync(cleanTarget)
        if (!stat.isDirectory()) {
          return { itemId: id, ok: false, error: `Path is not a directory: ${cleanTarget}` }
        }

        const openErr = await shell.openPath(cleanTarget)
        if (openErr) {
          return { itemId: id, ok: false, error: openErr }
        }
        return { itemId: id, ok: true }
      } catch (err) {
        return {
          itemId: id,
          ok: false,
          error: (err as Error)?.message || 'Failed to open folder'
        }
      }
    }

    case 'app': {
      try {
        const onDisk = isAbsolute(cleanTarget) && existsSync(cleanTarget)
        if (isAbsolute(cleanTarget) && !onDisk) {
          return { itemId: id, ok: false, error: `App not found: ${cleanTarget}. It may have been moved or uninstalled.` }
        }
        return await spawnApp(id, cleanTarget, onDisk)
      } catch (err) {
        return {
          itemId: id,
          ok: false,
          error: (err as Error)?.message || 'Failed to launch application'
        }
      }
    }

    default:
      return { itemId: id, ok: false, error: `Unsupported item type: ${type}` }
  }
}

/**
 * Start an app detached, with a clean environment and its own folder as working
 * directory, so it behaves as if it was opened from the Start menu.
 */
function spawnApp(itemId: string, target: string, onDisk: boolean): Promise<LaunchResult> {
  const env = cleanLaunchEnv(process.env)
  let command: string
  let args: string[]
  let verbatim = false

  if (process.platform === 'win32') {
    const startArgs = windowsStartArgs(target)
    if (!startArgs) return Promise.resolve({ itemId, ok: false, error: 'This path contains characters that cannot be launched safely (" or %).' })
    command = process.env.ComSpec || 'cmd.exe'
    args = startArgs
    verbatim = true
  } else if (process.platform === 'darwin') {
    command = 'open'
    args = target.endsWith('.app') ? ['-a', target] : [target]
  } else {
    command = target
    args = []
  }

  return new Promise<LaunchResult>((resolve) => {
    let settled = false
    const finish = (result: LaunchResult) => {
      if (!settled) {
        settled = true
        resolve(result)
      }
    }
    const proc = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      env,
      cwd: onDisk ? dirname(target) : undefined,
      windowsHide: true,
      windowsVerbatimArguments: verbatim
    })
    proc.on('error', (err) => finish({ itemId, ok: false, error: `Failed to launch application: ${err.message}` }))
    // `start` exits non-zero when Windows can't find or open the target.
    proc.on('exit', (code) => {
      if (code && code !== 0) finish({ itemId, ok: false, error: `Windows could not open "${target}" (exit code ${code}).` })
      else finish({ itemId, ok: true })
    })
    proc.unref()
    // Long-running direct launches (Linux) never exit; treat "still running" as success.
    setTimeout(() => finish({ itemId, ok: true }), 1500)
  })
}

export async function launchProfileItems(
  items: ProfileItem[],
  delayMs = 300
): Promise<LaunchResult[]> {
  const results: LaunchResult[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const res = await launchItem(item)
    results.push(res)

    if (i < items.length - 1 && delayMs > 0) {
      await sleep(delayMs)
    }
  }

  return results
}

