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

