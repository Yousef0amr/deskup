import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import type { Settings } from '../../../shared/types'
import SettingsAppearanceSection from '../components/settings/SettingsAppearanceSection'
import SettingsClipboardSection from '../components/settings/SettingsClipboardSection'
import SettingsFocusSection from '../components/settings/SettingsFocusSection'
import SettingsSystemSection from '../components/settings/SettingsSystemSection'
import SettingsBackupSection from '../components/settings/SettingsBackupSection'
import SettingsUpdatesSection from '../components/settings/SettingsUpdatesSection'
import SettingsSyncSection from '../components/settings/SettingsSyncSection'
import { useToast } from '../components/ui/toast'
import { SettingsSkeleton } from '../components/ui/skeletons'

interface SettingsPageProps {
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void
}

export default function SettingsPage({ onThemeChange }: SettingsPageProps): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const toast = useToast()

  useEffect(() => {
    async function load() {
      try {
        const s = await window.deskup.settings.get()
        setSettings(s)
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }
    void load()
  }, [])

  // Settings auto-save; only surface problems and one-off actions.
  const updateSettings = async (patch: Partial<Settings>) => {
    if (!settings) return
    try {
      const updated = await window.deskup.settings.update(patch)
      setSettings(updated)
      if (patch.theme && onThemeChange) onThemeChange(patch.theme)
    } catch (err) {
      console.error('Failed to update settings:', err)
      toast('Could not save settings: ' + (err as Error).message, 'error')
    }
  }

  const handleClearClipboard = async () => {
    if (confirm('Clear all clipboard history, including pinned items? This cannot be undone.')) {
      await window.deskup.clipboard.clear(true)
      toast('Clipboard history cleared')
    }
  }

  const handleExport = async () => {
    try {
      if (await window.deskup.data.exportAll()) toast('Backup exported')
    } catch (err) {
      toast('Export failed: ' + (err as Error).message, 'error')
    }
  }

  const handleImport = async () => {
    try {
      if (await window.deskup.data.importAll()) {
        const reloaded = await window.deskup.settings.get()
        setSettings(reloaded)
        if (onThemeChange) onThemeChange(reloaded.theme)
      }
    } catch (err) {
      toast('Import failed: ' + (err as Error).message, 'error')
    }
  }

  if (!settings) {
    return <SettingsSkeleton />
  }

  const hasHotkeyConflict =
    Boolean(settings.hotkey && settings.clipboard?.hotkey) &&
    settings.hotkey.trim().toLowerCase() === settings.clipboard.hotkey.trim().toLowerCase()

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-text">Settings</h2>
        <p className="text-xs text-muted mt-1">
          Sync, appearance, focus timer, clipboard, shortcuts, updates and backups.
        </p>
      </div>


      {hasHotkeyConflict && (
        <div className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>The app shortcut and the clipboard popup shortcut are the same. Change one of them.</span>
        </div>
      )}

      {/* Sync & storage */}
      <SettingsSyncSection />

      {/* Appearance Section */}
      <SettingsAppearanceSection settings={settings} onUpdate={updateSettings} />

      {/* Clipboard History Section */}
      <SettingsClipboardSection
        settings={settings}
        onUpdate={updateSettings}
        onClearClipboard={handleClearClipboard}
      />

      {/* Focus Timer Section */}
      <SettingsFocusSection settings={settings} onUpdate={updateSettings} />

      {/* System Integration Section */}
      <SettingsSystemSection settings={settings} onUpdate={updateSettings} />

      {/* Updates */}
      <SettingsUpdatesSection settings={settings} onUpdate={updateSettings} />

      {/* Backup and Data Export / Import */}
      <SettingsBackupSection onExport={handleExport} onImport={handleImport} />
    </div>
  )
}
