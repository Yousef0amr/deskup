import React, { useState, useEffect } from 'react'
import {
  Sun,
  Moon,
  Monitor,
  Flame,
  Coffee,
  Keyboard,
  Power,
  Minimize2,
  Download,
  Upload,
  Check,
  AlertCircle,
  ClipboardList,
  Pause,
  Trash2,
  ShieldCheck
} from 'lucide-react'
import type { Settings } from '../../../shared/types'

interface SettingsPageProps {
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void
}

export default function SettingsPage({ onThemeChange }: SettingsPageProps): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saveBanner, setSaveBanner] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const s = await window.deskup.settings.get()
        setSettings(s)
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }
    load()
  }, [])

  const updateSettings = async (patch: Partial<Settings>) => {
    if (!settings) return
    try {
      const updated = await window.deskup.settings.update(patch)
      setSettings(updated)
      if (patch.theme && onThemeChange) {
        onThemeChange(patch.theme)
      }
      setSaveBanner('Settings saved')
      setTimeout(() => setSaveBanner(null), 2500)
    } catch (err) {
      console.error('Failed to update settings:', err)
      setSaveBanner('Could not save settings: ' + (err as Error).message)
    }
  }

  const handleClearClipboard = async () => {
    if (confirm('Clear all clipboard history (including pinned items)?')) {
      await window.deskup.clipboard.clear(true)
      setSaveBanner('Clipboard history cleared')
      setTimeout(() => setSaveBanner(null), 2500)
    }
  }

  const handleExport = async () => {
    try {
      const success = await window.deskup.data.exportAll()
      if (success) {
        setImportStatus('Data exported successfully!')
        setTimeout(() => setImportStatus(null), 3000)
      }
    } catch (err) {
      setImportStatus('Failed to export: ' + (err as Error).message)
    }
  }

  const handleImport = async () => {
    try {
      const success = await window.deskup.data.importAll()
      if (success) {
        setImportStatus('Data imported successfully! Reloading...')
        const reloaded = await window.deskup.settings.get()
        setSettings(reloaded)
        if (onThemeChange) onThemeChange(reloaded.theme)
        setTimeout(() => setImportStatus(null), 3000)
      }
    } catch (err) {
      setImportStatus('Failed to import: ' + (err as Error).message)
    }
  }

  if (!settings) {
    return <div className="text-center py-12 text-muted text-sm">Loading settings...</div>
  }

  const hasHotkeyConflict =
    Boolean(settings.hotkey && settings.clipboard?.hotkey) &&
    settings.hotkey.trim().toLowerCase() === settings.clipboard.hotkey.trim().toLowerCase()

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text">App Settings</h2>
        <p className="text-xs text-muted mt-1">
          Customize your workspace experience, shortcuts, focus timer, clipboard, and data.
        </p>
      </div>

      {saveBanner && (
        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{saveBanner}</span>
        </div>
      )}

      {importStatus && (
        <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{importStatus}</span>
        </div>
      )}

      {hasHotkeyConflict && (
        <div className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Warning: Main window hotkey and clipboard popup hotkey conflict with each other!</span>
        </div>
      )}

      {/* Theme Section */}
      <section className="bg-surface/60 border border-border rounded-2xl p-6 shadow-lg space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text">Appearance</h3>
          <p className="text-xs text-muted">Choose your preferred visual theme</p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          <button
            onClick={() => updateSettings({ theme: 'light' })}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all text-xs font-medium ${
              settings.theme === 'light'
                ? 'bg-indigo-600/20 border-indigo-500 text-text shadow-md shadow-indigo-600/20'
                : 'bg-elevated/60 border-border/60 text-muted hover:text-text'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Light</span>
          </button>

          <button
            onClick={() => updateSettings({ theme: 'dark' })}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all text-xs font-medium ${
              settings.theme === 'dark'
                ? 'bg-indigo-600/20 border-indigo-500 text-text shadow-md shadow-indigo-600/20'
                : 'bg-elevated/60 border-border/60 text-muted hover:text-text'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Dark</span>
          </button>

          <button
            onClick={() => updateSettings({ theme: 'system' })}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all text-xs font-medium ${
              settings.theme === 'system'
                ? 'bg-indigo-600/20 border-indigo-500 text-text shadow-md shadow-indigo-600/20'
                : 'bg-elevated/60 border-border/60 text-muted hover:text-text'
            }`}
          >
            <Monitor className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>System</span>
          </button>
        </div>
      </section>

      {/* Clipboard History Section */}
      <section className="bg-surface/60 border border-border rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Clipboard History</span>
            </h3>
            <p className="text-xs text-muted">Remember and search copied text and code</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.clipboard?.enabled ?? true}
                onChange={(e) =>
                  updateSettings({
                    clipboard: {
                      ...settings.clipboard,
                      enabled: e.target.checked
                    }
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Security / Privacy notice */}
        <div className="p-3 bg-elevated/50 border border-border/60 rounded-xl flex items-center gap-2.5 text-xs text-text">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Clipboard history is stored locally on this machine and is never sent over any network.
          </span>
        </div>

        <div className="space-y-4 max-w-md pt-1">
          {/* Pause Toggle */}
          <label className="flex items-center justify-between p-3 bg-elevated/40 border border-border/50 rounded-xl cursor-pointer hover:bg-elevated/60 transition-colors">
            <div className="flex items-center gap-2.5">
              <Pause className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <div>
                <div className="text-xs font-medium text-text">Pause tracking</div>
                <div className="text-[11px] text-muted">Temporarily stop capturing copied items</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.clipboard?.isPaused ?? false}
              onChange={(e) =>
                updateSettings({
                  clipboard: {
                    ...settings.clipboard,
                    isPaused: e.target.checked
                  }
                })
              }
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-hover border-border"
            />
          </label>

          {/* Max Items */}
          <div className="p-3 bg-elevated/40 border border-border/50 rounded-xl space-y-1.5">
            <label className="text-xs font-medium text-text">Maximum saved items</label>
            <input
              type="number"
              min="10"
              max="1000"
              step="10"
              value={settings.clipboard?.maxItems ?? 100}
              onChange={(e) =>
                updateSettings({
                  clipboard: {
                    ...settings.clipboard,
                    maxItems: Math.max(10, parseInt(e.target.value) || 100)
                  }
                })
              }
              className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-text text-xs font-mono"
            />
            <p className="text-[10px] text-muted">
              Pinned items are always protected and never auto-removed.
            </p>
          </div>

          {/* Popup Hotkey */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Clipboard Popup Shortcut</span>
            </label>
            <input
              type="text"
              value={settings.clipboard?.hotkey ?? 'CommandOrControl+Shift+V'}
              onChange={(e) =>
                updateSettings({
                  clipboard: {
                    ...settings.clipboard,
                    hotkey: e.target.value
                  }
                })
              }
              placeholder="CommandOrControl+Shift+V"
              className="w-full px-3 py-2 bg-elevated border border-border rounded-xl text-text font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-muted">
              Default: <code className="text-muted">CommandOrControl+Shift+V</code>
            </p>
          </div>

          {/* Clear Clipboard Button */}
          <div className="pt-1">
            <button
              onClick={handleClearClipboard}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-medium rounded-xl flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Clipboard History</span>
            </button>
          </div>
        </div>
      </section>

      {/* Focus Timer Section */}
      <section className="bg-surface/60 border border-border rounded-2xl p-6 shadow-lg space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text">Focus & Break Durations</h3>
          <p className="text-xs text-muted">Configure Pomodoro timer session lengths</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <div className="p-3 bg-elevated/50 border border-border/60 rounded-xl space-y-2">
            <label className="text-xs font-medium text-text flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Work Duration (minutes)</span>
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={settings.pomodoro.workMin}
              onChange={(e) =>
                updateSettings({
                  pomodoro: {
                    ...settings.pomodoro,
                    workMin: parseInt(e.target.value) || 25
                  }
                })
              }
              className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-text text-sm"
            />
          </div>

          <div className="p-3 bg-elevated/50 border border-border/60 rounded-xl space-y-2">
            <label className="text-xs font-medium text-text flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Break Duration (minutes)</span>
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.pomodoro.breakMin}
              onChange={(e) =>
                updateSettings({
                  pomodoro: {
                    ...settings.pomodoro,
                    breakMin: parseInt(e.target.value) || 5
                  }
                })
              }
              className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-text text-sm"
            />
          </div>
        </div>
      </section>

      {/* System Integration Section */}
      <section className="bg-surface/60 border border-border rounded-2xl p-6 shadow-lg space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text">System Integration</h3>
          <p className="text-xs text-muted">Control system hotkeys and background behavior</p>
        </div>

        <div className="space-y-4 max-w-md">
          {/* Global Hotkey */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Global Show/Hide Shortcut</span>
            </label>
            <input
              type="text"
              value={settings.hotkey}
              onChange={(e) => updateSettings({ hotkey: e.target.value })}
              placeholder="CommandOrControl+Shift+D"
              className="w-full px-3 py-2 bg-elevated border border-border rounded-xl text-text font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-muted">
              Default: <code className="text-muted">CommandOrControl+Shift+D</code>
            </p>
          </div>

          {/* Launch at Login */}
          <label className="flex items-center justify-between p-3 bg-elevated/40 border border-border/50 rounded-xl cursor-pointer hover:bg-elevated/60 transition-colors">
            <div className="flex items-center gap-2.5">
              <Power className="w-4 h-4 text-muted" />
              <div>
                <div className="text-xs font-medium text-text">Launch at login</div>
                <div className="text-[11px] text-muted">
                  Automatically start Deskup when you log in
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.launchAtLogin}
              onChange={(e) => updateSettings({ launchAtLogin: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-hover border-border"
            />
          </label>

          {/* Minimize to Tray */}
          <label className="flex items-center justify-between p-3 bg-elevated/40 border border-border/50 rounded-xl cursor-pointer hover:bg-elevated/60 transition-colors">
            <div className="flex items-center gap-2.5">
              <Minimize2 className="w-4 h-4 text-muted" />
              <div>
                <div className="text-xs font-medium text-text">Minimize to tray on close</div>
                <div className="text-[11px] text-muted">
                  Keep running in background when window is closed
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.minimizeToTray}
              onChange={(e) => updateSettings({ minimizeToTray: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-hover border-border"
            />
          </label>
        </div>
      </section>

      {/* Backup and Data Export / Import */}
      <section className="bg-surface/60 border border-border rounded-2xl p-6 shadow-lg space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text">Data Backup & Restore</h3>
          <p className="text-xs text-muted">
            Export all profiles, todos, clipboard items, and notes as a portable JSON file
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-elevated hover:bg-hover text-text text-xs font-medium rounded-xl border border-border flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Export JSON Backup</span>
          </button>

          <button
            onClick={handleImport}
            className="px-4 py-2 bg-elevated hover:bg-hover text-text text-xs font-medium rounded-xl border border-border flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Import JSON Backup</span>
          </button>
        </div>
      </section>
    </div>
  )
}
