import React, { useState, useEffect } from 'react'
import { Plus, Sparkles, Layers } from 'lucide-react'
import type { Profile } from '../../../shared/types'
import ProfileCard from '../components/ProfileCard'
import ProfileEditor from '../components/ProfileEditor'

export default function ProfilesPage(): React.JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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
    loadProfiles()
  }, [])

  const handleSaveProfile = async (profile: Profile) => {
    await window.deskup.profiles.save(profile)
    await loadProfiles()
  }

  const handleDeleteProfile = async (id: string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      await window.deskup.profiles.delete(id)
      await loadProfiles()
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
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text">Workspace Profiles</h2>
          <p className="text-xs text-muted mt-1">
            Group your daily tools, folders, and sites into single-click setups.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProfile(null)
            setIsEditorOpen(true)
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Profile</span>
        </button>
      </div>

      {/* Profiles Grid or Empty State */}
      {isLoading ? (
        <div className="text-center py-16 text-muted text-sm">Loading workspaces...</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 px-6 border-2 border-dashed border-border rounded-3xl bg-surface/30 flex flex-col items-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-text">No Workspaces Yet</h3>
          <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-sm">
            Create your first workspace profile to open your essential coding IDEs, project folders, and browser links in one click.
          </p>
          <button
            onClick={() => {
              setEditingProfile(null)
              setIsEditorOpen(true)
            }}
            className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create First Profile</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {profiles.map((profile) => (
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

      {/* Profile Editor Modal */}
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

