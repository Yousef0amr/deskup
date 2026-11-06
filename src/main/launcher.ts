import { shell } from 'electron'
import { spawn } from 'child_process'
import { existsSync, statSync } from 'fs'
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
        // 1. If target exists on disk directly
        if (existsSync(cleanTarget)) {
          const openErr = await shell.openPath(cleanTarget)
          if (!openErr) {
            return { itemId: id, ok: true }
          }
        }

        // 2. Fallback: try launching as system executable / command
        return await new Promise<LaunchResult>((resolve) => {
          let resolved = false
          const proc = spawn(cleanTarget, [], {
            detached: true,
            stdio: 'ignore',
            shell: process.platform === 'win32'
          })

          proc.on('error', (err) => {
            if (!resolved) {
              resolved = true
              resolve({
                itemId: id,
                ok: false,
                error: `Failed to launch application: ${err.message}`
              })
            }
          })

          // Give spawn a moment to see if spawn fails immediately (e.g. ENOENT)
          setTimeout(() => {
            if (!resolved) {
              resolved = true
              proc.unref()
              resolve({ itemId: id, ok: true })
            }
          }, 150)
        })
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

