const { app, BrowserWindow, dialog } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'deskup-smoke-'))
const artifacts = path.resolve(__dirname, '../artifacts')
fs.mkdirSync(artifacts, { recursive: true })
app.setPath('userData', testDirectory)
fs.writeFileSync(path.join(testDirectory, 'deskup-config.json'), JSON.stringify({
  notes: 'Existing note', settings: {
    theme: 'dark', hotkey: 'Control+Alt+Shift+F11',
    clipboard: { enabled: false, hotkey: 'Control+Alt+Shift+F12' }
  }
}))
require('../out/main/index.js')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function smoke() {
  console.log("Waiting for Electron ready")
  await app.whenReady()
  console.log("Electron ready")
  let mainWindow
  for (let attempt = 0; attempt < 150; attempt++) {
    mainWindow = BrowserWindow.getAllWindows().find(window => window.getBounds().width > 500)
    if (mainWindow && !mainWindow.webContents.isLoading()) break
    await delay(100)
  }
  assert.ok(mainWindow, 'main window exists')
  console.log('Window URL:', mainWindow.webContents.getURL(), 'loading:', mainWindow.webContents.isLoading())
  mainWindow.webContents.on('console-message', (_, level, message) => console.log('Renderer:', level, message))
  const run = fn => mainWindow.webContents.executeJavaScript(`(${fn.toString()})()`)
  const clickTab = name => mainWindow.webContents.executeJavaScript(`Array.from(document.querySelectorAll('nav button')).find(button => button.textContent === ${JSON.stringify(name)}).click()`)
  await delay(500)
  assert.equal(await run(() => document.body.innerText.includes('Quick Scratchpad')), true)

  console.log('Dashboard rendered')
  const preserved = await run(async () => {
    const settings = await window.deskup.settings.update({ theme: 'light' })
    return settings.clipboard
  })
  assert.equal(preserved.enabled, false, 'settings update preserves clipboard settings')
  await delay(250)
  assert.equal(await run(() => document.documentElement.classList.contains('dark')), false)
  const lightSurface = await run(() => getComputedStyle(document.querySelector('main')).backgroundImage)
  fs.writeFileSync(path.join(artifacts, 'dashboard-light.png'), (await mainWindow.webContents.capturePage()).toPNG())
  await run(() => window.deskup.settings.update({ theme: 'dark' }))
  await delay(250)
  assert.equal(await run(() => document.documentElement.classList.contains('dark')), true)
  const darkSurface = await run(() => getComputedStyle(document.querySelector('main')).backgroundImage)
  assert.notEqual(lightSurface, darkSurface, 'theme changes actual rendered colors')
  fs.writeFileSync(path.join(artifacts, 'dashboard-dark.png'), (await mainWindow.webContents.capturePage()).toPNG())
  console.log('Themes verified')
  const popup = BrowserWindow.getAllWindows().find(window => window !== mainWindow)
  popup.showInactive()
  await delay(200)
  assert.equal(await popup.webContents.executeJavaScript("document.documentElement.classList.contains('dark')"), true)

  popup.hide()
  console.log('Popup verified')
  await run(() => window.deskup.focus.action('start'))
  await delay(1200)
  const paused = await run(() => window.deskup.focus.action('pause'))
  assert.ok(paused.remainingMs < 1500000 && paused.remainingMs > 1490000)
  await clickTab('Workspaces')
  await clickTab('Dashboard')
  await delay(100)
  assert.deepEqual(await run(() => window.deskup.focus.get()), paused, 'navigation preserves paused timer')
  await run(() => window.deskup.focus.action('start'))
  await clickTab('Settings')
  await delay(1100)
  const running = await run(() => window.deskup.focus.get())
  assert.ok(running.endsAt, 'timer remains active away from dashboard')
  await run(() => window.deskup.focus.action('pause'))
  await clickTab('Dashboard')
  await delay(150)
  await run(() => {
    const textarea = document.querySelector('textarea')
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'A quickly cleared note')
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await delay(50)
  await run(() => { window.confirm = () => true; document.querySelector('[title="Clear notes"]').click() })
  await delay(600)
  assert.equal(await run(() => window.deskup.notes.get()), '', 'clearing notes cannot be undone by stale save')

  console.log('Timer and notes verified')
  const backupPath = path.join(testDirectory, 'invalid.json')
  fs.writeFileSync(backupPath, JSON.stringify({ version: 5, notes: 'must not be written', todos: [null] }))
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [backupPath] })
  const rejected = await run(async () => {
    try { await window.deskup.data.importAll(); return false } catch { return true }
  })
  assert.equal(rejected, true)
  assert.equal(await run(() => window.deskup.notes.get()), '', 'invalid import makes no partial writes')
  const report = { passed: true, testDirectory, checks: ['settings preservation', 'light/dark rendering', 'popup theme broadcast', 'pause/resume', 'timer across navigation', 'scratchpad clear race', 'atomic validation before import'], screenshots: ['dashboard-light.png', 'dashboard-dark.png'] }
  fs.writeFileSync(path.join(artifacts, 'smoke-results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}
smoke().then(() => app.quit()).catch(error => {
  console.error(error)
  fs.writeFileSync(path.join(artifacts, 'smoke-results.json'), JSON.stringify({ passed: false, error: String(error) }))
  app.exit(1)
})
setTimeout(() => { console.error('Smoke test timed out'); app.exit(1) }, 120000).unref()
