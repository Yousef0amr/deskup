import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Sparkles, Search, ChevronDown, ChevronUp } from 'lucide-react'
import type { Profile } from '../../../shared/types'
import ProfileCard from '../components/ProfileCard'
import ProfileEditor from '../components/ProfileEditor'
import WorkspaceTemplates from '../components/WorkspaceTemplates'
import WorkspaceEmptyState from '../components/WorkspaceEmptyState'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useToast } from '../components/ui/toast'

export default function ProfilesPage(): React.JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const toast = useToast()

  const loadProfiles = async () => {
    try {
      const list = await window.deskup.profiles.list()
      setProfiles(list)
    } catch (err) {
      console.error('Failed to load profiles:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProfiles()
  }, [])

  const handleSaveProfile = async (profile: Profile) => {
    const isNew = !profiles.some((p) => p.id === profile.id)
    await window.deskup.profiles.save(profile)
    await loadProfiles()
    toast(isNew ? `Created “${profile.name}”` : `Saved “${profile.name}”`)
  }

  // Delete immediately and offer Undo instead of a blocking confirm dialog.
  const handleDeleteProfile = async (id: string) => {
    const removed = profiles.find((p) => p.id === id)
    if (!removed) return
    try {
      await window.deskup.profiles.delete(id)
      await loadProfiles()
      toast(`Deleted “${removed.name}”`, 'info', {
        label: 'Undo',
        onClick: () => {
          void window.deskup.profiles.save(removed).then(loadProfiles)
        }
      })
    } catch (err) {
      toast('Could not delete workspace: ' + (err as Error).message, 'error')
    }
  }

  const handleDuplicateProfile = async (profile: Profile) => {
    const duplicated: Profile = {
      ...profile,
      id: 'prof_' + Date.now(),
      name: `${profile.name} (Copy)`,
      items: profile.items.map((it) => ({
        ...it,
        id: 'item_' + Date.now() + Math.random().toString(36).substring(2, 6)
      }))
    }
    await window.deskup.profiles.save(duplicated)
    await loadProfiles()
    toast(`Duplicated as “${duplicated.name}”`)
  }

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return profiles
    const q = search.toLowerCase()
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.items.some(
          (it) =>
            it.label?.toLowerCase().includes(q) ||
            it.target.toLowerCase().includes(q)
        )
    )
  }, [profiles, search])

  const totalItemsCount = useMemo(
    () => profiles.reduce((acc, p) => acc + p.items.length, 0),
    [profiles]
  )

  const handleSelectTemplate = (templateProfile: Profile) => {
    setEditingProfile(templateProfile)
    setIsEditorOpen(true)
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-xl font-semibold tracking-tight text-text">Workspaces</h2>
            {profiles.length > 0 && (
              <span className="text-xs text-muted tabular-nums">
                {profiles.length} · {totalItemsCount} items
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">
            Open a set of apps, folders and links together in one click.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {profiles.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workspaces..."
                className="pl-8 h-9 text-xs"
              />
            </div>
          )}

          <Button
            type="button"
            onClick={() => {
              setEditingProfile(null)
              setIsEditorOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New workspace</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="text-center py-20 text-muted text-sm">Loading workspaces...</div>
      ) : profiles.length === 0 ? (
        <WorkspaceEmptyState
          onCreateProfile={() => {
            setEditingProfile(null)
            setIsEditorOpen(true)
          }}
          onSelectTemplate={handleSelectTemplate}
        />
      ) : (
        <div className="space-y-6">
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-16 px-6 border border-dashed border-border/80 rounded-xl bg-surface/30 space-y-2">
              <p className="text-sm font-semibold text-text">No workspaces match &quot;{search}&quot;</p>
              <p className="text-xs text-muted">Try a different search query or clear the filter.</p>
              <Button variant="link" size="sm" onClick={() => setSearch('')}>
                Clear search
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onEdit={(p) => {
                    setEditingProfile(p)
                    setIsEditorOpen(true)
                  }}
                  onDuplicate={handleDuplicateProfile}
                  onDelete={handleDeleteProfile}
                />
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="gap-2 text-xs font-semibold text-muted hover:text-text"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Need ideas? Browse starter workflow templates</span>
              {showTemplates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>

            {showTemplates && (
              <div className="mt-4">
                <WorkspaceTemplates onSelectTemplate={handleSelectTemplate} />
              </div>
            )}
          </div>
        </div>
      )}

      {isEditorOpen && (
        <ProfileEditor
          profile={editingProfile}
          onSave={handleSaveProfile}
          onClose={() => {
            setIsEditorOpen(false)
            setEditingProfile(null)
          }}
        />
      )}
    </div>
  )
}
