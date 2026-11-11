export type ItemType = 'app' | 'folder' | 'url'
export type AppTab = 'dashboard' | 'board' | 'whiteboard' | 'profiles' | 'notes' | 'clipboard' | 'tools' | 'settings'

export interface InstalledApp {
  name: string
  path: string
}

export interface ProfileItem {
  id: string
  type: ItemType
  target: string // path or URL
  label?: string
}

export interface Profile {
  id: string
  name: string
  icon: string // emoji
  color: string // hex
  items: ProfileItem[]
  launchDelayMs: number
}

export interface LaunchResult {
  itemId: string
  ok: boolean
  error?: string
}

export interface Todo {
  id: string
  text: string
  done: boolean
  order: number
  priority?: 'high' | 'medium' | 'low'
  dueDate?: string
}

export interface Habit {
  id: string
  name: string
  icon: string // emoji
  createdAt: number
  completions: string[] // local YYYY-MM-DD date keys
}

export interface NoteItem {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  pinned?: boolean
  folder?: string
  color?: string
  tags?: string[]
}

export interface FocusSessionEntry {
  id: string
  taskName: string
  category?: string
  startedAt: number
  endedAt: number
  durationMs: number
  completed: boolean
  mode: 'work' | 'break'
}

export interface FocusState {
  mode: 'work' | 'break'
  remainingMs: number
  endsAt: number | null
  sessionsCompleted: number
  currentTask?: string
  currentCategory?: string
  startedAt?: number | null
}
export type FocusAction = 'start' | 'pause' | 'reset' | 'skip'

export interface ClipItem {
  id: string
  /** Copied text, or a short label such as "Image 1280×720" for image clips. */
  text: string
  createdAt: number
  pinned: boolean
  /** Present for image clips; the PNG is served at deskup-media://clip/<id>. */
  image?: { width: number; height: number }
}

export interface MusicTrack {
  id: string
  name: string
  path: string
}

export interface ClipboardSettings {
  enabled: boolean
  maxItems: number
  isPaused: boolean
  hotkey: string
  captureImages: boolean
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  pomodoro: { workMin: number; breakMin: number }
  hotkey: string
  launchAtLogin: boolean
  minimizeToTray: boolean
  dailyFocusGoalMin: number
  clipboard: ClipboardSettings
}

export interface SystemStats {
  cpuPercent: number
  totalMemGb: number
  usedMemGb: number
  memPercent: number
  uptimeHours: number
  appMemMb: number
}

export interface DeskupAPI {
  focus: {
    get(): Promise<FocusState>
    action(action: FocusAction, payload?: { taskName?: string; category?: string }): Promise<FocusState>
    onChanged(callback: (state: FocusState) => void): () => void
    getHistory(): Promise<FocusSessionEntry[]>
    addHistory(entry: Omit<FocusSessionEntry, 'id'>): Promise<FocusSessionEntry>
    deleteHistoryItem(id: string): Promise<void>
    clearHistory(): Promise<void>
  }
  profiles: {
    list(): Promise<Profile[]>
    save(profile: Profile): Promise<Profile>
    delete(id: string): Promise<void>
    launch(id: string): Promise<LaunchResult[]>
  }
  todos: {
    list(): Promise<Todo[]>
    save(todos: Todo[]): Promise<void>
  }
  habits: {
    list(): Promise<Habit[]>
    save(habits: Habit[]): Promise<Habit[]>
  }
  whiteboards: {
    list(): Promise<import('./whiteboard').Whiteboard[]>
    save(boards: import('./whiteboard').Whiteboard[]): Promise<void>
  }
  board: {
    get(): Promise<import('./board').BoardData>
    save(data: import('./board').BoardData): Promise<void>
  }
  notes: {
    get(): Promise<string>
    save(text: string): Promise<void>
    list(): Promise<NoteItem[]>
    saveNote(note: NoteItem): Promise<NoteItem>
    saveAll(notes: NoteItem[]): Promise<void>
    delete(id: string): Promise<void>
    create(title?: string, content?: string, folder?: string, color?: string): Promise<NoteItem>
  }
  system: {
    getStats(): Promise<SystemStats>
  }
  music: {
    list(): Promise<MusicTrack[]>
    add(): Promise<MusicTrack[]>
    remove(id: string): Promise<MusicTrack[]>
    onChanged(callback: (tracks: MusicTrack[]) => void): () => void
  }
  clipboard: {
    list(): Promise<ClipItem[]>
    copy(text: string): Promise<void>
    copyImage(id: string): Promise<void>
    copyImageData(dataUrl: string): Promise<void>
    pin(id: string): Promise<void>
    delete(id: string): Promise<void>
    clear(includePinned?: boolean): Promise<void>
    togglePause(): Promise<boolean>
    closePopup(): Promise<void>
    onChanged(callback: (clips: ClipItem[]) => void): () => void
  }
  settings: {
    onChanged(callback: (settings: Settings) => void): () => void
    get(): Promise<Settings>
    update(patch: Partial<Settings>): Promise<Settings>
  }
  dialog: {
    pickFile(): Promise<string | null>
    pickFolder(): Promise<string | null>
  }
  apps: {
    list(): Promise<InstalledApp[]>
  }
  data: {
    onImported(callback: () => void): () => void
    exportAll(): Promise<boolean>
    importAll(): Promise<boolean>
  }
}

declare global {
  interface Window {
    deskup: DeskupAPI
  }
}
