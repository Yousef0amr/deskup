import type { Profile, NoteItem, ClipItem, FocusState } from '../../../shared/types'

export type CommandCategory = 'workspaces' | 'notes' | 'focus' | 'clipboard' | 'navigation' | 'theme'

export interface PaletteCommand {
  id: string
  title: string
  subtitle?: string
  category: CommandCategory
  badge?: string
  iconType: 'rocket' | 'file' | 'clock' | 'clipboard' | 'navigation' | 'sun' | 'moon' | 'laptop' | 'plus'
  action: () => void | Promise<void>
}

export function buildCommandList(
  query: string,
  data: {
    profiles: Profile[]
    notes: NoteItem[]
    clips: ClipItem[]
    focusState: FocusState | null
    onNavigate: (tab: 'dashboard' | 'profiles' | 'notes' | 'clipboard' | 'settings') => void
    onOpenNote: (id: string) => void
    onLaunchProfile: (id: string) => void
    onFocusAction: (action: 'start' | 'pause' | 'reset') => void
    onThemeChange: (theme: 'light' | 'dark' | 'system') => void
    onCopyClip: (text: string) => void
    onCreateNote: () => void
  }
): PaletteCommand[] {
  const commands: PaletteCommand[] = []
  const q = query.trim().toLowerCase()

  // 1. Navigation Commands
  const navItems: { id: string; title: string; tab: 'dashboard' | 'profiles' | 'notes' | 'clipboard' | 'settings' }[] = [
    { id: 'nav-dash', title: 'Go to Dashboard', tab: 'dashboard' },
    { id: 'nav-profiles', title: 'Go to Workspace Profiles', tab: 'profiles' },
    { id: 'nav-notes', title: 'Go to Notes Studio', tab: 'notes' },
    { id: 'nav-clip', title: 'Go to Clipboard History', tab: 'clipboard' },
    { id: 'nav-settings', title: 'Go to Settings', tab: 'settings' }
  ]

  for (const nav of navItems) {
    if (!q || nav.title.toLowerCase().includes(q)) {
      commands.push({
        id: nav.id,
        title: nav.title,
        subtitle: 'Navigation',
        category: 'navigation',
        iconType: 'navigation',
        action: () => data.onNavigate(nav.tab)
      })
    }
  }

  // 2. Focus Timer Commands
  const isRunning = data.focusState?.endsAt != null
  if (!q || 'focus pomodoro timer'.includes(q) || 'start pause timer'.includes(q)) {
    if (isRunning) {
      commands.push({
        id: 'focus-pause',
        title: 'Pause Focus Session',
        subtitle: 'Clockify Timer',
        category: 'focus',
        badge: 'Timer',
        iconType: 'clock',
        action: () => data.onFocusAction('pause')
      })
    } else {
      commands.push({
        id: 'focus-start',
        title: 'Start Focus Session (25m)',
        subtitle: 'Clockify Timer',
        category: 'focus',
        badge: 'Timer',
        iconType: 'clock',
        action: () => data.onFocusAction('start')
      })
    }
    commands.push({
      id: 'focus-reset',
      title: 'Reset Focus Session',
      subtitle: 'Clockify Timer',
      category: 'focus',
      badge: 'Timer',
      iconType: 'clock',
      action: () => data.onFocusAction('reset')
    })
  }

  // 3. Workspace Profiles Launching
  for (const profile of data.profiles) {
    if (!q || profile.name.toLowerCase().includes(q) || 'workspace profile launch'.includes(q)) {
      commands.push({
        id: `profile-${profile.id}`,
        title: `Launch "${profile.name}"`,
        subtitle: `${profile.items.length} apps/urls`,
        category: 'workspaces',
        badge: 'Workspace',
        iconType: 'rocket',
        action: () => data.onLaunchProfile(profile.id)
      })
    }
  }

  // 4. Notes Searching & Creating
  if (!q || 'new note create note'.includes(q)) {
    commands.push({
      id: 'note-create-new',
      title: 'Create New Note',
      subtitle: 'Notes Studio',
      category: 'notes',
      badge: 'Action',
      iconType: 'plus',
      action: () => {
        data.onNavigate('notes')
        data.onCreateNote()
      }
    })
  }

  for (const note of data.notes) {
    if (
      !q ||
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q) ||
      (note.folder && note.folder.toLowerCase().includes(q))
    ) {
      commands.push({
        id: `note-${note.id}`,
        title: note.title || 'Untitled Note',
        subtitle: note.folder ? `📁 ${note.folder} · ${note.content.slice(0, 40)}` : note.content.slice(0, 40),
        category: 'notes',
        badge: note.folder || 'Note',
        iconType: 'file',
        action: () => {
          data.onNavigate('notes')
          data.onOpenNote(note.id)
        }
      })
    }
  }

  // 5. Clipboard Clips
  for (const clip of data.clips.slice(0, 10)) {
    if (!q || clip.text.toLowerCase().includes(q)) {
      commands.push({
        id: `clip-${clip.id}`,
        title: `Copy: "${clip.text.slice(0, 50).replace(/\n/g, ' ')}"`,
        subtitle: `${clip.text.length} chars`,
        category: 'clipboard',
        badge: 'Copy',
        iconType: 'clipboard',
        action: () => data.onCopyClip(clip.text)
      })
    }
  }

  // 6. Themes
  const themes: { id: string; title: string; theme: 'dark' | 'light' | 'system'; iconType: 'moon' | 'sun' | 'laptop' }[] = [
    { id: 'theme-dark', title: 'Switch to Dark Mode', theme: 'dark', iconType: 'moon' },
    { id: 'theme-light', title: 'Switch to Light Mode', theme: 'light', iconType: 'sun' },
    { id: 'theme-system', title: 'Switch to System Theme', theme: 'system', iconType: 'laptop' }
  ]
  for (const th of themes) {
    if (!q || th.title.toLowerCase().includes(q) || 'theme dark light'.includes(q)) {
      commands.push({
        id: th.id,
        title: th.title,
        subtitle: 'Appearance',
        category: 'theme',
        iconType: th.iconType,
        action: () => data.onThemeChange(th.theme)
      })
    }
  }

  return commands
}

