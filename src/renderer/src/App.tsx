import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Layers,
  ClipboardList,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Command
} from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import ProfilesPage from './pages/ProfilesPage'
import ClipboardPage from './pages/ClipboardPage'
import SettingsPage from './pages/SettingsPage'
import ClipboardPopup from './components/ClipboardPopup'

export default function App(): React.JSX.Element {
  const isPopup = window.location.hash === '#clipboard-popup'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profiles' | 'clipboard' | 'settings'>('dashboard')
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [hotkeys, setHotkeys] = useState({ main: '', clipboard: '' })

  // Apply theme class
  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    setCurrentTheme(theme)
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  useEffect(() => {
    async function initTheme() {
      try {
        const s = await window.deskup.settings.get()
        applyTheme(s.theme)
        setHotkeys({ main: s.hotkey, clipboard: s.clipboard.hotkey })
      } catch {
        applyTheme('system')
      }
    }
    initTheme()
    const unsubscribeSettings = window.deskup.settings.onChanged(settings => {
      applyTheme(settings.theme)
      setHotkeys({ main: settings.hotkey, clipboard: settings.clipboard.hotkey })
    })
    const unsubscribeImport = window.deskup.data.onImported(() => window.location.reload())

    // Listen for system theme changes if in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (currentTheme === 'system') {
        if (e.matches) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    }

    mediaQuery.addEventListener('change', handleSystemChange)
    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange)
      unsubscribeSettings()
      unsubscribeImport()
    }
  }, [currentTheme])

  // If this window is the clipboard popup
  if (isPopup) {
    return <ClipboardPopup />
  }

  return (
    <div className="flex h-screen w-screen bg-background text-text antialiased overflow-hidden select-none">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-surface/60 p-4 flex flex-col justify-between backdrop-blur-md shrink-0">
        <div className="space-y-6">
          {/* Logo / Branding */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-text" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-text to-muted bg-clip-text text-transparent">
                Deskup
              </h1>
              <p className="text-[11px] text-muted font-medium">One-Click Workspace</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-muted hover:text-text hover:bg-elevated/60'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('profiles')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profiles'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-muted hover:text-text hover:bg-elevated/60'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Workspaces</span>
            </button>

            <button
              onClick={() => setActiveTab('clipboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'clipboard'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-muted hover:text-text hover:bg-elevated/60'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Clipboard</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-muted hover:text-text hover:bg-elevated/60'
              }`}
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-elevated/40 border border-border/60 text-xs text-muted space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium text-[11px]">
              <Command className="h-3.5 w-3.5" />
              <span>Shortcuts</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-muted">
              <div className="flex justify-between items-center">
                <span className="text-muted font-sans">Toggle App</span>
                <span>{hotkeys.main.replace('CommandOrControl', 'Ctrl/Cmd')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted font-sans">Clipboard</span>
                <span>{hotkeys.clipboard.replace('CommandOrControl', 'Ctrl/Cmd')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-1">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Isolated & Private</span>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-background via-surface to-background p-8">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigateToProfiles={() => setActiveTab('profiles')}
            />
          )}
          {activeTab === 'profiles' && <ProfilesPage />}
          {activeTab === 'clipboard' && <ClipboardPage />}
          {activeTab === 'settings' && <SettingsPage onThemeChange={applyTheme} />}
        </div>
      </main>
    </div>
  )
}
