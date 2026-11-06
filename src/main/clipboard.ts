import { clipboard, BrowserWindow } from 'electron'
import { store, defaultSettings } from './store'
import type { ClipItem } from '../shared/types'

let pollInterval: NodeJS.Timeout | null = null
let lastCopiedText = ''

function broadcastClipboardChange(clips: ClipItem[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('clipboard:changed', clips)
    }
  }
}

export function trimClips(clips: ClipItem[], maxItems: number): ClipItem[] {
  if (clips.length <= maxItems) return clips

  // Pinned items must never be auto-removed
  const pinned = clips.filter((c) => c.pinned)
  const unpinned = clips.filter((c) => !c.pinned)

  const allowedUnpinnedCount = Math.max(0, maxItems - pinned.length)
  const keptUnpinned = unpinned.slice(0, allowedUnpinnedCount)

  // Re-sort to preserve newest-first order
  const combined = [...pinned, ...keptUnpinned]
  return combined.sort((a, b) => b.createdAt - a.createdAt)
}

export function startClipboardWatcher(): void {
  if (pollInterval) return

  // Initialize lastCopiedText with current clipboard content to avoid capturing old content on start
  try {
    lastCopiedText = clipboard.readText() || ''
  } catch {
    lastCopiedText = ''
  }

  pollInterval = setInterval(() => {
    try {
      const settings = store.get('settings', defaultSettings)
      const clipboardConfig = settings.clipboard || defaultSettings.clipboard

      if (!clipboardConfig.enabled || clipboardConfig.isPaused) {
        return
      }

      const text = clipboard.readText()
      if (!text || text === lastCopiedText || !text.trim()) {
        return
      }

      lastCopiedText = text

      const currentClips = store.get('clipboardHistory', [])
      const existingIndex = currentClips.findIndex((c) => c.text === text)

      let wasPinned = false
      let newClips = [...currentClips]

      if (existingIndex >= 0) {
        wasPinned = newClips[existingIndex].pinned
        newClips.splice(existingIndex, 1)
      }

      const newClip: ClipItem = {
        id: 'clip_' + Date.now() + Math.random().toString(36).substring(2, 6),
        text,
        createdAt: Date.now(),
        pinned: wasPinned
      }

      newClips.unshift(newClip)
      newClips = trimClips(newClips, clipboardConfig.maxItems || 100)

      store.set('clipboardHistory', newClips)
      broadcastClipboardChange(newClips)
    } catch (err) {
      console.error('Error in clipboard polling:', err)
    }
  }, 500)
}

export function stopClipboardWatcher(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

export function copyClipText(text: string): void {
  lastCopiedText = text
  clipboard.writeText(text)
}

export function toggleClipPin(id: string): ClipItem[] {
  const clips = store.get('clipboardHistory', [])
  const updated = clips.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
  store.set('clipboardHistory', updated)
  broadcastClipboardChange(updated)
  return updated
}

export function deleteClipItem(id: string): ClipItem[] {
  const clips = store.get('clipboardHistory', [])
  const updated = clips.filter((c) => c.id !== id)
  store.set('clipboardHistory', updated)
  broadcastClipboardChange(updated)
  return updated
}

export function clearClipboardHistory(includePinned = false): ClipItem[] {
  const clips = store.get('clipboardHistory', [])
  const updated = includePinned ? [] : clips.filter((c) => c.pinned)
  store.set('clipboardHistory', updated)
  broadcastClipboardChange(updated)
  return updated
}

export function toggleClipboardPause(): boolean {
  const settings = store.get('settings', defaultSettings)
  const current = settings.clipboard || defaultSettings.clipboard
  const newPaused = !current.isPaused

  store.set('settings', {
    ...settings,
    clipboard: {
      ...current,
      isPaused: newPaused
    }
  })

  return newPaused
}

