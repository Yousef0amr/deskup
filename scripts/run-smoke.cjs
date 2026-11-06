const { spawnSync } = require('node:child_process')
const path = require('node:path')
const environment = { ...process.env }
delete environment.ELECTRON_RUN_AS_NODE
const child = spawnSync(require('electron'), [path.join(__dirname, 'smoke-test.cjs')], {
  env: environment, stdio: 'inherit', windowsHide: true
})
if (child.error) throw child.error
process.exit(child.status ?? 1)
