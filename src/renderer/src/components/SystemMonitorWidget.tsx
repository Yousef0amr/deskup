import React, { useState, useEffect } from 'react'
import { Cpu, HardDrive, Clock, Activity } from 'lucide-react'
import type { SystemStats } from '../../../shared/types'

export default function SystemMonitorWidget(): React.JSX.Element {
  const [stats, setStats] = useState<SystemStats | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchStats = async () => {
      try {
        const s = await window.deskup.system.getStats()
        if (isMounted) setStats(s)
      } catch {
        // Fallback
      }
    }

    void fetchStats()
    const interval = setInterval(fetchStats, 3000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  if (!stats) return <div />

  return (
    <div className="bg-surface/60 border border-border rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
      {/* CPU */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-muted">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>CPU</span>
          </span>
          <span className="font-mono font-bold text-text">{stats.cpuPercent}%</span>
        </div>
        <div className="w-full bg-elevated h-2 rounded-full overflow-hidden border border-border/40">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              stats.cpuPercent > 80 ? 'bg-rose-500' : stats.cpuPercent > 50 ? 'bg-amber-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${stats.cpuPercent}%` }}
          />
        </div>
      </div>

      <div className="h-8 w-px bg-border/60" />

      {/* RAM Memory */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-muted">
            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
            <span>Memory</span>
          </span>
          <span className="font-mono font-bold text-text">
            {stats.usedMemGb} / {stats.totalMemGb} GB
          </span>
        </div>
        <div className="w-full bg-elevated h-2 rounded-full overflow-hidden border border-border/40">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              stats.memPercent > 85 ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${stats.memPercent}%` }}
          />
        </div>
      </div>

      <div className="h-8 w-px bg-border/60 hidden sm:block" />

      {/* Uptime & App Info */}
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[11px]">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Uptime</span>
          </div>
          <div className="font-mono font-semibold text-text">{stats.uptimeHours} hrs</div>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[11px]">
            <Activity className="w-3 h-3 text-cyan-500" />
            <span>Deskup RAM</span>
          </div>
          <div className="font-mono font-semibold text-text">{stats.appMemMb} MB</div>
        </div>
      </div>
    </div>
  )
}

