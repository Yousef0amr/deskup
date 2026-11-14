/**
 * Pure merge logic for folder sync. No Electron or fs here, so it is unit-tested directly.
 *
 * Model: every synced collection is a map of item id -> record. A record holds the item's
 * value (or a deletion marker) plus the time it last changed. Merging two maps keeps, per
 * id, the record that changed last ("last writer wins"); equal times are broken by device
 * id so every device reaches the same result. Deletions are kept as tombstones so a
 * deleted item is not resurrected by a device that still has the old copy.
 */

export interface SyncRecord {
  /** Last change time (ms). */
  u: number
  /** Present when the item was deleted. */
  d?: 1
  /** Item value (absent for deletions). */
  v?: unknown
  /** Hash of the value, to detect local edits cheaply. */
  h: string
  /** Device that made the change. */
  by: string
}

export type RecordMap = Record<string, SyncRecord>
export type CollectionMaps = Record<string, RecordMap>

export interface DeviceDoc {
  format: 1
  deviceId: string
  deviceName: string
  writtenAt: number
  collections: CollectionMaps
}

export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** JSON with object keys sorted, so equal values always produce equal strings. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const obj = value as Record<string, unknown>
  return (
    '{' +
    Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  )
}

/** FNV-1a (two 32-bit lanes) — fast, dependency-free change detection, not security. */
export function hashValue(value: unknown): string {
  const s = stableStringify(value)
  let h1 = 0x811c9dc5
  let h2 = 0x01000193 ^ s.length
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ c, 0x5bd1e995)
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)
}

/** True when record `a` should win over `b`. */
export function wins(a: SyncRecord, b: SyncRecord | undefined): boolean {
  if (!b) return true
  if (a.u !== b.u) return a.u > b.u
  if (a.by !== b.by) return a.by > b.by
  // Same change seen twice; prefer a deletion so both sides agree.
  return Boolean(a.d) && !b.d
}

/**
 * Record local edits: compares the current items with the last known records and stamps
 * new / changed items and deletions with `now`. Returns the updated map and change count.
 */
export function recordLocalChanges(
  known: RecordMap,
  items: { id: string }[],
  deviceId: string,
  now: () => number
): { map: RecordMap; changed: number } {
  const map: RecordMap = { ...known }
  let changed = 0
  const seen = new Set<string>()
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id) continue
    seen.add(item.id)
    const h = hashValue(item)
    const prev = map[item.id]
    if (!prev || prev.d || prev.h !== h) {
      map[item.id] = { u: now(), v: item, h, by: deviceId }
      changed++
    }
  }
  for (const [id, rec] of Object.entries(map)) {
    if (!rec.d && !seen.has(id)) {
      map[id] = { u: now(), d: 1, h: '', by: deviceId }
      changed++
    }
  }
  return { map, changed }
}

/** Count local edits without recording them (for the "N changes waiting" badge). */
export function countLocalChanges(known: RecordMap, items: { id: string }[]): number {
  let changed = 0
  const seen = new Set<string>()
  for (const item of items) {
    if (!item || typeof item.id !== 'string') continue
    seen.add(item.id)
    const prev = known[item.id]
    if (!prev || prev.d || prev.h !== hashValue(item)) changed++
  }
  for (const [id, rec] of Object.entries(known)) if (!rec.d && !seen.has(id)) changed++
  return changed
}

/** Merge several record maps; per id the winning record is kept. */
export function mergeMaps(...maps: (RecordMap | undefined)[]): RecordMap {
  const out: RecordMap = {}
  for (const map of maps) {
    if (!map) continue
    for (const [id, rec] of Object.entries(map)) {
      if (isValidRecord(rec) && wins(rec, out[id])) out[id] = rec
    }
  }
  return out
}

export function isValidRecord(rec: unknown): rec is SyncRecord {
  const r = rec as SyncRecord
  return !!r && typeof r === 'object' && typeof r.u === 'number' && Number.isFinite(r.u) && typeof r.by === 'string' && typeof r.h === 'string'
}

/** Drop tombstones older than the TTL (every device has long since seen them). */
export function pruneTombstones(map: RecordMap, now: number, ttl = TOMBSTONE_TTL_MS): RecordMap {
  const out: RecordMap = {}
  for (const [id, rec] of Object.entries(map)) {
    if (rec.d && now - rec.u > ttl) continue
    out[id] = rec
  }
  return out
}

/**
 * Turn a merged map back into an ordered item list: items keep their current local order,
 * and items new to this device are appended in the order they were created.
 */
export function materialize<T extends { id: string }>(map: RecordMap, currentOrder: { id: string }[]): T[] {
  const live = new Map<string, T>()
  for (const [id, rec] of Object.entries(map)) if (!rec.d && rec.v) live.set(id, rec.v as T)
  const out: T[] = []
  for (const item of currentOrder) {
    const v = live.get(item.id)
    if (v) {
      out.push(v)
      live.delete(item.id)
    }
  }
  const rest = [...live.entries()].sort((a, b) => map[a[0]].u - map[b[0]].u).map(([, v]) => v)
  return out.concat(rest)
}

export interface SaveGuardEntry {
  /** When sync applied this change locally. */
  at: number
  /** Hash of the local item before sync changed it ('' if it did not exist). */
  prevHash: string
  /** The synced value, or undefined when sync deleted the item. */
  value?: { id: string }
}

/**
 * Protect remote changes from a stale whole-list save: if the UI loaded the list before
 * sync applied a change and then saves its old copy, keep the synced version instead of
 * silently overwriting (or deleting) it.
 */
export function guardStaleSave<T extends { id: string }>(next: T[], applied: Record<string, SaveGuardEntry>, readAt: number): T[] {
  const relevant = Object.entries(applied).filter(([, e]) => e.at > readAt)
  if (relevant.length === 0) return next
  const byId = new Map(next.map((item, i) => [item.id, i]))
  const out = [...next]
  const drop = new Set<string>()
  for (const [id, entry] of relevant) {
    const idx = byId.get(id)
    if (entry.value) {
      if (idx === undefined) out.push(entry.value as T) // UI never saw the new item
      else if (hashValue(out[idx]) === entry.prevHash) out[idx] = entry.value as T // UI saved the pre-sync copy
    } else if (idx !== undefined && hashValue(out[idx]) === entry.prevHash) {
      drop.add(id) // sync deleted it; UI saved its old copy
    }
  }
  return drop.size ? out.filter((item) => !drop.has(item.id)) : out
}
