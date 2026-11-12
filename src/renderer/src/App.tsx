import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import type { AppTab } from '../../shared/types'
import {
  LayoutDashboard,
  Layers,
  ClipboardList,
  FileText,
  Settings as SettingsIcon,
  ShieldCheck,
  Search,
  Wrench,
  PanelLeftClose,
  SquareKanban,
  PenTool,
  PanelLeftOpen
} from 'lucide-react'
import { Button } from './components/ui/button'
import { ToastProvider } from './components/ui/toast'
import { Logo } from './components/ui/logo'
import { cn } from './lib/utils'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BoardPage = lazy(() => import('./pages/BoardPage'))
const WhiteboardPage = lazy(() => import('./pages/WhiteboardPage'))
const ProfilesPage = lazy(() => import('./pages/ProfilesPage'))
const NotesPage = lazy(() => import('./pages/NotesPage'))
const ClipboardPage = lazy(() => import('./pages/ClipboardPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ToolsPage = lazy(() => import('./pages/ToolsPage'))
const ClipboardPopup = lazy(() => import('./components/ClipboardPopup'))
const SnipOverlay = lazy(() => import('./components/SnipOverlay'))
const CommandPaletteModal = lazy(() => import('./components/CommandPalette/CommandPaletteModal'))

const loadingView = <div role="status" className="p-4 text-sm text-muted">Loading…</div>

type Theme = 'light' | 'dark' | 'system'

const NAV_ITEMS: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'board', label: 'Board', icon: SquareKanban },
  { id: 'whiteboard', label: 'Whiteboard', icon: PenTool },
  { id: 'profiles', label: 'Workspaces', icon: Layers },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'clipboard', label: 'Clipboard', icon: ClipboardList },
  { id: 'tools', label: 'Work tools', icon: Wrench },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
]

const SIDEBAR_KEY = 'deskup.sidebarCollapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

function prettyHotkey(hotkey: string): string {
  return hotkey.replace('CommandOrControl', 'Ctrl/Cmd')
}

export default function App(): React.JSX.Element {
  const isPopup = window.location.hash === '#clipboard-popup'
  const isSnipOverlay = window.location.hash === '#snip-overlay'
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard')
  const [hotkeys, setHotkeys] = useState({ main: '', clipboard: '' })
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const themeRef = useRef<Theme>('system')

  const applyTheme = useCallback((theme: Theme) => {
    themeRef.current = theme
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const toggleSidebar = useCallback(() => {
    setCollapsed(prev => {
      try {
        localStorage.setItem(SIDEBAR_KEY, prev ? '0' : '1')
      } catch {
        // Preference is a convenience only.
      }
      return !prev
    })
  }, [])

  useEffect(() => {
    window.deskup.settings
      .get()
      .then(s => {
        applyTheme(s.theme)
        setHotkeys({ main: s.hotkey, clipboard: s.clipboard.hotkey })
      })
      .catch(() => applyTheme('system'))

    const unsubscribeSettings = window.deskup.settings.onChanged(settings => {
      applyTheme(settings.theme)
      setHotkeys({ main: settings.hotkey, clipboard: settings.clipboard.hotkey })
    })
    const unsubscribeImport = window.deskup.data.onImported(() => window.location.reload())

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => {
      if (themeRef.current === 'system') applyTheme('system')
    }
    mediaQuery.addEventListener('change', handleSystemChange)

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(prev => !prev)
      } else if (key === 'b' && !e.shiftKey) {
        e.preventDefault()
        toggleSidebar()
      } else if (/^[1-9]$/.test(key) && !e.shiftKey) {
        const item = NAV_ITEMS[Number(key) - 1]
        if (item) {
          e.preventDefault()
          setActiveTab(item.id)
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange)
      window.removeEventListener('keydown', handleGlobalKeyDown)
      unsubscribeSettings()
      unsubscribeImport()
    }
  }, [applyTheme, toggleSidebar])

  if (isSnipOverlay) {
    return (
      <Suspense fallback={<div className="h-screen w-screen bg-black/80" />}>
        <SnipOverlay />
      </Suspense>
    )
  }

  if (isPopup) {
    return (
      <Suspense fallback={loadingView}>
        <ClipboardPopup />
      </Suspense>
    )
  }

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen bg-background text-text antialiased overflow-hidden select-none">
        {/* Sidebar Navigation */}
        <aside
          className={cn(
            'flex flex-col shrink-0 border-r border-border bg-surface transition-[width] duration-200 ease-out',
            collapsed ? 'w-[60px] px-2 py-3' : 'w-56 px-3 py-3'
          )}
        >
          {/* Brand */}
          <div className={cn('flex h-9 items-center gap-2.5', collapsed ? 'justify-center' : 'px-1.5')}>
            <Logo className="h-7 w-7 shrink-0" />
            {!collapsed && <span className="text-[15px] font-semibold tracking-tight">Deskup</span>}
          </div>

          {/* Search / command bar */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            title={`Search & commands (Ctrl+K)
Show/hide Deskup: ${prettyHotkey(hotkeys.main)}
Clipboard popup: ${prettyHotkey(hotkeys.clipboard)}`}
            aria-label="Open command palette"
            className={cn(
              'mt-3 flex h-8 items-center gap-2 rounded-lg border border-border bg-background text-xs text-muted transition-colors hover:border-hover hover:text-text',
              collapsed ? 'justify-center' : 'px-2.5'
            )}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search…</span>
                <kbd className="font-mono text-[10px] text-muted">Ctrl K</kbd>
              </>
            )}
          </button>

          {/* Navigation Links */}
          <nav className="mt-4 flex flex-col gap-0.5" aria-label="Main">
            {NAV_ITEMS.map(({ id, label, icon: Icon }, index) => {
              const active = activeTab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  aria-current={active ? 'page' : undefined}
                  title={`${label} (Ctrl+${index + 1})`}
                  className={cn(
                    'group relative flex h-8 items-center gap-2.5 rounded-lg text-[13px] transition-colors',
                    collapsed ? 'justify-center' : 'px-2.5',
                    active ? 'bg-elevated font-medium text-text' : 'text-muted hover:bg-elevated/60 hover:text-text'
                  )}
                >
                  {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-0.5 rounded-r bg-indigo-500" aria-hidden />}
                  <Icon className={cn('h-4 w-4 shrink-0', active && 'text-indigo-600 dark:text-indigo-400')} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{label}</span>
                      <kbd className="font-mono text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
                        {index + 1}
                      </kbd>
                    </>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className={cn('mt-auto flex items-center gap-2 pt-3', collapsed ? 'flex-col' : 'justify-between pl-2.5')}>
            <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted" title="All data stays on this device">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {!collapsed && <span className="truncate">Local only</span>}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
              className="h-7 w-7"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
        </aside>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto bg-background px-8 py-7">
          <div key={activeTab} className="mx-auto max-w-[1600px] animate-page-in">
            <Suspense fallback={loadingView}>
              {activeTab === 'dashboard' && (
                <DashboardPage
                  onNavigateToProfiles={() => setActiveTab('profiles')}
                  onNavigateToClipboard={() => setActiveTab('clipboard')}
                  onNavigateToNotes={() => setActiveTab('notes')}
                />
              )}
              {activeTab === 'board' && <BoardPage />}
              {activeTab === 'whiteboard' && <WhiteboardPage />}
              {activeTab === 'profiles' && <ProfilesPage />}
              {activeTab === 'notes' && <NotesPage />}
              {activeTab === 'clipboard' && <ClipboardPage />}
              {activeTab === 'settings' && <SettingsPage onThemeChange={applyTheme} />}
              {activeTab === 'tools' && <ToolsPage />}
            </Suspense>
          </div>
        </main>

        {/* Global Command Palette */}
        {isCommandPaletteOpen && (
          <Suspense fallback={loadingView}>
            <CommandPaletteModal
              isOpen={isCommandPaletteOpen}
              onClose={() => setIsCommandPaletteOpen(false)}
              onNavigate={setActiveTab}
              onThemeChange={applyTheme}
            />
          </Suspense>
        )}
      </div>
    </ToastProvider>
  )
}
