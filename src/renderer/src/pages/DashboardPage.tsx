import React, { useState, useEffect } from 'react'
import {
  Play,
  Sparkles,
  Loader2,
  Plus,
  Layers
} from 'lucide-react'
import type { Profile, Settings, LaunchResult } from '../../../shared/types'
import ClockWidget from '../components/ClockWidget'
import TodoList from '../components/TodoList'
import QuickNotes from '../components/QuickNotes'
import PomodoroTimer from '../components/PomodoroTimer'
import RecentClipboardWidget from '../components/RecentClipboardWidget'
import SystemMonitorWidget from '../components/SystemMonitorWidget'

interface DashboardPageProps {
  onNavigateToProfiles: () => void
  onNavigateToClipboard?: () => void
  onNavigateToNotes?: () => void
}

export default function DashboardPage({
  onNavigateToProfiles,
  onNavigateToClipboard,
  onNavigateToNotes
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
    <div className="space-y-6 pb-6">
      {/* Top Greeting and Clock */}
      <ClockWidget />

      {/* Quick Workspace Launcher Ribbon */}
      <div className="bg-surface/60 border border-border rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h3 className="text-sm font-semibold text-text leading-tight">Quick Workspace Launch</h3>
              <p className="text-xs text-muted">Launch your desk environment in one tap</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {launchStatus && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full animate-fade-in flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{launchStatus}</span>
              </span>
            )}
            <button
              onClick={onNavigateToProfiles}
              className="px-2.5 py-1 text-xs text-muted hover:text-text hover:bg-elevated/80 rounded-lg transition-colors flex items-center gap-1 border border-border/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage</span>
            </button>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="flex items-center justify-between p-3.5 bg-elevated/40 border border-border/40 rounded-xl">
            <span className="text-xs text-muted">
              No workspaces configured yet. Group your apps and web links into a 1-click launch profile.
            </span>
            <button
              onClick={onNavigateToProfiles}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              + Create Workspace
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {profiles.map((prof) => (
              <button
                key={prof.id}
                onClick={() => handleQuickLaunch(prof)}
                disabled={launchingId !== null}
                className="group flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-elevated/80 hover:bg-elevated hover:border-indigo-500/50 active:scale-98 transition-all text-left shadow-sm disabled:opacity-50"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{prof.icon}</span>
                <div>
                  <div className="text-xs font-semibold text-text leading-tight">
                    {prof.name}
                  </div>
                  <div className="text-[10px] text-muted">
                    {prof.items.length} {prof.items.length === 1 ? 'item' : 'items'}
                  </div>
                </div>
                {launchingId === prof.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400 ml-1.5" />
                ) : (
                  <Play className="w-3 h-3 fill-slate-400 text-muted group-hover:fill-indigo-500 group-hover:text-indigo-500 ml-1.5 transition-colors" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Bento Grid: 2x2 Balanced Multi-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Top-Left: Pomodoro Focus Session */}
        <div className="flex flex-col">
          <PomodoroTimer
            workMinutes={settings?.pomodoro.workMin ?? 25}
            breakMinutes={settings?.pomodoro.breakMin ?? 5}
          />
        </div>

        {/* Top-Right: Tasks & To-Do List */}
        <div className="flex flex-col">
          <TodoList />
        </div>

        {/* Bottom-Left: Quick Scratchpad */}
        <div className="flex flex-col">
          <QuickNotes onNavigateToNotes={onNavigateToNotes} />
        </div>

        {/* Bottom-Right: Recent Clipboard Clips */}
        <div className="flex flex-col">
          <RecentClipboardWidget onNavigateToClipboard={onNavigateToClipboard} />
        </div>
      </div>

      {/* Real-Time System Resource Monitor */}
      <SystemMonitorWidget />
    </div>
  )
}
