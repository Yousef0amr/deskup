export type ItemType = 'app' | 'folder' | 'url'

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
}

export interface FocusState {
  mode: 'work' | 'break'
  remainingMs: number
  endsAt: number | null
  sessionsCompleted: number
}
export type FocusAction = 'start' | 'pause' | 'reset' | 'skip'

export interface ClipItem {
  id: string
  text: string
  createdAt: number
  pinned: boolean
}

export interface ClipboardSettings {
  enabled: boolean
  maxItems: number
  isPaused: boolean
  hotkey: string
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  pomodoro: { workMin: number; breakMin: number }
  hotkey: string
  launchAtLogin: boolean
  minimizeToTray: boolean
  clipboard: ClipboardSettings
}

export interface DeskupAPI {
  focus: {
    get(): Promise<FocusState>
    action(action: FocusAction): Promise<FocusState>
    onChanged(callback: (state: FocusState) => void): () => void
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
  notes: {
    get(): Promise<string>
    save(text: string): Promise<void>
  }
  clipboard: {
    list(): Promise<ClipItem[]>
    copy(text: string): Promise<void>
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
