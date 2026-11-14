const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })
  module._compile(compiled.outputText, filename)
}
const {
  hashValue,
  recordLocalChanges,
  countLocalChanges,
  mergeMaps,
  materialize,
  pruneTombstones,
  guardStaleSave,
  TOMBSTONE_TTL_MS
} = require('../src/shared/syncMerge.ts')

const clock = (start) => {
  let t = start
  return () => ++t
}

test('hash ignores key order but sees value changes', () => {
  assert.equal(hashValue({ a: 1, b: [1, 2] }), hashValue({ b: [1, 2], a: 1 }))
  assert.notEqual(hashValue({ a: 1 }), hashValue({ a: 2 }))
})

test('local adds, edits and deletes are recorded; unchanged items are not', () => {
  const now = clock(100)
  let { map, changed } = recordLocalChanges({}, [{ id: 'a', t: 1 }, { id: 'b', t: 1 }], 'dev1', now)
  assert.equal(changed, 2)
  const before = map.a.u
  ;({ map, changed } = recordLocalChanges(map, [{ id: 'a', t: 1 }, { id: 'b', t: 2 }], 'dev1', now))
  assert.equal(changed, 1)
  assert.equal(map.a.u, before)
  ;({ map, changed } = recordLocalChanges(map, [{ id: 'b', t: 2 }], 'dev1', now))
  assert.equal(changed, 1)
  assert.equal(map.a.d, 1)
  assert.equal(countLocalChanges(map, [{ id: 'b', t: 2 }]), 0)
  assert.equal(countLocalChanges(map, [{ id: 'b', t: 3 }, { id: 'c' }]), 2)
})

test('two devices merge: newest edit wins and both additions survive', () => {
  const base = recordLocalChanges({}, [{ id: 'x', title: 'old' }], 'A', clock(10)).map
  const a = recordLocalChanges(base, [{ id: 'x', title: 'from A' }, { id: 'a1' }], 'A', clock(20)).map
  const b = recordLocalChanges(base, [{ id: 'x', title: 'from B' }, { id: 'b1' }], 'B', clock(30)).map
  const merged = mergeMaps(a, b)
  assert.equal(merged.x.v.title, 'from B')
  assert.deepEqual(Object.keys(merged).sort(), ['a1', 'b1', 'x'])
  // Order of merge inputs does not matter.
  assert.deepEqual(mergeMaps(b, a), merged)
})

test('a deletion is not undone by a device holding the old copy', () => {
  const base = recordLocalChanges({}, [{ id: 'x' }], 'A', clock(10)).map
  const deletedOnA = recordLocalChanges(base, [], 'A', clock(20)).map
  const merged = mergeMaps(base, deletedOnA)
  assert.equal(merged.x.d, 1)
  assert.deepEqual(materialize(merged, [{ id: 'x' }]), [])
})

test('materialize keeps local order and appends new items', () => {
  const now = clock(0)
  const map = recordLocalChanges({}, [{ id: 'b' }, { id: 'a' }, { id: 'c' }], 'A', now).map
  const out = materialize(map, [{ id: 'c' }, { id: 'a' }])
  assert.deepEqual(out.map((i) => i.id), ['c', 'a', 'b'])
})

test('old tombstones are pruned, recent ones kept', () => {
  const now = 10 * TOMBSTONE_TTL_MS
  const map = { old: { u: 1, d: 1, h: '', by: 'A' }, recent: { u: now - 1000, d: 1, h: '', by: 'A' }, live: { u: 1, v: { id: 'live' }, h: 'x', by: 'A' } }
  assert.deepEqual(Object.keys(pruneTombstones(map, now)).sort(), ['live', 'recent'])
})

test('stale whole-list save keeps items sync added or changed after the UI loaded', () => {
  const oldX = { id: 'x', title: 'old' }
  const applied = {
    x: { at: 50, prevHash: hashValue(oldX), value: { id: 'x', title: 'synced' } },
    n: { at: 50, prevHash: '', value: { id: 'n', title: 'new from other device' } }
  }
  // UI loaded at t=40 (before sync) and saves its stale copy plus its own new item.
  const saved = guardStaleSave([oldX, { id: 'mine' }], applied, 40)
  assert.deepEqual(saved.map((i) => i.id).sort(), ['mine', 'n', 'x'])
  assert.equal(saved.find((i) => i.id === 'x').title, 'synced')
  // A UI that loaded after the sync is trusted as-is (its deletions are real).
  assert.deepEqual(guardStaleSave([{ id: 'mine' }], applied, 60), [{ id: 'mine' }])
})

test('stale save does not resurrect an item that sync deleted, but keeps user edits to it', () => {
  const oldX = { id: 'x', title: 'old' }
  const applied = { x: { at: 50, prevHash: hashValue(oldX) } }
  assert.deepEqual(guardStaleSave([oldX], applied, 40), [])
  const edited = { id: 'x', title: 'edited locally' }
  assert.deepEqual(guardStaleSave([edited], applied, 40), [edited])
})

const { createEncryption, unlockEncryption, seal, open, verifyKey } = require('../src/main/syncCrypto.ts')

test('passphrase encryption round-trips and rejects a wrong passphrase', async () => {
  const { info, key } = await createEncryption('correct horse battery staple')
  const sealed = seal(key, JSON.stringify({ hello: 'team' }))
  assert.ok(!sealed.data.includes('team'))
  const again = await unlockEncryption(info, 'correct horse battery staple')
  assert.deepEqual(JSON.parse(open(again, sealed)), { hello: 'team' })
  await assert.rejects(unlockEncryption(info, 'wrong passphrase'), /does not match/)
})

test('tampered sealed data is rejected', async () => {
  const { info, key } = await createEncryption('pw')
  assert.ok(verifyKey(info, key))
  const sealed = seal(key, 'secret text')
  const bytes = Buffer.from(sealed.data, 'base64')
  bytes[0] ^= 1
  assert.throws(() => open(key, { ...sealed, data: bytes.toString('base64') }))
})
