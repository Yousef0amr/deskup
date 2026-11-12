const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  module._compile(result.outputText, filename)
}
const B = require('../src/shared/board.ts')
const { validateBackup } = require('../src/shared/backup.ts')

const board = B.createBoard('Product', 'dsk', 'b1', 1)
const col = (name) => board.columns.find((c) => c.name === name).id
const card = (id, number, columnId, order, patch = {}) => ({
  id, boardId: 'b1', number, columnId, order, title: `Card ${id}`, description: '', type: 'feature', priority: 'medium',
  labels: [], links: [], checklist: [], createdAt: 1, updatedAt: 1, ...patch
})

test('createBoard normalizes the key and has a done column', () => {
  assert.equal(board.key, 'DSK')
  assert.equal(board.columns.at(-1).done, true)
  assert.equal(B.normalizeKey('my-proj 2!'), 'MYPROJ')
})

test('branch names and commit messages follow git conventions', () => {
  const c = { number: 12, title: 'Add OAuth login (Google & GitHub)', type: 'feature' }
  assert.equal(B.branchName(board, c), 'feat/DSK-12-add-oauth-login-google-github')
  assert.equal(B.commitMessage(board, c), 'feat(DSK-12): add OAuth login (Google & GitHub)')
  assert.equal(B.branchName(board, { number: 3, title: 'Crash on émoji ✨ paste', type: 'bug' }), 'fix/DSK-3-crash-on-emoji-paste')
  assert.equal(B.branchName(board, { number: 4, title: '!!!', type: 'spike' }), 'spike/DSK-4')
})

test('moving across columns reorders both columns and tracks completion', () => {
  const todo = col('To do'), done = col('Done')
  const cards = [card('a', 1, todo, 0), card('b', 2, todo, 1), card('c', 3, done, 0, { completedAt: 5 })]
  const moved = B.moveCard(cards, board, 'a', done, 0, 100)
  assert.deepEqual(B.columnCards(moved, todo).map((c) => [c.id, c.order]), [['b', 0]])
  assert.deepEqual(B.columnCards(moved, done).map((c) => [c.id, c.order]), [['a', 0], ['c', 1]])
  assert.equal(moved.find((c) => c.id === 'a').completedAt, 100)
  const reopened = B.moveCard(moved, board, 'a', todo, 5, 200)
  assert.equal(reopened.find((c) => c.id === 'a').completedAt, undefined)
  assert.deepEqual(B.columnCards(reopened, todo).map((c) => c.id), ['b', 'a'])
})

test('reordering inside a column keeps other columns untouched', () => {
  const todo = col('To do')
  const cards = [card('a', 1, todo, 0), card('b', 2, todo, 1), card('c', 3, todo, 2), card('x', 4, col('Done'), 0)]
  const moved = B.moveCard(cards, board, 'c', todo, 0)
  assert.deepEqual(B.columnCards(moved, todo).map((c) => c.id), ['c', 'a', 'b'])
  assert.equal(moved.find((c) => c.id === 'x'), cards[3])
})

test('filters match key, text, type, priority and label', () => {
  const todo = col('To do')
  const cards = [
    card('a', 7, todo, 0, { title: 'Login page', type: 'bug', labels: ['auth'] }),
    card('b', 8, todo, 1, { title: 'Docs', type: 'docs', priority: 'urgent' })
  ]
  assert.deepEqual(B.filterCards(cards, board, { query: 'dsk-7' }).map((c) => c.id), ['a'])
  assert.deepEqual(B.filterCards(cards, board, { types: ['docs'] }).map((c) => c.id), ['b'])
  assert.deepEqual(B.filterCards(cards, board, { priorities: ['urgent'] }).map((c) => c.id), ['b'])
  assert.deepEqual(B.filterCards(cards, board, { label: 'auth' }).map((c) => c.id), ['a'])
})

test('column stats flag WIP limits and sum story points', () => {
  const progress = board.columns.find((c) => c.name === 'In progress')
  const cards = [1, 2, 3, 4].map((n) => card(`c${n}`, n, progress.id, n, { estimate: n }))
  assert.deepEqual(B.columnStats(cards, progress), { count: 4, points: 10, overLimit: true })
})

test('validation rejects unsafe links, orphan cards and bad enums; repairs numbering', () => {
  const ok = { boards: [board], cards: [card('a', 9, col('To do'), 0)] }
  const parsed = B.validateBoardData(ok)
  assert.equal(parsed.boards[0].nextNumber, 10)
  const bad = (patch) => ({ boards: [board], cards: [card('a', 1, col('To do'), 0, patch)] })
  assert.throws(() => B.validateBoardData(bad({ links: [{ id: 'l', label: '', url: 'javascript:alert(1)' }] })), /http/)
  assert.throws(() => B.validateBoardData(bad({ columnId: 'nope' })), /missing board or column/)
  assert.throws(() => B.validateBoardData(bad({ type: 'epic' })), /type/)
  assert.throws(() => B.validateBoardData(bad({ dueDate: '2026-02-30' })), /due date/)
})

test('board data round-trips through backups', () => {
  const data = { boards: [board], cards: [card('a', 1, col('Review'), 0, { labels: ['api'], estimate: 3 })] }
  assert.deepEqual(validateBackup({ version: 6, boardData: data }).boardData, data)
})

test('quick-add syntax extracts type, labels, priority and estimate', () => {
  assert.deepEqual(B.parseQuickAdd('bug: crash on save #auth #API !high ~3'), { title: 'crash on save', type: 'bug', priority: 'high', labels: ['auth', 'api'], estimate: 3 })
  assert.deepEqual(B.parseQuickAdd('feat(ui): dark mode !p0'), { title: 'dark mode', type: 'feature', priority: 'urgent', labels: [], estimate: undefined })
  assert.deepEqual(B.parseQuickAdd('Ratio: keep as title #c# !nope'), { title: 'Ratio: keep as title #c# !nope', type: undefined, priority: undefined, labels: [], estimate: undefined })
})

test('markdown export groups by column and marks done cards', () => {
  const md = B.boardToMarkdown(board, [card('a', 1, col('Done'), 0, { title: 'Ship it', estimate: 2 })])
  assert.match(md, /## Done \(1\)/)
  assert.match(md, /- \[x\] \*\*DSK-1\*\* Ship it _\(feature · 2 pts\)_/)
})
