import type { Profile } from './types'

export const AUTOSTART_ARG = '--autostart'

export function isStartupLaunch(argv: readonly string[], wasOpenedAtLogin = false): boolean {
  return argv.includes(AUTOSTART_ARG) || wasOpenedAtLogin
}

export function getAutoLaunchProfiles(profiles: readonly Profile[]): Profile[] {
  return profiles.filter((p) => p.autoLaunch === true && p.items.length > 0)
}
