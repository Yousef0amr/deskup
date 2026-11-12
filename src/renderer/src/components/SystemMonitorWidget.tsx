import React, { useState, useEffect } from 'react'
import { Cpu, HardDrive, Clock, Activity } from 'lucide-react'
import type { SystemStats } from '../../../shared/types'
import { cn } from '../lib/utils'

const HISTORY = 40

function Sparkline({ values }: { values: number[] }): React.JSX.Element {
  const w = 120
  const h = 24
  const step = w / (HISTORY - 1)
  const offset = (HISTORY - values.length) * step
  const points = values.map((v, i) => `${(offset + i * step).toFixed(1)},${(h - (v / 100) * h).toFixed(1)}`)
  const first = points[0]?.split(',')[0]
  const last = points[points.length - 1]?.split(',')[0]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-6 w-28 text-indigo-500" aria-hidden>
      {values.length > 1 && (
        <>
          <polygon points={`${first},${h} ${points.join(' ')} ${last},${h}`} className="fill-current opacity-10" />
          <polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

function Stat({ icon: Icon, label, children }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
      <span className="text-xs text-muted">{label}</span>
      {children}
    </div>
  )
}

/** Slim, low-priority strip at the bottom of the dashboard. */
export default function SystemMonitorWidget(): React.JSX.Element {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [cpuHistory, setCpuHistory] = useState<number[]>([])

  useEffect(() => {
    let isMounted = true
    let isFetching = false
    const fetchStats = async () => {
      if (document.hidden || isFetching) return
      isFetching = true
      try {
        const s = await window.deskup.system.getStats()
        if (!isMounted) return
        setStats(s)
        setCpuHistory(h => [...h, s.cpuPercent].slice(-HISTORY))
      } catch {
        // Stats are best-effort; keep the last reading.
      } finally {
        isFetching = false
      }
    }

    void fetchStats()
    const interval = setInterval(fetchStats, 3000)
    document.addEventListener('visibilitychange', fetchStats)
    return () => {
      isMounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', fetchStats)
    }
  }, [])

  const cpuTone = !stats ? 'text-text' : stats.cpuPercent > 80 ? 'text-rose-500' : stats.cpuPercent > 50 ? 'text-amber-500' : 'text-text'

  return (
    <section
      aria-label="System"
      className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-border bg-surface px-4 py-2.5"
    >
      {!stats ? (
        <div className="h-6 w-full animate-pulse rounded bg-elevated" aria-busy />
      ) : (
        <>
          <Stat icon={Cpu} label="CPU">
            <Sparkline values={cpuHistory} />
            <span className={cn('w-9 text-right font-mono text-xs font-semibold tabular-nums', cpuTone)}>{stats.cpuPercent}%</span>
          </Stat>
          <Stat icon={HardDrive} label="Memory">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-elevated">
              <div
                className={cn('h-full rounded-full transition-[width] duration-500', stats.memPercent > 85 ? 'bg-rose-500' : 'bg-emerald-500')}
                style={{ width: `${stats.memPercent}%` }}
              />
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums text-text">
              {stats.usedMemGb}/{stats.totalMemGb} GB
            </span>
          </Stat>
          <Stat icon={Clock} label="Uptime">
            <span className="font-mono text-xs font-semibold tabular-nums text-text">{stats.uptimeHours} h</span>
          </Stat>
          <Stat icon={Activity} label="Deskup">
            <span className="font-mono text-xs font-semibold tabular-nums text-text">{stats.appMemMb} MB</span>
          </Stat>
        </>
      )}
    </section>
  )
}
