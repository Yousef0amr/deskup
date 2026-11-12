import React, { useState, useEffect } from 'react'

function greetingFor(hours: number): string {
  if (hours >= 5 && hours < 12) return 'Good morning'
  if (hours >= 12 && hours < 17) return 'Good afternoon'
  if (hours >= 17 && hours < 22) return 'Good evening'
  return 'Working late'
}

/** Dashboard page header: greeting, date and a quiet live clock. */
export default function ClockWidget({ children }: { children?: React.ReactNode }): React.JSX.Element {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    // Tick on the minute boundary; seconds are noise on a dashboard.
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const now = new Date()
      timer = setTimeout(() => {
        setTime(new Date())
        schedule()
      }, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  const dateString = time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{dateString}</p>
        <h2 className="mt-0.5 text-[22px] font-semibold tracking-tight text-text">{greetingFor(time.getHours())}</h2>
      </div>
      <div className="flex items-center gap-3">
        {children}
        <time className="font-mono text-[22px] font-medium tabular-nums tracking-tight text-text" dateTime={time.toISOString()}>
          {timeString}
        </time>
      </div>
    </header>
  )
}
