# Deskup feature and improvement plan

Prepared November 6, 2026 from a source-code review. Findings have not yet been reproduced in the running app. This document plans work; it does not change application behavior.

## Product direction

Make Deskup a local-first home for starting work: choose a workspace, see its tasks and notes, launch its tools, and begin a focus session. Clipboard and network tools support that daily workflow.

Planning assumption: prioritize Windows validation first because this is the current development environment; keep platform-specific code isolated and validate macOS/Linux separately before claiming parity.

## What already exists

- Workspace profiles with apps, folders, URLs, icons, colors, launch delay, duplication, and tray launch.
- Dashboard with clock, tasks, an autosaving scratchpad, and a Pomodoro timer.
- Text clipboard history with search, pinning, pause, deduplication, and a shortcut popup.
- Network overview, LAN devices, per-process connections, and Pi-hole/AdGuard DNS activity integrations.
- Theme preferences, startup/tray settings, global shortcuts, and JSON import/export.

## Phase 1 — Reliability before expansion

Priority: P0. Complete before adding new persistent data models.

| Work item | Evidence / reason | Completion criteria |
| --- | --- | --- |
| Preserve nested settings | `src/main/ipc.ts` reconstructs network settings without `dnsSources`; settings reads/import use shallow merging. | Changing theme or timer settings preserves DNS sources; older configurations receive nested defaults. |
| Fix timer lifecycle | `PomodoroTimer.tsx` resets remaining time when paused; `App.tsx` unmounts the dashboard on navigation. | Pause preserves remaining time; page changes and tray use do not stop a session; restart/sleep behavior is explicitly defined and tested. |
| Fix note save races | `QuickNotes.tsx` can leave a pending save when clearing notes. | Clear cannot be overwritten by an earlier queued save; navigation/close handles pending edits; failed saves offer retry. |
| Make themes effective | Components use fixed dark colors despite the light/system preference and CSS variables. | All screens, dialogs, and the clipboard popup follow light/dark/system settings. |
| Make backup restore dependable | Import accepts mostly unchecked arrays and writes sections incrementally. | Validate and migrate the whole file before applying it; preview merge/replace behavior; create a recovery backup; refresh open views. |
| Improve launch correctness | Windows fallback uses a shell and reports success after a timeout. | Separate executable paths from arguments, avoid shell interpretation for normal app targets, and report immediate failures accurately. |
| Surface failures | Shortcut registration and several save operations report failures only to the console. | Visible errors and retry actions; shortcut conflicts preserve the last working binding; sidebar displays configured shortcuts. |

Add focused regression checks for these failures, an explicit typecheck command, and a build check. Establish a packaged Windows smoke checklist covering startup, tray, shortcuts, launch, persistence, and restore.

## Phase 2 — Better workspaces

Priority: P1. Make the core launcher faster and easier to use.

- Search, favorites, and manual ordering for workspace profiles.
- Reorder launch items with drag-and-drop plus keyboard controls.
- Preview and validate targets before saving; clearly mark missing paths.
- Per-item delay and enable/disable controls; preserve the existing profile delay as a default.
- Launch progress, item-level results, and retry failed items only.
- Starter templates for Coding, Study, and Meetings, with locally selected app paths.
- Optional per-workspace shortcut with conflict feedback.

Completion criteria: create a workspace from a template, customize its order, launch it, identify a failed target, fix it, and retry without relaunching successful items.

## Phase 3 — Connected productivity

Priority: P1. Build on reliable timer and storage behavior.

- Introduce an active workspace and optional workspace links on tasks and notes. Keep an All Workspaces view and preserve existing items as unassigned.
- Tasks: edit text, priority, due date, Today/Upcoming/Completed filters, and undo deletion. Add subtasks and recurring tasks in a later increment.
- Notes: multiple titled notes, search, pinning, workspace association, and Markdown preview. Migrate the existing scratchpad into a preserved note.
- Focus: select a task, add long breaks and daily targets, and save session history.
- Add a Start Work action that opens the workspace and optionally begins its focus session.
- Let users hide and reorder dashboard widgets; include today's tasks and recent workspaces.

Completion criteria: a user can start a workspace, work on its selected task, record a focus session, and find its notes after restarting Deskup.

## Phase 4 — Quick access and clipboard

Priority: P2. Depends on the workspace/task/note models from Phase 3.

- Command palette: search workspaces, tasks, notes, and app actions; keyboard navigation and recent actions.
- Quick capture: add a task or note from a compact shortcut window.
- Clipboard labels and filters for pinned items, links, and text; reusable named snippets.
- Configurable clipboard expiry, item-size limits, and an option to exclude clipboard content from backups.
- Opt-in image history as a separate increment with disk quota, thumbnails, and cleanup.

Completion criteria: common launch/capture/copy actions work entirely from the keyboard; clipboard retention behaves predictably and preserves pins according to the selected policy.

## Phase 5 — Network improvements

Priority: P2. First preserve DNS settings in Phase 1.

- Clear connection health, refresh time, source status, and actionable error messages.
- Interface selector and daily/weekly device-wide traffic summaries, with clear handling of counter resets and reconnects.
- Device detail view: names, ownership, first/last seen, known status, and alert controls.
- DNS source setup flow: test connection, show sync status, expose retry, and paginate activity beyond the current returned entry limit.
- Export filtered network reports and apply consistent retention/deletion rules across stores.
- Avoid overlapping scans/polls, bound DNS caches, and reduce background work when monitoring is disabled.

Constraint: the current per-app implementation measures socket connections; it returns `bandwidthSupported: false`. Do not present those values as measured app bandwidth. Treat actual per-app traffic metering as a separate platform research project. DNS queries also do not establish full browser history or time spent on a site.

Completion criteria: offline sources and unsupported metrics are explicit; repeated refreshes stay responsive; retention and deletion cover all network stores.

## Later candidates

- Scheduled workspace launches with an execution history and missed-run policy.
- Window positioning / multi-monitor workspace restore, after a Windows prototype establishes what can be restored reliably.
- Optional encrypted sync after local migrations, backup, and conflict behavior are stable.
- Calendar integration or AI assistance only after a concrete daily workflow justifies the added dependency.

## Implementation approach

1. Keep Electron main/preload/renderer boundaries and the typed shared API.
2. Add runtime validation at IPC/import boundaries and versioned storage migrations before expanding models.
3. Move timer ownership to the main process; expose state and events through preload. Store timestamps and session records rather than relying solely on renderer interval ticks.
4. Split the growing IPC module by feature as those features are changed; avoid a broad rewrite.
5. Use shared theme tokens and consistent empty/loading/error states across existing screens.
6. Keep JSON storage for bounded settings and small collections. Evaluate a database only if measured history size/query performance warrants it.
7. For each phase, verify migrations, persistence, keyboard behavior, and the affected packaged-app flows before moving on.

## First implementation batch

1. Preserve DNS settings and deep-merge defaults, with regression coverage.
2. Repair timer pause/navigation behavior and define sleep/restart recovery.
3. Prevent stale scratchpad saves after clear and surface save errors.
4. Apply real light/dark theme tokens to the shell and dashboard, then remaining screens.
5. Validate import data before writes and add recovery backup behavior.
6. Run typecheck/build and packaged Windows smoke checks; update README to include clipboard and network features.

After this batch, ship Phase 2 in small increments. Estimate delivery dates after the baseline checks and first fixes reveal the actual testing and packaging effort.
