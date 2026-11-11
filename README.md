# Deskup 🚀

> Cross-platform desktop workspace launcher & personal desk dashboard. Set up your desk in one click.

Deskup brings together:
1. **Workspace Profiles:** One click opens a saved set of apps, folders, and websites (e.g., *Coding*, *Study*, *Meeting*).
2. **Desk Dashboard:** Clean home screen with a live clock, dynamic greeting, to-do list, auto-saving quick scratchpad, and a focus Pomodoro timer.
3. **Native Desktop Integration:** System tray menu for instant workspace launch, global toggle shortcut (`Ctrl/Cmd+Shift+D`), minimize-to-tray behavior, and OS startup option.
4. **Privacy & Security First:** 100% local JSON persistence (`electron-store`), no cloud accounts, strict Content Security Policy, sandboxed renderer, and secure external URL handling.

---

## 🛠 Tech Stack

- **Electron** — Cross-platform desktop runtime
- **Vite (`electron-vite`)** — Blazing fast HMR and optimized bundler
- **React 18 + TypeScript** — Strictly typed component architecture
- **Tailwind CSS** — Modern styling with light, dark, and system theme support
- **electron-store** — Fast, local JSON configuration persistence
- **electron-builder** — Production installers (NSIS, portable, DMG, AppImage)
- **Lucide Icons** — Clean, modern iconography

---

## 🚀 Getting Started

### Work tools and task planning

- **Task planner (Dashboard):** edit tasks, set priority and due date, filter Today (including overdue), Upcoming, Active, High priority, or Done, and undo the most recent deletion or completed-task cleanup. Priority and due date are preserved on restart and in backups.
- **Work tools (sidebar or Ctrl/Cmd+K):** clean text and lists, format/compact JSON, encode/decode UTF-8 Base64 and URL components, and convert timestamps with explicit units/time zones. Copy results, reuse them as input, or save them to the Work tools notes folder.
- Tool input stays local and is cleared when you leave the page; save results as notes to keep them. Conversions support up to 500,000 input characters.
- Data exports now include focus history alongside tasks, notes, workspaces, settings, and clipboard history.

### Developer board

- **Kanban for dev work (sidebar → Board, Ctrl/Cmd+2):** multiple boards, each with its own key (`DSK-12`), custom columns, WIP limits and a *done* column.
- **Quick add:** press `N`, then type e.g. `bug: login crashes #auth !high ~3` → type, labels, priority and story points are parsed. `feat:` `fix:` `chore:` `refactor:` `docs:` `spike:` set the type; `!urgent|!high|!low` (or `!p0…!p3`) set priority; `~N` sets points.
- **Card panel:** markdown description, checklist, PR/issue links (GitHub/GitLab URLs get short labels), due date, and one-click copy of the branch name (`fix/DSK-12-…`), `git checkout -b …` and a Conventional Commit subject (`fix(DSK-12): …`).
- **Workflow:** drag cards between columns, filter by type/priority/label, search by text or key (`/`), start a focus session on a card, duplicate, delete with Undo, and copy the whole board as Markdown for stand-ups. Boards are included in backups.

### Whiteboard

- **Freeform canvas (sidebar → Whiteboard, Ctrl/Cmd+3):** pen, rectangle, ellipse, diamond, arrow, line, text, sticky notes and eraser — one-key shortcuts `V H P R O D A L T S E`.
- **Editing:** click/shift-click or drag a box to select; move, resize (corner handle), drag arrow endpoints, nudge with arrow keys; double-click a shape or note (or press Enter) to write in it; double-click empty space for quick text. Shift snaps lines to 45° and keeps shapes square.
- **Canvas:** infinite — scroll or Space+drag to pan, Ctrl+scroll / Ctrl ± to zoom, Ctrl+0 to fit. Undo/redo (Ctrl+Z / Ctrl+Shift+Z), duplicate (Ctrl+D), copy/paste (Ctrl+C / Ctrl+V), select all (Ctrl+A).
- **Output:** *Copy image* puts a PNG on the clipboard (paste into Slack, docs, PRs); *PNG* saves a file. Multiple whiteboards, saved locally and included in backups.

### Today, habits and navigation

- **Today at a glance (Dashboard):** focus minutes vs. a daily goal (set it in Settings → Focus), tasks due today and overdue, and habits completed.
- **Daily habits (Dashboard):** add up to 30 habits with an emoji, tick off the last 7 days, and track current and best streaks. Habits are included in backups (backup format v6; v1–v5 files still import).
- **Navigation:** `Ctrl/Cmd+1…8` switches pages, `Ctrl/Cmd+B` collapses the sidebar (remembered between launches), and notifications appear as toasts in the bottom-right corner.
- **Shortcuts from the Today tiles and Ctrl+K:** click *Tasks* to jump to today's and overdue tasks, *Focus* to reach the timer, *Habits* to tick them off; the command bar has *Today's tasks*, *Add a task* and *Check off habits*.
- **Undo instead of confirm:** deleting a task, habit or workspace happens immediately with an *Undo* button in the notification.
- **Your own focus music:** in the focus timer's sound bar pick *Music*, add audio files (mp3, wav, ogg, m4a, flac…), then play, skip, shuffle or repeat. Files stay where they are; Deskup only remembers their paths.
- **Image clipboard history:** screenshots and copied pictures are saved (as PNG in Deskup's data folder) and shown in Clipboard → *Images*; click one to copy the image again. Turn it off in Settings → Clipboard → *Save copied images*.
- **Workspace apps launch reliably:** apps are started with a clean environment, so Electron apps (Slack, VS Code-based IDEs…) open even when Deskup itself was started from an IDE terminal.

### Prerequisites

- Node.js (v18+)
- npm

### Installation & Run

```bash
# Clone the repository
git clone <repo-url>
cd deskup

# Install dependencies
npm install

# Start development app
npm start
```

### Packaging

```bash
# Build production bundle and package installer
npm run package
```

---

## ⌨️ Global Shortcuts & Features

- `Ctrl/Cmd + Shift + D`: Toggle main window from anywhere.
- **Escape Key (`Esc`)**: Closes any open modal/editor.
- **Enter Key**: Quick-add todo items.
- **JSON Export / Import**: Easily backup or migrate your workspace profiles and settings across machines.

---

## 🔒 Security Architecture

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Renderer only communicates via a strictly validated, typed `window.deskup` API through `contextBridge`.
- Only `http:` and `https:` protocols are permitted for web targets to prevent arbitrary protocol injection.
