const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  module._compile(result.outputText, filename)
}
const W = require('../src/shared/whiteboard.ts')
const { validateBackup } = require('../src/shared/backup.ts')

const board = (elements) => ({ id: 'w1', name: 'Arch', elements, createdAt: 1, updatedAt: 2 })

test('bounds cover every element kind', () => {
  assert.deepEqual(W.elementBounds({ id: 'p', type: 'path', color: '#000', width: 2, points: [[5, 9], [1, 3], [8, 4]] }), { x: 1, y: 3, w: 7, h: 6 })
  assert.deepEqual(W.elementBounds({ id: 'a', type: 'arrow', color: '#000', width: 2, x1: 10, y1: 0, x2: 0, y2: 5 }), { x: 0, y: 0, w: 10, h: 5 })
  assert.deepEqual(W.unionBounds([{ x: 0, y: 0, w: 1, h: 1 }, { x: 5, y: -2, w: 1, h: 1 }]), { x: 0, y: -2, w: 6, h: 3 })
  assert.equal(W.intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 11, y: 0, w: 2, h: 2 }), false)
})

test('translate moves every coordinate', () => {
  assert.deepEqual(W.translateElement({ id: 'l', type: 'line', color: '#000', width: 1, x1: 0, y1: 0, x2: 1, y2: 1 }, 2, 3), { id: 'l', type: 'line', color: '#000', width: 1, x1: 2, y1: 3, x2: 3, y2: 4 })
  assert.deepEqual(W.translateElement({ id: 'p', type: 'path', color: '#000', width: 1, points: [[1, 1]] }, -1, 1).points, [[0, 2]])
})

test('simplify keeps endpoints and drops jitter', () => {
  const pts = [[0, 0], [0.2, 0], [0.4, 0], [3, 0], [3.1, 0], [10, 0]]
  assert.deepEqual(W.simplifyPoints(pts), [[0, 0], [3, 0], [10, 0]])
  assert.match(W.pathData([[0, 0], [5, 5], [10, 0]]), /^M0 0 Q5 5 7.5 2.5 L10 0$/)
})

test('validation rejects bad colors, unknown types and NaN; dedupes element IDs', () => {
  const rect = { id: 'r', type: 'rect', color: '#3753df', x: 0, y: 0, w: 10, h: 10, width: 2, fill: false }
  assert.equal(W.validateWhiteboards([board([rect, rect])])[0].elements.length, 1)
  assert.throws(() => W.validateWhiteboards([board([{ ...rect, color: 'red; background:url(x)' }])]), /color/)
  assert.throws(() => W.validateWhiteboards([board([{ ...rect, type: 'script' }])]), /Unknown/)
  assert.throws(() => W.validateWhiteboards([board([{ ...rect, x: NaN }])]), /x/)
  assert.throws(() => W.validateWhiteboards([board([]), board([])]), /duplicate/)
})

test('real timestamps are accepted (regression: they hit the coordinate limit)', () => {
  const now = Date.now()
  const [b] = W.validateWhiteboards([W.createWhiteboard('w', 'Now', now)])
  assert.equal(b.createdAt, now)
})

test('whiteboards round-trip through backups', () => {
  const data = [board([{ id: 's', type: 'sticky', color: '#fef08a', x: 1, y: 2, w: 160, h: 120, text: 'API gateway' }])]
  assert.deepEqual(validateBackup({ version: 6, whiteboards: data }).whiteboards, data)
})
