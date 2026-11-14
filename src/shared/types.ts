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
  autoLaunch?: boolean
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
  /** Download updates in the background as soon as they are found. */
  autoUpdate: boolean
}

export interface SystemStats {
  cpuPercent: number
  totalMemGb: number
  usedMemGb: number
  memPercent: number
  uptimeHours: number
  appMemMb: number
}

export type SyncMode = 'online' | 'auto' | 'offline'

export type WorkspaceKind = 'personal' | 'team'

export interface SyncConfig {
  /** 'local' = this device only; 'folder' = sync through a folder the user chose. */
  provider: 'local' | 'folder'
  folderPath: string
  mode: SyncMode
  deviceId: string
  deviceName: string
  /** personal = one person's devices (everything syncs); team = shared team data only. */
  workspaceKind: WorkspaceKind
  workspaceName: string
  /** The user's display name in a team. */
  memberName: string
  /** The folder is protected by a passphrase. */
  encrypted: boolean
  /** Folder key, encrypted with the OS keychain (safeStorage). Never leaves this device. */
  keyBlob?: string
}

export interface SyncMember {
  name: string
  devices: string[]
  you: boolean
}

/** What is already in a folder, shown before the user joins it. */
export interface SyncFolderInfo {
  exists: boolean
  kind?: WorkspaceKind
  name?: string
  encrypted: boolean
  /** Member/device names (empty when the folder is encrypted). */
  members: string[]
  deviceCount: number
  writable: boolean
}

export interface SyncSetup {
  folderPath: string
  /** Required when the folder has no workspace yet. */
  create?: { kind: WorkspaceKind; name: string }
  /** Unlocks an encrypted folder, or protects a new one. */
  passphrase?: string
  memberName?: string
  /** Team only: share the workspaces/boards/whiteboards already on this device. */
  shareExisting: boolean
}

export interface SyncStatus {
  provider: SyncConfig['provider']
  mode: SyncMode
  state: 'local' | 'idle' | 'syncing' | 'offline' | 'waiting' | 'error' | 'locked'
  /** Local edits not yet written to the sync folder. */
  pending: number
  lastSyncAt?: number
  error?: string
  folderPath?: string
  deviceName: string
  /** Names of other devices that share the folder. */
  otherDevices: string[]
  members: SyncMember[]
  workspaceKind?: WorkspaceKind
  workspaceName?: string
  encrypted?: boolean
  memberName?: string
}

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'downloaded' | 'error' | 'unsupported'
  currentVersion: string
  /** Version of the update being offered / downloaded. */
  version?: string
  percent?: number
  message?: string
  checkedAt?: number
}

export interface SnipBegin {
  session: number
  /** Overlay size in CSS pixels (the display's bounds). */
  width: number
  height: number
  scaleFactor: number
}

export interface SnipFrame {
  session: number
  width: number
  height: number
  /** BGRA pixels, row-major. */
  pixels: Uint8Array
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
  sync: {
    getStatus(): Promise<SyncStatus>
    onStatus(callback: (status: SyncStatus) => void): () => void
    /** Fired after changes from other devices were applied locally. */
    onApplied(callback: (info: { collections: string[] }) => void): () => void
    getConfig(): Promise<Pick<SyncConfig, 'provider' | 'folderPath' | 'mode' | 'deviceName' | 'memberName'>>
    chooseFolder(): Promise<string | null>
    inspectFolder(folderPath: string): Promise<SyncFolderInfo>
    /** Create or join the workspace in a folder and start syncing. */
    setup(options: SyncSetup): Promise<SyncStatus>
    /** Enter the passphrase on a device whose stored key is unavailable. */
    unlock(passphrase: string): Promise<SyncStatus>
    setMemberName(name: string): Promise<SyncStatus>
    useLocal(): Promise<SyncStatus>
    setMode(mode: SyncMode): Promise<SyncStatus>
    setDeviceName(name: string): Promise<SyncStatus>
    syncNow(): Promise<SyncStatus>
    /** The main window reloaded its views after a sync; earlier saves may be stale. */
    viewsRefreshed(): void
  }
  updates: {
    getStatus(): Promise<UpdateStatus>
    onStatus(callback: (status: UpdateStatus) => void): () => void
    check(): Promise<UpdateStatus>
    download(): Promise<void>
    /** Quit and install a downloaded update. */
    install(): Promise<void>
  }
  snip: {
    start(): Promise<void>
    /** Overlay renderer signals it is mounted and listening. */
    ready(): void
    onBegin(callback: (begin: SnipBegin) => void): () => void
    onFrame(callback: (frame: SnipFrame) => void): () => void
    /** Tells the main process this session's frame is painted, so the overlay can be shown. */
    painted(session: number): void
    onReset(callback: () => void): () => void
    copyImage(dataUrl: string): Promise<void>
    saveImage(dataUrl: string): Promise<boolean>
    pin(dataUrl: string, rect: { x: number; y: number; width: number; height: number }): Promise<void>
    /** Runs OCR on the image, copies the text to the clipboard and returns it. */
    copyText(dataUrl: string): Promise<string>
    close(): Promise<void>
  }
}

declare global {
  interface Window {
    deskup: DeskupAPI
  }
}
