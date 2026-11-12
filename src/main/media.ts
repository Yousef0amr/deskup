import { app, dialog, ipcMain, net, protocol, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, promises as fsp } from 'fs'
import { basename, extname, join } from 'path'
import { pathToFileURL } from 'url'
import { store } from './store'
import type { MusicTrack } from '../shared/types'

// The sandboxed renderer cannot read the disk. Local media is served through this
// private scheme, and only for files Deskup itself tracks (by id), never arbitrary paths:
//   deskup-media://music/<trackId>   -> a file the user added to their music library
//   deskup-media://clip/<clipId>     -> an image captured from the clipboard
export const MEDIA_SCHEME = 'deskup-media'

export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'webm']
const MAX_TRACKS = 500

// Must run before the app is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true } }
])

export function clipImagesDir(): string {
  return join(app.getPath('userData'), 'clipboard-images')
}

function resolveMediaPath(kind: string, id: string): string | null {
  if (!/^[a-z0-9_-]{1,64}$/i.test(id)) return null
  if (kind === 'music') return store.get('musicTracks', []).find((t) => t.id === id)?.path ?? null
  if (kind === 'clip') {
    const clip = store.get('clipboardHistory', []).find((c) => c.id === id)
    return clip?.image ? join(clipImagesDir(), `${clip.id}.png`) : null
  }
  return null
}

function broadcastTracks(tracks: MusicTrack[]): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send('music:changed', tracks)
}

export function registerMediaProtocol(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    const url = new URL(request.url)
    const id = decodeURIComponent(url.pathname.replace(/^\//, ''))
    const filePath = resolveMediaPath(url.hostname, id)
    if (!filePath || !existsSync(filePath)) return new Response('Not found', { status: 404 })
    if (url.hostname === 'clip') {
      const data = await fsp.readFile(filePath)
      return new Response(data, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } })
    }
    // Forward Range headers so audio can seek and stream large files.
    return net.fetch(pathToFileURL(filePath).toString(), { headers: request.headers })
  })
}

export function registerMusicIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('music:list', (): MusicTrack[] => store.get('musicTracks', []))

  ipcMain.handle('music:add', async (): Promise<MusicTrack[]> => {
    const win = getMainWindow()
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Add music for focus sessions',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: AUDIO_EXTENSIONS }]
    })
    const tracks = store.get('musicTracks', [])
    if (result.canceled || result.filePaths.length === 0) return tracks
    const known = new Set(tracks.map((t) => t.path.toLowerCase()))
    for (const filePath of result.filePaths) {
      const ext = extname(filePath).slice(1).toLowerCase()
      if (!AUDIO_EXTENSIONS.includes(ext) || known.has(filePath.toLowerCase())) continue
      known.add(filePath.toLowerCase())
      tracks.push({ id: randomUUID(), name: basename(filePath, extname(filePath)), path: filePath })
    }
    const next = tracks.slice(0, MAX_TRACKS)
    store.set('musicTracks', next)
    broadcastTracks(next)
    return next
  })

  ipcMain.handle('music:remove', (_, id: unknown): MusicTrack[] => {
    const next = store.get('musicTracks', []).filter((t) => t.id !== id)
    store.set('musicTracks', next)
    broadcastTracks(next)
    return next
  })
}
