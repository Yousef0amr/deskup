import React, { useState, useEffect } from 'react'
import {
  Play,
  Sparkles,
  Loader2
} from 'lucide-react'
import type { Profile, Settings, LaunchResult } from '../../../shared/types'
import ClockWidget from '../components/ClockWidget'
import TodoList from '../components/TodoList'
import QuickNotes from '../components/QuickNotes'
import PomodoroTimer from '../components/PomodoroTimer'

interface DashboardPageProps {
  onNavigateToProfiles: () => void
}

export default function DashboardPage({
  onNavigateToProfiles
}: DashboardPageProps): React.JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [launchingId, setLaunchingId] = useState<string | null>(null)
  const [launchStatus, setLaunchStatus] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [loadedProfiles, loadedSettings] = await Promise.all([
          window.deskup.profiles.list(),
          window.deskup.settings.get()
        ])
        setProfiles(loadedProfiles)
        setSettings(loadedSettings)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      }
    }
    loadData()
  }, [])

  const handleQuickLaunch = async (profile: Profile) => {
    setLaunchingId(profile.id)
    setLaunchStatus(`Launching "${profile.name}"...`)

    try {
      const results: LaunchResult[] = await window.deskup.profiles.launch(profile.id)
      const failures = results.filter((r) => !r.ok)
      if (failures.length === 0) {
        setLaunchStatus(`"${profile.name}" launched successfully!`)
      } else {
        setLaunchStatus(`Launched with ${failures.length} warning(s).`)
      }
      setTimeout(() => setLaunchStatus(null), 4000)
    } catch (err) {
      setLaunchStatus('Failed to launch: ' + (err as Error).message)
    } finally {
      setLaunchingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Greeting and Clock */}
      <ClockWidget />

      {/* Quick Workspace Launcher Ribbon */}
      <div className="bg-surface/60 border border-border rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text">Quick Workspace Launch</h3>
            <p className="text-xs text-muted">Launch your desk environment in one tap</p>
          </div>
          {launchStatus && (
            <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full animate-fade-in flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{launchStatus}</span>
            </span>
          )}
        </div>

        {profiles.length === 0 ? (
          <div className="flex items-center justify-between p-3 bg-elevated/40 border border-border/40 rounded-xl">
            <span className="text-xs text-muted">
              No profiles created yet. Configure a workspace to launch apps and sites quickly.
            </span>
            <button
              onClick={onNavigateToProfiles}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              + Create Profile
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {profiles.map((prof) => (
              <button
                key={prof.id}
                onClick={() => handleQuickLaunch(prof)}
                disabled={launchingId !== null}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-border bg-elevated/80 hover:bg-hover/80 active:scale-98 transition-all text-left shadow-sm disabled:opacity-50"
              >
                <span className="text-lg">{prof.icon}</span>
                <div>
                  <div className="text-xs font-semibold text-text leading-tight">
                    {prof.name}
                  </div>
                  <div className="text-[10px] text-muted">
                    {prof.items.length} {prof.items.length === 1 ? 'item' : 'items'}
                  </div>
                </div>
                {launchingId === prof.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400 ml-1" />
                ) : (
                  <Play className="w-3 h-3 fill-slate-400 text-muted ml-1" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Pomodoro, Todos, Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <PomodoroTimer
            workMinutes={settings?.pomodoro.workMin ?? 25}
            breakMinutes={settings?.pomodoro.breakMin ?? 5}
          />
        </div>
        <div className="md:col-span-1">
          <TodoList />
        </div>
        <div className="md:col-span-1">
          <QuickNotes />
        </div>
      </div>
    </div>
  )
}
