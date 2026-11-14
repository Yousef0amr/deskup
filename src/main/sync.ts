import { BrowserWindow, dialog, ipcMain, safeStorage } from 'electron'
import { randomUUID } from 'crypto'
import { watch, type FSWatcher } from 'fs'
import { access, mkdir, readdir, readFile, rename, unlink, writeFile } from 'fs/promises'
import { constants as fsConstants } from 'fs'
import { hostname } from 'os'
import { join } from 'path'
import { store } from './store'
import {
  countLocalChanges,
  guardStaleSave,
  hashValue,
  materialize,
  mergeMaps,
  pruneTombstones,
  recordLocalChanges,
  type CollectionMaps,
  type SaveGuardEntry
} from '../shared/syncMerge'
import { createEncryption, isSealed, open, seal, unlockEncryption, type EncryptionInfo, type Sealed } from './syncCrypto'
import type { SyncConfig, SyncFolderInfo, SyncMember, SyncMode, SyncSetup, SyncStatus, WorkspaceKind } from '../shared/types'

/**
 * Folder sync ("bring your own storage") with personal and team workspaces.
 *
 * Deskup never hosts data. A user or a team picks a folder that something else already
 * syncs — OneDrive, Dropbox, Google Drive, a NAS or network share:
 *
 *   <folder>/Deskup Sync/workspace.json          kind (personal/team), name, encryption
 *   <folder>/Deskup Sync/devices/<deviceId>.json  one file per device, full merged state
 *
 * One writer per file means cloud clients never produce conflict copies. Each device reads
 * all files and merges them item by item (newest change wins, deletions remembered), see
 * src/shared/syncMerge.ts.
 *
 * Personal workspaces sync everything between one person's devices. Team workspaces share
 * only team data (workspaces, boards, whiteboards); tasks, habits, notes and focus history
 * stay private. Items that existed before joining a team can be kept private too.
 * A passphrase, if set, seals every device file with AES-256-GCM (src/main/syncCrypto.ts);
 * the derived key is kept on each device with the OS keychain (safeStorage/DPAPI).
 *
 * Modes: online = always sync and report errors; auto = sync when the folder is reachable,
 * wait quietly when it is not; offline = never touch the folder.
 */

/* ------------------------------------------------------------------ collections */

interface Adapter {
  read(): { id: string }[]
  write(items: { id: string }[]): void
}

type ArrayKey = 'profiles' | 'todos' | 'habits' | 'whiteboards' | 'focusHistory'

function arrayAdapter(key: ArrayKey): Adapter {
  return {
    read: () => (store.get(key, []) as { id: string }[]) ?? [],
    write: (items) => store.set(key, items as never)
  }
}

const ADAPTERS: Record<string, Adapter> = {
  profiles: arrayAdapter('profiles'),
  todos: arrayAdapter('todos'),
  habits: arrayAdapter('habits'),
  whiteboards: arrayAdapter('whiteboards'),
  notesList: {
    read: () => store.get('notesList', []) ?? [],
    // `notes` mirrors the first note's content (legacy scratchpad); keep it in step.
    write: (items) => store.set({ notesList: items as never, notes: String((items[0] as { content?: unknown } | undefined)?.content ?? '') })
  },
  focusHistory: arrayAdapter('focusHistory'),
  boards: {
    read: () => store.get('boardData', { boards: [], cards: [] }).boards ?? [],
    write: (items) => store.set('boardData', { ...store.get('boardData', { boards: [], cards: [] }), boards: items as never })
  },
  cards: {
    read: () => store.get('boardData', { boards: [], cards: [] }).cards ?? [],
    write: (items) => store.set('boardData', { ...store.get('boardData', { boards: [], cards: [] }), cards: items as never })
  }
}
const ALL_COLLECTIONS = Object.keys(ADAPTERS)
/** What a team shares. Everything else stays on each member's own devices. */
const TEAM_COLLECTIONS = ['profiles', 'boards', 'cards', 'whiteboards']
/** Store keys whose changes should trigger a sync. */
const WATCHED_KEYS = ['profiles', 'todos', 'habits', 'whiteboards', 'notesList', 'focusHistory', 'boardData'] as const

export type SyncCollection = keyof typeof ADAPTERS

function activeCollections(): string[] {
  return config.workspaceKind === 'team' ? TEAM_COLLECTIONS : ALL_COLLECTIONS
}

/** Items in `col` that this device keeps private (existed before joining a team). */
function privateIds(col: string): Set<string> {
  return new Set(state.localOnly?.[col] ?? [])
}

function readShared(col: string): { id: string }[] {
  const priv = privateIds(col)
  const all = ADAPTERS[col].read()
  return priv.size ? all.filter((i) => !priv.has(i.id)) : all
}

/** Write the shared items back, leaving private items where they were. */
function writeShared(col: string, shared: { id: string }[]): void {
  const priv = privateIds(col)
  if (!priv.size) return ADAPTERS[col].write(shared)
  const queue = [...shared]
  const out: { id: string }[] = []
  for (const item of ADAPTERS[col].read()) {
    if (priv.has(item.id)) out.push(item)
    else if (queue.length) out.push(queue.shift()!)
  }
  ADAPTERS[col].write(out.concat(queue))
}

/* ------------------------------------------------------------------ files */

const SYNC_DIR = 'Deskup Sync'
const PERIODIC_MS = 30_000
const LOCAL_DEBOUNCE_MS = 2_000
const REMOTE_DEBOUNCE_MS = 1_500

/**
 * Readable by anyone with the folder, even when encrypted (so people can see what they are
 * joining before typing the passphrase). Keep it to the kind and name — no member names.
 */
interface WorkspaceManifest {
  format: 1
  id: string
  kind: WorkspaceKind
  name: string
  createdAt: number
  encryption?: EncryptionInfo
}

/** What a device writes. Plain (format 1) or sealed with the workspace key (format 2). */
type DeviceFile =
  | { format: 1; deviceId: string; deviceName: string; memberName?: string; writtenAt: number; collections: CollectionMaps }
  | { format: 2; deviceId: string; writtenAt: number; sealed: Sealed }

interface DeviceContent {
  deviceId: string
  deviceName: string
  memberName?: string
  collections: CollectionMaps
}

interface SyncState {
  workspaceId?: string
  records: CollectionMaps
  /** Per collection, ids kept off the shared folder. */
  localOnly?: Record<string, string[]>
  lastSyncAt?: number
  lastWrittenHash?: string
}

let config: SyncConfig
let state: SyncState
let status: SyncStatus
let key: Buffer | null = null
let running = false
let rerun = false
let applying = false
let periodic: NodeJS.Timeout | null = null
let localTimer: NodeJS.Timeout | null = null
let remoteTimer: NodeJS.Timeout | null = null
let watcher: FSWatcher | null = null
let lastClock = 0

/** Changes sync applied recently, per collection — protects them from stale UI saves. */
const appliedLog: Record<string, Record<string, SaveGuardEntry>> = {}
/**
 * When the main window last reloaded its views after a sync (it reports this itself, see
 * 'sync:viewsRefreshed'). Saves before that may come from a view holding pre-sync data.
 * Reads alone don't count: one widget re-reading a list says nothing about another
 * widget that is still showing (and about to save) its old copy.
 */
let viewsRefreshedAt = 0

function now(): number {
  lastClock = Math.max(Date.now(), lastClock + 1)
  return lastClock
}

function rootDir(folder = config.folderPath): string {
  return join(folder, SYNC_DIR)
}

function devicesDir(folder = config.folderPath): string {
  return join(rootDir(folder), 'devices')
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}

function setStatus(patch: Partial<SyncStatus>): void {
  const folder = config.provider === 'folder'
  status = {
    ...status,
    provider: config.provider,
    mode: config.mode,
    deviceName: config.deviceName,
    folderPath: folder ? config.folderPath : undefined,
    workspaceKind: folder ? config.workspaceKind : undefined,
    workspaceName: folder ? config.workspaceName : undefined,
    encrypted: folder && config.encrypted,
    memberName: config.memberName,
    ...patch
  }
  broadcast('sync:status', status)
}

function pendingChanges(): number {
  if (config.provider !== 'folder') return 0
  let total = 0
  for (const col of activeCollections()) total += countLocalChanges(state.records[col] ?? {}, readShared(col))
  return total
}

function saveConfig(): void {
  store.set('syncConfig', config)
}

function saveState(): void {
  store.set('syncState', state)
}

function storeKey(k: Buffer): string | undefined {
  if (!safeStorage.isEncryptionAvailable()) return undefined
  return safeStorage.encryptString(k.toString('base64')).toString('base64')
}

function loadKey(blob: string | undefined): Buffer | null {
  if (!blob || !safeStorage.isEncryptionAvailable()) return null
  try {
    return Buffer.from(safeStorage.decryptString(Buffer.from(blob, 'base64')), 'base64')
  } catch {
    return null
  }
}

async function readManifest(folder: string): Promise<WorkspaceManifest | null> {
  try {
    const m = JSON.parse(await readFile(join(rootDir(folder), 'workspace.json'), 'utf8')) as WorkspaceManifest
    if (m?.format === 1 && (m.kind === 'personal' || m.kind === 'team') && typeof m.id === 'string') return m
  } catch {
    // missing or unreadable
  }
  return null
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const tmp = `${path}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(value), 'utf8')
  await rename(tmp, path)
}

async function ensureFolderReady(): Promise<void> {
  await access(config.folderPath, fsConstants.R_OK | fsConstants.W_OK)
  await mkdir(devicesDir(), { recursive: true })
}

/** Read every device file this device can open. */
async function readDevices(folder: string, withKey: Buffer | null): Promise<{ devices: DeviceContent[]; unreadable: number }> {
  const dir = devicesDir(folder)
  let names: string[] = []
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.json'))
  } catch {
    return { devices: [], unreadable: 0 }
  }
  const devices: DeviceContent[] = []
  let unreadable = 0
  for (const name of names) {
    let file: DeviceFile
    try {
      file = JSON.parse(await readFile(join(dir, name), 'utf8')) as DeviceFile
    } catch {
      continue // half-downloaded by the cloud client or being written — next round
    }
    try {
      if (file?.format === 2 && isSealed(file.sealed)) {
        if (!withKey) {
          unreadable++
          continue
        }
        const content = JSON.parse(open(withKey, file.sealed)) as Omit<DeviceContent, 'deviceId'>
        devices.push({ ...content, deviceId: file.deviceId })
      } else if (file?.format === 1 && file.collections && typeof file.collections === 'object') {
        // In an encrypted workspace, plain files are not trusted (could be anyone's).
        if (withKey) unreadable++
        else devices.push({ deviceId: file.deviceId, deviceName: file.deviceName, memberName: file.memberName, collections: file.collections })
      }
    } catch {
      unreadable++ // wrong key (e.g. a stale file from before the folder was re-created)
    }
  }
  return { devices, unreadable }
}

async function writeOwnFile(records: CollectionMaps): Promise<void> {
  const content: Omit<DeviceContent, 'deviceId'> = { deviceName: config.deviceName, memberName: config.memberName || undefined, collections: records }
  const file: DeviceFile = key
    ? { format: 2, deviceId: config.deviceId, writtenAt: Date.now(), sealed: seal(key, JSON.stringify(content)) }
    : { format: 1, deviceId: config.deviceId, writtenAt: Date.now(), ...content }
  await writeJsonAtomic(join(devicesDir(), `${config.deviceId}.json`), file)
}

function membersFrom(devices: DeviceContent[]): SyncMember[] {
  const byName = new Map<string, SyncMember>()
  for (const d of devices) {
    const you = d.deviceId === config.deviceId
    // In a personal workspace every device belongs to the same person.
    const name = config.workspaceKind === 'team' ? d.memberName || 'Unnamed member' : 'You'
    const m = byName.get(name) ?? { name, devices: [], you: false }
    m.devices.push(d.deviceName || 'Unnamed device')
    m.you = m.you || you
    byName.set(name, m)
  }
  return [...byName.values()].sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name))
}

/* ------------------------------------------------------------------ sync cycle */

export async function syncNow(): Promise<SyncStatus> {
  if (config.provider !== 'folder') {
    setStatus({ state: 'local', pending: 0, error: undefined })
    return status
  }
  if (config.encrypted && !key) {
    setStatus({ state: 'locked', error: 'Enter the passphrase to unlock sync on this device' })
    return status
  }
  if (config.mode === 'offline') {
    setStatus({ state: 'offline', pending: pendingChanges(), error: undefined })
    return status
  }
  if (running) {
    rerun = true
    return status
  }
  running = true
  setStatus({ state: 'syncing' })
  try {
    await ensureFolderReady()
    const { devices, unreadable } = await readDevices(config.folderPath, key)

    // Never stamp a local edit older than a change we have already seen.
    for (const map of Object.values(state.records)) {
      for (const rec of Object.values(map)) if (rec.u > lastClock) lastClock = rec.u
    }

    const records: CollectionMaps = {}
    const changedCollections: string[] = []
    for (const col of activeCollections()) {
      const current = readShared(col)
      const local = recordLocalChanges(state.records[col] ?? {}, current, config.deviceId, now).map
      const merged = pruneTombstones(mergeMaps(local, ...devices.map((d) => d.collections?.[col])), Date.now())
      records[col] = merged

      const next = materialize<{ id: string }>(merged, current)
      if (hashValue(next) !== hashValue(current)) {
        logApplied(col, current, next)
        applying = true
        try {
          writeShared(col, next)
        } finally {
          applying = false
        }
        changedCollections.push(col)
      }
    }

    const recordsHash = hashValue([records, config.deviceName, config.memberName])
    const ownFileMissing = !devices.some((d) => d.deviceId === config.deviceId)
    if (recordsHash !== state.lastWrittenHash || ownFileMissing) {
      await writeOwnFile(records)
      state.lastWrittenHash = recordsHash
    }
    state.records = records
    state.lastSyncAt = Date.now()
    saveState()

    const others = devices.filter((d) => d.deviceId !== config.deviceId)
    if (ownFileMissing) devices.push({ deviceId: config.deviceId, deviceName: config.deviceName, memberName: config.memberName, collections: {} })
    setStatus({
      state: 'idle',
      lastSyncAt: state.lastSyncAt,
      pending: 0,
      error: unreadable ? `${unreadable} device file${unreadable > 1 ? 's' : ''} could not be read (different passphrase?)` : undefined,
      otherDevices: others.map((d) => (config.workspaceKind === 'team' && d.memberName ? `${d.memberName} (${d.deviceName})` : d.deviceName || 'Unnamed device')),
      members: membersFrom(devices)
    })
    if (changedCollections.length) broadcast('sync:applied', { collections: changedCollections })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    const message = code === 'ENOENT' || code === 'EACCES' || code === 'EPERM' ? 'The sync folder is not reachable' : (error as Error).message
    // In auto mode an unreachable folder (unplugged drive, VPN down) is normal: wait quietly.
    setStatus({ state: config.mode === 'auto' ? 'waiting' : 'error', error: message, pending: pendingChanges() })
  } finally {
    running = false
    if (rerun) {
      rerun = false
      scheduleLocalSync()
    }
  }
  return status
}

function logApplied(col: string, before: { id: string }[], after: { id: string }[]): void {
  const log = (appliedLog[col] ??= {})
  const at = Date.now()
  const prev = new Map(before.map((i) => [i.id, i]))
  const next = new Map(after.map((i) => [i.id, i]))
  for (const id of new Set([...prev.keys(), ...next.keys()])) {
    const p = prev.get(id)
    const n = next.get(id)
    if (p && n && hashValue(p) === hashValue(n)) continue
    log[id] = { at, prevHash: p ? hashValue(p) : '', value: n }
  }
  // Forget entries old enough that every open view has reloaded since.
  for (const [id, entry] of Object.entries(log)) if (at - entry.at > 10 * 60_000) delete log[id]
}

/* ------------------------------------------------------- hooks used by IPC handlers */

/**
 * Call from whole-list save handlers before writing: keeps changes that arrived through
 * sync after the UI loaded the list, instead of letting the stale copy overwrite them.
 */
export function guardSave<T extends { id: string }>(collection: SyncCollection, items: T[]): T[] {
  const log = appliedLog[collection]
  if (!log || config?.provider !== 'folder') return items
  return guardStaleSave(items, log, viewsRefreshedAt)
}

/* ------------------------------------------------------------------ scheduling */

function scheduleLocalSync(): void {
  if (localTimer) clearTimeout(localTimer)
  localTimer = setTimeout(() => {
    localTimer = null
    if (config.mode === 'offline') setStatus({ state: 'offline', pending: pendingChanges() })
    else void syncNow()
  }, LOCAL_DEBOUNCE_MS)
}

function startWatching(): void {
  stopWatching()
  if (config.provider !== 'folder' || config.mode === 'offline') return
  periodic = setInterval(() => void syncNow(), PERIODIC_MS)
  try {
    watcher = watch(devicesDir(), (_event, file) => {
      if (!file || String(file).startsWith(config.deviceId)) return
      if (remoteTimer) clearTimeout(remoteTimer)
      remoteTimer = setTimeout(() => void syncNow(), REMOTE_DEBOUNCE_MS)
    })
    watcher.on('error', () => stopWatcherOnly())
  } catch {
    // Folder not reachable yet; the periodic sync keeps trying.
  }
}

function stopWatcherOnly(): void {
  watcher?.close()
  watcher = null
}

function stopWatching(): void {
  stopWatcherOnly()
  if (periodic) clearInterval(periodic)
  periodic = null
}

/* ------------------------------------------------------------------ setup */

async function assertWritable(folder: string): Promise<void> {
  await mkdir(devicesDir(folder), { recursive: true })
  const probe = join(devicesDir(folder), `.write-test-${config.deviceId}`)
  await writeFile(probe, 'ok')
  await unlink(probe)
}

/** Describe a folder before joining it: new, or an existing personal/team workspace. */
async function inspectFolder(folder: string): Promise<SyncFolderInfo> {
  const manifest = await readManifest(folder)
  let writable = true
  try {
    await access(folder, fsConstants.R_OK | fsConstants.W_OK)
  } catch {
    writable = false
  }
  // Names are only visible without encryption (they live inside the sealed files).
  const { devices, unreadable } = await readDevices(folder, null)
  const names = new Set<string>()
  for (const d of devices) if (d.deviceId !== config.deviceId) names.add(d.memberName || d.deviceName || 'Unnamed device')
  return {
    exists: Boolean(manifest) || devices.length > 0 || unreadable > 0,
    kind: manifest?.kind ?? (devices.length ? 'personal' : undefined),
    name: manifest?.name,
    encrypted: Boolean(manifest?.encryption),
    members: [...names],
    deviceCount: devices.length + unreadable,
    writable
  }
}

async function setup(input: SyncSetup): Promise<SyncStatus> {
  const folder = input.folderPath.trim()
  await assertWritable(folder)
  let manifest = await readManifest(folder)
  const legacyDevices = !manifest && (await readDevices(folder, null)).devices.length > 0
  let newKey: Buffer | null = null

  if (manifest) {
    if (manifest.encryption) {
      if (!input.passphrase) throw new Error('This folder is protected. Enter its passphrase.')
      newKey = await unlockEncryption(manifest.encryption, input.passphrase)
    }
  } else {
    // New workspace (or a folder synced by an earlier Deskup without workspace.json).
    const kind: WorkspaceKind = legacyDevices ? 'personal' : input.create?.kind === 'team' ? 'team' : 'personal'
    if (legacyDevices && input.passphrase) {
      throw new Error('This folder already has unencrypted Deskup data. Choose an empty folder to use a passphrase.')
    }
    let encryption: EncryptionInfo | undefined
    if (input.passphrase) {
      const created = await createEncryption(input.passphrase)
      encryption = created.info
      newKey = created.key
    }
    manifest = {
      format: 1,
      id: randomUUID(),
      kind,
      name: (input.create?.name ?? '').trim().slice(0, 60) || (kind === 'team' ? 'Team' : 'My devices'),
      createdAt: Date.now(),
      encryption
    }
    await writeJsonAtomic(join(rootDir(folder), 'workspace.json'), manifest)
  }

  const memberName = (input.memberName ?? '').trim().slice(0, 60)
  if (manifest.kind === 'team' && !memberName) throw new Error('Enter your name so teammates know who made changes')

  if (state.workspaceId !== manifest.id || config.folderPath !== folder) {
    // A different workspace is a fresh start: what is here gets merged with what is there.
    const localOnly: Record<string, string[]> = {}
    if (manifest.kind === 'team' && !input.shareExisting) {
      for (const col of TEAM_COLLECTIONS) localOnly[col] = ADAPTERS[col].read().map((i) => i.id)
    }
    state = { workspaceId: manifest.id, records: {}, localOnly }
    saveState()
  }

  key = newKey
  config = {
    ...config,
    provider: 'folder',
    folderPath: folder,
    workspaceKind: manifest.kind,
    workspaceName: manifest.name,
    encrypted: Boolean(manifest.encryption),
    memberName: memberName || config.memberName,
    keyBlob: newKey ? storeKey(newKey) : undefined
  }
  saveConfig()
  startWatching()
  return syncNow()
}

async function unlock(passphrase: string): Promise<SyncStatus> {
  const manifest = await readManifest(config.folderPath)
  if (!manifest?.encryption) throw new Error('This sync folder is not protected')
  key = await unlockEncryption(manifest.encryption, passphrase)
  config = { ...config, keyBlob: storeKey(key) }
  saveConfig()
  startWatching()
  return syncNow()
}

/* ------------------------------------------------------------------ public api */

export function isNetworkAllowed(): boolean {
  return config?.mode !== 'offline'
}

export function getSyncStatus(): SyncStatus {
  return status
}

export function initSync(): void {
  const stored = store.get('syncConfig') as Partial<SyncConfig> | undefined
  config = {
    provider: stored?.provider === 'folder' && stored.folderPath ? 'folder' : 'local',
    folderPath: stored?.folderPath ?? '',
    mode: stored?.mode === 'online' || stored?.mode === 'offline' ? stored.mode : 'auto',
    deviceId: stored?.deviceId || randomUUID(),
    deviceName: stored?.deviceName || hostname(),
    workspaceKind: stored?.workspaceKind === 'team' ? 'team' : 'personal',
    workspaceName: stored?.workspaceName || 'My devices',
    memberName: stored?.memberName ?? '',
    encrypted: Boolean(stored?.encrypted),
    keyBlob: stored?.keyBlob
  }
  saveConfig()
  state = (store.get('syncState') as SyncState | undefined) ?? { records: {} }
  if (!state.records) state.records = {}
  key = config.encrypted ? loadKey(config.keyBlob) : null
  status = {
    provider: config.provider,
    mode: config.mode,
    state: config.provider !== 'folder' ? 'local' : config.encrypted && !key ? 'locked' : config.mode === 'offline' ? 'offline' : 'idle',
    pending: 0,
    deviceName: config.deviceName,
    lastSyncAt: state.lastSyncAt,
    otherDevices: [],
    members: []
  }
  setStatus({})

  for (const k of WATCHED_KEYS) {
    store.onDidChange(k, () => {
      if (!applying && config.provider === 'folder') scheduleLocalSync()
    })
  }

  registerSyncIpc()
  startWatching()
  if (config.provider === 'folder') setTimeout(() => void syncNow(), 3000)
}

export function stopSync(): void {
  stopWatching()
  if (localTimer) clearTimeout(localTimer)
  if (remoteTimer) clearTimeout(remoteTimer)
}

function validFolder(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Choose a folder first')
  return value.trim()
}

function registerSyncIpc(): void {
  ipcMain.handle('sync:getStatus', () => status)
  ipcMain.handle('sync:getConfig', () => ({
    provider: config.provider,
    folderPath: config.folderPath,
    mode: config.mode,
    deviceName: config.deviceName,
    memberName: config.memberName
  }))

  ipcMain.handle('sync:chooseFolder', async (e): Promise<string | null> => {
    const parent = BrowserWindow.fromWebContents(e.sender) ?? undefined
    const options: Electron.OpenDialogOptions = {
      title: 'Choose a folder to sync Deskup through',
      buttonLabel: 'Use this folder',
      properties: ['openDirectory', 'createDirectory']
    }
    const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options)
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0]
  })

  ipcMain.handle('sync:inspectFolder', (_, folder: unknown) => inspectFolder(validFolder(folder)))

  ipcMain.handle('sync:setup', (_, raw: unknown): Promise<SyncStatus> => {
    const r = (raw ?? {}) as Partial<SyncSetup>
    const kind = r.create?.kind
    return setup({
      folderPath: validFolder(r.folderPath),
      create: r.create && (kind === 'team' || kind === 'personal') ? { kind, name: String(r.create.name ?? '') } : undefined,
      passphrase: typeof r.passphrase === 'string' && r.passphrase ? r.passphrase : undefined,
      memberName: typeof r.memberName === 'string' ? r.memberName : undefined,
      shareExisting: r.shareExisting === true
    })
  })

  ipcMain.handle('sync:unlock', (_, passphrase: unknown): Promise<SyncStatus> => {
    if (typeof passphrase !== 'string' || !passphrase) throw new Error('Enter the passphrase')
    return unlock(passphrase)
  })

  ipcMain.handle('sync:useLocal', (): SyncStatus => {
    // Leaving keeps all data on this device; the key is forgotten.
    key = null
    config = { ...config, provider: 'local', keyBlob: undefined }
    saveConfig()
    stopWatching()
    setStatus({ state: 'local', pending: 0, error: undefined, otherDevices: [], members: [] })
    return status
  })

  ipcMain.handle('sync:setMode', (_, mode: unknown): Promise<SyncStatus> => {
    if (mode !== 'online' && mode !== 'auto' && mode !== 'offline') throw new Error('Invalid sync mode')
    config = { ...config, mode: mode as SyncMode }
    saveConfig()
    startWatching()
    return syncNow()
  })

  ipcMain.handle('sync:setDeviceName', (_, name: unknown): SyncStatus => {
    if (typeof name !== 'string' || !name.trim()) throw new Error('Device name cannot be empty')
    config = { ...config, deviceName: name.trim().slice(0, 60) }
    saveConfig()
    setStatus({})
    scheduleLocalSync()
    return status
  })

  ipcMain.handle('sync:setMemberName', (_, name: unknown): SyncStatus => {
    if (typeof name !== 'string' || !name.trim()) throw new Error('Your name cannot be empty')
    config = { ...config, memberName: name.trim().slice(0, 60) }
    saveConfig()
    setStatus({})
    scheduleLocalSync()
    return status
  })

  ipcMain.handle('sync:syncNow', () => syncNow())
  ipcMain.on('sync:viewsRefreshed', () => {
    viewsRefreshedAt = Date.now()
  })
}

