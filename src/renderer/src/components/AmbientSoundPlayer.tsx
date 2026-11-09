import React, { useState } from 'react'
import { Volume2, VolumeX, CloudRain, Radio, Waves, Coffee } from 'lucide-react'
import { ambientAudio, type AmbientSoundType } from '../utils/ambientAudio'

export default function AmbientSoundPlayer(): React.JSX.Element {
  const [isPlaying, setIsPlaying] = useState(false)
  const [soundType, setSoundType] = useState<AmbientSoundType>('rain')
  const [volume, setVolume] = useState(0.5)

  const handleTogglePlay = () => {
    if (isPlaying) {
      ambientAudio.stop()
      setIsPlaying(false)
    } else {
      ambientAudio.play(soundType, volume)
      setIsPlaying(true)
    }
  }

  const handleSelectSound = (type: AmbientSoundType) => {
    setSoundType(type)
    if (isPlaying) {
      ambientAudio.play(type, volume)
    }
  }

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol)
    ambientAudio.setVolume(newVol)
  }

  const sounds: { type: AmbientSoundType; label: string; icon: React.ReactNode }[] = [
    { type: 'rain', label: 'Rain', icon: <CloudRain className="w-3.5 h-3.5" /> },
    { type: 'noise', label: 'Noise', icon: <Radio className="w-3.5 h-3.5" /> },
    { type: 'waves', label: 'Waves', icon: <Waves className="w-3.5 h-3.5" /> },
    { type: 'cafe', label: 'Cafe', icon: <Coffee className="w-3.5 h-3.5" /> }
  ]

  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-elevated/70 border border-border/60 text-xs">
      {/* Sound Type Chips */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {sounds.map((s) => (
          <button
            key={s.type}
            onClick={() => handleSelectSound(s.type)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-[11px] font-medium shrink-0 ${
              soundType === s.type
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-muted hover:text-text hover:bg-hover'
            }`}
          >
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Play/Stop & Volume Slider */}
      <div className="flex items-center gap-2 shrink-0 border-l border-border/50 pl-2">
        <button
          onClick={handleTogglePlay}
          className={`p-1.5 rounded-lg transition-colors ${
            isPlaying
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold'
              : 'text-muted hover:text-text hover:bg-hover'
          }`}
          title={isPlaying ? 'Pause ambient sound' : 'Play ambient sound'}
        >
          {isPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 opacity-60" />}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="w-14 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-indigo-600"
          title={`Volume: ${Math.round(volume * 100)}%`}
        />
      </div>
    </div>
  )
}

