import React, { useState, useEffect } from 'react'
import {
  X,
  Trash2,
  FolderOpen,
  AppWindow,
  Globe,
  Clock,
  Palette,
  Smile,
  Edit3
} from 'lucide-react'
import type { Profile, ProfileItem, ItemType, InstalledApp } from '../../../shared/types'
import AppPickerModal from './AppPickerModal'

interface ProfileEditorProps {
  profile: Profile | null // null means create new
  onSave: (profile: Profile) => Promise<void>
  onClose: () => void
}

const EMOJI_PRESETS = ['💼', '💻', '📚', '🎧', '🚀', '🎯', '☕', '🎮', '🎨', '📝', '⚡', '🛠️']
const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#64748b'  // Slate
]

export default function ProfileEditor({ profile, onSave, onClose }: ProfileEditorProps): React.JSX.Element {
  const [name, setName] = useState(profile?.name || '')
  const [icon, setIcon] = useState(profile?.icon || '💼')
  const [color, setColor] = useState(profile?.color || '#6366f1')
  const [launchDelayMs, setLaunchDelayMs] = useState(profile?.launchDelayMs ?? 300)
  const [items, setItems] = useState<ProfileItem[]>(profile?.items || [])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAppPickerOpen, setIsAppPickerOpen] = useState(false)
  const [pickingItemId, setPickingItemId] = useState<string | null>(null)
  const [manualEditItemIds, setManualEditItemIds] = useState<Record<string, boolean>>({})

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleAddItem = (type: ItemType) => {
    if (type === 'app') {
      setPickingItemId(null)
      setIsAppPickerOpen(true)
      return
    }
    const newItem: ProfileItem = {
      id: 'item_' + Date.now() + Math.random().toString(36).substring(2, 6),
      type,
      target: '',
      label: ''
    }
    setItems((prev) => [...prev, newItem])
  }

  const handleSelectApp = (app: InstalledApp) => {
    if (pickingItemId) {
      handleUpdateItem(pickingItemId, {
        target: app.path,
        label: app.name
      })
    } else {
      const newItem: ProfileItem = {
        id: 'item_' + Date.now() + Math.random().toString(36).substring(2, 6),
        type: 'app',
        label: app.name,
        target: app.path
      }
      setItems((prev) => [...prev, newItem])
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
          const newItem: ProfileItem = {
            id: 'item_' + Date.now() + Math.random().toString(36).substring(2, 6),
            type: 'app',
            label: cleanName,
            target: path
          }
          setItems((prev) => [...prev, newItem])
        }
      }
    } catch (err) {
      console.error('File pick error:', err)
    } finally {
      setPickingItemId(null)
    }
  }

  const handleUpdateItem = (id: string, patch: Partial<ProfileItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const handlePickFile = async (itemId: string) => {
    try {
      const path = await window.deskup.dialog.pickFile()
      if (path) {
        handleUpdateItem(itemId, {
          target: path,
          label: path.split(/[\\/]/).pop() || path
        })
      }
    } catch (err) {
      console.error('File pick error:', err)
    }
  }

  const handlePickFolder = async (itemId: string) => {
    try {
      const path = await window.deskup.dialog.pickFolder()
      if (path) {
        handleUpdateItem(itemId, {
          target: path,
          label: path.split(/[\\/]/).pop() || path
        })
      }
    } catch (err) {
      console.error('Folder pick error:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMessage('Please give your workspace profile a name.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const finalProfile: Profile = {
        id: profile?.id || 'prof_' + Date.now(),
        name: name.trim(),
        icon,
        color,
        launchDelayMs: Number(launchDelayMs) || 300,
        items
      }
      await onSave(finalProfile)
      onClose()
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner"
              style={{ backgroundColor: `${color}20`, borderColor: `${color}40`, borderWidth: 1 }}
            >
              {icon}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-text">
                {profile ? 'Edit Workspace Profile' : 'New Workspace Profile'}
              </h3>
              <p className="text-xs text-muted">Configure apps, folders, and websites</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-text rounded-lg hover:bg-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Profile Name & Icon */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text mb-1.5">
                Profile Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Deep Work, Study, Morning Setup"
                className="w-full px-3.5 py-2.5 bg-elevated/80 border border-border rounded-xl text-text placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-xs font-medium text-text mb-1.5 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Icon</span>
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {EMOJI_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      icon === emoji
                        ? 'bg-indigo-600 text-white scale-110 shadow-md ring-2 ring-indigo-400'
                        : 'bg-elevated text-text hover:bg-hover'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value.slice(0, 2))}
                  className="w-12 h-9 text-center bg-elevated border border-border rounded-lg text-sm text-text"
                  title="Custom emoji"
                />
              </div>
            </div>

            {/* Color Accent */}
            <div>
              <label className="block text-xs font-medium text-text mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Color Accent</span>
              </label>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Launch Delay */}
            <div>
              <label className="block text-xs font-medium text-text mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Delay Between Items (ms)</span>
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={launchDelayMs}
                onChange={(e) => setLaunchDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-36 px-3 py-1.5 bg-elevated border border-border rounded-lg text-text text-sm"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-text">Workspace Items</h4>
                <p className="text-xs text-muted">Items that will open when you click Launch</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddItem('app')}
                  className="px-2.5 py-1.5 bg-elevated hover:bg-hover text-text text-xs font-medium rounded-lg flex items-center gap-1 border border-border transition-colors"
                >
                  <AppWindow className="w-3.5 h-3.5 text-sky-400" />
                  <span>+ App</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('folder')}
                  className="px-2.5 py-1.5 bg-elevated hover:bg-hover text-text text-xs font-medium rounded-lg flex items-center gap-1 border border-border transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>+ Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('url')}
                  className="px-2.5 py-1.5 bg-elevated hover:bg-hover text-text text-xs font-medium rounded-lg flex items-center gap-1 border border-border transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>+ Website</span>
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl bg-surface/40">
                <p className="text-xs text-muted">No items added yet.</p>
                <p className="text-[11px] text-muted mt-1">
                  Click + App, + Folder, or + Website above to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={it.id}
                    className="p-3 bg-elevated/60 border border-border/60 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-muted w-4">{idx + 1}.</span>
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-hover text-text uppercase tracking-wider flex items-center gap-1">
                          {it.type === 'app' && <AppWindow className="w-3 h-3 text-sky-400" />}
                          {it.type === 'folder' && <FolderOpen className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                          {it.type === 'url' && <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                          {it.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="text-muted hover:text-rose-400 p-1 rounded transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={it.label || ''}
                        onChange={(e) => handleUpdateItem(it.id, { label: e.target.value })}
                        placeholder="Label (optional)"
                        className="px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text placeholder-muted focus:outline-none focus:border-indigo-500"
                      />

                      {it.type === 'app' && !manualEditItemIds[it.id] ? (
                        <div className="sm:col-span-2 flex items-center gap-1.5">
                          {it.target ? (
                            <div className="flex-1 flex items-center justify-between px-3 py-1.5 bg-surface border border-border rounded-lg min-w-0">
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <AppWindow className="w-4 h-4 text-sky-400 shrink-0" />
                                <span className="text-xs font-semibold text-text truncate">
                                  {it.label || it.target.split(/[\\/]/).pop()?.replace(/\.lnk$/i, '') || it.target}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPickingItemId(it.id)
                                    setIsAppPickerOpen(true)
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md transition-colors"
                                >
                                  Change
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setManualEditItemIds((prev) => ({ ...prev, [it.id]: true }))
                                  }
                                  title="Edit custom path or command"
                                  className="p-1 text-muted hover:text-text rounded"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPickingItemId(it.id)
                                setIsAppPickerOpen(true)
                              }}
                              className="flex-1 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <AppWindow className="w-4 h-4" />
                              <span>Select an Application...</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePickFile(it.id)}
                            className="px-2.5 py-1.5 bg-hover hover:bg-muted text-text text-xs rounded-lg whitespace-nowrap"
                            title="Browse files for custom .exe or .lnk"
                          >
                            Browse
                          </button>
                        </div>
                      ) : (
                        <div className="sm:col-span-2 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={it.target}
                            onChange={(e) => handleUpdateItem(it.id, { target: e.target.value })}
                            placeholder={
                              it.type === 'url'
                                ? 'https://github.com'
                                : it.type === 'folder'
                                ? 'C:\\projects\\my-app'
                                : 'Path or command (e.g. code)'
                            }
                            className="flex-1 px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text placeholder-muted font-mono focus:outline-none focus:border-indigo-500"
                          />
                          {it.type === 'app' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setPickingItemId(it.id)
                                  setIsAppPickerOpen(true)
                                }}
                                className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg whitespace-nowrap"
                              >
                                Select App
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePickFile(it.id)}
                                className="px-2.5 py-1.5 bg-hover hover:bg-muted text-text text-xs rounded-lg whitespace-nowrap"
                              >
                                Browse
                              </button>
                            </>
                          )}
                          {it.type === 'folder' && (
                            <button
                              type="button"
                              onClick={() => handlePickFolder(it.id)}
                              className="px-2.5 py-1.5 bg-hover hover:bg-muted text-text text-xs rounded-lg whitespace-nowrap"
                            >
                              Browse
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text hover:text-text hover:bg-elevated rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Installed Application Picker Modal */}
      <AppPickerModal
        isOpen={isAppPickerOpen}
        onSelect={handleSelectApp}
        onClose={() => {
          setIsAppPickerOpen(false)
          setPickingItemId(null)
        }}
        onBrowseCustomFile={handleBrowseFromPicker}
      />
    </div>
  )
}

