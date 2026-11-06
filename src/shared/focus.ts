import type { FocusState, FocusAction, Settings } from './types'

export function advanceFocus(state: FocusState, settings: Settings['pomodoro'], now: number): FocusState {
  if (state.endsAt === null || state.endsAt > now) return state
  const mode = state.mode === 'work' ? 'break' : 'work'
  return {
    mode, endsAt: null,
    remainingMs: (mode === 'work' ? settings.workMin : settings.breakMin) * 60000,
    sessionsCompleted: state.sessionsCompleted + (state.mode === 'work' ? 1 : 0)
  }
}

export function changeFocus(state: FocusState, action: FocusAction, settings: Settings['pomodoro'], now: number): FocusState {
  const current = advanceFocus(state, settings, now)
  switch (action) {
    case 'start': return current.endsAt === null ? { ...current, endsAt: now + current.remainingMs } : current
    case 'pause': return { ...current, remainingMs: current.endsAt === null ? current.remainingMs : Math.max(0, current.endsAt - now), endsAt: null }
    case 'reset': return { ...current, endsAt: null, remainingMs: (current.mode === 'work' ? settings.workMin : settings.breakMin) * 60000 }
    case 'skip': {
      const mode = current.mode === 'work' ? 'break' : 'work'
      return { ...current, mode, endsAt: null, remainingMs: (mode === 'work' ? settings.workMin : settings.breakMin) * 60000 }
    }
  }
}
