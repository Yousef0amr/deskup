import React from 'react'
import { Clock, Palette, Smile } from 'lucide-react'
import { Input } from './ui/input'
import ProfileAutoLaunchOption from './ProfileAutoLaunchOption'

interface ProfileEditorMetaProps {
  name: string
  icon: string
  color: string
  launchDelayMs: number
  autoLaunch: boolean
  alsoEnableLogin: boolean
  emojiPresets: string[]
  colorPresets: string[]
  onNameChange: (val: string) => void
  onIconChange: (val: string) => void
  onColorChange: (val: string) => void
  onDelayChange: (val: number) => void
  onAutoLaunchChange: (val: boolean) => void
  onAlsoEnableLoginChange: (val: boolean) => void
}

export default function ProfileEditorMeta({
  name,
  icon,
  color,
  launchDelayMs,
  autoLaunch,
  alsoEnableLogin,
  emojiPresets,
  colorPresets,
  onNameChange,
  onIconChange,
  onColorChange,
  onDelayChange,
  onAutoLaunchChange,
  onAlsoEnableLoginChange
}: ProfileEditorMetaProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      {/* Name Input */}
      <div>
        <label className="block text-xs font-semibold text-text mb-1">
          Profile Name *
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Fullstack Dev, Design Studio, Daily Standup"
          className="h-9 text-sm"
        />
      </div>

      {/* Emoji Icon Picker */}
      <div>
        <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
          <Smile className="w-3.5 h-3.5 text-amber-500" />
          <span>Icon</span>
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-elevated border border-border flex items-center justify-center text-xl shrink-0">
            {icon}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {emojiPresets.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => onIconChange(em)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${
                  icon === em ? 'bg-indigo-600/20 border-2 border-indigo-500 scale-110' : 'hover:bg-hover'
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color Accent Picker */}
      <div>
        <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-indigo-500" />
          <span>Accent Color</span>
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {colorPresets.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onColorChange(hex)}
              className={`w-7 h-7 rounded-lg transition-transform ${
                color === hex ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2 ring-offset-background' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {/* Sequential Launch Delay */}
      <div>
        <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-500" />
          <span>Launch Stagger Delay (ms)</span>
        </label>
        <Input
          type="number"
          min="0"
          max="5000"
          step="100"
          value={launchDelayMs}
          onChange={(e) => onDelayChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="h-8 w-44 font-mono text-xs"
        />
        <p className="text-[11px] text-muted mt-1">
          Delay between launching each item to prevent CPU spikes (default: 300ms).
        </p>
      </div>

      <ProfileAutoLaunchOption
        autoLaunch={autoLaunch}
        alsoEnableLogin={alsoEnableLogin}
        onAutoLaunchChange={onAutoLaunchChange}
        onAlsoEnableLoginChange={onAlsoEnableLoginChange}
      />
    </div>
  )
}
