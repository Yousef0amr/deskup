import React, { useState, useSyncExternalStore } from 'react'
import {
  Volume2,
  CloudRain,
  Radio,
  Waves,
  Coffee,
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat1,
  ListMusic,
  Plus,
  X
} from 'lucide-react'
import { ambientAudio, type AmbientSoundType } from '../utils/ambientAudio'
import { musicPlayer } from '../utils/musicPlayer'
import { Slider } from './ui/slider'
import { useToast } from './ui/toast'
import { cn } from '../lib/utils'

type Source = AmbientSoundType | 'music'

const SOURCES: { id: Source; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'rain', label: 'Rain', icon: CloudRain },
  { id: 'noise', label: 'Noise', icon: Radio },
  { id: 'waves', label: 'Waves', icon: Waves },
  { id: 'cafe', label: 'Cafe', icon: Coffee },
  { id: 'music', label: 'Music', icon: Music }
]

const SOURCE_KEY = 'deskup.soundSource'
const VOLUME_KEY = 'deskup.soundVolume'

function readPref<T>(key: string, fallback: T, parse: (raw: string) => T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : parse(raw)
  } catch {
    return fallback
  }
}

function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Preferences are a convenience only.
  }
}

function IconButton({ label, active, onClick, disabled, children }: {
  label: string
  active?: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-40',
        active ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted hover:bg-hover hover:text-text'
      )}
    >
      {children}
    </button>
  )
}

export default function AmbientSoundPlayer(): React.JSX.Element {
  const music = useSyncExternalStore(musicPlayer.subscribe, musicPlayer.getSnapshot)
  const ambient = ambientAudio.getStatus()
  const [source, setSource] = useState<Source>(() =>
    ambient.isPlaying ? ambient.type : music.playing ? 'music' : readPref<Source>(SOURCE_KEY, 'rain', (v) => v as Source)
  )
  const [ambientPlaying, setAmbientPlaying] = useState(ambient.isPlaying)
  const [volume, setVolume] = useState(() => readPref(VOLUME_KEY, 0.5, Number))
  const [showList, setShowList] = useState(false)
  const toast = useToast()

  const isMusic = source === 'music'
  const isPlaying = isMusic ? music.playing : ambientPlaying
  const track = music.tracks[music.index]

  const addMusic = async () => {
    const before = music.tracks.length
    const tracks = await window.deskup.music.add()
    const added = tracks.length - before
    if (added > 0) toast(`Added ${added} ${added === 1 ? 'track' : 'tracks'}`)
  }

  const selectSource = (next: Source) => {
    writePref(SOURCE_KEY, next)
    setSource(next)
    if (!isPlaying) return
    // Switching while playing hands playback over to the new source.
    if (next === 'music') {
      ambientAudio.stop()
      setAmbientPlaying(false)
      if (music.tracks.length) musicPlayer.play(music.index, volume)
    } else {
      musicPlayer.pause()
      ambientAudio.play(next, volume)
      setAmbientPlaying(true)
    }
  }

  const togglePlay = () => {
    if (isMusic) {
      if (!music.tracks.length) return void addMusic()
      if (music.playing) musicPlayer.pause()
      else {
        ambientAudio.stop()
        setAmbientPlaying(false)
        musicPlayer.play(music.index, volume)
      }
      return
    }
    if (ambientPlaying) {
      ambientAudio.stop()
      setAmbientPlaying(false)
    } else {
      musicPlayer.pause()
      ambientAudio.play(source, volume)
      setAmbientPlaying(true)
    }
  }

  const changeVolume = (values: number[]) => {
    const v = values[0] ?? 0.5
    setVolume(v)
    writePref(VOLUME_KEY, String(v))
    ambientAudio.setVolume(v)
    musicPlayer.setVolume(v)
  }

  const nowPlaying = isMusic
    ? track
      ? track.name
      : 'Add your own music'
    : `${SOURCES.find((s) => s.id === source)?.label} · ambient`

  return (
    <div className="rounded-lg border border-border bg-elevated/40 p-1.5">
      {/* Source picker */}
      <div className="grid grid-cols-5 gap-0.5" role="radiogroup" aria-label="Sound">
        {SOURCES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={source === id}
            onClick={() => selectSource(id)}
            className={cn(
              'flex h-7 min-w-0 items-center justify-center gap-1 rounded-md text-[11px] font-medium transition-colors',
              source === id ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* Transport */}
      <div className="mt-1.5 flex items-center gap-1 px-0.5">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause sound' : isMusic && !music.tracks.length ? 'Add music' : 'Play sound'}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
            isPlaying ? 'bg-indigo-600 text-white' : 'bg-surface text-text shadow-sm hover:bg-hover'
          )}
        >
          {isMusic && !music.tracks.length ? (
            <Plus className="h-3.5 w-3.5" />
          ) : isPlaying ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 translate-x-px fill-current" />
          )}
        </button>

        {isMusic && music.tracks.length > 0 && (
          <>
            <IconButton label="Previous" onClick={() => musicPlayer.previous()}>
              <SkipBack className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label="Next" onClick={() => musicPlayer.next()}>
              <SkipForward className="h-3.5 w-3.5" />
            </IconButton>
          </>
        )}

        <button
          type="button"
          onClick={() => (isMusic ? (music.tracks.length ? setShowList(!showList) : void addMusic()) : togglePlay())}
          className="min-w-0 flex-1 truncate px-1 text-left text-xs text-text"
          title={isMusic && track ? `${track.name}\n${track.path}` : undefined}
        >
          {nowPlaying}
          {isMusic && music.tracks.length > 1 && (
            <span className="ml-1 text-muted tabular-nums">
              {music.index + 1}/{music.tracks.length}
            </span>
          )}
        </button>

        {isMusic && music.tracks.length > 0 && (
          <IconButton label="Playlist" active={showList} onClick={() => setShowList(!showList)}>
            <ListMusic className="h-3.5 w-3.5" />
          </IconButton>
        )}
        <Volume2 className="ml-1 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
        <div className="w-16 shrink-0">
          <Slider min={0} max={1} step={0.05} value={[volume]} onValueChange={changeVolume} aria-label="Volume" />
        </div>
      </div>

      {isMusic && music.error && <p role="alert" className="px-1.5 pt-1 text-[11px] text-rose-600 dark:text-rose-400">{music.error}</p>}

      {/* Playlist */}
      {isMusic && showList && music.tracks.length > 0 && (
        <div className="mt-1.5 border-t border-border pt-1.5 animate-fade-in">
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[11px] font-medium text-muted">Your music</span>
            <div className="flex items-center">
              <IconButton label="Shuffle" active={music.shuffle} onClick={() => musicPlayer.toggleShuffle()}>
                <Shuffle className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label="Repeat this track" active={music.repeatOne} onClick={() => musicPlayer.toggleRepeatOne()}>
                <Repeat1 className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton label="Add music files" onClick={() => void addMusic()}>
                <Plus className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>
          <ul className="max-h-40 space-y-px overflow-y-auto">
            {music.tracks.map((t, i) => (
              <li key={t.id} className="group flex items-center gap-1 rounded-md pr-1 hover:bg-surface">
                <button
                  type="button"
                  onClick={() => {
                    ambientAudio.stop()
                    setAmbientPlaying(false)
                    musicPlayer.play(i, volume)
                  }}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1 text-left text-xs',
                    i === music.index ? 'font-medium text-indigo-600 dark:text-indigo-400' : 'text-text'
                  )}
                  title={t.path}
                >
                  <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-muted">
                    {i === music.index && music.playing ? '♪' : i + 1}
                  </span>
                  <span className="truncate">{t.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void window.deskup.music.remove(t.id)}
                  aria-label={`Remove ${t.name}`}
                  className="rounded p-0.5 text-muted opacity-0 hover:text-rose-500 group-hover:opacity-100 focus:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
