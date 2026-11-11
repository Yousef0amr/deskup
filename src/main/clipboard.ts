import { clipboard, BrowserWindow, nativeImage, type NativeImage } from 'electron'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, promises as fsp, writeFileSync } from 'fs'
import { join } from 'path'
import { store, defaultSettings } from './store'
import { clipImagesDir } from './media'
import type { ClipItem } from '../shared/types'

let pollInterval: NodeJS.Timeout | null = null
let lastCopiedText = ''
let lastImageSignature = ''
let tick = 0
const MAX_IMAGE_EDGE = 3840

/** Cheap fingerprint: hash a tiny thumbnail instead of the full bitmap. */
function imageSignature(img: NativeImage): string {
  const { width, height } = img.getSize()
  const thumb = img.resize({ width: 48 }).toBitmap()
  return `${width}x${height}:${createHash('sha1').update(thumb).digest('hex')}`
}

function readClipboardImageSignature(): string {
  try {
    const img = clipboard.readImage()
    return img.isEmpty() ? '' : imageSignature(img)
  } catch {
    return ''
  }
}

/** Delete saved PNGs that no clip references any more. */
async function pruneImageFiles(clips: ClipItem[]): Promise<void> {
  const keep = new Set(clips.filter((c) => c.image).map((c) => `${c.id}.png`))
  try {
    for (const file of await fsp.readdir(clipImagesDir())) {
      if (!keep.has(file)) await fsp.unlink(join(clipImagesDir(), file)).catch(() => {})
    }
  } catch {
    // Folder may not exist yet.
  }
}

function saveClips(clips: ClipItem[]): void {
  store.set('clipboardHistory', clips)
  broadcastClipboardChange(clips)
  void pruneImageFiles(clips)
}

function captureImage(maxItems: number): void {
  const img = clipboard.readImage()
  if (img.isEmpty()) return
  const signature = imageSignature(img)
  if (signature === lastImageSignature) return
  lastImageSignature = signature

  let { width, height } = img.getSize()
  let toSave = img
  if (Math.max(width, height) > MAX_IMAGE_EDGE) {
    toSave = width >= height ? img.resize({ width: MAX_IMAGE_EDGE }) : img.resize({ height: MAX_IMAGE_EDGE })
    ;({ width, height } = toSave.getSize())
  }

  const clip: ClipItem = {
    id: 'clip_' + Date.now() + Math.random().toString(36).substring(2, 6),
    text: `Image ${width}×${height}`,
    createdAt: Date.now(),
    pinned: false,
    image: { width, height }
  }
  mkdirSync(clipImagesDir(), { recursive: true })
  writeFileSync(join(clipImagesDir(), `${clip.id}.png`), toSave.toPNG())
  saveClips(trimClips([clip, ...store.get('clipboardHistory', [])], maxItems))
}
let unsubscribeSettings: (() => void) | null = null

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
  let clipboardConfig = store.get('settings', defaultSettings).clipboard || defaultSettings.clipboard
  unsubscribeSettings = store.onDidChange('settings', (settings) => {
    clipboardConfig = settings?.clipboard || defaultSettings.clipboard
  })

  // Initialize lastCopiedText with current clipboard content to avoid capturing old content on start
  try {
    lastCopiedText = clipboard.readText() || ''
  } catch {
    lastCopiedText = ''
  }
  lastImageSignature = readClipboardImageSignature()

  pollInterval = setInterval(() => {
    try {
      if (!clipboardConfig.enabled || clipboardConfig.isPaused) {
        return
      }

      const text = clipboard.readText()
      if (!text || !text.trim()) {
        // No text: maybe an image (screenshot, copied picture). Check about once a second.
        tick++
        if (clipboardConfig.captureImages !== false && tick % 2 === 0) {
          captureImage(clipboardConfig.maxItems || 100)
        }
        return
      }
      if (text === lastCopiedText) return

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
      saveClips(trimClips(newClips, clipboardConfig.maxItems || 100))
    } catch (err) {
      console.error('Error in clipboard polling:', err)
    }
  }, 500)
}

export function stopClipboardWatcher(): void {
  unsubscribeSettings?.()
  unsubscribeSettings = null
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

export function copyClipText(text: string): void {
  lastCopiedText = text
  clipboard.writeText(text)
}

/** Put a saved image clip back on the system clipboard. */
export function copyClipImage(id: string): void {
  const file = join(clipImagesDir(), `${id}.png`)
  if (!existsSync(file)) throw new Error('This image is no longer available')
  const img = nativeImage.createFromPath(file)
  lastImageSignature = imageSignature(img)
  clipboard.writeImage(img)
}

export function toggleClipPin(id: string): ClipItem[] {
  const clips = store.get('clipboardHistory', [])
  const updated = clips.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
  saveClips(updated)
  return updated
}

export function deleteClipItem(id: string): ClipItem[] {
  const clips = store.get('clipboardHistory', [])
  const updated = clips.filter((c) => c.id !== id)
  saveClips(updated)
  return updated
}

export function clearClipboardHistory(includePinned = false): ClipItem[] {
  const clips = store.get('clipboardHistory', [])
  const updated = includePinned ? [] : clips.filter((c) => c.pinned)
  saveClips(updated)
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
