import React, { useEffect, useState } from 'react'
import { Power, CheckCircle2, AlertCircle } from 'lucide-react'
import { Switch } from './ui/switch'

interface ProfileAutoLaunchOptionProps {
  autoLaunch: boolean
  alsoEnableLogin: boolean
  onAutoLaunchChange: (checked: boolean) => void
  onAlsoEnableLoginChange: (checked: boolean) => void
}

export default function ProfileAutoLaunchOption({
  autoLaunch,
  alsoEnableLogin,
  onAutoLaunchChange,
  onAlsoEnableLoginChange
}: ProfileAutoLaunchOptionProps): React.JSX.Element {
  const [launchAtLogin, setLaunchAtLogin] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    window.deskup.settings
      .get()
      .then((s) => {
        if (mounted) setLaunchAtLogin(s.launchAtLogin)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="rounded-xl border border-border/60 bg-elevated/40 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Power className="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-text">Launch on PC startup</div>
            <div className="text-[11px] text-muted">
              Automatically open this workspace when your PC starts
            </div>
          </div>
        </div>
        <Switch
          checked={autoLaunch}
          onCheckedChange={onAutoLaunchChange}
          aria-label="Launch workspace on PC startup"
        />
      </div>

      {autoLaunch && launchAtLogin === false && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Also enable Deskup “Launch at login” so this runs at boot</span>
          </div>
          <Switch
            checked={alsoEnableLogin}
            onCheckedChange={onAlsoEnableLoginChange}
            aria-label="Also enable Deskup Launch at login"
          />
        </div>
      )}

      {autoLaunch && launchAtLogin === true && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 text-[11px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Deskup is set to launch at login — workspace will open automatically at boot.</span>
        </div>
      )}
    </div>
  )
}
