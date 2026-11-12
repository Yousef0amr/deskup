const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function loadAppScanner(readdir) {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/main/apps.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      if (name === 'fs') return { promises: { readdir } }
      if (name === 'path') return path.win32
      throw new Error(`Unexpected dependency: ${name}`)
    },
    process: { platform: 'win32', env: { APPDATA: 'C:\\User', ALLUSERSPROFILE: 'C:\\Shared', ProgramData: 'C:\\Shared' } }
  })
  return exports.getInstalledApps
}

test('app discovery yields during IO, shares concurrent scans and caches results', async () => {
  let release
  let reads = 0
  const blocked = new Promise(resolve => { release = resolve })
  const scan = loadAppScanner(async () => {
    reads++
    await blocked
    return [{ name: 'Editor.lnk', isDirectory: () => false }]
  })
  const first = scan()
  const second = scan()
  assert.equal(reads, 1)
  let finished = false
  first.then(() => { finished = true })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(finished, false)
  release()
  const [a, b] = await Promise.all([first, second])
  assert.equal(a, b)
  assert.equal(reads, 2, 'duplicate shared Start Menu path is scanned once')
  assert.equal(a.filter(app => app.name === 'Editor').length, 1)
  assert.equal(await scan(), a)
  assert.equal(reads, 2)
})

test('unreadable application directories retain built-in applications', async () => {
  const scan = loadAppScanner(async () => { throw new Error('Access denied') })
  const apps = await scan()
  assert.equal(apps.length, 7)
  assert.ok(apps.some(app => app.path === 'notepad.exe'))
})
