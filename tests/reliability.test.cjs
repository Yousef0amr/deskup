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
const { mergeSettings, defaultSettings } = require('../src/shared/settings.ts')
const { validateBackup } = require('../src/shared/backup.ts')
const { changeFocus, advanceFocus } = require('../src/shared/focus.ts')
const durations = { workMin: 25, breakMin: 5 }
const fresh = () => ({ mode: 'work', remainingMs: 1500000, endsAt: null, sessionsCompleted: 0 })

test('legacy settings receive nested defaults', () => {
  const settings = mergeSettings({ pomodoro: { workMin: 40 } })
  assert.equal(settings.pomodoro.workMin, 40)
  assert.equal(settings.pomodoro.breakMin, 5)
  assert.equal(settings.clipboard.maxItems, 100)
  assert.equal(defaultSettings.pomodoro.workMin, 25)
})
test('pause preserves remaining time and resume uses that remainder', () => {
  const running = changeFocus(fresh(), 'start', durations, 1000)
  const paused = changeFocus(running, 'pause', durations, 11000)
  assert.equal(paused.remainingMs, 1490000)
  assert.equal(paused.endsAt, null)
  const resumed = changeFocus(paused, 'start', durations, 20000)
  assert.equal(resumed.endsAt, 1510000)
})
test('double start does not extend an active session', () => {
  const running = changeFocus(fresh(), 'start', durations, 1000)
  assert.deepEqual(changeFocus(running, 'start', durations, 9000), running)
})
test('restart and sleep complete an overdue session only once', () => {
  const persisted = JSON.parse(JSON.stringify(changeFocus(fresh(), 'start', durations, 1000)))
  const completed = advanceFocus(persisted, durations, 90000000)
  assert.deepEqual(completed, { mode: 'break', remainingMs: 300000, endsAt: null, sessionsCompleted: 1 })
  assert.deepEqual(advanceFocus(completed, durations, 99000000), completed)
})
test('deadline boundary and break completion are correct', () => {
  const running = { mode: 'break', remainingMs: 300000, endsAt: 5000, sessionsCompleted: 3 }
  assert.equal(advanceFocus(running, durations, 4999), running)
  assert.deepEqual(advanceFocus(running, durations, 5000), { mode: 'work', remainingMs: 1500000, endsAt: null, sessionsCompleted: 3 })
})
test('reset applies current preferences and skip never counts a completed session', () => {
  assert.equal(changeFocus(fresh(), 'reset', { ...durations, workMin: 40 }, 0).remainingMs, 2400000)
  assert.deepEqual(changeFocus(fresh(), 'skip', durations, 0), { mode: 'break', remainingMs: 300000, endsAt: null, sessionsCompleted: 0 })
})
test('valid old backups migrate nested settings and leave absent sections absent', () => {
  const restored = validateBackup({ version: 1, notes: 'old note', settings: { pomodoro: { workMin: 40 } } })
  assert.equal(restored.notes, 'old note')
  assert.equal(restored.settings.pomodoro.breakMin, 5)
  assert.equal('profiles' in restored, false)
})
test('malformed later sections reject the complete backup', () => {
  assert.throws(() => validateBackup({ version: 5, notes: 'valid', todos: [{ id: '1', text: 'bad', done: 'yes', order: 0 }] }), /done/)
})
test('duplicate IDs, nonfinite numbers and unsafe URLs are rejected', () => {
  const todo = { id: '1', text: 'task', done: false, order: 0 }
  assert.throws(() => validateBackup({ version: 5, todos: [todo, todo] }), /duplicate/)
  assert.throws(() => validateBackup({ version: 5, todos: [{ ...todo, order: Infinity }] }), /order/)
  assert.throws(() => validateBackup({ version: 5, profiles: [{ id: '1', name: 'test', icon: 'x', color: '#fff', launchDelayMs: 0, items: [{ id: '2', type: 'url', target: 'javascript:alert(1)' }] }] }), /URL/)
})
test('invalid versions, empty backups and malformed nested preferences fail', () => {
  for (const backup of [null, [], { version: 6, notes: '' }, { version: 5 }, { version: 5, settings: { clipboard: null } }, { version: 5, settings: { theme: 'invalid' } }, { version: 5, settings: { pomodoro: { workMin: 0 } } }]) {
    assert.throws(() => validateBackup(backup))
  }
})
