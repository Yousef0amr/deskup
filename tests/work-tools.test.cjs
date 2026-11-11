const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  module._compile(result.outputText, filename)
}
const { transformText } = require('../src/renderer/src/utils/workTools.ts')
const { validateTodos, filterTodos, moveTodo, isDateKey } = require('../src/shared/todos.ts')
const { validateBackup } = require('../src/shared/backup.ts')
const task = (id, patch = {}) => ({ id, text: id, done: false, order: 0, ...patch })

test('task priorities and dates survive validation and backup restore', () => {
  const todos = [task('report', { priority: 'high', dueDate: '2026-11-10' })]
  assert.deepEqual(validateTodos(todos), todos)
  assert.deepEqual(validateBackup({ version: 5, todos }).todos, todos)
  assert.deepEqual(validateTodos([task('legacy')]), [task('legacy')])
})
test('task dates and priorities reject invalid values', () => {
  assert.equal(isDateKey('2024-02-29'), true)
  for (const date of ['2026-02-29', '2026-13-01', '2026-11-31', 'tomorrow']) {
    assert.equal(isDateKey(date), false)
    assert.throws(() => validateTodos([task('x', { dueDate: date })]), /due date/)
  }
  assert.throws(() => validateTodos([task('x', { priority: 'urgent' })]), /priority/)
})
test('Today includes overdue, Upcoming excludes completed and undated tasks', () => {
  const todos = [task('late', { dueDate: '2026-11-09' }), task('today', { dueDate: '2026-11-10' }), task('later', { dueDate: '2026-11-11' }), task('done', { done: true, dueDate: '2026-11-10' }), task('undated')]
  assert.deepEqual(filterTodos(todos, 'today', '2026-11-10').map(t => t.id), ['late', 'today'])
  assert.deepEqual(filterTodos(todos, 'upcoming', '2026-11-10').map(t => t.id), ['later'])
})
test('filtered task moves keep hidden tasks in place', () => {
  const todos = [task('first'), task('hidden', { done: true }), task('last')]
  const moved = moveTodo(todos, 'last', 'first')
  assert.deepEqual(moved.map(t => t.id), ['last', 'hidden', 'first'])
  assert.deepEqual(moved.map(t => t.order), [0, 1, 2])
  assert.equal(todos[0].id, 'first')
})
test('text operations handle Windows newlines and case-sensitive deduplication', () => {
  assert.equal(transformText('text', 'trim', ' a \r\n\r\n b '), 'a\nb')
  assert.equal(transformText('text', 'unique', 'a\r\na\r\nA'), 'a\nA')
  assert.equal(transformText('text', 'sort', 'b\na'), 'a\nb')
})
test('JSON handles scalars and malformed input', () => {
  assert.equal(transformText('json', 'compact', '{ "a": 1 }'), '{"a":1}')
  assert.equal(transformText('json', 'format', 'null'), 'null')
  assert.throws(() => transformText('json', 'format', '{bad}'), /Invalid JSON/)
})
test('Base64 supports Unicode and rejects binary or malformed input', () => {
  const input = 'مرحبا 👋 café'
  assert.equal(transformText('base64', 'decode', transformText('base64', 'encode', input)), input)
  assert.throws(() => transformText('base64', 'decode', '%%%'), /valid Base64/)
  assert.throws(() => transformText('base64', 'decode', '/w=='), /UTF-8/)
})
test('URL components round trip and invalid escapes fail', () => {
  const input = 'hello world & مرحبا'
  assert.equal(transformText('url', 'decode', transformText('url', 'encode', input)), input)
  assert.throws(() => transformText('url', 'decode', '%ZZ'), /invalid/)
})
test('timestamps handle epoch, explicit units and time zones', () => {
  assert.match(transformText('timestamp', 'seconds', '0'), /1970-01-01T00:00:00.000Z/)
  assert.match(transformText('timestamp', 'milliseconds', '1000'), /Unix seconds: 1\n/)
  assert.match(transformText('timestamp', 'iso', '2026-11-10T11:00:00+02:00'), /2026-11-10T09:00:00.000Z/)
  assert.throws(() => transformText('timestamp', 'iso', '2026-11-10'), /time zone/)
  assert.throws(() => transformText('timestamp', 'seconds', 'Infinity'), /numeric/)
})
test('empty and excessive tool input return actionable errors', () => {
  assert.throws(() => transformText('text', 'trim', ' '), /Enter/)
  assert.throws(() => transformText('text', 'trim', 'x'.repeat(500001)), /500,000/)
})
