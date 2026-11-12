// Deskup is often started from an IDE terminal (VS Code, Antigravity, Cursor…). Those
// IDEs are Electron apps and leak private variables into child processes. If we pass
// them on, other Electron apps we launch (Slack, the IDE itself, Discord…) try to attach
// to the IDE's crash reporter / IPC socket or run as plain Node, and never open a window.
const BLOCKED_PREFIXES = ['ELECTRON_', 'VSCODE_', 'CHROME_', 'npm_', 'NODE_']
const BLOCKED_EXACT = new Set(['ORIGINAL_XDG_CURRENT_DESKTOP', 'GOOGLE_API_KEY', 'INIT_CWD'])

/** A copy of `env` without IDE/Electron/npm variables, safe to hand to launched apps. */
export function cleanLaunchEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(env)) {
    const upper = key.toUpperCase()
    if (BLOCKED_EXACT.has(upper)) continue
    if (BLOCKED_PREFIXES.some(prefix => upper.startsWith(prefix.toUpperCase()))) continue
    clean[key] = value
  }
  return clean
}

/**
 * Arguments for `cmd.exe` that open `target` exactly like a double-click in Explorer
 * (works for .exe, .lnk, .bat and bare commands such as `notepad.exe`).
 * Returns null for targets cmd cannot quote safely.
 */
export function windowsStartArgs(target: string): string[] | null {
  // Quotes can't appear in Windows paths; % and newlines would be expanded/split by cmd.
  if (!target || /["%\r\n]/.test(target)) return null
  return ['/d', '/s', '/c', `start "" "${target}"`]
}
