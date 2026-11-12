import React, { useState, useEffect } from 'react'
import { Play, Loader2, Plus, Layers } from 'lucide-react'
import type { Profile, Settings, LaunchResult } from '../../../shared/types'
import ClockWidget from '../components/ClockWidget'
import TodoList from '../components/TodoList'
import QuickNotes from '../components/QuickNotes'
import PomodoroTimer from '../components/PomodoroTimer'
import RecentClipboardWidget from '../components/RecentClipboardWidget'
import SystemMonitorWidget from '../components/SystemMonitorWidget'
import HabitTracker from '../components/HabitTracker'
import TodaySummary from '../components/TodaySummary'
import { useToast } from '../components/ui/toast'
import { Button } from '../components/ui/button'

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
  const toast = useToast()

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
    void loadData()
    return window.deskup.settings.onChanged(setSettings)
  }, [])

  const handleQuickLaunch = async (profile: Profile) => {
    setLaunchingId(profile.id)
    try {
      const results: LaunchResult[] = await window.deskup.profiles.launch(profile.id)
      const failures = results.filter((r) => !r.ok)
      if (failures.length === 0) {
        toast(`${profile.icon} “${profile.name}” launched`, 'success')
      } else {
        toast(`“${profile.name}” launched with ${failures.length} item(s) failing: ${failures[0].error ?? 'unknown error'}`, 'error')
      }
    } catch (err) {
      toast('Failed to launch: ' + (err as Error).message, 'error')
    } finally {
      setLaunchingId(null)
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <ClockWidget />

      {/* Today at a glance — each tile jumps to its widget */}
      <TodaySummary focusGoalMin={settings?.dailyFocusGoalMin ?? 120} />

      {/* Workspaces: one-click launch row */}
      <section aria-label="Workspaces" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-muted">
          <Layers className="h-3.5 w-3.5" /> Launch
        </span>
        {profiles.map((prof) => (
          <button
            key={prof.id}
            type="button"
            onClick={() => handleQuickLaunch(prof)}
            disabled={launchingId !== null}
            title={`Open ${prof.items.length} ${prof.items.length === 1 ? 'item' : 'items'}`}
            className="group flex h-8 items-center gap-2 rounded-lg border border-border bg-surface pl-2 pr-2.5 text-xs font-medium text-text transition-colors hover:border-hover hover:bg-elevated/50 disabled:opacity-60"
          >
            <span className="text-sm leading-none">{prof.icon}</span>
            <span className="max-w-[12rem] truncate">{prof.name}</span>
            {launchingId === prof.id ? (
              <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
            ) : (
              <Play className="h-3 w-3 text-muted transition-colors group-hover:text-indigo-500" />
            )}
          </button>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={onNavigateToProfiles} className="text-muted">
          <Plus className="h-3.5 w-3.5" />
          {profiles.length === 0 ? 'Create a workspace' : 'New'}
        </Button>
      </section>

      {/*
        Priority grid. Rows stretch so neighbours share a height:
        row 1 = focus + tasks, row 2 = habits / notes / clips, row 3 = slim system strip.
        Tasks and notes use contain:size so their own content never sets the row height —
        they fill whatever the neighbouring card needs and scroll internally.
      */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <div id="dash-focus" className="scroll-mt-4 rounded-xl xl:col-span-4">
          <PomodoroTimer
            workMinutes={settings?.pomodoro.workMin ?? 25}
            breakMinutes={settings?.pomodoro.breakMin ?? 5}
          />
        </div>
        <div id="dash-tasks" className="scroll-mt-4 rounded-xl min-h-[360px] lg:[contain:size] xl:col-span-8">
          <TodoList />
        </div>

        <div id="dash-habits" className="scroll-mt-4 rounded-xl xl:col-span-4">
          <HabitTracker />
        </div>
        <div className="min-h-[300px] lg:[contain:size] xl:col-span-4">
          <QuickNotes onNavigateToNotes={onNavigateToNotes} />
        </div>
        <div className="lg:col-span-2 xl:col-span-4">
          <RecentClipboardWidget onNavigateToClipboard={onNavigateToClipboard} />
        </div>

        <div className="lg:col-span-2 xl:col-span-12">
          <SystemMonitorWidget />
        </div>
      </div>
    </div>
  )
}
