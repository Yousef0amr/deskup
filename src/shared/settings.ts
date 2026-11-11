import type { Settings } from './types'

export const defaultSettings: Settings = {
  theme: 'system',
  pomodoro: {
    workMin: 25,
    breakMin: 5
  },
  hotkey: 'CommandOrControl+Shift+D',
  launchAtLogin: false,
  minimizeToTray: true,
  dailyFocusGoalMin: 120,
  clipboard: {
    enabled: true,
    maxItems: 100,
    isPaused: false,
    hotkey: 'CommandOrControl+Shift+V',
    captureImages: true
  }
}

export function mergeSettings(value: Partial<Settings> = {}): Settings {
  return { ...defaultSettings, ...value,
    pomodoro: { ...defaultSettings.pomodoro, ...value.pomodoro },
    clipboard: { ...defaultSettings.clipboard, ...value.clipboard }
  }
}
