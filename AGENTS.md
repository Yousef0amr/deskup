# Working on Deskup

Guide for developers joining the project, and for the AI coding assistants they use
(Claude Code reads it through `CLAUDE.md`; Codex, Cursor, Copilot and others read `AGENTS.md`).
Keep it short and true: when you change how something works, update this file in the same PR.

## What Deskup is

A Windows-first Electron desktop app: workspace launcher, dashboard (tasks, habits, focus
timer, notes), developer board, whiteboard, clipboard history and a snipping tool.
Data is local-first: one `electron-store` JSON file in the user's app-data folder.

## Run it

```bash
npm install
npm run dev        # electron-vite dev server with hot reload
npm run typecheck  # tsc --noEmit — must pass before every PR
npm test           # node --test tests/*.test.cjs
npm run build      # production bundle into out/
npm run package    # Windows installer into dist/ (no upload)
npm run icons      # re-render app/tray icons from resources/icon.svg
```

If Electron starts as plain Node (`app` is undefined), your shell has `ELECTRON_RUN_AS_NODE=1`
set (VS Code-based terminals do this). `npm run dev`/`build` clear it themselves
(`electron.vite.config.ts`); for anything that runs `electron` directly (`npm run icons`,
test scripts), unset it first.

## Layout

| Path | What lives there |
| --- | --- |
| `src/main/` | Electron main process: windows, tray, global shortcuts, IPC handlers, OS integration. One module per feature (`snipper.ts`, `clipboard.ts`, `focus.ts`, `updater.ts`, …). `ipc.ts` holds the general handlers. |
| `src/preload/index.ts` | The only bridge to the UI: exposes `window.deskup` via `contextBridge`. |
| `src/shared/` | Code and types used by both sides. `types.ts` defines `DeskupAPI` (the shape of `window.deskup`). Pure logic (settings merge, backup validation, focus timer, board, todos) lives here so it can be unit-tested. |
| `src/renderer/src/` | React 18 UI. `pages/` = one per sidebar tab, `components/` = feature components, `components/ui/` = shared primitives (Button, Card, Switch, toast, skeletons). `App.tsx` routes by `#hash` for secondary windows (`#snip-overlay`, `#clipboard-popup`). |
| `tests/` | `node:test` suites that load `src/shared/*.ts` directly (transpiled on the fly). |
| `resources/` | Icons and files shipped with the app. `icon.svg` is the logo source. |

## How a feature is wired (follow this pattern)

1. **Main**: add `ipcMain.handle('feature:action', …)` in the feature's module (or `ipc.ts`).
   Validate every argument — the renderer is treated as untrusted.
2. **Types**: add the method to `DeskupAPI` in `src/shared/types.ts`.
3. **Preload**: expose it in `src/preload/index.ts` (`ipcRenderer.invoke` for requests,
   `ipcRenderer.on` + returned unsubscribe function for events pushed from main).
4. **UI**: call `window.deskup.feature.action()` from the renderer.
5. **Settings**: new settings need a default in `src/shared/settings.ts` *and* validation in
   the `settings:update` handler in `src/main/ipc.ts` (it rebuilds the object field by field).
6. **Persisted data**: new collections go in `AppStoreSchema` (`src/main/store.ts`) and must be
   added to backup export/import (`src/shared/backup.ts`) with a version bump.
7. **Sync**: if the data should follow the user across devices, add an adapter to `ADAPTERS`
   in `src/main/sync.ts` (items need a stable string `id`) and its store key to `WATCHED_KEYS`.
   Handlers that save a *whole list* must pass it through `guardSave(collection, items)` so a
   view still showing pre-sync data can't erase changes from other devices. Device-specific
   data (settings, clipboard, file paths) should not sync.

## Sync model (short version)

Deskup never hosts user data. With folder sync on, each device writes its full merged state to
`<chosen folder>/Deskup Sync/devices/<deviceId>.json` and merges everyone's files item by item:
newest change wins, deletions are kept as tombstones for 30 days. One writer per file means
OneDrive/Dropbox never create conflict copies. Merge logic is pure and tested
(`src/shared/syncMerge.ts`, `tests/sync.test.cjs`); modes are Auto / Online / Offline.

`Deskup Sync/workspace.json` says whether the folder is **personal** (everything syncs between
one person's PCs) or a **team** (only `TEAM_COLLECTIONS` — workspaces, boards, whiteboards — are
shared; tasks, habits, notes and focus history stay private). Items that existed before joining
a team can be kept private (`state.localOnly`). An optional passphrase seals every device file
with AES-256-GCM (`src/main/syncCrypto.ts`); the derived key is stored per device with
`safeStorage`. `workspace.json` is readable without the passphrase, so never put member names
or content in it. There are no accounts: access = access to the folder + the passphrase.

## Rules that are easy to break

- **Security**: renderers run sandboxed with `contextIsolation`; never enable `nodeIntegration`
  or expose raw `ipcRenderer`. Open external URLs through the existing safe handler.
- **No secrets in the repo.** User-provided keys (AI provider, sync) are stored with
  Electron `safeStorage`, never in plain settings or logs.
- **Design**: calm, desktop-native — Geist font, neutral grays, one accent (Tailwind `indigo-*`
  is remapped to it), flat cards with hairline borders, no glows/gradients. Use toasts with
  Undo instead of confirm dialogs. Reuse `components/ui/` before writing new primitives.
- **Windows first**: test on Windows; keep platform-specific code behind `process.platform`
  checks so macOS/Linux can be validated later.
- **Line endings**: some files are CRLF. Don't reformat whole files; keep diffs to what you changed.

## Verifying UI changes

Type-checking does not catch layout problems. Before calling UI work done, run the built app
and look at it: `npm run build`, then drive `node_modules/electron/dist/electron.exe` with
`playwright-core` (`_electron.launch`) and take screenshots of the pages you changed. Pass
`--user-data-dir=<temp folder>` so tests never touch your real data.

## Releasing

Releases are GitHub Releases on `Yousef0amr/deskup`; installed copies auto-update from them.

1. Bump `version` in `package.json` (semver; installed apps only update to a higher version).
2. `npm run typecheck && npm test`
3. With a GitHub token that can create releases in `GH_TOKEN`: `npm run release`.
   This builds the installer and uploads it with `latest.yml` to a release for that version.
4. Check the release notes on GitHub before announcing.

The installer is not code-signed yet, so Windows SmartScreen warns on first install
("More info → Run anyway"). Signing needs a code-signing certificate configured in
electron-builder (`win.certificateFile` / Azure Trusted Signing).

## Working with an AI assistant

- Start each task by pointing the assistant at the relevant module and this file; ask it to
  read before writing.
- Ask for the smallest change that solves the problem, following the wiring pattern above.
- Require `npm run typecheck` and `npm test` to pass, and screenshots for UI work.
- Review the diff yourself before committing — especially IPC validation and anything touching
  user data, backups or the network.
- Larger plans live in `ROADMAP.md`; update it when scope changes.
