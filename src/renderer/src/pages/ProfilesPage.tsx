import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Sparkles,
  Search,
  Zap,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import type { Profile } from '../../../shared/types'
import ProfileCard from '../components/ProfileCard'
import ProfileEditor from '../components/ProfileEditor'
import WorkspaceTemplates from '../components/WorkspaceTemplates'

export default function ProfilesPage(): React.JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

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
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-text">Workspace Profiles</h2>
            {profiles.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'} · {totalItemsCount} items
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">
            Group your daily tools, project folders, and browser links into instant 1-click launch setups.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {profiles.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workspaces..."
                className="pl-8 pr-3 py-1.5 bg-elevated/70 border border-border/70 rounded-xl text-xs text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <button
            onClick={() => {
              setEditingProfile(null)
              setIsEditorOpen(true)
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Profile</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="text-center py-20 text-muted text-sm">Loading workspaces...</div>
      ) : profiles.length === 0 ? (
        /* Empty State: Rich Onboarding + Templates + Feature Highlights */
        <div className="space-y-8">
          {/* Hero Welcome Card */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-surface/80 via-elevated/40 to-surface/80 border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Supercharge Your Setup</span>
              </div>
              <h3 className="text-xl font-bold text-text">Welcome to Deskup Workspaces</h3>
              <p className="text-xs text-muted leading-relaxed">
                A workspace profile bundles all the apps, terminal folders, and browser links you need for a specific project. Launch everything simultaneously with smooth sequential delays.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingProfile(null)
                setIsEditorOpen(true)
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Profile</span>
            </button>
          </div>

          {/* Starter Workflow Templates */}
          <WorkspaceTemplates onSelectTemplate={handleSelectTemplate} />

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            <div className="p-5 rounded-2xl bg-surface/50 border border-border/70 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-text text-sm">One-Click Multi-Launch</h4>
              <p className="text-xs text-muted leading-relaxed">
                Combine native desktop software, project directories in File Explorer, and browser URLs in a unified setup.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface/50 border border-border/70 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-text text-sm">Staggered Launch Delays</h4>
              <p className="text-xs text-muted leading-relaxed">
                Prevent CPU freezing and window race conditions with customizable millisecond delays between app launches.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface/50 border border-border/70 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <ExternalLink className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-text text-sm">Everywhere Access</h4>
              <p className="text-xs text-muted leading-relaxed">
                Launch profiles directly from the Dashboard, right-click the Windows system tray icon, or trigger background hotkeys.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Profiles Grid View */
        <div className="space-y-6">
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-16 px-6 border border-dashed border-border/80 rounded-2xl bg-surface/30 space-y-2">
              <p className="text-sm font-semibold text-text">No workspaces match &quot;{search}&quot;</p>
              <p className="text-xs text-muted">Try a different search query or clear the filter.</p>
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 underline font-medium"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* Quick Starter Templates Accordion when profiles exist */}
          <div className="pt-4 border-t border-border/40">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-text transition-colors py-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Need ideas? Browse starter workflow templates</span>
              {showTemplates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTemplates && (
              <div className="mt-4">
                <WorkspaceTemplates onSelectTemplate={handleSelectTemplate} />
              </div>
            )}
          </div>
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
