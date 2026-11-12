// App-wide music player for the user's own tracks. It lives outside React so music keeps
// playing (and keeps its state) when the dashboard unmounts during tab switches.
import type { MusicTrack } from '../../../shared/types'

export interface MusicState {
  tracks: MusicTrack[]
  index: number
  playing: boolean
  shuffle: boolean
  repeatOne: boolean
  error: string | null
}

const PREFS_KEY = 'deskup.music'

function readPrefs(): { index: number; shuffle: boolean; repeatOne: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    return { index: Number(raw.index) || 0, shuffle: !!raw.shuffle, repeatOne: !!raw.repeatOne }
  } catch {
    return { index: 0, shuffle: false, repeatOne: false }
  }
}

class MusicPlayer {
  private audio: HTMLAudioElement | null = null
  private listeners = new Set<() => void>()
  private state: MusicState = { tracks: [], playing: false, error: null, ...readPrefs() }
  private loaded = false

  private emit(patch: Partial<MusicState>): void {
    this.state = { ...this.state, ...patch }
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ index: this.state.index, shuffle: this.state.shuffle, repeatOne: this.state.repeatOne }))
    } catch {
      // Preferences are a convenience only.
    }
    this.listeners.forEach((l) => l())
  }

  private element(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio()
      this.audio.preload = 'auto'
      this.audio.addEventListener('ended', () => (this.state.repeatOne ? this.restart() : this.next()))
      this.audio.addEventListener('error', () => {
        const track = this.current()
        this.emit({ playing: false, error: track ? `Can't play “${track.name}”. The file may have moved or uses an unsupported format.` : null })
      })
      this.audio.addEventListener('pause', () => this.state.playing && this.emit({ playing: false }))
      this.audio.addEventListener('play', () => !this.state.playing && this.emit({ playing: true, error: null }))
    }
    return this.audio
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    if (!this.loaded) {
      this.loaded = true
      void window.deskup.music.list().then((tracks) => this.setTracks(tracks))
      window.deskup.music.onChanged((tracks) => this.setTracks(tracks))
    }
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): MusicState => this.state

  private setTracks(tracks: MusicTrack[]): void {
    const playingId = this.current()?.id
    const keptIndex = playingId ? tracks.findIndex((t) => t.id === playingId) : -1
    if (playingId && keptIndex < 0) this.stop()
    this.emit({ tracks, index: keptIndex >= 0 ? keptIndex : Math.min(this.state.index, Math.max(0, tracks.length - 1)) })
  }

  current(): MusicTrack | undefined {
    return this.state.tracks[this.state.index]
  }

  private load(index: number): void {
    const track = this.state.tracks[index]
    if (!track) return
    const audio = this.element()
    audio.src = `deskup-media://music/${encodeURIComponent(track.id)}`
    this.emit({ index, error: null })
  }

  play(index = this.state.index, volume?: number): void {
    const audio = this.element()
    if (volume !== undefined) audio.volume = volume
    const track = this.state.tracks[index]
    if (!track) return
    if (!audio.src.endsWith(encodeURIComponent(track.id)) || index !== this.state.index) this.load(index)
    void audio.play().catch(() => {
      // The 'error' listener reports unreadable files.
    })
    this.emit({ playing: true })
  }

  pause(): void {
    this.audio?.pause()
    this.emit({ playing: false })
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
    }
    this.emit({ playing: false })
  }

  private restart(): void {
    if (!this.audio) return
    this.audio.currentTime = 0
    void this.audio.play()
  }

  next(): void {
    const { tracks, index, shuffle } = this.state
    if (!tracks.length) return
    let nextIndex = (index + 1) % tracks.length
    if (shuffle && tracks.length > 1) {
      do nextIndex = Math.floor(Math.random() * tracks.length)
      while (nextIndex === index)
    }
    this.play(nextIndex)
  }

  previous(): void {
    const { tracks, index } = this.state
    if (!tracks.length) return
    // Like most players: restart the song unless we're at its very beginning.
    if (this.audio && this.audio.currentTime > 3) return this.restart()
    this.play((index - 1 + tracks.length) % tracks.length)
  }

  setVolume(volume: number): void {
    this.element().volume = Math.max(0, Math.min(1, volume))
  }

  toggleShuffle(): void {
    this.emit({ shuffle: !this.state.shuffle })
  }

  toggleRepeatOne(): void {
    this.emit({ repeatOne: !this.state.repeatOne })
  }
}

export const musicPlayer = new MusicPlayer()
