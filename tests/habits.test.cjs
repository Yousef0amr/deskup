const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  module._compile(result.outputText, filename)
}
const { validateHabits, toggleHabitDay, currentStreak, bestStreak, lastDays } = require('../src/shared/habits.ts')
const { validateBackup } = require('../src/shared/backup.ts')
const habit = (id, completions = [], patch = {}) => ({ id, name: id, icon: '✅', createdAt: 1, completions, ...patch })

test('habits validate, dedupe and sort completion dates', () => {
  const [h] = validateHabits([habit('read', ['2026-11-10', '2026-11-09', '2026-11-10'], { name: '  Read  ' })])
  assert.deepEqual(h.completions, ['2026-11-09', '2026-11-10'])
  assert.equal(h.name, 'Read')
})

test('invalid habits are rejected', () => {
  assert.throws(() => validateHabits([habit('a'), habit('a')]), /duplicate/)
  assert.throws(() => validateHabits([habit('a', [], { name: ' ' })]), /name/)
  assert.throws(() => validateHabits([habit('a', ['2026-02-30'])]), /completion/)
  assert.throws(() => validateHabits(Array.from({ length: 31 }, (_, i) => habit(String(i)))), /At most/)
})

test('toggling a day adds and removes it', () => {
  const on = toggleHabitDay(habit('a', ['2026-11-12']), '2026-11-10')
  assert.deepEqual(on.completions, ['2026-11-10', '2026-11-12'])
  assert.deepEqual(toggleHabitDay(on, '2026-11-10').completions, ['2026-11-12'])
})

test('current streak counts back from today, or yesterday when today is still open', () => {
  const h = habit('a', ['2026-11-08', '2026-11-09', '2026-11-10'])
  assert.equal(currentStreak(h, '2026-11-10'), 3)
  assert.equal(currentStreak(h, '2026-11-11'), 3)
  assert.equal(currentStreak(h, '2026-11-12'), 0)
})

test('streaks cross month and year boundaries', () => {
  const h = habit('a', ['2025-12-30', '2025-12-31', '2026-01-01'])
  assert.equal(currentStreak(h, '2026-01-01'), 3)
  assert.equal(bestStreak(habit('b', ['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-05'])), 3)
})

test('lastDays returns oldest-first keys ending today', () => {
  assert.deepEqual(lastDays(3, '2026-03-01'), ['2026-02-27', '2026-02-28', '2026-03-01'])
})

test('backups round-trip habits and the daily focus goal', () => {
  const habits = [habit('water', ['2026-11-10'])]
  const restored = validateBackup({ version: 6, habits, settings: { dailyFocusGoalMin: 90 } })
  assert.deepEqual(restored.habits, habits)
  assert.equal(restored.settings.dailyFocusGoalMin, 90)
  assert.equal(validateBackup({ version: 5, notes: '' }).settings, undefined)
  assert.throws(() => validateBackup({ version: 6, settings: { dailyFocusGoalMin: 0 } }), /range/)
  assert.throws(() => validateBackup({ version: 6, habits: [habit('x', ['nope'])] }), /completion/)
})
