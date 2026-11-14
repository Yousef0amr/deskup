import React, { useState, useEffect } from 'react'
import { X, FolderOpen, AppWindow, Globe } from 'lucide-react'
import type { Profile, ProfileItem, ItemType, InstalledApp } from '../../../shared/types'
import AppPickerModal from './AppPickerModal'
import ProfileEditorMeta from './ProfileEditorMeta'
import ProfileEditorItemRow from './ProfileEditorItemRow'
import { Button } from './ui/button'

interface ProfileEditorProps {
  profile: Profile | null
  onSave: (profile: Profile) => Promise<void>
  onClose: () => void
}

const EMOJI_PRESETS = ['💼', '💻', '📚', '🎧', '🚀', '🎯', '☕', '🎮', '🎨', '📝', '⚡', '🛠️']
const COLOR_PRESETS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b']
const createProfileItem = (type: ItemType, target = '', label = ''): ProfileItem => ({
  id: 'item_' + Date.now() + Math.random().toString(36).substring(2, 6),
  type,
  target,
  label
})

export default function ProfileEditor({ profile, onSave, onClose }: ProfileEditorProps): React.JSX.Element {
  const [name, setName] = useState(profile?.name || '')
  const [icon, setIcon] = useState(profile?.icon || '💼')
  const [color, setColor] = useState(profile?.color || '#6366f1')
  const [launchDelayMs, setLaunchDelayMs] = useState(profile?.launchDelayMs ?? 300)
  const [autoLaunch, setAutoLaunch] = useState(Boolean(profile?.autoLaunch))
  const [alsoEnableLogin, setAlsoEnableLogin] = useState(true)
  const [items, setItems] = useState<ProfileItem[]>(profile?.items || [])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false)
  const [pickingItemId, setPickingItemId] = useState<string | null>(null)
  const [manualEditItemIds, setManualEditItemIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleAddItem = (type: ItemType) => {
    if (type === 'app') {
      setPickingItemId(null)
      setIsAppPickerOpen(true)
      return
    }
    setItems((prev) => [...prev, createProfileItem(type)])
  }

  const handleUpdateItem = (id: string, patch: Partial<ProfileItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const handleSelectApp = (app: InstalledApp) => {
    if (pickingItemId) {
      handleUpdateItem(pickingItemId, { target: app.path, label: app.name })
    } else {
      setItems((prev) => [...prev, createProfileItem('app', app.path, app.name)])
    }
    setIsAppPickerOpen(false)
    setPickingItemId(null)
  }

  const handleBrowseFromPicker = async () => {
    const targetItemId = pickingItemId
    setIsAppPickerOpen(false)
    try {
      const path = await window.deskup.dialog.pickFile()
      if (path) {
        const cleanName = path.split(/[\\/]/).pop()?.replace(/\.(exe|lnk|bat|cmd)$/i, '') || path
        if (targetItemId) {
          handleUpdateItem(targetItemId, { target: path, label: cleanName })
        } else {
          setItems((prev) => [...prev, createProfileItem('app', path, cleanName)])
        }
      }
    } catch (err) {
      console.error('File pick error:', err)
    } finally {
      setPickingItemId(null)
    }
  }

  const handlePickFile = async (id: string) => {
    try {
      const path = await window.deskup.dialog.pickFile()
      if (path) {
        const cleanName = path.split(/[\\/]/).pop()?.replace(/\.(exe|lnk|bat|cmd)$/i, '') || path
        handleUpdateItem(id, { target: path, label: cleanName })
      }
    } catch (err) { console.error('File pick error:', err) }
  }

  const handlePickFolder = async (id: string) => {
    try {
      const path = await window.deskup.dialog.pickFolder()
      if (path) {
        const folderName = path.split(/[\\/]/).filter(Boolean).pop() || path
        handleUpdateItem(id, { target: path, label: folderName })
      }
    } catch (err) { console.error('Folder pick error:', err) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Profile name is required')
      return
    }
    setErrorMessage(null)
    setIsSaving(true)
    try {
      const updatedProfile: Profile = {
        id: profile?.id || 'prof_' + Date.now(),
        name: name.trim(),
        icon,
        color,
        launchDelayMs,
        autoLaunch,
        items
      }
      await onSave(updatedProfile)
      if (autoLaunch && alsoEnableLogin) {
        const s = await window.deskup.settings.get().catch(() => null)
        if (s && !s.launchAtLogin) await window.deskup.settings.update({ launchAtLogin: true })
      }
      onClose()
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-text text-base">
            {profile ? 'Edit Workspace Profile' : 'New Workspace Profile'}
          </h3>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          <ProfileEditorMeta
            name={name}
            icon={icon}
            color={color}
            launchDelayMs={launchDelayMs}
            autoLaunch={autoLaunch}
            alsoEnableLogin={alsoEnableLogin}
            emojiPresets={EMOJI_PRESETS}
            colorPresets={COLOR_PRESETS}
            onNameChange={setName}
            onIconChange={setIcon}
            onColorChange={setColor}
            onDelayChange={setLaunchDelayMs}
            onAutoLaunchChange={setAutoLaunch}
            onAlsoEnableLoginChange={setAlsoEnableLogin}
          />

          {/* Items Section */}
          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-text">Workspace Items</h4>
                <p className="text-xs text-muted">Items that will open when you click Launch</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="secondary" size="sm" onClick={() => handleAddItem('app')} className="gap-1 h-7 text-xs">
                  <AppWindow className="w-3.5 h-3.5 text-sky-400" />
                  <span>+ App</span>
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleAddItem('folder')} className="gap-1 h-7 text-xs">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>+ Folder</span>
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleAddItem('url')} className="gap-1 h-7 text-xs">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  <span>+ Website</span>
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl bg-surface/40">
                <p className="text-xs text-muted">No items added yet.</p>
                <p className="text-[11px] text-muted mt-1">Click + App, + Folder, or + Website above to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <ProfileEditorItemRow
                    key={it.id}
                    item={it}
                    index={idx}
                    isManualEdit={Boolean(manualEditItemIds[it.id])}
                    onUpdate={(patch) => handleUpdateItem(it.id, patch)}
                    onRemove={() => handleRemoveItem(it.id)}
                    onOpenPicker={() => { setPickingItemId(it.id); setIsAppPickerOpen(true) }}
                    onPickFile={() => handlePickFile(it.id)}
                    onPickFolder={() => handlePickFolder(it.id)}
                    onToggleManualEdit={() => setManualEditItemIds((prev) => ({ ...prev, [it.id]: true }))}
                  />
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/80 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>

      <AppPickerModal
        isOpen={isAppPickerOpen}
        onSelect={handleSelectApp}
        onClose={() => { setIsAppPickerOpen(false); setPickingItemId(null) }}
        onBrowseCustomFile={handleBrowseFromPicker}
      />
    </div>
  )
}
