const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  module._compile(result.outputText, filename)
}
const { cleanLaunchEnv, windowsStartArgs } = require('../src/main/launchEnv.ts')
const { AUTOSTART_ARG, isStartupLaunch, getAutoLaunchProfiles } = require('../src/shared/profiles.ts')

test('launched apps do not inherit IDE / Electron / npm variables', () => {
  const env = cleanLaunchEnv({
    Path: String.raw`C:\Windows`, USERPROFILE: String.raw`C:\Users\me`, APPDATA: 'x',
    ELECTRON_RUN_AS_NODE: '1', VSCODE_IPC_HOOK: 'pipe', VSCODE_PID: '1', CHROME_CRASHPAD_PIPE_NAME: 'p',
    NODE_OPTIONS: '--inspect', npm_lifecycle_event: 'start', Npm_Config_Cache: 'c'
  })
  assert.deepEqual(Object.keys(env).sort(), ['APPDATA', 'Path', 'USERPROFILE'])
})

test('start arguments quote the target and reject unsafe characters', () => {
  const app = String.raw`C:\Program Files\App\app.exe`
  assert.deepEqual(windowsStartArgs(app), ['/d', '/s', '/c', `start "" "${app}"`])
  for (const bad of ['', 'a"b.exe', String.raw`%TEMP%\x.exe`, 'a\nb']) assert.equal(windowsStartArgs(bad), null)
})

test('startup launch detection checks autostart arg and login flag', () => {
  assert.equal(isStartupLaunch(['Deskup.exe']), false)
  assert.equal(isStartupLaunch(['Deskup.exe', AUTOSTART_ARG]), true)
  assert.equal(isStartupLaunch(['Deskup.exe'], true), true)
})

test('getAutoLaunchProfiles filters to enabled non-empty workspaces', () => {
  const item = { id: 'i1', type: 'url', target: 'https://example.com' }
  const profiles = [
    { id: '1', name: 'Work', icon: '💼', color: '#000', launchDelayMs: 300, autoLaunch: true, items: [item] },
    { id: '2', name: 'Empty', icon: '💼', color: '#000', launchDelayMs: 300, autoLaunch: true, items: [] },
    { id: '3', name: 'Manual', icon: '💼', color: '#000', launchDelayMs: 300, autoLaunch: false, items: [item] },
    { id: '4', name: 'Legacy', icon: '💼', color: '#000', launchDelayMs: 300, items: [item] }
  ]
  assert.deepEqual(getAutoLaunchProfiles(profiles).map((p) => p.id), ['1'])
})
